import { describe, it, expect } from 'vitest';
import {
  calculateFlipFinancials,
  calculateFundingCampaignSummary,
  calculateArchivedFlipFinancials,
  calculateMilestonePhaseTargets,
} from '../flips';
import { FlipProject, BOQItem, FundingSource } from '@/types';

describe('Flips Pure Calculations Engine', () => {
  const sampleBOQ: BOQItem[] = [
    {
      id: 'boq-1',
      category: 'Demolition & Prep',
      itemDescription: 'Rip out carpets and old fittings',
      unit: 'lump sum',
      quantity: 1,
      baselineUnitCostZAR: 40_000,
      baselineTotalZAR: 40_000,
      actualCostZAR: 45_000,
      varianceZAR: 5_000,
      supplierOrContractor: 'Cape Strip Co.',
      status: 'Completed',
      milestonePhase: 'Deposit',
      retentionPercent: 0,
    },
    {
      id: 'boq-2',
      category: 'Plumbing & Wet Works',
      itemDescription: 'Copper piping replacement',
      unit: 'lump sum',
      quantity: 1,
      baselineUnitCostZAR: 80_000,
      baselineTotalZAR: 80_000,
      actualCostZAR: 75_000,
      varianceZAR: -5_000,
      supplierOrContractor: 'Rapid Plumbers',
      status: 'In Progress',
      milestonePhase: 'First Fix / Wet Works',
      retentionPercent: 10,
    },
    {
      id: 'boq-3',
      category: 'Flooring & Tiling',
      itemDescription: 'Italian porcelain tiles (Sponsored)',
      unit: 'm2',
      quantity: 100,
      baselineUnitCostZAR: 600,
      baselineTotalZAR: 60_000,
      actualCostZAR: 30_000,
      actualCashOutflowZAR: 25_000,
      commercialRetailValueZAR: 70_000,
      isSponsoredOrBarter: true,
      varianceZAR: -30_000,
      supplierOrContractor: 'Tile Direct',
      status: 'In Progress',
      milestonePhase: 'Finishes',
      retentionPercent: 10,
    },
    {
      id: 'boq-4',
      category: 'Security & Exterior',
      itemDescription: 'Perimeter retention pool holdback',
      unit: 'lump sum',
      quantity: 1,
      baselineUnitCostZAR: 20_000,
      baselineTotalZAR: 20_000,
      actualCostZAR: 20_000,
      varianceZAR: 0,
      supplierOrContractor: 'Security Solutions',
      status: 'Not Started',
      milestonePhase: 'Retention',
    },
  ];

  const sampleFlip: FlipProject = {
    id: 'flip-test-1',
    title: 'Kloof Street Heritage Redesign',
    address: '74 Kloof St, Gardens',
    city: 'Cape Town',
    purchaseDate: '2026-03-01',
    purchasePriceZAR: 2_000_000,
    acquisitionCostsZAR: 160_000,
    baselineRenovationBudgetZAR: 250_000,
    estimatedDurationMonths: 6,
    monthlyHoldingCostZAR: 15_000,
    targetExitPriceZAR: 3_200_000,
    exitCommissionPercent: 5.75,
    targetCompletionDate: '2026-09-01',
    currentPhase: 'Finishes & Tiling',
    linkedFundingIds: ['fund-1'],
    status: 'Active',
    taxEntityType: 'Company (27%)',
    municipalClearance: {
      sec118ArrearsZAR: 12_000,
      advanceCouncilDepositZAR: 24_000,
      rccStatus: 'Certificate Issued',
    },
    drawSchedule: {
      depositPaid: true,
      firstFixApproved: true,
      finishesApproved: false,
      retentionReleased: false,
    },
    boq: sampleBOQ,
  };

  describe('calculateFlipFinancials', () => {
    it('calculates comprehensive active flip financial metrics accurately', () => {
      const fin = calculateFlipFinancials(sampleFlip);

      // BOQ totals:
      // baseline = 40,000 + 80,000 + 60,000 + 20,000 = 200,000
      expect(fin.totalBOQBaselineZAR).toBe(200_000);
      // actual = 45,000 + 75,000 + 30,000 + 20,000 = 170,000
      expect(fin.totalBOQActualZAR).toBe(170_000);
      expect(fin.totalBOQVarianceZAR).toBe(-30_000); // 170k - 200k
      expect(fin.effectiveRenoCostZAR).toBe(170_000);

      // Holding costs: 6 months * 15,000 = 90,000
      expect(fin.flipHoldingMonths).toBe(6);
      expect(fin.totalHoldingCostZAR).toBe(90_000);

      // Cost basis: 2,000,000 (purchase) + 160,000 (acquisition) + 170,000 (reno) = 2,330,000
      expect(fin.totalCostBasisZAR).toBe(2_330_000);

      // Municipal clearance: 12,000 + 24,000 = 36,000
      expect(fin.sec118ArrearsZAR).toBe(12_000);
      expect(fin.advanceCouncilDepositZAR).toBe(24_000);
      expect(fin.totalMunicipalClearanceOutlayZAR).toBe(36_000);
      expect(fin.rccStatus).toBe('Certificate Issued');
      expect(fin.isRccDisputed).toBe(false);

      // Exit commission: 3,200,000 * 5.75% = 184,000
      expect(fin.exitCommissionZAR).toBe(184_000);

      // All-in cost: 2,330,000 + 90,000 + 36,000 + 184,000 = 2,640,000
      expect(fin.totalAllInCostZAR).toBe(2_640_000);

      // Projected net profit: 3,200,000 - 2,640,000 = 560,000
      expect(fin.projectedNetProfitZAR).toBe(560_000);
      // ROI: (560,000 / 2,640,000) * 100 = ~21.21%
      expect(fin.projectedRoiPercent).toBeCloseTo((560_000 / 2_640_000) * 100, 2);

      // Tax calculations: Company 27%
      expect(fin.effectiveTaxRatePercent).toBe(27);
      expect(fin.estimatedTaxProvisionZAR).toBe(Math.round(560_000 * 0.27)); // 151,200
      expect(fin.netProfitAfterTaxZAR).toBe(560_000 - 151_200); // 408,800
      expect(fin.afterTaxRoiPercent).toBeCloseTo((408_800 / 2_640_000) * 100, 2);
    });

    it('handles sponsor barter dual accounting accurately', () => {
      const fin = calculateFlipFinancials(sampleFlip);

      expect(fin.totalSponsorItemsCount).toBe(1);
      expect(fin.sponsorRetailTotalZAR).toBe(70_000);
      expect(fin.sponsorCashTotalZAR).toBe(25_000);
      expect(fin.totalSponsorSavingsZAR).toBe(45_000); // 70k - 25k
      // Retail BOQ: 45k + 75k + 70k (sponsored retail) + 20k = 210,000
      expect(fin.totalRetailBOQZAR).toBe(210_000);
      expect(fin.totalActualCashBOQZAR).toBe(170_000);
    });

    it('aggregates milestone drawdown allocations and retention pool', () => {
      const fin = calculateFlipFinancials(sampleFlip);

      // Deposit: boq-1 = 45,000
      expect(fin.milestoneDraws.deposit).toBe(45_000);
      // First Fix: boq-2 = 75,000
      expect(fin.milestoneDraws.firstFix).toBe(75_000);
      // Finishes: boq-3 = 30,000
      expect(fin.milestoneDraws.finishes).toBe(30_000);
      // Retention: boq-4 = 20,000
      expect(fin.milestoneDraws.retention).toBe(20_000);

      // Total retention held:
      // boq-2 (10% of 75k = 7,500) + boq-3 (10% of 30k = 3,000) + boq-4 (retention phase = 20,000) = 30,500
      expect(fin.totalRetentionHeldZAR).toBe(30_500);
    });

    it('falls back to baselineRenovationBudgetZAR when BOQ is empty', () => {
      const flipNoBoq: FlipProject = {
        ...sampleFlip,
        boq: [],
        baselineRenovationBudgetZAR: 300_000,
      };
      const fin = calculateFlipFinancials(flipNoBoq);

      expect(fin.totalBOQActualZAR).toBe(0);
      expect(fin.effectiveRenoCostZAR).toBe(300_000);
      expect(fin.totalCostBasisZAR).toBe(2_000_000 + 160_000 + 300_000);
    });

    it('applies Individual 45% and Pre-Tax 0% tax modes', () => {
      const individualFlip: FlipProject = {
        ...sampleFlip,
        taxEntityType: 'Individual (45%)',
      };
      const finInd = calculateFlipFinancials(individualFlip);
      expect(finInd.effectiveTaxRatePercent).toBe(45);
      expect(finInd.estimatedTaxProvisionZAR).toBe(Math.round(560_000 * 0.45));

      const preTaxFlip: FlipProject = {
        ...sampleFlip,
        taxEntityType: 'Pre-Tax',
      };
      const finPre = calculateFlipFinancials(preTaxFlip);
      expect(finPre.effectiveTaxRatePercent).toBe(0);
      expect(finPre.estimatedTaxProvisionZAR).toBe(0);
      expect(finPre.netProfitAfterTaxZAR).toBe(560_000);
    });

    it('floors tax provision to 0 when flip is projected at a net loss', () => {
      const lossFlip: FlipProject = {
        ...sampleFlip,
        targetExitPriceZAR: 2_000_000, // Below totalAllInCostZAR (2.64m)
      };
      const fin = calculateFlipFinancials(lossFlip);
      expect(fin.projectedNetProfitZAR).toBeLessThan(0);
      expect(fin.estimatedTaxProvisionZAR).toBe(0);
    });

    it('detects disputed RCC status correctly', () => {
      const disputedFlip: FlipProject = {
        ...sampleFlip,
        municipalClearance: {
          sec118ArrearsZAR: 50_000,
          advanceCouncilDepositZAR: 20_000,
          rccStatus: 'Disputed',
        },
      };
      const fin = calculateFlipFinancials(disputedFlip);
      expect(fin.isRccDisputed).toBe(true);
      expect(fin.rccStatus).toBe('Disputed');
    });

    it('handles undefined or null flip input returning zero-state', () => {
      const finNull = calculateFlipFinancials(null);
      expect(finNull.totalCostBasisZAR).toBe(0);
      expect(finNull.totalAllInCostZAR).toBe(0);
      expect(finNull.projectedNetProfitZAR).toBe(0);
      expect(finNull.milestoneDraws.deposit).toBe(0);
    });
  });

  describe('calculateFundingCampaignSummary', () => {
    const linkedFunding: FundingSource[] = [
      {
        id: 'fund-1',
        lenderName: 'Meyer Trust',
        entityOrContact: 'Johan Meyer',
        emailPhone: 'johan@meyer.co.za',
        fundingType: 'Private Lender',
        capitalAmountZAR: 1_200_000,
        disbursementDate: '2026-03-01',
        maturityDate: '2026-09-01',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 14.0,
        paymentSchedule: 'Monthly Interest',
        totalRepaidZAR: 0,
        status: 'Active',
      },
      {
        id: 'fund-2',
        lenderName: 'Syndicate Tranche B',
        entityOrContact: 'Kramer Capital',
        emailPhone: 'david@kramer.co.za',
        fundingType: 'Private Lender',
        capitalAmountZAR: 400_000,
        disbursementDate: '2026-03-15',
        maturityDate: '2026-09-15',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 15.0,
        paymentSchedule: 'At Exit (Maturity)',
        totalRepaidZAR: 0,
        status: 'Active',
      },
    ];

    it('computes funding progress using explicit flip overrides', () => {
      const flipWithFunding: FlipProject = {
        ...sampleFlip,
        fundingRequiredZAR: 2_000_000,
        capitalRaisedZAR: 1_600_000,
      };

      const summary = calculateFundingCampaignSummary(flipWithFunding, linkedFunding, 2_330_000);
      expect(summary.totalCapitalSecuredZAR).toBe(1_600_000); // 1.2m + 400k
      expect(summary.fundingRequiredZAR).toBe(2_000_000);
      expect(summary.capitalRaisedZAR).toBe(1_600_000);
      expect(summary.capitalRemainingZAR).toBe(400_000);
      expect(summary.fundingProgressPercent).toBe(80);
      expect(summary.isFullyFunded).toBe(false);
    });

    it('defaults required funding to 70% of cost basis when not explicitly specified', () => {
      const flipDefaultFunding: FlipProject = {
        ...sampleFlip,
        fundingRequiredZAR: undefined,
        capitalRaisedZAR: undefined,
      };
      const totalCostBasis = 2_000_000;
      // 70% of 2,000,000 = 1,400,000
      const summary = calculateFundingCampaignSummary(flipDefaultFunding, linkedFunding, totalCostBasis);

      expect(summary.fundingRequiredZAR).toBe(1_400_000);
      expect(summary.capitalRaisedZAR).toBe(1_600_000); // from linkedFunding (1.2m + 400k)
      expect(summary.capitalRemainingZAR).toBe(0);
      expect(summary.fundingProgressPercent).toBe(100);
      expect(summary.isFullyFunded).toBe(true);
    });

    it('handles 0 funding required without division by zero', () => {
      const flipZeroFunding: FlipProject = {
        ...sampleFlip,
        fundingRequiredZAR: 0,
        capitalRaisedZAR: 0,
      };
      const summary = calculateFundingCampaignSummary(flipZeroFunding, [], 0);
      expect(summary.fundingProgressPercent).toBe(0);
      expect(summary.isFullyFunded).toBe(true);
    });
  });

  describe('calculateArchivedFlipFinancials', () => {
    it('calculates realized sale metrics for a standard Sold flip', () => {
      const soldFlip: FlipProject = {
        ...sampleFlip,
        status: 'Completed',
        exitStrategy: 'Sold',
        actualSalePriceZAR: 3_300_000,
        exitCommissionPercent: 5.0,
      };

      const arch = calculateArchivedFlipFinancials(soldFlip);

      // BOQ actual = 170,000
      // Cost basis = 2,000,000 + 160,000 + 170,000 = 2,330,000
      // Holding = 6 * 15,000 = 90,000
      // Sec118 = 12,000 + 24,000 = 36,000
      // Exit commission = 3,300,000 * 5% = 165,000
      // Full cost basis = 2,330,000 + 90,000 + 36,000 + 165,000 = 2,621,000
      expect(arch.fullCostBasisZAR).toBe(2_621_000);
      expect(arch.realizedSalePriceZAR).toBe(3_300_000);
      expect(arch.realizedNetProfitZAR).toBe(3_300_000 - 2_621_000); // 679,000
      expect(arch.realizedRoiPercent).toBeCloseTo((679_000 / 2_621_000) * 100, 2);
    });

    it('calculates BRRRR converted flip metrics with 0 exit commission and equity created', () => {
      const brrrrFlip: FlipProject = {
        ...sampleFlip,
        status: 'Completed',
        exitStrategy: 'BRRRR',
        targetExitPriceZAR: 3_500_000, // Appraised market valuation
        actualSalePriceZAR: undefined,
      };

      const arch = calculateArchivedFlipFinancials(brrrrFlip);

      // Full cost basis with 0 commission for BRRRR:
      // Cost basis (2,330,000) + Holding (90,000) + Sec118 (36,000) + 0 commission = 2,456,000
      expect(arch.fullCostBasisZAR).toBe(2_456_000);
      expect(arch.brrrrTargetValuationZAR).toBe(3_500_000);
      // Equity created: 3,500,000 - 2,456,000 = 1,044,000
      expect(arch.brrrrEquityCreatedZAR).toBe(1_044_000);
    });

    it('handles null or undefined flip safely in calculateArchivedFlipFinancials', () => {
      const archNull = calculateArchivedFlipFinancials(null);
      expect(archNull.fullCostBasisZAR).toBe(0);
      expect(archNull.realizedSalePriceZAR).toBe(0);
      expect(archNull.realizedNetProfitZAR).toBe(0);
      expect(archNull.realizedRoiPercent).toBe(0);
    });
  });

  describe('calculateMilestonePhaseTargets', () => {
    it('computes 20%/30%/30%/20% milestone drawdown gates from baseline budget', () => {
      // 250,000 budget:
      // Deposit (20%): 50,000
      // First Fix (30%): 75,000
      // Finishes (30%): 75,000
      // Retention (20%): 50,000
      const targets = calculateMilestonePhaseTargets(250_000);
      expect(targets.deposit).toBe(50_000);
      expect(targets.firstFix).toBe(75_000);
      expect(targets.finishes).toBe(75_000);
      expect(targets.retention).toBe(50_000);
    });

    it('handles 0 or negative baseline budget safely', () => {
      const targetsZero = calculateMilestonePhaseTargets(0);
      expect(targetsZero.deposit).toBe(0);
      expect(targetsZero.firstFix).toBe(0);
      expect(targetsZero.finishes).toBe(0);
      expect(targetsZero.retention).toBe(0);

      const targetsNeg = calculateMilestonePhaseTargets(-100_000);
      expect(targetsNeg.deposit).toBe(0);
      expect(targetsNeg.firstFix).toBe(0);
      expect(targetsNeg.finishes).toBe(0);
      expect(targetsNeg.retention).toBe(0);
    });

    it('integrates milestoneTargets into calculateFlipFinancials', () => {
      const fin = calculateFlipFinancials(sampleFlip);
      expect(fin.milestoneTargets).toBeDefined();
      expect(fin.milestoneTargets.deposit).toBe(Math.round(sampleFlip.baselineRenovationBudgetZAR * 0.20));
      expect(fin.milestoneTargets.firstFix).toBe(Math.round(sampleFlip.baselineRenovationBudgetZAR * 0.30));
      expect(fin.milestoneTargets.finishes).toBe(Math.round(sampleFlip.baselineRenovationBudgetZAR * 0.30));
      expect(fin.milestoneTargets.retention).toBe(Math.round(sampleFlip.baselineRenovationBudgetZAR * 0.20));
    });

    it('handles undefined linked funding in calculateFundingCampaignSummary safely', () => {
      const summary = calculateFundingCampaignSummary(sampleFlip, undefined as any, 2_000_000);
      expect(summary.totalCapitalSecuredZAR).toBe(0);
      expect(summary.fundingRequiredZAR).toBeGreaterThan(0);
    });
  });
});
