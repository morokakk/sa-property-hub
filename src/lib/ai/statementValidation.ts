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
  depositHeldZAR: z.number().optional(),
  netOperatingIncomeZAR: z.number().optional().default(0),
  netPayoutZAR: z.number().optional(),
  managingAgent: z.string().optional(),
  statementDate: z.string().optional(),
}).transform((data) => {
  const finalAddress = data.address || data.propertyAddress;
  const finalNet = data.netOperatingIncomeZAR || data.netPayoutZAR || 0;
  const finalLease = data.leaseExpiryDate || data.leaseEndDate;
  return {
    ...data,
    address: finalAddress,
    propertyAddress: finalAddress,
    netOperatingIncomeZAR: finalNet,
    leaseExpiryDate: finalLease,
    leaseEndDate: finalLease,
  };
});

export const ExtractedStatementBatchSchema = z.object({
  units: z.array(ExtractedRentalUnitSchema).min(1, 'At least one rental unit must be extracted'),
});

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
