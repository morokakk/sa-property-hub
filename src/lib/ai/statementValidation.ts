import { z } from 'zod';
import { ExtractedRentalUnit } from '@/types';

/**
 * Strict Zod schema enforcing numeric types and preventing formatted currency strings
 * from bypassing validation.
 */
export const ExtractedRentalUnitSchema = z.object({
  propertyName: z.string().min(1, 'Property name is mandatory'),
  address: z.string().optional(),
  propertyAddress: z.string().optional(),
  tenantName: z.string().optional().default('Tenant Unassigned'),
  leaseExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lease expiry must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  leaseEndDate: z.string().optional(),
  grossRentZAR: z.number().positive('Gross rent must be greater than 0'),
  leviesZAR: z.number().min(0, 'Levies cannot be negative').default(0),
  municipalRatesZAR: z.number().min(0, 'Municipal rates cannot be negative').default(0),
  agencyCommissionZAR: z.number().min(0, 'Agency commission cannot be negative').default(0),
  agencyCommissionVatZAR: z.number().min(0).optional(),
  isCommissionInclusiveOfVat: z.boolean().optional(),
  estimatedMarketValueZAR: z.number().positive().optional(),
  purchasePriceZAR: z.number().positive().optional(),
  depositHeldZAR: z.number().optional(),
  netOperatingIncomeZAR: z.number().optional().default(0),
  netPayoutZAR: z.number().optional(),
  managingAgent: z.string().optional(),
  statementDate: z.string().optional(),
}).transform((data) => {
  const finalAddress = data.address || data.propertyAddress;
  const finalNet = data.netOperatingIncomeZAR || data.netPayoutZAR || 0;
  const finalLease = data.leaseExpiryDate || data.leaseEndDate;
  const isVatInclusive =
    data.isCommissionInclusiveOfVat !== undefined
      ? data.isCommissionInclusiveOfVat
      : true; // SA managing agent deduction ledgers default to VAT inclusive
  return {
    ...data,
    address: finalAddress,
    propertyAddress: finalAddress,
    netOperatingIncomeZAR: finalNet,
    leaseExpiryDate: finalLease,
    leaseEndDate: finalLease,
    isCommissionInclusiveOfVat: isVatInclusive,
  };
});

/**
 * Normalizes raw LLM tool-use payload to ensure `units` is a valid array of objects
 * even if the model serialized it as a JSON string, wrapped it under a different key,
 * or returned a single unit object directly.
 */
