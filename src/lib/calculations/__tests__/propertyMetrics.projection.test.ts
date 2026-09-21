import { describe, it, expect } from 'vitest';
import { generateLongTermProjection, generateRentalLongTermProjection, calculateRentalCashflow } from '../propertyMetrics';
import { RentalProperty } from '@/types';

describe('generateLongTermProjection Engine', () => {
  it('accurately computes 20-year bond amortization and zeroes out balance at year 20', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 1_800_000,
      openMarketValueZAR: 2_150_000,
      depositZAR: 0,
      interestRatePercent: 11.75,
      bondTermYears: 20,
      annualCapitalGrowthPercent: 5.0,
      annualRentalEscalationPercent: 6.0,
      annualExpenseInflationPercent: 6.0,
      monthlyRentalEstimate: 16_500,
      monthlyLevies: 1_650,
      monthlyRatesTaxes: 1_100,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
    });

    expect(projections).toHaveLength(20);

    // Year 1 checks
    const yr1 = projections[0];
    expect(yr1.year).toBe(1);
    expect(yr1.rent).toBe(16_500 * 12);
    expect(yr1.outstandingBond).toBeGreaterThan(1_700_000);
    expect(yr1.propertyValue).toBe(Math.round(2_150_000 * 1.05));
    expect(yr1.netEquity).toBe(yr1.propertyValue - yr1.outstandingBond);

    // Year 20 (Maturity) checks
    const yr20 = projections[19];
    expect(yr20.year).toBe(20);
    expect(yr20.outstandingBond).toBe(0);
    expect(yr20.netEquity).toBe(yr20.propertyValue);
    expect(yr20.propertyValue).toBe(Math.round(2_150_000 * Math.pow(1.05, 20)));

    // Escalation compounding checks
    const yr2 = projections[1];
    expect(yr2.rent).toBe(Math.round(yr1.rent * 1.06));
    expect(yr2.costs).toBe(Math.round(yr1.costs * 1.06));
  });

  it('accurately computes 30-year bond amortization and zeroes out balance at year 30', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 2_500_000,
      depositZAR: 250_000, // 90% LTV bond = 2,250,000
      interestRatePercent: 11.25,
      bondTermYears: 30,
      annualCapitalGrowthPercent: 6.0,
      annualRentalEscalationPercent: 5.5,
      annualExpenseInflationPercent: 5.0,
      monthlyRentalEstimate: 22_000,
    });

    expect(projections).toHaveLength(30);

    const yr30 = projections[29];
    expect(yr30.year).toBe(30);
    expect(yr30.outstandingBond).toBe(0);
    expect(yr30.netEquity).toBe(yr30.propertyValue);
  });

  it('handles 100% cash deals with 0 bond and 0 debt repayment', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 1_200_000,
      depositZAR: 1_200_000, // 100% Cash
      bondTermYears: 20,
      monthlyRentalEstimate: 12_000,
    });

    expect(projections).toHaveLength(20);
    projections.forEach((snap) => {
      expect(snap.outstandingBond).toBe(0);
      expect(snap.bondPayment).toBe(0);
      expect(snap.netEquity).toBe(snap.propertyValue);
      expect(snap.netCashflow).toBe(snap.rent - snap.costs);
    });
  });
});

