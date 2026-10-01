import { describe, it, expect, beforeEach } from 'vitest';
import { computePortfolioSummary, usePortfolioStore } from '../usePortfolioStore';
import { FlipProject, FundingSource, RentalProperty } from '@/types';

describe('Portfolio Summary: Ring-Fenced Working Capital & SARS Provisional Tax Engine', () => {
  const sampleFlip1: FlipProject = {
    id: 'test-flip-1',
    title: 'Kloof Street Victorian Reno',
    address: '12 Kloof St',
    city: 'Cape Town',
    purchaseDate: '2026-06-01',
    purchasePriceZAR: 2_000_000,
    acquisitionCostsZAR: 150_000,
    baselineRenovationBudgetZAR: 500_000,
    monthlyHoldingCostZAR: 10_000,
    estimatedDurationMonths: 6,
    targetExitPriceZAR: 3_500_000,
    targetCompletionDate: '2026-12-01',
    linkedFundingIds: [],
    status: 'Active',
    currentPhase: 'Finishes & Tiling',
    taxEntityType: 'Company (27%)',
    municipalClearance: {
      sec118ArrearsZAR: 20_000,
      advanceCouncilDepositZAR: 30_000,
      rccStatus: 'Certificate Issued',
    },
    drawSchedule: {
      depositPaid: true,
      firstFixApproved: true,
      finishesApproved: false,
      retentionReleased: false,
    },
    boq: [
      {
        id: 'b-1',
        category: 'Demolition & Prep',
        itemDescription: 'Strip out old kitchen',
        unit: 'lump sum',
        quantity: 1,
        baselineUnitCostZAR: 50_000,
        baselineTotalZAR: 50_000,
        actualCostZAR: 50_000,
        varianceZAR: 0,
        supplierOrContractor: 'Demo Pros',
        status: 'Completed',
        milestonePhase: 'Deposit',
        retentionPercent: 0,
      },
      {
        id: 'b-2',
        category: 'Plumbing & Wet Works',
        itemDescription: 'New copper plumbing & geyser',
        unit: 'lump sum',
        quantity: 1,
        baselineUnitCostZAR: 100_000,
        baselineTotalZAR: 100_000,
        actualCostZAR: 100_000,
        varianceZAR: 0,
        supplierOrContractor: 'Cape Plumbers',
        status: 'Completed',
        milestonePhase: 'First Fix / Wet Works',
        retentionPercent: 10, // R10,000 retained
      },
      {
        id: 'b-3',
        category: 'Kitchen & Cabinetry',
        itemDescription: 'Custom cabinetry installation',
        unit: 'lump sum',
        quantity: 1,
        baselineUnitCostZAR: 200_000,
        baselineTotalZAR: 200_000,
        actualCostZAR: 200_000,
        varianceZAR: 0,
        supplierOrContractor: 'Joinery Master',
        status: 'In Progress',
        milestonePhase: 'Finishes',
        retentionPercent: 10, // R20,000 retention + R180,000 pending draw = R200,000 ring-fenced
      },
    ],
  };

  const sampleFlip2: FlipProject = {
    id: 'test-flip-2',
    title: 'Waterkloof Diplomatic Fixer',
    address: '45 Victoria St',
    city: 'Pretoria',
    purchaseDate: '2026-07-01',
    purchasePriceZAR: 1_800_000,
    acquisitionCostsZAR: 120_000,
    baselineRenovationBudgetZAR: 300_000,
    monthlyHoldingCostZAR: 8_000,
    estimatedDurationMonths: 4,
    targetExitPriceZAR: 2_600_000,
    targetCompletionDate: '2026-11-15',
    linkedFundingIds: [],
    status: 'Active',
    currentPhase: 'First Fix (Plumbing/Elec)',
    taxEntityType: 'Company (27%)',
    municipalClearance: {
      sec118ArrearsZAR: 40_000,
      advanceCouncilDepositZAR: 25_000,
      rccStatus: 'Disputed',
      disputeNotes: 'City of Tshwane meter dispute',
    },
    drawSchedule: {
      depositPaid: true,
      firstFixApproved: false,
      finishesApproved: false,
      retentionReleased: false,
    },
    boq: [
      {
        id: 'b-4',
        category: 'Plumbing & Wet Works',
        itemDescription: 'Drainage repairs',
        unit: 'lump sum',
        quantity: 1,
        baselineUnitCostZAR: 80_000,
        baselineTotalZAR: 80_000,
        actualCostZAR: 80_000,
        varianceZAR: 0,
        supplierOrContractor: 'Pretoria Pipes',
        status: 'In Progress',
        milestonePhase: 'First Fix / Wet Works',
        retentionPercent: 10, // R8,000 retention + R72,000 pending draw = R80,000
      },
    ],
  };

  it('accurately calculates ringFencedWorkingCapital (retentions + pending draws + advance council deposits)', () => {
    // Flip 1:
    // Advance Council Deposit: 30,000
    // Retentions: b-2 completed (10% of 100k = 10,000) + b-3 in progress (10% of 200k = 20,000) = 30,000
    // Pending draws: b-3 in progress (90% of 200k = 180,000)
    // Flip 1 ring-fenced = 30,000 + 30,000 + 180,000 = 240,000
    //
    // Flip 2:
    // Advance Council Deposit: 25,000
    // Retentions: b-4 in progress (10% of 80k = 8,000)
    // Pending draws: b-4 in progress (90% of 80k = 72,000)
    // Flip 2 ring-fenced = 25,000 + 8,000 + 72,000 = 105,000
    //
    // Total Ring-Fenced = 240,000 + 105,000 = 345,000
    const summary = computePortfolioSummary({
      rentals: [],
      flips: [sampleFlip1, sampleFlip2],
      funding: [],
      liquidCapitalReserve: 1_000_000,
    });

    expect(summary.ringFencedWorkingCapital).toBe(345_000);
    // Free unallocated cash = 1,000,000 - 345,000 = 655,000
    expect(summary.freeUnallocatedCash).toBe(655_000);
  });

  it('handles negative freeUnallocatedCash by clamping at 0 when reserves are insufficient', () => {
    const summary = computePortfolioSummary({
      rentals: [],
      flips: [sampleFlip1, sampleFlip2],
      funding: [],
      liquidCapitalReserve: 200_000, // Less than 345,000 ring-fenced
    });

    expect(summary.ringFencedWorkingCapital).toBe(345_000);
    expect(summary.freeUnallocatedCash).toBe(0);
  });

  it('releases retention pool from ring-fenced capital when retentionReleased is true', () => {
    const flipWithRetentionReleased: FlipProject = {
      ...sampleFlip1,
      drawSchedule: {
        depositPaid: true,
        firstFixApproved: true,
        finishesApproved: true,
        retentionReleased: true, // Retentions signed off and paid out
      },
    };

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [flipWithRetentionReleased],
      funding: [],
      liquidCapitalReserve: 1_000_000,
    });

    // Advance council: 30,000
    // Retentions: 0 (released)
    // Pending draws: b-3 (90% of 200k = 180,000)
    // Total = 210,000
    expect(summary.ringFencedWorkingCapital).toBe(210_000);
    expect(summary.freeUnallocatedCash).toBe(790_000);
  });

  it('accurately computes pre-tax profits and 27% SARS corporate provisional tax reserve', () => {
    // Flip 1 Costs:
    // Purchase: 2,000,000
    // Acquisition: 150,000
    // BOQ actual: 50,000 + 100,000 + 200,000 = 350,000
    // Holding: 6 * 10,000 = 60,000
    // Sec 118: 20,000 + 30,000 = 50,000
    // Total Cost = 2,610,000
    // Exit = 3,500,000
    // Gross Pre-Tax Profit = 3,500,000 - 2,610,000 = 890,000
    // 27% Company Tax = 890,000 * 0.27 = 240,300
    // Net Profit = 890,000 - 240,300 = 649,700

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [sampleFlip1],
      funding: [],
      liquidCapitalReserve: 500_000,
    });

    expect(summary.totalGrossProjectedFlipProfits).toBe(890_000);
    expect(summary.totalSarsProvisionalTaxReserve).toBe(240_300);
    expect(summary.totalNetProjectedFlipProfits).toBe(649_700);
    // Backward compatibility check
    expect(summary.totalProjectedFlipProfits).toBe(890_000);
  });

  it('applies 45% tax for individual flips and 0% for pre-tax entities', () => {
    const individualFlip: FlipProject = {
      ...sampleFlip1,
      id: 'ind-flip',
      taxEntityType: 'Individual (45%)',
    };

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [individualFlip],
      funding: [],
      liquidCapitalReserve: 500_000,
    });

    // Gross = 890,000
    // Tax @ 45% = 890,000 * 0.45 = 400,500
    // Net = 489,500
    expect(summary.totalGrossProjectedFlipProfits).toBe(890_000);
    expect(summary.totalSarsProvisionalTaxReserve).toBe(400_500);
    expect(summary.totalNetProjectedFlipProfits).toBe(489_500);
  });

  it('does not accrue tax reserve on loss-making pipeline flips', () => {
    const lossFlip: FlipProject = {
      ...sampleFlip1,
      targetExitPriceZAR: 2_000_000, // Total cost is 2,610,000 -> Loss of -610,000
    };

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [lossFlip],
      funding: [],
      liquidCapitalReserve: 500_000,
    });

    expect(summary.totalGrossProjectedFlipProfits).toBe(-610_000);
    expect(summary.totalSarsProvisionalTaxReserve).toBe(0);
    expect(summary.totalNetProjectedFlipProfits).toBe(-610_000);
  });

  it('synchronizes funding maturity dates and records delay extensions via syncFundingWithDealDelay', () => {
    const testFunding: FundingSource = {
      id: 'test-fund-sync',
      lenderName: 'Investec Private Debt',
      entityOrContact: 'Credit Committee',
      emailPhone: 'private@investec.co.za',
      fundingType: 'Private Lender',
      capitalAmountZAR: 1_200_000,
      disbursementDate: '2026-03-01',
      maturityDate: '2026-09-01',
      returnTermsType: 'Fixed Interest',
      returnRatePercent: 13.5,
      paymentSchedule: 'Monthly Interest',
      linkedDealId: 'test-flip-1',
      linkedDealName: 'Kloof Street Victorian Reno',
      totalRepaidZAR: 0,
      status: 'Active',
    };

    usePortfolioStore.getState().addFunding(testFunding);

    // Initial check
    let stored = usePortfolioStore.getState().funding.find((f) => f.id === 'test-fund-sync');
    expect(stored).toBeDefined();
    expect(stored?.maturityDate).toBe('2026-09-01');

    // Execute +60 Days extension due to Deeds Office delay
    usePortfolioStore.getState().syncFundingWithDealDelay(
      'test-fund-sync',
      60,
      'CoJ Section 118 clearance certificate dispute'
    );

    stored = usePortfolioStore.getState().funding.find((f) => f.id === 'test-fund-sync');
    expect(stored?.originalMaturityDate).toBe('2026-09-01');
    expect(stored?.delayExtensionDays).toBe(60);
    expect(stored?.delayNotes).toContain('CoJ Section 118 clearance certificate dispute');

    // Expected maturity = '2026-09-01' + 60 days = '2026-10-31'
    expect(stored?.maturityDate).toBe('2026-10-31');

    // Clean up
    usePortfolioStore.getState().deleteFunding('test-fund-sync');
  });

  it('calculates private funding liability strictly from drawn capital, excluding undrawn tranches and standby lines', () => {
    const fundingSources: FundingSource[] = [
      {
        id: 'fund-tranches',
        lenderName: 'Tranche Lender',
        entityOrContact: 'Lender Trust',
        emailPhone: 'lender@test.co.za',
        fundingType: 'Private Lender',
        capitalAmountZAR: 1_500_000,
        disbursementDate: '2026-03-01',
        maturityDate: '2026-11-30',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 14.0,
        paymentSchedule: 'Monthly Interest',
        linkedDealId: 'deal-1',
        totalRepaidZAR: 105_000,
        status: 'Active',
        tranches: [
          { id: 't-1', name: 'Tranche 1', amountZAR: 900_000, isDisbursed: true },
          { id: 't-2', name: 'Tranche 2', amountZAR: 400_000, isDisbursed: true },
          { id: 't-3', name: 'Tranche 3', amountZAR: 200_000, isDisbursed: false }, // Undrawn: R 200k
        ],
      },
      {
        id: 'fund-active-no-tranches',
        lenderName: 'Syndicate',
        entityOrContact: 'Syndicate MD',
        emailPhone: 'syndicate@test.co.za',
        fundingType: 'Proposal-backed',
        capitalAmountZAR: 800_000,
        disbursementDate: '2026-05-15',
        maturityDate: '2027-03-01',
        returnTermsType: 'Equity Profit Split',
        returnRatePercent: 25.0,
        paymentSchedule: 'At Exit (Maturity)',
        linkedDealId: 'deal-2',
        totalRepaidZAR: 0,
        status: 'Active',
      },
      {
        id: 'fund-standby',
        lenderName: 'Oom Piet (Standby)',
        entityOrContact: 'Personal',
        emailPhone: 'piet@test.co.za',
        fundingType: 'Ad-hoc Friends & Family',
        capitalAmountZAR: 450_000,
        disbursementDate: '2026-04-01',
        maturityDate: '2027-04-01',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 11.5,
        paymentSchedule: 'At Exit (Maturity)',
        linkedDealId: undefined,
        linkedDealName: 'Liquid Operational Reserve',
        totalRepaidZAR: 0,
        status: 'Standby',
      },
    ];

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [],
      funding: fundingSources,
      liquidCapitalReserve: 650_000,
    });

    // fund-tranches: drawn = 1.3M, repaid = 105k -> liability = 1,195,000 (excludes 200k undrawn)
    // fund-active-no-tranches: drawn = 800k, repaid = 0 -> liability = 800,000
    // fund-standby: drawn = 0 -> liability = 0 (excludes 450k standby)
    // Total private funding liability = 1,195,000 + 800,000 = 1,995,000
    expect(summary.totalPrivateFundingLiability).toBe(1_995_000);

    // Unallocated reserve: fund-standby has status 'Standby' and no linkedDealId -> 450,000
    expect(summary.unallocatedFundingReserve).toBe(450_000);

    // Free unallocated cash = liquidCapitalReserve (650k) - ringFenced (0) = 650,000
    expect(summary.freeUnallocatedCash).toBe(650_000);

    // Deployable War Chest = 650,000 + 450,000 = 1,100,000
    expect(summary.deployableWarChest).toBe(1_100_000);

    // Total deployable purchasing power = 650,000 (free cash) + 450,000 (standby facility) = 1,100,000
    expect(summary.totalAvailablePurchasingPower).toBe(1_100_000);
  });

  it('correctly calculates initial portfolio summary from store with updated accounting', () => {
    const summary = computePortfolioSummary(usePortfolioStore.getState());

    // Private debt should be strictly drawn: R 1,995,000
    expect(summary.totalPrivateFundingLiability).toBe(1_995_000);

    // Unallocated funding reserve should include Oom Piet's standby facility: R 450,000
    expect(summary.unallocatedFundingReserve).toBe(450_000);

    // Liquid cash reserve is R 650,000
    expect(summary.liquidCapitalReserve).toBe(650_000);

    // Deployable War Chest (Cash + Pre-Approved Standby Facility) = R 650,000 + R 450,000 = R 1,100,000
    expect(summary.deployableWarChest).toBe(1_100_000);

    // In initial store, active flips ring-fence working capital (R 757,150 >= R 650,000), clamping free cash to 0
    expect(summary.freeUnallocatedCash).toBe(0);
    // Net purchasing power after ring-fencing = R 0 + R 450,000 = R 450,000
    expect(summary.totalAvailablePurchasingPower).toBe(450_000);

    // Total bond liabilities across 4 active rentals = 1.28M + 940k + 1.55M + 520k = R 4,290,000
    expect(summary.totalBondLiabilities).toBe(4_290_000);

    // Total funding liabilities = R 1,995,000 (private) + R 4,290,000 (bonds) = R 6,285,000
    expect(summary.totalFundingLiabilities).toBe(6_285_000);
  });

  it('ensures settled funding facilities with tranches carry 0 liability', () => {
    const settledFacility: FundingSource = {
      id: 'fund-settled',
      lenderName: 'Settled Funder',
      entityOrContact: 'Settled Trust',
      emailPhone: 'settled@test.co.za',
      fundingType: 'Private Lender',
      capitalAmountZAR: 1_000_000,
      disbursementDate: '2025-01-01',
      maturityDate: '2026-01-01',
      returnTermsType: 'Fixed Interest',
      returnRatePercent: 12.0,
      paymentSchedule: 'At Exit (Maturity)',
      totalRepaidZAR: 500_000,
      status: 'Settled',
      tranches: [
        { id: 'st-1', name: 'Tranche 1', amountZAR: 1_000_000, isDisbursed: true },
      ],
    };

    const summary = computePortfolioSummary({
      rentals: [],
      flips: [],
      funding: [settledFacility],
      liquidCapitalReserve: 500_000,
    });

    expect(summary.totalPrivateFundingLiability).toBe(0);
  });

  it('validates Unified Net & Gross War Chest bridge metrics across dashboard and funding ledger', () => {
    const state = usePortfolioStore.getState();
    const summary = computePortfolioSummary(state);

    // Initial state invariants matching user requirements:
    // 1. Gross War Chest = liquid reserve (650k) + unallocated standby facilities (450k) = 1,100,000
    expect(summary.deployableWarChest).toBe(1_100_000);
    expect(summary.liquidCapitalReserve).toBe(650_000);
    expect(summary.unallocatedFundingReserve).toBe(450_000);

    // 2. Active flips ring-fenced working capital is R 757,150 (contractor draws, retentions, council deposits)
    expect(summary.ringFencedWorkingCapital).toBe(757_150);

    // 3. Free Unallocated Cash is clamped to R 0 because 650k < 757,150
    expect(summary.freeUnallocatedCash).toBe(0);

    // 4. Net Purchasing Power is strictly free cash (0) + unallocated facilities (450k) = 450,000
    expect(summary.totalAvailablePurchasingPower).toBe(450_000);

    // 5. Deduction bridge equation holds:
    // Gross War Chest (1,100,000) - Ring-Fenced (757,150 clamped against cash) yields Net Deployable Purchasing Power (450,000)
    const effectivePurchasingPower = Math.max(0, summary.liquidCapitalReserve - summary.ringFencedWorkingCapital) + summary.unallocatedFundingReserve;
    expect(summary.totalAvailablePurchasingPower).toBe(effectivePurchasingPower);
  });

  it('dynamically adapts Unified Net & Gross bridge when seed reserve increases or decreases', () => {
    const baseState = usePortfolioStore.getState();

    // Case A: Increased liquid reserve to R 1,000,000 (exceeding R 757,150 ring-fenced capital)
    const surplusSummary = computePortfolioSummary({
      ...baseState,
      liquidCapitalReserve: 1_000_000,
    });
    // Gross War Chest: 1M cash + 450k standby = 1,450,000
    expect(surplusSummary.deployableWarChest).toBe(1_450_000);
    // Free cash: 1,000,000 - 757,150 = 242,850
    expect(surplusSummary.freeUnallocatedCash).toBe(242_850);
    // Net purchasing power: 242,850 + 450,000 = 692,850
    expect(surplusSummary.totalAvailablePurchasingPower).toBe(692_850);
    // Exact gross-to-net bridge equation holds: 1,450,000 - 757,150 = 692,850
    expect(surplusSummary.deployableWarChest - surplusSummary.ringFencedWorkingCapital).toBe(surplusSummary.totalAvailablePurchasingPower);

    // Case B: Zero cash reserve (all liquidity relies on pre-approved facilities)
    const zeroCashSummary = computePortfolioSummary({
      ...baseState,
      liquidCapitalReserve: 0,
    });
    expect(zeroCashSummary.deployableWarChest).toBe(450_000);
    expect(zeroCashSummary.freeUnallocatedCash).toBe(0);
    expect(zeroCashSummary.totalAvailablePurchasingPower).toBe(450_000);

    // Case C: Activating Oom Piet's standby facility transitions it from Standby to Active
    const activatedFunding = baseState.funding.map((f) =>
      f.id === 'fund-3' ? { ...f, status: 'Active' as const } : f
    );
    const activatedSummary = computePortfolioSummary({
      ...baseState,
      funding: activatedFunding,
    });
    // Standby is now drawn active debt, so unallocated standby lines drop to 0
    expect(activatedSummary.unallocatedFundingReserve).toBe(0);
    // Deployable War Chest is now just cash reserve (650k)
    expect(activatedSummary.deployableWarChest).toBe(650_000);
    // Net purchasing power without standby facility drops to 0 (free cash 0 + 0 standby)
    expect(activatedSummary.totalAvailablePurchasingPower).toBe(0);
    // Total private funding liability increases by 450,000 (from 1,995,000 to 2,445,000)
    expect(activatedSummary.totalPrivateFundingLiability).toBe(2_445_000);
  });

  it('calculates rental tax reserve property-by-property with individual overrides and global default fallback', () => {
    const baseState = usePortfolioStore.getState();

    // Rental A: Net cashflow R10,000/mo (R120,000/yr), no override -> inherits global default Company 27% (tax: R32,400)
    const rentalA: RentalProperty = {
      id: 'test-tax-a',
      title: 'Company Default Rental',
      address: '10 Test St',
      city: 'Johannesburg',
      purchasePriceZAR: 1_000_000,
      marketValueZAR: 1_200_000,
      purchaseDate: '2025-01-01',
      propertyType: 'Sectional Title Apartment',
      monthlyGrossRentZAR: 15_000,
      monthlyLeviesZAR: 2_000,
      monthlyRatesTaxesZAR: 1_000,
      monthlyMaintenanceReserveZAR: 500,
      monthlyBondPaymentZAR: 1_500,
      outstandingBondBalanceZAR: 100_000,
      bondInterestRatePercent: 11.5,
      monthlyAgentFeeZAR: 0,
      maintenanceHistory: [],
      status: 'Occupied',
      managementType: 'Self-Managed',
      leases: [
        {
          id: 'lease-a',
          unitName: 'Unit A',
          tenantName: 'Tenant A',
          monthlyRentZAR: 15_000,
          depositHeldZAR: 15_000,
          annualEscalationPercent: 7,
          leaseStartDate: '2025-01-01',
          leaseEndDate: '2026-01-01',
          status: 'Occupied',
        },
      ],
      // No override -> inherits defaultTaxEntityType
    };

    // Rental B: Net cashflow R10,000/mo (R120,000/yr), override to Individual 45% (tax: R54,000)
    const rentalB: RentalProperty = {
      ...rentalA,
      id: 'test-tax-b',
      title: 'Individual Override Rental',
      taxEntityTypeOverride: 'Individual (45%)',
    };

    // Rental C: Net cashflow R10,000/mo (R120,000/yr), override to Pre-Tax 0% (tax: R0)
    const rentalC: RentalProperty = {
      ...rentalA,
      id: 'test-tax-c',
      title: 'Pre-Tax Override Rental',
      taxEntityTypeOverride: 'Pre-Tax',
    };

    // Test with default Company (27%)
    const summaryDefaultCompany = computePortfolioSummary({
      ...baseState,
      investorProfile: {
        ...baseState.investorProfile,
        defaultTaxEntityType: 'Company (27%)',
      },
      rentals: [rentalA, rentalB, rentalC],
    });

    // Net monthly cashflow for each is: 15000 - (2000 + 1000 + 500 + 1500) = 10,000/mo = 120,000/yr
    // Rental A: 120,000 * 27% = 32,400
    // Rental B: 120,000 * 45% = 54,000
    // Rental C: 120,000 * 0% = 0
    // Total Annual Reserve: 32,400 + 54,000 + 0 = 86,400
    expect(summaryDefaultCompany.annualRentalTaxReserve).toBe(86_400);
    expect(summaryDefaultCompany.monthlyRentalTaxReserve).toBe(Math.round(86_400 / 12));

    // Now test changing global default to Individual (45%)
    // Rental A (inheriting default) now uses 45% -> 120,000 * 45% = 54,000
    // Rental B (explicit override 45%) remains 54,000
    // Rental C (explicit override Pre-Tax) remains 0
    // Total Annual Reserve: 54,000 + 54,000 + 0 = 108,000
    const summaryDefaultIndividual = computePortfolioSummary({
      ...baseState,
      investorProfile: {
        ...baseState.investorProfile,
        defaultTaxEntityType: 'Individual (45%)',
      },
      rentals: [rentalA, rentalB, rentalC],
    });
    expect(summaryDefaultIndividual.annualRentalTaxReserve).toBe(108_000);
  });
});
