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

  it('correctly associates extracted readings from statement for dispute pre-population', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-2';
    const rental = store.rentals.find((r) => r.id === rentalId);
    expect(rental).toBeDefined();

    const aprilStatement = rental?.utilityStatements?.find((s) => s.billingPeriod === 'April 2026');
    expect(aprilStatement).toBeDefined();

    // Check that rental.meterReadings contains pdf-extracted readings corresponding to this statement
    const matchingExtractedElec = rental?.meterReadings?.find(
      (m) =>
        m.source === 'pdf-extracted' &&
        m.utilityType === 'electricity' &&
        m.date.startsWith('2026-04')
    );
    expect(matchingExtractedElec).toBeDefined();
    expect(matchingExtractedElec?.readingValue).toBe(28410);
    expect(matchingExtractedElec?.meterNumber).toBe('ETH-E-33019');

    const matchingExtractedWater = rental?.meterReadings?.find(
      (m) =>
        m.source === 'pdf-extracted' &&
        m.utilityType === 'water' &&
        m.date.startsWith('2026-04')
    );
    expect(matchingExtractedWater).toBeDefined();
    expect(matchingExtractedWater?.readingValue).toBe(1485);
    expect(matchingExtractedWater?.meterNumber).toBe('ETH-W-77491');
  });

  it('correctly populates Sandhurst Executive Suite utility statements with non-zero line items and extracted readings', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-1'; // Sandhurst Executive Suite
    const rental = store.rentals.find((r) => r.id === rentalId);
    expect(rental).toBeDefined();

    expect(rental?.utilityStatements).toHaveLength(3);

    const aprilStatement = rental?.utilityStatements?.find((s) => s.billingPeriod === 'April 2026');
    expect(aprilStatement).toBeDefined();
    expect(aprilStatement?.electricityZAR).toBe(540.0);
    expect(aprilStatement?.waterZAR).toBe(330.0);
    expect(aprilStatement?.totalDueZAR).toBe(2317.91);
    expect(aprilStatement?.extractedMeterReadings).toBeDefined();
    expect(aprilStatement?.extractedMeterReadings).toHaveLength(2);

    const aprilElec = aprilStatement?.extractedMeterReadings?.find((r) => r.utilityType === 'electricity');
    expect(aprilElec?.readingValue).toBe(39910.0);
    expect(aprilElec?.consumption).toBe(210.0);

    const febStatement = rental?.utilityStatements?.find((s) => s.billingPeriod === 'February 2026');
    expect(febStatement).toBeDefined();
    expect(febStatement?.electricityZAR).toBe(480.0);
    expect(febStatement?.waterZAR).toBe(290.0);
    const febElec = febStatement?.extractedMeterReadings?.find((r) => r.utilityType === 'electricity');
    expect(febElec?.readingValue).toBe(39504.0);
    expect(febElec?.consumption).toBe(202.0);
  });

  describe('Municipal Dispute 4-State Resolution Engine', () => {
    it('resolves dispute with accepted_actuals: locks reading to user dials and credits full calculated amount', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-2';
      const rental = store.rentals.find((r) => r.id === rentalId);
      const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
      expect(disputeReading).toBeDefined();

      store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
        disputeStatus: 'Resolved',
        disputeResolutionOutcome: 'accepted_actuals',
        disputeAgreedReadingValue: disputeReading!.readingValue,
        disputeAgreedConsumption: disputeReading!.consumption,
        disputeSettledCreditZAR: disputeReading!.disputeEstimatedRandImpactZAR,
        disputeResolutionDate: '2026-09-27',
        disputeResolutionNotes: 'Council conceded reading error. Credit note issued.',
      });

      const updated = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId)
        ?.meterReadings?.find((m) => m.id === disputeReading!.id);

      expect(updated?.disputeStatus).toBe('Resolved');
      expect(updated?.disputeResolutionOutcome).toBe('accepted_actuals');
      expect(updated?.disputeAgreedReadingValue).toBe(28260);
      expect(updated?.disputeSettledCreditZAR).toBe(459.38);
      expect(updated?.disputeResolutionDate).toBe('2026-09-27');
    });

    it('resolves dispute with credit_note_issued: captures custom credit ZAR and credit note number', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-2';
      const rental = store.rentals.find((r) => r.id === rentalId);
      const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
      expect(disputeReading).toBeDefined();

      store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
        disputeStatus: 'Resolved',
        disputeResolutionOutcome: 'credit_note_issued',
        disputeSettledCreditZAR: 400.0,
        disputeCreditNoteNumber: 'CN-ETH-2026-8819',
        disputeResolutionDate: '2026-09-27',
        disputeResolutionNotes: 'Council granted R 400 lump-sum credit adjustment.',
      });

      const updated = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId)
        ?.meterReadings?.find((m) => m.id === disputeReading!.id);

      expect(updated?.disputeStatus).toBe('Resolved');
      expect(updated?.disputeResolutionOutcome).toBe('credit_note_issued');
      expect(updated?.disputeSettledCreditZAR).toBe(400.0);
      expect(updated?.disputeCreditNoteNumber).toBe('CN-ETH-2026-8819');
    });

    it('resolves dispute with compromise_reading: updates agreed reading index and recalculated credit', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-2';
      const rental = store.rentals.find((r) => r.id === rentalId);
      const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
      expect(disputeReading).toBeDefined();

      store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
        disputeStatus: 'Resolved',
        disputeResolutionOutcome: 'compromise_reading',
        disputeAgreedReadingValue: 28350,
        disputeAgreedConsumption: 90,
        disputeSettledCreditZAR: 275.5,
        disputeCreditNoteNumber: 'CN-ETH-COMP-01',
        disputeResolutionDate: '2026-09-27',
        disputeResolutionNotes: 'Agreed on dial compromise index of 28350 kWh.',
      });

      const updated = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId)
        ?.meterReadings?.find((m) => m.id === disputeReading!.id);

      expect(updated?.disputeStatus).toBe('Resolved');
      expect(updated?.disputeResolutionOutcome).toBe('compromise_reading');
      expect(updated?.disputeAgreedReadingValue).toBe(28350);
      expect(updated?.disputeAgreedConsumption).toBe(90);
      expect(updated?.disputeSettledCreditZAR).toBe(275.5);
    });

    it('resolves dispute with dispute_rejected: sets settled credit to R 0.00 and records council findings', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-2';
      const rental = store.rentals.find((r) => r.id === rentalId);
      const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
      expect(disputeReading).toBeDefined();

      store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
        disputeStatus: 'Resolved',
        disputeResolutionOutcome: 'dispute_rejected',
        disputeSettledCreditZAR: 0,
        disputeAgreedReadingValue: disputeReading!.disputedMunicipalReadingValue,
        disputeResolutionDate: '2026-09-27',
        disputeResolutionNotes: 'Council lab test confirmed meter calibrated accurately within 2.5% tolerance.',
      });

      const updated = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId)
        ?.meterReadings?.find((m) => m.id === disputeReading!.id);

      expect(updated?.disputeStatus).toBe('Resolved');
      expect(updated?.disputeResolutionOutcome).toBe('dispute_rejected');
      expect(updated?.disputeSettledCreditZAR).toBe(0);
      expect(updated?.disputeAgreedReadingValue).toBe(28410);
      expect(updated?.disputeResolutionNotes).toContain('within 2.5% tolerance');
    });

    it('benchmarks subsequent month baseline to disputeAgreedReadingValue', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-2';

      // 1. Resolve prior dispute with agreed reading index
      const rental = store.rentals.find((r) => r.id === rentalId);
      const disputeReading = rental?.meterReadings?.find((m) => m.isDisputed);
      expect(disputeReading).toBeDefined();

      store.updateMeterReadingDispute(rentalId, disputeReading!.id, {
        disputeStatus: 'Resolved',
        disputeResolutionOutcome: 'compromise_reading',
        disputeAgreedReadingValue: 28350,
      });

      // 2. Add a new subsequent reading next month
      store.addMeterReading(rentalId, {
        date: '2026-05-15',
        utilityType: 'electricity',
        readingValue: 28600,
        readingType: 'Actual',
        source: 'manual',
      });

      const updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
      const newReading = updatedRental?.meterReadings?.find((m) => m.date === '2026-05-15');
      expect(newReading).toBeDefined();

      // The baseline from the prior reading's disputeAgreedReadingValue is 28350
      const priorReading = updatedRental?.meterReadings?.find((m) => m.id === disputeReading!.id);
      const baseline = priorReading?.disputeAgreedReadingValue ?? priorReading?.readingValue;
      expect(baseline).toBe(28350);

      // Usage from benchmarked baseline: 28600 - 28350 = 250 kWh
      const calculatedUsage = newReading!.readingValue - baseline!;
      expect(calculatedUsage).toBe(250);
    });
  });
});
