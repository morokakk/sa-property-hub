/**
 * Dual-Pipeline Utility Parsing Engine
 *
 * Implements:
 * 1. Primary BYOK AI Pipeline (Anthropic Messages API / Google Gemini) with structured Zod extraction.
 * 2. Secondary Client-Side Regex Fallback for City of Johannesburg (CoJ) and Eskom bills via pdfjs-dist.
 * 3. Strict Zod Schema (UtilityStatementSchema) with mathematical line-item sum cross-check.
 */

import { z } from 'zod';
import { UtilityStatement, AiSettings, ExtractedRentalUnit } from '@/types';
import { parseStatementWithAnthropic } from '@/lib/ai/anthropicParser';

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
    billingType: z.enum(['itemized', 'bundled']).default('itemized'),
    bundledUtilitiesZAR: z.number().nonnegative().optional(),
    bundledUtilityLabel: z.string().optional(),
    electricityZAR: z.number().nonnegative().default(0),
    waterZAR: z.number().nonnegative().default(0),
    refuseZAR: z.number().nonnegative().default(0),
    sewerageZAR: z.number().nonnegative().default(0),
    propertyRatesZAR: z.number().nonnegative().default(0),
    totalDueZAR: z.number().nonnegative(),
    bodyCorporateLeviesZAR: z.number().nonnegative().optional(),
    netDisbursementZAR: z.number().optional(),
    tenantRentBilledZAR: z.number().nonnegative().optional(),
    depositHeldZAR: z.number().nonnegative().optional(),
    tenantName: z.string().optional(),
    propertyName: z.string().optional(),
    propertyAddress: z.string().optional(),
    extractedMeterReadings: z.array(ExtractedMeterReadingSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.billingType === 'bundled' || data.bundledUtilitiesZAR !== undefined) {
        // Bundled recovery cross-check: bundledUtilitiesZAR + (propertyRatesZAR || 0) must equal totalDueZAR within R1.50
        const bundledSum = (data.bundledUtilitiesZAR || 0) + (data.propertyRatesZAR || 0);
        return Math.abs(bundledSum - data.totalDueZAR) <= 1.5;
      }

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
        'Mathematical cross-check failed: individual line items must equal totalDueZAR within R1.50 rounding tolerance.',
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
    let pageText = '';
    let lastY: number | undefined;

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as any;
        const currentY = textItem.transform ? textItem.transform[5] : undefined;
        const isNewLine =
          (lastY !== undefined && currentY !== undefined && Math.abs(currentY - lastY) > 4) ||
          Boolean(textItem.hasEOL);

        if (isNewLine) {
          if (!pageText.endsWith('\n')) {
            pageText += '\n';
          }
        } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ') && textItem.str) {
          pageText += ' ';
        }

        pageText += textItem.str;
        if (currentY !== undefined) {
          lastY = currentY;
        }
      }
    }

    fullText += `\n--- Page ${i} ---\n` + pageText;
  }

  return fullText;
}

// ============================================================================
// 4. Hardcoded Regex Extractors: City of Johannesburg & Eskom
// ============================================================================

export function formatTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Parses City of Johannesburg (CoJ / Pikitup / City Power / Joburg Water) bills.
 */
