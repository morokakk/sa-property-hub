/**
 * South African Municipal Tariff Engine
 * Supports domestic inclining block tariffs (IBT) and flat rates for:
 * - eThekwini Municipality (Durban)
 * - City of Johannesburg (City Power & Johannesburg Water)
 * - City of Cape Town (Water Wise & Domestic Electricity)
 * - Eskom Direct (Homelight 20A & 60A)
 */

export interface TariffTier {
  minUnits: number;
  maxUnits: number | null; // null represents infinity (e.g. 45+ KL)
  ratePerUnit: number; // in Rands (ZAR)
  label: string;
}

export interface TariffBreakdownItem {
  label: string;
  units: number;
  rate: number;
  cost: number;
}

export interface MunicipalWaterCostResult {
  totalCostZAR: number;
  tierBreakdown: TariffBreakdownItem[];
  effectiveRatePerKL: number;
}

export interface MunicipalElectricityCostResult {
  totalCostZAR: number;
  fixedChargesZAR: number;
  variableCostZAR: number;
  tierBreakdown: TariffBreakdownItem[];
  effectiveRatePerKWh: number;
}

export interface DisputeImpactResult {
  councilConsumption: number;
  physicalConsumption: number;
  unitsDiscrepancy: number; // councilConsumption - physicalConsumption
  rawDisputeCostZAR: number;
  cappedDisputeCostZAR: number;
  isCapped: boolean;
  effectiveRatePerUnit: number;
  isRolloverOrInverted: boolean;
  warning?: string;
}

// -------------------------------------------------------------
// WATER TARIFF CONFIGURATIONS
// -------------------------------------------------------------

// eThekwini (Durban) Domestic Water Tiers
export const ETHEKWINI_WATER_TIERS: TariffTier[] = [
  { minUnits: 0, maxUnits: 6, ratePerUnit: 0.0, label: '0 to 6 KL (Free Lifeline)' },
  { minUnits: 6, maxUnits: 15, ratePerUnit: 25.3, label: '6 to 15 KL (2.53c/L)' },
  { minUnits: 15, maxUnits: 25, ratePerUnit: 25.3, label: '15 to 25 KL (2.53c/L)' },
  { minUnits: 25, maxUnits: 30, ratePerUnit: 33.7, label: '25 to 30 KL (3.37c/L)' },
  { minUnits: 30, maxUnits: 45, ratePerUnit: 52.0, label: '30 to 45 KL (5.20c/L)' },
  { minUnits: 45, maxUnits: null, ratePerUnit: 83.6, label: '45+ KL (8.36c/L)' },
];

// City of Cape Town (Water Wise) Domestic Tiers
export const CAPE_TOWN_WATER_TIERS: TariffTier[] = [
  { minUnits: 0, maxUnits: 6, ratePerUnit: 0.0, label: '0 to 6 KL (Free Lifeline)' },
  { minUnits: 6, maxUnits: 15, ratePerUnit: 21.1, label: '6 to 15 KL (2.11c/L)' },
  { minUnits: 15, maxUnits: 25, ratePerUnit: 31.1, label: '15 to 25 KL (3.11c/L)' },
  { minUnits: 25, maxUnits: 30, ratePerUnit: 64.3, label: '25 to 30 KL (6.43c/L)' },
  { minUnits: 30, maxUnits: 45, ratePerUnit: 64.3, label: '30 to 45 KL (6.43c/L)' },
  { minUnits: 45, maxUnits: null, ratePerUnit: 151.1, label: '45+ KL (15.11c/L)' },
];

// City of Johannesburg (Joburg Water) Domestic Tiers
export const JOBURG_WATER_TIERS: TariffTier[] = [
  { minUnits: 0, maxUnits: 6, ratePerUnit: 0.0, label: '0 to 6 KL (Free Lifeline)' },
  { minUnits: 6, maxUnits: 15, ratePerUnit: 29.8, label: '6 to 15 KL (2.98c/L)' },
  { minUnits: 15, maxUnits: 25, ratePerUnit: 43.7, label: '15 to 25 KL (4.37c/L)' },
  { minUnits: 25, maxUnits: 30, ratePerUnit: 60.4, label: '25 to 30 KL (6.04c/L)' },
  { minUnits: 30, maxUnits: 45, ratePerUnit: 66.0, label: '30 to 45 KL (6.60c/L)' },
  { minUnits: 45, maxUnits: null, ratePerUnit: 89.2, label: '45+ KL (8.92c/L)' },
];

