import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';

describe('usePortfolioStore - Municipal Meter Reading Disputes', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('initializes with sample dispute on Umhlanga Ridge Coastal Vista', () => {
    const store = usePortfolioStore.getState();
    const umhlanga = store.rentals.find((r) => r.id === 'rental-2');

    expect(umhlanga).toBeDefined();
    const disputeReading = umhlanga?.meterReadings?.find((m) => m.isDisputed);
    expect(disputeReading).toBeDefined();
    expect(disputeReading?.utilityType).toBe('electricity');
    expect(disputeReading?.disputeStatus).toBe('Open / Lodged');
    expect(disputeReading?.disputeReferenceNumber).toBe('ETH-2026-88192');
    expect(disputeReading?.disputedMunicipalReadingValue).toBe(28410);
    expect(disputeReading?.readingValue).toBe(28260);
    expect(disputeReading?.disputeDifferenceConsumption).toBe(150);
    expect(disputeReading?.disputeEstimatedRandImpactZAR).toBe(459.38);
  });

  it('updates a meter reading with dispute data', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-1'; // Houghton Estate Villa
    const rental = store.rentals.find((r) => r.id === rentalId);
    expect(rental).toBeDefined();

    // Pick an existing reading or create one
    const reading = rental?.meterReadings?.[0];
    expect(reading).toBeDefined();

    store.updateMeterReadingDispute(rentalId, reading!.id, {
      isDisputed: true,
      disputeStatus: 'Open / Lodged',
      disputeReason: 'council_over_estimate',
      disputeReferenceNumber: 'COJ-2026-9901',
      disputedMunicipalReadingValue: 2500,
      disputeDifferenceConsumption: 50,
      disputeEffectiveTariffPerUnit: 35.5,
      disputeEstimatedRandImpactZAR: 1775,
      disputeLodgedDate: '2026-09-27',
      disputeResolutionNotes: 'Council estimated 2500 KL, dial physically reads 2450 KL.',
    });

    const updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const updatedReading = updatedRental?.meterReadings?.find((m) => m.id === reading!.id);

    expect(updatedReading?.isDisputed).toBe(true);
    expect(updatedReading?.disputeStatus).toBe('Open / Lodged');
    expect(updatedReading?.disputeReferenceNumber).toBe('COJ-2026-9901');
    expect(updatedReading?.disputeEstimatedRandImpactZAR).toBe(1775);
    expect(updatedReading?.disputeDifferenceConsumption).toBe(50);
  });

  it('updates dispute lifecycle through Investigation and Resolved status', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-2';
    const rental = store.rentals.find((r) => r.id === rentalId);
    const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
    expect(disputeReading).toBeDefined();

    // Progress to Under Investigation
    store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
      disputeStatus: 'Under Investigation',
      disputeResolutionNotes: 'Inspector dispatched on 28 Sept.',
    });

    let updatedReading = usePortfolioStore
      .getState()
      .rentals.find((r) => r.id === rentalId)
      ?.meterReadings?.find((m) => m.id === disputeReading!.id);

    expect(updatedReading?.disputeStatus).toBe('Under Investigation');
    expect(updatedReading?.disputeResolutionNotes).toBe('Inspector dispatched on 28 Sept.');

    // Progress to Resolved
    store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
      disputeStatus: 'Resolved',
      disputeResolutionNotes: 'Council credited R 459.38 on October tax invoice.',
    });

    updatedReading = usePortfolioStore
      .getState()
      .rentals.find((r) => r.id === rentalId)
      ?.meterReadings?.find((m) => m.id === disputeReading!.id);

    expect(updatedReading?.disputeStatus).toBe('Resolved');
    expect(updatedReading?.disputeResolutionNotes).toBe(
      'Council credited R 459.38 on October tax invoice.'
    );
  });

  it('sets and toggles statement tenantBillingMethod', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-2';
    const rental = store.rentals.find((r) => r.id === rentalId);
    const statement = rental?.utilityStatements?.[0];
    expect(statement).toBeDefined();

    // Set to independent_actuals
    store.setStatementTenantBillingMethod(rentalId, statement!.id, 'independent_actuals');
    let updatedStatement = usePortfolioStore
      .getState()
      .rentals.find((r) => r.id === rentalId)
      ?.utilityStatements?.find((s) => s.id === statement!.id);
    expect(updatedStatement?.tenantBillingMethod).toBe('independent_actuals');

    // Switch to municipal_statement
    store.setStatementTenantBillingMethod(rentalId, statement!.id, 'municipal_statement');
    updatedStatement = usePortfolioStore
      .getState()
      .rentals.find((r) => r.id === rentalId)
      ?.utilityStatements?.find((s) => s.id === statement!.id);
    expect(updatedStatement?.tenantBillingMethod).toBe('municipal_statement');
  });
});
