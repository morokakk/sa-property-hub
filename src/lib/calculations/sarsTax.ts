import { AcquisitionCostBreakdown } from '@/types';

/**
 * Calculates official South African Revenue Service (SARS) Transfer Duty
 * Based on 2024 / 2025 / 2026 National Budget Progressive Brackets
 */
export function calculateSarsTransferDuty(propertyValue: number): number {
  if (propertyValue <= 1_100_000) {
    return 0;
  }
  if (propertyValue <= 1_512_500) {
    return (propertyValue - 1_100_000) * 0.03;
  }
  if (propertyValue <= 2_117_500) {
    return 12_375 + (propertyValue - 1_512_500) * 0.06;
  }
  if (propertyValue <= 2_722_500) {
    return 48_675 + (propertyValue - 2_117_500) * 0.08;
  }
  if (propertyValue <= 12_100_000) {
    return 97_075 + (propertyValue - 2_722_500) * 0.11;
  }
  return 1_128_600 + (propertyValue - 12_100_000) * 0.13;
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

/**
 * Conveyancing Legal Fees based on Legal Practice Council (LPC) recommended tariff
 * (includes VAT @ 15%)
 */
export function calculateConveyancingFee(propertyValue: number): number {
  let baseFee = 16_500;
  if (propertyValue <= 500_000) {
    baseFee = 16_500;
  } else if (propertyValue <= 1_000_000) {
    baseFee = 19_500 + (propertyValue - 500_000) * 0.015;
  } else if (propertyValue <= 2_000_000) {
    baseFee = 27_000 + (propertyValue - 1_000_000) * 0.012;
  } else if (propertyValue <= 5_000_000) {
    baseFee = 39_000 + (propertyValue - 2_000_000) * 0.008;
  } else {
    baseFee = 63_000 + (propertyValue - 5_000_000) * 0.005;
  }
  // Include standard 15% SA VAT
  return Math.round(baseFee * 1.15);
}

/**
 * Bond Registration Legal Fees (attorney fee + VAT)
 */
export function calculateBondRegistrationFee(bondAmount: number): number {
  if (bondAmount <= 0) return 0;
  let baseFee = 14_000;
  if (bondAmount <= 500_000) {
    baseFee = 14_000;
  } else if (bondAmount <= 1_000_000) {
    baseFee = 17_000 + (bondAmount - 500_000) * 0.012;
  } else if (bondAmount <= 2_000_000) {
    baseFee = 23_000 + (bondAmount - 1_000_000) * 0.01;
  } else {
    baseFee = 33_000 + (bondAmount - 2_000_000) * 0.006;
  }
  return Math.round(baseFee * 1.15);
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
    };
  }

  const bondAmount = (purchasePrice * loanToValuePercent) / 100;
  
  const transferDuty = overrides?.customTransferDuty !== undefined
    ? overrides.customTransferDuty
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
