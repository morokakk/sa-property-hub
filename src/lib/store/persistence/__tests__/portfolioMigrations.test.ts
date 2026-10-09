import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PORTFOLIO_STORAGE_KEY,
  healClearwaterAgencyFee,
  migratePersistedRental,
  migratePersistedOpportunities,
  mergePortfolioPersistedState,
  portfolioPersistConfig,
  registerStoreForMigration,
} from '../portfolioMigrations';
import { RentalProperty, OpportunityDeal } from '@/types';

describe('Zustand Persistence & Schema Migrations Engine', () => {
  describe('Storage Key & Configuration', () => {
    it('pins the storage key to sa_property_portfolio_hub_v1', () => {
      expect(PORTFOLIO_STORAGE_KEY).toBe('sa_property_portfolio_hub_v1');
      expect(portfolioPersistConfig.name).toBe('sa_property_portfolio_hub_v1');
    });
  });

  describe('healClearwaterAgencyFee', () => {
    it('auto-heals legacy Clearwater agency fee 635 to 851 with VAT false and recalculated percentage', () => {
      const legacyRental = {
        title: 'Clearwater Estate Unit 4B',
        agencyName: 'iGrow Rentals',
        monthlyGrossRentZAR: 6900,
        monthlyAgentFeeZAR: 635,
        agencyVatApplicable: true,
        agencyCommissionPercent: 8.0,
      };

      const healed = healClearwaterAgencyFee(legacyRental);

      expect(healed.monthlyAgentFeeZAR).toBe(851);
      expect(healed.agencyVatApplicable).toBe(false);
      // (850.54 / 6900) * 100 = 12.326... -> 12.3%
      expect(healed.agencyCommissionPercent).toBe(12.3);
    });

    it('heals 634.8 floating point legacy variance', () => {
      const legacyRental = {
        title: 'Clearwater Duplex',
        monthlyGrossRentZAR: 10000,
        monthlyAgentFeeZAR: 634.8,
        agencyVatApplicable: true,
        agencyCommissionPercent: 6.3,
      };

      const healed = healClearwaterAgencyFee(legacyRental);
      expect(healed.monthlyAgentFeeZAR).toBe(851);
      expect(healed.agencyVatApplicable).toBe(false);
      expect(healed.agencyCommissionPercent).toBe(8.5); // (850.54 / 10000) * 100 = 8.5%
    });

    it('does not touch non-Clearwater properties or non-635 fees', () => {
      const normalRental = {
        title: 'Rosebank Executive Suite',
        agencyName: 'Pam Golding',
        monthlyGrossRentZAR: 15000,
        monthlyAgentFeeZAR: 1500,
        agencyVatApplicable: true,
        agencyCommissionPercent: 10.0,
      };

      const result = healClearwaterAgencyFee(normalRental);
      expect(result.monthlyAgentFeeZAR).toBe(1500);
      expect(result.agencyVatApplicable).toBe(true);
      expect(result.agencyCommissionPercent).toBe(10.0);
    });

    it('handles null or non-object input safely', () => {
      const result = healClearwaterAgencyFee(null);
      expect(result.monthlyAgentFeeZAR).toBe(0);
      expect(result.agencyVatApplicable).toBe(true);
      expect(result.agencyCommissionPercent).toBe(0);
    });
  });

  describe('migratePersistedRental', () => {
    it('synthesizes leases array from flat fields when leases is missing or empty', () => {
      const legacyRental: any = {
        id: 'prop-legacy-1',
        title: 'Legacy Sandton Apartment',
        monthlyGrossRentZAR: 12000,
        tenantName: 'John Doe',
        tenantPhone: '0821234567',
        tenantEmail: 'john@example.com',
        leaseStartDate: '2025-01-01',
        leaseEndDate: '2026-01-01',
        depositHeldZAR: 12000,
        annualEscalationPercent: 8.0,
        status: 'Occupied',
      };

      const migrated = migratePersistedRental(legacyRental);

      expect(migrated.leases).toBeDefined();
      expect(migrated.leases).toHaveLength(1);
      expect(migrated.leases[0].tenantName).toBe('John Doe');
      expect(migrated.leases[0].tenantPhone).toBe('0821234567');
      expect(migrated.leases[0].monthlyRentZAR).toBe(12000);
      expect(migrated.leases[0].depositHeldZAR).toBe(12000);
      expect(migrated.leases[0].annualEscalationPercent).toBe(8.0);
      expect(migrated.leases[0].status).toBe('Occupied');

      // Flat fields must be removed
      expect((migrated as any).tenantName).toBeUndefined();
      expect((migrated as any).tenantPhone).toBeUndefined();
      expect((migrated as any).leaseStartDate).toBeUndefined();
    });

    it('auto-heals negative arrearsOpeningBalanceZAR on rental and leases', () => {
      const negativeRental: any = {
        id: 'prop-neg-1',
        title: 'Negative Arrears Property',
        arrearsOpeningBalanceZAR: -5000,
        leases: [
          {
            id: 'lease-neg-1',
            unitName: 'Main',
            tenantName: 'Bob',
            monthlyRentZAR: 8000,
            arrearsOpeningBalanceZAR: -3000,
            status: 'Occupied',
          },
        ],
      };

      const migrated = migratePersistedRental(negativeRental);

      expect(migrated.arrearsOpeningBalanceZAR).toBe(0);
      expect(migrated.leases[0].arrearsOpeningBalanceZAR).toBe(0);
      // Negative balances converted to audited ArrearsWriteOff records
      expect(migrated.arrearsWriteOffs?.length).toBeGreaterThan(0);
    });

    it('replaces legacy 2025 utility statements with default statements', () => {
      const defaultRental: any = {
        id: 'prop-1',
        utilityStatements: [
          { id: 'stmt-current', statementDate: '2026-03-01', electricityZAR: 1500, waterZAR: 500 },
        ],
      };

      const legacyRental: any = {
        id: 'prop-1',
        utilityStatements: [
          { id: 'stmt-2025', statementDate: '2025-06-01', electricityZAR: 0, waterZAR: 0 },
        ],
        leases: [{ id: 'l1', monthlyRentZAR: 5000, status: 'Occupied' }],
      };

      const migrated = migratePersistedRental(legacyRental, defaultRental);
      expect(migrated.utilityStatements).toEqual(defaultRental.utilityStatements);
    });

    it('handles null input returning default rental or empty object safely', () => {
      const fallback = { id: 'fallback', title: 'Fallback' } as RentalProperty;
      expect(migratePersistedRental(null, fallback)).toBe(fallback);
      expect(migratePersistedRental(null)).toBeDefined();
    });
  });

  describe('migratePersistedOpportunities', () => {
    it('normalizes legacy stages Analyzing -> Screening and Under Due Diligence -> Due Diligence', () => {
      const opps = [
        { id: 'o-1', title: 'Deal 1', status: 'Analyzing' },
        { id: 'o-2', title: 'Deal 2', status: 'Under Due Diligence' },
        { id: 'o-3', title: 'Deal 3', status: 'Offer Submitted' },
      ];

      const migrated = migratePersistedOpportunities(opps);

      expect(migrated[0].status).toBe('Screening');
      expect(migrated[1].status).toBe('Due Diligence');
      expect(migrated[2].status).toBe('Offer Submitted');
    });

    it('defaults vacancyRatePercent to 6% and managementFeePercent to 8% when missing', () => {
      const opps = [{ id: 'o-1', title: 'Deal 1', status: 'Screening' }];
      const migrated = migratePersistedOpportunities(opps);

      expect(migrated[0].vacancyRatePercent).toBe(6);
      expect(migrated[0].managementFeePercent).toBe(8);
    });

    it('preserves existing custom vacancy and management rates', () => {
      const opps = [{ id: 'o-1', title: 'Deal 1', status: 'Screening', vacancyRatePercent: 10, managementFeePercent: 12 }];
      const migrated = migratePersistedOpportunities(opps);

      expect(migrated[0].vacancyRatePercent).toBe(10);
      expect(migrated[0].managementFeePercent).toBe(12);
    });

    it('handles non-array or empty inputs gracefully', () => {
      expect(migratePersistedOpportunities([])).toEqual([]);
      expect(migratePersistedOpportunities(null as any)).toEqual([]);
    });
  });

  describe('mergePortfolioPersistedState', () => {
    const currentState = {
      rentals: [
        {
          id: 'rental-seed-1',
          title: 'Seed Rental',
          status: 'Occupied' as const,
          marketValueZAR: 1000000,
          purchasePriceZAR: 900000,
          monthlyGrossRentZAR: 10000,
          leases: [{ id: 'l1', monthlyRentZAR: 10000, status: 'Occupied' as const }],
        } as RentalProperty,
      ],
      opportunities: [] as OpportunityDeal[],
      municipalDirectory: [],
      aiSettings: { provider: 'anthropic' as const, apiKey: '', model: 'claude-sonnet-5' },
      completedGuideSteps: ['step-1'],
    };

    it('merges persisted state into currentState executing schema migrations', () => {
      const persisted = {
        rentals: [
          {
            id: 'rental-seed-1',
            title: 'Clearwater Estate Unit 12',
            agencyName: 'iGrow Rentals',
            monthlyGrossRentZAR: 7000,
            monthlyAgentFeeZAR: 635,
            agencyVatApplicable: true,
            status: 'Occupied',
            leases: [{ id: 'l1', monthlyRentZAR: 7000, status: 'Occupied' }],
          },
        ],
        opportunities: [
          { id: 'opp-1', title: 'New Deal', status: 'Analyzing' },
        ],
        aiSettings: { model: 'claude-3-5-sonnet-20241022' },
        completedGuideSteps: ['step-1', '  step-1  ', 'step-2', '', null],
      };

      const merged = mergePortfolioPersistedState(persisted, currentState);

      // Clearwater fee healed
      expect(merged.rentals[0].monthlyAgentFeeZAR).toBe(851);
      // Opportunity status normalized
      expect(merged.opportunities[0].status).toBe('Screening');
      // AI model normalized
      expect(merged.aiSettings.model).toBeDefined();
      // Completed guide steps deduplicated and trimmed
      expect(merged.completedGuideSteps).toEqual(['step-1', 'step-2']);
    });

    it('handles null, undefined, or empty persistedState safely without throwing', () => {
      const mergedNull = mergePortfolioPersistedState(null, currentState);
      expect(mergedNull.rentals).toHaveLength(1);

      const mergedUndefined = mergePortfolioPersistedState(undefined, currentState);
      expect(mergedUndefined.rentals).toHaveLength(1);

      const mergedEmpty = mergePortfolioPersistedState({}, currentState);
      expect(mergedEmpty.rentals).toHaveLength(1);
    });

    it('does not crash when currentState.rentals is undefined or empty', () => {
      const stateWithoutRentals = {
        rentals: undefined as any,
        opportunities: [],
      };
      const persisted = {
        rentals: [{ id: 'p1', title: 'P1', leases: [{ id: 'l1', status: 'Occupied' }] }],
      };

      const result = mergePortfolioPersistedState(persisted, stateWithoutRentals);
      expect(result.rentals).toHaveLength(1);
    });
  });

  describe('onRehydrateStorage', () => {
    it('executes rehydration callback and auto-heals negative arrears via registered store setter', () => {
      const mockStore = {
        setState: vi.fn(),
      };
      registerStoreForMigration(mockStore);

      const postRehydrate = (portfolioPersistConfig.onRehydrateStorage as any)();
      expect(typeof postRehydrate).toBe('function');

      const stateWithNegative: any = {
        rentals: [
          {
            id: 'r-neg',
            title: 'Neg Asset',
            arrearsOpeningBalanceZAR: -4000,
            leases: [],
          },
        ],
      };

      postRehydrate(stateWithNegative, undefined);

      expect(mockStore.setState).toHaveBeenCalled();
      const calls = mockStore.setState.mock.calls;
      const healedRentals = calls[0][0].rentals;
      expect(healedRentals[0].arrearsOpeningBalanceZAR).toBe(0);
    });

    it('gracefully ignores rehydration when error occurs or state is undefined', () => {
      const postRehydrate = (portfolioPersistConfig.onRehydrateStorage as any)();
      expect(() => postRehydrate(undefined, new Error('Storage corrupted'))).not.toThrow();
    });
  });
});
