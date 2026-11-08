import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AnalyzerLayoutCustomizer, {
  ANALYZER_SECTION_METADATA,
  getSectionMeta,
  getSectionApplicability,
} from '../AnalyzerLayoutCustomizer';
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

  it('contains metadata for all 10 analyzer sections', () => {
    const keys = Object.keys(ANALYZER_SECTION_METADATA);
    expect(keys).toHaveLength(10);
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
    expect(html).toContain('Layout (8/10)');
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

  describe('Strategy-Aware Section Metadata (getSectionMeta)', () => {
    it('returns development-tailored labels for Development strategy', () => {
      const devCostMeta = getSectionMeta('capexRehabStack', 'Development');
      expect(devCostMeta.label).toBe('Development Cost Stack, 2-Stage Burn & Exit Mode');
      expect(devCostMeta.description).toContain('Hard build rate/m²');

      const devMortgageMeta = getSectionMeta('mortgageEngine', 'Development');
      expect(devMortgageMeta.label).toBe('Senior Development Facility & S-Curve Engine');
      expect(devMortgageMeta.description).toContain('LTC % senior facility');
    });

    it('returns rental/flip labels for non-development strategies', () => {
      const rentalCostMeta = getSectionMeta('capexRehabStack', 'Rental');
      expect(rentalCostMeta.label).toBe('Rehabilitation Capex & Exit Target');
      expect(rentalCostMeta.description).toContain('Renovation capex allowance');

      const flipMortgageMeta = getSectionMeta('mortgageEngine', 'Flip');
      expect(flipMortgageMeta.label).toBe('Mortgage Financing & Cash Deposit');
    });
  });

  describe('Context-Aware Section Applicability (getSectionApplicability)', () => {
    it('flags holdingExit as inactive in Development strategy', () => {
      const app = getSectionApplicability('holdingExit', 'Development', false);
      expect(app.isApplicable).toBe(false);
      expect(app.notice).toContain('2-Stage Burn');
    });

    it('flags vacancyAgent as inactive in 100% Build-to-Sell development', () => {
      const app = getSectionApplicability('vacancyAgent', 'Development', false, 'Build-to-Sell');
      expect(app.isApplicable).toBe(false);
      expect(app.notice).toContain('100% Build-to-Sell');

      const btrApp = getSectionApplicability('vacancyAgent', 'Development', false, 'Build-to-Rent Hold');
      expect(btrApp.isApplicable).toBe(true);
      expect(btrApp.notice).toBeNull();
    });

    it('flags opexReserves as inactive in Flip deals and Build-to-Sell developments', () => {
      const flipApp = getSectionApplicability('opexReserves', 'Flip', false);
      expect(flipApp.isApplicable).toBe(false);
      expect(flipApp.notice).toContain('Buy & Flip');

      const devBtsApp = getSectionApplicability('opexReserves', 'Development', false, 'Build-to-Sell');
      expect(devBtsApp.isApplicable).toBe(false);

      const rentalApp = getSectionApplicability('opexReserves', 'Rental', false);
      expect(rentalApp.isApplicable).toBe(true);
      expect(rentalApp.notice).toBeNull();
    });

    it('flags auctionDistressed as inactive when deal is not from an auction or repo channel', () => {
      const privateApp = getSectionApplicability('auctionDistressed', 'Rental', false);
      expect(privateApp.isApplicable).toBe(false);
      expect(privateApp.notice).toContain('Auction/Repo sources only');

      const auctionApp = getSectionApplicability('auctionDistressed', 'Rental', true);
      expect(auctionApp.isApplicable).toBe(true);
      expect(auctionApp.notice).toBeNull();
    });
  });
});
