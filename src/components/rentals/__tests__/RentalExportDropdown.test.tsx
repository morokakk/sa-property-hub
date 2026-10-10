import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import RentalExportDropdown from '../RentalExportDropdown';

describe('RentalExportDropdown Component', () => {
  it('renders closed trigger button with "Export CSV" and chevron', () => {
    const html = renderToString(
      <RentalExportDropdown
        onExportCsv={vi.fn()}
        onExportAccountantJournal={vi.fn()}
        onExportItr12={vi.fn()}
      />
    );

    expect(html).toContain('Export CSV');
    expect(html).toContain('id="rentals-export-csv-dropdown"');
    // Dropdown options should not be in the initial closed markup
    expect(html).not.toContain('Rentals Register (.csv)');
    expect(html).not.toContain('Accountant GL Journal (.csv)');
    expect(html).not.toContain('SARS ITR12 Tax Schedule (.xlsx)');
  });

  it('renders custom className when provided', () => {
    const html = renderToString(
      <RentalExportDropdown
        onExportCsv={vi.fn()}
        onExportAccountantJournal={vi.fn()}
        onExportItr12={vi.fn()}
        className="custom-export-class"
      />
    );

    expect(html).toContain('custom-export-class');
  });
});
