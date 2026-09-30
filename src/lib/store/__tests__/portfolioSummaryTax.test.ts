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
});
