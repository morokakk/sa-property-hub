import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FlipProjectHeader } from '../FlipProjectHeader';
import { FlipProjectModal } from '../modals/FlipProjectModal';
import { INITIAL_FLIPS } from '@/lib/store/initialData';
import { FlipProject, ZoningProfile } from '@/types';
import { ZoningEnvelopeSubPanel } from '@/components/analyzer/ZoningEnvelopeSubPanel';

describe('Context-Aware Progressive Disclosure for Zoning in Flips & Analyzer', () => {
  const sampleZoning: ZoningProfile = {
    currentZoning: 'Residential 1',
    erfSizeSqm: 1000,
    farRatio: 0.5,
    coveragePercent: 50,
    maxHeightStoreys: 2,
    maxDensityDuPerHa: 10,
    requiresRezoning: false,
    consentUses: {
      secondDwellingPermitted: true,
      studentCommuneConsent: false,
      backyardMicroUnitsPermitted: false,
      homeEnterprisePermitted: true,
    },
  };

  const baseFlip: FlipProject = {
    ...INITIAL_FLIPS[0],
    zoningProfile: sampleZoning,
  };

  describe('FlipProjectHeader Pill (Conditional)', () => {
    it('renders compact zoning badge when propertyType is Freehold House and zoningProfile is defined', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Freehold House',
        zoningProfile: sampleZoning,
      };

      const html = renderToString(
        <FlipProjectHeader
          flip={flip}
          onUpdatePhase={vi.fn()}
          onOpenEdit={vi.fn()}
          onOpenExit={vi.fn()}
          onOpenConvert={vi.fn()}
        />
      );

      expect(html).toContain('Residential 1 (As-of-Right)');
      expect(html).toContain('FAR: 0.5');
      expect(html).toContain('Coverage: 50%');
      expect(html).toContain('Consent: 2nd Dwelling');
    });

    it('renders zoning badge for multi-unit flip project', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Townhouse / Cluster',
        numberOfUnits: 4,
        zoningProfile: sampleZoning,
      };

      const html = renderToString(
        <FlipProjectHeader
          flip={flip}
          onUpdatePhase={vi.fn()}
          onOpenEdit={vi.fn()}
          onOpenExit={vi.fn()}
          onOpenConvert={vi.fn()}
        />
      );

      expect(html).toContain('Residential 1 (As-of-Right)');
    });

    it('renders zoning badge for build_to_rent flip project', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Townhouse / Cluster',
        projectStrategy: 'build_to_rent',
        zoningProfile: sampleZoning,
      };

      const html = renderToString(
        <FlipProjectHeader
          flip={flip}
          onUpdatePhase={vi.fn()}
          onOpenEdit={vi.fn()}
          onOpenExit={vi.fn()}
          onOpenConvert={vi.fn()}
        />
      );

      expect(html).toContain('Residential 1 (As-of-Right)');
    });

    it('hides zoning badge when zoningProfile is undefined', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Freehold House',
        zoningProfile: undefined,
      };

      const html = renderToString(
        <FlipProjectHeader
          flip={flip}
          onUpdatePhase={vi.fn()}
          onOpenEdit={vi.fn()}
          onOpenExit={vi.fn()}
          onOpenConvert={vi.fn()}
        />
      );

      expect(html).not.toContain('🏛️');
    });

    it('hides zoning badge on cosmetic Sectional Title single-unit flip even if zoningProfile was populated', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Sectional Title Apartment',
        projectStrategy: 'flip_for_sale',
        numberOfUnits: 1,
        zoningProfile: sampleZoning,
      };

      const html = renderToString(
        <FlipProjectHeader
          flip={flip}
          onUpdatePhase={vi.fn()}
          onOpenEdit={vi.fn()}
          onOpenExit={vi.fn()}
          onOpenConvert={vi.fn()}
        />
      );

      expect(html).not.toContain('🏛️ Residential 1');
    });
  });

  describe('FlipProjectModal (Progressive Disclosure)', () => {
    it('shows collapsible Municipal Zoning drawer when projectStrategy is build_to_rent', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Freehold House',
        projectStrategy: 'build_to_rent',
        numberOfUnits: 1,
      };

      const html = renderToString(
        <FlipProjectModal
          isOpen={true}
          editingFlip={flip}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Municipal Zoning &amp; Multi-Let Consent Rights (Optional)');
      expect(html).toContain('Res 1 (FAR 0.5)');
      expect(html).toContain('Res 3 (40 du/ha)');
      expect(html).toContain('Res 4 (80 du/ha)');
      expect(html).toContain('Township Infill');
      expect(html).toContain('2nd Dwelling / Cottage');
      expect(html).toContain('Backyard Micro-Units');
      expect(html).toContain('Student Commune');
    });

    it('shows collapsible Municipal Zoning drawer when units > 1 and propertyType is not Sectional Title', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Freehold House',
        projectStrategy: 'flip_for_sale',
        numberOfUnits: 4,
      };

      const html = renderToString(
        <FlipProjectModal
          isOpen={true}
          editingFlip={flip}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Municipal Zoning &amp; Multi-Let Consent Rights (Optional)');
    });

    it('strictly hides Municipal Zoning drawer when propertyType is Sectional Title Apartment even if units > 1', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Sectional Title Apartment',
        projectStrategy: 'build_to_rent',
        numberOfUnits: 6,
      };

      const html = renderToString(
        <FlipProjectModal
          isOpen={true}
          editingFlip={flip}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).not.toContain('Municipal Zoning &amp; Multi-Let Consent Rights (Optional)');
    });

    it('hides Municipal Zoning drawer on standard single-unit cosmetic flip (units = 1, flip_for_sale)', () => {
      const flip: FlipProject = {
        ...baseFlip,
        propertyType: 'Freehold House',
        projectStrategy: 'flip_for_sale',
        numberOfUnits: 1,
        zoningProfile: undefined,
      };

      const html = renderToString(
        <FlipProjectModal
          isOpen={true}
          editingFlip={flip}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).not.toContain('Municipal Zoning &amp; Multi-Let Consent Rights (Optional)');
    });
  });

  describe('ZoningEnvelopeSubPanel Component Behavior', () => {
    it('respects defaultOpen=false by remaining collapsed', () => {
      const html = renderToString(
        <ZoningEnvelopeSubPanel
          zoningProfile={sampleZoning}
          onUpdateZoning={vi.fn()}
          onApplyPreset={vi.fn()}
          plannedBuildableSqm={320}
          plannedUnits={1}
          isCollapsible={true}
          defaultOpen={false}
        />
      );

      // When collapsed, the subpanel envelope results and inputs are not rendered
      expect(html).toContain('Municipal Zoning Rights &amp; Bulk Envelope');
      expect(html).toContain('Edit Parameters ▾');
      expect(html).not.toContain('Statutory Bulk Envelope Result');
    });

    it('respects defaultOpen=true by rendering expanded contents', () => {
      const html = renderToString(
        <ZoningEnvelopeSubPanel
          zoningProfile={sampleZoning}
          onUpdateZoning={vi.fn()}
          onApplyPreset={vi.fn()}
          plannedBuildableSqm={320}
          plannedUnits={1}
          isCollapsible={true}
          defaultOpen={true}
        />
      );

      expect(html).toContain('Municipal Zoning Rights &amp; Bulk Envelope');
      expect(html).toContain('Hide Controls ▴');
      expect(html).toContain('Max Permitted Bulk:');
      expect(html).toContain('Floor Area Ratio (FAR)');
    });
  });
});
