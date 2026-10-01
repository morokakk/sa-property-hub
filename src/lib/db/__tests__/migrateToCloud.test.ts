import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapProfile,
  mapRentals,
  mapFlips,
  extractAndMapBOQItems,
  mapFundingSources,
  mapOpportunities,
  mapTasks,
  mapSuppliers,
  migrateToCloud,
  toDateOnly,
  PortfolioMigrationPayload,
} from '../migrateToCloud';
import { supabase } from '@/lib/supabaseClient';
import type {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  LocalSupplier,
  TaskItem,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
} from '@/types';

// Mock supabase client
vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

describe('migrateToCloud Payload Mappers', () => {
  const TEST_USER_ID = 'test-user-uuid-1234';
  const TEST_EMAIL = 'investor@test.co.za';

  describe('mapProfile', () => {
    it('maps investor profile and extra settings with user_id', () => {
      const profile: InvestorProfile = {
        entityName: 'Apex Properties (Pty) Ltd',
        tradingAs: 'Apex Capital',
        registrationOrId: '2022/123456/07',
        contactNumber: '+27 82 123 4567',
        email: 'apex@example.com',
        website: 'https://apex.co.za',
        physicalAddress: '12 Sandton Drive',
        bioSummary: 'Value-add property investors',
        defaultPrimeRatePercent: 11.75,
        baselineHurdleYieldPercent: 10.5,
        defaultAgentCommissionPercent: 5.5,
        defaultTaxEntityType: 'Company (27%)',
      };

      const aiSettings: AiSettings = {
        provider: 'anthropic',
        apiKey: 'sk-ant-123',
        model: 'claude-sonnet-5',
      };

      const analyzerDraft: AnalyzerDraft = {
        openMarketValue: 1500000,
        purchasePrice: 1200000,
        rehabCost: 80000,
        monthlyRent: 14000,
        monthlyLevies: 1200,
        monthlyRates: 900,
        targetExitPrice: 1800000,
        auctioneerCommission: 0,
        municipalArrears: 0,
        depositZAR: 0,
        loanToValue: 80,
      };

      const result = mapProfile(
        profile,
        {
          liquidCapitalReserve: 250000,
          rentalForecastView: 'cashflow-only',
          aiSettings,
          analyzerDraft,
        },
        TEST_USER_ID,
        TEST_EMAIL
      );

      expect(result.id).toBe(TEST_USER_ID);
      expect(result.user_id).toBe(TEST_USER_ID);
      expect(result.entity_name).toBe('Apex Properties (Pty) Ltd');
      expect(result.trading_as).toBe('Apex Capital');
      expect(result.liquid_capital_reserve_zar).toBe(250000);
      expect(result.rental_forecast_view).toBe('cashflow-only');
      expect(result.ai_settings).toEqual(aiSettings);
      expect(result.analyzer_draft).toEqual(analyzerDraft);
    });

    it('falls back gracefully when profile is undefined', () => {
      const result = mapProfile(undefined, {}, TEST_USER_ID, TEST_EMAIL);
      expect(result.id).toBe(TEST_USER_ID);
      expect(result.user_id).toBe(TEST_USER_ID);
      expect(result.entity_name).toBe('Portfolio Owner');
      expect(result.email).toBe(TEST_EMAIL);
      expect(result.liquid_capital_reserve_zar).toBe(0);
      expect(result.rental_forecast_view).toBe('wealth-only');
    });
  });

  describe('mapRentals', () => {
    it('maps rentals with user_id and converts timestamps to dates', () => {
      const rentals: RentalProperty[] = [
        {
          id: 'rental-1',
          title: 'Sandton Executive Suite',
          address: '44 Rivonia Rd',
          city: 'Sandton',
          propertyType: 'Sectional Title Apartment',
          marketValueZAR: 1500000,
          purchasePriceZAR: 1200000,
          purchaseDate: '2024-05-01T00:00:00Z',
          outstandingBondBalanceZAR: 900000,
          bondInterestRatePercent: 11.5,
          monthlyBondPaymentZAR: 9500,
          monthlyGrossRentZAR: 15000,
          monthlyLeviesZAR: 2000,
          monthlyRatesTaxesZAR: 1200,
          monthlyAgentFeeZAR: 1200,
          monthlyMaintenanceReserveZAR: 500,
          status: 'Occupied',
          leases: [
            {
              id: 'lease-1',
              unitName: 'Unit 4',
              tenantName: 'John Doe',
              tenantEmail: 'john@example.com',
              leaseStartDate: '2024-06-01',
              leaseEndDate: '2025-05-31',
              monthlyRentZAR: 15000,
              depositHeldZAR: 15000,
              annualEscalationPercent: 6,
              status: 'Occupied',
            },
          ],
          maintenanceHistory: [],
        },
      ];

      const mapped = mapRentals(rentals, TEST_USER_ID);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].id).toBe('rental-1');
      expect(mapped[0].user_id).toBe(TEST_USER_ID);
      expect(mapped[0].purchase_date).toBe('2024-05-01');
      expect(mapped[0].leases).toHaveLength(1);
      expect((mapped[0].leases as any)[0].tenantName).toBe('John Doe');
    });

    it('returns empty array when rentals list is empty', () => {
      expect(mapRentals([], TEST_USER_ID)).toEqual([]);
    });
  });

  describe('mapFlips and extractAndMapBOQItems', () => {
    it('maps flips and extracts nested BOQ items with correct flip_id and user_id', () => {
      const flips: FlipProject[] = [
        {
          id: 'flip-101',
          title: 'Rosebank Fixer Upper',
          address: '10 Oxford Rd',
          city: 'Johannesburg',
          purchaseDate: '2025-01-15',
          purchasePriceZAR: 1800000,
          acquisitionCostsZAR: 150000,
          baselineRenovationBudgetZAR: 350000,
          targetExitPriceZAR: 2800000,
          targetCompletionDate: '2025-07-31',
          currentPhase: 'Finishes & Tiling',
          status: 'Active',
          linkedFundingIds: ['fund-1'],
          boq: [
            {
              id: 'boq-item-1',
              category: 'Plumbing & Wet Works',
              itemDescription: 'En-suite shower refit',
              unit: 'lump sum',
              quantity: 1,
              baselineUnitCostZAR: 25000,
              baselineTotalZAR: 25000,
              actualCostZAR: 27000,
              varianceZAR: 2000,
              supplierOrContractor: 'Apex Plumbing',
              status: 'Completed',
            },
            {
              id: 'boq-item-2',
              category: 'Painting & Finishes',
              itemDescription: 'Interior Dulux repaint',
              unit: 'm2',
              quantity: 150,
              baselineUnitCostZAR: 80,
              baselineTotalZAR: 12000,
              actualCostZAR: 12000,
              varianceZAR: 0,
              supplierOrContractor: 'ProPainters',
              status: 'In Progress',
            },
          ],
        },
        {
          id: 'flip-102',
          title: 'Bryanston Cottage Modernization',
          address: '88 Bryanston Dr',
          city: 'Sandton',
          purchaseDate: '2025-02-01',
          purchasePriceZAR: 2200000,
          acquisitionCostsZAR: 180000,
          baselineRenovationBudgetZAR: 400000,
          targetExitPriceZAR: 3400000,
          targetCompletionDate: '2025-09-30',
          currentPhase: 'Acquisition & Conveyancing',
          status: 'Active',
          linkedFundingIds: [],
          boq: [],
        },
      ];

      const mappedFlips = mapFlips(flips, TEST_USER_ID);
      expect(mappedFlips).toHaveLength(2);
      expect(mappedFlips[0].id).toBe('flip-101');
      expect(mappedFlips[0].user_id).toBe(TEST_USER_ID);

      const mappedBOQ = extractAndMapBOQItems(flips, TEST_USER_ID);
      expect(mappedBOQ).toHaveLength(2);
      expect(mappedBOQ[0].id).toBe('boq-item-1');
      expect(mappedBOQ[0].flip_id).toBe('flip-101');
      expect(mappedBOQ[0].user_id).toBe(TEST_USER_ID);
      expect(mappedBOQ[0].actual_cost_zar).toBe(27000);
      expect(mappedBOQ[1].flip_id).toBe('flip-101');
    });
  });

  describe('mapFundingSources, mapOpportunities, mapTasks, mapSuppliers', () => {
    it('correctly attaches user_id to funding sources', () => {
      const funding: FundingSource[] = [
        {
          id: 'fund-1',
          lenderName: 'Oakhaven Capital',
          entityOrContact: 'Sarah Jenkins',
          emailPhone: 'sarah@oakhaven.co.za',
          fundingType: 'Private Lender',
          capitalAmountZAR: 1000000,
          disbursementDate: '2025-01-01',
          maturityDate: '2025-12-31',
          returnTermsType: 'Fixed Interest',
          returnRatePercent: 14.5,
          paymentSchedule: 'Monthly Interest',
          totalRepaidZAR: 0,
          status: 'Active',
        },
      ];

      const mapped = mapFundingSources(funding, TEST_USER_ID);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].user_id).toBe(TEST_USER_ID);
      expect(mapped[0].capital_amount_zar).toBe(1000000);
    });

    it('correctly maps opportunities with pipeline details', () => {
      const opps: OpportunityDeal[] = [
        {
          id: 'opp-1',
          title: 'Distressed Freehold in Fourways',
          address: '15 Sunset Ave',
          city: 'Sandton',
          province: 'Gauteng',
          source: 'Distressed Sale / Repo',
          openMarketValueZAR: 2400000,
          purchasePrice: 1700000,
          builtInEquityZAR: 700000,
          builtInEquityPercent: 29.17,
          estimatedRehabCost: 200000,
          monthlyRentalEstimate: 22000,
          monthlyLevies: 0,
          monthlyRatesTaxes: 1800,
          annualInsurance: 10000,
          managementFeePercent: 8,
          vacancyRatePercent: 5,
          targetExitPrice: 2500000,
          holdingPeriodMonths: 6,
          strategy: 'Flip',
          loanToValuePercent: 80,
          bondLTV: 80,
          depositZAR: 340000,
          interestRatePercent: 11.75,
          loanTermYears: 20,
          costs: {
            purchasePrice: 1700000,
            transferDuty: 45000,
            conveyancingFee: 32000,
            bondRegistrationFee: 28000,
            deedsOfficeFee: 1500,
            ficaSundries: 850,
            totalAcquisitionCost: 1807350,
          },
          grossYield: 15.5,
          capRate: 11.2,
          netRoi: 18.4,
          monthlyCashFlow: 4500,
          projectedFlipNetProfit: 450000,
          projectedFlipRoi: 24.8,
          status: 'Screening',
          createdAt: '2025-03-01T10:00:00Z',
        },
      ];

      const mapped = mapOpportunities(opps, TEST_USER_ID);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].user_id).toBe(TEST_USER_ID);
      expect(mapped[0].purchase_price_zar).toBe(1700000);
      expect(mapped[0].strategy).toBe('Flip');
    });

    it('correctly maps tasks and suppliers', () => {
      const tasks: TaskItem[] = [
        {
          id: 'task-1',
          title: 'Lodge City Power meter dispute',
          dueDate: '2025-04-10',
          priority: 'Urgent',
          status: 'Pending',
          linkedEntity: { type: 'rental', id: 'rental-1', name: 'Sandton Suite' },
          createdAt: '2025-04-01T08:00:00Z',
        },
      ];

      const suppliers: LocalSupplier[] = [
        {
          id: 'sup-1',
          name: 'Builders Warehouse Rivonia',
          category: 'Hardware & Timber',
          branchLocation: 'Sandton',
          phone: '+27 11 555 1234',
          rating: 5,
        },
      ];

      const mappedTasks = mapTasks(tasks, TEST_USER_ID);
      expect(mappedTasks[0].user_id).toBe(TEST_USER_ID);
      expect(mappedTasks[0].due_date).toBe('2025-04-10');

      const mappedSuppliers = mapSuppliers(suppliers, TEST_USER_ID);
      expect(mappedSuppliers[0].user_id).toBe(TEST_USER_ID);
      expect(mappedSuppliers[0].name).toBe('Builders Warehouse Rivonia');
    });

    it('rounds integer fields and sanitizes supplier ratings between 1 and 5', () => {
      const suppliers: LocalSupplier[] = [
        {
          id: 'sup-float',
          name: 'Tile City',
          category: 'Tiles & Sanitary',
          branchLocation: 'Centurion',
          phone: '+27 12 000 1111',
          rating: 4.6 as any,
        },
      ];
      const mapped = mapSuppliers(suppliers, TEST_USER_ID);
      expect(mapped[0].rating).toBe(5);
    });
  });

  describe('toDateOnly Date Sanitization', () => {
    it('handles ISO timestamps, dates with times, slash formats, and invalid strings safely', () => {
      expect(toDateOnly('2026-03-20')).toBe('2026-03-20');
      expect(toDateOnly('2026-03-20T14:30:00.000Z')).toBe('2026-03-20');
      expect(toDateOnly('2026-03-20 15:45:00')).toBe('2026-03-20');
      expect(toDateOnly('2026/03/20')).toBe('2026-03-20');
      expect(toDateOnly(null)).toBeNull();
      expect(toDateOnly(undefined)).toBeNull();
      expect(toDateOnly('')).toBeNull();
      expect(toDateOnly('   ')).toBeNull();
      expect(toDateOnly('Pending')).toBeNull();
      expect(toDateOnly('Invalid Date')).toBeNull();
    });
  });

  describe('BOQ item deduplication and missing ID recovery', () => {
    it('deduplicates colliding BOQ item IDs across flips and assigns unique primary keys', () => {
      const flips: FlipProject[] = [
        {
          id: 'flip-A',
          title: 'Flip A',
          address: 'A Street',
          city: 'JHB',
          purchaseDate: '2025-01-01',
          purchasePriceZAR: 1000000,
          acquisitionCostsZAR: 50000,
          baselineRenovationBudgetZAR: 100000,
          targetExitPriceZAR: 1500000,
          targetCompletionDate: '2025-06-01',
          currentPhase: 'Strip & Demolition',
          boq: [
            {
              id: 'boq-item-duplicate',
              category: 'Plumbing & Wet Works',
              itemDescription: 'Item from Flip A',
              unit: 'unit',
              quantity: 1,
              baselineUnitCostZAR: 5000,
              baselineTotalZAR: 5000,
              actualCostZAR: 5000,
              varianceZAR: 0,
              supplierOrContractor: 'Plumber A',
              status: 'Completed',
            },
          ],
          linkedFundingIds: [],
          status: 'Active',
        },
        {
          id: 'flip-B',
          title: 'Flip B',
          address: 'B Street',
          city: 'PTA',
          purchaseDate: '2025-02-01',
          purchasePriceZAR: 1200000,
          acquisitionCostsZAR: 60000,
          baselineRenovationBudgetZAR: 150000,
          targetExitPriceZAR: 1800000,
          targetCompletionDate: '2025-08-01',
          currentPhase: 'Finishes & Tiling',
          boq: [
            {
              id: 'boq-item-duplicate', // Duplicate ID in flip B!
              category: 'Painting & Finishes',
              itemDescription: 'Item from Flip B',
              unit: 'unit',
              quantity: 2,
              baselineUnitCostZAR: 3000,
              baselineTotalZAR: 6000,
              actualCostZAR: 6000,
              varianceZAR: 0,
              supplierOrContractor: 'Painter B',
              status: 'In Progress',
            },
            {
              id: '', // Missing ID
              category: 'Kitchen & Cabinetry',
              itemDescription: 'Item without ID',
              unit: 'unit',
              quantity: 1,
              baselineUnitCostZAR: 10000,
              baselineTotalZAR: 10000,
              actualCostZAR: 10000,
              varianceZAR: 0,
              supplierOrContractor: 'Kitchen Express',
              status: 'Not Started',
            },
          ],
          linkedFundingIds: [],
          status: 'Active',
        },
      ];

      const boqItems = extractAndMapBOQItems(flips, TEST_USER_ID);
      expect(boqItems).toHaveLength(3);

      const ids = boqItems.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3); // All 3 have unique primary keys
      expect(boqItems[0].flip_id).toBe('flip-A');
      expect(boqItems[1].flip_id).toBe('flip-B');
      expect(boqItems[2].flip_id).toBe('flip-B');
    });

    it('skips flips that have no id to prevent foreign key constraint violations', () => {
      const flips: any[] = [
        {
          id: '',
          title: 'Orphan Flip',
          boq: [
            {
              id: 'orphan-boq',
              category: 'Plumbing & Wet Works',
              itemDescription: 'Orphaned item',
            },
          ],
        },
      ];
      const items = extractAndMapBOQItems(flips, TEST_USER_ID);
      expect(items).toEqual([]);
    });
  });
});

