import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RentalFormModal } from '../modals/RentalFormModal';
import { RentalCardHeader } from '../RentalCardHeader';
import { Lease, RentalProperty, ZoningProfile } from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  shouldShowRentalZoningAccordion,
  sanitizeRentalZoningForSave,
  parseLocaleDecimal,
  applyRentalZoningPreset,
  createDefaultRentalZoningProfile,
  isRentalZoningPresetActive,
  evaluateRentalDensityGuardrail,
  formatRentalZoningAccordionChip,
  formatCompactRentalZoningPill,
} from '@/lib/calculations/rentalZoning';
import { mapRentals } from '@/lib/db/migrateToCloud';
import { unmapRentals } from '@/lib/db/hydrateFromCloud';

const makeLease = (id: string, unitName: string, monthlyRentZAR = 8500): Lease => ({
  id,
  unitName,
  tenantName: 'Test Tenant',
  leaseStartDate: '2026-01-01',
  leaseEndDate: '2026-12-31',
  monthlyRentZAR,
  depositHeldZAR: monthlyRentZAR,
  annualEscalationPercent: 7,
  status: 'Occupied',
});

const sampleRes1Zoning: ZoningProfile = {
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

const makeRentalProperty = (overrides: Partial<RentalProperty> = {}): RentalProperty => ({
  id: 'rental-zoning-test-1',
  title: 'Rosebank Courtyard Multi-Let',
  address: '14 Cradock Ave',
  city: 'Johannesburg',
  province: 'Gauteng',
  propertyType: 'Freehold House',
  marketValueZAR: 2_400_000,
  purchasePriceZAR: 2_000_000,
  purchaseDate: '2025-01-01',
  outstandingBondBalanceZAR: 1_500_000,
  bondInterestRatePercent: 11.5,
  monthlyBondPaymentZAR: 15_000,
  monthlyGrossRentZAR: 18_000,
  monthlyLeviesZAR: 0,
  monthlyRatesTaxesZAR: 1_400,
  monthlyAgentFeeZAR: 0,
  monthlyMaintenanceReserveZAR: 600,
  status: 'Occupied',
  leases: [makeLease('lease-1', 'Main House', 12_000)],
  maintenanceHistory: [],
  ...overrides,
});

const baseHeaderProps = {
  grossYieldPercent: 9.0,
  onOpenEdit: vi.fn(),
  onOpenExit: vi.fn(),
  onOpenAuditHistory: vi.fn(),
  onOpenMaintenance: vi.fn(),
  onOpenMeterModal: vi.fn(),
  onDeleteProperty: vi.fn(),
};

describe('Conditional Multi-Unit Municipal Zoning in RentalFormModal & RentalCardHeader', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  describe('RentalFormModal Visibility & Progressive Disclosure (SSR)', () => {
    it('hides the zoning accordion on a 1-unit Freehold House with no saved zoningProfile', () => {
      const prop = makeRentalProperty({
        propertyType: 'Freehold House',
        leases: [makeLease('lease-1', 'Main Unit')],
        zoningProfile: undefined,
      });

      const html = renderToString(
        <RentalFormModal
          isOpen={true}
          editingProperty={prop}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).not.toContain('data-testid="rental-zoning-accordion"');
      expect(html).not.toContain('Municipal Zoning &amp; Multi-Let Consent Rights');
      // 4-section jump bar remains intact
      expect(html).toContain('1. Identity &amp; Mandate');
      expect(html).toContain('2. Valuation &amp; Bond');
      expect(html).toContain('3. Leases &amp; Compliance');
      expect(html).toContain('4. Tax &amp; Vault');
    });

    it('strictly hides the zoning accordion on Sectional Title Apartment even with >1 units and saved zoningProfile', () => {
      const prop = makeRentalProperty({
        propertyType: 'Sectional Title Apartment',
        leases: [makeLease('l1', 'Unit 1'), makeLease('l2', 'Unit 2')],
        zoningProfile: sampleRes1Zoning,
      });

      const html = renderToString(
        <RentalFormModal
          isOpen={true}
          editingProperty={prop}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).not.toContain('data-testid="rental-zoning-accordion"');
      expect(html).not.toContain('Municipal Zoning &amp; Multi-Let Consent Rights');
    });

    it('shows the collapsed zoning accordion with "Not Set" chip when >1 units on Freehold House, Townhouse / Cluster, and Multi-unit Commercial', () => {
      for (const propertyType of [
        'Freehold House',
        'Townhouse / Cluster',
        'Multi-unit Commercial',
      ] as const) {
        const prop = makeRentalProperty({
          propertyType,
          leases: [makeLease('l1', 'Unit 1'), makeLease('l2', 'Unit 2')],
          zoningProfile: undefined,
        });

        const html = renderToString(
          <RentalFormModal
            isOpen={true}
            editingProperty={prop}
            onClose={vi.fn()}
            onSave={vi.fn()}
          />
        ).replace(/<!-- -->/g, '');

        expect(html).toContain('data-testid="rental-zoning-accordion"');
        expect(html).toContain('Municipal Zoning &amp; Multi-Let Consent Rights (Optional)');
        expect(html).toContain('aria-expanded="false"');
        expect(html).toContain('Not Set');
        // Collapsed by default: presets are hidden until expanded
        expect(html).not.toContain('data-testid="rental-zoning-preset-res-1"');
      }
    });

    it('shows the collapsed zoning accordion with a live summary chip when editing a 1-unit non-Sectional Title property with existing zoningProfile', () => {
      const prop = makeRentalProperty({
        propertyType: 'Freehold House',
        leases: [makeLease('l1', 'Main House')],
        zoningProfile: sampleRes1Zoning,
      });

      const html = renderToString(
        <RentalFormModal
          isOpen={true}
          editingProperty={prop}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ).replace(/<!-- -->/g, '');

      expect(html).toContain('data-testid="rental-zoning-accordion"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('Res 1 • Consent: 2nd Dwelling');
    });

    it('renders lean expanded fields, active preset highlight, Clear Zoning link, and omits heavy bulk inputs', () => {
      const prop = makeRentalProperty({
        propertyType: 'Freehold House',
        leases: [
          makeLease('l1', 'Main House'),
          makeLease('l2', 'Cottage'),
          makeLease('l3', 'Room 3'),
        ],
        zoningProfile: {
          ...sampleRes1Zoning,
          consentUses: {
            secondDwellingPermitted: true,
            studentCommuneConsent: false,
            backyardMicroUnitsPermitted: false,
            homeEnterprisePermitted: true,
          },
        },
      });

      const html = renderToString(
        <RentalFormModal
          isOpen={true}
          editingProperty={prop}
          initialZoningExpanded={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      ).replace(/<!-- -->/g, '');

      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('data-testid="rental-zoning-clear"');
      expect(html).toContain('Clear Zoning');
      // 4 SA Quick Presets
      expect(html).toContain('data-testid="rental-zoning-preset-res-1"');
      expect(html).toContain('data-testid="rental-zoning-preset-res-3"');
      expect(html).toContain('data-testid="rental-zoning-preset-res-4"');
      expect(html).toContain('data-testid="rental-zoning-preset-township-infill"');
      // Active Res 1 preset highlight
      expect(html).toContain('bg-slate-900 text-white border-slate-900');
      // Current Zoning Code dropdown & 3 consent checkboxes
      expect(html).toContain('data-testid="rental-zoning-code-select"');
      expect(html).toContain('2nd Dwelling / Cottage');
      expect(html).toContain('Student Commune Consent');
      expect(html).toContain('Backyard Micro-Units');
      // Erf & Density inputs
      expect(html).toContain('Erf Size (m²)');
      expect(html).toContain('Max Density (du/ha)');
      // Non-blocking density guardrail triggers for 3 units on 1000m² Res 1 (cap 1, 2nd dwelling only covers up to 2)
      expect(html).toContain('data-testid="rental-zoning-density-warning"');
      expect(html).toContain('3 units modeled vs. ~1 as-of-right unit — verify Consent Use or rezoning compliance');
      // Omit heavy redevelopment bulk inputs
      expect(html).not.toContain('Floor Area Ratio (FAR)');
      expect(html).not.toContain('Coverage (%)');
      expect(html).not.toContain('Max Height (Storeys)');
      expect(html).not.toContain('Target Zoning');
    });
  });

  describe('Pure Rental Zoning Helpers & Guardrail Logic', () => {
    it('evaluates accordion visibility across unit counts and title types', () => {
      expect(shouldShowRentalZoningAccordion('Freehold House', 1, undefined)).toBe(false);
      expect(shouldShowRentalZoningAccordion('Freehold House', 2, undefined)).toBe(true);
      expect(shouldShowRentalZoningAccordion('Freehold House', 1, sampleRes1Zoning)).toBe(true);
      expect(shouldShowRentalZoningAccordion('Sectional Title Apartment', 4, sampleRes1Zoning)).toBe(false);
    });

    it('applies SA quick presets while preserving existing erfSizeSqm > 0 and highlights active preset', () => {
      const customErfExisting: ZoningProfile = {
        ...sampleRes1Zoning,
        erfSizeSqm: 1850,
      };
      const appliedRes3 = applyRentalZoningPreset('res-3', customErfExisting)!;
      expect(appliedRes3.currentZoning).toBe('Residential 3');
      expect(appliedRes3.maxDensityDuPerHa).toBe(40);
      expect(appliedRes3.erfSizeSqm).toBe(1850);
      expect(appliedRes3.consentUses.backyardMicroUnitsPermitted).toBe(true);
      expect(isRentalZoningPresetActive('res-3', appliedRes3)).toBe(true);
      expect(isRentalZoningPresetActive('res-1', appliedRes3)).toBe(false);

      // Fresh preset click uses preset default erfSizeSqm
      const freshTownship = applyRentalZoningPreset('township-infill', undefined)!;
      expect(freshTownship.currentZoning).toBe('Unzoned / Township Scheme');
      expect(freshTownship.erfSizeSqm).toBe(500);
      expect(freshTownship.maxDensityDuPerHa).toBe(200);
      expect(isRentalZoningPresetActive('township-infill', freshTownship)).toBe(true);
    });

    it('preserves hidden promoted bulk fields when updating visible fields manually', () => {
      const promotedProfile: ZoningProfile = {
        currentZoning: 'Residential 1',
        targetZoning: 'Residential 3',
        erfSizeSqm: 1200,
        farRatio: 1.15,
        coveragePercent: 55,
        maxHeightStoreys: 3,
        maxDensityDuPerHa: 40,
        requiresRezoning: true,
        consentUses: {
          secondDwellingPermitted: true,
          studentCommuneConsent: false,
          backyardMicroUnitsPermitted: false,
          homeEnterprisePermitted: true,
        },
      };

      const edited: ZoningProfile = {
        ...promotedProfile,
        erfSizeSqm: parseLocaleDecimal('1450,5')!,
        consentUses: {
          ...promotedProfile.consentUses,
          backyardMicroUnitsPermitted: true,
        },
      };

      expect(edited.erfSizeSqm).toBe(1450.5);
      expect(edited.farRatio).toBe(1.15);
      expect(edited.coveragePercent).toBe(55);
      expect(edited.maxHeightStoreys).toBe(3);
      expect(edited.targetZoning).toBe('Residential 3');
      expect(edited.requiresRezoning).toBe(true);
      expect(edited.consentUses.homeEnterprisePermitted).toBe(true);
    });

    it('safely parses locale comma decimals and rejects invalid inputs', () => {
      expect(parseLocaleDecimal('1000,5')).toBe(1000.5);
      expect(parseLocaleDecimal('12,5')).toBe(12.5);
      expect(parseLocaleDecimal(' 1 200,75 ')).toBe(1200.75);
      expect(parseLocaleDecimal('')).toBeUndefined();
      expect(parseLocaleDecimal('-10')).toBeUndefined();
      expect(parseLocaleDecimal('abc')).toBeUndefined();

      const seeded = createDefaultRentalZoningProfile({ currentZoning: 'Residential 3' });
      expect(seeded.currentZoning).toBe('Residential 3');
      expect(seeded.maxDensityDuPerHa).toBe(40);
      expect(seeded.erfSizeSqm).toBe(1500);
    });

    it('enforces tiered SA consent logic on the non-blocking density guardrail', () => {
      // Res 1: 1000m² @ 10 du/ha => statutory cap = 1 unit
      const res1NoConsent: ZoningProfile = {
        ...sampleRes1Zoning,
        consentUses: {
          secondDwellingPermitted: false,
          studentCommuneConsent: false,
          backyardMicroUnitsPermitted: false,
          homeEnterprisePermitted: false,
        },
      };

      // 2 units without consent -> warning
      const res1NoConsent2Units = evaluateRentalDensityGuardrail(res1NoConsent, 2);
      expect(res1NoConsent2Units.statutoryUnitCap).toBe(1);
      expect(res1NoConsent2Units.showWarning).toBe(true);
      expect(res1NoConsent2Units.warningMessage).toContain('2 units modeled vs. ~1 as-of-right unit');

      // 2 units WITH 2nd Dwelling consent -> covered, no warning
      const res1SecondDwelling2Units = evaluateRentalDensityGuardrail(sampleRes1Zoning, 2);
      expect(res1SecondDwelling2Units.isExceeded).toBe(true);
      expect(res1SecondDwelling2Units.isCoveredByConsent).toBe(true);
      expect(res1SecondDwelling2Units.showWarning).toBe(false);

      // 3 units with ONLY 2nd Dwelling consent -> warning (exceeds 2-unit cottage allowance)
      const res1SecondDwelling3Units = evaluateRentalDensityGuardrail(sampleRes1Zoning, 3);
      expect(res1SecondDwelling3Units.showWarning).toBe(true);

      // 4 units WITH Backyard Micro-Units or Student Commune -> covered, no warning
      const res1MicroUnits = evaluateRentalDensityGuardrail(
        {
          ...sampleRes1Zoning,
          consentUses: {
            ...sampleRes1Zoning.consentUses,
            backyardMicroUnitsPermitted: true,
          },
        },
        4
      );
      expect(res1MicroUnits.showWarning).toBe(false);

      const res1Commune = evaluateRentalDensityGuardrail(
        {
          ...sampleRes1Zoning,
          consentUses: {
            ...sampleRes1Zoning.consentUses,
            studentCommuneConsent: true,
          },
        },
        6
      );
      expect(res1Commune.showWarning).toBe(false);

      // Zero erfSizeSqm or undefined maxDensityDuPerHa -> never warn
      expect(
        evaluateRentalDensityGuardrail({ ...sampleRes1Zoning, erfSizeSqm: 0 }, 5).showWarning
      ).toBe(false);
      expect(
        evaluateRentalDensityGuardrail(
          { ...sampleRes1Zoning, maxDensityDuPerHa: undefined },
          5
        ).showWarning
      ).toBe(false);
    });

    it('strips zoningProfile on save for Sectional Title Apartment or when unset, and preserves it otherwise', () => {
      expect(sanitizeRentalZoningForSave('Freehold House', sampleRes1Zoning)).toEqual(
        sampleRes1Zoning
      );
      expect(
        sanitizeRentalZoningForSave('Sectional Title Apartment', sampleRes1Zoning)
      ).toBeUndefined();
      expect(sanitizeRentalZoningForSave('Freehold House', undefined)).toBeUndefined();
    });

    it('formats live status chips for the accordion header', () => {
      expect(formatRentalZoningAccordionChip(undefined)).toBe('Not Set');
      expect(formatRentalZoningAccordionChip(sampleRes1Zoning)).toBe(
        'Res 1 • Consent: 2nd Dwelling'
      );
      expect(
        formatRentalZoningAccordionChip({
          ...sampleRes1Zoning,
          currentZoning: 'Residential 3',
          consentUses: {
            secondDwellingPermitted: false,
            studentCommuneConsent: false,
            backyardMicroUnitsPermitted: false,
            homeEnterprisePermitted: false,
          },
        })
      ).toBe('Res 3 • As-of-Right');
      expect(
        formatRentalZoningAccordionChip({
          ...sampleRes1Zoning,
          consentUses: {
            secondDwellingPermitted: false,
            studentCommuneConsent: false,
            backyardMicroUnitsPermitted: true,
            homeEnterprisePermitted: false,
          },
        })
      ).toBe('Res 1 • Consent: Backyard Micro-Units');
    });
  });

  describe('Store Persistence & Cloud Sync Round-Trip', () => {
    it('persists zoningProfile on multi-unit Freehold rental and omits it when switched to Sectional Title Apartment', () => {
      const store = usePortfolioStore.getState();
      const rentalId = 'rental-multi-zoning-1';
      const created = makeRentalProperty({
        id: rentalId,
        propertyType: 'Freehold House',
        leases: [makeLease('l1', 'Unit 1'), makeLease('l2', 'Unit 2')],
        zoningProfile: sanitizeRentalZoningForSave('Freehold House', sampleRes1Zoning),
      });

      store.addRental(created);
      const saved = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId);
      expect(saved?.zoningProfile).toEqual(sampleRes1Zoning);

      // Cloud sync round-trip retains _zoningProfile without new SQL columns
      const mapped = mapRentals([saved!], 'user-1');
      expect((mapped[0].coc_checklist as Record<string, unknown>)._zoningProfile).toEqual(
        sampleRes1Zoning
      );
      const hydrated = unmapRentals(mapped as unknown as Parameters<typeof unmapRentals>[0]);
      expect(hydrated[0].zoningProfile).toEqual(sampleRes1Zoning);

      // Switching property to Sectional Title Apartment strips zoningProfile on save
      store.updateRental(rentalId, {
        propertyType: 'Sectional Title Apartment',
        zoningProfile: sanitizeRentalZoningForSave(
          'Sectional Title Apartment',
          sampleRes1Zoning
        ),
      });
      const updated = usePortfolioStore
        .getState()
        .rentals.find((r) => r.id === rentalId);
      expect(updated?.propertyType).toBe('Sectional Title Apartment');
      expect(updated?.zoningProfile).toBeUndefined();
    });
  });

  describe('RentalCardHeader Compact Zoning Pill', () => {
    it('renders compact zoning pill with descriptive tooltip for Freehold, Townhouse, and Commercial assets', () => {
      const prop = makeRentalProperty({
        propertyType: 'Freehold House',
        zoningProfile: {
          ...sampleRes1Zoning,
          targetZoning: 'Residential 3',
          requiresRezoning: true,
          consentUses: {
            secondDwellingPermitted: true,
            studentCommuneConsent: true,
            backyardMicroUnitsPermitted: true,
            homeEnterprisePermitted: false,
          },
        },
      });

      const pillMeta = formatCompactRentalZoningPill(prop.zoningProfile!);
      expect(pillMeta.label).toBe('Res 1 ➔ Res 3');
      expect(pillMeta.tooltip).toContain('Erf: 1');
      expect(pillMeta.tooltip).toContain('Density Cap: ~1 unit (10 du/ha)');
      expect(pillMeta.tooltip).toContain(
        'Consent Uses: 2nd Dwelling, Student Commune, Backyard Micro-Units'
      );

      const html = renderToString(
        <RentalCardHeader property={prop} {...baseHeaderProps} />
      ).replace(/<!-- -->/g, '');

      expect(html).toContain('data-testid="rental-card-zoning-pill"');
      expect(html).toContain('Res 1 ➔ Res 3');
      expect(html).not.toContain('🏛️');
      expect(html).toContain('Density Cap: ~1 unit (10 du/ha)');
    });

    it('renders Res 1 (As-of-Right) compact pill for as-of-right zoning', () => {
      const prop = makeRentalProperty({
        propertyType: 'Townhouse / Cluster',
        zoningProfile: sampleRes1Zoning,
      });

      const html = renderToString(
        <RentalCardHeader property={prop} {...baseHeaderProps} />
      ).replace(/<!-- -->/g, '');

      expect(html).toContain('data-testid="rental-card-zoning-pill"');
      expect(html).toContain('Res 1 (As-of-Right)');
      expect(html).not.toContain('🏛️');
    });

    it('hides compact zoning pill when zoningProfile is undefined or propertyType is Sectional Title Apartment', () => {
      const withoutZoning = makeRentalProperty({
        propertyType: 'Freehold House',
        zoningProfile: undefined,
      });
      const htmlWithout = renderToString(
        <RentalCardHeader property={withoutZoning} {...baseHeaderProps} />
      );
      expect(htmlWithout).not.toContain('data-testid="rental-card-zoning-pill"');
      expect(htmlWithout).not.toContain('🏛️');

      const sectionalWithZoning = makeRentalProperty({
        propertyType: 'Sectional Title Apartment',
        zoningProfile: sampleRes1Zoning,
      });
      const htmlSectional = renderToString(
        <RentalCardHeader property={sectionalWithZoning} {...baseHeaderProps} />
      );
      expect(htmlSectional).not.toContain('data-testid="rental-card-zoning-pill"');
      expect(htmlSectional).not.toContain('🏛️');
    });
  });
});