// -------------------------------------------------------------
// ELECTRICITY TARIFF CONFIGURATIONS
// -------------------------------------------------------------

// City Power (Johannesburg High)
export const CITY_POWER_ELEC_TIERS: TariffTier[] = [
  { minUnits: 0, maxUnits: 350, ratePerUnit: 3.34, label: 'Block 1 (0–350 kWh)' },
  { minUnits: 350, maxUnits: 500, ratePerUnit: 3.83, label: 'Block 2 (351–500 kWh)' },
  { minUnits: 500, maxUnits: null, ratePerUnit: 4.37, label: 'Block 3 (500+ kWh)' },
];
export const CITY_POWER_MONTHLY_FIXED = 241.5;

// City of Cape Town (Domestic)
export const CAPE_TOWN_ELEC_TIERS: TariffTier[] = [
  { minUnits: 0, maxUnits: 600, ratePerUnit: 4.14, label: 'Block 1 (0–600 kWh)' },
  { minUnits: 600, maxUnits: null, ratePerUnit: 4.94, label: 'Block 2 (600+ kWh)' },
];
export const CAPE_TOWN_DAILY_FIXED = 2.46; // per day (~R 73.80 / 30-day month)

// eThekwini Municipality (Durban) Flat Rate
export const ETHEKWINI_ELEC_FLAT_RATE = 4.17; // R4.17 / kWh

// Eskom Direct Flat Rates
export const ESKOM_HOMELIGHT_60A_RATE = 3.44; // R3.44 / kWh
export const ESKOM_HOMELIGHT_20A_RATE = 2.7; // R2.70 / kWh

// -------------------------------------------------------------
// HELPER FUNCTIONS & RESOLVERS
// -------------------------------------------------------------

export function resolveWaterTiers(providerOrCity: string): TariffTier[] {
  const norm = (providerOrCity || '').toLowerCase();
  if (norm.includes('ethekwini') || norm.includes('durban')) {
    return ETHEKWINI_WATER_TIERS;
  }
  if (norm.includes('cape town') || norm.includes('western cape')) {
    return CAPE_TOWN_WATER_TIERS;
  }
  // Default to Johannesburg Water / City of Johannesburg
  return JOBURG_WATER_TIERS;
}

/**
 * Calculates water cost across municipal tiers based on monthly consumption in KL
 */
export function calculateMunicipalWaterCost(
  consumptionKL: number,
  providerOrCity: string
): MunicipalWaterCostResult {
  const consumption = Math.max(0, consumptionKL);
  if (consumption === 0) {
    return {
      totalCostZAR: 0,
      tierBreakdown: [],
      effectiveRatePerKL: 0,
    };
  }

  const tiers = resolveWaterTiers(providerOrCity);
  let remaining = consumption;
  let totalCost = 0;
  const breakdown: TariffBreakdownItem[] = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierCapacity = tier.maxUnits !== null ? tier.maxUnits - tier.minUnits : Infinity;
    const unitsInTier = Math.min(remaining, tierCapacity);

    if (unitsInTier > 0) {
      const cost = Math.round(unitsInTier * tier.ratePerUnit * 100) / 100;
      totalCost += cost;
      breakdown.push({
        label: tier.label,
        units: Math.round(unitsInTier * 1000) / 1000,
        rate: tier.ratePerUnit,
        cost,
      });
      remaining -= unitsInTier;
    }
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const effectiveRate = consumption > 0 ? Math.round((totalCost / consumption) * 100) / 100 : 0;

  return {
    totalCostZAR: totalCost,
    tierBreakdown: breakdown,
    effectiveRatePerKL: effectiveRate,
  };
}

/**
 * Calculates electricity cost across municipal structures based on monthly consumption in kWh
 */
