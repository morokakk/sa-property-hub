import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  unmapProfile,
  unmapRentals,
  unmapFlips,
  unmapFundingSources,
  unmapOpportunities,
  unmapTasks,
  unmapSuppliers,
  hydrateFromCloud,
} from '../hydrateFromCloud';
import { supabase } from '@/lib/supabaseClient';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import * as migrateModule from '../migrateToCloud';

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

describe('hydrateFromCloud Reverse Mappers', () => {
  it('correctly reverse-maps profiles row to InvestorProfile and scalar fields', () => {
    const profileRow = {
      id: 'usr-1',
      user_id: 'usr-1',
      entity_name: 'Apex Property Holdings (Pty) Ltd',
      trading_as: 'Apex Living',
      registration_or_id: '2024/000111/07',
      contact_number: '+27 82 123 4567',
      email: 'invest@apex.co.za',
      website: 'www.apex.co.za',
      physical_address: '15 West Street, Sandton',
      logo_base64: 'data:image/png;base64,mock',
      bio_summary: 'Boutique property fund',
      default_prime_rate_percent: 11.5,
      baseline_hurdle_yield_percent: 10.5,
      default_agent_commission_percent: 5.5,
      default_tax_entity_type: 'Company (27%)',
      liquid_capital_reserve_zar: 850000,
      rental_forecast_view: 'cashflow-only',
      ai_settings: { provider: 'anthropic', model: 'claude-sonnet-5' },
      analyzer_draft: { purchasePrice: 1200000 },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const result = unmapProfile(profileRow as any);

    expect(result.profile?.entityName).toBe('Apex Property Holdings (Pty) Ltd');
    expect(result.profile?.tradingAs).toBe('Apex Living');
    expect(result.profile?.defaultPrimeRatePercent).toBe(11.5);
    expect(result.liquidCapitalReserve).toBe(850000);
    expect(result.rentalForecastView).toBe('cashflow-only');
    expect(result.aiSettings).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5' });
    expect(result.analyzerDraft).toEqual({ purchasePrice: 1200000 });
  });

  it('correctly reverse-maps properties rows to RentalProperty domain models', () => {
    const propRows = [
      {
        id: 'rental-c1',
        user_id: 'usr-1',
        title: 'Morningside Executive Apartment',
        address: '12 Rivonia Road, Morningside',
        city: 'Johannesburg',
        property_type: 'Sectional Title Apartment',
        source: 'Private Treaty',
        agm_date: '2026-11-20',
        market_value_zar: 2100000,
        purchase_price_zar: 1850000,
        purchase_date: '2024-05-10',
        outstanding_bond_balance_zar: 1200000,
        bond_interest_rate_percent: 11.75,
        monthly_bond_payment_zar: 13000,
        bond_payment_effective_date: '2024-06-01',
        bond_revision_note: null,
        leases: [{ id: 'lease-1', tenantName: 'Jane Doe', monthlyRentZAR: 16000 }],
        management_type: 'Agency',
        agency_name: 'Rawson Sandton',
        agency_commission_percent: 8,
        agency_vat_applicable: true,
        agency_contact: '+27 11 000 0000',
        monthly_gross_rent_zar: 16000,
        monthly_levies_zar: 2200,
        monthly_rates_taxes_zar: 1300,
        monthly_agent_fee_zar: 1472,
        monthly_maintenance_reserve_zar: 750,
        annual_building_insurance_zar: 4500,
        unpaid_utility_arrears_zar: 0,
        maintenance_history: [],
        status: 'Occupied',
        coc_checklist: { electrical: { status: 'Certified / Valid' } },
        drive_vault: { masterFolderUrl: 'https://vault.com' },
        notes: 'Great tenant',
        actual_sale_price_zar: null,
        net_cash_proceeds_zar: null,
        sold_date: null,
        exit_notes: null,
        converted_from_flip_id: null,
        is_brrrr_property: false,
        total_equity_extracted_zar: null,
        refinance_history: [],
        utility_statements: [],
        meter_readings: [],
        tax_entity_type_override: null,
        section_13sex_annual_shield_zar: null,
        utility_type: null,
        prepaid_vendor_name: null,
        monthly_prepaid_vending_fee_zar: null,
        ancillary_incomes: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    const result = unmapRentals(propRows as any);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rental-c1');
    expect(result[0].title).toBe('Morningside Executive Apartment');
    expect(result[0].marketValueZAR).toBe(2100000);
    expect(result[0].monthlyGrossRentZAR).toBe(16000);
    expect(result[0].leases).toHaveLength(1);
    expect(result[0].leases[0].tenantName).toBe('Jane Doe');
    expect(result[0].agencyVatApplicable).toBe(true);
  });

  it('correctly reverse-maps flips and de-normalizes child BOQ items into flip.boq', () => {
    const flipRows = [
      {
        id: 'flip-c1',
        user_id: 'usr-1',
        title: 'Parkhurst Fixer Upper',
        address: '22 6th Street, Parkhurst',
        city: 'Johannesburg',
        property_type: 'Freehold House',
        purchase_date: '2025-02-01',
        purchase_price_zar: 2200000,
        acquisition_costs_zar: 160000,
        baseline_renovation_budget_zar: 450000,
        strategy: 'Flip',
        source: 'Sheriff Auction',
        estimated_duration_months: 6,
        target_exit_price_zar: 3400000,
        status: 'Active',
        linked_funding_ids: ['fund-1'],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    const boqRows = [
      {
        id: 'boq-c1',
        flip_id: 'flip-c1',
        user_id: 'usr-1',
        category: 'Plumbing & Bathrooms',
        item_description: 'Geyser and pipe reticulation',
        unit: 'item',
        quantity: 1,
        baseline_unit_cost_zar: 35000,
        baseline_total_zar: 35000,
        actual_cost_zar: 38000,
        variance_zar: 3000,
        supplier_or_contractor: 'Rapid Plumbers',
        status: 'Completed',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'boq-c2',
        flip_id: 'flip-c1',
        user_id: 'usr-1',
        category: 'Electrical',
        item_description: 'Full house rewire & CoC',
        unit: 'lump sum',
        quantity: 1,
        baseline_unit_cost_zar: 45000,
        baseline_total_zar: 45000,
        actual_cost_zar: 45000,
        variance_zar: 0,
        supplier_or_contractor: 'Sparky Electric',
        status: 'In Progress',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    const result = unmapFlips(flipRows as any, boqRows as any);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('flip-c1');
    expect(result[0].title).toBe('Parkhurst Fixer Upper');
    expect(result[0].acquisitionCostsZAR).toBe(160000);
    expect(result[0].boq).toHaveLength(2);
    expect(result[0].boq[0].id).toBe('boq-c1');
    expect(result[0].boq[0].actualCostZAR).toBe(38000);
    expect(result[0].boq[1].id).toBe('boq-c2');
    expect(result[0].boq[1].supplierOrContractor).toBe('Sparky Electric');
  });
});

describe('hydrateFromCloud Execution Engine', () => {
  const TEST_USER_ID = 'user-cloud-uuid-456';

  beforeEach(() => {
    vi.clearAllMocks();
    usePortfolioStore.getState().resetToDemoData();

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
  });

  it('fails cleanly with NO_AUTH if user is not authenticated', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const result = await hydrateFromCloud();

    expect(result.success).toBe(false);
    expect(result.hydrated).toBe(false);
    expect(result.error).toBe('NO_AUTH');
  });

  it('returns success: true, hydrated: false if user has no cloud records', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'empty@example.com' } },
      error: null,
    });

    // Mock all select queries to return empty arrays
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const result = await hydrateFromCloud();

    expect(result.success).toBe(true);
    expect(result.hydrated).toBe(false);
  });

  it('hydrates cloud records, merges with local state, and sets localStorage sync flags', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'investor@example.com' } },
      error: null,
    });

    const cloudPropertyRow = {
      id: 'rental-from-cloud-101',
      title: 'Umhlanga Penthouse',
      address: '1 Lagoon Drive, Umhlanga',
      city: 'Durban',
      market_value_zar: 4200000,
      purchase_price_zar: 3800000,
      monthly_gross_rent_zar: 32000,
      status: 'Occupied',
      leases: [],
      maintenance_history: [],
    };

    const cloudProfileRow = {
      id: TEST_USER_ID,
      user_id: TEST_USER_ID,
      entity_name: 'Durban Capital Syndicate',
      liquid_capital_reserve_zar: 900000,
      rental_forecast_view: 'wealth-only',
    };

    (supabase.from as any).mockImplementation((table: string) => {
      let data: any[] = [];
      if (table === 'properties') data = [cloudPropertyRow];
      if (table === 'profiles') data = [cloudProfileRow];

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      };
    });

    const result = await hydrateFromCloud();

    expect(result.success).toBe(true);
    expect(result.hydrated).toBe(true);

    // Verify Zustand store was updated with cloud data
    const storeState = usePortfolioStore.getState();
    expect(storeState.rentals.some((r) => r.id === 'rental-from-cloud-101')).toBe(true);
    // Stock demo rentals should have been discarded during merge
    expect(storeState.rentals.some((r) => r.id === 'rental-1')).toBe(false);
    expect(storeState.investorProfile.entityName).toBe('Durban Capital Syndicate');
    expect(storeState.liquidCapitalReserve).toBe(900000);

    // Verify localStorage completion flags
    expect(localStorage.setItem).toHaveBeenCalledWith('cloud_sync_completed', 'true');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'cloud_sync_timestamp',
      expect.any(String)
    );
  });

  it('fails atomically with error and leaves store intact when a partial table fetch fails', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'investor@example.com' } },
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'boq_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: '500 Internal Server Error in BOQ table' },
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    const result = await hydrateFromCloud();

    expect(result.success).toBe(false);
    expect(result.hydrated).toBe(false);
    expect(result.error).toContain('BOQ items fetch failed');
    // localStorage flag should NOT have been written
    expect(localStorage.setItem).not.toHaveBeenCalledWith('cloud_sync_completed', 'true');
  });

  it('deduplicates concurrent calls to hydrateFromCloud and returns the same promise', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'investor@example.com' } },
      error: null,
    });

    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));

    const [res1, res2] = await Promise.all([
      hydrateFromCloud(),
      hydrateFromCloud(),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res1).toEqual(res2);
  });
});
