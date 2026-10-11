import { RentalProperty } from '@/types';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import { getMonthKey, isLeaseActiveInMonth } from '@/lib/calculations/arrears';

export interface RentalTaxCalculationResult {
  entityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  taxRate: number;
  taxRateLabel: string;
  annualCashflowZAR: number;
  sec13ShieldZAR: number;
  totalBadDebtZAR: number;
  taxableIncomeZAR: number;
  annualTaxZAR: number;
  monthlyTaxZAR: number;
  taxSavingsZAR: number;
  postTaxCashflowZAR: number;
  yieldPostTaxPercent: number;
  // Convenience aliases matching consumer variable names
  annualCashflow: number;
  sec13Shield: number;
  totalBadDebt: number;
  taxableIncome: number;
  postTaxCashflow: number;
  yieldPostTax: number;
}

/**
 * 1. Pure SARS Income Tax Provision & Section 13sex Shield Calculator
 * Extracted from lines 1189–1200 of src/app/rentals/page.tsx.
 */
export function calculateRentalTaxProvision(
  property: RentalProperty,
  netMonthlyCashflowZAR: number,
  defaultTaxEntityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' = 'Company (27%)'
): RentalTaxCalculationResult {
  if (!property) {
    const rate = defaultTaxEntityType === 'Individual (45%)' ? 0.45 : defaultTaxEntityType === 'Pre-Tax' ? 0 : 0.27;
    const label = defaultTaxEntityType === 'Individual (45%)' ? 'Individual 45%' : defaultTaxEntityType === 'Pre-Tax' ? 'Pre-Tax 0%' : 'Company 27%';
    return {
      entityType: defaultTaxEntityType,
      taxRate: rate,
      taxRateLabel: label,
      annualCashflowZAR: 0,
      sec13ShieldZAR: 0,
      totalBadDebtZAR: 0,
      taxableIncomeZAR: 0,
      annualTaxZAR: 0,
      monthlyTaxZAR: 0,
      taxSavingsZAR: 0,
      postTaxCashflowZAR: 0,
      yieldPostTaxPercent: 0,
      annualCashflow: 0,
      sec13Shield: 0,
      totalBadDebt: 0,
      taxableIncome: 0,
      postTaxCashflow: 0,
      yieldPostTax: 0,
    };
  }

  const entityType = property.taxEntityTypeOverride || defaultTaxEntityType;
  const taxRate = entityType === 'Individual (45%)' ? 0.45 : entityType === 'Pre-Tax' ? 0 : 0.27;
  const taxRateLabel = entityType === 'Individual (45%)' ? 'Individual 45%' : entityType === 'Pre-Tax' ? 'Pre-Tax 0%' : 'Company 27%';

  const annualCashflowZAR = Math.max(0, netMonthlyCashflowZAR * 12);
  const sec13ShieldZAR = property.section13sexAnnualShieldZAR || 0;
  const totalBadDebtZAR = (property.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
  const taxableIncomeZAR = Math.max(0, annualCashflowZAR - totalBadDebtZAR - sec13ShieldZAR);
  const annualTaxZAR = Math.round(taxableIncomeZAR * taxRate);
  const monthlyTaxZAR = Math.round(annualTaxZAR / 12);
  const taxSavingsZAR = sec13ShieldZAR > 0 ? Math.round(Math.min(annualCashflowZAR, sec13ShieldZAR) * taxRate) : 0;
  const postTaxCashflowZAR = netMonthlyCashflowZAR - monthlyTaxZAR;
  const yieldPostTaxPercent = property.marketValueZAR > 0 ? ((postTaxCashflowZAR * 12) / property.marketValueZAR) * 100 : 0;

  return {
    entityType,
    taxRate,
    taxRateLabel,
    annualCashflowZAR,
    sec13ShieldZAR,
    totalBadDebtZAR,
    taxableIncomeZAR,
    annualTaxZAR,
    monthlyTaxZAR,
    taxSavingsZAR,
    postTaxCashflowZAR,
    yieldPostTaxPercent,
    // Aliases
    annualCashflow: annualCashflowZAR,
    sec13Shield: sec13ShieldZAR,
    totalBadDebt: totalBadDebtZAR,
    taxableIncome: taxableIncomeZAR,
    postTaxCashflow: postTaxCashflowZAR,
    yieldPostTax: yieldPostTaxPercent,
  };
}

/**
 * 2. Pure Gross Yield Calculator
 * Extracted from lines 1184–1187 of src/app/rentals/page.tsx.
 */
export function calculateGrossYield(totalGrossIncomeZAR: number, marketValueZAR: number): number {
  if (!marketValueZAR || marketValueZAR <= 0) return 0;
  return ((totalGrossIncomeZAR * 12) / marketValueZAR) * 100;
}

/**
 * 3. BRRRR Refinance Parameter Estimator
 * Extracted from lines 708–716 of src/app/rentals/page.tsx.
 * Reuses the canonical calculateMonthlyBondRepayment() from @/lib/calculations/propertyMetrics.
 */
export interface BrrrrRefinanceProposal {
  estimatedNewValuationZAR: number;
  targetBondBalanceZAR: number;
  cashEquityPulledOutZAR: number;
  newBondBalanceZAR: number;
  estimatedMonthlyBondRepaymentZAR: number;
  ltvPercent: number;
}

export function calculateBrrrrRefinanceProposal(
  currentValuationZAR: number,
  currentBondBalanceZAR: number,
  interestRatePercent: number = 11.5,
  loanYears: number = 20,
  targetLtvRatio: number = 0.70
): BrrrrRefinanceProposal {
  const estNewVal = Math.round(((currentValuationZAR || 0) * 1.15) / 50000) * 50000;
  const targetBond = Math.round((estNewVal * targetLtvRatio) / 10000) * 10000;
  const defaultCashOut = Math.max(0, targetBond - (currentBondBalanceZAR || 0));
  const newBond = (currentBondBalanceZAR || 0) + defaultCashOut;

  const estPmt = calculateMonthlyBondRepayment(newBond, interestRatePercent, loanYears);
  const ltvPercent = estNewVal > 0 ? (newBond / estNewVal) * 100 : 0;

  return {
    estimatedNewValuationZAR: estNewVal,
    targetBondBalanceZAR: targetBond,
    cashEquityPulledOutZAR: defaultCashOut,
    newBondBalanceZAR: newBond,
    estimatedMonthlyBondRepaymentZAR: estPmt,
    ltvPercent,
  };
}

/**
 * 4. Agency Commission & VAT Fee Calculator
 * Extracted from lines 897–899 and 1539–1546 of src/app/rentals/page.tsx.
 */
export interface AgencyFeeResult {
  monthlyAgentFeeZAR: number;
  effectiveCommissionPercent: number;
  vatApplied: boolean;
}

export function calculateAgencyCommission(
  grossRentZAR: number,
  commissionPercent: number,
  vatApplicable: boolean = true,
  agencyName?: string
): AgencyFeeResult {
  const isVatExemptVendor = agencyName?.trim().toLowerCase() === 'igrow rentals';
  const effectiveVat = !isVatExemptVendor && vatApplicable;
  const baseComm = (grossRentZAR || 0) * ((commissionPercent || 0) / 100);
  const monthlyAgentFeeZAR = Math.round(baseComm * (effectiveVat ? 1.15 : 1.0));
  const effectiveCommissionPercent = grossRentZAR > 0 ? Number(((monthlyAgentFeeZAR / grossRentZAR) * 100).toFixed(1)) : (commissionPercent || 0);

  return {
    monthlyAgentFeeZAR,
    effectiveCommissionPercent,
    vatApplied: effectiveVat,
  };
}

/**
 * 5. Disposal Realized Sale Metrics
 * Extracted from lines 2729–2733 of src/app/rentals/page.tsx.
 */
export interface DisposalMetrics {
  grossCapitalGainZAR: number;
  capitalGainPercent: number;
  netCashProceedsZAR: number;
}

export function calculateDisposalMetrics(
  actualSalePriceZAR: number,
  purchasePriceZAR: number,
  outstandingBondBalanceZAR: number = 0
): DisposalMetrics {
  const sale = actualSalePriceZAR || 0;
  const purchase = purchasePriceZAR || 0;
  const bond = outstandingBondBalanceZAR || 0;
  const grossCapitalGainZAR = sale - purchase;
  const capitalGainPercent = purchase > 0 ? (grossCapitalGainZAR / purchase) * 100 : 0;
  const netCashProceedsZAR = Math.max(0, sale - bond);

  return {
    grossCapitalGainZAR,
    capitalGainPercent,
    netCashProceedsZAR,
  };
}

/**
 * 6. Aggregate Rental Portfolio KPIs
 * Extracted from lines 989–991 and 1056–1098 of src/app/rentals/page.tsx.
 */
export interface AggregateRentalPortfolioKPIs {
  totalRentalAssetValueZAR: number;
  totalGrossMonthlyRentZAR: number;
  totalAnnualGrossRentZAR: number;
  activeCount: number;
  soldCount: number;
}

export function calculateAggregateRentalKPIs(rentals: RentalProperty[] = []): AggregateRentalPortfolioKPIs {
  const list = rentals || [];
  const activeRentals = list.filter((r) => r && r.status !== 'Sold');
  const soldRentals = list.filter((r) => r && r.status === 'Sold');
  const totalRentalAssetValueZAR = activeRentals.reduce((sum, r) => sum + (r.marketValueZAR || r.purchasePriceZAR || 0), 0);
  const totalGrossMonthlyRentZAR = activeRentals.reduce((sum, r) => sum + (r.monthlyGrossRentZAR || 0), 0);

  return {
    totalRentalAssetValueZAR,
    totalGrossMonthlyRentZAR,
    totalAnnualGrossRentZAR: totalGrossMonthlyRentZAR * 12,
    activeCount: activeRentals.length,
    soldCount: soldRentals.length,
  };
}

/**
 * 7. SARS Section 11(a) Property Annual Tax Provision Calculator
 * Computes taxable income and tax liability strictly deducting bond interest (capital repayment excluded),
 * rates, levies, agency fees, maintenance reserve, insurance, prepaid vending fees, and bad debt write-offs,
 * minus Section 13sex allowances.
 */
export interface RentalSec11aTaxParams {
  rental: RentalProperty;
  totalGrossZAR: number;
  leviesZAR: number;
  insuranceMonthlyZAR: number;
  agentFeeZAR: number;
  defaultTaxEntityType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  marginalTaxRatePercent?: number;
}

export interface RentalSec11aTaxResult {
  annualGrossRentZAR: number;
  annualBondInterestZAR: number;
  deductibleExpensesZAR: number;
  taxableIncomeZAR: number;
  taxRate: number;
  annualTaxZAR: number;
  annualTax: number;
}

export function calculateRentalSec11aTax({
  rental,
  totalGrossZAR,
  leviesZAR,
  insuranceMonthlyZAR,
  agentFeeZAR,
  defaultTaxEntityType,
  marginalTaxRatePercent = 31.0,
}: RentalSec11aTaxParams): RentalSec11aTaxResult {
  const annualGrossRentZAR = totalGrossZAR * 12;
  const annualBondInterestZAR = (rental.outstandingBondBalanceZAR && rental.bondInterestRatePercent)
    ? Math.round(rental.outstandingBondBalanceZAR * (rental.bondInterestRatePercent / 100))
    : 0;
  const annualRates = (rental.monthlyRatesTaxesZAR || 0) * 12;
  const annualLevies = leviesZAR * 12;
  const annualAgentFee = agentFeeZAR * 12;
  const annualMaintenance = (rental.monthlyMaintenanceReserveZAR || 0) * 12;
  const annualInsurance = insuranceMonthlyZAR * 12;
  const annualPrepaidVending = (rental.monthlyPrepaidVendingFeeZAR || 0) * 12;
  const propBadDebt = (rental.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);

  const deductibleExpensesZAR =
    annualRates +
    annualLevies +
    annualAgentFee +
    annualMaintenance +
    annualInsurance +
    annualPrepaidVending +
    propBadDebt +
    annualBondInterestZAR;

  const propSec13Shield = rental.section13sexAnnualShieldZAR || 0;
  const taxableIncomeZAR = Math.max(0, annualGrossRentZAR - deductibleExpensesZAR - propSec13Shield);

  let taxRate = 0.31;
  if (rental.taxEntityTypeOverride === 'Individual (45%)') {
    taxRate = 0.45;
  } else if (rental.taxEntityTypeOverride === 'Company (27%)') {
    taxRate = 0.27;
  } else if (rental.taxEntityTypeOverride === 'Pre-Tax') {
    taxRate = 0;
  } else if (defaultTaxEntityType === 'Company (27%)') {
    taxRate = 0.27;
  } else if (defaultTaxEntityType === 'Individual (45%)') {
    taxRate = 0.45;
  } else if (defaultTaxEntityType === 'Pre-Tax') {
    taxRate = 0;
  } else {
    taxRate = marginalTaxRatePercent / 100;
  }

  const annualTaxZAR = Math.round(taxableIncomeZAR * taxRate);

  return {
    annualGrossRentZAR,
    annualBondInterestZAR,
    deductibleExpensesZAR,
    taxableIncomeZAR,
    taxRate,
    annualTaxZAR,
    annualTax: annualTaxZAR,
  };
}

/**
 * 6. Portfolio Time-Weighted Physical Occupancy Rate YTD Calculator
 * Calculates the percentage of active lettable unit-months tenanted vs. available
 * across elapsed months of the current South African tax year (starting 1 March).
 */
export interface PortfolioOccupancyResult {
  totalUnitMonths: number;
  occupiedUnitMonths: number;
  vacantUnitMonths: number;
  occupancyRatePercent: number;
  underwritingTargetPercent: number;
  variancePercent: number;
  elapsedMonths: number;
}

export function calculatePortfolioOccupancyYtd(
  rentals: RentalProperty[],
  referenceDate: Date = new Date(),
  underwritingTargetPercent = 95.0
): PortfolioOccupancyResult {
  const activeRentals = (rentals || []).filter((r) => r && r.status !== 'Sold');
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar...

  // SA Tax Year starts 1 March
  const startYear = month >= 2 ? year : year - 1;
  const elapsedMonths = Math.min(12, Math.max(1, month >= 2 ? month - 2 + 1 : 10 + (month + 1)));

  // Generate elapsed tax year month keys in format 'YYYY-MM'
  const elapsedMonthKeys: string[] = [];
  for (let i = 0; i < elapsedMonths; i++) {
    const calendarMonth = (2 + i) % 12; // 2 = March (0-indexed)
    const calendarYear = 2 + i >= 12 ? startYear + 1 : startYear;
    elapsedMonthKeys.push(`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`);
  }

  let totalUnitMonths = 0;
  let occupiedUnitMonths = 0;

  activeRentals.forEach((rental) => {
    const purchaseMonth = rental.purchaseDate ? getMonthKey(rental.purchaseDate) : undefined;

    elapsedMonthKeys.forEach((monthKey) => {
      // If property was acquired after this month, it was not yet owned/available
      if (purchaseMonth && monthKey < purchaseMonth) {
        return;
      }

      if (rental.leases && rental.leases.length > 0) {
        rental.leases.forEach((lease) => {
          totalUnitMonths += 1;
          if (isLeaseActiveInMonth(lease, monthKey)) {
            occupiedUnitMonths += 1;
          }
        });
      } else {
        totalUnitMonths += 1;
        if (rental.status === 'Occupied' || rental.status === 'Notice Given') {
          occupiedUnitMonths += 1;
        }
      }
    });
  });

  const vacantUnitMonths = Math.max(0, totalUnitMonths - occupiedUnitMonths);
  const occupancyRatePercent =
    totalUnitMonths > 0 ? (occupiedUnitMonths / totalUnitMonths) * 100 : 100;
  const variancePercent = occupancyRatePercent - underwritingTargetPercent;

  return {
    totalUnitMonths,
    occupiedUnitMonths,
    vacantUnitMonths,
    occupancyRatePercent,
    underwritingTargetPercent,
    variancePercent,
    elapsedMonths,
  };
}