export function calculateMunicipalElectricityCost(
  consumptionKWh: number,
  providerOrCity: string,
  options?: { is20A?: boolean; billingDays?: number }
): MunicipalElectricityCostResult {
  const consumption = Math.max(0, consumptionKWh);
  const norm = (providerOrCity || '').toLowerCase();
  const days = options?.billingDays || 30;

  // 1. Eskom Direct
  if (norm.includes('eskom')) {
    const rate = options?.is20A ? ESKOM_HOMELIGHT_20A_RATE : ESKOM_HOMELIGHT_60A_RATE;
    const varCost = Math.round(consumption * rate * 100) / 100;
    return {
      totalCostZAR: varCost,
      fixedChargesZAR: 0,
      variableCostZAR: varCost,
      tierBreakdown: [
        {
          label: `Eskom Homelight (${options?.is20A ? '20A' : '60A'})`,
          units: consumption,
          rate,
          cost: varCost,
        },
      ],
      effectiveRatePerKWh: rate,
    };
  }

  // 2. eThekwini Municipality (Durban)
  if (norm.includes('ethekwini') || norm.includes('durban')) {
    const rate = ETHEKWINI_ELEC_FLAT_RATE;
    const varCost = Math.round(consumption * rate * 100) / 100;
    return {
      totalCostZAR: varCost,
      fixedChargesZAR: 0,
      variableCostZAR: varCost,
      tierBreakdown: [
        {
          label: 'eThekwini Domestic Single Phase Flat Rate',
          units: consumption,
          rate,
          cost: varCost,
        },
      ],
      effectiveRatePerKWh: rate,
    };
  }

  // 3. City of Cape Town
  if (norm.includes('cape town') || norm.includes('western cape')) {
    const fixedCharges = Math.round(CAPE_TOWN_DAILY_FIXED * days * 100) / 100;
    let remaining = consumption;
    let varCost = 0;
    const breakdown: TariffBreakdownItem[] = [];

    for (const tier of CAPE_TOWN_ELEC_TIERS) {
      if (remaining <= 0) break;
      const tierCap = tier.maxUnits !== null ? tier.maxUnits - tier.minUnits : Infinity;
      const unitsInTier = Math.min(remaining, tierCap);

      if (unitsInTier > 0) {
        const cost = Math.round(unitsInTier * tier.ratePerUnit * 100) / 100;
        varCost += cost;
        breakdown.push({
          label: tier.label,
          units: Math.round(unitsInTier * 1000) / 1000,
          rate: tier.ratePerUnit,
          cost,
        });
        remaining -= unitsInTier;
      }
    }

    const totalCost = Math.round((varCost + fixedCharges) * 100) / 100;
    const effectiveRate = consumption > 0 ? Math.round((totalCost / consumption) * 100) / 100 : 0;

    return {
      totalCostZAR: totalCost,
      fixedChargesZAR: fixedCharges,
      variableCostZAR: varCost,
      tierBreakdown: breakdown,
      effectiveRatePerKWh: effectiveRate,
    };
  }

  // 4. City Power (Johannesburg) - Default
  const fixedCharges = CITY_POWER_MONTHLY_FIXED;
  let remaining = consumption;
  let varCost = 0;
  const breakdown: TariffBreakdownItem[] = [];

  for (const tier of CITY_POWER_ELEC_TIERS) {
    if (remaining <= 0) break;
    const tierCap = tier.maxUnits !== null ? tier.maxUnits - tier.minUnits : Infinity;
    const unitsInTier = Math.min(remaining, tierCap);

    if (unitsInTier > 0) {
      const cost = Math.round(unitsInTier * tier.ratePerUnit * 100) / 100;
      varCost += cost;
      breakdown.push({
        label: tier.label,
        units: Math.round(unitsInTier * 1000) / 1000,
        rate: tier.ratePerUnit,
        cost,
      });
      remaining -= unitsInTier;
    }
  }

  const totalCost = Math.round((varCost + fixedCharges) * 100) / 100;
  const effectiveRate = consumption > 0 ? Math.round((totalCost / consumption) * 100) / 100 : 0;

  return {
    totalCostZAR: totalCost,
    fixedChargesZAR: fixedCharges,
    variableCostZAR: varCost,
    tierBreakdown: breakdown,
    effectiveRatePerKWh: effectiveRate,
  };
}

/**
 * Calculates the exact dispute discrepancy, handling dial vs consumption math,
 * tiered tariff differences, inverted rollover warnings, and hard statement capping.
 */
