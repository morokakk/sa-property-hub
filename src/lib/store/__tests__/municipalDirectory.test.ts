import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';

describe('usePortfolioStore - Municipal Contacts Directory', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('pre-seeds the directory with major South African municipalities', () => {
    const store = usePortfolioStore.getState();
    const directory = store.municipalDirectory;

    expect(directory).toBeDefined();
    expect(directory.length).toBeGreaterThanOrEqual(8);

    const codes = directory.map((m) => m.shortCode);
    expect(codes).toContain('COJ');
    expect(codes).toContain('CPT');
    expect(codes).toContain('ETH');
    expect(codes).toContain('TSH');
    expect(codes).toContain('EKU');
    expect(codes).toContain('PLK');
    expect(codes).toContain('MAN');
    expect(codes).toContain('NMB');

    // Verify key emails
    const coj = directory.find((m) => m.shortCode === 'COJ');
    expect(coj?.revenueEmail).toBe('regionbrevenue@joburg.org.za');

    const cpt = directory.find((m) => m.shortCode === 'CPT');
    expect(cpt?.revenueEmail).toBe('accounts@capetown.gov.za');

    const eth = directory.find((m) => m.shortCode === 'ETH');
    expect(eth?.revenueEmail).toBe('revline@durban.gov.za');

    const plk = directory.find((m) => m.shortCode === 'PLK');
    expect(plk?.revenueEmail).toBe('billingc@polokwane.gov.za');
  });

  it('adds a custom municipal contact to directory', () => {
    const store = usePortfolioStore.getState();

    store.addMunicipalContact({
      municipalityName: 'Stellenbosch Municipality',
      shortCode: 'WC024',
      revenueEmail: 'customercare@stellenbosch.gov.za',
      phone: '021 808 8111',
      notes: 'Cape Winelands billing enquiries and meter audit desk.',
    });

    const updated = usePortfolioStore.getState().municipalDirectory;
    const added = updated.find((m) => m.shortCode === 'WC024');

    expect(added).toBeDefined();
    expect(added?.revenueEmail).toBe('customercare@stellenbosch.gov.za');
    expect(added?.isCustom).toBe(true);
  });

  it('updates an existing municipal contact', () => {
    const store = usePortfolioStore.getState();
    const coj = store.municipalDirectory.find((m) => m.shortCode === 'COJ');
    expect(coj).toBeDefined();

    store.updateMunicipalContact(coj!.id, {
      revenueEmail: 'customercare@joburg.org.za',
      phone: '0860 000 111',
      notes: 'Updated contact routing for 2026',
    });

    const updated = usePortfolioStore.getState().municipalDirectory;
    const updatedCoj = updated.find((m) => m.id === coj!.id);

    expect(updatedCoj?.revenueEmail).toBe('customercare@joburg.org.za');
    expect(updatedCoj?.phone).toBe('0860 000 111');
    expect(updatedCoj?.notes).toBe('Updated contact routing for 2026');
  });

  it('deletes a municipal contact', () => {
    const store = usePortfolioStore.getState();
    const initialCount = store.municipalDirectory.length;
    const target = store.municipalDirectory[0];

    store.deleteMunicipalContact(target.id);

    const updated = usePortfolioStore.getState().municipalDirectory;
    expect(updated.length).toBe(initialCount - 1);
    expect(updated.some((m) => m.id === target.id)).toBe(false);
  });

  it('resets municipal directory to default pre-seeded contacts', () => {
    const store = usePortfolioStore.getState();

    // Delete one and add custom
    store.deleteMunicipalContact(store.municipalDirectory[0].id);
    store.addMunicipalContact({
      municipalityName: 'Test Local Council',
      shortCode: 'TST',
      revenueEmail: 'test@council.gov.za',
    });

    expect(usePortfolioStore.getState().municipalDirectory.some((m) => m.shortCode === 'TST')).toBe(true);

    // Reset
    store.resetMunicipalDirectory();

    const resetDir = usePortfolioStore.getState().municipalDirectory;
    expect(resetDir.length).toBe(8);
    expect(resetDir.some((m) => m.shortCode === 'TST')).toBe(false);
    expect(resetDir.some((m) => m.shortCode === 'COJ')).toBe(true);
  });
});
