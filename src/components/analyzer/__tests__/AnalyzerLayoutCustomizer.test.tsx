import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AnalyzerLayoutCustomizer, { ANALYZER_SECTION_METADATA } from '../AnalyzerLayoutCustomizer';
import { AnalyzerSectionId } from '@/types';
import { DEFAULT_ANALYZER_SECTION_ORDER } from '@/lib/store/initialData';

describe('AnalyzerLayoutCustomizer Component', () => {
  const defaultProps = {
    sectionOrder: [...DEFAULT_ANALYZER_SECTION_ORDER],
    hiddenSections: [] as AnalyzerSectionId[],
    onToggleVisibility: vi.fn(),
    onMoveSection: vi.fn(),
    onApplyPreset: vi.fn(),
    activeOverrides: {},
    isDistressedSource: false,
    strategy: 'Rental' as const,
  };

  it('contains metadata for all 9 analyzer sections', () => {
    const keys = Object.keys(ANALYZER_SECTION_METADATA);
    expect(keys).toHaveLength(9);
    for (const id of DEFAULT_ANALYZER_SECTION_ORDER) {
      expect(ANALYZER_SECTION_METADATA[id]).toBeDefined();
      expect(ANALYZER_SECTION_METADATA[id].label.length).toBeGreaterThan(0);
      expect(ANALYZER_SECTION_METADATA[id].description.length).toBeGreaterThan(0);
    }
  });

  it('renders Customize Layout trigger button in default full layout', () => {
    const html = renderToString(<AnalyzerLayoutCustomizer {...defaultProps} />);
    expect(html).toContain('Customize Layout');
    expect(html).not.toContain('Layout (');
    expect(html).not.toContain('Active override hidden');
  });

  it('displays count badge when sections are hidden', () => {
    const html = renderToString(
      <AnalyzerLayoutCustomizer
        {...defaultProps}
        hiddenSections={['scorecard', 'pieActRisk']}
      />
    );
    expect(html).toContain('Customize Layout');
    expect(html).toContain('Layout (7/9)');
  });

  it('displays amber active override badge on header button when a hidden section has active override', () => {
    const html = renderToString(
      <AnalyzerLayoutCustomizer
        {...defaultProps}
        hiddenSections={['auctionDistressed']}
        activeOverrides={{
          auctionDistressed: { active: true, label: 'Auction Fee: R 143,750' },
        }}
      />
    );
    expect(html).toContain('Active override hidden');
    expect(html).toContain('ring-amber-400');
  });
});