describe('migrateToCloud Execution Engine', () => {
  const TEST_USER_ID = 'user-auth-123';
  const mockUpsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default localStorage mock in test environment
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(storage)) delete storage[k];
      }),
    });

    mockUpsert.mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });
  });

  it('fails with NO_AUTH if user is not signed in', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await migrateToCloud();
    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_AUTH');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('fails with NO_DATA if localStorage and options are empty', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@example.com' } },
      error: null,
    });

    const result = await migrateToCloud();
    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_DATA');
  });

  it('executes full batch upsert and sets localStorage completion flags on success', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'investor@example.com' } },
      error: null,
    });

    const samplePayload: PortfolioMigrationPayload = {
      investorProfile: {
        entityName: 'Cloud Property Holdings',
        registrationOrId: '2023/999999/07',
        contactNumber: '+27 83 000 0000',
        email: 'cloud@holdings.co.za',
        bioSummary: 'Test syndicate',
        defaultPrimeRatePercent: 11.75,
        baselineHurdleYieldPercent: 10,
        defaultAgentCommissionPercent: 5,
      },
      liquidCapitalReserve: 500000,
      rentals: [
        {
          id: 'rental-c1',
          title: 'Cloud Unit 1',
          address: '1 Cloud Way',
          city: 'Pretoria',
          propertyType: 'Sectional Title Apartment',
          marketValueZAR: 900000,
          purchasePriceZAR: 800000,
          purchaseDate: '2024-01-01',
          outstandingBondBalanceZAR: 600000,
          bondInterestRatePercent: 11.5,
          monthlyBondPaymentZAR: 6500,
          monthlyGrossRentZAR: 9000,
          monthlyLeviesZAR: 1200,
          monthlyRatesTaxesZAR: 800,
          monthlyAgentFeeZAR: 720,
          monthlyMaintenanceReserveZAR: 400,
          status: 'Occupied',
          leases: [],
          maintenanceHistory: [],
        },
      ],
      flips: [
        {
          id: 'flip-c1',
          title: 'Cloud Flip 1',
          address: '2 Cloud Way',
          city: 'Pretoria',
          purchaseDate: '2025-01-01',
          purchasePriceZAR: 1500000,
          acquisitionCostsZAR: 100000,
          baselineRenovationBudgetZAR: 200000,
          targetExitPriceZAR: 2200000,
          targetCompletionDate: '2025-06-30',
          currentPhase: 'Finishes & Tiling',
          status: 'Active',
          linkedFundingIds: [],
          boq: [
            {
              id: 'boq-c1',
              category: 'Kitchen & Cabinetry',
              itemDescription: 'Countertops',
              unit: 'linear m',
              quantity: 6,
              baselineUnitCostZAR: 1500,
              baselineTotalZAR: 9000,
              actualCostZAR: 9000,
              varianceZAR: 0,
              supplierOrContractor: 'Kitchen Express',
              status: 'Completed',
            },
          ],
        },
      ],
      funding: [],
      opportunities: [],
      tasks: [],
      suppliers: [],
    };

    const result = await migrateToCloud({ state: samplePayload });

    expect(result.success).toBe(true);
    expect(result.counts.profile).toBe(1);
    expect(result.counts.properties).toBe(1);
    expect(result.counts.flips).toBe(1);
    expect(result.counts.boqItems).toBe(1);

    // Verify Supabase upserts were called for profiles, properties, flips, boq_items
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.from).toHaveBeenCalledWith('properties');
    expect(supabase.from).toHaveBeenCalledWith('flips');
    expect(supabase.from).toHaveBeenCalledWith('boq_items');

    // Verify localStorage sync timestamp recorded
    expect(localStorage.setItem).toHaveBeenCalledWith('cloud_sync_completed', 'true');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'cloud_sync_timestamp',
      expect.any(String)
    );
  });

  it('fails cleanly and reports error if a table upsert throws an error', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'investor@example.com' } },
      error: null,
    });

    mockUpsert.mockResolvedValueOnce({ error: null }); // profiles ok
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Database connection timeout' } }); // properties fail

    const payload: PortfolioMigrationPayload = {
      rentals: [
        {
          id: 'rental-err',
          title: 'Error Unit',
          address: 'Error St',
          city: 'JHB',
          propertyType: 'Freehold House',
          marketValueZAR: 1000000,
          purchasePriceZAR: 1000000,
          purchaseDate: '2024-01-01',
          outstandingBondBalanceZAR: 0,
          bondInterestRatePercent: 0,
          monthlyBondPaymentZAR: 0,
          monthlyGrossRentZAR: 10000,
          monthlyLeviesZAR: 0,
          monthlyRatesTaxesZAR: 1000,
          monthlyAgentFeeZAR: 800,
          monthlyMaintenanceReserveZAR: 500,
          status: 'Occupied',
          leases: [],
          maintenanceHistory: [],
        },
      ],
    };

    const result = await migrateToCloud({ state: payload });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rentals sync failed: Database connection timeout');
    expect(localStorage.setItem).not.toHaveBeenCalledWith('cloud_sync_completed', 'true');
  });
});
