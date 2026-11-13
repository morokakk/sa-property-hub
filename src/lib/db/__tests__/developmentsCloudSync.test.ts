import { describe, it, expect } from 'vitest';
import {
  mapDevelopments,
  isStockDemoState,
} from '../migrateToCloud';
import {
  unmapDevelopments,
} from '../hydrateFromCloud';
import {
  mergePortfolioState,
  isDemoDevelopment,
  DEMO_DEV_IDS,
} from '../mergePortfolioState';
import {
  INITIAL_DEVELOPMENTS,
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_FUNDING,
  INITIAL_OPPORTUNITIES,
  INITIAL_TASKS,
  INITIAL_SUPPLIERS,
  INITIAL_INVESTOR_PROFILE,
} from '@/lib/store/initialData';
import type { DevelopmentProject } from '@/types';

describe('Developments Cloud Sync Suite', () => {
  const mockUserId = 'usr-test-dev-sync-123';

  it('identifies demo development IDs and prefix helpers', () => {
    expect(DEMO_DEV_IDS.has('dev-1')).toBe(true);
    expect(DEMO_DEV_IDS.has('dev-2')).toBe(true);
    expect(isDemoDevelopment('dev-1')).toBe(true);
    expect(isDemoDevelopment('dev-2')).toBe(true);
    expect(isDemoDevelopment('demo-dev-custom')).toBe(true);
    expect(isDemoDevelopment('custom-dev-999')).toBe(false);
    expect(isDemoDevelopment(null)).toBe(false);
  });

  it('correctly maps DevelopmentProject domain models to DB rows via mapDevelopments', () => {
    const mapped = mapDevelopments(INITIAL_DEVELOPMENTS, mockUserId);
    expect(mapped.length).toBe(INITIAL_DEVELOPMENTS.length);

    const dev1 = mapped[0];
    expect(dev1.user_id).toBe(mockUserId);
    expect(dev1.id).toBe('dev-1');
    expect(dev1.title).toBe('Ferndale 6-Unit Cluster Subdivision');
    expect(dev1.is_vat_registered_developer).toBe(true);
    expect(dev1.development_type).toBe('Subdivision & Cluster');
    expect(dev1.current_phase).toBe('Finishes & Practical Completion');
    expect(dev1.land_purchase_price_zar).toBe(1850000);
    expect(dev1.is_deferred_land_payment_laa).toBe(false);
    expect(dev1.senior_jv_partner_name).toBeNull();
    expect(dev1.total_buildable_area_sqm).toBe(390);

    // JSONB columns should be properly structured
    expect(typeof dev1.soft_costs).toBe('object');
    expect(Array.isArray(dev1.units)).toBe(true);
    expect((dev1.units as any[]).length).toBe(6);
    expect(typeof dev1.approvals).toBe('object');
  });

  it('correctly unmaps database rows back into domain models via unmapDevelopments', () => {
    const mapped = mapDevelopments(INITIAL_DEVELOPMENTS, mockUserId);
    const unmapped = unmapDevelopments(mapped as any);

    expect(unmapped.length).toBe(INITIAL_DEVELOPMENTS.length);
    const unmappedDev1 = unmapped[0];
    expect(unmappedDev1.id).toBe('dev-1');
    expect(unmappedDev1.title).toBe('Ferndale 6-Unit Cluster Subdivision');
    expect(unmappedDev1.isVatRegisteredDeveloper).toBe(true);
    expect(unmappedDev1.units.length).toBe(6);
    expect(unmappedDev1.softCosts.townPlannerZAR).toBe(65000);
    expect(unmappedDev1.approvals.splumaRezoningSubdivision.status).toBe('Approved');
    expect(unmappedDev1.isDeferredLandPaymentLAA).toBe(false);
    expect(unmappedDev1.seniorJvPartnerName).toBeUndefined();

    // Round-trip test with LAA and Senior JV partner set
    const customDev: DevelopmentProject = {
      ...INITIAL_DEVELOPMENTS[0],
      isDeferredLandPaymentLAA: true,
      seniorJvPartnerName: 'WBHO Construction Group',
    };
    const customMapped = mapDevelopments([customDev], mockUserId);
    expect(customMapped[0].is_deferred_land_payment_laa).toBe(true);
    expect(customMapped[0].senior_jv_partner_name).toBe('WBHO Construction Group');
    const customUnmapped = unmapDevelopments(customMapped as any);
    expect(customUnmapped[0].isDeferredLandPaymentLAA).toBe(true);
    expect(customUnmapped[0].seniorJvPartnerName).toBe('WBHO Construction Group');
  });

  it('handles stock demo state detection accurately with developments', () => {
    const stockPayload = {
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      developments: INITIAL_DEVELOPMENTS,
      opportunities: INITIAL_OPPORTUNITIES,
      funding: INITIAL_FUNDING,
      tasks: INITIAL_TASKS,
      suppliers: INITIAL_SUPPLIERS,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    };

    expect(isStockDemoState(stockPayload)).toBe(true);

    // Modifying a development should make isStockDemoState return false
    const modifiedPayload = {
      ...stockPayload,
      developments: [
        {
          ...INITIAL_DEVELOPMENTS[0],
          landPurchasePriceZAR: 9999999,
        },
        INITIAL_DEVELOPMENTS[1],
      ],
    };
    expect(isStockDemoState(modifiedPayload)).toBe(false);

    // Adding an extra development should make isStockDemoState return false
    const addedPayload = {
      ...stockPayload,
      developments: [
        ...INITIAL_DEVELOPMENTS,
        {
          id: 'dev-custom-3',
          title: 'Custom Infill',
          address: '10 Main Rd',
          city: 'Pretoria',
          developmentType: 'Township Micro-Units (Infill)',
          isVatRegisteredDeveloper: false,
          currentPhase: 'Feasibility',
          preApprovalMonths: 3,
          constructionMonths: 6,
          sellDownMonths: 2,
          landPurchasePriceZAR: 500000,
          acquisitionCostsZAR: 20000,
          sec118ArrearsZAR: 0,
          softCosts: {} as any,
          totalBuildableAreaSqm: 200,
          budgetedHardCostPerSqmZAR: 8000,
          contingencyPercent: 10,
          boqItems: [],
          monthlyPreApprovalHoldingBurnZAR: 5000,
          monthlyConstructionHoldingBurnZAR: 10000,
          developmentFacilityLimitZAR: 0,
          developmentFacilityDrawnZAR: 0,
          developmentFacilityRepaidZAR: 0,
          preSalesHurdlePercent: 0,
          approvals: {} as any,
          units: [],
        } as DevelopmentProject,
      ],
    };
    expect(isStockDemoState(addedPayload)).toBe(false);
  });

  it('merges developments state smoothly in mergePortfolioState without duplicates', () => {
    const cloudSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      developments: [
        {
          id: 'dev-cloud-1',
          title: 'Cloud Development Project',
          address: '45 Ridge Rd',
          city: 'Sandton',
          developmentType: 'Sectional Title Apartments',
          isVatRegisteredDeveloper: true,
          currentPhase: 'Feasibility',
          preApprovalMonths: 6,
          constructionMonths: 12,
          sellDownMonths: 6,
          landPurchasePriceZAR: 4000000,
          acquisitionCostsZAR: 150000,
          sec118ArrearsZAR: 0,
          softCosts: {} as any,
          totalBuildableAreaSqm: 1200,
          budgetedHardCostPerSqmZAR: 14000,
          contingencyPercent: 10,
          boqItems: [],
          monthlyPreApprovalHoldingBurnZAR: 20000,
          monthlyConstructionHoldingBurnZAR: 40000,
          developmentFacilityLimitZAR: 10000000,
          developmentFacilityDrawnZAR: 0,
          developmentFacilityRepaidZAR: 0,
          preSalesHurdlePercent: 60,
          approvals: {} as any,
          units: [],
        } as DevelopmentProject,
      ],
    };

    const localSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      developments: [
        // Demo item should be ignored when cloud has items
        ...INITIAL_DEVELOPMENTS,
        // Conflicting item matching cloud ID
        {
          ...cloudSnapshot.developments[0],
          title: 'Modified Local Version',
        },
        // Brand new local item
        {
          id: 'dev-local-unique',
          title: 'Unique Local Development',
          address: '88 West St',
          city: 'Durban',
          developmentType: 'Subdivision & Cluster',
          isVatRegisteredDeveloper: false,
          currentPhase: 'Feasibility',
          preApprovalMonths: 3,
          constructionMonths: 8,
          sellDownMonths: 4,
          landPurchasePriceZAR: 1200000,
          acquisitionCostsZAR: 50000,
          sec118ArrearsZAR: 0,
          softCosts: {} as any,
          totalBuildableAreaSqm: 350,
          budgetedHardCostPerSqmZAR: 9500,
          contingencyPercent: 7.5,
          boqItems: [],
          monthlyPreApprovalHoldingBurnZAR: 8000,
          monthlyConstructionHoldingBurnZAR: 15000,
          developmentFacilityLimitZAR: 2000000,
          developmentFacilityDrawnZAR: 0,
          developmentFacilityRepaidZAR: 0,
          preSalesHurdlePercent: 50,
          approvals: {} as any,
          units: [],
        } as DevelopmentProject,
      ],
    };

    const { mergedState, hasNewLocalItems } = mergePortfolioState(cloudSnapshot as any, localSnapshot as any);

    expect(hasNewLocalItems).toBe(true);
    expect(mergedState.developments?.length).toBe(2);
    expect(mergedState.developments?.find((d) => d.id === 'dev-cloud-1')?.title).toBe('Cloud Development Project');
    expect(mergedState.developments?.find((d) => d.id === 'dev-local-unique')).toBeDefined();
    // Demo developments should have been discarded
    expect(mergedState.developments?.find((d) => d.id === 'dev-1')).toBeUndefined();
  });

  it('round-trips commentsLedger through mapDevelopments and unmapDevelopments and handles null or non-array payloads safely', () => {
    const sampleDev: DevelopmentProject = {
      id: 'dev-comments-rt-1',
      title: 'Comments Round-Trip Dev',
      address: '45 Main St',
      city: 'Johannesburg',
      developmentType: 'Subdivision & Cluster',
      isVatRegisteredDeveloper: true,
      currentPhase: 'Feasibility',
      preApprovalMonths: 4,
      constructionMonths: 10,
      sellDownMonths: 4,
      landPurchasePriceZAR: 1500000,
      acquisitionCostsZAR: 80000,
      sec118ArrearsZAR: 0,
      softCosts: {
        townPlannerZAR: 60000,
        architectZAR: 150000,
        structuralCivilEngineerZAR: 90000,
        quantitySurveyorZAR: 75000,
        nhbrcEnrolmentFeeZAR: 35000,
        councilBulkContributionsZAR: 120000,
        planScrutinyAndSubdivisionFeesZAR: 25000,
        marketingAndShowUnitZAR: 40000,
      },
      totalBuildableAreaSqm: 600,
      budgetedHardCostPerSqmZAR: 9500,
      contingencyPercent: 7.5,
      boqItems: [],
      monthlyPreApprovalHoldingBurnZAR: 10000,
      monthlyConstructionHoldingBurnZAR: 20000,
      developmentFacilityLimitZAR: 4000000,
      developmentFacilityDrawnZAR: 0,
      developmentFacilityRepaidZAR: 0,
      preSalesHurdlePercent: 60,
      approvals: {} as any,
      units: [],
      commentsLedger: [
        {
          id: 'rt-c-1',
          authorName: 'K. Naidoo',
          authorRole: 'Quantity Surveyor (QS)',
          sectionTag: 'BOQ & Cost Stack',
          message: 'Check raft foundation BOQ allowance.',
          status: 'In Progress',
          createdAt: '2026-11-10T08:00:00.000Z',
        },
        {
          id: 'rt-c-2',
          authorName: 'L. Mthembu',
          authorRole: 'Town Planner',
          sectionTag: 'Paper Rights & Approvals',
          message: 'SPLUMA Section 42 conditions cleared.',
          status: 'Resolved',
          createdAt: '2026-11-08T10:00:00.000Z',
          resolvedAt: '2026-11-09T14:00:00.000Z',
        },
      ],
    };

    const mapped = mapDevelopments([sampleDev], 'user-rt-1');
    expect(mapped[0].comments_ledger).toEqual(sampleDev.commentsLedger);

    const restored = unmapDevelopments(mapped as any);
    expect(restored[0].commentsLedger).toEqual(sampleDev.commentsLedger);

    const nullFallback = unmapDevelopments([{ ...mapped[0], comments_ledger: null }] as any);
    expect(nullFallback[0].commentsLedger).toEqual([]);

    const objectFallback = unmapDevelopments([{ ...mapped[0], comments_ledger: {} }] as any);
    expect(objectFallback[0].commentsLedger).toEqual([]);
  });

  it('round-trips shareToken through mapDevelopments, unmapDevelopments, and isStockDemoState', () => {
    const devWithToken: DevelopmentProject = {
      ...INITIAL_DEVELOPMENTS[0],
      shareToken: '  uuid-deal-room-token-777  ',
    };

    const mapped = mapDevelopments([devWithToken], 'user-token-1');
    expect(mapped[0].share_token).toBe('uuid-deal-room-token-777');

    const unmapped = unmapDevelopments(mapped as any);
    expect(unmapped[0].shareToken).toBe('uuid-deal-room-token-777');

    const cleared = unmapDevelopments([{ ...mapped[0], share_token: '   ' }] as any);
    expect(cleared[0].shareToken).toBeUndefined();

    // Mutating shareToken should mark stock demo state as modified for sync
    const modifiedStock = INITIAL_DEVELOPMENTS.map((d, idx) =>
      idx === 0 ? { ...d, shareToken: 'custom-minted-token' } : d
    );
    expect(
      isStockDemoState({
        rentals: INITIAL_RENTALS,
        flips: INITIAL_FLIPS,
        developments: modifiedStock,
        opportunities: INITIAL_OPPORTUNITIES,
        funding: INITIAL_FUNDING,
        tasks: INITIAL_TASKS,
        suppliers: INITIAL_SUPPLIERS,
        investorProfile: INITIAL_INVESTOR_PROFILE,
      })
    ).toBe(false);
  });
});
