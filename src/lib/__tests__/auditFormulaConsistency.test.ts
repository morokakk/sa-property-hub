import { describe, it, expect } from 'vitest';
import { computePortfolioSummary, usePortfolioStore } from '../store/usePortfolioStore';
import { INITIAL_FLIPS } from '../store/initialData';
import { calculateFlipMao } from '../calculations/maoSolver';
import {
  calculateMonthlyBondRepayment,
  calculateBondPrincipalFromRepayment,
} from '../calculations/propertyMetrics';
import {
  formatFlipForWhatsApp,
  formatOpportunityForWhatsApp,
  formatProposalPitchForWhatsApp,
} from '../whatsappFormatter';
import { formatZAR } from '../formatters';
import { FlipProject, FundingSource, OpportunityDeal, RentalProperty } from '@/types';

describe('Audit Formula & Dashboard Consistency Plan Verification', () => {
  // --------------------------------------------------------------------------
  // Requirement 1 & 3: Visual Math Exactness: Gross - Flip Tax = Net Realizable
  // --------------------------------------------------------------------------
  describe('1. Main Dashboard Visual Math Exactness & Segregated Tax Reserves', () => {
    it('guarantees Gross Flip Profit - Flip Tax = Net Realizable Flip Profit', () => {
      const activeFlip: FlipProject = {
        id: 'flip-math-1',
        title: 'Math Consistency Project',
        address: '10 Alpha Way',
        city: 'Sandton',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        baselineRenovationBudgetZAR: 200_000,
        monthlyHoldingCostZAR: 5_000,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 2_000_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Strip & Demolition',
        taxEntityType: 'Company (27%)',
        exitCommissionPercent: 5.75, // 5.75% of 2,000,000 = 115,000
        drawSchedule: {
          depositPaid: true,
          firstFixApproved: false,
          finishesApproved: false,
          retentionReleased: false,
        },
        boq: [],
      };

      const rentalWithIncome: RentalProperty = {
        id: 'rental-math-1',
        title: 'Sandton Exec Suite',
        address: '12 Sandton Blvd',
        city: 'Sandton',
        purchasePriceZAR: 1_200_000,
        purchaseDate: '2025-01-01',
        outstandingBondBalanceZAR: 800_000,
        bondInterestRatePercent: 11.75,
        marketValueZAR: 1_500_000,
        monthlyGrossRentZAR: 18_000,
        monthlyLeviesZAR: 2_000,
        monthlyRatesTaxesZAR: 1_000,
        monthlyMaintenanceReserveZAR: 500,
        monthlyBondPaymentZAR: 9_000,
        propertyType: 'Sectional Title Apartment',
        status: 'Occupied',
        monthlyAgentFeeZAR: 0,
        maintenanceHistory: [],
        leases: [{
          id: 'l-1',
          unitName: 'Unit 1',
          tenantName: 'Tenant 1',
          leaseStartDate: '2026-01-01',
          leaseEndDate: '2026-12-31',
          monthlyRentZAR: 18_000,
          depositHeldZAR: 36_000,
          annualEscalationPercent: 6,
          status: 'Occupied',
        }],
      };

      const summary = computePortfolioSummary({
        rentals: [rentalWithIncome],
        flips: [activeFlip],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
        investorProfile: {
          entityName: 'Test Capital',
          tradingAs: 'TC',
          registrationOrId: '2026/001',
          contactNumber: '0820000000',
          email: 'lead@test.co.za',
          bioSummary: 'Property Investor',
          defaultPrimeRatePercent: 11.75,
          baselineHurdleYieldPercent: 10,
          defaultAgentCommissionPercent: 5,
          defaultTaxEntityType: 'Company (27%)',
        },
      });

      // Total outlay = purchase (1M) + acq (50k) + reno (200k) + holding (30k) + exit commission (115k) = 1,395,000
      // Gross Flip Profit = 2,000,000 - 1,395,000 = 605,000
      // Flip Tax (Company 27%) = 605,000 * 0.27 = 163,350
      // Net Realizable = 605,000 - 163,350 = 441,650
      expect(summary.totalGrossProjectedFlipProfits).toBe(605_000);
      expect(summary.totalSarsFlipTaxReserve).toBe(163_350);
      expect(summary.totalNetProjectedFlipProfits).toBe(441_650);

      // Main Dashboard Visual Math rule: Gross Flip Profit - Flip Tax = Net Realizable Flip Profit
      expect(summary.totalGrossProjectedFlipProfits - summary.totalSarsFlipTaxReserve).toBe(
        summary.totalNetProjectedFlipProfits
      );

      // Total SARS Tax Reserve = Flip Tax + Rental Tax
      expect(summary.totalSarsRentalTaxReserve).toBeGreaterThan(0);
      expect(summary.totalSarsProvisionalTaxReserve).toBe(
        summary.totalSarsFlipTaxReserve + summary.totalSarsRentalTaxReserve
      );
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Empty BOQ Fallback to baselineRenovationBudgetZAR
  // --------------------------------------------------------------------------
  describe('2. Empty BOQ Baseline Renovation Fallback', () => {
    it('uses baselineRenovationBudgetZAR when BOQ is empty in portfolio summary', () => {
      const flipNoBoq: FlipProject = {
        id: 'flip-empty-boq',
        title: 'Empty BOQ Project',
        address: '22 Ocean View',
        city: 'Durban',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 0,
        baselineRenovationBudgetZAR: 350_000,
        monthlyHoldingCostZAR: 0,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 1_600_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Strip & Demolition',
        taxEntityType: 'Individual (45%)',
        exitCommissionPercent: 0,
        drawSchedule: {
          depositPaid: false,
          firstFixApproved: false,
          finishesApproved: false,
          retentionReleased: false,
        },
        boq: [], // Empty BOQ
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [flipNoBoq],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Total outlay must include 350,000 baseline rehab budget
      // Gross profit = 1,600,000 - (1,000,000 + 350,000) = 250,000
      expect(summary.totalGrossProjectedFlipProfits).toBe(250_000);
    });

    it('uses baselineRenovationBudgetZAR in formatFlipForWhatsApp when BOQ is empty', () => {
      const flip: FlipProject = {
        id: 'flip-wa-boq',
        title: 'WhatsApp BOQ Flip',
        address: '5 Cape Rd',
        city: 'Gqeberha',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 800_000,
        acquisitionCostsZAR: 40_000,
        baselineRenovationBudgetZAR: 200_000,
        monthlyHoldingCostZAR: 4_000,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 1_300_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Finishes & Tiling',
        taxEntityType: 'Company (27%)',
        drawSchedule: {
          depositPaid: true,
          firstFixApproved: false,
          finishesApproved: false,
          retentionReleased: false,
        },
        boq: [],
      };

      const waText = formatFlipForWhatsApp(flip);
      expect(waText).toContain(`BOQ Renovation Spend: *${formatZAR(200_000)}* (Budget: ${formatZAR(200_000)})`);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 3: Exit Commission Standard (5.75% default, per-flip override)
  // --------------------------------------------------------------------------
  describe('3. Exit Sales Commission Calculations across modules', () => {
    it('applies per-flip exit commission override in computePortfolioSummary', () => {
      const flipCustomCommission: FlipProject = {
        id: 'flip-custom-comm',
        title: 'Custom Commission Deal',
        address: '17 Loop St',
        city: 'Cape Town',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 0,
        baselineRenovationBudgetZAR: 0,
        monthlyHoldingCostZAR: 0,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 2_000_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Finishes & Tiling',
        taxEntityType: 'Company (27%)',
        exitCommissionPercent: 4.0, // 4% of 2,000,000 = 80,000
        drawSchedule: {
          depositPaid: false,
          firstFixApproved: false,
          finishesApproved: false,
          retentionReleased: false,
        },
        boq: [],
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [flipCustomCommission],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Outlay = 1,000,000 purchase + 80,000 commission = 1,080,000
      // Gross Profit = 2,000,000 - 1,080,000 = 920,000
      expect(summary.totalGrossProjectedFlipProfits).toBe(920_000);
    });

    it('deducts exit commission and municipal clearance in calculateFlipMao', () => {
      const mao = calculateFlipMao({
        targetExitPrice: 2_000_000,
        desiredRoiPercent: 20,
        rehabCost: 200_000,
        holdingCost: 50_000,
        estimatedAcquisitionCostRate: 0.05,
        exitCommissionPercent: 5.75,
        municipalClearanceZAR: 25_000,
      });

      expect(mao.maxAllowableBid).toBe(1_215_873);
      expect(mao.nonPurchaseCosts).toBe(390_000);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 4 & 5: Funding Tracker: Standby/Tranches & Coupon/Interest Payout
  // --------------------------------------------------------------------------
  describe('4 & 5. Private Funding Debt Liabilities & Repayment Differentiation', () => {
    it('excludes Standby facilities and undisbursed tranches from private debt liabilities', () => {
      const standbyFacility: FundingSource = {
        id: 'fund-standby',
        lenderName: 'Standby Angel',
        entityOrContact: 'Angel Contact',
        emailPhone: 'angel@invest.com',
        fundingType: 'Private Lender',
        capitalAmountZAR: 2_000_000,
        disbursementDate: '2026-01-01',
        maturityDate: '2027-01-01',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 12,
        paymentSchedule: 'Monthly Interest',
        status: 'Standby',
        totalRepaidZAR: 0,
      };

      const tranchedFacility: FundingSource = {
        id: 'fund-tranched',
        lenderName: 'Tranche Funder',
        entityOrContact: 'Syndicate Lead',
        emailPhone: 'syndicate@invest.com',
        fundingType: 'Equity Partner',
        capitalAmountZAR: 1_000_000,
        disbursementDate: '2026-01-01',
        maturityDate: '2026-12-31',
        returnTermsType: 'Equity Profit Split',
        returnRatePercent: 25,
        paymentSchedule: 'At Exit (Maturity)',
        status: 'Active',
        tranches: [
          { id: 't-1', name: 'Tranche 1', amountZAR: 300_000, isDisbursed: true, disbursedDate: '2026-01-01' },
          { id: 't-2', name: 'Tranche 2', amountZAR: 700_000, isDisbursed: false }, // Undrawn
        ],
        totalRepaidZAR: 50_000,
      };

      const settledFacility: FundingSource = {
        id: 'fund-settled',
        lenderName: 'Settled Funder',
        entityOrContact: 'Bank Contact',
        emailPhone: 'settled@invest.com',
        fundingType: 'Private Lender',
        capitalAmountZAR: 500_000,
        disbursementDate: '2025-01-01',
        maturityDate: '2025-12-31',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 10,
        paymentSchedule: 'Monthly Interest',
        status: 'Settled',
        totalRepaidZAR: 500_000,
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [],
        funding: [standbyFacility, tranchedFacility, settledFacility],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Standby = 0 liability
      // Tranched = 300,000 drawn - 50,000 repaid = 250,000 liability
      // Settled = 0 liability
      // Total private funding liability must be exactly 250,000
      expect(summary.totalPrivateFundingLiability).toBe(250_000);
    });

    it('differentiates Monthly Coupon / Interest from Principal Repayment in store updates', () => {
      const initialFacility: FundingSource = {
        id: 'fund-coupon-test',
        lenderName: 'Yield Investor',
        entityOrContact: 'Private Investor',
        emailPhone: 'investor@test.co.za',
        fundingType: 'Private Lender',
        capitalAmountZAR: 500_000,
        disbursementDate: '2026-01-01',
        maturityDate: '2026-12-31',
        returnTermsType: 'Fixed Interest',
        returnRatePercent: 12,
        paymentSchedule: 'Monthly Interest',
        status: 'Active',
        totalRepaidZAR: 0,
        totalInterestPaidZAR: 0,
      };

      usePortfolioStore.setState({
        funding: [initialFacility],
      });

      // Simulating "Monthly Coupon / Interest": updates totalInterestPaidZAR, leaves principal debt unchanged
      const couponPayment = 5_000;
      usePortfolioStore.getState().updateFunding('fund-coupon-test', {
        totalInterestPaidZAR: (initialFacility.totalInterestPaidZAR || 0) + couponPayment,
      });

      let updatedFacility = usePortfolioStore.getState().funding.find((f) => f.id === 'fund-coupon-test')!;
      expect(updatedFacility.totalInterestPaidZAR).toBe(5_000);
      expect(updatedFacility.totalRepaidZAR).toBe(0); // Principal balance untouched!
      expect(updatedFacility.status).toBe('Active');

      let summary = computePortfolioSummary(usePortfolioStore.getState());
      expect(summary.totalPrivateFundingLiability).toBe(500_000);

      // Simulating "Principal Repayment": updates totalRepaidZAR and reduces outstanding liability
      const principalRepayment = 200_000;
      usePortfolioStore.getState().updateFunding('fund-coupon-test', {
        totalRepaidZAR: (updatedFacility.totalRepaidZAR || 0) + principalRepayment,
      });

      updatedFacility = usePortfolioStore.getState().funding.find((f) => f.id === 'fund-coupon-test')!;
      expect(updatedFacility.totalRepaidZAR).toBe(200_000);
      expect(updatedFacility.totalInterestPaidZAR).toBe(5_000);
      expect(updatedFacility.status).toBe('Active');

      summary = computePortfolioSummary(usePortfolioStore.getState());
      expect(summary.totalPrivateFundingLiability).toBe(300_000);

      // Settle remaining principal
      usePortfolioStore.getState().updateFunding('fund-coupon-test', {
        totalRepaidZAR: 500_000,
        status: 'Settled',
      });

      summary = computePortfolioSummary(usePortfolioStore.getState());
      expect(summary.totalPrivateFundingLiability).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 7 & 8: Bond Math (Inverse PMT) and Proposal Duration Scaling
  // --------------------------------------------------------------------------
  describe('7 & 8. Dynamic Bond Calculations & Proposal Duration Scaling', () => {
    it('correctly calculates PMT and its mathematical inverse', () => {
      const principal = 1_000_000;
      const rate = 11.75;
      const termYears = 20;

      const monthlyRepayment = calculateMonthlyBondRepayment(principal, rate, termYears);
      expect(monthlyRepayment).toBeGreaterThan(10_800);
      expect(monthlyRepayment).toBeLessThan(10_900);

      const reconstructedPrincipal = calculateBondPrincipalFromRepayment(monthlyRepayment, rate, termYears);
      expect(Math.abs(reconstructedPrincipal - principal)).toBeLessThan(50);
    });

    it('scales Fixed Interest lender payouts in WhatsApp pitch by duration', () => {
      const deal6Mos = {
        id: 'deal-pitch-6mos',
        title: '6 Month Pitch Deal',
        address: '10 High St',
        city: 'Pretoria',
        province: 'Gauteng',
        purchasePrice: 1_000_000,
        openMarketValueZAR: 1_400_000,
        estimatedRehabCost: 200_000,
        targetExitPrice: 1_600_000,
        holdingPeriodMonths: 6,
        source: 'Private Agent',
        status: 'Due Diligence',
        createdAt: '2026-01-01',
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          deedsOfficeFee: 2_000,
          bondRegistrationFee: 0,
          ficaSundries: 0,
          totalAcquisitionCost: 1_027_000,
        },
        grossYield: 10,
        netRoi: 8,
        capRate: 9,
        monthlyRentalEstimate: 12_000,
        monthlyCashFlow: 3_000,
        initialCapitalRequired: 400_000,
        projectedFlipNetProfit: 300_000,
        projectedFlipRoi: 20,
      } as unknown as OpportunityDeal;

      const pitchText6Mos = formatProposalPitchForWhatsApp({
        deal: {
          ...deal6Mos,
          acquisitionCosts: 27_000,
          renovationBudget: 200_000,
          holdingDurationMonths: 6,
        },
        strategy: 'Flip',
        capitalRequested: 500_000,
        fundingOfferType: 'Fixed Interest',
        offeredRate: 12, // 12% p.a.
        securityType: '1st Mortgage Bond',
      });

      // 6 months at 12% p.a. on 500,000 = 500,000 * 0.12 * (6/12) = 30,000 interest
      // Total payout: 530,000
      expect(pitchText6Mos).toContain(`• Projected Total Payout: *${formatZAR(530_000)}*`);

      // Now pitch for 12 months duration
      const pitchText12Mos = formatProposalPitchForWhatsApp({
        deal: {
          ...deal6Mos,
          acquisitionCosts: 27_000,
          renovationBudget: 200_000,
          holdingDurationMonths: 12,
        },
        strategy: 'Flip',
        capitalRequested: 500_000,
        fundingOfferType: 'Fixed Interest',
        offeredRate: 12, // 12% p.a.
        securityType: '1st Mortgage Bond',
      });

      // 12 months at 12% p.a. on 500,000 = 500,000 * 0.12 * (12/12) = 60,000 interest
      // Total payout: 560,000
      expect(pitchText12Mos).toContain(`• Projected Total Payout: *${formatZAR(560_000)}*`);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 8: WhatsApp Deal Snapshot Dual ROIs
  // --------------------------------------------------------------------------
  describe('8. WhatsApp Deal Snapshot Nominal vs Annualized ROI', () => {
    it('outputs both Nominal and Annualized ROI in formatFlipForWhatsApp', () => {
      const flip6Mos: FlipProject = {
        id: 'flip-wa-dual-roi',
        title: 'Dual ROI Project',
        address: '44 Sunset Blvd',
        city: 'Johannesburg',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        baselineRenovationBudgetZAR: 200_000,
        monthlyHoldingCostZAR: 5_000,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 1_600_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Finishes & Tiling',
        taxEntityType: 'Company (27%)',
        exitCommissionPercent: 5.75, // 92,000
        drawSchedule: {
          depositPaid: true,
          firstFixApproved: false,
          finishesApproved: false,
          retentionReleased: false,
        },
        boq: [],
      };

      const waText = formatFlipForWhatsApp(flip6Mos);
      // Total outlay = 1,000,000 + 50,000 + 200,000 + (6 * 5,000) + 92,000 = 1,372,000
      // Net Profit = 1,600,000 - 1,372,000 = 228,000
      // Nominal ROI = 228,000 / 1,372,000 = 16.6%
      // Annualized ROI = 16.6% * (12 / 6) = 33.2%
      expect(waText).toContain('• Project Net ROI (Nominal): *16.6%*');
      expect(waText).toContain('• Annualized Net ROI: *33.2%*');
      expect(waText).toContain(`• Exit Commission (5.75%): ${formatZAR(92_000)}`);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Seed Data Holding Cost Verification
  // --------------------------------------------------------------------------
  describe('9. Seed Data Holding Costs & Exit Commission Defaults', () => {
    it('verifies flip-3 seed data holding cost is exactly R 3,900', () => {
      const flip3 = INITIAL_FLIPS.find((f) => f.id === 'flip-3');
      expect(flip3).toBeDefined();
      expect(flip3?.monthlyHoldingCostZAR).toBe(3_900);
      expect(flip3?.monthlyRatesTaxesZAR).toBe(2_100);
      expect(flip3?.monthlyOtherHoldingCostZAR).toBe(1_800);
    });

    it('verifies initial flips default exitCommissionPercent to 5.75', () => {
      INITIAL_FLIPS.forEach((flip) => {
        expect(flip.exitCommissionPercent).toBe(5.75);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Archive Card Profit Equation
  // --------------------------------------------------------------------------
  describe('6. Completed Flip Archive Profit Equation Consistency', () => {
    it('deducts holding costs, municipal clearance, and exit commission for realized profit', () => {
      const completedFlip: FlipProject = {
        id: 'flip-archived-test',
        title: 'Archived Completed Flip',
        address: '88 Heritage Way',
        city: 'Paarl',
        purchaseDate: '2025-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        baselineRenovationBudgetZAR: 150_000,
        monthlyHoldingCostZAR: 6_000,
        estimatedDurationMonths: 5, // total holding = 30,000
        municipalClearance: {
          sec118ArrearsZAR: 15_000,
          advanceCouncilDepositZAR: 0,
          rccStatus: 'Certificate Issued',
        },
        targetExitPriceZAR: 1_600_000,
        actualSalePriceZAR: 1_600_000,
        targetCompletionDate: '2025-06-01',
        linkedFundingIds: [],
        status: 'Completed',
        currentPhase: 'Sold / Awaiting Transfer',
        taxEntityType: 'Company (27%)',
        exitCommissionPercent: 5.75, // 92,000
        drawSchedule: {
          depositPaid: true,
          firstFixApproved: true,
          finishesApproved: true,
          retentionReleased: true,
        },
        boq: [],
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [completedFlip],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Total outlay = purchase (1M) + acq (50k) + reno (150k) + holding (30k) + clearance (15k) + exit commission (92k) = 1,337,000
      // Realized profit = 1,600,000 - 1,337,000 = 263,000
      expect(summary.totalRealizedFlipProfits).toBe(263_000);
    });

    it('guarantees archive card visual math equation: Realized Sale - Full Cost Basis = Realized Profit', () => {
      const completedFlip: FlipProject = {
        id: 'flip-archive-visual-math',
        title: 'Archived Completed Flip Project',
        address: '22 Ocean View',
        city: 'Camps Bay',
        purchaseDate: '2025-01-01',
        purchasePriceZAR: 1_450_000,
        acquisitionCostsZAR: 98_500,
        baselineRenovationBudgetZAR: 320_000,
        monthlyHoldingCostZAR: 3_900,
        estimatedDurationMonths: 8, // total holding = 31,200
        municipalClearance: {
          sec118ArrearsZAR: 32_000,
          advanceCouncilDepositZAR: 12_600,
          rccStatus: 'Certificate Issued',
        },
        targetExitPriceZAR: 2_450_000,
        actualSalePriceZAR: 2_450_000,
        targetCompletionDate: '2025-09-01',
        linkedFundingIds: [],
        status: 'Completed',
        currentPhase: 'Sold / Awaiting Transfer',
        taxEntityType: 'Company (27%)',
        exitCommissionPercent: 5.75, // exit commission = 140,875
        drawSchedule: {
          depositPaid: true,
          firstFixApproved: true,
          finishesApproved: true,
          retentionReleased: true,
        },
        boq: [],
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [completedFlip],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Breakdown:
      // costBasis = purchase (1,450,000) + acquisition (98,500) + reno (320,000) = 1,868,500
      // holdingCost = 8 * 3,900 = 31,200
      // sec118Cost = 32,000 + 12_600 = 44,600
      // exitCommission = Math.round(2,450,000 * 0.0575) = 140,875
      // fullCostBasis = 1,868,500 + 31,200 + 44,600 + 140,875 = 2,085,175
      // Realized profit = 2,450,000 - 2,085,175 = 364,825
      const expectedFullCostBasis = 2_085_175;
      const expectedRealizedNetProfit = 364_825;

      expect(summary.totalRealizedFlipProfits).toBe(expectedRealizedNetProfit);

      // Verify dynamic calculation: extending holding duration by 2 months (2 * 3,900 = 7,800) reduces realized profit by exactly 7,800
      const delayedSummary = computePortfolioSummary({
        rentals: [],
        flips: [{ ...completedFlip, id: 'flip-archive-delayed', estimatedDurationMonths: 10 }],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });
      expect(delayedSummary.totalRealizedFlipProfits).toBe(expectedRealizedNetProfit - 7_800);
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 10: Deep Robustness & Store Default Consistency
  // --------------------------------------------------------------------------
  describe('10. Deep Edge Cases & Store Default Consistency', () => {
    it('defaults exitCommissionPercent to 5.75% in computePortfolioSummary when undefined on a flip', () => {
      const flipNoCommission: FlipProject = {
        id: 'flip-no-commission-attr',
        title: 'Flip With Undefined Commission',
        address: '15 Main Road',
        city: 'Cape Town',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        baselineRenovationBudgetZAR: 100_000,
        monthlyHoldingCostZAR: 5_000,
        estimatedDurationMonths: 6, // holding = 30,000
        targetExitPriceZAR: 2_000_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Snagging',
        taxEntityType: 'Company (27%)',
        // exitCommissionPercent is omitted / undefined
        boq: [],
      };

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [flipNoCommission],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      // Default 5.75% of 2,000,000 = 115,000
      // Total cost = 1,000,000 + 50,000 + 100,000 + 30,000 + 115,000 = 1,295,000
      // Gross Profit = 2,000,000 - 1,295,000 = 705,000
      expect(summary.totalGrossProjectedFlipProfits).toBe(705_000);
      expect(summary.totalSarsFlipTaxReserve).toBe(Math.round(705_000 * 0.27));
    });

    it('safely handles flips with undefined or null boq property without crashing', () => {
      const flipWithNullBoq = {
        id: 'flip-null-boq',
        title: 'Flip With Null BOQ',
        address: '10 Crash Test Ave',
        city: 'Johannesburg',
        purchaseDate: '2026-01-01',
        purchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        baselineRenovationBudgetZAR: 200_000,
        monthlyHoldingCostZAR: 5_000,
        estimatedDurationMonths: 6,
        targetExitPriceZAR: 2_000_000,
        targetCompletionDate: '2026-07-01',
        linkedFundingIds: [],
        status: 'Active',
        currentPhase: 'Snagging',
        taxEntityType: 'Company (27%)',
        boq: undefined as unknown as [],
      } as unknown as FlipProject;

      const summary = computePortfolioSummary({
        rentals: [],
        flips: [flipWithNullBoq],
        funding: [],
        opportunities: [],
        liquidCapitalReserve: 0,
      });

      expect(summary.totalGrossProjectedFlipProfits).toBeGreaterThan(0);

      // Verify formatFlipForWhatsApp also handles undefined boq safely
      const waText = formatFlipForWhatsApp(flipWithNullBoq);
      expect(waText).toContain(`• BOQ Renovation Spend: *${formatZAR(200_000)}*`);
    });

    it('outputs both Nominal and Annualized ROI in formatOpportunityForWhatsApp', () => {
      const oppDeal = {
        id: 'opp-dual-roi-test',
        title: 'Opportunity Dual ROI Deal',
        address: '5 West St',
        city: 'Sandton',
        province: 'Gauteng',
        purchasePrice: 1_000_000,
        openMarketValueZAR: 1_500_000,
        estimatedRehabCost: 200_000,
        targetExitPrice: 1_800_000,
        holdingPeriodMonths: 6,
        source: 'Private Agent',
        status: 'Due Diligence',
        strategy: 'Flip',
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 30_000,
          deedsOfficeFee: 2_000,
          bondRegistrationFee: 0,
          ficaSundries: 0,
          totalAcquisitionCost: 1_032_000,
        },
        monthlyHoldingCostZAR: 10_000,
        grossYield: 0,
        netRoi: 0,
        capRate: 0,
        monthlyCashFlow: 0,
        initialCapitalRequired: 300_000,
        projectedFlipNetProfit: 0,
        projectedFlipRoi: 0,
        createdAt: '2026-01-01',
      } as unknown as OpportunityDeal;

      const waText = formatOpportunityForWhatsApp(oppDeal);
      expect(waText).toContain('• Net Project ROI:');
      expect(waText).toContain('(Nominal)');
      expect(waText).toContain('• Annualized Net ROI:');
    });
  });
});
