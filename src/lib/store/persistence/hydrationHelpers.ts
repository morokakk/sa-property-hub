/**
 * Hydration Helpers for Zustand Portfolio Persistence
 * Pure state sanitizers and normalization functions used during store rehydration.
 */

/**
 * Normalises persisted Get Started checklist data: keeps only non-empty strings, de-duplicated.
 * Anything else (undefined, null, objects, legacy shapes) collapses to an empty list.
 */
export function sanitizeCompletedGuideSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) seen.add(trimmed);
    }
  }
  return Array.from(seen);
}

/**
 * Auto-heals legacy iGrow Rentals Clearwater property agent fee estimates
 * from arbitrary R635 to actual R851 invoiced deductions.
 */
export function healClearwaterAgencyFee(rental: any): {
  monthlyAgentFeeZAR: number;
  agencyVatApplicable: boolean;
  agencyCommissionPercent: number;
} {
  if (!rental || typeof rental !== 'object') {
    return {
      monthlyAgentFeeZAR: 0,
      agencyVatApplicable: true,
      agencyCommissionPercent: 0,
    };
  }

  let monthlyAgentFeeZAR = typeof rental.monthlyAgentFeeZAR === 'number' ? rental.monthlyAgentFeeZAR : 0;
  let agencyVatApplicable = rental.agencyVatApplicable !== false;
  let agencyCommissionPercent = typeof rental.agencyCommissionPercent === 'number' ? rental.agencyCommissionPercent : 0;

  if (
    (rental.agencyName === 'iGrow Rentals' || String(rental.title || '').toLowerCase().includes('clearwater')) &&
    (monthlyAgentFeeZAR === 635 || monthlyAgentFeeZAR === 634.8 || Math.round(monthlyAgentFeeZAR) === 635)
  ) {
    monthlyAgentFeeZAR = 851;
    agencyVatApplicable = false;
    agencyCommissionPercent =
      rental.monthlyGrossRentZAR > 0
        ? Number(((850.54 / rental.monthlyGrossRentZAR) * 100).toFixed(1))
        : 12.3;
  }

  return {
    monthlyAgentFeeZAR,
    agencyVatApplicable,
    agencyCommissionPercent,
  };
}
