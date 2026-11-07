import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore, computePortfolioSummary } from '../usePortfolioStore';
import { INITIAL_DEVELOPMENTS, INITIAL_FUNDING, INITIAL_OPPORTUNITIES } from '../initialData';
import {
  DevelopmentProject,
  DevelopmentUnit,
  FundingSource,
  OpportunityDeal,
} from '@/types';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

describe('Adversarial Verification — Milestone 2 Cross-Module Bridges', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
    usePortfolioStore.setState({
      developments: JSON.parse(JSON.stringify(INITIAL_DEVELOPMENTS)),
      funding: JSON.parse(JSON.stringify(INITIAL_FUNDING)),
      opportunities: JSON.parse(JSON.stringify(INITIAL_OPPORTUNITIES)),
      liquidCapitalReserve: 500_000,
    });
  });

  // =========================================================================
  // 1. sellDevelopmentUnit Bridge & Senior Debt Waterfall
  // =========================================================================
  describe('1. sellDevelopmentUnit: Senior Debt Retirement, VAT Stripping & Reserve Crediting', () => {
    it('executes sequential unit sales retiring senior debt, switching funding to Settled, and crediting surplus to reserve', () => {
      // Setup a project with 4 units and R 3,000,000 senior debt facility
      const testDevId = 'dev-waterfall-test';
      const testFundingId = 'fund-waterfall-test';

      const fundingSource: FundingSource = {
        id: testFundingId,
        lenderName: 'Nedbank CIB Senior Facility',
        entityOrContact: 'Nedbank CIB Sandton',
        emailPhone: 'cib@nedbank.co.za',
        fundingType: 'DFI / Commercial Facility',
        capitalAmountZAR: 3_000_000,
        disbursementDate: '2025-01-01',
        maturityDate: '2027-01-01',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 12.0,
        paymentSchedule: 'Monthly Interest',
        totalRepaidZAR: 0,
        status: 'Active',
        linkedDealId: testDevId,
        linkedDealName: 'Adversarial Waterfall Project',
      };

      const testDev: DevelopmentProject = {
        id: testDevId,
        title: 'Adversarial Waterfall Project',
        address: '100 Ox Road, Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true, // Strips 15% VAT: net = round(price / 1.15)
        currentPhase: 'Sell-Down / Handover',
        preApprovalMonths: 4,
        constructionMonths: 8,
        sellDownMonths: 4,
        landPurchasePriceZAR: 1_500_000,
        acquisitionCostsZAR: 100_000,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 30_000,
          architectZAR: 50_000,
          structuralCivilEngineerZAR: 40_000,
          quantitySurveyorZAR: 30_000,
          nhbrcEnrolmentFeeZAR: 20_000,
          councilBulkContributionsZAR: 80_000,
          planScrutinyAndSubdivisionFeesZAR: 20_000,
          marketingAndShowUnitZAR: 30_000,
        },
        totalBuildableAreaSqm: 400,
        budgetedHardCostPerSqmZAR: 10_000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 10_000,
        monthlyConstructionHoldingBurnZAR: 15_000,
        developmentFacilityLimitZAR: 3_000_000,
        developmentFacilityDrawnZAR: 3_000_000,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 50,
        linkedFundingSourceId: testFundingId,
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
            id: 'unit-wf-1',
            unitNumber: '1',
            configuration: '3 Bed 2 Bath',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_150_000, // Net: 1,000,000
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
          {
            id: 'unit-wf-2',
            unitNumber: '2',
            configuration: '3 Bed 2 Bath',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_150_000, // Net: 1,000,000
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
          {
            id: 'unit-wf-3',
            unitNumber: '3',
            configuration: '3 Bed 2 Bath',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_725_000, // Net: 1,500,000
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
          {
            id: 'unit-wf-4',
            unitNumber: '4',
            configuration: '3 Bed 2 Bath',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_150_000, // Net: 1,000,000
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [testDev, ...s.developments],
        funding: [fundingSource, ...s.funding],
        liquidCapitalReserve: 500_000,
      }));

      // =====================================================================
      // Sale 1: Unit 1 for R 1,150,000 VAT-inclusive
      // Net proceeds = 1,150,000 / 1.15 = 1,000,000
      // Outstanding debt = 3,000,000. All 1,000,000 pays down senior debt.
      // Surplus to reserve = R 0.
      // =====================================================================
      usePortfolioStore.getState().sellDevelopmentUnit(testDevId, 'unit-wf-1', 'Buyer One', 1_150_000);

      let state = usePortfolioStore.getState();
      let dev = state.developments.find((d) => d.id === testDevId)!;
      let fund = state.funding.find((f) => f.id === testFundingId)!;
      let u1 = dev.units.find((u) => u.id === 'unit-wf-1')!;

      expect(u1.status).toBe('Sold & Transferred');
      expect(u1.buyerName).toBe('Buyer One');
      expect(u1.soldDate).toBe(new Date().toISOString().split('T')[0]);
      expect(dev.developmentFacilityRepaidZAR).toBe(1_000_000);
      expect(fund.totalRepaidZAR).toBe(1_000_000);
      expect(fund.status).toBe('Active'); // 2,000,000 remaining
      expect(state.liquidCapitalReserve).toBe(500_000); // Unchanged

      // =====================================================================
      // Sale 2: Unit 2 for R 1,150,000 VAT-inclusive
      // Net proceeds = 1,000,000
      // Outstanding debt was 2,000,000. All 1,000,000 pays down senior debt.
      // Repaid reaches 2,000,000.
      // Surplus to reserve = R 0.
      // =====================================================================
      usePortfolioStore.getState().sellDevelopmentUnit(testDevId, 'unit-wf-2', 'Buyer Two', 1_150_000);

      state = usePortfolioStore.getState();
      dev = state.developments.find((d) => d.id === testDevId)!;
      fund = state.funding.find((f) => f.id === testFundingId)!;

      expect(dev.developmentFacilityRepaidZAR).toBe(2_000_000);
      expect(fund.totalRepaidZAR).toBe(2_000_000);
      expect(fund.status).toBe('Active'); // 1,000,000 remaining
      expect(state.liquidCapitalReserve).toBe(500_000);

      // =====================================================================
      // Sale 3: Unit 3 for R 1,725,000 VAT-inclusive
      // Net proceeds = 1,725,000 / 1.15 = 1,500,000
      // Outstanding debt was 1,000,000.
      // Debt payment = 1,000,000 -> Total repaid = 3,000,000 (100% repaid!).
      // Surplus cash = 1,500,000 - 1,000,000 = 500,000.
      // Funding source totalRepaid reaches 3,000,000 -> status changes to 'Settled'!
      // Liquid reserve credited with +500,000 -> 1,000,000.
      // =====================================================================
      usePortfolioStore.getState().sellDevelopmentUnit(testDevId, 'unit-wf-3', 'Buyer Three', 1_725_000);

      state = usePortfolioStore.getState();
      dev = state.developments.find((d) => d.id === testDevId)!;
      fund = state.funding.find((f) => f.id === testFundingId)!;

      expect(dev.developmentFacilityRepaidZAR).toBe(3_000_000);
      expect(fund.totalRepaidZAR).toBe(3_000_000);
      expect(fund.status).toBe('Settled'); // Debt extinguished!
      expect(state.liquidCapitalReserve).toBe(1_000_000); // 500k initial + 500k surplus

      // =====================================================================
      // Sale 4: Unit 4 for R 1,150,000 VAT-inclusive
      // Net proceeds = 1,000,000
      // Outstanding debt is R 0.
      // Debt payment = 0 -> Repaid remains 3,000,000.
      // Funding remains 'Settled'.
      // 100% of net proceeds (1,000,000) is surplus credited to liquidCapitalReserve.
      // Liquid reserve becomes 1,000,000 + 1,000,000 = 2,000,000.
      // =====================================================================
      usePortfolioStore.getState().sellDevelopmentUnit(testDevId, 'unit-wf-4', 'Buyer Four', 1_150_000);

      state = usePortfolioStore.getState();
      dev = state.developments.find((d) => d.id === testDevId)!;
      fund = state.funding.find((f) => f.id === testFundingId)!;
      const u4 = dev.units.find((u) => u.id === 'unit-wf-4')!;

      expect(u4.status).toBe('Sold & Transferred');
      expect(dev.developmentFacilityRepaidZAR).toBe(3_000_000);
      expect(fund.totalRepaidZAR).toBe(3_000_000);
      expect(fund.status).toBe('Settled');
      expect(state.liquidCapitalReserve).toBe(2_000_000); // Exactly 2,000,000
    });

    it('rigorously tests VAT stripping vs non-VAT developer mechanics', () => {
      // 1. VAT registered developer: net proceeds = Math.round(price / 1.15)
      const vatDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-vat-test',
        isVatRegisteredDeveloper: true,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-vat-1',
            unitNumber: '1',
            configuration: '2 Bed',
            floorAreaSqm: 65,
            allocatedCostBasisZAR: 800_000,
            listPriceVatInclZAR: 1_395_000,
            estimatedMonthlyRentZAR: 10_000,
            status: 'Available',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [vatDev, ...s.developments],
        liquidCapitalReserve: 0,
      }));

      // Sale with list price fallback (salePriceZAR omitted)
      usePortfolioStore.getState().sellDevelopmentUnit('dev-vat-test', 'u-vat-1');

      let state = usePortfolioStore.getState();
      // 1,395,000 / 1.15 = 1,213,043.478... -> Math.round is 1,213,043
      expect(state.liquidCapitalReserve).toBe(1_213_043);

      // 2. Non-VAT developer: recognizes 100% of price without VAT stripping
      const nonVatDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[1],
        id: 'dev-nonvat-test',
        isVatRegisteredDeveloper: false,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-nonvat-1',
            unitNumber: '1',
            configuration: 'Micro',
            floorAreaSqm: 30,
            allocatedCostBasisZAR: 300_000,
            listPriceVatInclZAR: 650_000,
            estimatedMonthlyRentZAR: 5_000,
            status: 'Available',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [nonVatDev, ...s.developments],
        liquidCapitalReserve: 0,
      }));

      usePortfolioStore.getState().sellDevelopmentUnit('dev-nonvat-test', 'u-nonvat-1', 'Cash Buyer', 650_000);

      state = usePortfolioStore.getState();
      // 100% of 650,000 credited (no / 1.15)
      expect(state.liquidCapitalReserve).toBe(650_000);
    });

    it('handles adversarial edge cases: unknown devId, unknown unitId, zero/negative prices', () => {
      const stateBefore = usePortfolioStore.getState();
      const initialDevs = stateBefore.developments;
      const initialReserve = stateBefore.liquidCapitalReserve;

      // Unknown devId
      usePortfolioStore.getState().sellDevelopmentUnit('dev-does-not-exist', 'unit-1');
      expect(usePortfolioStore.getState().developments).toEqual(initialDevs);
      expect(usePortfolioStore.getState().liquidCapitalReserve).toBe(initialReserve);

      // Unknown unitId in valid dev
      usePortfolioStore.getState().sellDevelopmentUnit('dev-1', 'unit-does-not-exist');
      expect(usePortfolioStore.getState().developments).toEqual(initialDevs);
      expect(usePortfolioStore.getState().liquidCapitalReserve).toBe(initialReserve);

      // Negative or zero salePriceZAR: safely falls back to unit.listPriceVatInclZAR
      const dev1Unit3Before = initialDevs.find((d) => d.id === 'dev-1')!.units.find((u) => u.id === 'dev1-u3')!;
      usePortfolioStore.getState().sellDevelopmentUnit('dev-1', 'dev1-u3', 'Buyer Fallback', -50_000);

      const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1')!;
      const unit3 = dev1.units.find((u) => u.id === 'dev1-u3')!;
      expect(unit3.status).toBe('Sold & Transferred');
      expect(unit3.listPriceVatInclZAR).toBe(dev1Unit3Before.listPriceVatInclZAR);
    });
  });

  // =========================================================================
  // 2. graduateRetainedUnitsToRental Bridge & Hybrid Split-Exit
  // =========================================================================
  describe('2. graduateRetainedUnitsToRental: Section 13sex, Multi-Unit Rental & Debt Carryover', () => {
    it('graduates 5+ units: marks section13SexEligible = true, computes SARS 55% write-off tax shield', () => {
      // dev-2 has 10 units all 'Retained for Rental'
      const initialRentalsCount = usePortfolioStore.getState().rentals.length;
      const dev2 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-2')!;

      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-2');

      expect(newRental).toBeDefined();
      expect(newRental.numberOfUnits).toBe(10);
      expect(newRental.section13SexEligible).toBe(true);

      // SARS Section 13sex formula: totalCostBasis * 0.55 * 0.05 * 0.27
      const totalCostBasis = dev2.units.reduce((sum, u) => sum + (u.allocatedCostBasisZAR || 0), 0);
      const expectedShield = Math.round(totalCostBasis * 0.55 * 0.05 * 0.27);
      expect(newRental.section13sexAnnualShieldZAR).toBe(expectedShield);
      expect(newRental.section13sexAnnualShieldZAR).toBeGreaterThan(0);
      expect(newRental.notes).toContain('Qualified for SARS Section 13sex 55% tax write-off (>= 5 residential units).');

      // Rental added to store
      const state = usePortfolioStore.getState();
      expect(state.rentals.length).toBe(initialRentalsCount + 1);
      expect(state.rentals[0].id).toBe(newRental.id);
    });

    it('graduates < 5 units: marks section13SexEligible = false and leaves section13sexAnnualShieldZAR undefined', () => {
      // dev-1 has only 2 units marked 'Retained for Rental' (units 5 and 6)
      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');

      expect(newRental).toBeDefined();
      expect(newRental.numberOfUnits).toBe(2);
      expect(newRental.section13SexEligible).toBe(false);
      expect(newRental.section13sexAnnualShieldZAR).toBeUndefined();
      expect(newRental.notes).not.toContain('Qualified for SARS Section 13sex');
    });

    it('creates exact multi-unit RentalProperty specification with prepaid submetering and leases', () => {
      const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1')!;
      const retainedUnits = dev1.units.filter((u) => u.status === 'Retained for Rental');

      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');

      // Multi-unit property contracts
      expect(newRental.numberOfUnits).toBe(retainedUnits.length);
      expect(newRental.utilityType).toBe('prepaid_submeter');
      expect(newRental.managementType).toBe('Agency');
      expect(newRental.agencyCommissionPercent).toBe(8.0);
      expect(newRental.agencyVatApplicable).toBe(true);
      expect(newRental.convertedFromDevelopmentId).toBe('dev-1');

      // Leases array matches retained units exactly
      expect(newRental.leases.length).toBe(retainedUnits.length);
      newRental.leases.forEach((lease, idx) => {
        const matchingUnit = retainedUnits[idx];
        expect(lease.unitName).toBe(`Unit ${matchingUnit.unitNumber}`);
        expect(lease.monthlyRentZAR).toBe(matchingUnit.estimatedMonthlyRentZAR);
        expect(lease.depositHeldZAR).toBe((matchingUnit.estimatedMonthlyRentZAR || 0) * 2);
        expect(lease.status).toBe('Vacant');
        expect(lease.annualEscalationPercent).toBe(7.0);
        expect(lease.roomType).toBe(matchingUnit.configuration);
      });

      // Operational expense benchmarks
      const totalGrossRent = retainedUnits.reduce((sum, u) => sum + (u.estimatedMonthlyRentZAR || 0), 0);
      expect(newRental.monthlyGrossRentZAR).toBe(totalGrossRent);
      expect(newRental.monthlyRatesTaxesZAR).toBe(Math.round(totalGrossRent * 0.06));
      expect(newRental.monthlyAgentFeeZAR).toBe(Math.round(totalGrossRent * 0.08 * 1.15));
      expect(newRental.monthlyMaintenanceReserveZAR).toBe(Math.max(500, retainedUnits.length * 250));

      // Property type mapping
      // dev-1 is 'Subdivision & Cluster' -> 'Freehold House'
      expect(newRental.propertyType).toBe('Freehold House');
    });

    it('correctly maps propertyType to Sectional Title Apartment when dev is Sectional Title Apartments', () => {
      const sectionalDev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-sectional-test',
        developmentType: 'Sectional Title Apartments',
        units: [
          {
            id: 'u-sec-1',
            unitNumber: '101',
            configuration: '1 Bed 1 Bath',
            floorAreaSqm: 45,
            allocatedCostBasisZAR: 600_000,
            listPriceVatInclZAR: 900_000,
            estimatedMonthlyRentZAR: 7_500,
            status: 'Retained for Rental',
          },
        ],
      };

      usePortfolioStore.setState((s) => ({
        developments: [sectionalDev, ...s.developments],
      }));

      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-sectional-test');
      expect(newRental.propertyType).toBe('Sectional Title Apartment');
    });

    it('carries over residual debt balance accurately and recalculates monthly bond payment', () => {
      // dev-1: drawn = 4,200,000, repaid = 2,750,000 -> outstanding = 1,450,000
      const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1')!;
      const expectedResidualDebt = dev1.developmentFacilityDrawnZAR - dev1.developmentFacilityRepaidZAR; // 1,450,000

      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');

      expect(newRental.outstandingBondBalanceZAR).toBe(expectedResidualDebt);
      expect(newRental.bondInterestRatePercent).toBe(11.75);
      expect(newRental.loanTermYears).toBe(15);

      const expectedBondPayment = calculateMonthlyBondRepayment(expectedResidualDebt, 11.75, 15);
      expect(newRental.monthlyBondPaymentZAR).toBe(expectedBondPayment);

      // Verify linked funding source is redirected to new rental
      const state = usePortfolioStore.getState();
      const linkedFund = state.funding.find((f) => f.id === dev1.linkedFundingSourceId)!;
      expect(linkedFund.linkedDealId).toBe(newRental.id);
      expect(linkedFund.linkedDealName).toBe(newRental.title);

      // Verify units stamped with graduatedRentalId
      const updatedDev1 = state.developments.find((d) => d.id === 'dev-1')!;
      const graduatedUnits = updatedDev1.units.filter((u) => u.graduatedRentalId === newRental.id);
      expect(graduatedUnits.length).toBe(2);
    });

    it('sets outstandingBondBalanceZAR and monthlyBondPaymentZAR to 0 when debt is fully repaid before graduation', () => {
      // Modify dev-1 so debt is 100% repaid
      usePortfolioStore.setState((s) => ({
        developments: s.developments.map((d) =>
          d.id === 'dev-1'
            ? { ...d, developmentFacilityRepaidZAR: d.developmentFacilityDrawnZAR }
            : d
        ),
      }));

      const newRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');
      expect(newRental.outstandingBondBalanceZAR).toBe(0);
      expect(newRental.monthlyBondPaymentZAR).toBe(0);
    });

    it('enforces guardrails: throws error if dev does not exist or has zero ungraduated retained units', () => {
      // Unknown dev
      expect(() => {
        usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-unknown');
      }).toThrow(/Development with id dev-unknown not found/);

      // First graduation succeeds
      usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');

      // Second graduation on dev-1 fails because all retained units now have graduatedRentalId
      expect(() => {
        usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');
      }).toThrow(/No ungraduated retained units found/);
    });
  });

  // =========================================================================
  // 3. promoteOpportunityToDevelopment Pipeline Bridge
  // =========================================================================
  describe('3. promoteOpportunityToDevelopment: Deal Pipeline Mapping & Task Generation', () => {
    it('accurately maps analyzed opportunity metrics into a valid DevelopmentProject', () => {
      const targetOpp = {
        id: 'opp-adv-promote-1',
        title: 'Craighall Park Multi-Unit Infill',
        address: '88 Waterfall Avenue',
        city: 'Johannesburg',
        province: 'Gauteng',
        strategy: 'Development' as any,
        status: 'Screening',
        purchasePrice: 2_200_000,
        floorAreaSqm: 480,
        numberOfUnits: 6,
        estimatedRehabCost: 4_800_000, // 4,800,000 / 480 = 10,000 / sqm
        targetExitPrice: 10_800_000, // 10,800,000 / 6 = 1,800,000 list price / unit
        monthlyRentalEstimate: 72_000, // 72,000 / 6 = 12,000 rent / unit
        holdingPeriodMonths: 12,
        monthlyLevies: 3_500,
        monthlyRatesTaxes: 4_500,
        costs: {
          totalAcquisitionCost: 2_350_000, // acquisitionCosts = 2,350,000 - 2,200,000 = 150,000
        } as any,
      } as any as OpportunityDeal;

      usePortfolioStore.setState((s) => ({
        opportunities: [targetOpp, ...s.opportunities],
      }));

      const initialDevsCount = usePortfolioStore.getState().developments.length;

      usePortfolioStore.getState().promoteOpportunityToDevelopment('opp-adv-promote-1');

      const state = usePortfolioStore.getState();
      expect(state.developments.length).toBe(initialDevsCount + 1);

      const promotedDev = state.developments[0];
      expect(promotedDev.title).toBe('Craighall Park Multi-Unit Infill (Development)');
      expect(promotedDev.address).toBe('88 Waterfall Avenue');
      expect(promotedDev.city).toBe('Johannesburg');
      expect(promotedDev.province).toBe('Gauteng');
      expect(promotedDev.landPurchasePriceZAR).toBe(2_200_000);
      expect(promotedDev.acquisitionCostsZAR).toBe(150_000);
      expect(promotedDev.totalBuildableAreaSqm).toBe(480);
      expect(promotedDev.budgetedHardCostPerSqmZAR).toBe(10_000);
      expect(promotedDev.constructionMonths).toBe(12);
      expect(promotedDev.preApprovalMonths).toBe(4);
      expect(promotedDev.sellDownMonths).toBe(3);

      // Facility limit = (land + area * buildCostPerSqm) * 0.75
      // (2,200,000 + 480 * 10,000) * 0.75 = 7,000,000 * 0.75 = 5,250,000
      expect(promotedDev.developmentFacilityLimitZAR).toBe(5_250_000);
      expect(promotedDev.developmentFacilityDrawnZAR).toBe(0);
      expect(promotedDev.developmentFacilityRepaidZAR).toBe(0);

      // Holding burn rates
      expect(promotedDev.monthlyPreApprovalHoldingBurnZAR).toBe(8_000); // 3,500 + 4,500
      expect(promotedDev.monthlyConstructionHoldingBurnZAR).toBe(16_000); // 8,000 + 8,000

      // Units partitioned
      expect(promotedDev.units.length).toBe(6);
      promotedDev.units.forEach((u, idx) => {
        expect(u.unitNumber).toBe(`${idx + 1}`);
        expect(u.floorAreaSqm).toBe(80); // 480 / 6
        expect(u.listPriceVatInclZAR).toBe(1_800_000); // 10,800,000 / 6
        expect(u.estimatedMonthlyRentZAR).toBe(12_000); // 72,000 / 6
        expect(u.status).toBe('Available');
      });

      // Statutory approvals initialized to 'Not Started'
      expect(promotedDev.approvals.splumaRezoningSubdivision.status).toBe('Not Started');
      expect(promotedDev.approvals.sgDiagramApproval.status).toBe('Not Started');
      expect(promotedDev.approvals.municipalBuildingPlans.status).toBe('Not Started');
      expect(promotedDev.approvals.nhbrcEnrolment.status).toBe('Not Started');
      expect(promotedDev.approvals.sectionalTitleRegister.status).toBe('Not Started');
      expect(promotedDev.approvals.occupancyCertificate.status).toBe('Not Started');

      // Opportunity status updated
      const updatedOpp = state.opportunities.find((o) => o.id === 'opp-adv-promote-1')!;
      expect(updatedOpp.status).toBe('Promoted to Development');

      // Urgent onboarding conveyancer task generated
      const task = state.tasks.find((t) => t.linkedEntity?.id === promotedDev.id)!;
      expect(task).toBeDefined();
      expect(task.priority).toBe('Urgent');
      expect(task.status).toBe('Pending');
      expect(task.linkedEntity?.type).toBe('development');
      expect(task.title).toContain('Instruct conveyancer & town planner');
    });

    it('robustly handles sparse/minimal opportunities with sensible defaults and zero NaNs', () => {
      const minimalOpp = {
        id: 'opp-minimal',
        title: 'Bare Land Parcel',
        address: 'Plot 4, R511',
        city: 'Centurion',
        strategy: 'Development' as any,
        status: 'Screening',
        purchasePrice: 1_000_000,
        // All optional fields omitted: no numberOfUnits, no floorAreaSqm, no estimatedRehabCost, no targetExitPrice, etc.
      } as any as OpportunityDeal;

      usePortfolioStore.setState((s) => ({
        opportunities: [minimalOpp, ...s.opportunities],
      }));

      usePortfolioStore.getState().promoteOpportunityToDevelopment('opp-minimal');

      const promoted = usePortfolioStore.getState().developments[0];
      expect(promoted.title).toBe('Bare Land Parcel (Development)');

      // Default unit count = 4
      expect(promoted.units.length).toBe(4);
      // Default totalBuildableAreaSqm = 320 -> unit area = 80
      expect(promoted.totalBuildableAreaSqm).toBe(320);
      expect(promoted.units[0].floorAreaSqm).toBe(80);
      // Default buildCostPerSqm = 9500
      expect(promoted.budgetedHardCostPerSqmZAR).toBe(9500);

      // Verify no NaNs across all financial fields
      expect(Number.isFinite(promoted.landPurchasePriceZAR)).toBe(true);
      expect(Number.isFinite(promoted.acquisitionCostsZAR)).toBe(true);
      expect(Number.isFinite(promoted.developmentFacilityLimitZAR)).toBe(true);
      expect(Number.isFinite(promoted.monthlyPreApprovalHoldingBurnZAR)).toBe(true);
      expect(Number.isFinite(promoted.monthlyConstructionHoldingBurnZAR)).toBe(true);

      promoted.units.forEach((u) => {
        expect(Number.isFinite(u.floorAreaSqm)).toBe(true);
        expect(Number.isFinite(u.allocatedCostBasisZAR)).toBe(true);
        expect(Number.isFinite(u.listPriceVatInclZAR)).toBe(true);
        expect(Number.isFinite(u.estimatedMonthlyRentZAR)).toBe(true);
      });
    });

    it('gracefully ignores non-existent opportunity IDs without mutating state', () => {
      const stateBefore = usePortfolioStore.getState();
      usePortfolioStore.getState().promoteOpportunityToDevelopment('opp-does-not-exist');
      const stateAfter = usePortfolioStore.getState();

      expect(stateAfter.developments.length).toBe(stateBefore.developments.length);
      expect(stateAfter.tasks.length).toBe(stateBefore.tasks.length);
    });
  });

  // =========================================================================
  // 4. Portfolio Summary Selector Cross-Module Integration
  // =========================================================================
  describe('4. Portfolio Summary Selector Integration with Cross-Module Bridges', () => {
    it('dynamically adjusts GAV, liquid reserve, and liabilities when unit sales and graduations occur', () => {
      const summaryInitial = computePortfolioSummary({
        rentals: usePortfolioStore.getState().rentals,
        flips: usePortfolioStore.getState().flips,
        funding: usePortfolioStore.getState().funding,
        developments: usePortfolioStore.getState().developments,
        liquidCapitalReserve: usePortfolioStore.getState().liquidCapitalReserve,
      });

      expect(summaryInitial.activeDevelopmentsCount).toBe(2);
      expect(summaryInitial.totalDevelopmentValue).toBeGreaterThan(0);

      // Graduate dev-2 into rentals
      usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-2');

      const summaryAfterGraduation = computePortfolioSummary({
        rentals: usePortfolioStore.getState().rentals,
        flips: usePortfolioStore.getState().flips,
        funding: usePortfolioStore.getState().funding,
        developments: usePortfolioStore.getState().developments,
        liquidCapitalReserve: usePortfolioStore.getState().liquidCapitalReserve,
      });

      // Rentals count increased by 1
      expect(summaryAfterGraduation.activeRentalsCount).toBe(summaryInitial.activeRentalsCount + 1);
      // Total rental value increased
      expect(summaryAfterGraduation.totalRentalValue).toBeGreaterThan(summaryInitial.totalRentalValue);
    });
  });
});
