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
  model = 'claude-3-5-sonnet-20241022'
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
        'Extract structured monthly rental statement ledger line items from South African managing agent statements (e.g. iGrow Rentals, WeconnectU, Trafalgar, PropAcademy). Strictly return numeric values without currency symbols.',
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
                  description: 'Name of the sectional title complex, unit number, or street address.',
                },
                address: {
                  type: 'string',
                  description: 'Physical property address if available on statement.',
                },
                tenantName: {
                  type: 'string',
                  description: 'Name of the current tenant occupying the unit.',
                },
                leaseExpiryDate: {
                  type: 'string',
                  description: 'Lease end date in YYYY-MM-DD format if present.',
                },
                grossRentZAR: {
                  type: 'number',
                  description: 'Monthly gross contractual rental amount charged in ZAR.',
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
                  description: 'Managing agent management fee / commission deducted in ZAR (including 15% VAT).',
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
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system:
          'You are an expert South African real estate forensic accountant analyzing visual managing agent statements (specifically iGrow Rentals / WeconnectU). Parse all rental ledger entries, fee deductions, and net owner payouts with exact mathematical fidelity. Always call the extract_rental_statements tool.',
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: 'Extract the rental property ledger details from this managing agent statement into the structured tool call.',
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

    const validation = validateExtractedStatementPayload(toolCall.input);
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
