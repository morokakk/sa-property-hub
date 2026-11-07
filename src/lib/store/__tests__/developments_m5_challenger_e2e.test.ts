import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { INITIAL_DEVELOPMENTS, INITIAL_FUNDING, INITIAL_OPPORTUNITIES } from '../initialData';
import {
  DevelopmentProject,
  DevelopmentUnit,
  FundingSource,
  OpportunityDeal,
  PreConstructionApprovals,
} from '@/types';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentSoftCostsTotal,
} from '@/lib/calculations/developments';
import { syncDevelopmentApprovalTasks } from '../utils/taskSync';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

describe('Milestone 5 Challenger: E2E Cross-Module Lifecycle & Adversarial Stress Suite', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
    usePortfolioStore.setState({
      developments: JSON.parse(JSON.stringify(INITIAL_DEVELOPMENTS)),
      funding: JSON.parse(JSON.stringify(INITIAL_FUNDING)),
      opportunities: JSON.parse(JSON.stringify(INITIAL_OPPORTUNITIES)),
      liquidCapitalReserve: 1_000_000,
    });
  });

  // =========================================================================
  // 1. SEED DATA INTEGRITY: dev-1 and dev-2
  // =========================================================================
  describe('1. Seed Projects Integrity & Verification', () => {
    it('verifies dev-1 (Ferndale 6-Unit Cluster) structural and financial integrity', () => {
      const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1');
      expect(dev1).toBeDefined();
      if (!dev1) return;

      expect(dev1.title).toBe('Ferndale 6-Unit Cluster Subdivision');
      expect(dev1.units.length).toBe(6);
      expect(dev1.totalBuildableAreaSqm).toBe(390);
      expect(dev1.isVatRegisteredDeveloper).toBe(true);
      expect(dev1.preSalesHurdlePercent).toBe(60);
      expect(dev1.linkedFundingSourceId).toBe('fund-dev-ferndale');

      // Verify linked funding source exists and matches
      const linkedFund = usePortfolioStore.getState().funding.find((f) => f.id === 'fund-dev-ferndale');
      expect(linkedFund).toBeDefined();
      expect(linkedFund?.capitalAmountZAR).toBe(4_200_000);
      expect(linkedFund?.totalRepaidZAR).toBe(2_750_000);
      expect(linkedFund?.status).toBe('Active');

      // Financial calculations verification
      const fin = calculateDevelopmentFinancials(dev1);
      expect(fin.totalUnitsCount).toBe(6);
      expect(fin.unitsForSaleCount).toBe(4);
      expect(fin.unitsRetainedCount).toBe(2);
      expect(fin.preSoldUnitsCount).toBe(4); // Units 1, 2, 3, 4 are Sold, Bond Approved, or Reserved
      expect(fin.isPreSalesHurdleMet).toBe(true); // 4 / 6 = 66.67% >= 60%
      expect(fin.isSection13SexEligible).toBe(false); // 2 < 5 units
      expect(fin.outstandingDevFacilityZAR).toBe(4_200_000 - 2_750_000); // 1,450,000
    });

    it('verifies dev-2 (Kempton Park 10-Unit Micro-Apartments) structural and financial integrity', () => {
      const dev2 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-2');
      expect(dev2).toBeDefined();
      if (!dev2) return;

      expect(dev2.title).toBe('Kempton Park 10-Unit Micro-Apartment Infill');
      expect(dev2.units.length).toBe(10);
      expect(dev2.totalBuildableAreaSqm).toBe(260);
      expect(dev2.isVatRegisteredDeveloper).toBe(false);
      expect(dev2.preSalesHurdlePercent).toBe(0); // 0% build-to-rent infill
      expect(dev2.linkedFundingSourceId).toBe('fund-tuhf-kempton');

      // Verify linked funding source exists and matches TUHF facility
      const linkedFund = usePortfolioStore.getState().funding.find((f) => f.id === 'fund-tuhf-kempton');
      expect(linkedFund).toBeDefined();
      expect(linkedFund?.capitalAmountZAR).toBe(2_450_000);
      expect(linkedFund?.totalRepaidZAR).toBe(0);
      expect(linkedFund?.status).toBe('Active');

      // Financial calculations verification
      const fin = calculateDevelopmentFinancials(dev2);
      expect(fin.totalUnitsCount).toBe(10);
      expect(fin.unitsForSaleCount).toBe(0);
      expect(fin.unitsRetainedCount).toBe(10);
      expect(fin.isPreSalesHurdleMet).toBe(true); // 0% hurdle is immediately met
      expect(fin.isSection13SexEligible).toBe(true); // 10 >= 5 units
      expect(fin.section13sexDeductionBaseZAR).toBe(Math.round(345_000 * 10 * 0.55));
      expect(fin.section13sexAnnualAllowanceZAR).toBe(Math.round(fin.section13sexDeductionBaseZAR * 0.05));
    });
  });

  // =========================================================================
  // 2. LIFECYCLE STEP 1: Opportunity Promotion from /analyzer
  // =========================================================================
  describe('2. Opportunity Promotion Pipeline to Development', () => {
    it('promotes an analyzed opportunity into a valid DevelopmentProject with synchronized tasks', () => {
      const opportunityId = 'opp-custom-deal-1';
      const testOpp: OpportunityDeal = {
        id: opportunityId,
        title: 'Morningside Cluster Opportunity',
        address: '50 Summit Road, Morningside',
        city: 'Johannesburg',
        province: 'Gauteng',
        strategy: 'Development' as any,
        status: 'Screening',
        purchasePrice: 3_000_000,
        floorAreaSqm: 600,
        numberOfUnits: 5,
        estimatedRehabCost: 6_000_000, // 10,000 / sqm
        targetExitPrice: 15_000_000, // 3,000,000 per unit list price
        monthlyRentalEstimate: 100_000, // 20,000 per unit rent
        holdingPeriodMonths: 14,
        monthlyLevies: 4_000,
        monthlyRatesTaxes: 6_000,
        costs: {
          totalAcquisitionCost: 3_250_000,
        } as any,
      } as any as OpportunityDeal;

      usePortfolioStore.setState((s) => ({
        opportunities: [testOpp, ...s.opportunities],
      }));

      const devCountBefore = usePortfolioStore.getState().developments.length;
      const tasksCountBefore = usePortfolioStore.getState().tasks.length;

      const createdDevId = usePortfolioStore.getState().promoteOpportunityToDevelopment(opportunityId);
      expect(createdDevId).toBeTruthy();

      const state = usePortfolioStore.getState();
      expect(state.developments.length).toBe(devCountBefore + 1);

      const promotedDev = state.developments.find((d) => d.id === createdDevId);
      expect(promotedDev).toBeDefined();
      if (!promotedDev) return;

      expect(promotedDev.title).toBe('Morningside Cluster Opportunity (Development)');
      expect(promotedDev.landPurchasePriceZAR).toBe(3_000_000);
      expect(promotedDev.acquisitionCostsZAR).toBe(250_000); // 3,250,000 - 3,000,000
      expect(promotedDev.totalBuildableAreaSqm).toBe(600);
      expect(promotedDev.budgetedHardCostPerSqmZAR).toBe(10_000);
      expect(promotedDev.units.length).toBe(5);

      // Verify units partition
      promotedDev.units.forEach((u, i) => {
        expect(u.unitNumber).toBe(`${i + 1}`);
        expect(u.floorAreaSqm).toBe(120); // 600 / 5
        expect(u.listPriceVatInclZAR).toBe(3_000_000); // 15,000,000 / 5
        expect(u.estimatedMonthlyRentZAR).toBe(20_000); // 100,000 / 5
        expect(u.status).toBe('Available');
      });

      // Verify conveyance onboarding task created
      expect(state.tasks.length).toBe(tasksCountBefore + 1);
      const onboardingTask = state.tasks.find((t) => t.linkedEntity?.id === createdDevId);
      expect(onboardingTask).toBeDefined();
      expect(onboardingTask?.priority).toBe('Urgent');
      expect(onboardingTask?.status).toBe('Pending');
      expect(onboardingTask?.title).toContain('Instruct conveyancer & town planner');

      // Verify opportunity status updated
      const updatedOpp = state.opportunities.find((o) => o.id === opportunityId);
      expect(updatedOpp?.status).toBe('Promoted to Development');
    });

    it('robustly falls back when opportunity has missing or corrupt properties', () => {
      const oppMissingId = 'opp-degenerate-data';
      const degenerateOpp = {
        id: oppMissingId,
        title: 'Empty Land Parcel',
        address: 'Unknown Road',
        city: 'Pretoria',
        province: 'Gauteng',
        strategy: 'Development' as any,
        purchasePrice: 1_200_000,
        // Missing floorAreaSqm, numberOfUnits, costs, estimatedRehabCost
      } as any as OpportunityDeal;

      usePortfolioStore.setState((s) => ({
        opportunities: [degenerateOpp, ...s.opportunities],
      }));

      const devId = usePortfolioStore.getState().promoteOpportunityToDevelopment(oppMissingId);
      expect(devId).toBeTruthy();

      const dev = usePortfolioStore.getState().developments.find((d) => d.id === devId);
      expect(dev).toBeDefined();
      if (!dev) return;

      expect(dev.units.length).toBe(4); // Default 4 units
      expect(dev.totalBuildableAreaSqm).toBe(320); // Default 320 m²
      expect(dev.budgetedHardCostPerSqmZAR).toBe(9500); // Default 9,500/m²
      expect(dev.acquisitionCostsZAR).toBe(75000); // Default 75,000
    });
  });

  // =========================================================================
  // 3. LIFECYCLE STEP 2: Sales Waterfall, VAT Stripping & Debt Extinguishment
  // =========================================================================
  describe('3. Unit Sales Waterfall (sellDevelopmentUnit)', () => {
    it('executes VAT stripping, senior debt paydown, linked funding status settlement, and surplus reserve credit', () => {
      // Create a test development with 3 units and R 2,000,000 senior debt
      const devId = 'dev-waterfall-stress';
      const fundId = 'fund-waterfall-stress';

      const funding: FundingSource = {
        id: fundId,
        lenderName: 'Standard Bank Commercial Property',
        entityOrContact: 'Corporate Banker',
        emailPhone: 'cib@standardbank.co.za',
        fundingType: 'DFI / Commercial Facility',
        capitalAmountZAR: 2_000_000,
        disbursementDate: '2025-01-01',
        maturityDate: '2027-01-01',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 12.0,
        paymentSchedule: 'Monthly Interest',
        totalRepaidZAR: 0,
        status: 'Active',
        linkedDealId: devId,
      };

      const dev: DevelopmentProject = {
        id: devId,
        title: 'Waterfall Stress Project',
        address: '10 River Way',
        city: 'Johannesburg',
        province: 'Gauteng',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true, // Output VAT 15% stripped: net = Math.round(price / 1.15)
        currentPhase: 'Sell-Down / Handover',
        preApprovalMonths: 4,
        constructionMonths: 8,
        sellDownMonths: 4,
        landPurchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 80_000,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 20_000,
          architectZAR: 40_000,
          structuralCivilEngineerZAR: 30_000,
          quantitySurveyorZAR: 20_000,
          nhbrcEnrolmentFeeZAR: 15_000,
          councilBulkContributionsZAR: 50_000,
          planScrutinyAndSubdivisionFeesZAR: 15_000,
          marketingAndShowUnitZAR: 20_000,
        },
        totalBuildableAreaSqm: 300,
        budgetedHardCostPerSqmZAR: 10_000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 5_000,
        monthlyConstructionHoldingBurnZAR: 10_000,
        developmentFacilityLimitZAR: 2_000_000,
        developmentFacilityDrawnZAR: 2_000_000,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 60,
        linkedFundingSourceId: fundId,
        approvals: {
          splumaRezoningSubdivision: { status: 'Approved' },
          sgDiagramApproval: { status: 'Approved' },
          municipalBuildingPlans: { status: 'Approved' },
          nhbrcEnrolment: { status: 'Approved' },
          sectionalTitleRegister: { status: 'Approved' },
          occupancyCertificate: { status: 'Approved' },
        },
        units: [
          {
            id: 'u-wf-1',
            unitNumber: '1',
            configuration: '2 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_380_000, // Net: 1,380,000 / 1.15 = 1,200,000
            estimatedMonthlyRentZAR: 12_000,
            status: 'Available',
          },
          {
            id: 'u-wf-2',
            unitNumber: '2',
            configuration: '2 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_380_000, // Net: 1,380,000 / 1.15 = 1,200,000
            estimatedMonthlyRentZAR: 12_000,
            status: 'Available',
          },
          {
            id: 'u-wf-3',
            unitNumber: '3',
            configuration: '2 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_380_000, // Net: 1,380,000 / 1.15 = 1,200,000
            estimatedMonthlyRentZAR: 12_000,
            status: 'Available',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [dev, ...s.developments],
        funding: [funding, ...s.funding],
        liquidCapitalReserve: 100_000,
      }));

      // Sale 1: Unit 1 sold for R 1,380,000
      // Net proceeds: 1,200,000
      // Outstanding debt: 2,000,000. All 1,200,000 pays down debt.
      // Surplus: 0. Reserve remains 100,000.
      usePortfolioStore.getState().sellDevelopmentUnit(devId, 'u-wf-1', 'Buyer Alpha');

      let state = usePortfolioStore.getState();
      let currentDev = state.developments.find((d) => d.id === devId)!;
      let currentFund = state.funding.find((f) => f.id === fundId)!;

      expect(currentDev.developmentFacilityRepaidZAR).toBe(1_200_000);
      expect(currentFund.totalRepaidZAR).toBe(1_200_000);
      expect(currentFund.status).toBe('Active');
      expect(state.liquidCapitalReserve).toBe(100_000);

      // Sale 2: Unit 2 sold for R 1,380,000
      // Net proceeds: 1,200,000
      // Outstanding debt: 800,000 (2M - 1.2M).
      // Debt payment: 800,000 -> Total repaid: 2,000,000 (100% extinguished!).
      // Surplus: 1,200,000 - 800,000 = 400,000.
      // Liquid reserve credited with 400,000 -> 500,000.
      // Funding status -> 'Settled'.
      usePortfolioStore.getState().sellDevelopmentUnit(devId, 'u-wf-2', 'Buyer Beta');

      state = usePortfolioStore.getState();
      currentDev = state.developments.find((d) => d.id === devId)!;
      currentFund = state.funding.find((f) => f.id === fundId)!;

      expect(currentDev.developmentFacilityRepaidZAR).toBe(2_000_000);
      expect(currentFund.totalRepaidZAR).toBe(2_000_000);
      expect(currentFund.status).toBe('Settled');
      expect(state.liquidCapitalReserve).toBe(500_000);

      // Sale 3: Unit 3 sold for R 1,380,000
      // Outstanding debt is 0.
      // 100% of net proceeds (1,200,000) goes to liquid reserve.
      // Liquid reserve -> 500,000 + 1,200,000 = 1,700,000.
      usePortfolioStore.getState().sellDevelopmentUnit(devId, 'u-wf-3', 'Buyer Gamma');

      state = usePortfolioStore.getState();
      currentDev = state.developments.find((d) => d.id === devId)!;
      currentFund = state.funding.find((f) => f.id === fundId)!;

      expect(currentDev.developmentFacilityRepaidZAR).toBe(2_000_000);
      expect(currentFund.status).toBe('Settled');
      expect(state.liquidCapitalReserve).toBe(1_700_000);

      // Idempotency: re-selling u-wf-3 with same buyer does not double-credit
      usePortfolioStore.getState().sellDevelopmentUnit(devId, 'u-wf-3', 'Buyer Gamma');
      expect(usePortfolioStore.getState().liquidCapitalReserve).toBe(1_700_000);
    });

    it('verifies non-VAT developer does NOT strip VAT (100% of price is net proceeds)', () => {
      const devId = 'dev-non-vat-stress';
      const nonVatDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: devId,
        isVatRegisteredDeveloper: false,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-nv-1',
            unitNumber: '1',
            configuration: 'Micro',
            floorAreaSqm: 30,
            allocatedCostBasisZAR: 250_000,
            listPriceVatInclZAR: 500_000,
            estimatedMonthlyRentZAR: 4_500,
            status: 'Available',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [nonVatDev, ...s.developments],
        liquidCapitalReserve: 0,
      }));

      usePortfolioStore.getState().sellDevelopmentUnit(devId, 'u-nv-1', 'Cash Buyer', 500_000);
      expect(usePortfolioStore.getState().liquidCapitalReserve).toBe(500_000);
    });
  });

  // =========================================================================
  // 4. LIFECYCLE STEP 3: Retained Units Graduation to /rentals
  // =========================================================================
  describe('4. Retained Units Graduation (graduateRetainedUnitsToRental)', () => {
    it('graduates retained units to multi-unit rental with leases, debt carryover, and Section 13sex eligibility', () => {
      // We graduate dev-2: 10 units, all Retained for Rental, drawn debt 1,850,000, repaid 0
      const dev2 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-2')!;
      const rentalCountBefore = usePortfolioStore.getState().rentals.length;

      const graduatedRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-2');
      expect(graduatedRental).toBeDefined();

      const state = usePortfolioStore.getState();
      expect(state.rentals.length).toBe(rentalCountBefore + 1);

      // Verify RentalProperty contracts
      expect(graduatedRental.title).toBe('Kempton Park 10-Unit Micro-Apartment Infill (Retained Rental)');
      expect(graduatedRental.numberOfUnits).toBe(10);
      expect(graduatedRental.utilityType).toBe('prepaid_submeter');
      expect(graduatedRental.status).toBe('Vacant');
      expect(graduatedRental.convertedFromDevelopmentId).toBe('dev-2');

      // Verify Section 13sex eligibility (10 units >= 5)
      expect(graduatedRental.section13SexEligible).toBe(true);
      const totalCostBasis = dev2.units.reduce((s, u) => s + (u.allocatedCostBasisZAR || 0), 0);
      const expectedAnnualShield = Math.round(totalCostBasis * 0.55 * 0.05 * 0.27);
      expect(graduatedRental.section13sexAnnualShieldZAR).toBe(expectedAnnualShield);

      // Verify debt carryover & bond repayment
      expect(graduatedRental.outstandingBondBalanceZAR).toBe(1_850_000);
      expect(graduatedRental.bondInterestRatePercent).toBe(11.75);
      expect(graduatedRental.loanTermYears).toBe(15);
      const expectedMonthlyBond = calculateMonthlyBondRepayment(1_850_000, 11.75, 15);
      expect(graduatedRental.monthlyBondPaymentZAR).toBe(expectedMonthlyBond);

      // Verify linked funding source retargeting
      const linkedFund = state.funding.find((f) => f.id === dev2.linkedFundingSourceId);
      expect(linkedFund?.linkedDealId).toBe(graduatedRental.id);
      expect(linkedFund?.linkedDealName).toBe(graduatedRental.title);

      // Verify units stamped with graduatedRentalId in development
      const updatedDev2 = state.developments.find((d) => d.id === 'dev-2')!;
      expect(updatedDev2.units.every((u) => u.graduatedRentalId === graduatedRental.id)).toBe(true);

      // Verify leases initialized
      expect(graduatedRental.leases.length).toBe(10);
      graduatedRental.leases.forEach((lease, i) => {
        expect(lease.unitName).toBe(`Unit ${i + 1}`);
        expect(lease.status).toBe('Vacant');
        expect(lease.monthlyRentZAR).toBe(4_600);
        expect(lease.depositHeldZAR).toBe(9_200); // 2 * 4600
        expect(lease.roomType).toBe('Studio / Micro-1Bed');
      });

      // Verify second graduation on same project fails
      expect(() => {
        usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-2');
      }).toThrow(/No ungraduated retained units found/);
    });

    it('graduates < 5 retained units without Section 13sex tax shield', () => {
      // dev-1 has 2 units retained (units 5 and 6)
      const graduated = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');
      expect(graduated.numberOfUnits).toBe(2);
      expect(graduated.section13SexEligible).toBe(false);
      expect(graduated.section13sexAnnualShieldZAR).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. LIFECYCLE STEP 4: Statutory Task Synchronization
  // =========================================================================
  describe('5. Statutory Approval Tasks Synchronization', () => {
    it('synchronizes 6 statutory gates to tasks, updates on date change, and purges on approval', () => {
      const devId = 'dev-statutory-sync';
      const devTitle = 'Statutory Test Scheme';

      const approvals: PreConstructionApprovals = {
        splumaRezoningSubdivision: {
          status: 'Submitted',
          targetApprovalDate: '2026-12-01',
          referenceNo: 'SPL/2026/01',
        },
        sgDiagramApproval: {
          status: 'Submitted',
          targetApprovalDate: '2026-12-15',
        },
        municipalBuildingPlans: {
          status: 'Approved', // Should not generate a pending reminder task
          targetApprovalDate: '2026-10-01',
        },
        nhbrcEnrolment: {
          status: 'N/A', // Should not generate a task
        },
        sectionalTitleRegister: {
          status: 'Not Started', // No targetApprovalDate -> no task
        },
        occupancyCertificate: {
          status: 'Submitted',
          targetApprovalDate: '2027-01-30',
        },
      };

      const tasks = syncDevelopmentApprovalTasks([], devId, devTitle, approvals);

      // Only spluma, sgDiagram, and occupancyCertificate have targetApprovalDate and status != Approved/NA
      expect(tasks.length).toBe(3);

      const splumaTask = tasks.find((t) => t.id === `task-dev-approval-${devId}-splumaRezoningSubdivision`);
      expect(splumaTask).toBeDefined();
      expect(splumaTask?.priority).toBe('Urgent');
      expect(splumaTask?.status).toBe('Pending');
      // Due date is 14 days prior to target: 2026-12-01 - 14 days = 2026-11-17
      expect(splumaTask?.dueDate).toBe('2026-11-17');

      // Now approve SPLUMA and simulate resync: task must be removed
      const updatedApprovals: PreConstructionApprovals = {
        ...approvals,
        splumaRezoningSubdivision: {
          ...approvals.splumaRezoningSubdivision!,
          status: 'Approved',
        },
      };

      const resyncedTasks = syncDevelopmentApprovalTasks(tasks, devId, devTitle, updatedApprovals);
      expect(resyncedTasks.length).toBe(2);
      expect(resyncedTasks.some((t) => t.id.includes('splumaRezoningSubdivision'))).toBe(false);
    });

    it('purges statutory tasks when a development project is deleted', () => {
      const devId = 'dev-delete-test';
      const dev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: devId,
        approvals: {
          ...INITIAL_DEVELOPMENTS[0].approvals,
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2026-12-01',
          },
        },
      };

      usePortfolioStore.getState().addDevelopment(dev);

      // Confirm statutory task exists
      const tasksBefore = usePortfolioStore.getState().tasks;
      expect(tasksBefore.some((t) => t.id.startsWith(`task-dev-approval-${devId}`))).toBe(true);

      // Delete development
      usePortfolioStore.getState().deleteDevelopment(devId);

      const tasksAfter = usePortfolioStore.getState().tasks;
      expect(tasksAfter.some((t) => t.id.startsWith(`task-dev-approval-${devId}`))).toBe(false);
    });
  });

  // =========================================================================
  // 6. ADVERSARIAL STRESS & EDGE CONDITIONS
  // =========================================================================
  describe('6. Extreme Adversarial Stress & Edge Conditions', () => {
    it('handles 0 units project without crashing or generating NaN', () => {
      const zeroUnitDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-zero-units',
        units: [],
        developmentFacilityDrawnZAR: 1_000_000,
      };

      const fin = calculateDevelopmentFinancials(zeroUnitDev);
      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(fin.avgUnitListPriceZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.isPreSalesHurdleMet).toBe(false);
      expect(Number.isFinite(fin.tdcPerUnitZAR)).toBe(true);

      // Attempting to sell a non-existent unit is safe
      usePortfolioStore.setState((s) => ({
        developments: [zeroUnitDev, ...s.developments],
      }));
      expect(() => {
        usePortfolioStore.getState().sellDevelopmentUnit('dev-zero-units', 'any-id');
      }).not.toThrow();

      // Attempting to graduate throws descriptive error
      expect(() => {
        usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-zero-units');
      }).toThrow(/No ungraduated retained units found/);
    });

    it('handles high unit volume (100 units) scalability and rounding fidelity', () => {
      const highVolumeDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-high-vol',
        units: Array.from({ length: 100 }, (_, i) => ({
          id: `hv-u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 400_000,
          listPriceVatInclZAR: 600_000,
          estimatedMonthlyRentZAR: 5_000,
          status: i < 60 ? 'Sold & Transferred' : 'Available',
        })),
        developmentFacilityDrawnZAR: 20_000_000,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 60,
      };

      const fin = calculateDevelopmentFinancials(highVolumeDev);
      expect(fin.totalUnitsCount).toBe(100);
      expect(fin.preSoldUnitsCount).toBe(60);
      expect(fin.preSoldGdvPercent).toBe(60);
      expect(fin.isPreSalesHurdleMet).toBe(true);
      expect(Number.isFinite(fin.tdcZAR)).toBe(true);
      expect(Number.isFinite(fin.netRealizableGdvZAR)).toBe(true);
    });

    it('tests 0% pre-sales hurdle vs 100% pre-sales hurdle boundary behavior', () => {
      // 0% hurdle: always met even with 0 pre-sold units
      const zeroHurdleDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-0-hurdle',
        preSalesHurdlePercent: 0,
        units: [
          {
            id: 'u-1',
            unitNumber: '1',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500_000,
            listPriceVatInclZAR: 800_000,
            estimatedMonthlyRentZAR: 6_000,
            status: 'Available',
          },
        ],
      };
      const finZero = calculateDevelopmentFinancials(zeroHurdleDev);
      expect(finZero.isPreSalesHurdleMet).toBe(true);

      // 100% hurdle: not met until every single unit is pre-sold
      const hundredHurdleDev: DevelopmentProject = {
        ...zeroHurdleDev,
        id: 'dev-100-hurdle',
        preSalesHurdlePercent: 100,
      };
      const finHundredNotMet = calculateDevelopmentFinancials(hundredHurdleDev);
      expect(finHundredNotMet.isPreSalesHurdleMet).toBe(false);

      // Mark unit pre-sold
      hundredHurdleDev.units[0].status = 'Reserved (OTP Signed)';
      const finHundredMet = calculateDevelopmentFinancials(hundredHurdleDev);
      expect(finHundredMet.isPreSalesHurdleMet).toBe(true);
    });

    it('accurately computes debt wipeout breakeven point', () => {
      // 10 units @ R 1,150,000 list price (R 1,000,000 net proceeds per unit)
      // Drawn debt = R 4,000,000, Repaid = R 1,000,000 -> Outstanding = R 3,000,000
      // unitsRequiredForDebtWipeout should be exactly Math.ceil(3,000,000 / 1,000,000) = 3 units
      const wipeoutDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-wipeout-math',
        isVatRegisteredDeveloper: true,
        developmentFacilityDrawnZAR: 4_000_000,
        developmentFacilityRepaidZAR: 1_000_000,
        units: Array.from({ length: 10 }, (_, i) => ({
          id: `wo-u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '2 Bed',
          floorAreaSqm: 60,
          allocatedCostBasisZAR: 700_000,
          listPriceVatInclZAR: 1_150_000, // Net: 1,000,000
          estimatedMonthlyRentZAR: 8_000,
          status: 'Available',
        })),
      };

      const fin = calculateDevelopmentFinancials(wipeoutDev);
      expect(fin.outstandingDevFacilityZAR).toBe(3_000_000);
      expect(fin.unitsRequiredForDebtWipeout).toBe(3);
    });

    it('empirically stress-tests Section 13sex boundary at exactly 4 vs 5 units', () => {
      // 4 units scheme: NOT eligible for Section 13sex
      const dev4Units: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-boundary-4',
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: Array.from({ length: 4 }, (_, i) => ({
          id: `b4-u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 700_000,
          estimatedMonthlyRentZAR: 6_000,
          status: 'Retained for Rental' as const,
        })),
      };

      // 5 units scheme: ELIGIBLE for Section 13sex
      const dev5Units: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-boundary-5',
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: Array.from({ length: 5 }, (_, i) => ({
          id: `b5-u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 700_000,
          estimatedMonthlyRentZAR: 6_000,
          status: 'Retained for Rental' as const,
        })),
      };

      usePortfolioStore.setState((s) => ({
        developments: [dev4Units, dev5Units, ...s.developments],
      }));

      const rental4 = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-boundary-4');
      expect(rental4.numberOfUnits).toBe(4);
      expect(rental4.section13SexEligible).toBe(false);
      expect(rental4.section13sexAnnualShieldZAR).toBeUndefined();

      const rental5 = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-boundary-5');
      expect(rental5.numberOfUnits).toBe(5);
      expect(rental5.section13SexEligible).toBe(true);
      // Total cost basis = 5 * 500,000 = 2,500,000
      // Shield = 2,500,000 * 0.55 * 0.05 * 0.27 = 18,562.5 -> Math.round is 18,563
      expect(rental5.section13sexAnnualShieldZAR).toBe(18_563);
    });

    it('proves waterfall invariant under Monte Carlo random sale orderings', () => {
      // 5 units with random list prices, drawn debt R 3,500,000
      const initialDebt = 3_500_000;
      const initialReserve = 500_000;
      const unitPrices = [1_150_000, 1_380_000, 920_000, 1_725_000, 1_150_000]; // VAT incl
      // Expected net proceeds: 1,000,000 + 1,200,000 + 800,000 + 1,500,000 + 1,000,000 = 5,500,000
      const expectedTotalNet = 5_500_000;
      const expectedSurplus = expectedTotalNet - initialDebt; // 2,000,000

      const monteDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-monte-carlo',
        isVatRegisteredDeveloper: true,
        developmentFacilityDrawnZAR: initialDebt,
        developmentFacilityRepaidZAR: 0,
        units: unitPrices.map((price, idx) => ({
          id: `mc-u-${idx + 1}`,
          unitNumber: `${idx + 1}`,
          configuration: '2 Bed',
          floorAreaSqm: 70,
          allocatedCostBasisZAR: 600_000,
          listPriceVatInclZAR: price,
          estimatedMonthlyRentZAR: 10_000,
          status: 'Available',
        })),
      };

      usePortfolioStore.setState((s) => ({
        developments: [monteDev, ...s.developments],
        liquidCapitalReserve: initialReserve,
      }));

      // Sell units in arbitrary order: 3, 1, 4, 0, 2
      const saleOrder = [3, 1, 4, 0, 2];
      for (const idx of saleOrder) {
        usePortfolioStore.getState().sellDevelopmentUnit('dev-monte-carlo', `mc-u-${idx + 1}`);
      }

      const finalDev = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-monte-carlo')!;
      const finalReserve = usePortfolioStore.getState().liquidCapitalReserve;

      // Invariant 1: debt repaid must equal exactly the initial drawn debt
      expect(finalDev.developmentFacilityRepaidZAR).toBe(initialDebt);

      // Invariant 2: reserve must equal initial reserve + expected surplus
      expect(finalReserve).toBe(initialReserve + expectedSurplus);

      // Invariant 3: all units must be Sold & Transferred
      expect(finalDev.units.every((u) => u.status === 'Sold & Transferred')).toBe(true);
    });
  });
});