export function calculateMunicipalDisputeImpact(params: {
  utilityType: 'electricity' | 'water';
  councilReading: number;
  councilPreviousReading?: number;
  councilBilledUnits?: number;
  statementCostZAR: number;
  physicalReading: number;
  physicalPreviousReading?: number;
  providerOrCity: string;
}): DisputeImpactResult {
  const {
    utilityType,
    councilReading,
    councilPreviousReading,
    councilBilledUnits,
    statementCostZAR,
    physicalReading,
    physicalPreviousReading,
    providerOrCity,
  } = params;

  // 1. Determine Council Billed Monthly Usage
  const councilUsage =
    councilBilledUnits !== undefined && councilBilledUnits >= 0
      ? councilBilledUnits
      : councilPreviousReading !== undefined
      ? Math.max(0, Math.round((councilReading - councilPreviousReading) * 1000) / 1000)
      : Math.max(0, councilReading);

  // 2. Determine Baseline for Physical Reading
  // If physicalPreviousReading is undefined, fallback to council's starting reading
  const baseline =
    physicalPreviousReading !== undefined
      ? physicalPreviousReading
      : councilPreviousReading !== undefined
      ? councilPreviousReading
      : undefined;

  let physicalUsage = 0;
  let isRolloverOrInverted = false;
  let warning: string | undefined = undefined;

  if (baseline !== undefined) {
    if (physicalReading < baseline) {
      isRolloverOrInverted = true;
      physicalUsage = 0;
      warning = `Physical dial reading (${physicalReading.toLocaleString('en-ZA')}) is lower than starting baseline (${baseline.toLocaleString('en-ZA')}). Verified monthly usage set to 0. Check for meter rollover or serial number mismatch.`;
    } else {
      physicalUsage = Math.round((physicalReading - baseline) * 1000) / 1000;
    }
  } else {
    // If no baseline exists, compare directly to council current reading
    if (physicalReading <= councilReading) {
      const dialDelta = Math.round((councilReading - physicalReading) * 1000) / 1000;
      physicalUsage = Math.max(0, councilUsage - dialDelta);
    } else {
      physicalUsage = councilUsage;
    }
  }

  // 3. Units Discrepancy (Over-billed units by council)
  const unitsDiscrepancy = Math.max(0, Math.round((councilUsage - physicalUsage) * 1000) / 1000);

  // 4. Calculate Tariff Costs
  let councilCalculatedCost = 0;
  let physicalCalculatedCost = 0;
  let effectiveRate = 0;

  if (utilityType === 'water') {
    const councilRes = calculateMunicipalWaterCost(councilUsage, providerOrCity);
    const physicalRes = calculateMunicipalWaterCost(physicalUsage, providerOrCity);
    councilCalculatedCost = councilRes.totalCostZAR;
    physicalCalculatedCost = physicalRes.totalCostZAR;
    effectiveRate =
      councilUsage > 0 && statementCostZAR > 0
        ? statementCostZAR / councilUsage
        : councilRes.effectiveRatePerKL || 24.12;
  } else {
    const councilRes = calculateMunicipalElectricityCost(councilUsage, providerOrCity);
    const physicalRes = calculateMunicipalElectricityCost(physicalUsage, providerOrCity);
    councilCalculatedCost = councilRes.totalCostZAR;
    physicalCalculatedCost = physicalRes.totalCostZAR;
    effectiveRate =
      councilUsage > 0 && statementCostZAR > 0
        ? statementCostZAR / councilUsage
        : councilRes.effectiveRatePerKWh || 3.06;
  }

  // 5. Raw Discrepancy Cost
  let rawDisputeCost = 0;
  if (statementCostZAR > 0 && councilUsage > 0) {
    // Proportional to actual statement billed line item
    rawDisputeCost = Math.round(unitsDiscrepancy * effectiveRate * 100) / 100;
  } else {
    rawDisputeCost =
      Math.round(Math.max(0, councilCalculatedCost - physicalCalculatedCost) * 100) / 100;
  }

  // 6. Hard Cap Rule: You can never dispute more than the billed statement line cost!
  let cappedDisputeCost = rawDisputeCost;
  let isCapped = false;

  if (statementCostZAR > 0 && rawDisputeCost > statementCostZAR) {
    cappedDisputeCost = statementCostZAR;
    isCapped = true;
  }

  return {
    councilConsumption: councilUsage,
    physicalConsumption: physicalUsage,
    unitsDiscrepancy,
    rawDisputeCostZAR: rawDisputeCost,
    cappedDisputeCostZAR: cappedDisputeCost,
    isCapped,
    effectiveRatePerUnit: Math.round(effectiveRate * 10000) / 10000,
    isRolloverOrInverted,
    warning,
  };
}
