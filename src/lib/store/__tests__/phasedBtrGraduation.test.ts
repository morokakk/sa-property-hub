import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePortfolioStore } from '../usePortfolioStore';
import { INITIAL_FLIPS } from '../initialData';
import { DEMO_BOQ_IDS, DEMO_FLIP_IDS } from '@/lib/db/mergePortfolioState';
import { mapFlips } from '@/lib/db/migrateToCloud';
import { unmapFlips } from '@/lib/db/hydrateFromCloud';
import { FlipProjectHeader } from '@/components/flips/FlipProjectHeader';
import { FlipToRentalModal } from '@/components/flips/modals/FlipToRentalModal';

describe('Phased Multi-Unit Graduation (Build-to-Rent) & Tembisa Seed', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('includes the Tembisa 8-Unit Backroom Conversion (BTR) seed project with realistic BOQ & Township Infill zoning', () => {
    const seedFlip = INITIAL_FLIPS.find((f) => f.id === 'flip-btr-tembisa');
    expect(seedFlip).toBeDefined();
    expect(seedFlip?.title).toBe('Tembisa 8-Unit Backroom Conversion (BTR)');
    expect(seedFlip?.province).toBe('Gauteng');
    expect(seedFlip?.propertyType).toBe('Freehold House');
    expect(seedFlip?.projectStrategy).toBe('build_to_rent');
    expect(seedFlip?.numberOfUnits).toBe(8);
    expect(seedFlip?.floorAreaSqm).toBe(210);
    expect(seedFlip?.purchasePriceZAR).toBe(480_000);
    expect(seedFlip?.acquisitionCostsZAR).toBe(24_500);
    expect(seedFlip?.baselineRenovationBudgetZAR).toBe(520_000);
    expect(seedFlip?.targetExitPriceZAR).toBe(1_350_000);
    expect(seedFlip?.estimatedDurationMonths).toBe(5);
    expect(seedFlip?.monthlyHoldingCostZAR).toBe(3_200);
    expect(seedFlip?.status).toBe('Active');

    expect(seedFlip?.zoningProfile).toMatchObject({
      currentZoning: 'Unzoned / Township Scheme',
      erfSizeSqm: 400,
      farRatio: 1.2,
      coveragePercent: 60,
      maxHeightStoreys: 2,
      maxDensityDuPerHa: 120,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: true,
        backyardMicroUnitsPermitted: true,
        studentCommuneConsent: false,
        homeEnterprisePermitted: true,
      },
    });

    const totalBaseline = (seedFlip?.boq || []).reduce((sum, item) => sum + item.baselineTotalZAR, 0);
    const totalActual = (seedFlip?.boq || []).reduce((sum, item) => sum + item.actualCostZAR, 0);
    expect(totalBaseline).toBe(520_000);
    expect(totalActual).toBe(310_000);
    expect((seedFlip?.boq || []).every((item) => item.retentionPercent === 0)).toBe(true);

    expect(DEMO_FLIP_IDS.has('flip-btr-tembisa')).toBe(true);
    for (const item of seedFlip?.boq || []) {
      expect(DEMO_BOQ_IDS.has(item.id)).toBe(true);
    }
  });

  it('graduates Phase 1 (4 of 8 units) into Rentals with prepaid sub-meters while keeping Tembisa Active in Flips', () => {
    const initialRentalCount = usePortfolioStore.getState().rentals.length;

    const phase1Rental = usePortfolioStore.getState().convertFlipToRental({
      flipId: 'flip-btr-tembisa',
      initialGrossRentZAR: 14_000,
      marketValuationZAR: 1_350_000,
      unitsToGraduateNow: 4,
      loanTermYears: 15,
    });

    const state = usePortfolioStore.getState();
    expect(state.rentals.length).toBe(initialRentalCount + 1);
    expect(phase1Rental.numberOfUnits).toBe(4);
    expect(phase1Rental.monthlyGrossRentZAR).toBe(14_000);
    expect(phase1Rental.leases).toHaveLength(4);
    expect(phase1Rental.leases?.map((l) => l.unitName)).toEqual([
      'Unit 1',
      'Unit 2',
      'Unit 3',
      'Unit 4',
    ]);
    expect(phase1Rental.leases?.every((l) => l.utilityType === 'prepaid_submeter')).toBe(true);
    expect(phase1Rental.leases?.every((l) => l.status === 'Vacant')).toBe(true);
    expect(
      phase1Rental.leases?.reduce((sum, l) => sum + l.monthlyRentZAR, 0)
    ).toBe(14_000);

    const updatedFlip = state.flips.find((f) => f.id === 'flip-btr-tembisa');
    expect(updatedFlip?.status).toBe('Active');
    expect(updatedFlip?.graduatedUnitsCount).toBe(4);
    expect(updatedFlip?.linkedRentalPropertyId).toBe(phase1Rental.id);
    expect(updatedFlip?.convertedToRentalId).toBeUndefined();
  });

  it('graduates Phase 2 (remaining 4 units) into the same RentalProperty without overwriting Unit 1-4 tenants and archives the flip', () => {
    const phase1Rental = usePortfolioStore.getState().convertFlipToRental({
      flipId: 'flip-btr-tembisa',
      initialGrossRentZAR: 14_000,
      marketValuationZAR: 1_350_000,
      unitsToGraduateNow: 4,
      loanTermYears: 15,
    });
    const rentalCountAfterPhase1 = usePortfolioStore.getState().rentals.length;

    // Onboard live tenants into Unit 1 and Unit 2 during Phase 2 construction
    const updatedPhase1Leases = (phase1Rental.leases || []).map((lease) => {
      if (lease.unitName === 'Unit 1') {
        return {
          ...lease,
          tenantName: 'Thabo Mokoena',
          status: 'Occupied' as const,
          monthlyRentZAR: 3_600,
        };
      }
      if (lease.unitName === 'Unit 2') {
        return {
          ...lease,
          tenantName: 'Nomsa Dlamini',
          status: 'Occupied' as const,
          monthlyRentZAR: 3_600,
        };
      }
      return lease;
    });

    usePortfolioStore.getState().updateRental(phase1Rental.id, {
      leases: updatedPhase1Leases,
    });

    // Graduate remaining 4 units
    const mergedRental = usePortfolioStore.getState().convertFlipToRental({
      flipId: 'flip-btr-tembisa',
      initialGrossRentZAR: 14_800,
      marketValuationZAR: 1_400_000,
      unitsToGraduateNow: 4,
      loanTermYears: 15,
    });

    const state = usePortfolioStore.getState();
    // Same title deed: must reuse existing RentalProperty ID and not create a second rental record
    expect(state.rentals.length).toBe(rentalCountAfterPhase1);
    expect(mergedRental.id).toBe(phase1Rental.id);
    expect(mergedRental.numberOfUnits).toBe(8);
    expect(mergedRental.leases).toHaveLength(8);
    expect(mergedRental.leases?.map((l) => l.unitName)).toEqual([
      'Unit 1',
      'Unit 2',
      'Unit 3',
      'Unit 4',
      'Unit 5',
      'Unit 6',
      'Unit 7',
      'Unit 8',
    ]);

    // Existing occupied leases in Phase 1 must remain intact
    const unit1 = mergedRental.leases?.find((l) => l.unitName === 'Unit 1');
    const unit2 = mergedRental.leases?.find((l) => l.unitName === 'Unit 2');
    expect(unit1?.tenantName).toBe('Thabo Mokoena');
    expect(unit1?.status).toBe('Occupied');
    expect(unit1?.monthlyRentZAR).toBe(3_600);
    expect(unit2?.tenantName).toBe('Nomsa Dlamini');
    expect(unit2?.status).toBe('Occupied');
    expect(unit2?.monthlyRentZAR).toBe(3_600);

    // Newly appended Units 5..8 must default to prepaid_submeter and Vacant
    const phase2Units = mergedRental.leases?.slice(4) || [];
    expect(phase2Units).toHaveLength(4);
    expect(phase2Units.every((l) => l.utilityType === 'prepaid_submeter')).toBe(true);
    expect(phase2Units.every((l) => l.status === 'Vacant')).toBe(true);
    expect(phase2Units.reduce((sum, l) => sum + l.monthlyRentZAR, 0)).toBe(14_800);

    // Status, Section 13sex eligibility, market valuation, and gross rent reconciled
    expect(mergedRental.status).toBe('Partially Vacant');
    expect(mergedRental.section13SexEligible).toBe(true);
    expect(mergedRental.marketValueZAR).toBe(1_400_000);
    // Preserves live Unit 1 & 2 rent increases (3,600*2) + Unit 3 & 4 (3,500*2) + Phase 2 (14,800) = 29,000
    expect(mergedRental.monthlyGrossRentZAR).toBe(29_000);
    expect((mergedRental.totalCapitalDeployedZAR || 0) > 0).toBe(true);

    // Flip is now cleanly closed and archived
    const archivedFlip = state.flips.find((f) => f.id === 'flip-btr-tembisa');
    expect(archivedFlip?.status).toBe('Completed');
    expect(archivedFlip?.graduatedUnitsCount).toBe(8);
    expect(archivedFlip?.linkedRentalPropertyId).toBe(phase1Rental.id);
    expect(archivedFlip?.convertedToRentalId).toBe(phase1Rental.id);
  });

  it('persists phased BTR metadata across Supabase cloud mapping round-trips and resets cleanly on reopenFlip', () => {
    const phase1Rental = usePortfolioStore.getState().convertFlipToRental({
      flipId: 'flip-btr-tembisa',
      initialGrossRentZAR: 14_000,
      marketValuationZAR: 1_350_000,
      unitsToGraduateNow: 4,
    });

    const activePartialFlip = usePortfolioStore
      .getState()
      .flips.find((f) => f.id === 'flip-btr-tembisa')!;
    const mapped = mapFlips([activePartialFlip], 'user-1');
    const [roundTripped] = unmapFlips(mapped as any);

    expect(roundTripped.graduatedUnitsCount).toBe(4);
    expect(roundTripped.linkedRentalPropertyId).toBe(phase1Rental.id);
    expect(roundTripped.zoningProfile?.erfSizeSqm).toBe(400);

    usePortfolioStore.getState().reopenFlip('flip-btr-tembisa');
    const reopened = usePortfolioStore
      .getState()
      .flips.find((f) => f.id === 'flip-btr-tembisa');
    expect(reopened?.status).toBe('Active');
    expect(reopened?.graduatedUnitsCount).toBeUndefined();
    expect(reopened?.linkedRentalPropertyId).toBeUndefined();
    expect(
      usePortfolioStore.getState().rentals.some((r) => r.id === phase1Rental.id)
    ).toBe(false);
  });

  it('renders phased BTR progress badge and exit button label in FlipProjectHeader and phased helper UI in FlipToRentalModal', () => {
    usePortfolioStore.getState().convertFlipToRental({
      flipId: 'flip-btr-tembisa',
      initialGrossRentZAR: 14_000,
      marketValuationZAR: 1_350_000,
      unitsToGraduateNow: 4,
    });

    const partialFlip = usePortfolioStore
      .getState()
      .flips.find((f) => f.id === 'flip-btr-tembisa')!;

    const headerHtml = renderToStaticMarkup(
      React.createElement(FlipProjectHeader, {
        flip: partialFlip,
        onUpdatePhase: () => {},
        onOpenEdit: () => {},
        onOpenExit: () => {},
        onOpenConvert: () => {},
      })
    );

    expect(headerHtml).toContain('PHASED BTR: 4/8 UNITS LIVE IN RENTALS');
    expect(headerHtml).toContain('Graduate Remaining (4) Units');

    const freshFlip = INITIAL_FLIPS.find((f) => f.id === 'flip-btr-tembisa')!;
    const modalHtmlInitial = renderToStaticMarkup(
      React.createElement(FlipToRentalModal, {
        isOpen: true,
        flip: freshFlip,
        totalAllInCostZAR: 814_500,
        onClose: () => {},
        onConverted: () => {},
      })
    );

    expect(modalHtmlInitial).toContain('Units Graduating in This Phase');
    expect(modalHtmlInitial).toContain('First Half (4 Units)');
    expect(modalHtmlInitial).toContain('All Remaining (8 Units)');

    const modalHtmlPhase2 = renderToStaticMarkup(
      React.createElement(FlipToRentalModal, {
        isOpen: true,
        flip: partialFlip,
        totalAllInCostZAR: 814_500,
        onClose: () => {},
        onConverted: () => {},
      })
    );

    expect(modalHtmlPhase2).toContain('All Remaining (4 Units)');
  });
});
