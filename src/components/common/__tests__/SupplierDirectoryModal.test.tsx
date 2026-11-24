import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  SupplierDirectoryModal,
  SUPPLIER_CATEGORIES,
} from '../SupplierDirectoryModal';
import { AddBOQItemModal } from '@/components/flips/modals/AddBOQItemModal';
import { MaintenanceModal } from '@/components/rentals/modals/MaintenanceModal';
import { INITIAL_SUPPLIERS, INITIAL_RENTALS } from '@/lib/store/initialData';

describe('SupplierDirectoryModal & Cross-Module Supplier Integrations', () => {
  it('exposes all 9 canonical LocalSupplier categories including Paint & Finishes, Maintenance & Handyman, and Professional / Consultant', () => {
    expect(SUPPLIER_CATEGORIES).toHaveLength(9);
    expect(SUPPLIER_CATEGORIES).toEqual(
      expect.arrayContaining([
        'General Building Merchant',
        'Hardware & Timber',
        'Plumbing Supplies',
        'Electrical Supplies',
        'Tiles & Sanitary',
        'Paint & Finishes',
        'Specialist Contractor',
        'Maintenance & Handyman',
        'Professional / Consultant',
      ])
    );
  });

  it('renders mobile-safe header, CSV export, email/account/rating/CoC badges, and Call/WhatsApp actions when open', () => {
    const rawHtml = renderToString(
      <SupplierDirectoryModal
        isOpen={true}
        onClose={vi.fn()}
        suppliers={INITIAL_SUPPLIERS}
      />
    );
    const html = rawHtml.replace(/<!--\s*-->/g, '');

    expect(html).toContain('SA Supplier &amp; Contractor Book');
    expect(html).toContain('data-testid="supplier-export-csv-btn"');
    expect(html).toContain('Export CSV');
    expect(html).toContain('data-testid="supplier-add-toggle-btn"');
    expect(html).toContain('Add Supplier');
    expect(html).not.toContain('+ Add Supplier');
    expect(html).toContain('aria-label="Close dialog"');

    // Card metadata & 1-tap actions
    expect(html).toContain('sandton@builders.co.za');
    expect(html).toContain('Acct: BW-90234');
    expect(html).toContain('CoC / NHBRC');
    expect(html).toContain('5.0');
    expect(html).toContain('data-testid="supplier-phone"');
    expect(html).toContain('whitespace-nowrap');
    expect(html).toContain('href="tel:+27118975000"');
    expect(html).toContain('href="https://wa.me/27829901122"');
  });

  it('returns empty output when SupplierDirectoryModal is closed', () => {
    const html = renderToString(
      <SupplierDirectoryModal
        isOpen={false}
        onClose={vi.fn()}
        suppliers={INITIAL_SUPPLIERS}
      />
    );
    expect(html).toBe('');
  });

  it('deduplicates Builders Warehouse Sandton inside AddBOQItemModal supplier datalist', () => {
    const html = renderToString(
      <AddBOQItemModal
        isOpen={true}
        onClose={vi.fn()}
        suppliers={INITIAL_SUPPLIERS}
      />
    );

    expect(html).toContain('list="flip-boq-supplier-list"');
    expect(html).toContain('<datalist id="flip-boq-supplier-list">');

    const matches = html.match(/<option value="Builders Warehouse Sandton"/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).toContain('<option value="Saint-Gobain Gyproc"');
  });

  it('renders Manage Suppliers trigger inside MaintenanceModal when onOpenSuppliers is provided', () => {
    const html = renderToString(
      <MaintenanceModal
        isOpen={true}
        property={INITIAL_RENTALS[0]}
        onClose={vi.fn()}
        onOpenSuppliers={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="maintenance-manage-suppliers-btn"');
    expect(html).toContain('Manage Suppliers');
    expect(html).toContain('id="maintenance-supplier-list"');
  });
});
