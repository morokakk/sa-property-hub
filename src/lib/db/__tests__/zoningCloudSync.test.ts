import { describe, it, expect } from 'vitest';
import {
  mapDevelopments,
  mapRentals,
  mapFlips,
  mapOpportunities,
  mapProfile,
  isStockDemoState,
} from '../migrateToCloud';
import {
  unmapDevelopments,
  unmapRentals,
  unmapFlips,
  unmapOpportunities,
} from '../hydrateFromCloud';
import {
  INITIAL_DEVELOPMENTS,
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_OPPORTUNITIES,
  INITIAL_FUNDING,
  INITIAL_TASKS,
  INITIAL_SUPPLIERS,
  INITIAL_INVESTOR_PROFILE,
  INITIAL_ANALYZER_DRAFT,
} from '@/lib/store/initialData';
import type {
  DevelopmentProject,
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  ZoningProfile,
} from '@/types';

const sampleZoning: ZoningProfile = {
  currentZoning: 'Residential 1',
  targetZoning: 'Residential 3',
  erfSizeSqm: 1500,
  farRatio: 0.8,
  coveragePercent: 60,
  maxHeightStoreys: 3,
  maxDensityDuPerHa: 50,
  requiresRezoning: true,
  consentUses: {
    secondDwellingPermitted: true,
    studentCommuneConsent: false,
    backyardMicroUnitsPermitted: true,
    homeEnterprisePermitted: true,
  },
};

describe('Zoning Profile Supabase Cloud Sync Round-Trip Suite', () => {
  const mockUserId = 'usr-sync-test-zoning-001';

  it('preserves DevelopmentProject zoningProfile through mapDevelopments and unmapDevelopments', () => {
    const devProject: DevelopmentProject = {
      ...INITIAL_DEVELOPMENTS[0],
      id: 'custom-dev-sync-1',
      zoningProfile: sampleZoning,
    };

    const mapped = mapDevelopments([devProject], mockUserId);
    expect(mapped).toHaveLength(1);

    // Approvals JSONB column must contain _zoningProfile
    expect((mapped[0].approvals as any)._zoningProfile).toEqual(sampleZoning);

    const unmapped = unmapDevelopments(mapped as any);
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].zoningProfile).toEqual(sampleZoning);
    // Ensure clean approvals does not leak _zoningProfile
    expect((unmapped[0].approvals as any)._zoningProfile).toBeUndefined();
    expect(unmapped[0].approvals.splumaRezoningSubdivision).toBeDefined();
  });

  it('preserves RentalProperty zoningProfile through mapRentals and unmapRentals', () => {
    const rental: RentalProperty = {
      ...INITIAL_RENTALS[0],
      id: 'custom-rental-sync-1',
      zoningProfile: sampleZoning,
    };

    const mapped = mapRentals([rental], mockUserId);
    expect(mapped).toHaveLength(1);

    // coc_checklist JSONB column must contain _zoningProfile
    expect((mapped[0].coc_checklist as any)._zoningProfile).toEqual(sampleZoning);

    const unmapped = unmapRentals(mapped as any);
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].zoningProfile).toEqual(sampleZoning);
    // Ensure clean cocChecklist does not leak _zoningProfile
    expect((unmapped[0].cocChecklist as any)?._zoningProfile).toBeUndefined();
  });

  it('preserves FlipProject zoningProfile through mapFlips and unmapFlips', () => {
    const flip: FlipProject = {
      ...INITIAL_FLIPS[0],
      id: 'custom-flip-sync-1',
      zoningProfile: sampleZoning,
    };

    const mapped = mapFlips([flip], mockUserId);
    expect(mapped).toHaveLength(1);

    // coc_checklist JSONB column must contain _zoningProfile
    expect((mapped[0].coc_checklist as any)._zoningProfile).toEqual(sampleZoning);

    const unmapped = unmapFlips(mapped as any);
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].zoningProfile).toEqual(sampleZoning);
    // Ensure clean cocChecklist does not leak _zoningProfile
    expect((unmapped[0].cocChecklist as any)?._zoningProfile).toBeUndefined();
  });

  it('preserves OpportunityDeal zoningProfile through mapOpportunities and unmapOpportunities', () => {
    const opp: OpportunityDeal = {
      ...INITIAL_OPPORTUNITIES[0],
      id: 'custom-opp-sync-1',
      zoningProfile: sampleZoning,
    };

    const mapped = mapOpportunities([opp], mockUserId);
    expect(mapped).toHaveLength(1);

    // costs JSONB column must contain zoningProfile
    expect((mapped[0].costs as any).zoningProfile).toEqual(sampleZoning);

    const unmapped = unmapOpportunities(mapped as any);
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].zoningProfile).toEqual(sampleZoning);
    // Ensure clean costs does not leak zoningProfile
    expect((unmapped[0].costs as any)?.zoningProfile).toBeUndefined();
  });

  it('preserves AnalyzerDraft zoningProfile in investor_profiles.analyzer_draft', () => {
    const draftWithZoning = {
      ...INITIAL_ANALYZER_DRAFT,
      zoningProfile: sampleZoning,
    };

    const mappedProfile = mapProfile(INITIAL_INVESTOR_PROFILE, {
      analyzerDraft: draftWithZoning,
    }, mockUserId);

    expect(mappedProfile.analyzer_draft).toBeDefined();
    expect((mappedProfile.analyzer_draft as any).zoningProfile).toEqual(sampleZoning);
  });

  it('triggers isStockDemoState to false if any demo development zoningProfile is modified', () => {
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

    // Unmodified stock state
    expect(isStockDemoState(stockPayload)).toBe(true);

    // Modifying ONLY the zoning profile of dev-1
    const modifiedPayload = {
      ...stockPayload,
      developments: [
        {
          ...INITIAL_DEVELOPMENTS[0],
          zoningProfile: {
            ...INITIAL_DEVELOPMENTS[0].zoningProfile!,
            farRatio: 1.5, // Changed from 0.6 to 1.5
          },
        },
        INITIAL_DEVELOPMENTS[1],
      ],
    };

    // Must be recognized as modified so it syncs to Supabase
    expect(isStockDemoState(modifiedPayload)).toBe(false);
  });
});
