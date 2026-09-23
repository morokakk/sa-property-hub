import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { FlipProject, FundingSource } from '@/types';

describe('BRRRR Transition & Rental Refinance Workflow', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('converts an active Flip to a Rental with total accumulated cost as capital basis', () => {
    const store = usePortfolioStore.getState();

    // Create a known test flip
    const testFlipId = `flip-brrrr-test-${Date.now()}`;
    const testFlip: FlipProject = {
      id: testFlipId,
      title: 'Kloof Street Victorian Reno (Flip)',
      address: '42 Kloof Street, Gardens',
      city: 'Cape Town',
      propertyType: 'Freehold House',
      purchaseDate: '2026-01-15',
      purchasePriceZAR: 2_000_000,
      acquisitionCostsZAR: 150_000,
      baselineRenovationBudgetZAR: 400_000,
      estimatedDurationMonths: 6,
      monthlyHoldingCostZAR: 15_000,
      monthlyBondPaymentZAR: 10_000,
      monthlyLeviesZAR: 0,
      monthlyRatesTaxesZAR: 3_000,
      monthlyOtherHoldingCostZAR: 2_000,
      targetExitPriceZAR: 3_200_000,
      targetCompletionDate: '2026-07-15',
      currentPhase: 'Finishes & Tiling',
      status: 'Active',
      linkedFundingIds: ['funding-brrrr-1'],
      cocChecklist: {
        electrical: { type: 'Electrical', status: 'Certified / Valid', certificateNumber: 'COC-ELEC-999' },
        gas: { type: 'Gas', status: 'Not Applicable' },
        electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
        plumbing: { type: 'Plumbing (Cape Town)', status: 'Certified / Valid', certificateNumber: 'COC-PLUMB-888' },
        beetle: { type: 'Beetle', status: 'Not Applicable' },
      },
      driveVault: {
        masterFolderUrl: 'https://drive.google.com/drive/folders/brrrr-test',
        titleDeedUrl: 'https://drive.google.com/file/d/title-deed-test',
      },
      boq: [
        {
          id: 'boq-item-1',
          category: 'Flooring & Tiling',
          itemDescription: 'Hardwood floor restoration',
          unit: 'm2',
          quantity: 120,
          baselineUnitCostZAR: 1_000,
          baselineTotalZAR: 120_000,
          actualCostZAR: 135_000,
          varianceZAR: 15_000,
          supplierOrContractor: 'Cape Timber Specialists',
          status: 'Completed',
        },
        {
          id: 'boq-item-2',
          category: 'Kitchen & Cabinetry',
          itemDescription: 'Kitchen overhaul',
          unit: 'lump sum',
          quantity: 1,
          baselineUnitCostZAR: 180_000,
          baselineTotalZAR: 180_000,
          actualCostZAR: 190_000,
          varianceZAR: 10_000,
          supplierOrContractor: 'Easylife Kitchens',
          status: 'Completed',
        },
      ],
    };

    // Add funding linked to this flip
    const testFunding: FundingSource = {
      id: 'funding-brrrr-1',
      lenderName: 'Syndicate Capital Partners',
      entityOrContact: 'David Kramer',
      emailPhone: 'david@syndicate.co.za',
      fundingType: 'Private Lender',
      capitalAmountZAR: 500_000,
      disbursementDate: '2026-01-20',
      maturityDate: '2026-08-20',
      returnTermsType: 'Fixed Interest',
      returnRatePercent: 14.0,
      paymentSchedule: 'Monthly Interest',
      linkedDealId: testFlipId,
      linkedDealName: testFlip.title,
      totalRepaidZAR: 0,
      status: 'Active',
    };

    usePortfolioStore.getState().addFlip(testFlip);
    usePortfolioStore.getState().addFunding(testFunding);

    // Calculate expected cost basis:
    // Purchase: 2,000,000
    // Acquisition costs: 150,000
    // BOQ actual: 135,000 + 190,000 = 325,000
    // Holding: 6 months * 15,000/mo = 90,000
    // Total cost basis = 2,000,000 + 150,000 + 325,000 + 90,000 = 2,565,000
    const expectedCostBasis = 2_000_000 + 150_000 + 325_000 + 90_000;

    const newRental = usePortfolioStore.getState().convertFlipToRental({
      flipId: testFlipId,
      initialGrossRentZAR: 24_000,
      marketValuationZAR: 3_200_000,
      tenantName: 'Sarah Jenkins',
      tenantEmail: 'sarah.j@gmail.com',
      tenantPhone: '+27 82 111 2233',
      managementType: 'Agency',
      agencyName: 'Pam Golding City Bowl',
      agencyCommissionPercent: 8.0,
      notes: 'Successfully transitioned flip to high-yield rental under BRRRR strategy',
    });

    const stateAfter = usePortfolioStore.getState();

    // 1. Verify New Rental created in store
    expect(newRental).toBeDefined();
    expect(newRental.purchasePriceZAR).toBe(expectedCostBasis);
    expect(newRental.marketValueZAR).toBe(3_200_000);
    expect(newRental.monthlyGrossRentZAR).toBe(24_000);
    expect(newRental.convertedFromFlipId).toBe(testFlipId);
    expect(newRental.isBrrrrProperty).toBe(true);
    expect(newRental.cocChecklist?.electrical.certificateNumber).toBe('COC-ELEC-999');
    expect(newRental.driveVault?.masterFolderUrl).toBe('https://drive.google.com/drive/folders/brrrr-test');

    // 2. Verify Flip marked as Completed / Archived with BRRRR tag
    const updatedFlip = stateAfter.flips.find((f) => f.id === testFlipId);
    expect(updatedFlip).toBeDefined();
    expect(updatedFlip?.status).toBe('Completed');
    expect(updatedFlip?.exitStrategy).toBe('BRRRR');
    expect(updatedFlip?.convertedToRentalId).toBe(newRental.id);
    expect(updatedFlip?.netCashProceedsZAR).toBe(0);

    // 3. Verify linked funding transferred to the new Rental
    const updatedFunding = stateAfter.funding.find((f) => f.id === 'funding-brrrr-1');
    expect(updatedFunding?.linkedDealId).toBe(newRental.id);
    expect(updatedFunding?.linkedDealName).toBe(newRental.title);
  });

  it('refinances a rental, updates valuation & bond, and deposits cash into liquid reserve', () => {
    const store = usePortfolioStore.getState();
    const initialReserve = store.liquidCapitalReserve;

    const testRentalId = store.rentals[0].id;
    const initialBondBalance = store.rentals[0].outstandingBondBalanceZAR || 0;

    const cashEquityToPull = 450_000;
    const newBankValuation = 2_800_000;
    const newMonthlyBondPayment = 19_500;
    const expectedNewBondBalance = initialBondBalance + cashEquityToPull;

    usePortfolioStore.getState().refinanceRental({
      rentalId: testRentalId,
      newBankValuationZAR: newBankValuation,
      newMonthlyBondPaymentZAR: newMonthlyBondPayment,
      cashEquityPulledOutZAR: cashEquityToPull,
      newBondBalanceZAR: expectedNewBondBalance,
      refinanceDate: '2026-09-23',
      notes: 'Standard Bank equity release at 70% LTV',
    });

    const stateAfter = usePortfolioStore.getState();
    const refinancedProperty = stateAfter.rentals.find((r) => r.id === testRentalId);

    // 1. Verify property updates
    expect(refinancedProperty).toBeDefined();
    expect(refinancedProperty?.marketValueZAR).toBe(newBankValuation);
    expect(refinancedProperty?.monthlyBondPaymentZAR).toBe(newMonthlyBondPayment);
    expect(refinancedProperty?.outstandingBondBalanceZAR).toBe(expectedNewBondBalance);
    expect(refinancedProperty?.totalEquityExtractedZAR).toBe(cashEquityToPull);
    expect(refinancedProperty?.refinanceHistory?.length).toBe(1);
    expect(refinancedProperty?.refinanceHistory?.[0].cashEquityPulledOutZAR).toBe(cashEquityToPull);

    // 2. Verify global liquid capital reserve credited
    expect(stateAfter.liquidCapitalReserve).toBe(initialReserve + cashEquityToPull);
  });

  it('rolls back the created rental and resets the flip when reopening a BRRRR flip', () => {
    const store = usePortfolioStore.getState();
    const flip = store.flips[0];

    const rental = store.convertFlipToRental({
      flipId: flip.id,
      initialGrossRentZAR: 20_000,
    });

    expect(usePortfolioStore.getState().rentals.some((r) => r.id === rental.id)).toBe(true);

    usePortfolioStore.getState().reopenFlip(flip.id);

    const stateAfter = usePortfolioStore.getState();
    expect(stateAfter.rentals.some((r) => r.id === rental.id)).toBe(false);
    const reopenedFlip = stateAfter.flips.find((f) => f.id === flip.id);
    expect(reopenedFlip?.status).toBe('Active');
    expect(reopenedFlip?.exitStrategy).toBeUndefined();
    expect(reopenedFlip?.convertedToRentalId).toBeUndefined();
  });
});
