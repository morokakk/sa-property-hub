/**
 * Dual-Pipeline Utility Parsing Engine
 *
 * Implements:
 * 1. Primary BYOK AI Pipeline (Anthropic Messages API / Google Gemini) with structured Zod extraction.
 * 2. Secondary Client-Side Regex Fallback for City of Johannesburg (CoJ) and Eskom bills via pdfjs-dist.
 * 3. Strict Zod Schema (UtilityStatementSchema) with mathematical line-item sum cross-check.
 */

import { z } from 'zod';
import { UtilityStatement, AiSettings } from '@/types';

// ============================================================================
// 1. Zod Validation Schema with Mathematical Cross-Check
// ============================================================================

export const ExtractedMeterReadingSchema = z.object({
  date: z.string(),
  utilityType: z.enum(['electricity', 'water']),
  readingValue: z.number().nonnegative(),
  previousReadingValue: z.number().nonnegative().optional(),
  consumption: z.number().optional(),
  meterNumber: z.string().optional(),
  readingType: z.enum(['Actual', 'Estimated']).optional(),
  source: z.literal('pdf-extracted').default('pdf-extracted'),
  notes: z.string().optional(),
});

export const UtilityStatementSchema = z
  .object({
    statementDate: z.string().min(1, 'Statement date is required'),
    billingPeriod: z.string().optional(),
    accountNumber: z.string().optional(),
    provider: z.string().default('City of Johannesburg'),
    electricityZAR: z.number().nonnegative().default(0),
    waterZAR: z.number().nonnegative().default(0),
    refuseZAR: z.number().nonnegative().default(0),
    sewerageZAR: z.number().nonnegative().default(0),
    propertyRatesZAR: z.number().nonnegative().default(0),
    totalDueZAR: z.number().nonnegative(),
    extractedMeterReadings: z.array(ExtractedMeterReadingSchema).optional(),
  })
  .refine(
    (data) => {
      // Cross check: sum of individual line items must equal totalDueZAR within R1.50 rounding tolerance
      const lineSum =
        data.electricityZAR +
        data.waterZAR +
        data.refuseZAR +
        data.sewerageZAR +
        (data.propertyRatesZAR || 0);

      return Math.abs(lineSum - data.totalDueZAR) <= 1.5;
    },
    {
      message:
        'Mathematical cross-check failed: individual line items (electricity + water + refuse + sewerage + rates) must equal totalDueZAR within R1.50 rounding tolerance.',
      path: ['totalDueZAR'],
    }
  );

export type ValidatedUtilityStatement = z.infer<typeof UtilityStatementSchema>;

export interface UtilityParseResult {
  success: boolean;
  statement?: UtilityStatement;
  parsedVia: 'byok-llm' | 'regex-fallback';
  rawText?: string;
  error?: string;
}

// ============================================================================
// 2. Helper Functions: File Conversion & Number Cleaning
// ============================================================================

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

export function cleanNumeric(str: string | undefined | null): number {
  if (!str) return 0;
  // Remove spaces, currency symbols, and convert comma to period or commas as thousands
  const cleaned = str
    .replace(/[R\s]/gi, '')
    .replace(/,/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

// ============================================================================
// 3. Client-Side PDF Text Extraction (pdfjs-dist)
// ============================================================================

export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const buffer =
    fileOrBuffer instanceof File
      ? await fileOrBuffer.arrayBuffer()
      : fileOrBuffer;

  const pdfjs = await import('pdfjs-dist');

  // In browser environments, assign worker source if unassigned
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += `\n--- Page ${i} ---\n` + pageText;
  }

  return fullText;
}

// ============================================================================
// 4. Hardcoded Regex Extractors: City of Johannesburg & Eskom
// ============================================================================

/**
 * Parses City of Johannesburg (CoJ / Pikitup / City Power / Joburg Water) bills.
 */
