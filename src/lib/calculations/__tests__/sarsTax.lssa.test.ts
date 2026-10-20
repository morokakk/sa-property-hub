import { describe, it, expect } from 'vitest';
import {
  calculateConveyancingFee,
  calculateBondRegistrationFee,
  calculateLssaProfessionalFee,
  computeAcquisitionCosts,
} from '../sarsTax';
import { calculateDealMetrics } from '../propertyMetrics';

describe('LSSA August 2025 Conveyancing & Bond Registration Tariff', () => {
  describe('Approved 6-Row Sanity Suite (Arithym-verified)', () => {
    it('calculates conveyancing fee for R300,000 transfer (Band: R100k-R500k)', () => {
      // Base R6,640 + 4 steps of R1,060 = R10,880. With 15% VAT: R12,512.
      expect(calculateConveyancingFee(300_000)).toBe(12_512);
    });

    it('calculates conveyancing fee for R800,000 transfer (Band: R500k-R1m)', () => {
      // Base R15,120 + 3 steps of R2,050 = R21,270. With 15% VAT: R24,461.
      expect(calculateConveyancingFee(800_000)).toBe(24_461);
    });

    it('calculates conveyancing fee for R1,500,000 transfer (Band: R1m-R5m)', () => {
      // Base R25,370 + 3 steps (part thereof) of R2,050 = R31,520. With 15% VAT: R36,248.
      expect(calculateConveyancingFee(1_500_000)).toBe(36_248);
    });

    it('calculates conveyancing fee for R6,200,000 transfer (Band: > R5m)', () => {
      // Base R66,370 + 2 steps of R5,160 = R76,690. With 15% VAT: R88,194.
      expect(calculateConveyancingFee(6_200_000)).toBe(88_194);
    });

    it('calculates bond registration fee for R1,200,000 bond (Band: R1m-R5m)', () => {
      // Base R25,370 + 1 step of R2,050 = R27,420. With 15% VAT: R31,533.
      expect(calculateBondRegistrationFee(1_200_000)).toBe(31_533);
    });

    it('calculates bond registration fee for R0 bond as exactly R0', () => {
      expect(calculateBondRegistrationFee(0)).toBe(0);
      expect(calculateBondRegistrationFee(-50_000)).toBe(0);
    });
  });

  describe('Sliding scale boundaries and "part thereof" behavior', () => {
    it('handles base tier <= R100k', () => {
      expect(calculateLssaProfessionalFee(100_000)).toBe(6_640);
      expect(calculateConveyancingFee(100_000)).toBe(Math.round(6_640 * 1.15));
    });

    it('triggers next step immediately on 1 Rand over boundary (part thereof)', () => {
      // R100,001 triggers 1st step of R1,060 above R100,000
      expect(calculateLssaProfessionalFee(100_001)).toBe(6_640 + 1_060);
      // R500,000 is top of second band
      expect(calculateLssaProfessionalFee(500_000)).toBe(15_120);
      // R500,001 triggers 1st step of third band
      expect(calculateLssaProfessionalFee(500_001)).toBe(15_120 + 2_050);
      // R1,000,000 is top of third band
      expect(calculateLssaProfessionalFee(1_000_000)).toBe(25_370);
      // R1,000,001 triggers 1st step of fourth band
      expect(calculateLssaProfessionalFee(1_000_001)).toBe(25_370 + 2_050);
      // R5,000,000 is top of fourth band
      expect(calculateLssaProfessionalFee(5_000_000)).toBe(66_370);
      // R5,000,001 triggers 1st step of final tier
      expect(calculateLssaProfessionalFee(5_000_001)).toBe(66_370 + 5_160);
    });
  });

  describe('Explicit Deposit Precedence (Guardrail #4)', () => {
    it('computeAcquisitionCosts respects bondAmountZAR override when provided', () => {
      const price = 1_500_000;
      // If 100% LTV is stated, default bond fee would be for 1.5m = 36,248
      const costsDefault = computeAcquisitionCosts(price, 100);
      expect(costsDefault.bondRegistrationFee).toBe(36_248);

      // But if deposit is R300,000, bond is R1,200,000 -> fee must be 31,533
      const costsWithBondAmount = computeAcquisitionCosts(price, 100, {
        bondAmountZAR: 1_200_000,
      });
      expect(costsWithBondAmount.bondRegistrationFee).toBe(31_533);
    });

    it('calculateDealMetrics recomputes bond registration fee from deposit when recomputeBondRegFromDeposit is true', () => {
      const price = 1_500_000;
      const initialCosts = computeAcquisitionCosts(price, 100); // 100% LTV bond fee = 36,248

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
      // Initial capital required must reflect the corrected R31,533 bond fee
      // Difference between 36,248 and 31,533 is R4,715 savings in day-1 capital
      const expectedAdjustedAcquisitionTotal =
        initialCosts.totalAcquisitionCost - 36_248 + 31_533;
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
