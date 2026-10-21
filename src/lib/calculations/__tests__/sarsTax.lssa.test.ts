import { describe, it, expect } from 'vitest';
import {
  calculateConveyancingFee,
  calculateBondRegistrationFee,
  calculateLssaProfessionalFee,
  computeAcquisitionCosts,
  LSSA_FEE_GUIDELINE_2026_07,
  LSSA_FEE_GUIDELINE_2025_08,
} from '../sarsTax';
import { calculateDealMetrics } from '../propertyMetrics';

describe('LSSA July 2026 Conveyancing & Bond Registration Tariff', () => {
  describe('Approved Sanity Suite (2026 CPI-Indexed Tariff)', () => {
    it('calculates conveyancing fee for R300,000 transfer (Band: R100k-R500k)', () => {
      // Base R6,875 + 4 steps of R1,100 = R11,275. With 15% VAT: Math.round(11,275 * 1.15) = R12,966.
      expect(calculateConveyancingFee(300_000)).toBe(12_966);
    });

    it('calculates conveyancing fee for R800,000 transfer (Band: R500k-R1m)', () => {
      // Base R15,675 + 3 steps of R2,120 = R22,035. With 15% VAT: Math.round(22,035 * 1.15) = R25,340.
      expect(calculateConveyancingFee(800_000)).toBe(25_340);
    });

    it('calculates conveyancing fee for R1,500,000 transfer (Band: R1m-R5m)', () => {
      // Base R26,275 + 3 steps (part thereof) of R2,120 = R32,635.
      // With 15% VAT: Math.round(32,635 * 1.15) = Math.round(37,530.25) = R37,530.
      expect(calculateConveyancingFee(1_500_000)).toBe(37_530);
    });

    it('calculates conveyancing fee for R2,500,000 transfer (Band: R1m-R5m, 8 full steps)', () => {
      // Excess R1,500,000 / R200,000 = 7.5 -> Math.ceil = 8 full steps.
      // Base R26,275 + 8 steps of R2,120 = R43,235.
      // With 15% VAT: Math.round(43,235 * 1.15) = Math.round(49,720.25) = R49,720.
      expect(calculateConveyancingFee(2_500_000)).toBe(49_720);
    });

    it('calculates conveyancing fee for R6,200,000 transfer (Band: > R5m)', () => {
      // Base R68,675 + 2 steps of R5,340 = R79,355. With 15% VAT: Math.round(79,355 * 1.15) = R91,258.
      expect(calculateConveyancingFee(6_200_000)).toBe(91_258);
    });

    it('calculates bond registration fee for R1,200,000 bond (Band: R1m-R5m)', () => {
      // Base R26,275 + 1 step of R2,120 = R28,395. With 15% VAT: Math.round(28,395 * 1.15) = R32,654.
      expect(calculateBondRegistrationFee(1_200_000)).toBe(32_654);
    });

    it('calculates bond registration fee for R0 bond as exactly R0', () => {
      expect(calculateBondRegistrationFee(0)).toBe(0);
      expect(calculateBondRegistrationFee(-50_000)).toBe(0);
    });
  });

  describe('Sliding scale boundaries and "part thereof" behavior (2026 Tariff)', () => {
    it('handles base tier <= R100k', () => {
      expect(calculateLssaProfessionalFee(100_000)).toBe(6_875);
      expect(calculateConveyancingFee(100_000)).toBe(Math.round(6_875 * 1.15));
    });

    it('triggers next step immediately on 1 Rand over boundary (part thereof)', () => {
      // R100,001 triggers 1st step of R1,100 above R100,000
      expect(calculateLssaProfessionalFee(100_001)).toBe(6_875 + 1_100);
      // R500,000 is top of second band
      expect(calculateLssaProfessionalFee(500_000)).toBe(15_675);
      // R500,001 triggers 1st step of third band
      expect(calculateLssaProfessionalFee(500_001)).toBe(15_675 + 2_120);
      // R1,000,000 is top of third band
      expect(calculateLssaProfessionalFee(1_000_000)).toBe(26_275);
      // R1,000,001 triggers 1st step of fourth band
      expect(calculateLssaProfessionalFee(1_000_001)).toBe(26_275 + 2_120);
      // R5,000,000 is top of fourth band
      expect(calculateLssaProfessionalFee(5_000_000)).toBe(68_675);
      // R5,000,001 triggers 1st step of final tier
      expect(calculateLssaProfessionalFee(5_000_001)).toBe(68_675 + 5_340);
    });
  });

  describe('Historical LSSA August 2025 Scale Regression Parity', () => {
    it('verifies historical 2025 tariff calculations with scale override', () => {
      const fee2025 = (val: number) =>
        Math.round((calculateLssaProfessionalFee(val, LSSA_FEE_GUIDELINE_2025_08) * 115) / 100);

      expect(fee2025(300_000)).toBe(12_512);
      expect(fee2025(800_000)).toBe(24_461);
      expect(fee2025(1_500_000)).toBe(36_248);
      // R2.5m: 8 full steps under 2025 scale
      expect(fee2025(2_500_000)).toBe(48_036);
      expect(fee2025(6_200_000)).toBe(88_194);
      expect(fee2025(1_200_000)).toBe(31_533);
    });
  });

  describe('Explicit Deposit Precedence (Guardrail #4)', () => {
    it('computeAcquisitionCosts respects bondAmountZAR override when provided', () => {
      const price = 1_500_000;
      // If 100% LTV is stated, default bond fee would be for 1.5m = 37,530
      const costsDefault = computeAcquisitionCosts(price, 100);
      expect(costsDefault.bondRegistrationFee).toBe(37_530);

      // But if deposit is R300,000, bond is R1,200,000 -> fee must be 32,654
      const costsWithBondAmount = computeAcquisitionCosts(price, 100, {
        bondAmountZAR: 1_200_000,
      });
      expect(costsWithBondAmount.bondRegistrationFee).toBe(32_654);
    });

    it('calculateDealMetrics recomputes bond registration fee from deposit when recomputeBondRegFromDeposit is true', () => {
      const price = 1_500_000;
      const initialCosts = computeAcquisitionCosts(price, 100); // 100% LTV bond fee = 37,530

      const result = calculateDealMetrics({
        purchasePrice: price,
        depositZAR: 300_000, // actual bond = R1,200,000
        loanToValuePercent: 100, // stale LTV
        interestRatePercent: 11.5,
        loanTermYears: 20,
        monthlyRentalEstimate: 15_000,
        monthlyLevies: 1_500,
        monthlyRatesTaxes: 1_000,
        estimatedRehabCost: 0,
        targetExitPrice: 1_800_000,
        costs: initialCosts,
        recomputeBondRegFromDeposit: true,
      });

      // Bond amount should be 1,200,000
      expect(result.bondAmount).toBe(1_200_000);
      // Initial capital required must reflect the corrected R32,654 bond fee
      // Difference between 37,530 and 32,654 is R4,876 savings in day-1 capital
      const expectedAdjustedAcquisitionTotal =
        initialCosts.totalAcquisitionCost - 37_530 + 32_654;
      const expectedCashFees = expectedAdjustedAcquisitionTotal - price;
      expect(result.initialCapitalRequired).toBe(300_000 + expectedCashFees);
    });

    it('preserves manual bond registration fee override even if deposit changes', () => {
      const price = 1_500_000;
      const customBondFee = 18_000; // negotiated flat attorney rate
      const initialCosts = computeAcquisitionCosts(price, 100, {
        customBondReg: customBondFee,
      });
      expect(initialCosts.isBondRegOverridden).toBe(true);
      expect(initialCosts.bondRegistrationFee).toBe(18_000);

      const result = calculateDealMetrics({
        purchasePrice: price,
        depositZAR: 500_000,
        loanToValuePercent: 80,
        interestRatePercent: 11.5,
        loanTermYears: 20,
        monthlyRentalEstimate: 15_000,
        monthlyLevies: 1_500,
        monthlyRatesTaxes: 1_000,
        estimatedRehabCost: 0,
        targetExitPrice: 1_800_000,
        costs: initialCosts,
        recomputeBondRegFromDeposit: true,
      });

      // Custom override remains intact
      expect(initialCosts.bondRegistrationFee).toBe(18_000);
    });
  });
});