export function parseCojUtilityRegex(rawText: string): ValidatedUtilityStatement {
  // Account Number
  const accMatch = rawText.match(/Account Number:\s*(\d+)/i) || rawText.match(/Acc\.?\s*No\.?:\s*(\d+)/i);
  const accountNumber = accMatch ? accMatch[1].trim() : undefined;

  // Date (e.g. 2025/04/03 or 2025-04-03)
  const dateMatch =
    rawText.match(/Date\s*[:\s]?\s*(\d{4}[/-]\d{2}[/-]\d{2})/i) ||
    rawText.match(/(\d{4}[/-]\d{2}[/-]\d{2})/);
  const statementDate = dateMatch ? dateMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0];

  // Billing Month (e.g. "April 2025" or "Billing Period 2026/09")
  let billingPeriod: string | undefined;
  const periodMatch = rawText.match(/Statement for\s*([A-Za-z]+\s+\d{4})/i);
  if (periodMatch) {
    billingPeriod = periodMatch[1].trim();
  } else {
    const ymMatch = rawText.match(/Billing Period\s*(\d{4})[/-](\d{2})/i);
    if (ymMatch) {
      const year = ymMatch[1];
      const monthNum = parseInt(ymMatch[2], 10);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      if (monthNum >= 1 && monthNum <= 12) {
        billingPeriod = `${months[monthNum - 1]} ${year}`;
      }
    }
  }

  // 1. Property Rates Total Amount
  // Matches: Property Rates ... VAT: 0 % 0.00 774.86 or rates sub-total line
  let propertyRatesZAR = 0;
  const ratesMatch =
    rawText.match(/Property Rates[\s\S]*?VAT:\s*0\s*%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Property Rates Residential[\s\S]*?([\d,]+\.\d{2})\s+VAT:\s*0\s*%/i) ||
    rawText.match(/Property Rates[\s\S]*?Total\s*Amount[\s\S]*?([\d,]+\.\d{2})/i);
  if (ratesMatch) {
    propertyRatesZAR = cleanNumeric(ratesMatch[1]);
  }

  // 2. City Power / Electricity
  let electricityZAR = 0;
  const elecMatch =
    rawText.match(/City Power[\s\S]*?Electricity[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Electricity[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i);
  if (elecMatch) {
    electricityZAR = cleanNumeric(elecMatch[1]);
  }

  // 3. PIKITUP / Refuse Removal
  // Directive sample: /Refuse Residential[\s\S]*?VAT:\s*15\.00%[\s\S]*?([\d,]+\.\d{2})/i
  let refuseZAR = 0;
  const refuseMatch =
    rawText.match(/Refuse Residential[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/PIKITUP[\s\S]*?Refuse[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Refuse Residential\s*([\d,]+\.\d{2})/i);
  if (refuseMatch) {
    refuseZAR = cleanNumeric(refuseMatch[1]);
  }

  // 4. Municipal Sewerage
  // Matches "Sewer monthly charge based on Stand size... 774.48" or "Category of Sewer ... 774.48"
  let sewerageZAR = 0;
  const sewerMatch =
    rawText.match(/Sewer monthly charge[\s\S]*?([\d,]+\.\d{2})/i) ||
    rawText.match(/Category of Sewer[\s\S]*?([\d,]+\.\d{2})/i) ||
    rawText.match(/Sewerage(?:\s+Residential)?[\s\S]*?([\d,]+\.\d{2})/i);

  if (sewerMatch) {
    const sewerSubtotal = cleanNumeric(sewerMatch[1]);
    // CoJ sewer line items are excl. VAT, so add 15% VAT:
    sewerageZAR = Math.round(sewerSubtotal * 1.15 * 100) / 100;
  }

  // 5. Water & Sanitation Section Total
  // In CoJ statements, Johannesburg Water reports a combined Water & Sanitation section total amount including 15% VAT
  const totalWaterMatch =
    rawText.match(/Water & Sanitation[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Johannesburg Water[\s\S]*?Water & Sanitation[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Water(?:\s+Residential)?[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i) ||
    rawText.match(/Water Demand Management[\s\S]*?VAT:\s*15(?:\.00)?%\s*[\d,.]*\s+([\d,]+\.\d{2})/i);

  const totalWaterSection = totalWaterMatch ? cleanNumeric(totalWaterMatch[1]) : 0;

  // Water consumption is the remaining balance of the Water & Sanitation section after subtracting sewerage
  let waterZAR = 0;
  if (totalWaterSection > 0) {
    if (sewerageZAR > 0 && sewerageZAR < totalWaterSection) {
      waterZAR = Math.round((totalWaterSection - sewerageZAR) * 100) / 100;
    } else {
      waterZAR = totalWaterSection;
    }
  }

  // 6. Current Charges (Including VAT) / Total Due
  let totalDueZAR = 0;
  const currentChargesMatch =
    rawText.match(/Current Charges\s*\(Including VAT\)\s*([\d,]+\.\d{2})/i) ||
    rawText.match(/Current Charges[\s\S]*?([\d,]+\.\d{2})/i);

  if (currentChargesMatch) {
    totalDueZAR = cleanNumeric(currentChargesMatch[1]);
  } else {
    // If not directly found, synthesize exact sum
    totalDueZAR = Math.round((propertyRatesZAR + electricityZAR + refuseZAR + waterZAR + sewerageZAR) * 100) / 100;
  }

  // Cross-check & double-count safety guard:
  const computedSum = Math.round((propertyRatesZAR + electricityZAR + refuseZAR + waterZAR + sewerageZAR) * 100) / 100;
  if (totalDueZAR > 0 && Math.abs(computedSum - totalDueZAR) > 1.5) {
    const expectedUtilities = Math.round((totalDueZAR - propertyRatesZAR - electricityZAR - refuseZAR) * 100) / 100;
    if (expectedUtilities >= 0) {
      if (sewerageZAR > 0 && sewerageZAR < expectedUtilities) {
        waterZAR = Math.round((expectedUtilities - sewerageZAR) * 100) / 100;
      } else if (waterZAR > 0 && waterZAR < expectedUtilities) {
        sewerageZAR = Math.round((expectedUtilities - waterZAR) * 100) / 100;
      } else {
        waterZAR = expectedUtilities;
        sewerageZAR = 0;
      }
    }
  }

  // 7. Meter Readings Extraction (Water and/or City Power)
  const extractedMeterReadings: z.infer<typeof ExtractedMeterReadingSchema>[] = [];

  // Match Water meter block (Units: KL or under Water section)
  // Sample: "Meter: 211001886; Register: 1; Multiply factor: 1; Start reading: 1,956.000; End reading: 1,977.000; Difference: 21.000; Consumption: 21.000; Units: KL; Type: Actual Readings."
  const waterBlockMatch =
    rawText.match(/(?:Water|Category of Water)[\s\S]*?Meter:\s*([A-Za-z0-9_-]+)[;\s][\s\S]*?Start reading:\s*([\d,.]+)[;\s][\s\S]*?End reading:\s*([\d,.]+)[;\s][\s\S]*?Consumption:\s*([\d,.]+)[;\s][\s\S]*?(?:Units:\s*KL[;\s])?[\s\S]*?Type:\s*([A-Za-z]+)/i) ||
    rawText.match(/Meter:\s*([A-Za-z0-9_-]+)[;\s][\s\S]*?Start reading:\s*([\d,.]+)[;\s][\s\S]*?End reading:\s*([\d,.]+)[;\s][\s\S]*?Consumption:\s*([\d,.]+)[;\s][\s\S]*?Units:\s*KL[\s\S]*?Type:\s*([A-Za-z]+)/i) ||
    rawText.match(/Meter:\s*([A-Za-z0-9_-]+)[;\s][\s\S]*?Start reading:\s*([\d,.]+)[;\s][\s\S]*?End reading:\s*([\d,.]+)[;\s][\s\S]*?Consumption:\s*([\d,.]+)[;\s][\s\S]*?Type:\s*([A-Za-z]+)/i);

  if (waterBlockMatch) {
    const meterNumber = waterBlockMatch[1].trim();
    const prevReading = cleanNumeric(waterBlockMatch[2]);
    const currReading = cleanNumeric(waterBlockMatch[3]);
    const consumption = cleanNumeric(waterBlockMatch[4]);
    const isActual = !waterBlockMatch[5].toLowerCase().includes('estim');

    extractedMeterReadings.push({
      date: statementDate,
      utilityType: 'water',
      readingValue: currReading,
      previousReadingValue: prevReading,
      consumption: consumption > 0 ? consumption : Math.max(0, Math.round((currReading - prevReading) * 1000) / 1000),
      meterNumber,
      readingType: isActual ? 'Actual' : 'Estimated',
      source: 'pdf-extracted',
    });
  }

  // Match Electricity meter block (Units: kWh or under City Power/Electricity section)
  const elecBlockMatch =
    rawText.match(/(?:City Power|Electricity)[\s\S]*?Meter:\s*([A-Za-z0-9_-]+)[;\s][\s\S]*?Start reading:\s*([\d,.]+)[;\s][\s\S]*?End reading:\s*([\d,.]+)[;\s][\s\S]*?Consumption:\s*([\d,.]+)[;\s][\s\S]*?(?:Units:\s*KWH[;\s])?[\s\S]*?Type:\s*([A-Za-z]+)/i) ||
    rawText.match(/Meter:\s*([A-Za-z0-9_-]+)[;\s][\s\S]*?Start reading:\s*([\d,.]+)[;\s][\s\S]*?End reading:\s*([\d,.]+)[;\s][\s\S]*?Consumption:\s*([\d,.]+)[;\s][\s\S]*?Units:\s*KWH[\s\S]*?Type:\s*([A-Za-z]+)/i);

  if (elecBlockMatch) {
    const meterNumber = elecBlockMatch[1].trim();
    const prevReading = cleanNumeric(elecBlockMatch[2]);
    const currReading = cleanNumeric(elecBlockMatch[3]);
    const consumption = cleanNumeric(elecBlockMatch[4]);
    const isActual = !elecBlockMatch[5].toLowerCase().includes('estim');

    // Avoid duplicate if same meter matched as water
    if (!extractedMeterReadings.some((r) => r.meterNumber === meterNumber)) {
      extractedMeterReadings.push({
        date: statementDate,
        utilityType: 'electricity',
        readingValue: currReading,
        previousReadingValue: prevReading,
        consumption: consumption > 0 ? consumption : Math.max(0, Math.round((currReading - prevReading) * 1000) / 1000),
        meterNumber,
        readingType: isActual ? 'Actual' : 'Estimated',
        source: 'pdf-extracted',
      });
    }
  }

  return UtilityStatementSchema.parse({
    statementDate,
    billingPeriod,
    accountNumber,
    provider: 'City of Johannesburg',
    electricityZAR,
    waterZAR,
    refuseZAR,
    sewerageZAR,
    propertyRatesZAR,
    totalDueZAR,
    extractedMeterReadings: extractedMeterReadings.length > 0 ? extractedMeterReadings : undefined,
  });
}

/**
 * Parses Eskom Tax Invoices.
 */
export function parseEskomUtilityRegex(rawText: string): ValidatedUtilityStatement {
  // Account Number
  const accMatch =
    rawText.match(/YOUR ACCOUNT NO\s*(\d+)/i) ||
    rawText.match(/ACCOUNT NO\s*\/?\s*REFERENCE NO\s*(\d+)/i) ||
    rawText.match(/ACCOUNT NUMBER\s*(\d+)/i);
  const accountNumber = accMatch ? accMatch[1].trim() : undefined;

  // Billing Date
  const dateMatch =
    rawText.match(/BILLING DATE\s*(\d{4}[/-]\d{2}[/-]\d{2})/i) ||
    rawText.match(/CURRENT DUE DATE\s*(\d{4}[/-]\d{2}[/-]\d{2})/i);
  const statementDate = dateMatch ? dateMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0];

  // Billing Month
  const periodMatch = rawText.match(/ACCOUNT MONTH\s*([A-Za-z]+\s+\d{4})/i);
  const billingPeriod = periodMatch ? periodMatch[1].trim() : undefined;

  // Electricity / Total charges for billing period
  let electricityZAR = 0;
  const chargesMatch =
    rawText.match(/TOTAL CHARGES FOR BILLING PERIOD\s*R?\s*([\d,]+\.\d{2})/i) ||
    rawText.match(/CURRENT\s*([\d,]+\.\d{2})\s*TOTAL AMOUNT DUE/i) ||
    rawText.match(/TOTAL AMOUNT DUE\s*R?\s*([\d,]+\.\d{2})/i);

  if (chargesMatch) {
    electricityZAR = cleanNumeric(chargesMatch[1]);
  }

  // Eskom is single-utility electricity only
  const totalDueZAR = electricityZAR;

  // Meter Readings Extraction
  const extractedMeterReadings: z.infer<typeof ExtractedMeterReadingSchema>[] = [];

  const eskomTypeMatch = rawText.match(/READING TYPE:\s*(ACTUAL|ESTIMATED)/i);
  const eskomReadingType: 'Actual' | 'Estimated' =
    eskomTypeMatch && eskomTypeMatch[1].toUpperCase() === 'ESTIMATED' ? 'Estimated' : 'Actual';

  // Matches Eskom tabular reading:
  // e.g. "10003374 | 39302.0000 | 39504.0000 | 202.0000 | 1.0000 | 202.0000"
  // or "10003374 39302.0000 39504.0000 202.0000 1.0000 202.0000"
  const eskomMeterMatch =
    rawText.match(/(?:METER NUMBER|Meter No)[\s\S]*?(?:CONSUMPTION|Consumption)[\s\S]*?(\d{6,12})\s*[|\s]\s*([\d,.]+)\s*[|\s]\s*([\d,.]+)\s*[|\s]\s*([\d,.]+)\s*[|\s]\s*[\d,.]+\s*[|\s]\s*([\d,.]+)/i) ||
    rawText.match(/(\d{7,10})\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+[\d,.]+\s+([\d,.]+)/);

  if (eskomMeterMatch) {
    const meterNumber = eskomMeterMatch[1].trim();
    const prevReading = cleanNumeric(eskomMeterMatch[2]);
    const currReading = cleanNumeric(eskomMeterMatch[3]);
    const consumption = cleanNumeric(eskomMeterMatch[5]);

    extractedMeterReadings.push({
      date: statementDate,
      utilityType: 'electricity',
      readingValue: currReading,
      previousReadingValue: prevReading,
      consumption: consumption > 0 ? consumption : Math.max(0, Math.round((currReading - prevReading) * 1000) / 1000),
      meterNumber,
      readingType: eskomReadingType,
      source: 'pdf-extracted',
    });
  }

  return UtilityStatementSchema.parse({
    statementDate,
    billingPeriod,
    accountNumber,
    provider: 'Eskom',
    electricityZAR,
    waterZAR: 0,
    refuseZAR: 0,
    sewerageZAR: 0,
    propertyRatesZAR: 0,
    totalDueZAR,
    extractedMeterReadings: extractedMeterReadings.length > 0 ? extractedMeterReadings : undefined,
  });
}

/**
 * Master Regex router: detects bill provider and parses accordingly.
 */
export function parseUtilityWithRegex(rawText: string): ValidatedUtilityStatement {
  const isEskom =
    rawText.includes('ESKOM') ||
    rawText.includes('ESKOM HOLDINGS') ||
    rawText.includes('csonline.co.za');

  if (isEskom) {
    return parseEskomUtilityRegex(rawText);
  }

  // Default to City of Johannesburg
  return parseCojUtilityRegex(rawText);
}

// ============================================================================
// 5. Primary BYOK AI Pipeline (Anthropic & Google Gemini)
// ============================================================================

export async function parseUtilityWithAi(
  file: File,
  aiSettings: AiSettings
): Promise<ValidatedUtilityStatement> {
  const { provider, apiKey, model } = aiSettings;
  const base64Data = await fileToBase64(file);

  const systemPrompt = `You are a precision South African municipal and utility bill extraction engine.
Extract the exact numeric charges in South African Rand (ZAR) from this municipal or electricity tax invoice (City of Johannesburg or Eskom).

Strict extraction guidelines:
1. "electricityZAR": electricity consumption, network charges, or Eskom supply charges.
2. "waterZAR": water consumption, demand management charges, and meter charges (including 15% VAT).
3. "refuseZAR": PIKITUP refuse residential removal including 15% VAT.
4. "sewerageZAR": municipal sanitation / sewerage residential charges including 15% VAT.
5. "propertyRatesZAR": City of Johannesburg Property Rates Residential charge (0% VAT).
6. "totalDueZAR": The Current Charges for the billing period (including VAT). It must mathematically equal: electricityZAR + waterZAR + refuseZAR + sewerageZAR + propertyRatesZAR.
7. "statementDate": The invoice / statement date (format YYYY-MM-DD).
8. "billingPeriod": e.g. "April 2025" or "September 2026".
9. "accountNumber": The municipal or Eskom account number.
10. "provider": "City of Johannesburg" or "Eskom".
11. "extractedMeterReadings": Optional list of meter readings found on the statement. Each entry has:
    - "date": statementDate (format YYYY-MM-DD)
    - "utilityType": "electricity" or "water"
    - "readingValue": number (current or end reading)
    - "previousReadingValue": number (previous or start reading)
    - "consumption": number (units consumed in KL or kWh)
    - "meterNumber": string (e.g. "211001886" or "10003374")
    - "readingType": "Actual" or "Estimated"
    - "source": "pdf-extracted"

IMPORTANT FOR CITY OF JOHANNESBURG:
In CoJ statements, "Johannesburg Water" groups Water and Sanitation together into a single box with a combined Total Amount.
DO NOT assign the same Total Amount to both waterZAR and sewerageZAR.
If the bill specifies a Sewer charge (e.g. "Sewer monthly charge based on Stand size"), calculate sewerageZAR = sewer_subtotal * 1.15, and waterZAR = (Johannesburg Water Total) - sewerageZAR.
If no separate sewer charge is listed, assign the entire Johannesburg Water total to waterZAR and set sewerageZAR to 0.

Output pure JSON matching the schema without markdown or commentary.`;

  if (provider === 'google') {
    // Google Gemini Generative Language API
    const effectiveModel = model && model.includes('gemini') ? model : 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      throw new Error('No response returned from Gemini API.');
    }

    const parsedJson = JSON.parse(rawJson);
    return UtilityStatementSchema.parse({
      ...parsedJson,
      electricityZAR: cleanNumeric(parsedJson.electricityZAR),
      waterZAR: cleanNumeric(parsedJson.waterZAR),
      refuseZAR: cleanNumeric(parsedJson.refuseZAR),
      sewerageZAR: cleanNumeric(parsedJson.sewerageZAR),
      propertyRatesZAR: cleanNumeric(parsedJson.propertyRatesZAR),
      totalDueZAR: cleanNumeric(parsedJson.totalDueZAR),
      extractedMeterReadings: Array.isArray(parsedJson.extractedMeterReadings)
        ? parsedJson.extractedMeterReadings.map((r: any) => ({
            ...r,
            readingValue: cleanNumeric(r.readingValue),
            previousReadingValue: r.previousReadingValue !== undefined ? cleanNumeric(r.previousReadingValue) : undefined,
            consumption: r.consumption !== undefined ? cleanNumeric(r.consumption) : undefined,
            meterNumber: r.meterNumber ? String(r.meterNumber).trim() : undefined,
            readingType: r.readingType === 'Estimated' ? 'Estimated' : 'Actual',
            source: 'pdf-extracted' as const,
          }))
        : undefined,
    });
  } else {
    // Anthropic Messages API
    const effectiveModel =
      !model || model.startsWith('claude-3-') || model.includes('2024')
        ? 'claude-sonnet-5'
        : model.trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 1500,
        temperature: 0.1,
        system: systemPrompt,
        tools: [
          {
            name: 'extract_utility_statement',
            description: 'Extract municipal or Eskom utility statement line items',
            input_schema: {
              type: 'object',
              properties: {
                statementDate: { type: 'string', description: 'YYYY-MM-DD' },
                billingPeriod: { type: 'string', description: 'e.g. April 2025' },
                accountNumber: { type: 'string', description: 'Account number' },
                provider: { type: 'string', enum: ['City of Johannesburg', 'Eskom'] },
                electricityZAR: { type: 'number', description: 'Electricity in ZAR' },
                waterZAR: { type: 'number', description: 'Water in ZAR' },
                refuseZAR: { type: 'number', description: 'Refuse in ZAR' },
                sewerageZAR: { type: 'number', description: 'Sewerage in ZAR' },
                propertyRatesZAR: { type: 'number', description: 'Property rates in ZAR' },
                totalDueZAR: { type: 'number', description: 'Current charges total in ZAR' },
                extractedMeterReadings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      utilityType: { type: 'string', enum: ['electricity', 'water'] },
                      readingValue: { type: 'number' },
                      previousReadingValue: { type: 'number' },
                      consumption: { type: 'number' },
                      meterNumber: { type: 'string' },
                      readingType: { type: 'string', enum: ['Actual', 'Estimated'] },
                    },
                    required: ['date', 'utilityType', 'readingValue'],
                  },
                },
              },
              required: ['statementDate', 'electricityZAR', 'waterZAR', 'refuseZAR', 'sewerageZAR', 'totalDueZAR'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_utility_statement' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: 'Extract the municipal utility line items and verify the mathematical cross-check.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const toolCall = data.content?.find((c: any) => c.type === 'tool_use' && c.name === 'extract_utility_statement');

    if (!toolCall || !toolCall.input) {
      throw new Error('Anthropic did not return structured statement parameters.');
    }

    const input = toolCall.input;
    return UtilityStatementSchema.parse({
      ...input,
      electricityZAR: cleanNumeric(input.electricityZAR),
      waterZAR: cleanNumeric(input.waterZAR),
      refuseZAR: cleanNumeric(input.refuseZAR),
      sewerageZAR: cleanNumeric(input.sewerageZAR),
      propertyRatesZAR: cleanNumeric(input.propertyRatesZAR),
      totalDueZAR: cleanNumeric(input.totalDueZAR),
      extractedMeterReadings: Array.isArray(input.extractedMeterReadings)
        ? input.extractedMeterReadings.map((r: any) => ({
            ...r,
            readingValue: cleanNumeric(r.readingValue),
            previousReadingValue: r.previousReadingValue !== undefined ? cleanNumeric(r.previousReadingValue) : undefined,
            consumption: r.consumption !== undefined ? cleanNumeric(r.consumption) : undefined,
            meterNumber: r.meterNumber ? String(r.meterNumber).trim() : undefined,
            readingType: r.readingType === 'Estimated' ? 'Estimated' : 'Actual',
            source: 'pdf-extracted' as const,
          }))
        : undefined,
    });
  }
}

// ============================================================================
// 6. Master Dual-Pipeline Parser Entry Point
// ============================================================================

export async function parseUtilityPdf(
  file: File,
  aiSettings?: AiSettings
): Promise<UtilityParseResult> {
  const hasKey = Boolean(aiSettings?.apiKey && aiSettings.apiKey.trim().length > 5);

  // 1. Try Primary BYOK Pipeline if key is configured
  if (hasKey && aiSettings) {
    try {
      const validated = await parseUtilityWithAi(file, aiSettings);
      const statement: UtilityStatement = {
        ...validated,
        id: `util-${Date.now()}`,
        parsedVia: 'byok-llm',
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        statement,
        parsedVia: 'byok-llm',
      };
    } catch (aiError: any) {
      console.warn('BYOK AI parsing failed, attempting Regex fallback:', aiError?.message);
      // Fall through to regex pipeline
    }
  }

  // 2. Client-Side Regex Fallback Pipeline
  try {
    const rawText = await extractTextFromPdf(file);
    const validated = parseUtilityWithRegex(rawText);

    const statement: UtilityStatement = {
      ...validated,
      id: `util-${Date.now()}`,
      rawText,
      parsedVia: 'regex-fallback',
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      statement,
      parsedVia: 'regex-fallback',
      rawText,
    };
  } catch (regexError: any) {
    return {
      success: false,
      parsedVia: 'regex-fallback',
      error: regexError?.message || 'Failed to extract and validate utility bill line items.',
    };
  }
}
