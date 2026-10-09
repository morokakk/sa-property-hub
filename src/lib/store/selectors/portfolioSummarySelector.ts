import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  RentalProperty,
  FlipProject,
  FundingSource,
  OpportunityDeal,
  InvestorProfile,
  PortfolioSummary,
  EquityExtractionAlert,
} from '@/types';
import {
  calculateFlipFinancials,
  calculateArchivedFlipFinancials,
  calculateRingFencedWorkingCapital,
} from '@/lib/calculations/flips';
import {
  calculateAgencyCommission,
  calculateRentalSec11aTax,
} from '@/lib/calculations/rentals';
import { usePortfolioStore } from '../usePortfolioStore';

import { computeEquityAlerts } from './equityAlertsSelector';
export { computeEquityAlerts };

export interface PortfolioSummaryInput {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  liquidCapitalReserve: number;
  investorProfile?: InvestorProfile;
  opportunities?: OpportunityDeal[];
}

/**
 * Pure aggregation engine computing overall portfolio financial KPIs,
 * funding debt liabilities, ring-fenced working capital, and SARS provisional tax reserves.
 */
export function computePortfolioSummary(state: PortfolioSummaryInput): PortfolioSummary {
  const rentals = state?.rentals || [];
  const activeRentals = rentals.filter((r) => r && r.status !== 'Sold');
  const soldRentals = rentals.filter((r) => r && r.status === 'Sold');
  const flips = state?.flips || [];
  const activeFlips = flips.filter((f) => f && (f.status === 'Active' || f.status === 'Delayed'));
  const completedFlips = flips.filter((f) => f && f.status === 'Completed');
  const funding = state?.funding || [];

  const totalRentalValue = activeRentals.reduce(
    (sum, r) => sum + (r.marketValueZAR || 0),
    0
  );
  const totalBondLiabilities = activeRentals.reduce(
    (sum, r) => sum + (r.outstandingBondBalanceZAR || 0),
    0
  );
  const totalFlipValue = activeFlips.reduce(
    (sum, f) => sum + (f.targetExitPriceZAR || 0),
    0
  );
  const liquidCapitalReserve = state?.liquidCapitalReserve || 0;
  const totalGrossAssetValue = totalRentalValue + totalFlipValue + liquidCapitalReserve;

  // Unallocated private funding facilities for next acquisitions (Standby facilities + undrawn tranches of unallocated lines)
  const unallocatedFundingReserve = funding
    .filter(
      (f) =>
        f &&
        (f.status === 'Active' || f.status === 'Accruing' || f.status === 'Standby') &&
        (!f.linkedDealId || f.linkedDealName === 'General Portfolio Liquidity')
    )
    .reduce((sum, f) => {
      if (f.status === 'Standby') {
        // Full facility is available undrawn
        return sum + Math.max(0, (f.capitalAmountZAR || 0) - (f.totalRepaidZAR || 0));
      }
      if (f.tranches && f.tranches.length > 0) {
        // Only undrawn tranches are available
        return sum + f.tranches.filter((t) => !t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
      }
      // If active with no tranches, it is already drawn into cash
      return sum;
    }, 0);

  // Private funding liability calculated strictly from drawn capital minus repayments (undrawn tranches, standby lines, and settled facilities carry R 0 debt)
  const totalPrivateFundingLiability = funding
    .filter((f) => f && f.status !== 'Settled')
    .reduce((sum, f) => {
      let drawn = 0;
      if (f.status === 'Standby') {
        drawn = 0;
      } else if (f.tranches && f.tranches.length > 0) {
        drawn = f.tranches.filter((t) => t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
      } else if (f.status === 'Active' || f.status === 'Accruing' || f.status === 'Matured') {
        drawn = f.capitalAmountZAR || 0;
      }
      return sum + Math.max(0, drawn - (f.totalRepaidZAR || 0));
    }, 0);

  const totalFundingLiabilities = totalPrivateFundingLiability + totalBondLiabilities;
  const netEquity = totalGrossAssetValue - totalFundingLiabilities;

  // Monthly rental cash flow and property-by-property SARS provisional tax reserve
  let annualRentalTaxReserve = 0;
  const monthlyNetRentalCashflow = activeRentals.reduce((sum, r) => {
    const gross =
      r.leases?.filter((l) => l.status !== 'Vacant').reduce((s, l) => s + (l.monthlyRentZAR || 0), 0) ||
      r.monthlyGrossRentZAR ||
      0;
    const ancillaryTotal = (r.ancillaryIncomes || []).reduce((s, a) => s + a.monthlyRentZAR, 0);
    const totalGross = gross + ancillaryTotal;
    let agentFee = 0;
    if (r.managementType === 'Agency') {
      if (typeof r.agencyCommissionPercent === 'number' && r.agencyCommissionPercent > 0) {
        agentFee = calculateAgencyCommission(
          totalGross,
          r.agencyCommissionPercent,
          r.agencyVatApplicable !== false,
          r.agencyName
        ).monthlyAgentFeeZAR;
      } else {
        agentFee = r.monthlyAgentFeeZAR || 0;
      }
    }
    const isFreehold = r.propertyType === 'Freehold House';
    const insuranceMonthly = isFreehold ? Math.round((r.annualBuildingInsuranceZAR || 0) / 12) : 0;
    const levies = isFreehold ? 0 : (r.monthlyLeviesZAR || 0);
    const expenses =
      levies +
      insuranceMonthly +
      (r.monthlyRatesTaxesZAR || 0) +
      agentFee +
      (r.monthlyMaintenanceReserveZAR || 0) +
      (r.monthlyBondPaymentZAR || 0) +
      (r.monthlyPrepaidVendingFeeZAR || 0);
    const propNetMonthly = totalGross - expenses;

    // Pure Section 11(a) SARS property tax calculation
    const taxResult = calculateRentalSec11aTax({
      rental: r,
      totalGrossZAR: totalGross,
      leviesZAR: levies,
      insuranceMonthlyZAR: insuranceMonthly,
      agentFeeZAR: agentFee,
      defaultTaxEntityType: state.investorProfile?.defaultTaxEntityType,
      marginalTaxRatePercent: state.investorProfile?.marginalTaxRatePercent ?? 31.0,
    });
    annualRentalTaxReserve += taxResult.annualTax;

    return sum + propNetMonthly;
  }, 0);

  // 1. Ring-Fenced Project Working Capital:
  // Sum of active retention pools, committed pending contractor milestone draws, and advance council deposits
  const ringFencedWorkingCapital = calculateRingFencedWorkingCapital(activeFlips);

  // 2. Free Unallocated Cash:
  const freeUnallocatedCash = Math.max(0, liquidCapitalReserve - ringFencedWorkingCapital);

  // Deployable War Chest: Total cash reserve + pre-approved standby lines (ready for immediate deal acquisition)
  const deployableWarChest = liquidCapitalReserve + unallocatedFundingReserve;

  // Deployable purchasing power = free cash (after ring-fencing) + unallocated funding facilities
  const totalAvailablePurchasingPower = freeUnallocatedCash + unallocatedFundingReserve;

  // 3. Projected Flip Profits & SARS Provisional Tax Reserve:
  let totalGrossProjectedFlipProfits = 0;
  let totalSarsFlipTaxReserve = 0;

  activeFlips.forEach((f) => {
    const fin = calculateFlipFinancials(f);
    totalGrossProjectedFlipProfits += fin.projectedNetProfitZAR;
    totalSarsFlipTaxReserve += fin.estimatedTaxProvisionZAR;
  });

  const totalSarsRentalTaxReserve = annualRentalTaxReserve;
  const totalSarsProvisionalTaxReserve = totalSarsFlipTaxReserve + totalSarsRentalTaxReserve;

  const totalNetProjectedFlipProfits = totalGrossProjectedFlipProfits - totalSarsFlipTaxReserve;
  const totalProjectedFlipProfits = totalGrossProjectedFlipProfits;

  // Realized profit on completed/sold flips (excludes BRRRR converted rentals)
  const totalRealizedFlipProfits = completedFlips.reduce((sum, f) => {
    if (f.exitStrategy === 'BRRRR') return sum;
    const arch = calculateArchivedFlipFinancials(f);
    return sum + arch.realizedNetProfitZAR;
  }, 0);

  const equityAlerts = computeEquityAlerts(activeRentals);

  return {
    totalGrossAssetValue,
    totalRentalValue,
    totalFlipValue,
    liquidCapitalReserve,
    ringFencedWorkingCapital,
    freeUnallocatedCash,
    unallocatedFundingReserve,
    deployableWarChest,
    totalAvailablePurchasingPower,
    totalFundingLiabilities,
    totalPrivateFundingLiability,
    totalBondLiabilities,
    netEquity,
    monthlyNetRentalCashflow,
    totalProjectedFlipProfits,
    totalGrossProjectedFlipProfits,
    totalSarsFlipTaxReserve,
    totalSarsRentalTaxReserve,
    totalSarsProvisionalTaxReserve,
    totalNetProjectedFlipProfits,
    totalRealizedFlipProfits,
    activeRentalsCount: activeRentals.length,
    soldRentalsCount: soldRentals.length,
    activeFlipsCount: activeFlips.length,
    completedFlipsCount: completedFlips.length,
    pendingOpportunitiesCount: (state.opportunities || []).length,
    annualRentalTaxReserve,
    monthlyRentalTaxReserve: Math.round(annualRentalTaxReserve / 12),
    equityAlerts,
  };
}

/**
 * Reactive selector hook for reading memoized portfolio summary KPIs.
 */
export function usePortfolioSummary(): PortfolioSummary {
  // Extract all scalar (primitive) fields via useShallow — stable comparison
  const scalars = usePortfolioStore(
    useShallow((state) => {
      const summary = computePortfolioSummary(state);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { equityAlerts, ...rest } = summary;
      return rest;
    })
  );

  // Compute equityAlerts with JSON-based referential stability
  const alertsJson = usePortfolioStore((state) => {
    const activeRentals = (state.rentals || []).filter((r) => r && r.status !== 'Sold');
    return JSON.stringify(computeEquityAlerts(activeRentals));
  });
  const equityAlerts: EquityExtractionAlert[] = useMemo(() => JSON.parse(alertsJson), [alertsJson]);

  return useMemo(() => ({ ...scalars, equityAlerts }), [scalars, equityAlerts]);
}
