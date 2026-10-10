import {
  OccupancyStatus,
  EvictionJurisdiction,
  OccupantRiskProfile,
} from '@/types';

export const DAYS_PER_MONTH = 30.416;

export const EVICTION_JURISDICTION_DEFAULTS: Record<
  EvictionJurisdiction,
  { days: number; legalZAR: number; label: string; timelineLabel: string }
> = {
  none: {
    days: 0,
    legalZAR: 0,
    label: 'No Eviction Required',
    timelineLabel: 'Immediate Possession',
  },
  magistrates_court: {
    days: 120,
    legalZAR: 40_000,
    label: "Magistrate's Court (Unopposed)",
    timelineLabel: '~90–120 Days • R 40,000',
  },
  high_court: {
    days: 240,
    legalZAR: 85_000,
    label: 'High Court (Opposed / Complex)',
    timelineLabel: '~180–270 Days • R 85,000',
  },
};

/**
 * Returns normalised default values for an OccupantRiskProfile given status and optional court jurisdiction.
 */
export function getOccupantRiskDefaults(
  status: OccupancyStatus,
  jurisdiction?: EvictionJurisdiction
): OccupantRiskProfile {
  if (status === 'vacant' || status === 'tenanted_verified') {
    return {
      occupancyStatus: status,
      evictionRequired: false,
      evictionJurisdiction: 'none',
      estimatedEvictionDelayDays: 0,
      budgetedLegalEvictionCostZAR: 0,
      monthlySiteSecurityZAR: 0,
      totalEvictionCarryingCostZAR: 0,
    };
  }

  const effectiveJurisdiction: EvictionJurisdiction =
    jurisdiction && jurisdiction !== 'none' ? jurisdiction : 'magistrates_court';
  const defaults = EVICTION_JURISDICTION_DEFAULTS[effectiveJurisdiction];

  return {
    occupancyStatus: 'unlawful_occupant',
    evictionRequired: true,
    evictionJurisdiction: effectiveJurisdiction,
    estimatedEvictionDelayDays: defaults.days,
    budgetedLegalEvictionCostZAR: defaults.legalZAR,
    monthlySiteSecurityZAR: 0,
    totalEvictionCarryingCostZAR: 0,
  };
}

/**
 * Determines whether an eviction is actively pending on a property.
 * Once vacant possession is obtained, this returns false.
 */
export function isEvictionActive(risk?: OccupantRiskProfile | null): boolean {
  if (!risk) return false;
  return (
    risk.occupancyStatus === 'unlawful_occupant' &&
    risk.evictionRequired &&
    !risk.possessionObtainedDate
  );
}

export interface EvictionCarryingCostResult {
  dailyHoldingBurnZAR: number;
  evictionDelayBurnZAR: number;
  totalOccupantCostZAR: number;
  monthlyFixedBurnZAR: number;
}

/**
 * Calculates interim holding burn and total legal litigation costs across an eviction delay.
 * Daily Holding Burn = (Monthly Bond Interest + Municipal Rates + Levies + Monthly Site Security) / 30.416
 * Eviction Delay Burn = Daily Holding Burn * estimatedEvictionDelayDays
 * Total Occupant Cost = Legal Fees + Eviction Delay Burn
 */
export function calculateEvictionCarryingCost(params: {
  risk?: OccupantRiskProfile | null;
  monthlyBondInterestZAR?: number;
  monthlyRatesZAR?: number;
  monthlyLeviesZAR?: number;
}): EvictionCarryingCostResult {
  const { risk, monthlyBondInterestZAR = 0, monthlyRatesZAR = 0, monthlyLeviesZAR = 0 } = params;

  if (!isEvictionActive(risk)) {
    return {
      dailyHoldingBurnZAR: 0,
      evictionDelayBurnZAR: 0,
      totalOccupantCostZAR: 0,
      monthlyFixedBurnZAR: 0,
    };
  }

  const bondInterest = Math.max(0, monthlyBondInterestZAR || 0);
  const rates = Math.max(0, monthlyRatesZAR || 0);
  const levies = Math.max(0, monthlyLeviesZAR || 0);
  const security = Math.max(0, risk?.monthlySiteSecurityZAR || 0);
  const legal = Math.max(0, risk?.budgetedLegalEvictionCostZAR || 0);
  const delayDays = Math.max(0, risk?.estimatedEvictionDelayDays || 0);

  const monthlyFixedBurnZAR = rates + levies + security;
  const totalMonthlyBurn = bondInterest + monthlyFixedBurnZAR;
  const dailyHoldingBurnZAR = totalMonthlyBurn / DAYS_PER_MONTH;
  const evictionDelayBurnZAR = Math.round(dailyHoldingBurnZAR * delayDays);
  const totalOccupantCostZAR = legal + evictionDelayBurnZAR;

  return {
    dailyHoldingBurnZAR: Number(dailyHoldingBurnZAR.toFixed(2)),
    evictionDelayBurnZAR,
    totalOccupantCostZAR,
    monthlyFixedBurnZAR,
  };
}

/**
 * Derives eviction duration in months while an eviction is active.
 * Used to expand the baseline holding period in the Delay Sensitivity Matrix.
 */
export function getFlipEvictionOffsetMonths(
  flip?: { occupantRisk?: OccupantRiskProfile | null } | null
): number {
  if (!isEvictionActive(flip?.occupantRisk)) return 0;
  const days = Math.max(0, flip?.occupantRisk?.estimatedEvictionDelayDays || 0);
  return Number((days / DAYS_PER_MONTH).toFixed(2));
}
