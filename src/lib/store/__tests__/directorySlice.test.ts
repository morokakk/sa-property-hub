import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { INITIAL_SUPPLIERS } from '../initialData';
import { LocalSupplier } from '@/types';

describe('DirectorySlice - Suppliers Actions', () => {
  beforeEach(() => {
    // Ensure clean state before each test
  });

  it('adds, updates, and deletes a supplier successfully', () => {
    const newSupplier: LocalSupplier = {
      id: 'test-sup-1',
      name: 'Original Hardware Co',
      category: 'Hardware & Timber',
      branchLocation: 'Centurion',
      contactPerson: 'Johan Smith',
      phone: '+27 12 345 6789',
      discountTerms: '5% Cash Discount',
      hasCoC: false,
      rating: 5,
    };

    // 1. Add Supplier
    usePortfolioStore.getState().addSupplier(newSupplier);
    let currentSuppliers = usePortfolioStore.getState().suppliers;
    const added = currentSuppliers.find((s) => s.id === 'test-sup-1');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Original Hardware Co');
    expect(added?.contactPerson).toBe('Johan Smith');

    // 2. Update Supplier with partial updates
    usePortfolioStore.getState().updateSupplier('test-sup-1', {
      name: 'Updated Hardware Solutions',
      contactPerson: 'Sarah Naidoo',
      discountTerms: '10% Trade Net 30',
      hasCoC: true,
    });

    currentSuppliers = usePortfolioStore.getState().suppliers;
    const updated = currentSuppliers.find((s) => s.id === 'test-sup-1');
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Updated Hardware Solutions');
    expect(updated?.contactPerson).toBe('Sarah Naidoo');
    expect(updated?.discountTerms).toBe('10% Trade Net 30');
    expect(updated?.hasCoC).toBe(true);
    // Unchanged fields preserved
    expect(updated?.branchLocation).toBe('Centurion');
    expect(updated?.phone).toBe('+27 12 345 6789');
    expect(updated?.category).toBe('Hardware & Timber');

    // 3. Delete Supplier
    usePortfolioStore.getState().deleteSupplier('test-sup-1');
    currentSuppliers = usePortfolioStore.getState().suppliers;
    expect(currentSuppliers.find((s) => s.id === 'test-sup-1')).toBeUndefined();
  });

  it('importPortfolioJSON preserves INITIAL_SUPPLIERS on legacy backups omitting suppliers and restores explicit suppliers arrays', () => {
    const legacyOk = usePortfolioStore
      .getState()
      .importPortfolioJSON(JSON.stringify({ rentals: [] }));
    expect(legacyOk).toBe(true);
    expect(usePortfolioStore.getState().suppliers).toEqual(INITIAL_SUPPLIERS);

    const customSupplier: LocalSupplier = {
      id: 'sup-json-1',
      name: 'Cape Paint Depot',
      category: 'Paint & Finishes',
      branchLocation: 'Woodstock',
      phone: '021 444 0000',
      rating: 4,
    };
    const explicitOk = usePortfolioStore
      .getState()
      .importPortfolioJSON(JSON.stringify({ rentals: [], suppliers: [customSupplier] }));
    expect(explicitOk).toBe(true);
    expect(usePortfolioStore.getState().suppliers).toEqual([customSupplier]);
  });
});
