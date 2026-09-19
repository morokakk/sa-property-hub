import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { ExtractedRentalUnit } from '@/types';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';

describe('usePortfolioStore reconcileImportedRentals', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('intelligently matches an existing rental property and updates financial/tenant fields while preserving historical data', () => {
    const state = usePortfolioStore.getState();
    const existing = state.rentals[0];
    const initialCount = state.rentals.length;

    // Add a maintenance log to existing unit to verify history is preserved
    state.addMaintenanceLog(existing.id, {
      dateLogged: '2026-01-15',
      issueDescription: 'Geyser replacement',
      category: 'Plumbing',
      contractorName: 'Rapid Response',
      costZAR: 8500,
      status: 'Resolved',
    });

    const updatedExisting = usePortfolioStore.getState().rentals.find((r) => r.id === existing.id)!;
    expect(updatedExisting.maintenanceHistory.length).toBeGreaterThan(0);

    const extractedUnit: ExtractedRentalUnit = {
      propertyName: existing.title, // Exact title match
      propertyAddress: existing.address,
      grossRentZAR: 19500, // updated rent
      leviesZAR: 2300,     // updated levies
      municipalRatesZAR: 1450, // updated rates
      agencyCommissionZAR: 1560, // updated agent fee
      netPayoutZAR: 14190,
      tenantName: 'Updated Tenant Name',
      leaseEndDate: '2027-06-30',
      managingAgent: 'Pam Golding',
      statementDate: '2026-08-31',
    };

    const result = usePortfolioStore.getState().reconcileImportedRentals([extractedUnit]);

    expect(result.updatedCount).toBe(1);
    expect(result.addedCount).toBe(0);
    expect(usePortfolioStore.getState().rentals.length).toBe(initialCount);

    const reconciled = usePortfolioStore.getState().rentals.find((r) => r.id === existing.id)!;
    // Updated fields
    expect(reconciled.monthlyGrossRentZAR).toBe(19500);
    expect(reconciled.monthlyLeviesZAR).toBe(2300);
    expect(reconciled.monthlyRatesTaxesZAR).toBe(1450);
    expect(reconciled.monthlyAgentFeeZAR).toBe(1560);
    expect(reconciled.tenantName).toBe('Updated Tenant Name');
    expect(reconciled.leaseEndDate).toBe('2027-06-30');

    // Preserved fields
    expect(reconciled.id).toBe(existing.id);
    expect(reconciled.purchasePriceZAR).toBe(existing.purchasePriceZAR);
    expect(reconciled.marketValueZAR).toBe(existing.marketValueZAR);
    expect(reconciled.outstandingBondBalanceZAR).toBe(existing.outstandingBondBalanceZAR);
    expect(reconciled.maintenanceHistory).toHaveLength(updatedExisting.maintenanceHistory.length);
  });

  it('matches properties flexibly with partial address/title normalization', () => {
    const state = usePortfolioStore.getState();
    const existing = state.rentals[0];

    // e.g. title is "Sandton Skye Unit 402", statement says "Unit 402 Sandton Skye" or includes the title
    const extractedUnit: ExtractedRentalUnit = {
      propertyName: `The ${existing.title} Complex`,
      propertyAddress: existing.address,
      grossRentZAR: 22000,
      netPayoutZAR: 18000,
      tenantName: 'Fuzzy Matched Tenant',
    };

    const result = usePortfolioStore.getState().reconcileImportedRentals([extractedUnit]);
    expect(result.updatedCount).toBe(1);

    const reconciled = usePortfolioStore.getState().rentals.find((r) => r.id === existing.id)!;
    expect(reconciled.monthlyGrossRentZAR).toBe(22000);
    expect(reconciled.tenantName).toBe('Fuzzy Matched Tenant');
  });

  it('appends a brand new rental property when no existing match is found', () => {
    const initialCount = usePortfolioStore.getState().rentals.length;

    const brandNewUnit: ExtractedRentalUnit = {
      propertyName: 'Brand New Unit 99',
      propertyAddress: '99 Nonexistent Ave, Umhlanga',
      grossRentZAR: 16500,
      leviesZAR: 1900,
      municipalRatesZAR: 1200,
      agencyCommissionZAR: 1320,
      netPayoutZAR: 12080,
      tenantName: 'Sarah Jenkins',
      leaseEndDate: '2027-12-31',
      managingAgent: 'Trafalgar Property',
      statementDate: '2026-08-31',
    };

    const result = usePortfolioStore.getState().reconcileImportedRentals([brandNewUnit]);

    expect(result.updatedCount).toBe(0);
    expect(result.addedCount).toBe(1);
    expect(usePortfolioStore.getState().rentals.length).toBe(initialCount + 1);

    const created = usePortfolioStore.getState().rentals.find((r) => r.title === 'Brand New Unit 99')!;
    expect(created).toBeDefined();
    expect(created.monthlyGrossRentZAR).toBe(16500);
    expect(created.monthlyLeviesZAR).toBe(1900);
    expect(created.monthlyRatesTaxesZAR).toBe(1200);
    expect(created.monthlyAgentFeeZAR).toBe(1320);
    expect(created.tenantName).toBe('Sarah Jenkins');
    expect(created.agencyName).toBe('Trafalgar Property');
    expect(created.status).toBe('Occupied');
  });

  it('processes a mixed batch with both updates and new additions atomically', () => {
    const state = usePortfolioStore.getState();
    const existing = state.rentals[0];
    const initialCount = state.rentals.length;

    const batch: ExtractedRentalUnit[] = [
      {
        propertyName: existing.title,
        grossRentZAR: 25000,
        netPayoutZAR: 21000,
      },
      {
        propertyName: 'Wholly Unique Building 101',
        grossRentZAR: 14000,
        netPayoutZAR: 11000,
      },
    ];

    const result = usePortfolioStore.getState().reconcileImportedRentals(batch);

    expect(result.updatedCount).toBe(1);
    expect(result.addedCount).toBe(1);
    expect(usePortfolioStore.getState().rentals.length).toBe(initialCount + 1);
  });

  it('respects custom estimatedMarketValueZAR and purchasePriceZAR overrides during import', () => {
    const brandNewWithValuation: ExtractedRentalUnit = {
      propertyName: 'Kew House Custom Val',
      grossRentZAR: 10000,
      estimatedMarketValueZAR: 1250000,
      purchasePriceZAR: 1100000,
      netPayoutZAR: 8500,
    };

    usePortfolioStore.getState().reconcileImportedRentals([brandNewWithValuation]);

    const created = usePortfolioStore.getState().rentals.find((r) => r.title === 'Kew House Custom Val')!;
    expect(created).toBeDefined();
    // Must use custom values, not the default 120x (1,200,000) or 110x (1,100,000)
    expect(created.marketValueZAR).toBe(1250000);
    expect(created.purchasePriceZAR).toBe(1100000);
  });

  it('correctly handles VAT-inclusive agent commission without double-taxation (R850.54 with R110.94 VAT yields R851, not R976)', () => {
    const clearwaterUnit: ExtractedRentalUnit = {
      propertyName: 'Clearwater Village 128',
      grossRentZAR: 6900,
      leviesZAR: 477.07,
      municipalRatesZAR: 1021.0,
      agencyCommissionZAR: 850.54,
      agencyCommissionVatZAR: 110.94,
      isCommissionInclusiveOfVat: true,
      estimatedMarketValueZAR: 828000,
      netPayoutZAR: 5525.03,
      tenantName: 'Bongani June Mwale',
      managingAgent: 'iGrow Rentals / WeconnectU',
    };

    usePortfolioStore.getState().reconcileImportedRentals([clearwaterUnit]);

    const property = usePortfolioStore.getState().rentals.find((r) => r.title === 'Clearwater Village 128')!;
    expect(property).toBeDefined();

    // Pre-VAT base commission percent should be (850.54 - 110.94) / 6900 = 739.60 / 6900 = ~10.72%
    expect(property.agencyCommissionPercent).toBeCloseTo(10.72, 1);
    expect(property.agencyVatApplicable).toBe(true);
    expect(property.monthlyAgentFeeZAR).toBe(851);

    // Verify cash flow calculation produces R 851, NOT the double-taxed R 976
    const cashflow = calculateRentalCashflow(property);
    expect(cashflow.agencyCommissionZAR).toBe(851);
    expect(cashflow.agencyCommissionZAR).not.toBe(976);
  });
});
