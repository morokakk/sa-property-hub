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

export interface TrackRecord6MonthSummary {
  sixMonthCollectionRatePercent: number;
  verifiedRefCount: number;
  netPrepaidUtilityRecoveryZAR: number;
  totalBilled6m: number;
  totalCollected6m: number;
  trackedMonths6m: number;
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
  sixMonthCollectionRatePercent: number;
  verifiedRefCount: number;
  netPrepaidUtilityRecoveryZAR: number;
}

function compute6MonthSummaryFromLedger(
  rental: RentalProperty,
  ledger: ReturnType<typeof calculateMonthlyLedger>
): TrackRecord6MonthSummary {
  const last6 = ledger.slice(-6);
  const totalBilled6m = last6.reduce(
    (sum, item) => sum + (Number.isFinite(item.totalBilled) ? item.totalBilled : 0),
    0
  );
  const totalCollected6m = last6.reduce(
    (sum, item) => sum + (Number.isFinite(item.paymentsReceived) ? item.paymentsReceived : 0),
    0
  );

  const hasPaymentRecords = Array.isArray(rental.paymentRecords) && rental.paymentRecords.length > 0;
  const sixMonthCollectionRatePercent =
    hasPaymentRecords && totalBilled6m > 0
      ? Math.min(100, Math.max(0, Math.round((totalCollected6m / totalBilled6m) * 1000) / 10))
      : 0;

  // Deduplicate payment IDs across the 6-month window so multi-month allocations are counted once
  const verifiedPaymentIds = new Set<string>();
  last6.forEach((item) => {
    const monthPayments = [
      ...(item.payments || []),
      ...(item.allocatedPayments || []).map((ap) => ap.payment),
    ];
    monthPayments.forEach((payment) => {
      if (
        payment &&
        typeof payment.reference === 'string' &&
        payment.reference.trim().length > 0
      ) {
        verifiedPaymentIds.add(payment.id);
      }
    });
  });
  const verifiedRefCount = verifiedPaymentIds.size;

  const totalUtilities6m = last6.reduce(
    (sum, item) => sum + (Number.isFinite(item.utilitiesBilled) ? item.utilitiesBilled : 0),
    0
  );
  const avgMonthlyUtilities6m = last6.length > 0 ? totalUtilities6m / last6.length : 0;
  const vendingFee =
    typeof rental.monthlyPrepaidVendingFeeZAR === 'number' && Number.isFinite(rental.monthlyPrepaidVendingFeeZAR)
      ? Math.max(0, rental.monthlyPrepaidVendingFeeZAR)
      : 0;
  const netPrepaidUtilityRecoveryZAR =
    totalUtilities6m === 0 && vendingFee === 0
      ? 0
      : Math.round(avgMonthlyUtilities6m - vendingFee);

  return {
    sixMonthCollectionRatePercent,
    verifiedRefCount,
    netPrepaidUtilityRecoveryZAR,
    totalBilled6m,
    totalCollected6m,
    trackedMonths6m: last6.length,
  };
}

/**
 * Computes 6-month verified track record metrics (collection rate, verified bank reference count,
 * and net monthly utility recovery after prepaid vending fees) with safe 0 fallbacks.
 */
export function calculate6MonthTrackRecordSummary(
  rental?: RentalProperty | null,
  referenceDate: Date | string = new Date()
): TrackRecord6MonthSummary {
  if (!rental) {
    return {
      sixMonthCollectionRatePercent: 0,
      verifiedRefCount: 0,
      netPrepaidUtilityRecoveryZAR: 0,
      totalBilled6m: 0,
      totalCollected6m: 0,
      trackedMonths6m: 0,
    };
  }
  const ledger = calculateMonthlyLedger(rental, referenceDate);
  return compute6MonthSummaryFromLedger(rental, ledger);
}

/**
 * Computes 12-month track record metrics and collection risk flag from property ledger and arrears,
 * along with the 6-month verified track record summary.
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

  const sixMonthSummary = compute6MonthSummaryFromLedger(rental, ledger);

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
    sixMonthCollectionRatePercent: sixMonthSummary.sixMonthCollectionRatePercent,
    verifiedRefCount: sixMonthSummary.verifiedRefCount,
    netPrepaidUtilityRecoveryZAR: sixMonthSummary.netPrepaidUtilityRecoveryZAR,
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
