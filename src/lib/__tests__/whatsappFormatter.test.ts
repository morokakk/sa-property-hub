import { describe, it, expect } from 'vitest';
import {
  formatOpportunityForWhatsApp,
  formatFlipForWhatsApp,
  formatProposalPitchForWhatsApp,
} from '../whatsappFormatter';
import { OpportunityDeal, FlipProject, InvestorProfile } from '@/types';

describe('whatsappFormatter - Strategy Adaptive Formatting', () => {
  const mockInvestorProfile: InvestorProfile = {
    entityName: 'Apex Capital Properties',
    tradingAs: 'Apex Prop',
    registrationOrId: '2023/123456/07',
    contactNumber: '+27 82 123 4567',
    email: 'deals@apexcapital.co.za',
    website: 'https://apexcapital.co.za',
    physicalAddress: 'Sandton, Johannesburg',
    bioSummary: 'Private real estate investment firm',
    defaultPrimeRatePercent: 11.75,
    baselineHurdleYieldPercent: 10.0,
    defaultAgentCommissionPercent: 5.0,
  };

  const baseFlipDeal: OpportunityDeal = {
    id: 'opp-flip-1',
    title: 'Berea High-Yield Fix & Flip',
    address: '45 Lily Avenue, Berea',
    city: 'Johannesburg',
    province: 'Gauteng',
    propertyType: 'Sectional Title Apartment',
    source: 'Distressed Sale / Repo',
    status: 'Analyzing',
    strategy: 'Flip',
    openMarketValueZAR: 1_200_000,
    purchasePrice: 650_000,
    builtInEquityZAR: 550_000,
    builtInEquityPercent: 45.8,
    estimatedRehabCost: 180_000,
    monthlyRentalEstimate: 8_500,
    monthlyLevies: 1_800,
    monthlyRatesTaxes: 900,
    annualInsurance: 7_200,
    managementFeePercent: 8,
    vacancyRatePercent: 5,
    targetExitPrice: 1_150_000,
    holdingPeriodMonths: 6,
    monthlyBondPaymentZAR: 5_200,
    monthlyOtherHoldingCostZAR: 1_500,
    monthlyHoldingCostZAR: 9_400, // 5200 + 1800 + 900 + 1500
    loanToValuePercent: 80,
    bondLTV: 80,
    depositZAR: 130_000,
    interestRatePercent: 11.75,
    loanTermYears: 20,
    bondTermYears: 20,
    costs: {
      purchasePrice: 650_000,
      transferDuty: 0,
      conveyancingFee: 22_000,
      bondRegistrationFee: 18_000,
      deedsOfficeFee: 2_500,
      ficaSundries: 1_500,
      totalAcquisitionCost: 694_000,
    },
    grossYield: 15.7,
    capRate: 12.0,
    netRoi: 18.5,
    monthlyCashFlow: 0,
    initialCapitalRequired: 384_000,
    projectedFlipNetProfit: 276_000,
    projectedFlipRoi: 29.5,
    createdAt: '2026-09-20',
  };

  const baseRentalDeal: OpportunityDeal = {
    id: 'opp-rental-1',
    title: 'Ferndale Cash-Flow Duplex',
    address: '12 Dover Street, Ferndale',
    city: 'Randburg',
    province: 'Gauteng',
    propertyType: 'Townhouse / Cluster',
    source: 'Private Agent',
    status: 'Analyzing',
    strategy: 'Rental',
    openMarketValueZAR: 1_400_000,
    purchasePrice: 1_100_000,
    builtInEquityZAR: 300_000,
    builtInEquityPercent: 21.4,
    estimatedRehabCost: 50_000,
    monthlyRentalEstimate: 14_000,
    monthlyLevies: 1_500,
    monthlyRatesTaxes: 1_100,
    annualInsurance: 7_200,
    managementFeePercent: 8,
    vacancyRatePercent: 5,
    targetExitPrice: 1_500_000,
    holdingPeriodMonths: 6,
    loanToValuePercent: 90,
    bondLTV: 90,
    depositZAR: 110_000,
    interestRatePercent: 11.75,
    loanTermYears: 20,
    bondTermYears: 20,
    annualCapitalGrowthPercent: 5.0,
    annualRentalEscalationPercent: 6.0,
    annualExpenseInflationPercent: 6.0,
    costs: {
      purchasePrice: 1_100_000,
      transferDuty: 0,
      conveyancingFee: 28_000,
      bondRegistrationFee: 24_000,
      deedsOfficeFee: 2_500,
      ficaSundries: 1_500,
      totalAcquisitionCost: 1_156_000,
    },
    grossYield: 14.5,
    capRate: 11.2,
    netRoi: 14.8,
    monthlyCashFlow: 1_850,
    initialCapitalRequired: 216_000,
    projectedFlipNetProfit: 0,
    projectedFlipRoi: 0,
    createdAt: '2026-09-20',
  };

  it('formats Buy-and-Flip opportunity with holding period reserve and true net profit', () => {
    const output = formatOpportunityForWhatsApp(baseFlipDeal, mockInvestorProfile);

    // Verify Strategy Header
    expect(output).toContain('BUY-AND-FLIP OPPORTUNITY');
    expect(output).toContain('Strategy:* Buy & Flip');

    // Verify Holding Cost Escrow & Breakdown
    expect(output).toContain('Holding Period Reserve:');
    expect(output).toContain('6 mos @');
    expect(output).toContain('↳ Bond:');
    expect(output).toContain('Levies:');
    expect(output).toContain('Rates:');
    expect(output).toContain('Security:');

    // Verify Exit & Net Profit
    expect(output).toContain('Projected Net Flip Profit:');
    expect(output).toContain('(After capex & carrying escrow)');
    expect(output).toContain('Net Project ROI:');

    // Should NOT contain long-term rental compounding or 20-year bond paydown
    expect(output).not.toContain('LONG-TERM WEALTH COMPOUNDING');
    expect(output).not.toContain('10-Yr Net Equity');
    expect(output).not.toContain('Debt-Free');

    // Verify Investor Profile
    expect(output).toContain('Apex Capital Properties');
    expect(output).toContain('+27 82 123 4567');
  });

  it('formats Buy-and-Hold Rental opportunity with yields and 10/20-year wealth compounding', () => {
    const output = formatOpportunityForWhatsApp(baseRentalDeal, mockInvestorProfile);

    // Verify Strategy Header
    expect(output).toContain('BUY-AND-HOLD RENTAL OPPORTUNITY');
    expect(output).toContain('Strategy:* Buy & Hold Rental');

    // Verify Yields and Cash Flow
    expect(output).toContain('CASH FLOW & YIELD PERFORMANCE');
    expect(output).toContain('Gross Yield:');
    expect(output).toContain('Cap Rate:');
    expect(output).toContain('Net Cash Flow:');

    // Verify Long Term Wealth Compounding
    expect(output).toContain('LONG-TERM WEALTH COMPOUNDING');
    expect(output).toContain('10-Yr Net Equity:');
    expect(output).toContain('20-Yr Net Equity (Debt-Free):');
    expect(output).toContain('Escalation: 5% Capital • 6% Rent Escalation');

    // Should NOT contain flip carrying escrow
    expect(output).not.toContain('Holding Period Reserve:');
    expect(output).not.toContain('Projected Net Flip Profit');
  });

  it('formats FlipProject summary with holding reserve deducted from profit', () => {
    const flipProject: FlipProject = {
      id: 'flip-123',
      title: 'Kensington House Modernization',
      address: '77 Roberts Ave',
      city: 'Johannesburg',
      purchaseDate: '2026-05-01',
      purchasePriceZAR: 900_000,
      acquisitionCostsZAR: 45_000,
      baselineRenovationBudgetZAR: 250_000,
      targetExitPriceZAR: 1_650_000,
      targetCompletionDate: '2026-11-30',
      currentPhase: 'Finishes & Tiling',
      linkedFundingIds: [],
      estimatedDurationMonths: 6,
      monthlyHoldingCostZAR: 12_000,
      monthlyBondPaymentZAR: 7_500,
      monthlyLeviesZAR: 0,
      monthlyRatesTaxesZAR: 1_500,
      monthlyOtherHoldingCostZAR: 3_000,
      status: 'Active',
      strategy: 'Flip',
      boq: [
        {
          id: 'b1',
          itemDescription: 'Kitchen & Cabinetry',
          category: 'Kitchen & Cabinetry',
          quantity: 1,
          unit: 'lump sum',
          baselineUnitCostZAR: 80_000,
          baselineTotalZAR: 80_000,
          actualCostZAR: 80_000,
          varianceZAR: 0,
          supplierOrContractor: 'Top Joinery',
          status: 'Completed',
        },
      ],
      capitalRaisedZAR: 800_000,
      fundingRequiredZAR: 1_200_000,
      primaryFunderName: 'Standard Private Capital',
      promisedReturnRatePercent: 15,
      promisedReturnType: 'Fixed Interest',
      securityOffered: '1st Mortgage Bond',
    };

    const output = formatFlipForWhatsApp(flipProject, mockInvestorProfile);

    expect(output).toContain('BUY-AND-FLIP DEAL SNAPSHOT');
    expect(output).toContain('Holding Period Reserve:');
    expect(output).toContain('6 mos @');
    expect(output).toContain('↳ Bond:');
    expect(output).toContain('Projected Net Profit:');
    expect(output).toContain('(After capex & holding reserve)');
    expect(output).toContain('Lead Funder: *Standard Private Capital*');
    expect(output).toContain('Promised Return: *15%*');
  });

  it('formats Proposal Generator private lender pitch memorandum', () => {
    const output = formatProposalPitchForWhatsApp({
      deal: {
        id: 'deal-pitch-1',
        title: 'Morningside Executive Apartment Flip',
        address: '12 Rivonia Road',
        city: 'Sandton',
        purchasePrice: 1_200_000,
        acquisitionCosts: 65_000,
        renovationBudget: 220_000,
        targetExitPrice: 1_850_000,
        completionDate: '2026-12-15',
        strategy: 'Flip',
        holdingDurationMonths: 6,
        monthlyHoldingCost: 11_500,
        monthlyBondHolding: 7_000,
        monthlyLeviesHolding: 2_000,
        monthlyRatesHolding: 1_500,
        monthlyOtherHolding: 1_000,
      },
      strategy: 'Flip',
      capitalRequested: 1_000_000,
      fundingOfferType: 'Fixed Interest',
      offeredRate: 14.5,
      securityType: '2nd Mortgage Bond registered over title deed',
      investorProfile: mockInvestorProfile,
    });

    expect(output).toContain('CONFIDENTIAL INVESTMENT MEMORANDUM');
    expect(output).toContain('Morningside Executive Apartment Flip');
    expect(output).toContain('Strategy Mandate:* *🔄 Buy & Flip*');
    expect(output).toContain('Holding Cost Escrow:');
    expect(output).toContain('Total Project Outlay:');
    expect(output).toContain('Facility Principal:');
    expect(output).toContain('Proposed Return: *14.5%* (p.a. Fixed Interest)');
    expect(output).toContain('Coupon Payout: Monthly in advance');
    expect(output).toContain('*Sponsor:* Apex Capital Properties');
  });

  it('formats Proposal Generator pitch with High-Street Auction sourcing and distressed arrears', () => {
    const output = formatProposalPitchForWhatsApp({
      deal: {
        id: 'deal-auction-1',
        title: 'Parkhurst Distressed Sheriff Auction',
        address: '42 4th Avenue, Parkhurst',
        city: 'Johannesburg',
        purchasePrice: 1_750_000,
        acquisitionCosts: 95_000,
        renovationBudget: 450_000,
        targetExitPrice: 2_850_000,
        strategy: 'Flip',
        source: 'High-Street Auction',
        auctioneerCommission: 201_250,
        municipalArrears: 45_000,
        holdingDurationMonths: 6,
        monthlyHoldingCost: 15_000,
      },
      strategy: 'Flip',
      capitalRequested: 1_500_000,
      fundingOfferType: 'Fixed Interest',
      offeredRate: 15.0,
      securityType: '2nd Mortgage Bond registered over title deed',
      investorProfile: mockInvestorProfile,
    });

    expect(output).toContain('Sourcing:* High-Street Auction (10% Cash Guarantee Secured)');
    expect(output).toContain('Auctioneer Fee (10%+VAT):');
    expect(output).toContain('Municipal Clearance Arrears:');
  });

  it('formats Proposal Generator pitch for iGrow Turnkey Rental with Section 13sex', () => {
    const output = formatProposalPitchForWhatsApp({
      deal: {
        id: 'deal-igrow-1',
        title: 'Greencreek Riverwalk Developer Unit',
        address: 'Greencreek Estate',
        city: 'Pretoria',
        purchasePrice: 899_000,
        acquisitionCosts: 35_000,
        renovationBudget: 0,
        targetExitPrice: 1_150_000,
        strategy: 'Rental',
        source: 'iGrow Rentals',
        isSection13Eligible: true,
      },
      strategy: 'Rental',
      capitalRequested: 600_000,
      fundingOfferType: 'Profit Share',
      offeredRate: 20.0,
      securityType: 'JV Syndicate Profit Participation',
      investorProfile: mockInvestorProfile,
    });

    expect(output).toContain('Sourcing:* iGrow Rentals (Turnkey • Section 13sex Tax Shield • R0 Transfer Duty)');
    expect(output).toContain('SARS Transfer Duty: *R 0* (VAT Inclusive Developer Stock)');
    expect(output).toContain('SARS Tax Shield: *Section 13sex Eligible*');
  });

  it('formats Proposal Generator pitch for BRRRR strategy with refinance exit terms', () => {
    const output = formatProposalPitchForWhatsApp({
      deal: {
        id: 'deal-brrrr-1',
        title: 'Berea Value-Add BRRRR Conversion',
        address: '88 Tudhope Avenue',
        city: 'Johannesburg',
        purchasePrice: 650_000,
        acquisitionCosts: 45_000,
        renovationBudget: 250_000,
        targetExitPrice: 1_350_000,
        strategy: 'BRRRR',
        source: 'Distressed Sale / Repo',
        arvZAR: 1_350_000,
        refinanceLtvPercent: 75,
      },
      strategy: 'BRRRR',
      capitalRequested: 700_000,
      fundingOfferType: 'Fixed Interest',
      offeredRate: 14.0,
      securityType: '1st Mortgage Bridge Bond',
      investorProfile: mockInvestorProfile,
    });

    expect(output).toContain('Strategy Mandate:* *⚡ Hybrid BRRRR*');
    expect(output).toContain('Sourcing:* Distressed Bank Repo');
    expect(output).toContain('Post-Rehab ARV Valuation:');
    expect(output).toContain('Lender Capital Exit:* Phase 2 Bank Refinance @ Month 6');
  });
});
