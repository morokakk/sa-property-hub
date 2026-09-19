import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { OpportunityDeal, RentalProperty, FlipProject } from '@/types';
import { computeAcquisitionCosts } from '@/lib/calculations/sarsTax';
import { calculateDealMetrics } from '@/lib/calculations/propertyMetrics';

describe('usePortfolioStore Bulk Import Actions', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('bulkAddOpportunities appends deals and counts duplicates correctly', () => {
    const initialCount = usePortfolioStore.getState().opportunities.length;
    const initialTasksCount = usePortfolioStore.getState().tasks.length;

    const costs = computeAcquisitionCosts(2000000);
    const metrics = calculateDealMetrics({
      purchasePrice: 2000000,
      estimatedRehabCost: 100000,
      monthlyRentalEstimate: 18000,
      monthlyLevies: 1500,
      monthlyRatesTaxes: 1200,
      annualInsurance: 8000,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice: 2600000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs,
    });

    const newDeal1: OpportunityDeal = {
      id: 'opp-test-1',
      title: 'Brand New Sourcing Opportunity in Bryanston',
      address: '99 Main Rd',
      city: 'Johannesburg',
      province: 'Gauteng',
      propertyType: 'Sectional Title Apartment',
      agmDate: '2026-12-01',
      source: 'Private Agent',
      openMarketValueZAR: 2600000,
      purchasePrice: 2000000,
      builtInEquityZAR: 600000,
      builtInEquityPercent: 23.1,
      estimatedRehabCost: 100000,
      monthlyRentalEstimate: 18000,
      monthlyLevies: 1500,
      monthlyRatesTaxes: 1200,
      annualInsurance: 8000,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice: 2600000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      bondLTV: 80,
      depositZAR: 400000,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs,
      grossYield: metrics.grossYield,
      capRate: metrics.capRate,
      netRoi: metrics.netRoi,
      monthlyCashFlow: metrics.monthlyCashFlow,
      projectedFlipNetProfit: metrics.projectedFlipNetProfit,
      projectedFlipRoi: metrics.projectedFlipRoi,
      status: 'Analyzing',
      createdAt: '2026-09-19',
    };

    // Duplicate matching existing demo deal
    const existingOpp = usePortfolioStore.getState().opportunities[0];
    const duplicateDeal: OpportunityDeal = {
      ...newDeal1,
      id: 'opp-test-dup',
      title: existingOpp.title, // Exact duplicate title
      address: 'Some other address',
    };

    const result = usePortfolioStore.getState().bulkAddOpportunities([newDeal1, duplicateDeal]);

    expect(result.addedCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
    expect(usePortfolioStore.getState().opportunities.length).toBe(initialCount + 2);

    // AGM Task was automatically scheduled
    expect(usePortfolioStore.getState().tasks.length).toBeGreaterThan(initialTasksCount);
    expect(usePortfolioStore.getState().tasks.some((t) => t.id === 'task-agm-opp-test-1')).toBe(true);
  });

  it('bulkAddRentals appends rental units and flags duplicates', () => {
    const initialRentalsCount = usePortfolioStore.getState().rentals.length;

    const newRental: RentalProperty = {
      id: 'rental-test-1',
      title: 'New Rental Unit In Umhlanga',
      address: '15 Lagoon Drive',
      city: 'Durban',
      propertyType: 'Sectional Title Apartment',
      marketValueZAR: 2200000,
      purchasePriceZAR: 1900000,
      purchaseDate: '2025-01-01',
      outstandingBondBalanceZAR: 1200000,
      bondInterestRatePercent: 11.75,
      monthlyBondPaymentZAR: 12500,
      tenantName: 'John Doe',
      tenantPhone: '+27 82 111 2233',
      tenantEmail: 'john@example.com',
      leaseStartDate: '2025-02-01',
      leaseEndDate: '2027-01-31',
      depositHeldZAR: 36000,
      annualEscalationPercent: 7,
      managementType: 'Self-Managed',
      monthlyGrossRentZAR: 18000,
      monthlyLeviesZAR: 2200,
      monthlyRatesTaxesZAR: 1400,
      monthlyAgentFeeZAR: 0,
      monthlyMaintenanceReserveZAR: 600,
      unpaidUtilityArrearsZAR: 0,
      maintenanceHistory: [],
      status: 'Occupied',
    };

    const result = usePortfolioStore.getState().bulkAddRentals([newRental]);
    expect(result.addedCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(usePortfolioStore.getState().rentals.length).toBe(initialRentalsCount + 1);
  });

  it('bulkAddFlips appends flip projects correctly', () => {
    const initialFlipsCount = usePortfolioStore.getState().flips.length;

    const newFlip: FlipProject = {
      id: 'flip-test-1',
      title: 'New Flip Project in Morningside',
      address: '10 Rivonia Rd',
      city: 'Johannesburg',
      propertyType: 'Townhouse / Cluster',
      purchaseDate: '2026-08-01',
      purchasePriceZAR: 1800000,
      acquisitionCostsZAR: 120000,
      baselineRenovationBudgetZAR: 300000,
      estimatedDurationMonths: 5,
      monthlyHoldingCostZAR: 5000,
      targetExitPriceZAR: 2700000,
      targetCompletionDate: '2027-01-01',
      currentPhase: 'Acquisition & Conveyancing',
      boq: [],
      linkedFundingIds: [],
      status: 'Active',
    };

    const result = usePortfolioStore.getState().bulkAddFlips([newFlip]);
    expect(result.addedCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(usePortfolioStore.getState().flips.length).toBe(initialFlipsCount + 1);
  });
});
