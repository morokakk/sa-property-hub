import { describe, it, expect } from 'vitest';
import {
  mergePortfolioState,
  PortfolioStateSnapshot,
} from '../mergePortfolioState';
import {
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
  RentalProperty,
  FlipProject,
  FundingSource,
  TaskItem,
  LocalSupplier,
} from '@/types';

describe('mergePortfolioState Engine', () => {
  const mockCloudRental: RentalProperty = {
    id: 'rental-cloud-1',
    title: 'Cloud Sunset Heights',
    address: '100 Beach Road, Sea Point',
    city: 'Cape Town',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 3500000,
    purchasePriceZAR: 3000000,
    purchaseDate: '2023-01-01',
    outstandingBondBalanceZAR: 1800000,
    bondInterestRatePercent: 11.25,
    monthlyBondPaymentZAR: 19500,
    monthlyGrossRentZAR: 26000,
    monthlyLeviesZAR: 3200,
    monthlyRatesTaxesZAR: 1800,
    monthlyAgentFeeZAR: 2080,
    monthlyMaintenanceReserveZAR: 1000,
    status: 'Occupied',
    leases: [],
    maintenanceHistory: [],
  };

  const mockCloudFlip: FlipProject = {
    id: 'flip-cloud-1',
    title: 'Cloud Camps Bay Renovation',
    address: '50 Victoria Road, Camps Bay',
    city: 'Cape Town',
    purchaseDate: '2025-01-01',
    purchasePriceZAR: 4500000,
    acquisitionCostsZAR: 350000,
    baselineRenovationBudgetZAR: 800000,
    targetExitPriceZAR: 7200000,
    targetCompletionDate: '2025-06-01',
    currentPhase: 'Acquisition & Conveyancing',
    status: 'Active',
    linkedFundingIds: [],
    boq: [],
  };

  it('discards stock demo items from local state when merging with cloud state', () => {
    const cloudState: PortfolioStateSnapshot = {
      rentals: [mockCloudRental],
      flips: [mockCloudFlip],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      investorProfile: {
        ...INITIAL_INVESTOR_PROFILE,
        entityName: 'Cloud Capital (Pty) Ltd',
      },
    };

    const localState: PortfolioStateSnapshot = {
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      funding: INITIAL_FUNDING,
      opportunities: INITIAL_OPPORTUNITIES,
      suppliers: INITIAL_SUPPLIERS,
      tasks: INITIAL_TASKS,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    };

    const result = mergePortfolioState(cloudState, localState);

    // Stock demo rentals should be purged; only cloud rental remains
    expect(result.mergedState.rentals).toHaveLength(1);
    expect(result.mergedState.rentals[0].id).toBe('rental-cloud-1');

    // Stock demo flips should be purged; only cloud flip remains
    expect(result.mergedState.flips).toHaveLength(1);
    expect(result.mergedState.flips[0].id).toBe('flip-cloud-1');

    // Untouched demo opportunities, tasks, funding, suppliers should be discarded
    expect(result.mergedState.opportunities).toHaveLength(0);
    expect(result.mergedState.tasks).toHaveLength(0);
    expect(result.mergedState.funding).toHaveLength(0);
    expect(result.mergedState.suppliers).toHaveLength(0);

    // Since only stock demo items were in local store, hasNewLocalItems should be false
    expect(result.hasNewLocalItems).toBe(false);

    // Cloud profile takes precedence
    expect(result.mergedState.investorProfile?.entityName).toBe('Cloud Capital (Pty) Ltd');
  });

  it('preserves and appends user-created local items that do not conflict with cloud records', () => {
    const cloudState: PortfolioStateSnapshot = {
      rentals: [mockCloudRental],
      flips: [mockCloudFlip],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
    };

    const newLocalRental: RentalProperty = {
      id: 'rental-local-custom-99',
      title: 'Local Rosebank Garden Flat',
      address: '14 Oxford Road, Rosebank',
      city: 'Johannesburg',
      propertyType: 'Sectional Title Apartment',
      purchaseDate: '2024-01-01',
      marketValueZAR: 1800000,
      purchasePriceZAR: 1500000,
      outstandingBondBalanceZAR: 1000000,
      bondInterestRatePercent: 11.5,
      monthlyBondPaymentZAR: 10500,
      monthlyGrossRentZAR: 14000,
      monthlyLeviesZAR: 1500,
      monthlyRatesTaxesZAR: 900,
      monthlyAgentFeeZAR: 1120,
      monthlyMaintenanceReserveZAR: 600,
      status: 'Occupied',
      leases: [],
      maintenanceHistory: [],
    };

    const newLocalTask: TaskItem = {
      id: 'task-local-custom-88',
      title: 'Sign contractor agreement for Rosebank',
      dueDate: '2026-11-01',
      priority: 'High',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Local Rosebank Garden Flat' },
      createdAt: '2026-10-01',
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [...INITIAL_RENTALS, newLocalRental],
      flips: INITIAL_FLIPS,
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [...INITIAL_TASKS, newLocalTask],
    };

    const result = mergePortfolioState(cloudState, localState);

    // Merged rentals should have both the cloud rental and the new local rental
    expect(result.mergedState.rentals).toHaveLength(2);
    expect(result.mergedState.rentals.map((r) => r.id)).toEqual([
      'rental-cloud-1',
      'rental-local-custom-99',
    ]);

    // Tasks should have preserved the local custom task
    expect(result.mergedState.tasks).toHaveLength(1);
    expect(result.mergedState.tasks[0].id).toBe('task-local-custom-88');

    // hasNewLocalItems should be true because non-conflicting local items were added
    expect(result.hasNewLocalItems).toBe(true);
  });

  it('resolves direct conflicts (matching ID, or exact matching title/address) in favor of Cloud', () => {
    const cloudState: PortfolioStateSnapshot = {
      rentals: [mockCloudRental],
      flips: [mockCloudFlip],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
    };

    // Conflicting local rental with identical address
    const conflictingLocalRentalByAddress: RentalProperty = {
      id: 'rental-conflict-local-1',
      title: 'Different Title But Same Address',
      address: '100 Beach Road, Sea Point', // Same address as mockCloudRental
      city: 'Cape Town',
      propertyType: 'Sectional Title Apartment',
      purchaseDate: '2024-01-01',
      marketValueZAR: 9999999,
      purchasePriceZAR: 9999999,
      outstandingBondBalanceZAR: 0,
      bondInterestRatePercent: 0,
      monthlyBondPaymentZAR: 0,
      monthlyGrossRentZAR: 0,
      monthlyLeviesZAR: 0,
      monthlyRatesTaxesZAR: 0,
      monthlyAgentFeeZAR: 0,
      monthlyMaintenanceReserveZAR: 0,
      status: 'Occupied',
      leases: [],
      maintenanceHistory: [],
    };

    // Conflicting local flip with same title
    const conflictingLocalFlipByTitle: FlipProject = {
      id: 'flip-conflict-local-2',
      title: 'Cloud Camps Bay Renovation', // Same title as mockCloudFlip
      address: 'Different Street Address',
      city: 'Cape Town',
      purchaseDate: '2025-01-01',
      purchasePriceZAR: 1000000,
      acquisitionCostsZAR: 50000,
      baselineRenovationBudgetZAR: 50000,
      targetExitPriceZAR: 2000000,
      targetCompletionDate: '2025-06-01',
      currentPhase: 'Acquisition & Conveyancing',
      status: 'Active',
      linkedFundingIds: [],
      boq: [],
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [conflictingLocalRentalByAddress],
      flips: [conflictingLocalFlipByTitle],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
    };

    const result = mergePortfolioState(cloudState, localState);

    // Cloud records must win
    expect(result.mergedState.rentals).toHaveLength(1);
    expect(result.mergedState.rentals[0].id).toBe('rental-cloud-1');
    expect(result.mergedState.rentals[0].title).toBe('Cloud Sunset Heights');

    expect(result.mergedState.flips).toHaveLength(1);
    expect(result.mergedState.flips[0].id).toBe('flip-cloud-1');
    expect(result.mergedState.flips[0].address).toBe('50 Victoria Road, Camps Bay');

    // No new local items were preserved
    expect(result.hasNewLocalItems).toBe(false);
  });

  it('merges funding, opportunities, and suppliers correctly', () => {
    const cloudFunding: FundingSource = {
      id: 'fund-cloud-1',
      lenderName: 'Investec Private Bank',
      entityOrContact: 'Private Banker',
      emailPhone: 'investec@bank.co.za',
      fundingType: 'Private Lender',
      capitalAmountZAR: 2000000,
      disbursementDate: '2026-01-01',
      maturityDate: '2028-01-01',
      returnTermsType: 'Fixed Interest',
      returnRatePercent: 11.5,
      paymentSchedule: 'Monthly Interest',
      totalRepaidZAR: 100000,
      status: 'Active',
    };

    const localFundingCustom: FundingSource = {
      id: 'fund-custom-local-1',
      lenderName: 'Uncle Bob Angel Loan',
      entityOrContact: 'Bob Smith',
      emailPhone: 'bob@family.co.za',
      fundingType: 'Private Lender',
      capitalAmountZAR: 500000,
      disbursementDate: '2026-02-01',
      maturityDate: '2027-02-01',
      returnTermsType: 'Fixed Interest',
      returnRatePercent: 10.0,
      paymentSchedule: 'At Exit (Maturity)',
      totalRepaidZAR: 0,
      status: 'Active',
    };

    const localSupplierCustom: LocalSupplier = {
      id: 'sup-custom-local-1',
      name: 'Sandton Master Builders',
      category: 'General Building Merchant',
      branchLocation: 'Sandton',
      phone: '+27 11 555 4321',
      rating: 5,
    };

    const cloudState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [cloudFunding],
      opportunities: [],
      suppliers: [],
      tasks: [],
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [localFundingCustom],
      opportunities: [],
      suppliers: [localSupplierCustom],
      tasks: [],
    };

    const result = mergePortfolioState(cloudState, localState);

    expect(result.mergedState.funding).toHaveLength(2);
    expect(result.mergedState.funding.map((f) => f.id)).toEqual([
      'fund-cloud-1',
      'fund-custom-local-1',
    ]);
    expect(result.mergedState.suppliers).toHaveLength(1);
    expect(result.mergedState.suppliers[0].id).toBe('sup-custom-local-1');
    expect(result.hasNewLocalItems).toBe(true);
  });

  it('preserves modified in-flight analyzer draft during hydration instead of overwriting with cloud draft', () => {
    const cloudState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      analyzerDraft: {
        ...INITIAL_ANALYZER_DRAFT,
        purchasePrice: 1_200_000,
        openMarketValue: 1_500_000,
      },
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      analyzerDraft: {
        ...INITIAL_ANALYZER_DRAFT,
        purchasePrice: 2_950_000, // User is actively drafting a deal locally
        openMarketValue: 3_500_000,
      },
    };

    const result = mergePortfolioState(cloudState, localState);

    // Active local draft must NOT be wiped out by cloud draft
    expect(result.mergedState.analyzerDraft?.purchasePrice).toBe(2_950_000);
    expect(result.mergedState.analyzerDraft?.openMarketValue).toBe(3_500_000);
  });

  it('preserves local BYOK AI API key when cloud settings have an empty key', () => {
    const cloudState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      aiSettings: {
        provider: 'anthropic',
        apiKey: '', // Cloud profile has no key stored
        model: 'claude-3-5-sonnet',
      },
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [],
      aiSettings: {
        provider: 'anthropic',
        apiKey: 'sk-ant-my-local-secret-key-123',
        model: 'claude-3-5-sonnet',
      },
    };

    const result = mergePortfolioState(cloudState, localState);

    // Local BYOK API key should NOT be wiped out
    expect(result.mergedState.aiSettings?.apiKey).toBe('sk-ant-my-local-secret-key-123');
  });

  it('preserves tasks with identical title if they belong to different properties', () => {
    const cloudTask: TaskItem = {
      id: 'task-cloud-1',
      title: 'Call Plumber',
      dueDate: '2026-11-01',
      priority: 'High',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Sandton Executive Suite' },
      createdAt: '2026-10-01',
    };

    const localTaskDifferentProperty: TaskItem = {
      id: 'task-local-custom-2',
      title: 'Call Plumber', // Same title, but for Rosebank property
      dueDate: '2026-11-05',
      priority: 'Urgent',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Rosebank Studio Flat' },
      createdAt: '2026-10-02',
    };

    const cloudState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [cloudTask],
    };

    const localState: PortfolioStateSnapshot = {
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      suppliers: [],
      tasks: [localTaskDifferentProperty],
    };

    const result = mergePortfolioState(cloudState, localState);

    // Both tasks must be kept since they belong to different properties
    expect(result.mergedState.tasks).toHaveLength(2);
    expect(result.hasNewLocalItems).toBe(true);
  });
});
