import assert from 'node:assert';
import { computePortfolioSummary, usePortfolioStore } from '../usePortfolioStore';
import { FlipProject, FundingSource } from '@/types';

console.log('--- Running Portfolio Summary & Tax Integration Tests ---');

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

// Test 1: ringFencedWorkingCapital calculation
{
  const summary = computePortfolioSummary({
    rentals: [],
    flips: [sampleFlip1, sampleFlip2],
    funding: [],
    liquidCapitalReserve: 1_000_000,
  });

  assert.strictEqual(summary.ringFencedWorkingCapital, 345_000, 'ringFencedWorkingCapital should equal 345,000');
  assert.strictEqual(summary.freeUnallocatedCash, 655_000, 'freeUnallocatedCash should equal 655,000');
  console.log('✓ Test 1 Passed: ringFencedWorkingCapital and freeUnallocatedCash calculated accurately.');
}

// Test 2: Negative cash clamped to 0
{
  const summary = computePortfolioSummary({
    rentals: [],
    flips: [sampleFlip1, sampleFlip2],
    funding: [],
    liquidCapitalReserve: 200_000,
  });

  assert.strictEqual(summary.ringFencedWorkingCapital, 345_000);
  assert.strictEqual(summary.freeUnallocatedCash, 0);
  console.log('✓ Test 2 Passed: freeUnallocatedCash clamped at 0 when reserve < ring-fenced.');
}

// Test 3: Released retention
{
  const flipReleased: FlipProject = {
    ...sampleFlip1,
    drawSchedule: {
      depositPaid: true,
      firstFixApproved: true,
      finishesApproved: true,
      retentionReleased: true,
    },
  };

  const summary = computePortfolioSummary({
    rentals: [],
    flips: [flipReleased],
    funding: [],
    liquidCapitalReserve: 1_000_000,
  });

  assert.strictEqual(summary.ringFencedWorkingCapital, 210_000);
  assert.strictEqual(summary.freeUnallocatedCash, 790_000);
  console.log('✓ Test 3 Passed: retention pool released when retentionReleased is true.');
}

// Test 4: 27% SARS Corporate Tax
{
  const summary = computePortfolioSummary({
    rentals: [],
    flips: [sampleFlip1],
    funding: [],
    liquidCapitalReserve: 500_000,
  });

  assert.strictEqual(summary.totalGrossProjectedFlipProfits, 890_000);
  assert.strictEqual(summary.totalSarsProvisionalTaxReserve, 240_300);
  assert.strictEqual(summary.totalNetProjectedFlipProfits, 649_700);
  assert.strictEqual(summary.totalProjectedFlipProfits, 890_000);
  console.log('✓ Test 4 Passed: 27% SARS corporate provisional tax computed accurately.');
}

// Test 5: 45% Individual Tax
{
  const indFlip: FlipProject = {
    ...sampleFlip1,
    taxEntityType: 'Individual (45%)',
  };

  const summary = computePortfolioSummary({
    rentals: [],
    flips: [indFlip],
    funding: [],
    liquidCapitalReserve: 500_000,
  });

  assert.strictEqual(summary.totalGrossProjectedFlipProfits, 890_000);
  assert.strictEqual(summary.totalSarsProvisionalTaxReserve, 400_500);
  assert.strictEqual(summary.totalNetProjectedFlipProfits, 489_500);
  console.log('✓ Test 5 Passed: 45% Individual tax rate applied correctly.');
}

// Test 6: Loss-making deal doesn't accrue tax
{
  const lossFlip: FlipProject = {
    ...sampleFlip1,
    targetExitPriceZAR: 2_000_000,
  };

  const summary = computePortfolioSummary({
    rentals: [],
    flips: [lossFlip],
    funding: [],
    liquidCapitalReserve: 500_000,
  });

  assert.strictEqual(summary.totalGrossProjectedFlipProfits, -610_000);
  assert.strictEqual(summary.totalSarsProvisionalTaxReserve, 0);
  assert.strictEqual(summary.totalNetProjectedFlipProfits, -610_000);
  console.log('✓ Test 6 Passed: Loss-making deal has zero tax reserve.');
}

// Test 7: syncFundingWithDealDelay store action
{
  const testFunding: FundingSource = {
    id: 'test-fund-sync-action',
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

  usePortfolioStore.getState().syncFundingWithDealDelay(
    'test-fund-sync-action',
    60,
    'CoJ Section 118 clearance dispute'
  );

  const updated = usePortfolioStore.getState().funding.find((f) => f.id === 'test-fund-sync-action');
  assert.ok(updated, 'Funding should exist');
  assert.strictEqual(updated?.originalMaturityDate, '2026-09-01');
  assert.strictEqual(updated?.delayExtensionDays, 60);
  assert.ok(updated?.delayNotes?.includes('CoJ Section 118 clearance dispute'));
  assert.strictEqual(updated?.maturityDate, '2026-10-31');

  // Second sync: cumulative +30 days (total 90 days)
  usePortfolioStore.getState().syncFundingWithDealDelay(
    'test-fund-sync-action',
    30,
    'Deeds Office lodgement query'
  );

  const updated2 = usePortfolioStore.getState().funding.find((f) => f.id === 'test-fund-sync-action');
  assert.strictEqual(updated2?.originalMaturityDate, '2026-09-01');
  assert.strictEqual(updated2?.delayExtensionDays, 90);
  assert.strictEqual(updated2?.maturityDate, '2026-11-30');
  assert.ok(updated2?.delayNotes?.includes('Deeds Office lodgement query'));

  usePortfolioStore.getState().deleteFunding('test-fund-sync-action');
  console.log('✓ Test 7 Passed: syncFundingWithDealDelay advances maturity and records cumulative days.');
}

console.log('\n--- ALL 7 TESTS PASSED SUCCESSFULLY! ---');