describe('generateRentalLongTermProjection Adapter', () => {
  const sampleRental: RentalProperty = {
    id: 'rental-test-1',
    title: 'Rosebank Executive Studio',
    address: '15 Tyrwhitt Ave',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 1_650_000,
    purchasePriceZAR: 1_450_000,
    purchaseDate: '2023-05-15',
    outstandingBondBalanceZAR: 1_250_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 13_300,
    tenantName: 'Thabo Ndlovu',
    tenantPhone: '+27 82 555 1234',
    tenantEmail: 'thabo@example.com',
    leaseStartDate: '2024-01-01',
    leaseEndDate: '2024-12-31',
    depositHeldZAR: 28_000,
    annualEscalationPercent: 7,
    managementType: 'Agency',
    agencyName: 'Pam Golding',
    agencyCommissionPercent: 8,
    agencyVatApplicable: true,
    monthlyGrossRentZAR: 14_000,
    monthlyLeviesZAR: 1_850,
    monthlyRatesTaxesZAR: 950,
    monthlyAgentFeeZAR: 1_288,
    monthlyMaintenanceReserveZAR: 500,
    maintenanceHistory: [],
    status: 'Occupied',
  };

  it('generates 20-year projection starting bond amortization from outstandingBondBalanceZAR', () => {
    const projections = generateRentalLongTermProjection(sampleRental);

    expect(projections).toHaveLength(20);

    // Year 1 checks
    const yr1 = projections[0];
    expect(yr1.year).toBe(1);
    expect(yr1.rent).toBe(14_000 * 12);
    // Bond should amortize from 1,250,000
    expect(yr1.outstandingBond).toBeLessThan(1_250_000);
    expect(yr1.outstandingBond).toBeGreaterThan(1_150_000);
    expect(yr1.propertyValue).toBe(Math.round(1_650_000 * 1.05));
    expect(yr1.netEquity).toBe(yr1.propertyValue - yr1.outstandingBond);

    // Year 20 (Bond paid off)
    const yr20 = projections[19];
    expect(yr20.year).toBe(20);
    expect(yr20.outstandingBond).toBe(0);
    expect(yr20.netEquity).toBe(yr20.propertyValue);
  });

  it('handles unbonded property with 0 bond balance correctly', () => {
    const unbondedRental: RentalProperty = {
      ...sampleRental,
      id: 'rental-test-2',
      outstandingBondBalanceZAR: 0,
      monthlyBondPaymentZAR: 0,
      managementType: 'Self-Managed',
    };

    const projections = generateRentalLongTermProjection(unbondedRental);

    expect(projections).toHaveLength(20);
    projections.forEach((yearSnap) => {
      expect(yearSnap.outstandingBond).toBe(0);
      expect(yearSnap.bondPayment).toBe(0);
      expect(yearSnap.netEquity).toBe(yearSnap.propertyValue);
    });
  });

  it('correctly calculates Freehold building insurance deduction in calculateRentalCashflow', () => {
    const freeholdRental = {
      propertyType: 'Freehold House' as const,
      monthlyGrossRentZAR: 20_000,
      monthlyLeviesZAR: 2_500, // Should be ignored because Freehold has R0 levies
      monthlyRatesTaxesZAR: 1_200,
      monthlyMaintenanceReserveZAR: 800,
      monthlyBondPaymentZAR: 12_000,
      annualBuildingInsuranceZAR: 7_200, // R600/month
      managementType: 'Self-Managed' as const,
    };

    const cashflow = calculateRentalCashflow(freeholdRental);
    // Insurance = 7200 / 12 = 600
    expect(cashflow.monthlyInsuranceZAR).toBe(600);
    // Total expenses = rates (1200) + maintenance (800) + insurance (600) + bond (12000) = 14600 (levies ignored)
    expect(cashflow.totalMonthlyExpensesZAR).toBe(14_600);
    // Net cashflow = 20000 - 14600 = 5400
    expect(cashflow.netMonthlyCashflowZAR).toBe(5_400);
  });

  it('includes Freehold building insurance in 20-year long-term projection costs', () => {
    const freeholdRental: RentalProperty = {
      ...sampleRental,
      id: 'rental-test-freehold',
      propertyType: 'Freehold House',
      monthlyLeviesZAR: 0,
      annualBuildingInsuranceZAR: 7_200, // R600/month
      managementType: 'Self-Managed',
      monthlyAgentFeeZAR: 0,
    };

    const projections = generateRentalLongTermProjection(freeholdRental);
    expect(projections).toHaveLength(20);
    
    // Year 1 costs should include rates (950) + reserve (500) + insurance (600) = 2050/mo => 24,600/yr
    const yr1 = projections[0];
    expect(yr1.costs).toBe((950 + 500 + 600) * 12);
  });
});


