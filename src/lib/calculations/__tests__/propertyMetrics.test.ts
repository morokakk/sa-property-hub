import { describe, it, expect } from 'vitest';
import {
  calculateRentalCashflow,
  computeRentalPropertyMetrics,
  calculateDealMetrics,
  generateRentalLongTermProjection,
} from '../propertyMetrics';
import { RentalProperty } from '@/types';

describe('Property Metrics Calculation Engine & Communal Services OpEx', () => {
  const baseRental: RentalProperty = {
    id: 'rental-prop-test-1',
    title: '42 Kruger Multi-Let Commune',
    address: '42 Kruger St',
    city: 'Krugersdorp',
    propertyType: 'Freehold House',
    marketValueZAR: 1_200_000,
    purchasePriceZAR: 1_000_000,
    purchaseDate: '2024-01-01',
    outstandingBondBalanceZAR: 800_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 8_500,
    monthlyGrossRentZAR: 20_000,
    monthlyLeviesZAR: 0,
    monthlyRatesTaxesZAR: 1_200,
    annualBuildingInsuranceZAR: 7_200, // R600/month
    monthlyMaintenanceReserveZAR: 800,
    monthlyPrepaidVendingFeeZAR: 150,
    monthlyAgentFeeZAR: 0,
    managementType: 'Self-Managed',
    maintenanceHistory: [],
    status: 'Occupied',
    leases: [
      {
        id: 'lease-test-1',
        unitName: 'Suite 1',
        roomType: 'Executive Suite',
        tenantName: 'Sipho Zulu',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        monthlyRentZAR: 12_000,
        depositHeldZAR: 12_000,
        annualEscalationPercent: 7,
        status: 'Occupied',
        guarantorName: 'Anglo American Corporate',
        guarantorContact: '+27 11 638 9111',
      },
      {
        id: 'lease-test-2',
        unitName: 'Cottage 2',
        roomType: 'Garden Cottage',
        tenantName: 'Kagiso Lekota',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        monthlyRentZAR: 8_000,
        depositHeldZAR: 8_000,
        annualEscalationPercent: 7,
        status: 'Occupied',
        guarantorName: 'Mary Lekota (Parent Guarantee)',
        guarantorContact: 'mary.lekota@gmail.com',
      },
    ],
  };

  describe('1. calculateRentalCashflow Communal OpEx Deduction & Backward Compatibility', () => {
    it('verifies that adding monthlyCommunalServicesZAR: 2500 accurately reduces netMonthlyCashflowZAR and annualized NOI by the exact Rand amount', () => {
      const withCommunal = calculateRentalCashflow({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const withoutCommunal = calculateRentalCashflow({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Total monthly expenses must be exactly R2,500 higher
      expect(withCommunal.totalMonthlyExpensesZAR - withoutCommunal.totalMonthlyExpensesZAR).toBe(2500);

      // netMonthlyCashflowZAR must be reduced by exactly R2,500
      expect(withoutCommunal.netMonthlyCashflowZAR - withCommunal.netMonthlyCashflowZAR).toBe(2500);

      // Annualized NOI must be reduced by exactly R2,500 * 12 = R30,000
      expect(withoutCommunal.annualizedNOI - withCommunal.annualizedNOI).toBe(2500 * 12);
      expect(withoutCommunal.annualNetOperatingIncome - withCommunal.annualNetOperatingIncome).toBe(30000);

      // Verified exact numbers
      // Gross Rent: 12,000 + 8,000 = 20,000
      // Expenses: Rates (1,200) + Insurance (600) + Reserve (800) + Bond (8,500) + Vending (150) + Communal (2,500) = 13,750
      expect(withCommunal.totalMonthlyExpensesZAR).toBe(13750);
      expect(withCommunal.netMonthlyCashflowZAR).toBe(20000 - 13750); // 6,250
      expect(withCommunal.monthlyNOI).toBe(20000 - (13750 - 8500)); // 14,750 (excluding bond debt)
      expect(withCommunal.annualizedNOI).toBe(14750 * 12); // 177,000
    });

    it('verifies backward compatibility: an object omitting monthlyCommunalServicesZAR defaults to 0 without errors or NaN', () => {
      const omittedCommunal = calculateRentalCashflow({
        monthlyGrossRentZAR: 15000,
        monthlyLeviesZAR: 1500,
        monthlyRatesTaxesZAR: 900,
        monthlyMaintenanceReserveZAR: 500,
        monthlyBondPaymentZAR: 9000,
        // monthlyCommunalServicesZAR omitted
      });

      expect(omittedCommunal.monthlyCommunalServicesZAR).toBe(0);
      expect(omittedCommunal.communalServicesZAR).toBe(0);
      expect(Number.isNaN(omittedCommunal.netMonthlyCashflowZAR)).toBe(false);
      expect(Number.isNaN(omittedCommunal.annualizedNOI)).toBe(false);
      expect(omittedCommunal.netMonthlyCashflowZAR).toBe(15000 - (1500 + 900 + 500 + 9000)); // 3,100
      expect(omittedCommunal.annualizedNOI).toBe((15000 - (1500 + 900 + 500)) * 12); // 145,200
    });
  });

  describe('2. computeRentalPropertyMetrics Communal OpEx Deduction & Cap Rate Alignment', () => {
    it('verifies that adding monthlyCommunalServicesZAR: 2500 accurately reduces annualized NOI and Net Cashflow in computeRentalPropertyMetrics', () => {
      const metricsWith = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const metricsWithout = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Net monthly cashflow reduction
      expect(metricsWithout.netMonthlyCashflowZAR - metricsWith.netMonthlyCashflowZAR).toBe(2500);
      expect(metricsWithout.annualNetCashflowZAR - metricsWith.annualNetCashflowZAR).toBe(30000);

      // Annualized NOI reduction
      expect(metricsWithout.annualizedNOI - metricsWith.annualizedNOI).toBe(30000);
      expect(metricsWithout.annualNetOperatingIncome - metricsWith.annualNetOperatingIncome).toBe(30000);

      // Cap Rate reflects the serviced operating burden
      expect(metricsWith.capRatePercent).toBeLessThan(metricsWithout.capRatePercent);
      const expectedCapRateDiff = ((30000) / baseRental.marketValueZAR) * 100;
      expect(metricsWithout.capRatePercent - metricsWith.capRatePercent).toBeCloseTo(expectedCapRateDiff, 4);
    });

    it('verifies backward compatibility: computeRentalPropertyMetrics with undefined or missing monthlyCommunalServicesZAR', () => {
      const metricsLegacy = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: undefined,
      });

      const metricsZero = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      expect(metricsLegacy.annualizedNOI).toBe(metricsZero.annualizedNOI);
      expect(metricsLegacy.netMonthlyCashflowZAR).toBe(metricsZero.netMonthlyCashflowZAR);
      expect(Number.isNaN(metricsLegacy.capRatePercent)).toBe(false);
      expect(Number.isNaN(metricsLegacy.cashOnCashPercent)).toBe(false);
    });
  });

  describe('3. calculateDealMetrics & 20-Year Projections with Communal OpEx', () => {
    it('accurately incorporates monthlyCommunalServicesZAR into calculateDealMetrics', () => {
      const dealWith = calculateDealMetrics({
        purchasePrice: 1_000_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 16_000,
        monthlyLevies: 1_000,
        monthlyRatesTaxes: 800,
        annualInsurance: 6_000,
        managementFeePercent: 8,
        agencyVatApplicable: true,
        monthlyMaintenanceReserveZAR: 500,
        monthlyPrepaidVendingFeeZAR: 150,
        monthlyCommunalServicesZAR: 2_500,
        vacancyRatePercent: 5,
        targetExitPrice: 1_400_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 1_048_500,
        },
      });

      const dealWithout = calculateDealMetrics({
        purchasePrice: 1_000_000,
        estimatedRehabCost: 0,
        monthlyRentalEstimate: 16_000,
        monthlyLevies: 1_000,
        monthlyRatesTaxes: 800,
        annualInsurance: 6_000,
        managementFeePercent: 8,
        agencyVatApplicable: true,
        monthlyMaintenanceReserveZAR: 500,
        monthlyPrepaidVendingFeeZAR: 150,
        monthlyCommunalServicesZAR: 0,
        vacancyRatePercent: 5,
        targetExitPrice: 1_400_000,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
        costs: {
          purchasePrice: 1_000_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 1_048_500,
        },
      });

      expect(dealWithout.monthlyCashFlow - dealWith.monthlyCashFlow).toBe(2500);
      expect(dealWithout.annualNetOperatingIncome - dealWith.annualNetOperatingIncome).toBe(30000);
    });

    it('compounds monthlyCommunalServicesZAR over 20-year projection schedule in generateRentalLongTermProjection', () => {
      const projWith = generateRentalLongTermProjection({
        ...baseRental,
        monthlyCommunalServicesZAR: 2500,
      });

      const projWithout = generateRentalLongTermProjection({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      expect(projWith).toHaveLength(20);
      // Year 1 operating costs diff = R2,500 * 12 = R30,000
      expect(projWith[0].costs - projWithout[0].costs).toBe(30000);

      // Year 2 operating costs diff = R30,000 * 1.06 (6% inflation)
      expect(projWith[1].costs - projWithout[1].costs).toBe(Math.round(30000 * 1.06));
    });
  });
});
