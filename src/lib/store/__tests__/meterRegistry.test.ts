import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';

describe('usePortfolioStore - Property Meter Registry', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('initializes with pre-seeded meter registry for single and multi-tenant rentals', () => {
    const store = usePortfolioStore.getState();

    // 1. Single-unit property: Sandhurst Suite (rental-1)
    const sandhurst = store.rentals.find((r) => r.id === 'rental-1');
    expect(sandhurst?.meterRegistry).toBeDefined();
    expect(sandhurst?.meterRegistry?.length).toBe(2);

    const sandhurstWater = sandhurst?.meterRegistry?.find((m) => m.utilityType === 'water');
    expect(sandhurstWater?.meterNumber).toBe('211001886');
    expect(sandhurstWater?.meterType).toBe('council_main');

    const sandhurstElec = sandhurst?.meterRegistry?.find((m) => m.utilityType === 'electricity');
    expect(sandhurstElec?.meterNumber).toBe('10003374');
    expect(sandhurstElec?.meterType).toBe('council_main');

    // 2. Multi-tenant property: 42 Kruger St (rental-4)
    const kruger = store.rentals.find((r) => r.id === 'rental-4');
    expect(kruger?.meterRegistry).toBeDefined();
    expect(kruger?.meterRegistry?.length).toBeGreaterThanOrEqual(5);

    // Verify both council mains and unit sub-meters exist
    const councilMains = kruger?.meterRegistry?.filter((m) => m.meterType === 'council_main');
    expect(councilMains?.length).toBe(2);

    const subMeters = kruger?.meterRegistry?.filter((m) => m.meterType === 'sub_meter');
    expect(subMeters?.length).toBeGreaterThanOrEqual(3);

    // Verify sub-meter unit assignments
    const mainHouseMeter = subMeters?.find((m) => m.unitName === 'Main House');
    expect(mainHouseMeter?.meterNumber).toBe('SUB-ELEC-4A');
    expect(mainHouseMeter?.tenantId).toBe('lease-4a');

    const cottageAMeter = subMeters?.find((m) => m.unitName === 'Cottage A (backyard)');
    expect(cottageAMeter?.meterNumber).toBe('SUB-ELEC-4B');
    expect(cottageAMeter?.tenantId).toBe('lease-4b');
  });

  it('adds a new property meter to registry', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-1';

    store.addPropertyMeter(rentalId, {
      meterNumber: 'SOLAR-GEN-01',
      utilityType: 'electricity',
      meterType: 'sub_meter',
      unitName: 'Suite 4B Inverter',
      location: 'Rooftop solar DB',
      notes: 'Dedicated PV solar bidirectional generation sub-meter',
    });

    const updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const addedMeter = updatedRental?.meterRegistry?.find((m) => m.meterNumber === 'SOLAR-GEN-01');

    expect(addedMeter).toBeDefined();
    expect(addedMeter?.id).toContain('reg-m-');
    expect(addedMeter?.meterType).toBe('sub_meter');
    expect(addedMeter?.location).toBe('Rooftop solar DB');
    expect(addedMeter?.createdAt).toBeDefined();
  });

  it('updates an existing property meter in registry', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-2'; // Umhlanga Ridge
    const rental = store.rentals.find((r) => r.id === rentalId);
    const existingMeter = rental?.meterRegistry?.[0];
    expect(existingMeter).toBeDefined();

    store.updatePropertyMeter(rentalId, existingMeter!.id, {
      meterNumber: 'ETH-W-NEW-9988',
      location: 'Relocated to boundary pillar box',
      notes: 'Council technician swapped meter unit on 01 Oct 2026',
    });

    const updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    const updatedMeter = updatedRental?.meterRegistry?.find((m) => m.id === existingMeter!.id);

    expect(updatedMeter?.meterNumber).toBe('ETH-W-NEW-9988');
    expect(updatedMeter?.location).toBe('Relocated to boundary pillar box');
    expect(updatedMeter?.notes).toContain('technician swapped meter');
  });

  it('deletes a property meter from registry', () => {
    const store = usePortfolioStore.getState();
    const rentalId = 'rental-3'; // Green Point
    const rental = store.rentals.find((r) => r.id === rentalId);
    const initialCount = rental?.meterRegistry?.length || 0;
    expect(initialCount).toBeGreaterThan(0);

    const targetId = rental!.meterRegistry![0].id;
    store.deletePropertyMeter(rentalId, targetId);

    const updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === rentalId);
    expect(updatedRental?.meterRegistry?.length).toBe(initialCount - 1);
    expect(updatedRental?.meterRegistry?.some((m) => m.id === targetId)).toBe(false);
  });
});
