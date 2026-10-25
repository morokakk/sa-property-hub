import { describe, it, expect } from 'vitest';
import {
  calculateRentalCashflow,
  computeRentalPropertyMetrics,
  calculateDealMetrics,
  generateRentalLongTermProjection,
} from '../propertyMetrics';
import { calculateRentalMao } from '../maoSolver';
import { RentalProperty } from '@/types';
import { computePortfolioSummary } from '@/lib/store/selectors/portfolioSummarySelector';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

describe('Property Metrics Calculation Engine & Communal Services OpEx', () => {
  const baseRental: RentalProperty = {
    id: 'rental-prop-test-1',
    title: '42 Kruger Multi-Let Commune',
    address: '42 Kruger St',
    city: 'Krugersdorp',
    propertyType: 'Freehold House',
    marketValueZAR: 1_200_000,
    purchasePriceZAR: 1_000_000,
    purchaseDate: '2024-01-01',
    outstandingBondBalanceZAR: 800_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 8_500,
    monthlyGrossRentZAR: 20_000,
    monthlyLeviesZAR: 0,
    monthlyRatesTaxesZAR: 1_200,
    annualBuildingInsuranceZAR: 7_200, // R600/month
    monthlyMaintenanceReserveZAR: 800,
    monthlyPrepaidVendingFeeZAR: 150,
    monthlyAgentFeeZAR: 0,
    managementType: 'Self-Managed',
    maintenanceHistory: [],
    status: 'Occupied',
    leases: [
      {
        id: 'lease-test-1',
        unitName: 'Suite 1',
        roomType: 'Executive Suite',
        tenantName: 'Sipho Zulu',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        monthlyRentZAR: 12_000,
        depositHeldZAR: 12_000,
        annualEscalationPercent: 7,
        status: 'Occupied',
        guarantorName: 'Anglo American Corporate',
        guarantorContact: '+27 11 638 9111',
      },
      {
        id: 'lease-test-2',
        unitName: 'Cottage 2',
        roomType: 'Garden Cottage',
        tenantName: 'Kagiso Lekota',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        monthlyRentZAR: 8_000,
        depositHeldZAR: 8_000,
        annualEscalationPercent: 7,
        status: 'Occupied',
        guarantorName: 'Mary Lekota (Parent Guarantee)',
        guarantorContact: 'mary.lekota@gmail.com',
      },
    ],
  };

  describe('1. calculateRentalCashflow Communal OpEx Deduction & Backward Compatibility', () => {
    it('verifies that adding monthlyCommunalServicesZAR: 2500 accurately reduces netMonthlyCashflowZAR and annualized NOI by the exact Rand amount', () => {
      const withCommunal = calculateRentalCashflow({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const withoutCommunal = calculateRentalCashflow({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Total monthly expenses must be exactly R2,500 higher
      expect(withCommunal.totalMonthlyExpensesZAR - withoutCommunal.totalMonthlyExpensesZAR).toBe(2500);

      // netMonthlyCashflowZAR must be reduced by exactly R2,500
      expect(withoutCommunal.netMonthlyCashflowZAR - withCommunal.netMonthlyCashflowZAR).toBe(2500);

      // Annualized NOI must be reduced by exactly R2,500 * 12 = R30,000
      expect(withoutCommunal.annualizedNOI - withCommunal.annualizedNOI).toBe(2500 * 12);
      expect(withoutCommunal.annualNetOperatingIncome - withCommunal.annualNetOperatingIncome).toBe(30000);

      // Verified exact numbers
      // Gross Rent: 12,000 + 8,000 = 20,000
      // Expenses: Rates (1,200) + Insurance (600) + Reserve (800) + Bond (8,500) + Vending (150) + Communal (2,500) = 13,750
      expect(withCommunal.totalMonthlyExpensesZAR).toBe(13750);
      expect(withCommunal.netMonthlyCashflowZAR).toBe(20000 - 13750); // 6,250
      expect(withCommunal.monthlyNOI).toBe(20000 - (13750 - 8500)); // 14,750 (excluding bond debt)
      expect(withCommunal.annualizedNOI).toBe(14750 * 12); // 177,000
    });

    it('verifies backward compatibility: an object omitting monthlyCommunalServicesZAR defaults to 0 without errors or NaN', () => {
      const omittedCommunal = calculateRentalCashflow({
        monthlyGrossRentZAR: 15000,
        monthlyLeviesZAR: 1500,
        monthlyRatesTaxesZAR: 900,
        monthlyMaintenanceReserveZAR: 500,
        monthlyBondPaymentZAR: 9000,
        // monthlyCommunalServicesZAR omitted
      });

      expect(omittedCommunal.monthlyCommunalServicesZAR).toBe(0);
      expect(omittedCommunal.communalServicesZAR).toBe(0);
      expect(Number.isNaN(omittedCommunal.netMonthlyCashflowZAR)).toBe(false);
      expect(Number.isNaN(omittedCommunal.annualizedNOI)).toBe(false);
      expect(omittedCommunal.netMonthlyCashflowZAR).toBe(15000 - (1500 + 900 + 500 + 9000)); // 3,100
      expect(omittedCommunal.annualizedNOI).toBe((15000 - (1500 + 900 + 500)) * 12); // 145,200
    });
  });

  describe('2. computeRentalPropertyMetrics Communal OpEx Deduction & Cap Rate Alignment', () => {
    it('verifies that adding monthlyCommunalServicesZAR: 2500 accurately reduces annualized NOI and Net Cashflow in computeRentalPropertyMetrics', () => {
      const metricsWith = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const metricsWithout = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Net monthly cashflow reduction
      expect(metricsWithout.netMonthlyCashflowZAR - metricsWith.netMonthlyCashflowZAR).toBe(2500);
      expect(metricsWithout.annualNetCashflowZAR - metricsWith.annualNetCashflowZAR).toBe(30000);

      // Annualized NOI reduction
      expect(metricsWithout.annualizedNOI - metricsWith.annualizedNOI).toBe(30000);
      expect(metricsWithout.annualNetOperatingIncome - metricsWith.annualNetOperatingIncome).toBe(30000);

      // Cap Rate reflects the serviced operating burden
      expect(metricsWith.capRatePercent).toBeLessThan(metricsWithout.capRatePercent);
      const expectedCapRateDiff = ((30000) / baseRental.marketValueZAR) * 100;
      expect(metricsWithout.capRatePercent - metricsWith.capRatePercent).toBeCloseTo(expectedCapRateDiff, 4);
    });

    it('verifies backward compatibility: computeRentalPropertyMetrics with undefined or missing monthlyCommunalServicesZAR', () => {
      const metricsLegacy = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: undefined,
      });

      const metricsZero = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      expect(metricsLegacy.annualizedNOI).toBe(metricsZero.annualizedNOI);
      expect(metricsLegacy.netMonthlyCashflowZAR).toBe(metricsZero.netMonthlyCashflowZAR);
      expect(Number.isNaN(metricsLegacy.capRatePercent)).toBe(false);
      expect(Number.isNaN(metricsLegacy.cashOnCashPercent)).toBe(false);
    });
  });

  describe('3. calculateDealMetrics & 20-Year Projections with Communal OpEx', () => {
    it('accurately incorporates monthlyCommunalServicesZAR into calculateDealMetrics', () => {
      const dealWith = calculateDealMetrics({
        purchasePrice: 1_000_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 16_000,
        monthlyLevies: 1_000,
        monthlyRatesTaxes: 800,
        annualInsurance: 6_000,
        managementFeePercent: 8,
        agencyVatApplicable: true,
        monthlyMaintenanceReserveZAR: 500,
        monthlyPrepaidVendingFeeZAR: 150,
        monthlyCommunalServicesZAR: 2_500,
        vacancyRatePercent: 5,
        targetExitPrice: 1_400_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 1_048_500,
        },
      });

      const dealWithout = calculateDealMetrics({
        purchasePrice: 1_000_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 16_000,
        monthlyLevies: 1_000,
        monthlyRatesTaxes: 800,
        annualInsurance: 6_000,
        managementFeePercent: 8,
        agencyVatApplicable: true,
        monthlyMaintenanceReserveZAR: 500,
        monthlyPrepaidVendingFeeZAR: 150,
        monthlyCommunalServicesZAR: 0,
        vacancyRatePercent: 5,
        targetExitPrice: 1_400_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 1_048_500,
        },
      });

      expect(dealWithout.monthlyCashFlow - dealWith.monthlyCashFlow).toBe(2500);
      expect(dealWithout.annualNetOperatingIncome - dealWith.annualNetOperatingIncome).toBe(30000);
    });

    it('compounds monthlyCommunalServicesZAR over 20-year projection schedule in generateRentalLongTermProjection', () => {
      const projWith = generateRentalLongTermProjection({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const projWithout = generateRentalLongTermProjection({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      expect(projWith).toHaveLength(20);
      // Year 1 operating costs diff = R2,500 * 12 = R30,000
      expect(projWith[0].costs - projWithout[0].costs).toBe(30000);

      // Year 2 operating costs diff = R30,000 * 1.06 (6% inflation)
      expect(projWith[1].costs - projWithout[1].costs).toBe(Math.round(30000 * 1.06));
    });
  });

  describe('4. Circa Illovo 12-Unit SPV & Multi-Unit / Syndication Underwriting', () => {
    it('accurately models Circa Illovo 12-unit VAT-inclusive developer sale with R0 transfer duty, R/m², SPV admin fee, DSCR, and 5-Yr IRR', () => {
      const purchasePrice = 11_699_536;
      const openMarketValue = 12_609_500;
      const numberOfUnits = 12;
      const floorAreaSqm = 420;

      const metrics = calculateDealMetrics({
        strategy: 'Rental',
        purchasePrice,
        openMarketValue,
        numberOfUnits,
        floorAreaSqm,
        isVatInclusiveDeveloperSale: true,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 109_956,
        monthlyLevies: 15_000,
        monthlyRatesTaxes: 8_400,
        annualInsurance: 0,
        managementFeePercent: 6,
        agencyVatApplicable: false,
        tenantPlacementFeePercent: 3.3,
        annualSpvAdminAuditFeeZAR: 50_000,
        monthlyMaintenanceReserveZAR: 2_500,
        monthlyPrepaidVendingFeeZAR: 0,
        monthlyCommunalServicesZAR: 0,
        vacancyRatePercent: 5,
        targetExitPrice: 0,
        holdingPeriodMonths: 6,
        loanToValuePercent: 30,
        interestRatePercent: 10.0,
        loanTermYears: 10,
        annualCapitalGrowthPercent: 5.0,
        annualRentalEscalationPercent: 6.0,
        annualExpenseInflationPercent: 6.0,
      });

      // 1. VAT-Inclusive Developer Sale -> R0 Transfer Duty (saving ~R1,106,699)
      expect(metrics.transferDutyZAR).toBe(0);

      // 2. Built-in Equity
      const builtInEquityZAR = openMarketValue - purchasePrice;
      const builtInEquityPercent = Number(((builtInEquityZAR / openMarketValue) * 100).toFixed(2));
      expect(builtInEquityZAR).toBe(909_964);
      expect(builtInEquityPercent).toBeCloseTo(7.22, 2);

      // 3. Price & Valuation per m² and Average Price per Unit
      expect(metrics.purchasePricePerSqm).toBe(27_856); // Math.round(11699536 / 420)
      expect(metrics.valuationPerSqm).toBe(30_023); // Math.round(12609500 / 420)
      expect(metrics.averagePricePerUnit).toBe(Math.round(purchasePrice / 12)); // 974,961

      // 4. SPV Admin Fee & Placement Fee in OpEx
      expect(metrics.monthlySpvAdminZAR).toBe(Math.round(50_000 / 12)); // 4,167
      expect(metrics.monthlyPlacementFeeZAR).toBe(Math.round(109_956 * 0.033)); // 3,629

      // 5. DSCR & 5-Year IRR are finite numbers without NaN
      expect(metrics.dscr).not.toBeNull();
      expect(metrics.dscr).toBeCloseTo(1.38, 2);
      expect(Number.isFinite(metrics.fiveYearIrrPercent)).toBe(true);
      expect(metrics.fiveYearIrrPercent).toBeGreaterThan(8);
    });

    it('guards against division-by-zero when floorAreaSqm is 0 or omitted', () => {
      const metrics = calculateDealMetrics({
        purchasePrice: 1_500_000,
        openMarketValue: 1_800_000,
        floorAreaSqm: 0,
        numberOfUnits: 0,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 15_000,
        monthlyLevies: 1_200,
        monthlyRatesTaxes: 800,
        targetExitPrice: 1_800_000,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
      });

      expect(metrics.purchasePricePerSqm).toBe(0);
      expect(metrics.valuationPerSqm).toBe(0);
      expect(metrics.averagePricePerUnit).toBe(1_500_000);
    });
  });

  describe('5. Hybrid BRRRR Refinance & Unleveraged Cash DSCR', () => {
    it('models Hybrid BRRRR post-rehab refinance loan, trapped cash, recycled equity, and post-refi cashflow', () => {
      const metrics = calculateDealMetrics({
        strategy: 'BRRRR',
        purchasePrice: 1_000_000,
        openMarketValue: 1_200_000,
        estimatedRehabCost: 200_000,
        monthlyRentalEstimate: 18_000,
        monthlyLevies: 1_200,
        monthlyRatesTaxes: 900,
        managementFeePercent: 8,
        agencyVatApplicable: true,
        vacancyRatePercent: 5,
        targetExitPrice: 1_600_000, // Post-Rehab ARV
        refinanceLtvPercent: 75,
        loanToValuePercent: 80, // R800k initial bond, R200k deposit
        interestRatePercent: 11.0,
        loanTermYears: 20,
      });

      // Refinance loan at 75% of R1.6M ARV = R1,200,000
      expect(metrics.brrrrRefinanceLoanZAR).toBe(1_200_000);
      // Total all-in outlay = Deposit (200k) + Initial Bond (800k) + Rehab (200k) + Fees (~47k) = ~1,247k
      // Cash left in deal = max(0, ~1,247k - 1,200k) = ~47k
      expect(metrics.brrrrCashLeftInDealZAR).toBe(metrics.initialCapitalRequired + metrics.bondAmount - 1_200_000);
      expect(metrics.brrrrEquityExtractedZAR).toBe(0);
      expect(metrics.brrrrPostRefiBondPaymentZAR).toBeGreaterThan(metrics.monthlyBondPayment);
      expect(metrics.brrrrPostRefiCashflowZAR).toBe(
        Math.round(metrics.annualNetOperatingIncome / 12 - metrics.brrrrPostRefiBondPaymentZAR)
      );

      // Verify full cash-out BRRRR when ARV is R1,800,000 (75% = R1,350,000 > R1,247k all-in outlay)
      const fullOutMetrics = calculateDealMetrics({
        strategy: 'BRRRR',
        purchasePrice: 1_000_000,
        openMarketValue: 1_200_000,
        estimatedRehabCost: 200_000,
        monthlyRentalEstimate: 18_000,
        monthlyLevies: 1_200,
        monthlyRatesTaxes: 900,
        targetExitPrice: 1_800_000,
        refinanceLtvPercent: 75,
        loanToValuePercent: 80,
        interestRatePercent: 11.0,
        loanTermYears: 20,
      });
      expect(fullOutMetrics.brrrrRefinanceLoanZAR).toBe(1_350_000);
      expect(fullOutMetrics.brrrrCashLeftInDealZAR).toBe(0);
      expect(fullOutMetrics.brrrrEquityExtractedZAR).toBe(
        1_350_000 - (fullOutMetrics.initialCapitalRequired + fullOutMetrics.bondAmount)
      );
    });

    it('returns dscr: null when loanToValuePercent is 0 (unleveraged cash deal)', () => {
      const cashMetrics = calculateDealMetrics({
        strategy: 'Rental',
        purchasePrice: 1_200_000,
        openMarketValue: 1_350_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 14_000,
        monthlyLevies: 1_500,
        monthlyRatesTaxes: 800,
        targetExitPrice: 0,
        loanToValuePercent: 0,
        interestRatePercent: 11.5,
        loanTermYears: 20,
      });

      expect(cashMetrics.monthlyBondPayment).toBe(0);
      expect(cashMetrics.dscr).toBeNull();
      expect(Number.isFinite(cashMetrics.fiveYearIrrPercent)).toBe(true);
    });

    it('deducts tenantPlacementFeePercent and annualSpvAdminAuditFeeZAR in calculateRentalMao so MAO aligns with calculateDealMetrics NOI', () => {
      const maoWithoutSyndicationFees = calculateRentalMao({
        monthlyRent: 109_956,
        vacancyRatePercent: 5,
        managementFeePercent: 6,
        agencyVatApplicable: false,
        monthlyLevies: 15_000,
        monthlyRates: 8_400,
        annualInsurance: 0,
        monthlyMaintenanceReserve: 2_500,
        monthlyPrepaidVendingFee: 0,
        monthlyCommunalServicesZAR: 0,
        tenantPlacementFeePercent: 0,
        annualSpvAdminAuditFeeZAR: 0,
        targetNetYieldPercent: 8.5,
      });

      const maoWithSyndicationFees = calculateRentalMao({
        monthlyRent: 109_956,
        vacancyRatePercent: 5,
        managementFeePercent: 6,
        agencyVatApplicable: false,
        monthlyLevies: 15_000,
        monthlyRates: 8_400,
        annualInsurance: 0,
        monthlyMaintenanceReserve: 2_500,
        monthlyPrepaidVendingFee: 0,
        monthlyCommunalServicesZAR: 0,
        tenantPlacementFeePercent: 3.3,
        annualSpvAdminAuditFeeZAR: 50_000,
        targetNetYieldPercent: 8.5,
      });

      const expectedPlacementAnnual = Math.round(109_956 * 12 * 0.033);
      const expectedSpvAnnual = 50_000;
      expect(maoWithoutSyndicationFees.stressTestedNoi - maoWithSyndicationFees.stressTestedNoi).toBe(
        expectedPlacementAnnual + expectedSpvAnnual
      );
      expect(maoWithSyndicationFees.maxAllowablePrice).toBeLessThan(maoWithoutSyndicationFees.maxAllowablePrice);
    });

    it('allows non-zero customTransferDutyZAR override even when isVatInclusiveDeveloperSale is true', () => {
      const overriddenMetrics = calculateDealMetrics({
        purchasePrice: 5_000_000,
        openMarketValue: 5_500_000,
        isVatInclusiveDeveloperSale: true,
        customTransferDutyZAR: 75_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 45_000,
        monthlyLevies: 4_000,
        monthlyRatesTaxes: 2_500,
        targetExitPrice: 0,
        loanToValuePercent: 70,
        interestRatePercent: 10.5,
        loanTermYears: 20,
      });

      expect(overriddenMetrics.transferDutyZAR).toBe(75_000);
    });

    it('computes rehabCostPerUnit and allInCostPerUnit for multi-let developments', () => {
      const multiLetMetrics = calculateDealMetrics({
        purchasePrice: 600_000,
        openMarketValue: 1_400_000,
        numberOfUnits: 8,
        estimatedRehabCost: 520_000, // R65,000 per room
        monthlyRentalEstimate: 22_400, // R2,800 per room
        monthlyLevies: 0,
        monthlyRatesTaxes: 1_200,
        targetExitPrice: 1_400_000,
        loanToValuePercent: 80,
        interestRatePercent: 13.25,
        loanTermYears: 15,
      });

      expect(multiLetMetrics.rehabCostPerUnit).toBe(65_000);
      expect(multiLetMetrics.allInCostPerUnit).toBeGreaterThan(140_000);
    });

    it('scaffolds N unit leases, sets prepaid_submeter utilityType, and applies loanTermYears in convertFlipToRental', () => {
      usePortfolioStore.setState({
        flips: [
          {
            id: 'flip-btr-8',
            title: 'Tembisa 8-Room Infill (Flip)',
            address: '14 Ivory Park Rd',
            city: 'Midrand & Waterfall',
            province: 'Gauteng',
            propertyType: 'Freehold House',
            projectStrategy: 'build_to_rent',
            numberOfUnits: 8,
            floorAreaSqm: 192,
            purchaseDate: '2026-01-15',
            purchasePriceZAR: 550_000,
            acquisitionCostsZAR: 35_000,
            baselineRenovationBudgetZAR: 520_000,
            monthlyBondPaymentZAR: 11_500,
            targetExitPriceZAR: 1_450_000,
            targetCompletionDate: '2026-08-01',
            currentPhase: 'Snagging',
            boq: [],
            linkedFundingIds: [],
            status: 'Active',
          },
        ],
        rentals: [],
      });

      const createdRental = usePortfolioStore.getState().convertFlipToRental({
        flipId: 'flip-btr-8',
        initialGrossRentZAR: 22_400,
        marketValuationZAR: 1_450_000,
        loanTermYears: 15,
      });

      expect(createdRental.numberOfUnits).toBe(8);
      expect(createdRental.floorAreaSqm).toBe(192);
      expect(createdRental.loanTermYears).toBe(15);
      expect(createdRental.utilityType).toBe('prepaid_submeter');
      expect(createdRental.leases).toHaveLength(8);
      expect(createdRental.leases[0].unitName).toBe('Unit 1');
      expect(createdRental.leases[7].unitName).toBe('Unit 8');
      expect(createdRental.leases.reduce((s, l) => s + l.monthlyRentZAR, 0)).toBe(22_400);
    });

    it('excludes Phased Own-Cash (Brick-by-Brick) from totalPrivateFundingLiability and newlyDrawnCapital', () => {
      const summary = computePortfolioSummary({
        rentals: [],
        flips: [],
        liquidCapitalReserve: 300_000,
        funding: [
          {
            id: 'fund-brick-1',
            lenderName: 'Personal Cashflow Build',
            entityOrContact: 'Self',
            emailPhone: '',
            fundingType: 'Phased Own-Cash (Brick-by-Brick)',
            capitalAmountZAR: 400_000,
            disbursementDate: '2026-03-01',
            maturityDate: '2027-03-01',
            returnTermsType: 'Zero Interest',
            returnRatePercent: 0,
            paymentSchedule: 'At Exit (Maturity)',
            totalRepaidZAR: 0,
            status: 'Active',
            tranches: [
              { id: 't1', name: 'Phase 1', amountZAR: 100_000, isDisbursed: true, linkedMilestonePhase: 'Deposit' },
              { id: 't2', name: 'Phase 2', amountZAR: 300_000, isDisbursed: false, linkedMilestonePhase: 'First Fix / Wet Works' },
            ],
          },
          {
            id: 'fund-stokvel-1',
            lenderName: 'Kasi Builders Stokvel',
            entityOrContact: 'Syndicate',
            emailPhone: '',
            fundingType: 'Stokvel / Micro-Syndicate',
            capitalAmountZAR: 200_000,
            disbursementDate: '2026-03-01',
            maturityDate: '2027-03-01',
            returnTermsType: 'Fixed Interest',
            returnRatePercent: 15,
            paymentSchedule: 'Monthly Interest',
            linkedDealId: 'flip-btr-8',
            linkedDealName: 'Tembisa 8-Room Infill',
            totalRepaidZAR: 0,
            status: 'Active',
            tranches: [
              { id: 'st1', name: 'Phase 1', amountZAR: 80_000, isDisbursed: true, linkedMilestonePhase: 'Deposit' },
              { id: 'st2', name: 'Phase 2', amountZAR: 120_000, isDisbursed: false, linkedMilestonePhase: 'Finishes' },
            ],
          },
        ],
      });

      // Only the drawn Stokvel tranche (R80,000) is external debt; Phased Own-Cash (R100,000) is excluded!
      expect(summary.totalPrivateFundingLiability).toBe(80_000);
      // Liquid Capital Reserve remains R300,000 (not inflated by Phased Own-Cash)
      expect(summary.liquidCapitalReserve).toBe(300_000);
    });
  });
});