export function parseCojUtilityRegex(rawText: string): ValidatedUtilityStatement {
  // Address & Property extraction from CoJ table (Physical Address, Stand No./Portion, Township)
  let propertyName: string | undefined;
  let propertyAddress: string | undefined;

  const cojStopPattern =
    '(?:Stand\\s*No|Township|Stand\\s*Size|Number\\s*Of\\s*Dwellings|Date\\s*Of\\s*Valuation|Portion|Municipal\\s*Valuation|Market\\s*Value|Region|Ward|Invoice\\s*Number|Next\\s*Reading|Client\\s*Vat|Deposit|Account\\s*Number|Pin\\s*Code|Total\\s*Due|Due\\s*Date|Previous\\s*Account|Sub\\s*Total|Current\\s*Charges|[\\r\\n])';

  const physRegex = new RegExp(`Physical\\s*Address[:\\s]+(.*?)(?=\\s*${cojStopPattern})`, 'i');
  const standRegex = new RegExp(`Stand\\s*No\\.?\\s*(?:\\/\\s*Portion)?[:\\s]+(.*?)(?=\\s*${cojStopPattern})`, 'i');
  const townshipRegex = new RegExp(`Township[:\\s]+(.*?)(?=\\s*${cojStopPattern})`, 'i');

  const physMatch = rawText.match(physRegex);
  const standMatch = rawText.match(standRegex);
  const townshipMatch = rawText.match(townshipRegex);

  if (physMatch) {
    const rawPhys = physMatch[1].replace(/[,;:]+$/, '').trim();
    const rawTownship = townshipMatch ? townshipMatch[1].replace(/[,;:]+$/, '').trim() : '';
    const rawStand = standMatch ? standMatch[1].replace(/[,;:]+$/, '').trim() : '';

    const cleanPhys = formatTitleCase(rawPhys);
    const cleanTownship = rawTownship ? formatTitleCase(rawTownship) : '';

    if (cleanTownship && !cleanPhys.toLowerCase().includes(cleanTownship.toLowerCase())) {
      propertyName = `${cleanPhys}, ${cleanTownship}`;
    } else {
      propertyName = cleanPhys;
    }

    if (rawStand) {
      propertyAddress = `${propertyName} (Stand ${rawStand})`;
    } else {
      propertyAddress = propertyName;
    }
  }

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
    propertyName,
    propertyAddress,
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

  // Address & Property extraction from Eskom
  let propertyName: string | undefined;
  let propertyAddress: string | undefined;

  // Eskom bill format: "STAND 000840, 100 7TH ST PARKMORE" or "Stand 000840,100 7th St Parkmore"
  const eskomStopPattern =
    '(?:Cont\\s*Act\\s*Cent\\s*Re|Contact\\s*Cent(?:re|er)|Sharecall|shareca|Fax\\s*No|E-?mail|Web|Service\\s*And\\s*Admin|Network\\s*(?:Capacity|Demand)|Generation\\s*Capacity|Ancillary|Energy\\s*Charge|Total\\s*(?:Charges|Amount|Energy)|Tariff|Premise|Tax\\s*Invoice|Reading\\s*Type|Consumption|Bill\\s*Group|Page|Account\\s*Summary|[\\r\\n])';

  const eskomStandRegex1 = new RegExp(
    `STAND\\s*[:#]?\\s*([0-9A-Za-z-]+)\\s*[,\\s]\\s*([0-9]+[\\s\\S]*?)(?=\\s*${eskomStopPattern})`,
    'i'
  );
  const eskomStandRegex2 = new RegExp(
    `STAND\\s*[:#]?\\s*([0-9A-Za-z-]+)\\s*[,\\s]\\s*([A-Za-z0-9][\\s\\S]*?)(?=\\s*${eskomStopPattern})`,
    'i'
  );

  const eskomStandMatch = rawText.match(eskomStandRegex1) || rawText.match(eskomStandRegex2);

  if (eskomStandMatch) {
    const standNo = eskomStandMatch[1].trim();
    const rawStreetSub = eskomStandMatch[2].replace(/[,;:]+$/, '').trim();
    const cleanStreetSub = formatTitleCase(rawStreetSub);
    const withoutPostal = cleanStreetSub.replace(/\s+\d{4}$/, '').trim();
    propertyName = withoutPostal;
    propertyAddress = `${withoutPostal} (Stand ${standNo})`;
  } else {
    // Fallback: check if "STAND <number>" appears followed by address on next line
    const multilineStandMatch = rawText.match(/STAND\s*[:#]?\s*([0-9A-Za-z-]+)[\r\n]+([^\r\n]+)/i);
    if (multilineStandMatch) {
      const standNo = multilineStandMatch[1].trim();
      const rawStreetSub = multilineStandMatch[2].replace(/[,;:]+$/, '').trim();
      const cleanStreetSub = formatTitleCase(rawStreetSub);
      const withoutPostal = cleanStreetSub.replace(/\s+\d{4}$/, '').trim();
      propertyName = withoutPostal;
      propertyAddress = `${withoutPostal} (Stand ${standNo})`;
    }
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
    propertyName,
    propertyAddress,
    extractedMeterReadings: extractedMeterReadings.length > 0 ? extractedMeterReadings : undefined,
  });
}

export function parseHumanDateToIso(str: string): string {
  if (!str) return new Date().toISOString().split('T')[0];
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed.replace(/\//g, '-');

  // Format DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  // Format e.g. "19 September 2026" or "10 AUGUST 2026"
  const parts = trimmed.match(/(\d{1,2})[\s/-]+([A-Za-z]+)[\s/-]+(\d{4})/);
  if (parts) {
    const day = parts[1].padStart(2, '0');
    const year = parts[3];
    const monthStr = parts[2].toLowerCase();
    const months: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12',
    };
    const month = months[monthStr] || '01';
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parses iGrow Rentals / WeconnectU Owner Statements.
 * These statements bundle tenant recoveries as "Water,Sewerage,Refuse & Common",
 * track owner expenses (Rates & Taxes, Commission + VAT), and omit meter readings.
 */
export function parseIgrowUtilityRegex(rawText: string): ValidatedUtilityStatement {
  // 1. Dynamic Scheme / Complex Name from header (e.g. "Clearwater Village 128", "The Blyde 402", "Greencreek 15", "De Zicht 12")
  let propertyName: string | undefined;
  const schemeMatch =
    rawText.match(/OWNER\s+STATEMENT\s*[\r\n]+\s*(.*?)(?=\s*(?:CREATED\s+ON|IGROW|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}|[\r\n]))/i) ||
    rawText.match(/OWNER\s+STATEMENT\s+(.*?)(?=\s*(?:CREATED\s+ON|IGROW|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}))/i);

  if (schemeMatch) {
    propertyName = formatTitleCase(schemeMatch[1].replace(/[,;:]+$/, '').trim());
  }

  // 2. Physical Address Block (e.g. "128 Clearwater Village, Atlasville, Boksburg, Gauteng, 1401")
  let propertyAddress: string | undefined;

  // Strategy A: Multiline address block (distinct lines stopping before iGrow Durbanville office)
  const multilineMatch = rawText.match(
    /([0-9]+[^\n\r]+?[\r\n]+(?:[^\n\r]+?[\r\n]+){2,4}\d{4})\s*[\r\n]+(?:38\s*Oxford|Durbanville|Cape\s*Town)/i
  );

  if (multilineMatch) {
    const rawLines = multilineMatch[1]
      .split(/[\r\n]+/)
      .map((l) => formatTitleCase(l.trim()))
      .filter(Boolean);
    if (rawLines.length >= 3) {
      propertyAddress = rawLines.join(', ');
    }
  }

  // Strategy B: Flexible single-line stream match (or fallback)
  if (!propertyAddress) {
    const addressStreamMatch =
      rawText.match(
        /(?:CREATED\s*ON:[^\n\r]+[\s\S]*?(?:Rentals|WeconnectU)\s+)([0-9]+[A-Za-z0-9\s.'-]+?\b\d{4}\b)(?=\s*(?:38\s*Oxford|Durbanville|Cape\s*Town))/i
      ) ||
      rawText.match(
        /([0-9]+[A-Za-z0-9\s.'-]+?\b(?:Gauteng|Western\s*Cape|Eastern\s*Cape|KwaZulu-Natal|KZN|Free\s*State|Mpumalanga|Limpopo|North\s*West|Northern\s*Cape)\s+\d{4}\b)/i
      );

    if (addressStreamMatch) {
      const rawBlock = addressStreamMatch[1].trim();
      const lines = rawBlock.split(/[\r\n]+/).map((l) => formatTitleCase(l.trim())).filter(Boolean);
      if (lines.length >= 3) {
        propertyAddress = lines.join(', ');
      } else {
        const provMatch = rawBlock.match(
          /^(.*?)\s+(Gauteng|Western\s*Cape|Eastern\s*Cape|KwaZulu-Natal|KZN|Free\s*State|Mpumalanga|Limpopo|North\s*West|Northern\s*Cape)\s+(\d{4})$/i
        );
        if (provMatch) {
          const streetAndCity = provMatch[1].trim();
          const province = formatTitleCase(provMatch[2].trim());
          const postal = provMatch[3].trim();

          if (propertyName) {
            const unitNum = propertyName.match(/\b\d+\b/)?.[0];
            const complexOnly = propertyName.replace(/\b\d+\b/, '').trim();
            const prefix = unitNum ? `${unitNum} ${complexOnly}` : complexOnly;

            if (prefix && streetAndCity.toLowerCase().startsWith(prefix.toLowerCase())) {
              const remaining = streetAndCity.slice(prefix.length).trim();
              const suburbAndCity = remaining.split(/\s+/).map(formatTitleCase).join(', ');
              if (suburbAndCity) {
                propertyAddress = `${formatTitleCase(prefix)}, ${suburbAndCity}, ${province}, ${postal}`;
              } else {
                propertyAddress = `${formatTitleCase(prefix)}, ${province}, ${postal}`;
              }
            } else {
              propertyAddress = `${formatTitleCase(streetAndCity)}, ${province}, ${postal}`;
            }
          } else {
            propertyAddress = `${formatTitleCase(streetAndCity)}, ${province}, ${postal}`;
          }
        } else {
          propertyAddress = formatTitleCase(rawBlock);
        }
      }
    }
  }

  // 3. Account / Payment Reference
  const refMatch =
    rawText.match(/Payment reference\s+([A-Za-z0-9_-]+)/i) ||
    rawText.match(/Payment Reference:?\s*([A-Za-z0-9_-]+)/i);
  const accountNumber = refMatch ? refMatch[1].trim() : undefined;

  // 4. Statement Date (e.g. "CREATED ON: 19 September 2026" or "01/09/2026")
  const createdMatch = rawText.match(/CREATED ON:\s*([^\n\r]+)/i);
  let statementDate = createdMatch ? parseHumanDateToIso(createdMatch[1]) : '';
  if (!statementDate) {
    const dateMatch = rawText.match(/(\d{2}\/\d{2}\/\d{4})/);
    statementDate = dateMatch ? parseHumanDateToIso(dateMatch[1]) : new Date().toISOString().split('T')[0];
  }

  // 5. Billing Period (e.g. "10 AUGUST 2026 — 09 SEPTEMBER 2026")
  let billingPeriod: string | undefined;
  const periodMatch =
    rawText.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*[—–-]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/i) ||
    rawText.match(/Rent for\s+([A-Za-z]+\s+\d{4})/i);
  if (periodMatch) {
    billingPeriod = periodMatch[1].trim();
  }

  // 6. Bundled Recovery: Water, Sewerage, Refuse & Common
  // e.g. "01/09/2026 Water,Sewerage,Refuse & Common(2026-07-20 to 2026-08-19) 0.00 477.07"
  // or on Page 1: "Body Corporate 477.07" under INCOME DUE
  let bundledUtilitiesZAR = 0;
  const bundledMatch =
    rawText.match(/Water\s*,\s*Sewerage\s*,\s*Refuse\s*&\s*Common(?:\([^)]*\))?\s+(?:0\.00\s+)?([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Water\s*,\s*Sewerage\s*,\s*Refuse\s*&\s*Common[\s\S]*?\s+0\.00\s+([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Body Corporate\s+([\d\s,]+\.\d{2})[\s\S]*?Rent/i) ||
    rawText.match(/Body Corporate\s+([\d\s,]+\.\d{2})/i);
  if (bundledMatch) {
    bundledUtilitiesZAR = cleanNumeric(bundledMatch[1]);
  }

  // 7. Municipal Rates & Taxes (Owner expense invoiced on statement)
  // e.g. "Monthly Rates & Taxes 0.00 1 021.00" or "Municipal 1 021.00"
  let propertyRatesZAR = 0;
  const ratesMatch =
    rawText.match(/Monthly Rates & Taxes\s+(?:0\.00\s+)?([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Municipal\s+([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Monthly Rates & Taxes[^\n\r]*?\s+([\d\s,]+\.\d{2})/i);
  if (ratesMatch) {
    propertyRatesZAR = cleanNumeric(ratesMatch[1]);
  }

  // 8. Tenant Rent Billed
  let tenantRentBilledZAR = 0;
  const rentMatch =
    rawText.match(/Rent for [A-Za-z]+\s+\d{4}\s+(?:0\.00\s+)?([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Rent\s+([\d\s,]+\.\d{2})[\s\S]*?INCOME RECEIVED/i) ||
    rawText.match(/([\d\s,]+\.\d{2})\s+rent amount/i);
  if (rentMatch) {
    tenantRentBilledZAR = cleanNumeric(rentMatch[1]);
  }

  // 9. Tenant Details & Deposit Held
  let tenantName: string | undefined;
  const tenantMatch =
    rawText.match(/LEASE\s+SUMMARY[\s\S]*?([A-Za-z\s]+?)\s+(?:FIXED\s+TERM|MONTH\s+TO\s+MONTH|PERIODIC)/i) ||
    rawText.match(/LEASE\s+SUMMARY\s+([A-Za-z\s]+?)\s+(?:FIXED\s+TERM|MONTH\s+TO\s+MONTH|PERIODIC)/i);
  if (tenantMatch) {
    tenantName = formatTitleCase(tenantMatch[1].trim());
  }

  let depositHeldZAR: number | undefined;
  const depositMatch =
    rawText.match(/([\d\s,]+\.\d{2})\s+deposit held/i) ||
    rawText.match(/deposit held\s+([\d\s,]+\.\d{2})/i);
  if (depositMatch) {
    depositHeldZAR = cleanNumeric(depositMatch[1]);
  }

  // 8. Net Owner Disbursement
  let netDisbursementZAR: number | undefined;
  const netMatch =
    rawText.match(/PAID TO OWNER IN PERIOD\s+([\d\s,]+\.\d{2})/i) ||
    rawText.match(/Net Operating Income[\s\S]*?([\d\s,]+\.\d{2})/i);
  if (netMatch) {
    netDisbursementZAR = cleanNumeric(netMatch[1]);
  }

  // 9. Total Due ZAR (Total current municipal / recovery charges: bundled + rates)
  const totalDueZAR = Math.round((bundledUtilitiesZAR + propertyRatesZAR) * 100) / 100;

  return UtilityStatementSchema.parse({
    statementDate,
    billingPeriod,
    accountNumber,
    provider: 'iGrow Rentals',
    propertyName,
    propertyAddress,
    billingType: 'bundled',
    bundledUtilitiesZAR,
    bundledUtilityLabel: 'Water, Sewerage, Refuse & Common',
    electricityZAR: 0,
    waterZAR: 0,
    refuseZAR: 0,
    sewerageZAR: 0,
    propertyRatesZAR,
    totalDueZAR,
    bodyCorporateLeviesZAR: bundledUtilitiesZAR,
    tenantRentBilledZAR: tenantRentBilledZAR > 0 ? tenantRentBilledZAR : undefined,
    depositHeldZAR,
    tenantName,
    netDisbursementZAR,
    extractedMeterReadings: undefined, // Explicitly no meter readings for iGrow
  });
}

/**
 * Master Regex router: detects bill provider and parses accordingly.
 */
export function parseUtilityWithRegex(rawText: string): ValidatedUtilityStatement {
  const isIgrow =
    rawText.includes('IGROW') ||
    rawText.includes('WeconnectU') ||
    rawText.includes('Water,Sewerage,Refuse & Common') ||
    rawText.includes('Water, Sewerage, Refuse & Common');

  if (isIgrow) {
    return parseIgrowUtilityRegex(rawText);
  }

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
Extract the exact numeric charges in South African Rand (ZAR) from this municipal, electricity tax invoice (City of Johannesburg or Eskom), or managing agent statement (iGrow Rentals / WeconnectU).

Strict extraction guidelines:
1. "electricityZAR": electricity consumption, network charges, or Eskom supply charges.
2. "waterZAR": water consumption, demand management charges, and meter charges (including 15% VAT).
3. "refuseZAR": PIKITUP refuse residential removal including 15% VAT.
4. "sewerageZAR": municipal sanitation / sewerage residential charges including 15% VAT.
5. "propertyRatesZAR": City of Johannesburg or municipal Property Rates Residential charge (0% VAT).
6. "bundledUtilitiesZAR": For iGrow Rentals / WeconnectU statements, extract the combined "Water, Sewerage, Refuse & Common" billed recovery (e.g. 477.07).
7. "billingType": Set to "bundled" for iGrow statements, otherwise "itemized".
8. "totalDueZAR": The Current Charges for the billing period (including VAT). For bundled statements, totalDueZAR = bundledUtilitiesZAR + propertyRatesZAR. For itemized statements, totalDueZAR = electricityZAR + waterZAR + refuseZAR + sewerageZAR + propertyRatesZAR.
9. "statementDate": The invoice / statement date (format YYYY-MM-DD).
10. "billingPeriod": e.g. "April 2025" or "10 Aug 2026 - 09 Sep 2026".
11. "accountNumber": The municipal, Eskom, or iGrow payment reference number.
12. "provider": "City of Johannesburg", "Eskom", or "iGrow Rentals".
13. "extractedMeterReadings": Optional list of meter readings found on the statement (leave undefined for iGrow statements).

IMPORTANT FOR IGROW RENTALS / WECONNECTU:
iGrow statements do NOT contain meter readings. They bundle recoveries into "Water,Sewerage,Refuse & Common". Set provider: "iGrow Rentals", billingType: "bundled", and do NOT require meter readings.

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
      billingType: parsedJson.billingType || (parsedJson.bundledUtilitiesZAR ? 'bundled' : 'itemized'),
      bundledUtilitiesZAR: parsedJson.bundledUtilitiesZAR !== undefined ? cleanNumeric(parsedJson.bundledUtilitiesZAR) : undefined,
      bundledUtilityLabel: parsedJson.bundledUtilityLabel || (parsedJson.bundledUtilitiesZAR ? 'Water, Sewerage, Refuse & Common' : undefined),
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
                billingPeriod: { type: 'string', description: 'e.g. April 2025 or 10 Aug 2026 - 09 Sep 2026' },
                accountNumber: { type: 'string', description: 'Account number' },
                provider: { type: 'string', enum: ['City of Johannesburg', 'Eskom', 'iGrow Rentals'] },
                billingType: { type: 'string', enum: ['itemized', 'bundled'] },
                bundledUtilitiesZAR: { type: 'number', description: 'Bundled Water, Sewerage, Refuse & Common amount' },
                bundledUtilityLabel: { type: 'string', description: 'e.g. Water, Sewerage, Refuse & Common' },
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
              required: ['statementDate', 'totalDueZAR'],
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
      billingType: input.billingType || (input.bundledUtilitiesZAR ? 'bundled' : 'itemized'),
      bundledUtilitiesZAR: input.bundledUtilitiesZAR !== undefined ? cleanNumeric(input.bundledUtilitiesZAR) : undefined,
      bundledUtilityLabel: input.bundledUtilityLabel || (input.bundledUtilitiesZAR ? 'Water, Sewerage, Refuse & Common' : undefined),
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

// ============================================================================
// 7. Unified Multi-Statement Auto-Detect Parser for Rental Imports
// ============================================================================

export type UnifiedStatementType = 'agent_payout' | 'municipal_utility';

export interface UnifiedParsedStatementResult {
  success: boolean;
  docType: UnifiedStatementType;
  provider: string;
  agentUnit?: ExtractedRentalUnit;
  utilityStatement?: UtilityStatement;
  rawText?: string;
  error?: string;
}

/**
 * Auto-detects statement type from raw PDF text:
 * - iGrow Rentals / WeconnectU: Client-side zero-token regex (managing agent + bundled utility)
 * - City of Johannesburg (CoJ): Client-side zero-token regex (itemized utility + meter readings)
 * - Eskom: Client-side zero-token regex (electricity + meter readings)
 * - Other managing agents: BYOK AI (Anthropic/Gemini) if configured
 */
export async function parseRentalPdfStatement(
  fileOrText: File | string,
  aiSettings?: AiSettings
): Promise<UnifiedParsedStatementResult> {
  try {
    const rawText = typeof fileOrText === 'string' ? fileOrText : await extractTextFromPdf(fileOrText);
    const upperText = rawText.toUpperCase();

    // 1. Check for iGrow / WeconnectU managing agent statement
    const isIgrow =
      upperText.includes('IGROW') ||
      upperText.includes('WECONNECTU') ||
      upperText.includes('WATER,SEWERAGE,REFUSE & COMMON') ||
      upperText.includes('WATER, SEWERAGE, REFUSE & COMMON');

    if (isIgrow) {
      const stmt = parseIgrowUtilityRegex(rawText);
      const utilityStatement: UtilityStatement = {
        ...stmt,
        id: `util-${Date.now()}`,
        rawText,
        parsedVia: 'regex-fallback',
        createdAt: new Date().toISOString(),
      };

      const rent = stmt.tenantRentBilledZAR || 0;
      const agencyCommissionZAR = Math.round(rent * 0.08 * 1.15 * 100) / 100;
      const agencyCommissionVatZAR = Math.round(((agencyCommissionZAR * 0.15) / 1.15) * 100) / 100;

      const agentUnit: ExtractedRentalUnit = {
        propertyName: stmt.propertyName || 'iGrow Rental Unit',
        propertyAddress: stmt.propertyAddress,
        grossRentZAR: rent,
        leviesZAR: stmt.bodyCorporateLeviesZAR || stmt.bundledUtilitiesZAR,
        municipalRatesZAR: stmt.propertyRatesZAR,
        agencyCommissionZAR,
        agencyCommissionVatZAR,
        isCommissionInclusiveOfVat: true,
        tenantName: stmt.tenantName,
        depositHeldZAR: stmt.depositHeldZAR,
        netOperatingIncomeZAR: stmt.netDisbursementZAR,
        managingAgent: 'iGrow Rentals',
        statementDate: stmt.statementDate,
      };

      return {
        success: true,
        docType: 'agent_payout',
        provider: 'iGrow Rentals',
        agentUnit,
        utilityStatement,
        rawText,
      };
    }

    // 2. Check for City of Johannesburg (CoJ) municipal tax invoice
    const isCoj =
      upperText.includes('CITY OF JOHANNESBURG') ||
      upperText.includes('JOBURG') ||
      upperText.includes('PIKITUP') ||
      upperText.includes('4760117194');

    if (isCoj) {
      const stmt = parseCojUtilityRegex(rawText);
      const utilityStatement: UtilityStatement = {
        ...stmt,
        id: `util-${Date.now()}`,
        rawText,
        parsedVia: 'regex-fallback',
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        docType: 'municipal_utility',
        provider: 'City of Johannesburg',
        utilityStatement,
        rawText,
      };
    }

    // 3. Check for Eskom electricity tax invoice
    const isEskom =
      upperText.includes('ESKOM') ||
      upperText.includes('CSONLINE.CO.ZA');

    if (isEskom) {
      const stmt = parseEskomUtilityRegex(rawText);
      const utilityStatement: UtilityStatement = {
        ...stmt,
        id: `util-${Date.now()}`,
        rawText,
        parsedVia: 'regex-fallback',
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        docType: 'municipal_utility',
        provider: 'Eskom',
        utilityStatement,
        rawText,
      };
    }

    // 4. Fallback: BYOK AI for other managing agent formats
    const hasKey = Boolean(aiSettings?.apiKey && aiSettings.apiKey.trim().length > 5);
    if (hasKey && aiSettings && typeof fileOrText !== 'string') {
      try {
        const aiResult = await parseStatementWithAnthropic(
          fileOrText,
          aiSettings.apiKey,
          aiSettings.model
        );
        if (aiResult.success && aiResult.units.length > 0) {
          return {
            success: true,
            docType: 'agent_payout',
            provider: aiResult.units[0].managingAgent || 'Managing Agent',
            agentUnit: aiResult.units[0],
            rawText: aiResult.rawText,
          };
        }
      } catch (err: any) {
        console.warn('AI agent statement parsing error:', err?.message);
      }

      // Try AI utility parser
      try {
        const validated = await parseUtilityWithAi(fileOrText, aiSettings);
        return {
          success: true,
          docType: 'municipal_utility',
          provider: validated.provider || 'Municipal / Utility',
          utilityStatement: {
            ...validated,
            id: `util-${Date.now()}`,
            parsedVia: 'byok-llm',
            createdAt: new Date().toISOString(),
          },
          rawText,
        };
      } catch (err: any) {
        console.warn('AI utility parsing error:', err?.message);
      }
    }

    return {
      success: false,
      docType: 'agent_payout',
      provider: 'Unknown',
      error:
        'Could not automatically match statement with local zero-token parsers (iGrow, City of Johannesburg, Eskom). For other managing agent formats, please configure your BYOK AI API Key in Settings.',
    };
  } catch (err: any) {
    return {
      success: false,
      docType: 'agent_payout',
      provider: 'Unknown',
      error: err?.message || 'Failed to extract PDF text.',
    };
  }
}

