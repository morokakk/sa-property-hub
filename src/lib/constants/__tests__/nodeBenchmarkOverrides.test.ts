import { describe, it, expect } from 'vitest';
import {
  ALL_INVESTMENT_NODES,
  findInvestmentNode,
  getEffectiveNodeBenchmarks,
  evaluateNodeBenchmarks,
} from '../investmentNodes';
import { CustomNodeBenchmarkOverride } from '@/types';
import { mapProfile } from '@/lib/db/migrateToCloud';
import { unmapProfile } from '@/lib/db/hydrateFromCloud';
import { INITIAL_INVESTOR_PROFILE } from '@/lib/store/initialData';

describe('Regional Node Market Benchmarks & Custom Overrides', () => {
  const sandtonNode = findInvestmentNode('sandton_bryanston')!;

  it('resolves default industry baselines when no overrides exist', () => {
    const effective = getEffectiveNodeBenchmarks(sandtonNode);
    expect(effective).not.toBeNull();
    expect(effective?.isOverridden).toBe(false);
    expect(effective?.provenance).toBe('indicative_unverified');
    expect(effective?.grossYieldRangePercent).toEqual(sandtonNode.benchmarks.grossYieldRangePercent);
    expect(effective?.typicalVacancyPercent).toBe(sandtonNode.benchmarks.typicalVacancyPercent);
    expect(effective?.typicalCapitalGrowthPercent).toBe(sandtonNode.benchmarks.typicalCapitalGrowthPercent);
    expect(effective?.pricePerSqmRangeZAR).toEqual(sandtonNode.benchmarks.pricePerSqmRangeZAR);
    expect(effective?.typicalMonthlyRatesPercentOfVal).toBe(sandtonNode.benchmarks.typicalMonthlyRatesPercentOfVal);
  });

  it('resolves canonical node identifier whether called with node object, ID, or corridor name', () => {
    const byNode = getEffectiveNodeBenchmarks(sandtonNode);
    const byId = getEffectiveNodeBenchmarks('sandton_bryanston');
    const byName = getEffectiveNodeBenchmarks('Sandton & Bryanston');

    expect(byNode).toEqual(byId);
    expect(byId).toEqual(byName);
  });

  it('merges user-modified overrides and flips provenance to custom_verified (Guardrail #3)', () => {
    const overrides: Record<string, CustomNodeBenchmarkOverride> = {
      sandton_bryanston: {
        grossYieldRangePercent: [9.0, 12.0],
        typicalVacancyPercent: 4.5,
        typicalCapitalGrowthPercent: 6.5,
        pricePerSqmRangeZAR: [18000, 30000],
        source: 'TPN Q3 2026',
        asOfDate: '2026-10',
      },
    };

    const effective = getEffectiveNodeBenchmarks('Sandton & Bryanston', overrides);
    expect(effective).not.toBeNull();
    expect(effective?.isOverridden).toBe(true);
    expect(effective?.provenance).toBe('custom_verified');
    expect(effective?.source).toBe('TPN Q3 2026');
    expect(effective?.asOfDate).toBe('2026-10');
    expect(effective?.grossYieldRangePercent).toEqual([9.0, 12.0]);
    expect(effective?.typicalVacancyPercent).toBe(4.5);
    expect(effective?.typicalCapitalGrowthPercent).toBe(6.5);
    expect(effective?.pricePerSqmRangeZAR).toEqual([18000, 30000]);
    // Non-overridden rates remain at baseline
    expect(effective?.typicalMonthlyRatesPercentOfVal).toBe(sandtonNode.benchmarks.typicalMonthlyRatesPercentOfVal);
  });

  it('enforces round-trip precision between centsInRandAnnual and typicalMonthlyRatesPercentOfVal (Guardrail #2)', () => {
    // 0.85 cents in the Rand -> 0.85 / 12 = 0.070833% per month
    const customRates: Record<string, CustomNodeBenchmarkOverride> = {
      sandton_bryanston: {
        centsInRandAnnual: 0.85,
        typicalMonthlyRatesPercentOfVal: Number((0.85 / 12).toFixed(6)), // 0.070833
      },
    };

    const effective = getEffectiveNodeBenchmarks('sandton_bryanston', customRates);
    expect(effective).not.toBeNull();
    expect(effective?.typicalMonthlyRatesPercentOfVal).toBe(0.070833);
    // When reading back or exporting, exact 0.85 is preserved rather than floating point artifact (0.849999...)
    expect(effective?.centsInRandAnnual).toBe(0.85);

    // Default baseline statutory rates check (CoJ official tariff = 0.9889c)
    const baselineEffective = getEffectiveNodeBenchmarks('jhb_cbd_maboneng');
    expect(baselineEffective?.centsInRandAnnual).toBe(0.9889);
    expect(baselineEffective?.source).toBe('CoJ 2026/27 Tariff + TPN/PayProp Inner-City Norm');
  });

  it('does not flip provenance to custom_verified if override entry is empty (Guardrail #3)', () => {
    const emptyOverride: Record<string, CustomNodeBenchmarkOverride> = {
      sandton_bryanston: {},
    };

    const effective = getEffectiveNodeBenchmarks('sandton_bryanston', emptyOverride);
    expect(effective?.isOverridden).toBe(false);
    expect(effective?.provenance).toBe('indicative_unverified');
  });

  it('evaluates underwriting against customized node benchmarks in evaluateNodeBenchmarks', () => {
    const overrides: Record<string, CustomNodeBenchmarkOverride> = {
      sandton_bryanston: {
        grossYieldRangePercent: [12.0, 15.0], // Raised hurdle
        typicalVacancyPercent: 3.0,
      },
    };

    // User yield is 10.0%. Baseline ceiling is 11.5% (aligned). But with override min=12.0%, 10.0% is conservative!
    const audit = evaluateNodeBenchmarks(
      sandtonNode,
      {
        strategy: 'Rental',
        grossYield: 10.0,
        vacancyRatePercent: 3.0,
      },
      overrides
    );

    expect(audit).not.toBeNull();
    expect(audit?.effectiveBenchmarks.isOverridden).toBe(true);
    expect(audit?.effectiveBenchmarks.provenance).toBe('custom_verified');

    const yieldItem = audit?.items.find((i) => i.metric === 'grossYield');
    expect(yieldItem?.status).toBe('conservative');
    expect(yieldItem?.benchmarkLabel).toBe('12–15%');

    const vacItem = audit?.items.find((i) => i.metric === 'vacancyRate');
    expect(vacItem?.status).toBe('aligned');
    expect(vacItem?.benchmarkLabel).toBe('3%');
  });

  it('guarantees round-trip database serialization parity in mapProfile and unmapProfile (Guardrail #1)', () => {
    const customNodeBenchmarks: Record<string, CustomNodeBenchmarkOverride> = {
      stellenbosch: {
        grossYieldRangePercent: [7.5, 10.5],
        typicalVacancyPercent: 3.5,
        centsInRandAnnual: 0.72,
        typicalMonthlyRatesPercentOfVal: 0.06,
        source: 'PropData Cape 2026',
        asOfDate: '2026-09',
      },
    };

    const profile = {
      ...INITIAL_INVESTOR_PROFILE,
      customNodeBenchmarks,
    };

    const row = mapProfile(profile, {}, 'test-user-id', 'test@example.com');
    expect(row.custom_node_benchmarks).toEqual(customNodeBenchmarks);

    const { profile: hydrated } = unmapProfile(row as any);
    expect(hydrated?.customNodeBenchmarks).toEqual(customNodeBenchmarks);
  });
});