export function normalizeStatementPayload(raw: unknown): unknown {
  let data = raw;

  // 1. If payload itself is a JSON string, parse it
  if (typeof data === 'string') {
    const trimmed = data.trim();
    try {
      data = JSON.parse(trimmed);
    } catch {
      const startArr = trimmed.indexOf('[');
      const endArr = trimmed.lastIndexOf(']');
      if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
        try {
          data = { units: JSON.parse(trimmed.slice(startArr, endArr + 1)) };
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. If data is an array directly, wrap it into { units: data }
  if (Array.isArray(data)) {
    data = { units: data };
  }

  // 3. If data is an object
  if (data && typeof data === 'object') {
    const obj = { ...(data as Record<string, any>) };

    // If units is a string (e.g. JSON stringified array "[{...}]"), parse it
    if (typeof obj.units === 'string') {
      const trimmedUnits = obj.units.trim();
      try {
        const parsedUnits = JSON.parse(trimmedUnits);
        obj.units = Array.isArray(parsedUnits) ? parsedUnits : [parsedUnits];
      } catch {
        const start = trimmedUnits.indexOf('[');
        const end = trimmedUnits.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          try {
            obj.units = JSON.parse(trimmedUnits.slice(start, end + 1));
          } catch {
            // ignore
          }
        }
      }
    }

    // Check alternative keys if units is missing or not an array
    if (!Array.isArray(obj.units)) {
      if (Array.isArray(obj.properties)) obj.units = obj.properties;
      else if (Array.isArray(obj.items)) obj.units = obj.items;
      else if (Array.isArray(obj.data)) obj.units = obj.data;
      else if (Array.isArray(obj.statementUnits)) obj.units = obj.statementUnits;
      else if (obj.propertyName) {
        // It's a single unit object directly
        obj.units = [obj];
      }
    }

    // Clean individual units in the array
    if (Array.isArray(obj.units)) {
      obj.units = obj.units.map((u: any) => {
        if (typeof u === 'string') {
          try {
            u = JSON.parse(u.trim());
          } catch {
            return u;
          }
        }
        if (!u || typeof u !== 'object') return u;

        const parseNum = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const cleaned = val.replace(/[^0-9.-]/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? val : n;
          }
          return val;
        };

        return {
          ...u,
          grossRentZAR: parseNum(u.grossRentZAR),
          leviesZAR: u.leviesZAR !== undefined ? parseNum(u.leviesZAR) : 0,
          municipalRatesZAR: u.municipalRatesZAR !== undefined ? parseNum(u.municipalRatesZAR) : 0,
          agencyCommissionZAR: u.agencyCommissionZAR !== undefined ? parseNum(u.agencyCommissionZAR) : 0,
          agencyCommissionVatZAR: u.agencyCommissionVatZAR !== undefined ? parseNum(u.agencyCommissionVatZAR) : undefined,
          isCommissionInclusiveOfVat:
            typeof u.isCommissionInclusiveOfVat === 'boolean'
              ? u.isCommissionInclusiveOfVat
              : typeof u.isCommissionInclusiveOfVat === 'string'
                ? u.isCommissionInclusiveOfVat.toLowerCase() === 'true'
                : true, // default to true on SA managing agent statements
          estimatedMarketValueZAR: u.estimatedMarketValueZAR !== undefined ? parseNum(u.estimatedMarketValueZAR) : undefined,
          purchasePriceZAR: u.purchasePriceZAR !== undefined ? parseNum(u.purchasePriceZAR) : undefined,
          depositHeldZAR: u.depositHeldZAR !== undefined ? parseNum(u.depositHeldZAR) : undefined,
          netOperatingIncomeZAR: parseNum(u.netOperatingIncomeZAR ?? u.netPayoutZAR),
        };
      });
    }

    return obj;
  }

  return data;
}

export const ExtractedStatementBatchSchema = z.preprocess(
  (raw) => normalizeStatementPayload(raw),
  z.object({
    units: z.array(ExtractedRentalUnitSchema).min(1, 'At least one rental unit must be extracted'),
  })
);

export interface AccountingVarianceReport {
  calculatedNOI: number;
  calculatedNet: number;
  extractedNOI: number;
  statementNet: number;
  varianceDelta: number;
  difference: number;
  hasVariance: boolean;
  explanation: string;
}

/**
 * Deterministic mathematical cross-check:
 * Calculated NOI = Gross Rent - (Levies + Municipal Rates + Agency Commission)
 * Flags any variance where |Calculated NOI - Extracted NOI| > 1.00 ZAR.
 */
export function checkAccountingVariance(unit: ExtractedRentalUnit | {
  grossRentZAR: number;
  leviesZAR?: number;
  municipalRatesZAR?: number;
  agencyCommissionZAR?: number;
  netOperatingIncomeZAR?: number;
  netPayoutZAR?: number;
}): AccountingVarianceReport {
  const expenses =
    (unit.leviesZAR || 0) +
    (unit.municipalRatesZAR || 0) +
    (unit.agencyCommissionZAR || 0);

  const calculatedNOI = Number((unit.grossRentZAR - expenses).toFixed(2));
  const rawExtractedNet = 'netOperatingIncomeZAR' in unit && unit.netOperatingIncomeZAR !== undefined
    ? unit.netOperatingIncomeZAR
    : ('netPayoutZAR' in unit && unit.netPayoutZAR !== undefined ? unit.netPayoutZAR : 0);
  const extractedNOI = Number(rawExtractedNet.toFixed(2));
  const varianceDelta = Number((calculatedNOI - extractedNOI).toFixed(2));
  const difference = Number(Math.abs(varianceDelta).toFixed(2));
  const hasVariance = difference > 1.0;

  let explanation = 'Mathematical calculations balance within R1.00 precision.';
  if (hasVariance) {
    explanation =
      varianceDelta > 0
        ? `Calculated NOI (R ${calculatedNOI.toLocaleString('en-ZA')}) exceeds Statement Payout (R ${extractedNOI.toLocaleString('en-ZA')}) by R ${difference.toFixed(2)}. Common causes in iGrow/WeconnectU statements include additional tenant utility arrears deductions, maintenance outlays, or lease renewal admin fees.`
        : `Statement Payout (R ${extractedNOI.toLocaleString('en-ZA')}) exceeds Calculated NOI (R ${calculatedNOI.toLocaleString('en-ZA')}) by R ${difference.toFixed(2)}. Common causes include tenant municipal water/electricity billing recoveries settled into the trust account.`;
  }

  return {
    calculatedNOI,
    calculatedNet: calculatedNOI,
    extractedNOI,
    statementNet: extractedNOI,
    varianceDelta,
    difference,
    hasVariance,
    explanation,
  };
}

/**
 * Parses and validates raw tool-use extraction payload against ExtractedStatementBatchSchema
 */
export function validateExtractedStatementPayload(payload: unknown): {
  success: boolean;
  units: ExtractedRentalUnit[];
  errors: string[];
} {
  const result = ExtractedStatementBatchSchema.safeParse(payload);
  if (!result.success) {
    const errorMessages = result.error.issues.map(
      (e: any) => `Field "${e.path.join('.')}": ${e.message}`
    );
    return {
      success: false,
      units: [],
      errors: errorMessages,
    };
  }
  return {
    success: true,
    units: result.data.units,
    errors: [],
  };
}
