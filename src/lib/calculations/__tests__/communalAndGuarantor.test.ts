import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRentalCashflow,
  computeRentalPropertyMetrics,
  generateRentalLongTermProjection,
  generateLongTermProjection,
} from '../propertyMetrics';
import { calculateRentalMao } from '../maoSolver';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  formatOpportunityForWhatsApp,
  formatTenantAccountStatementForWhatsApp,
} from '@/lib/whatsappFormatter';
import { RentalProperty, OpportunityDeal, Lease } from '@/types';

describe('Serviced Communal OpEx & Guarantor Support', () => {
  const baseRental: RentalProperty = {
    id: 'rental-communal-test',
    title: '42 Kruger St Comm House',
    address: '42 Kruger St',
    city: 'Krugersdorp',
    propertyType: 'Freehold House',
    marketValueZAR: 1_200_000,
    purchasePriceZAR: 950_000,
    purchaseDate: '2024-01-01',
    outstandingBondBalanceZAR: 750_000,
    bondInterestRatePercent: 11.75,
    monthlyBondPaymentZAR: 8_100,
    monthlyGrossRentZAR: 18_000,
    monthlyLeviesZAR: 0,
    monthlyRatesTaxesZAR: 1_100,
    annualBuildingInsuranceZAR: 7_200, // R600/mo
    monthlyMaintenanceReserveZAR: 600,
    monthlyPrepaidVendingFeeZAR: 150,
    monthlyCommunalServicesZAR: 2_500, // Uncapped Wi-Fi, communal cleaning, security armed response, garden care
    monthlyAgentFeeZAR: 0,
    managementType: 'Self-Managed',
    maintenanceHistory: [],
    status: 'Occupied',
    leases: [
      {
        id: 'l-suite-1',
        unitName: 'Unit 1',
        roomType: 'Executive Suite',
        tenantName: 'Karabo Sithole',
        tenantPhone: '+27 82 111 2222',
        tenantEmail: 'karabo@example.com',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        depositHeldZAR: 12_000,
        annualEscalationPercent: 7,
        monthlyRentZAR: 10_000,
        status: 'Occupied',
        guarantorName: 'Investec Corporate',
        guarantorContact: '+27 11 286 7000',
      },
      {
        id: 'l-cottage-2',
        unitName: 'Unit 2',
        roomType: 'Garden Cottage',
        tenantName: 'Naledi Mpofu',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31',
        depositHeldZAR: 10_000,
        annualEscalationPercent: 7,
        monthlyRentZAR: 8_000,
        status: 'Occupied',
        guarantorName: 'Dr. S. Mpofu',
        guarantorContact: 'dr.mpofu@health.gov.za',
      },
    ],
  };

  describe('1. NOI and Cashflow Deductions', () => {
    it('deducts monthlyCommunalServicesZAR from net cashflow and operating expenses', () => {
      const withCommunal = calculateRentalCashflow(baseRental);
      const withoutCommunal = calculateRentalCashflow({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Total monthly expenses should be exactly R2,500 higher
      expect(withCommunal.totalMonthlyExpensesZAR - withoutCommunal.totalMonthlyExpensesZAR).toBe(2_500);

      // Net monthly cashflow should be exactly R2,500 lower
      expect(withoutCommunal.netMonthlyCashflowZAR - withCommunal.netMonthlyCashflowZAR).toBe(2_500);

      // Exact values verification:
      // Gross rent = 10000 + 8000 = 18000
      // Expenses = Rates (1100) + Insurance (600) + Reserve (600) + Vending (150) + Communal (2500) + Bond (8100) = 13050
      expect(withCommunal.totalMonthlyExpensesZAR).toBe(13_050);
      expect(withCommunal.netMonthlyCashflowZAR).toBe(18_000 - 13_050); // 4,950
    });

    it('deducts monthlyCommunalServicesZAR in computeRentalPropertyMetrics for NOI and Cap Rate', () => {
      const metricsWith = computeRentalPropertyMetrics(baseRental);
      const metricsWithout = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      // Annualized NOI difference must be exactly R2,500 * 12 = R30,000
      const annualNoiDiff = metricsWithout.annualizedNOI - metricsWith.annualizedNOI;
      expect(annualNoiDiff).toBe(2_500 * 12);

      // Cap rate should be lower with communal services because NOI is lower
      expect(metricsWith.capRatePercent).toBeLessThan(metricsWithout.capRatePercent);

      // Backward compatibility: undefined communal services defaults safely to 0 (no NaN)
      const undefinedCommunal = computeRentalPropertyMetrics({
        ...baseRental,
        monthlyCommunalServicesZAR: undefined,
      });
      expect(undefinedCommunal.annualizedNOI).toBe(metricsWithout.annualizedNOI);
      expect(Number.isNaN(undefinedCommunal.capRatePercent)).toBe(false);
    });
  });

  describe('2. Long-Term 20-Year Compounding Projections', () => {
    it('compounds monthlyCommunalServicesZAR over 20 years in generateRentalLongTermProjection', () => {
      const projectionsWith = generateRentalLongTermProjection(baseRental);
      const projectionsWithout = generateRentalLongTermProjection({
        ...baseRental,
        monthlyCommunalServicesZAR: 0,
      });

      expect(projectionsWith).toHaveLength(20);

      // Year 1 costs difference must equal R2,500 * 12 = R30,000
      const yr1With = projectionsWith[0];
      const yr1Without = projectionsWithout[0];
      expect(yr1With.costs - yr1Without.costs).toBe(2_500 * 12);

      // Year 2 costs difference should compound at 6% (default annualExpenseInflation: 6%)
      const yr2With = projectionsWith[1];
      const yr2Without = projectionsWithout[1];
      const expectedYr2Diff = Math.round(30_000 * 1.06);
      expect(yr2With.costs - yr2Without.costs).toBe(expectedYr2Diff);
    });

    it('incorporates monthlyCommunalServicesZAR into generateLongTermProjection for analyzer deals', () => {
      const projections = generateLongTermProjection({
        purchasePrice: 1_000_000,
        openMarketValueZAR: 1_200_000,
        monthlyRentalEstimate: 15_000,
        monthlyLevies: 1_500,
        monthlyRatesTaxes: 800,
        monthlyCommunalServicesZAR: 2_000,
        bondTermYears: 20,
      });

      const projectionsWithout = generateLongTermProjection({
        purchasePrice: 1_000_000,
        openMarketValueZAR: 1_200_000,
        monthlyRentalEstimate: 15_000,
        monthlyLevies: 1_500,
        monthlyRatesTaxes: 800,
        bondTermYears: 20,
      });

      // Year 1 costs should reflect 2000 * 12 = 24,000 higher costs
      expect(projections[0].costs - projectionsWithout[0].costs).toBe(2_000 * 12);
    });
  });

  describe('3. Rental MAO Solver Alignment', () => {
    it('deducts monthlyCommunalServicesZAR from stress-tested NOI when solving Rental MAO', () => {
      const maoWith = calculateRentalMao({
        monthlyRent: 15_000,
        vacancyRatePercent: 5,
        managementFeePercent: 8,
        monthlyLevies: 1_500,
        monthlyRates: 800,
        annualInsurance: 0,
        monthlyCommunalServicesZAR: 2_500,
        targetNetYieldPercent: 10,
      });

      const maoWithout = calculateRentalMao({
        monthlyRent: 15_000,
        vacancyRatePercent: 5,
        managementFeePercent: 8,
        monthlyLevies: 1_500,
        monthlyRates: 800,
        annualInsurance: 0,
        monthlyCommunalServicesZAR: 0,
        targetNetYieldPercent: 10,
      });

      // Stress tested NOI should be reduced by 2500 * 12 = 30000
      expect(maoWithout.stressTestedNoi - maoWith.stressTestedNoi).toBe(2_500 * 12);
      expect(maoWith.maxAllowablePrice).toBeLessThan(maoWithout.maxAllowablePrice);
    });
  });

  describe('4. Opportunity Promotion to Rental Portfolio', () => {
    beforeEach(() => {
      usePortfolioStore.setState({
        opportunities: [],
        rentals: [],
      });
    });

    it('preserves monthlyCommunalServicesZAR when promoting an OpportunityDeal to RentalProperty', () => {
      const deal = {
        id: 'opp-communal-test',
        title: 'Serviced HMO Krugersdorp',
        address: '10 Commissioner St',
        city: 'Krugersdorp',
        province: 'Gauteng',
        source: 'Private Agent',
        propertyType: 'Freehold House',
        strategy: 'Rental',
        purchasePrice: 900_000,
        monthlyRentalEstimate: 16_000,
        monthlyRatesTaxes: 1_200,
        monthlyMaintenanceReserveZAR: 800,
        monthlyPrepaidVendingFeeZAR: 200,
        monthlyCommunalServicesZAR: 2_500,
        costs: {
          purchasePrice: 900_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 948_500,
        },
        grossYield: 21.3,
        capRate: 14.5,
        netRoi: 12.0,
        monthlyCashFlow: 3_500,
        initialCapitalRequired: 948_500,
        status: 'Screening',
        createdAt: '2026-10-08',
      } as unknown as OpportunityDeal;

      usePortfolioStore.getState().addOpportunity(deal);
      usePortfolioStore.getState().promoteOpportunityToRental(deal.id);

      const promoted = usePortfolioStore.getState().rentals.find((r) => r.title === deal.title);
      expect(promoted).toBeDefined();
      expect(promoted?.monthlyCommunalServicesZAR).toBe(2_500);
      expect(promoted?.monthlyPrepaidVendingFeeZAR).toBe(200);
    });
  });

  describe('5. WhatsApp Statement & Opportunity Formatters', () => {
    it('formats WhatsApp opportunity with communal OpEx line item and compounding', () => {
      const oppDeal = {
        id: 'opp-whatsapp-test',
        title: '42 Kruger Multi-Let',
        address: '42 Kruger St',
        city: 'Krugersdorp',
        province: 'Gauteng',
        source: 'Private Agent',
        propertyType: 'Freehold House',
        strategy: 'Rental',
        purchasePrice: 950_000,
        monthlyRentalEstimate: 18_000,
        monthlyRatesTaxes: 1_100,
        monthlyCommunalServicesZAR: 2_500,
        costs: {
          purchasePrice: 950_000,
          transferDuty: 0,
          conveyancingFee: 25_000,
          bondRegistrationFee: 20_000,
          deedsOfficeFee: 1_500,
          ficaSundries: 2_000,
          totalAcquisitionCost: 998_500,
        },
        grossYield: 22.7,
        capRate: 15.2,
        netRoi: 13.0,
        monthlyCashFlow: 4_950,
        initialCapitalRequired: 998_500,
        status: 'Screening',
        createdAt: '2026-10-08',
      } as unknown as OpportunityDeal;

      const formatted = formatOpportunityForWhatsApp(oppDeal);
      expect(formatted).toContain('Communal / Serviced OpEx:');
      expect(formatted).toMatch(/2[,\s\u00a0]500/);
    });

    it('formats WhatsApp tenant account statement with roomType and guarantor details', () => {
      const formatted = formatTenantAccountStatementForWhatsApp(baseRental, {
        leaseId: 'l-suite-1',
      });

      // Unit line should have roomType
      expect(formatted).toContain('Unit 1 (Executive Suite)');
      // Occupant section should display guarantor
      expect(formatted).toContain('Investec Corporate (+27 11 286 7000)');
    });
  });
});
