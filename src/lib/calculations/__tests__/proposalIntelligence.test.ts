import { describe, it, expect } from 'vitest';
import {
  recommendOptimalFundingStructure,
  calculateCapitalStackSplit,
  calculateProposalStressScenarios,
  synthesizeStrengthsAndMitigants,
} from '@/lib/calculations/proposalIntelligence';
import { ReturnTermType } from '@/types';

const CANONICAL_RETURN_TYPES: ReturnTermType[] = [
  'Fixed Interest',
  'Monthly Coupon',
  'Bullet Repayment',
  'Equity Profit Split',
];

describe('proposalIntelligence — Guardrail #3 (Canonical ReturnTermType & Exit Friction Parity)', () => {
  it('Guardrail #3: recommendOptimalFundingStructure strictly outputs canonical ReturnTermType strings across all strategies and presets', () => {
    const strategies = ['Flip', 'Rental', 'BRRRR'] as const;

    for (const strategy of strategies) {
      const rec = recommendOptimalFundingStructure({
        strategy,
        totalProjectCostZAR: 1_500_000,
        targetExitPriceZAR: 2_100_000,
        projectedNetProfitZAR: 350_000,
        holdingDurationMonths: 6,
        monthlyRentZAR: strategy === 'Rental' ? 18_000 : 0,
        monthlyBurnRateZAR: 6_000,
        seniorDebtZAR: 0,
        isEviction: false,
      });

      expect(CANONICAL_RETURN_TYPES).toContain(rec.recommended.returnStructure);
      expect(rec.presets.length).toBeGreaterThanOrEqual(3);
      for (const preset of rec.presets) {
        expect(CANONICAL_RETURN_TYPES).toContain(preset.returnStructure);
      }
    }
  });

  it('Guardrail #3: calculateProposalStressScenarios computes exact Principal Break-Even Exit Price accounting for exit commission rate and exitLegalCostZAR', () => {
    const capitalRequestedZAR = 1_000_000;
    const seniorDebtZAR = 200_000;
    const exitLegalCostZAR = 5_200; // bond cancellation fee
    const exitCommissionPercent = 5.75;
    const lenderReturnZAR = 75_000;

    const stress = calculateProposalStressScenarios({
      targetExitPriceZAR: 1_850_000,
      totalProjectCostZAR: 1_450_000,
      capitalRequestedZAR,
      lenderReturnZAR,
      exitCommissionPercent,
      exitLegalCostZAR,
      monthlyBurnRateZAR: 9_500,
      seniorDebtZAR,
      fundingOfferType: 'Bullet Repayment',
      offeredRatePercent: 15,
    });

    // Formula: (Capital Requested + Senior Debt + Exit Legal Fees) / (1 - Exit Commission Rate)
    const expectedPrincipalBreakEven = Math.ceil(
      (capitalRequestedZAR + seniorDebtZAR + exitLegalCostZAR) /
        (1 - exitCommissionPercent / 100)
    );

    expect(stress.principalBreakEvenExitZAR).toBe(expectedPrincipalBreakEven);
    expect(stress.fullPayoutBreakEvenExitZAR).toBeGreaterThan(stress.principalBreakEvenExitZAR);
    expect(stress.scenarios).toHaveLength(4);
  });

  it('flags partial return or principal shortfall when stressed exit valuation drops below break-even thresholds', () => {
    const stress = calculateProposalStressScenarios({
      targetExitPriceZAR: 1_250_000,
      totalProjectCostZAR: 1_200_000,
      capitalRequestedZAR: 1_050_000, // High leverage
      lenderReturnZAR: 112_000,
      exitCommissionPercent: 5.75,
      exitLegalCostZAR: 5_200,
      monthlyBurnRateZAR: 8_000,
      seniorDebtZAR: 0,
      fundingOfferType: 'Bullet Repayment',
      offeredRatePercent: 16,
    });

    const severeRow = stress.scenarios.find((s) => s.id === 'severe_downside');
    expect(severeRow).toBeDefined();
    expect(severeRow!.coverageStatus).toBe('shortfall');
    expect(severeRow!.securityBadgeLabel).toContain('Principal Exposed');
  });

  it('computes Lender vs. Sponsor capital stack split and warns when monthly coupon exceeds rental cashflow', () => {
    const split = calculateCapitalStackSplit({
      strategy: 'Rental',
      capitalRequestedZAR: 1_200_000,
      fundingOfferType: 'Monthly Coupon',
      offeredRatePercent: 15, // R 15,000/mo coupon
      totalProjectCostZAR: 1_500_000,
      targetExitPriceZAR: 1_800_000,
      projectedNetProfitZAR: 300_000,
      holdingDurationMonths: 12,
      netMonthlyCashflowBeforeLenderZAR: 9_500, // Less than R 15,000/mo coupon
      seniorDebtZAR: 0,
    });

    expect(split.monthlyLenderServiceZAR).toBe(15_000);
    expect(split.sponsorNetMonthlyCashflowZAR).toBe(-5_500);
    expect(split.warnings.length).toBeGreaterThan(0);
    expect(split.healthBand).toBe('deficit');
  });

  it('synthesizes rule-based underwriting strengths and risk mitigants for Auction, Section 118, and PIE Act deals', () => {
    const capitalStack = calculateCapitalStackSplit({
      strategy: 'Flip',
      capitalRequestedZAR: 875_000,
      fundingOfferType: 'Bullet Repayment',
      offeredRatePercent: 14.5,
      totalProjectCostZAR: 1_250_000,
      targetExitPriceZAR: 1_650_000,
      projectedNetProfitZAR: 400_000,
      holdingDurationMonths: 6,
      netMonthlyCashflowBeforeLenderZAR: -7_500,
    });

    const stressMatrix = calculateProposalStressScenarios({
      targetExitPriceZAR: 1_650_000,
      totalProjectCostZAR: 1_250_000,
      capitalRequestedZAR: 875_000,
      lenderReturnZAR: capitalStack.lenderReturnZAR,
      exitCommissionPercent: 5.75,
      exitLegalCostZAR: 5_200,
      monthlyBurnRateZAR: 7_500,
    });

    const synthesis = synthesizeStrengthsAndMitigants({
      deal: {
        type: 'flip',
        city: 'Sandton',
        province: 'Gauteng',
        source: 'High-Street Auction',
        purchasePrice: 850_000,
        openMarketValue: 1_350_000,
        builtInEquity: 500_000,
        builtInEquityPercent: 37.0,
        renovationBudget: 180_000,
        targetExitPrice: 1_650_000,
        monthlyRent: 0,
        auctioneerCommission: 85_000,
        municipalArrears: 45_000,
        occupantRisk: {
          occupancyStatus: 'unlawful_occupant',
          evictionRequired: true,
          evictionJurisdiction: 'magistrates_court',
          estimatedEvictionDelayDays: 90,
          budgetedLegalEvictionCostZAR: 35_000,
          monthlySiteSecurityZAR: 5_000,
          totalEvictionCarryingCostZAR: 50_000,
        },
      },
      strategy: 'Flip',
      capitalStack,
      stressMatrix,
    });

    expect(synthesis.strengths.length).toBeGreaterThanOrEqual(2);
    expect(synthesis.riskMitigants.length).toBeGreaterThanOrEqual(2);
    expect(synthesis.strengths.some((s) => s.id === 'built-in-equity')).toBe(true);
    expect(synthesis.riskMitigants.some((m) => m.id === 'pie-act-eviction')).toBe(true);
    expect(synthesis.riskMitigants.some((m) => m.id === 'auction-municipal-clearance')).toBe(true);
  });

  it('synthesizes dynamic bankability strengths and mitigants for development projects', () => {
    const capitalStack = calculateCapitalStackSplit({
      strategy: 'Development',
      capitalRequestedZAR: 2_500_000,
      fundingOfferType: 'Bullet Repayment',
      offeredRatePercent: 16.0,
      totalProjectCostZAR: 6_500_000,
      targetExitPriceZAR: 9_200_000,
      projectedNetProfitZAR: 2_700_000,
      holdingDurationMonths: 14,
      netMonthlyCashflowBeforeLenderZAR: -25_000,
    });

    const stressMatrix = calculateProposalStressScenarios({
      targetExitPriceZAR: 9_200_000,
      totalProjectCostZAR: 6_500_000,
      capitalRequestedZAR: 2_500_000,
      lenderReturnZAR: capitalStack.lenderReturnZAR,
      exitCommissionPercent: 5.0,
      exitLegalCostZAR: 5_200,
      monthlyBurnRateZAR: 25_000,
    });

    const synthesis = synthesizeStrengthsAndMitigants({
      deal: {
        type: 'development',
        city: 'Johannesburg',
        province: 'Gauteng',
        purchasePrice: 1_800_000,
        openMarketValue: 9_200_000,
        builtInEquity: 0,
        builtInEquityPercent: 0,
        renovationBudget: 0,
        targetExitPrice: 9_200_000,
        monthlyRent: 0,
        developmentFinancials: {
          tdcZAR: 6_500_000,
          tdcPerSqmZAR: 13_500,
          gdvInclVatZAR: 9_200_000,
          totalUnitsCount: 8,
          pocPercent: 41.5,
          netProfitBeforeTaxZAR: 2_700_000,
          isDeferredLandPaymentLAA: true,
          seniorJvPartnerName: 'Apex Construction JV',
          bankReadiness: {
            paperRights: { met: true, statusLabel: 'Approved', details: 'SPLUMA & Plans Approved' },
            qsAndGeotech: { met: true, statusLabel: 'Validated', details: 'NHBRC & QS engaged' },
            preSalesGate: { met: true, statusLabel: 'Cleared', details: '60% pre-sold' },
            deliveryTrackRecord: { met: true, statusLabel: 'JV Partnered', partnerOrEntity: 'Apex Construction JV', isJvPartnerBacked: true },
            overallBankable: true,
          },
        },
      },
      strategy: 'Development',
      capitalStack,
      stressMatrix,
    });

    expect(synthesis.strengths.some((s) => s.id === 'development-bulk-value-creation')).toBe(true);
    expect(synthesis.strengths.some((s) => s.id === 'shovel-ready-paper-rights')).toBe(true);
    expect(synthesis.strengths.some((s) => s.id === 'laa-land-jv-structure')).toBe(true);
    expect(synthesis.riskMitigants.some((m) => m.id === 'senior-jv-co-developer')).toBe(true);
  });

  it('reconciles VAT-stripped Base Case net profit for VAT-registered developments and avoids double-deducting capitalized carrying interest', () => {
    // dev-1 numbers: GDV = 8,390,000; TDC = 7,061,813; Input VAT Credit = 693,913; Capital = 4,200,000
    const stress = calculateProposalStressScenarios({
      targetExitPriceZAR: 8_390_000,
      totalProjectCostZAR: 7_061_813,
      capitalRequestedZAR: 4_200_000,
      lenderReturnZAR: 643_125,
      exitCommissionPercent: 5.0,
      exitLegalCostZAR: 0,
      monthlyBurnRateZAR: 16_500,
      isDevelopment: true,
      isVatRegisteredDeveloper: true,
      estimatedInputVatCreditZAR: 693_913,
    });

    const baseScenario = stress.scenarios.find((s) => s.id === 'base');
    expect(baseScenario).toBeDefined();
    // Base Case Net Deal Profit = (8,390,000 / 1.15) + 693,913 - 7,061,813 = R 927,752
    expect(baseScenario!.projectedNetProfitZAR).toBe(927_752);

    // Capital stack split for Development strategy does not double-deduct facility carrying interest
    const split = calculateCapitalStackSplit({
      strategy: 'Development',
      capitalRequestedZAR: 4_200_000,
      fundingOfferType: 'Monthly Coupon',
      offeredRatePercent: 12.25,
      totalProjectCostZAR: 7_061_813,
      targetExitPriceZAR: 8_390_000,
      projectedNetProfitZAR: 927_752,
      holdingDurationMonths: 15,
      netMonthlyCashflowBeforeLenderZAR: 0,
    });

    expect(split.sponsorNetProfitFlipZAR).toBe(927_752);
  });
});
