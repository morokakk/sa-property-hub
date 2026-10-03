import { Lease, RentalProperty } from '@/types';
import { calculatePropertyArrears, calculateMonthlyLedger } from './arrears';

export interface RentalHoldingCosts {
  monthlyBond: number;
  monthlyLevies: number;
  monthlyRates: number;
  monthlyOther: number;
  monthlyHoldingCost: number;
  netMonthlyCashflow: number;
}

/**
 * Computes monthly holding costs and net cashflow for a rental property,
 * matching the Rentals page card / propertyMetrics expense model.
 */
export function calculateRentalHoldingCosts(rental: RentalProperty): RentalHoldingCosts {
  const monthlyBond = rental.monthlyBondPaymentZAR || 0;
  const monthlyLevies = rental.propertyType === 'Freehold House' ? 0 : (rental.monthlyLeviesZAR || 0);
  const monthlyRates = rental.monthlyRatesTaxesZAR || 0;
  const monthlyOther =
    (rental.monthlyAgentFeeZAR || 0) +
    (rental.monthlyMaintenanceReserveZAR || 0) +
    Math.round((rental.annualBuildingInsuranceZAR || 0) / 12) +
    (rental.monthlyPrepaidVendingFeeZAR || 0);

  const monthlyHoldingCost = monthlyBond + monthlyLevies + monthlyRates + monthlyOther;
  const grossRent = rental.monthlyGrossRentZAR || 0;
  const ancillary = (rental.ancillaryIncomes || []).reduce((sum, a) => sum + (a.monthlyRentZAR || 0), 0);
  const netMonthlyCashflow = grossRent + ancillary - monthlyHoldingCost;

  return {
    monthlyBond,
    monthlyLevies,
    monthlyRates,
    monthlyOther,
    monthlyHoldingCost,
    netMonthlyCashflow,
  };
}

export interface Collection12MonthMetrics {
  totalBilled12m: number;
  totalCollected12m: number;
  collectionRate: number;
  paidInFullMonths: number;
  totalTrackedMonths: number;
  tenantArrears: number;
  overdueMonths: number;
  totalBadDebt: number;
  isCollectionRisk: boolean;
  actualCollectedRentAvg: number;
  adjustedVacancyRate: number;
}

/**
 * Computes 12-month track record metrics and collection risk flag from property ledger and arrears.
 */
export function calculate12MonthCollectionMetrics(
  rental: RentalProperty,
  referenceDate: Date | string = new Date()
): Collection12MonthMetrics {
  const ledger = calculateMonthlyLedger(rental, referenceDate);
  const last12 = ledger.slice(-12);
  const totalBilled12m = last12.reduce((sum, item) => sum + item.totalBilled, 0);
  const totalCollected12m = last12.reduce((sum, item) => sum + item.paymentsReceived, 0);

  const rawCollectionRate = totalBilled12m > 0
    ? (totalCollected12m / totalBilled12m) * 100
    : 100;
  const collectionRate = Math.min(100, Math.max(0, Math.round(rawCollectionRate * 10) / 10));

  const paidInFullMonths = last12.filter((item) => item.status === 'Paid in Full' || item.netVariance <= 0).length;
  const totalTrackedMonths = last12.length;

  const arrearsCalc = calculatePropertyArrears(rental, referenceDate);
  const tenantArrears = arrearsCalc.effectiveArrearsZAR;

  const overdueCount = arrearsCalc.ledger.filter((item) => item.netVariance > 0).length;
  const overdueMonths = overdueCount > 0 ? overdueCount : (tenantArrears > 0 ? 1 : 0);

  const totalBadDebt = (rental.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
  const isCollectionRisk = collectionRate < 90;

  const actualCollectedRentAvg = totalTrackedMonths > 0
    ? Math.round(totalCollected12m / totalTrackedMonths)
    : (rental.monthlyGrossRentZAR || 0);

  const adjustedVacancyRate = isCollectionRisk
    ? Math.max(5, Math.round(100 - collectionRate))
    : 5;

  return {
    totalBilled12m,
    totalCollected12m,
    collectionRate,
    paidInFullMonths,
    totalTrackedMonths,
    tenantArrears,
    overdueMonths,
    totalBadDebt,
    isCollectionRisk,
    actualCollectedRentAvg,
    adjustedVacancyRate,
  };
}

/**
 * Masks tenant names according to POPIA compliance.
 * Default: "Unit [Name] — Tenant [Index]" (e.g. "Main Unit — Tenant A").
 * Never exposes phone or email.
 */
export function maskTenantName(lease: Lease, index: number, showRealName: boolean): string {
  if (showRealName) {
    return lease.tenantName || `Tenant ${index + 1}`;
  }
  const letter = String.fromCharCode(65 + (index % 26));
  const unitLabel = lease.unitName || `Unit ${index + 1}`;
  return `${unitLabel} — Tenant ${letter}`;
}
