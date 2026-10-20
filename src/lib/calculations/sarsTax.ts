import { AcquisitionCostBreakdown } from '@/types';

/**
 * Calculates official South African Revenue Service (SARS) Transfer Duty
 * Based on 2024 / 2025 / 2026 National Budget Progressive Brackets
 */
export function calculateSarsTransferDuty(propertyValue: number): number {
  if (propertyValue <= 1_210_000) {
    return 0;
  }
  if (propertyValue <= 1_663_800) {
    return (propertyValue - 1_210_000) * 0.03;
  }
  if (propertyValue <= 2_329_300) {
    return 13_614 + (propertyValue - 1_663_800) * 0.06;
  }
  if (propertyValue <= 2_994_800) {
    return 53_544 + (propertyValue - 2_329_300) * 0.08;
  }
  if (propertyValue <= 13_310_000) {
    return 106_784 + (propertyValue - 2_994_800) * 0.11;
  }
  return 1_241_456 + (propertyValue - 13_310_000) * 0.13;
}

/**
 * Deeds Office Registration Fee Guideline
 */
export function calculateDeedsOfficeFee(propertyValue: number): number {
  if (propertyValue <= 150_000) return 100;
  if (propertyValue <= 300_000) return 600;
  if (propertyValue <= 600_000) return 800;
  if (propertyValue <= 1_000_000) return 1_150;
  if (propertyValue <= 2_000_000) return 1_400;
  if (propertyValue <= 4_000_000) return 1_750;
  if (propertyValue <= 6_000_000) return 2_100;
  if (propertyValue <= 8_000_000) return 2_600;
  if (propertyValue <= 10_000_000) return 3_100;
  return 4_200;
}

export const SA_VAT_RATE = 0.15;

/**
 * LSSA Guideline of Fees – instructions received from 1 August 2025 (excl. VAT).
 * Both transfer and bond registration guidelines share this foundational sliding scale.
 */
export const LSSA_FEE_GUIDELINE_2025_08 = {
  effectiveFrom: '2025-08-01',
  minFee: 6_640, // value <= R100 000
  bands: [
    { from: 100_000, to: 500_000, base: 6_640, step: 50_000, perStep: 1_060 },
    { from: 500_000, to: 1_000_000, base: 15_120, step: 100_000, perStep: 2_050 },
    { from: 1_000_000, to: 5_000_000, base: 25_370, step: 200_000, perStep: 2_050 },
    { from: 5_000_000, to: Infinity, base: 66_370, step: 1_000_000, perStep: 5_160 },
  ],
} as const;

/**
 * Recommended professional legal fee (excl. VAT) on the LSSA sliding scale.
 */
export function calculateLssaProfessionalFee(
  value: number,
  scale = LSSA_FEE_GUIDELINE_2025_08
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= 100_000) return scale.minFee;
  const band = scale.bands.find((b) => value > b.from && value <= b.to);
  if (!band) return scale.minFee;
  return band.base + Math.ceil((value - band.from) / band.step) * band.perStep;
}

/**
 * Conveyancing Legal Fees based on Legal Practice Council (LPC) / LSSA recommended tariff
 * (includes standard 15% SA VAT)
 */
export function calculateConveyancingFee(propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  const base = calculateLssaProfessionalFee(propertyValue);
  return Math.round((base * 115) / 100);
}

/**
 * Bond Registration Legal Fees based on LPC / LSSA recommended tariff (attorney fee + 15% VAT)
 */
export function calculateBondRegistrationFee(bondAmount: number): number {
  if (bondAmount <= 0) return 0;
  const base = calculateLssaProfessionalFee(bondAmount);
  return Math.round((base * 115) / 100);
}

/**
 * Complete Acquisition Cost Breakdown
 */
export function computeAcquisitionCosts(
  purchasePrice: number,
  loanToValuePercent: number = 80,
  overrides?: {
    customTransferDuty?: number;
    customConveyancing?: number;
    customBondReg?: number;
    isVatInclusiveDeveloperSale?: boolean;
    bondAmountZAR?: number;
  }
): AcquisitionCostBreakdown {
  if (purchasePrice <= 0) {
    return {
      purchasePrice: 0,
      transferDuty: 0,
      conveyancingFee: 0,
      bondRegistrationFee: 0,
      deedsOfficeFee: 0,
      ficaSundries: 0,
      totalAcquisitionCost: 0,
      isTransferDutyOverridden: false,
      isConveyancingOverridden: false,
      isBondRegOverridden: false,
    };
  }

  const bondAmount =
    overrides?.bondAmountZAR !== undefined
      ? Math.max(0, overrides.bondAmountZAR)
      : Math.max(0, (purchasePrice * loanToValuePercent) / 100);
  
  const transferDuty =
    overrides?.customTransferDuty !== undefined && (!overrides?.isVatInclusiveDeveloperSale || overrides.customTransferDuty > 0)
      ? overrides.customTransferDuty
      : overrides?.isVatInclusiveDeveloperSale
      ? 0
      : calculateSarsTransferDuty(purchasePrice);

  const conveyancingFee = overrides?.customConveyancing !== undefined
    ? overrides.customConveyancing
    : calculateConveyancingFee(purchasePrice);

  const bondRegistrationFee = overrides?.customBondReg !== undefined
    ? overrides.customBondReg
    : calculateBondRegistrationFee(bondAmount);

  const deedsOfficeFee = calculateDeedsOfficeFee(purchasePrice);
  const ficaSundries = 2_250; // Standard attorney postages, FICA verification & petties

  const totalAcquisitionCost =
    purchasePrice +
    transferDuty +
    conveyancingFee +
    bondRegistrationFee +
    deedsOfficeFee +
    ficaSundries;

  return {
    purchasePrice,
    transferDuty,
    conveyancingFee,
    bondRegistrationFee,
    deedsOfficeFee,
    ficaSundries,
    totalAcquisitionCost,
    isTransferDutyOverridden: overrides?.customTransferDuty !== undefined,
    isConveyancingOverridden: overrides?.customConveyancing !== undefined,
    isBondRegOverridden: overrides?.customBondReg !== undefined,
  };
}

/**
 * Calculates SARS Section 13sex Tax Incentive
 * Section 13sex provides a 5% annual write-off of the building cost base (55% for developer units)
 * against taxable income over a 20-year period.
 */
export function calculateSection13sex(
  purchasePrice: number,
  taxRatePercent: number = 27,
  isEligible: boolean = true
): import('@/types').Section13sexCalculation {
  if (!isEligible || purchasePrice <= 0) {
    return {
      isEligible: false,
      buildingDeductionBaseZAR: 0,
      annualAllowanceZAR: 0,
      taxRatePercent,
      annualTaxSavingsZAR: 0,
      twentyYearCumulativeSavingsZAR: 0,
    };
  }

  // 55% deemed building cost for an acquired developer unit
  const buildingDeductionBaseZAR = Math.round(purchasePrice * 0.55);
  // 5% annual write-off
  const annualAllowanceZAR = Math.round(buildingDeductionBaseZAR * 0.05);
  // Rand cash tax savings
  const annualTaxSavingsZAR = Math.round(annualAllowanceZAR * (taxRatePercent / 100));
  const twentyYearCumulativeSavingsZAR = annualTaxSavingsZAR * 20;

  return {
    isEligible: true,
    buildingDeductionBaseZAR,
    annualAllowanceZAR,
    taxRatePercent,
    annualTaxSavingsZAR,
    twentyYearCumulativeSavingsZAR,
  };
}
