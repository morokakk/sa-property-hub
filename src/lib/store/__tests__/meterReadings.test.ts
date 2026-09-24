import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { UtilityStatement } from '@/types';

describe('usePortfolioStore - Meter Readings Actions', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('adds a manual meter reading and sorts chronologically descending', () => {
    const rentalId = 'rental-1';
    const store = usePortfolioStore.getState();

    store.addMeterReading(rentalId, {
      date: '2026-05-01',
      utilityType: 'water',
      readingValue: 2010.5,
      previousReadingValue: 1977.0,
      consumption: 33.5,
      meterNumber: '211001886',
      readingType: 'Actual',
      source: 'manual',
      notes: 'On-site quarterly check',
    });

    const updatedRental = usePortfolioStore
      .getState()
      .rentals.find((r) => r.id === rentalId);

    expect(updatedRental?.meterReadings).toBeDefined();
    expect(updatedRental?.meterReadings?.[0]?.readingValue).toBe(2010.5);
    expect(updatedRental?.meterReadings?.[0]?.date).toBe('2026-05-01');
    expect(updatedRental?.meterReadings?.[0]?.source).toBe('manual');
    expect(updatedRental?.meterReadings?.[0]?.consumption).toBe(33.5);
  });

  it('deletes a meter reading by id', () => {
    const rentalId = 'rental-1';
    const store = usePortfolioStore.getState();

    store.addMeterReading(rentalId, {
      date: '2026-05-15',
      utilityType: 'electricity',
      readingValue: 40000,
      source: 'manual',
    });

    let rental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const addedReading = rental?.meterReadings?.find((m) => m.readingValue === 40000);
    expect(addedReading).toBeDefined();

    store.deleteMeterReading(rentalId, addedReading!.id);

    rental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const deletedReading = rental?.meterReadings?.find((m) => m.id === addedReading!.id);
    expect(deletedReading).toBeUndefined();
  });

  it('auto-appends extractedMeterReadings when adding a utility statement', () => {
    const rentalId = 'rental-1';
    const store = usePortfolioStore.getState();

    const mockStatement: UtilityStatement = {
      id: `util-test-${Date.now()}`,
      statementDate: '2026-08-07',
      billingPeriod: 'September 2026',
      provider: 'City of Johannesburg',
      electricityZAR: 0,
      waterZAR: 1634.74,
      refuseZAR: 583.05,
      sewerageZAR: 890.65,
      propertyRatesZAR: 2373.36,
      totalDueZAR: 5481.8,
      parsedVia: 'regex-fallback',
      extractedMeterReadings: [
        {
          date: '2026-08-07',
          utilityType: 'water',
          readingValue: 2083,
          previousReadingValue: 2053,
          consumption: 30,
          meterNumber: '211001886',
          readingType: 'Actual',
          source: 'pdf-extracted',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    store.addUtilityStatement(rentalId, mockStatement);

    const rental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const autoExtracted = rental?.meterReadings?.find(
      (m) => m.date === '2026-08-07' && m.readingValue === 2083
    );

    expect(autoExtracted).toBeDefined();
    expect(autoExtracted?.source).toBe('pdf-extracted');
    expect(autoExtracted?.meterNumber).toBe('211001886');
    expect(autoExtracted?.consumption).toBe(30);

    // Re-adding the same statement should not duplicate the reading
    store.addUtilityStatement(rentalId, mockStatement);
    const countOfMatches = rental?.meterReadings?.filter(
      (m) => m.date === '2026-08-07' && m.readingValue === 2083
    ).length;
    expect(countOfMatches).toBe(1);
  });
});
