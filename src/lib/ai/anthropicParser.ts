import { ExtractedRentalUnit } from '@/types';
import { validateExtractedStatementPayload } from './statementValidation';

export interface ParseStatementResult {
  success: boolean;
  units: ExtractedRentalUnit[];
  rawText?: string;
  error?: string;
}

/**
 * Converts a browser File object to a raw Base64 string (stripping the Data URL prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Built-in mock statement representing realistic South African managing agent
 * accounting ledger data (iGrow Rentals / WeconnectU).
 */
export function getDemoStatementData(): ExtractedRentalUnit[] {
  return [
    {
      propertyName: 'Clearwater Village 128',
      address: '128 Clearwater Village, Atlas Road, Boksburg',
      tenantName: 'Bongani June Mwale',
      leaseExpiryDate: '2027-02-28',
      grossRentZAR: 6900,
      leviesZAR: 477.07,
      municipalRatesZAR: 1021.0,
      agencyCommissionZAR: 850.54, // iGrow management fee + VAT
      agencyCommissionVatZAR: 110.94, // 15% SARS VAT
      isCommissionInclusiveOfVat: true,
      estimatedMarketValueZAR: 828000,
      depositHeldZAR: 6965.17,
      netOperatingIncomeZAR: 5525.03, // Statement payout
    },
  ];
}

/**
 * Calls Anthropic Messages API directly from the browser using
 * "anthropic-dangerous-direct-browser-access": "true" and structured tool use.
 */
export async function parseStatementWithAnthropic(
  file: File,
  apiKey: string,
  model = 'claude-sonnet-5'
): Promise<ParseStatementResult> {
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      units: [],
      error: 'Missing Anthropic API Key. Please configure your key in Settings.',
    };
  }

  // File size guard (max 15MB)
  if (file.size > 15 * 1024 * 1024) {
    return {
      success: false,
      units: [],
      error: 'File exceeds 15MB size limit. Please upload a smaller document.',
    };
  }

  // Auto-migrate retired Claude 3.x model strings to active Claude 5 generation
  const RETIRED_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-latest',
    'claude-3-haiku-20240307',
  ];
  const effectiveModel =
    !model || RETIRED_MODELS.includes(model.trim())
      ? 'claude-sonnet-5'
      : model.trim();

  const base64Data = await fileToBase64(file);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // Format content block according to Anthropic specification:
  // Use "document" for PDF and "image" for PNG/JPEG
  const contentBlock = isPdf
    ? {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      }
    : {
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.type || 'image/png',
          data: base64Data,
        },
      };

  const tools = [
    {
      name: 'extract_rental_statements',
      description:
        'Extracts structured South African rental property ledger items, management commissions, and disbursements from statements.',
      input_schema: {
        type: 'object',
        properties: {
          units: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                propertyName: {
                  type: 'string',
                  description:
                    'Scheme or complex name with unit number (e.g. "Clearwater Village 128", "The Blyde 402").',
                },
                address: {
                  type: 'string',
                  description: 'Full physical address or street if visible on statement.',
                },
                tenantName: {
                  type: 'string',
                  description: 'Full name of tenant leasing the unit.',
                },
                leaseExpiryDate: {
                  type: 'string',
                  description: 'Lease end date in YYYY-MM-DD format if present.',
                },
                grossRentZAR: {
                  type: 'number',
                  description: 'Gross rental billing amount in ZAR (positive number).',
                },
                leviesZAR: {
                  type: 'number',
                  description: 'Body corporate or HOA monthly levies deducted in ZAR (0 if not itemized).',
                },
                municipalRatesZAR: {
                  type: 'number',
                  description: 'City municipal rates, refuse, and sewerage charges deducted in ZAR.',
                },
                agencyCommissionZAR: {
                  type: 'number',
                  description:
                    'Total managing agent management fee / commission deducted on statement in ZAR (invoiced amount deducted from owner payout).',
                },
                agencyCommissionVatZAR: {
                  type: 'number',
                  description:
                    'The 15% SARS VAT portion of the agency commission if itemized separately on the statement (e.g. 110.94).',
                },
                isCommissionInclusiveOfVat: {
                  type: 'boolean',
                  description:
                    'Whether the deducted agencyCommissionZAR is already inclusive of 15% VAT. South African managing agent statements (e.g. iGrow, WeconnectU) deduct the VAT-inclusive invoice total (e.g. R850.54 which includes R110.94 VAT). Set to true if VAT is included in commission.',
                },
                estimatedMarketValueZAR: {
                  type: 'number',
                  description:
                    'Estimated property market value in ZAR if explicitly mentioned on statement, otherwise omit.',
                },
                depositHeldZAR: {
                  type: 'number',
                  description: 'Tenant security deposit held in trust account.',
                },
                netOperatingIncomeZAR: {
                  type: 'number',
                  description: 'Net owner disbursement payout / net rental income transferred in ZAR.',
                },
              },
              required: [
                'propertyName',
                'tenantName',
                'grossRentZAR',
                'netOperatingIncomeZAR',
              ],
            },
          },
        },
        required: ['units'],
      },
    },
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 4096,
        system:
          'You are an expert South African real estate forensic accountant analyzing visual managing agent statements (specifically iGrow Rentals / WeconnectU). Parse all rental ledger entries, fee deductions, and net owner payouts with exact mathematical fidelity. Pay special attention to agent commission: check if the deducted commission invoice is inclusive of 15% VAT (e.g. Invoiced fee R850.54 including R110.94 VAT), and set agencyCommissionVatZAR and isCommissionInclusiveOfVat: true accordingly so that VAT is not double-charged in downstream calculations. Always call the extract_rental_statements tool.',
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: 'Extract the rental property ledger details from this managing agent statement into the structured tool call. Ensure the "units" parameter is passed as an array of unit objects.',
              },
            ],
          },
        ],
        tools,
        tool_choice: { type: 'tool', name: 'extract_rental_statements' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch {
        // use raw text
      }

      if (response.status === 404 && parsedErr.toLowerCase().includes('model')) {
        return {
          success: false,
          units: [],
          error: `Anthropic Model Not Found (404): The requested model "${effectiveModel}" is unavailable or retired on this API key tier. Please navigate to Settings and select a supported active model (e.g. claude-sonnet-5 or claude-haiku-4-5).`,
        };
      }

      return {
        success: false,
        units: [],
        error: `Anthropic API Error (${response.status}): ${parsedErr}`,
      };
    }

    const json = await response.json();
    const toolCall = json.content?.find((c: any) => c.type === 'tool_use');

    if (!toolCall || !toolCall.input) {
      return {
        success: false,
        units: [],
        error: 'The AI model did not return structured statement data.',
      };
    }

    const rawInput =
      typeof toolCall.input === 'string'
        ? (() => {
            try {
              return JSON.parse(toolCall.input);
            } catch {
              return toolCall.input;
            }
          })()
        : toolCall.input;

    const validation = validateExtractedStatementPayload(rawInput);
    if (!validation.success) {
      return {
        success: false,
        units: [],
        error: `Schema validation failed: ${validation.errors.join(', ')}`,
      };
    }

    return {
      success: true,
      units: validation.units,
    };
  } catch (err: any) {
    return {
      success: false,
      units: [],
      error: err?.message || 'Network error while contacting Anthropic API.',
    };
  }
}
