import { describe, it, expect } from 'vitest';
import {
  calculateMunicipalWaterCost,
  calculateMunicipalElectricityCost,
  calculateMunicipalDisputeImpact,
  ETHEKWINI_WATER_TIERS,
  CAPE_TOWN_WATER_TIERS,
  JOBURG_WATER_TIERS,
  CITY_POWER_ELEC_TIERS,
  CAPE_TOWN_ELEC_TIERS,
  ETHEKWINI_ELEC_FLAT_RATE,
  ESKOM_HOMELIGHT_60A_RATE,
  ESKOM_HOMELIGHT_20A_RATE,
} from '../municipalTariffs';

describe('Municipal Tariffs Engine', () => {
  describe('Water Tariff Calculations', () => {
    it('calculates eThekwini water tiers correctly', () => {
      // Free Lifeline: 0-6 KL = R 0
      const free = calculateMunicipalWaterCost(5, 'eThekwini');
      expect(free.totalCostZAR).toBe(0);

      // Block 1: 17 KL -> 6 KL @ 0 + 9 KL @ R 25.30 (6-15 KL) + 2 KL @ R 25.30 (15-25 KL) = R 278.30
      const res17 = calculateMunicipalWaterCost(17, 'eThekwini');
      expect(res17.totalCostZAR).toBe(278.3);
      expect(res17.tierBreakdown).toHaveLength(3);
      expect(res17.tierBreakdown[0].units).toBe(6);
      expect(res17.tierBreakdown[0].cost).toBe(0);
      expect(res17.tierBreakdown[1].units).toBe(9);
      expect(res17.tierBreakdown[1].rate).toBe(25.3);
      expect(res17.tierBreakdown[1].cost).toBe(227.7);
      expect(res17.tierBreakdown[2].units).toBe(2);
      expect(res17.tierBreakdown[2].rate).toBe(25.3);
      expect(res17.tierBreakdown[2].cost).toBe(50.6);

      // Multiple tiers: 28 KL -> 6 @ 0, 19 @ 25.30 (480.70), 3 @ 33.70 (101.10) = 581.80
      const res28 = calculateMunicipalWaterCost(28, 'eThekwini');
      expect(res28.totalCostZAR).toBe(581.8);

      // High consumption: 50 KL -> 6 @ 0, 19 @ 25.30, 5 @ 33.70, 15 @ 52.00, 5 @ 83.60
      // 480.70 + 168.50 + 780.00 + 418.00 = 1847.20
      const res50 = calculateMunicipalWaterCost(50, 'eThekwini');
      expect(res50.totalCostZAR).toBe(1847.2);
    });

    it('calculates City of Cape Town water tiers correctly', () => {
      // 18 KL -> 6 KL @ 0, 9 KL @ 21.10 (189.90), 3 KL @ 31.10 (93.30) = R 283.20
      const cct = calculateMunicipalWaterCost(18, 'City of Cape Town');
      expect(cct.totalCostZAR).toBe(283.2);
      expect(cct.tierBreakdown).toHaveLength(3);
    });

    it('calculates Johannesburg Water tiers correctly', () => {
      // 12 KL -> 6 KL @ 0, 6 KL @ 29.80 = R 178.80
      const joburg = calculateMunicipalWaterCost(12, 'City of Johannesburg');
      expect(joburg.totalCostZAR).toBe(178.8);
      expect(joburg.tierBreakdown).toHaveLength(2);
    });
  });

  describe('Electricity Tariff Calculations', () => {
    it('calculates Eskom Direct rates correctly for 60A and 20A supplies', () => {
      const res60A = calculateMunicipalElectricityCost(300, 'Eskom');
      expect(res60A.totalCostZAR).toBe(300 * ESKOM_HOMELIGHT_60A_RATE); // 1032
      expect(res60A.fixedChargesZAR).toBe(0);

      const res20A = calculateMunicipalElectricityCost(300, 'Eskom', { is20A: true });
      expect(res20A.totalCostZAR).toBe(300 * ESKOM_HOMELIGHT_20A_RATE); // 810
    });

    it('calculates eThekwini Municipality flat rate correctly', () => {
      const res = calculateMunicipalElectricityCost(200, 'eThekwini');
      expect(res.totalCostZAR).toBe(Math.round(200 * ETHEKWINI_ELEC_FLAT_RATE * 100) / 100);
      expect(res.fixedChargesZAR).toBe(0);
    });

    it('calculates City Power Johannesburg tiered rates with fixed monthly service charge', () => {
      // 400 kWh: R 241.50 fixed + 350 * 3.34 (1169) + 50 * 3.83 (191.50) = R 1602.00
      const res = calculateMunicipalElectricityCost(400, 'City Power');
      expect(res.fixedChargesZAR).toBe(241.5);
      expect(res.totalCostZAR).toBe(1602.0);
    });

    it('calculates Cape Town Domestic electricity with daily service charge', () => {
      // 500 kWh for 30 days: 30 * 2.46 (73.80) + 500 * 4.14 (2070) = R 2143.80
      const res = calculateMunicipalElectricityCost(500, 'City of Cape Town', { billingDays: 30 });
      expect(res.fixedChargesZAR).toBe(73.8);
      expect(res.totalCostZAR).toBe(2143.8);
    });
  });

  describe('Municipal Dispute Impact & Cap Rule', () => {
    it('handles the Umhlanga water dispute anomaly (1400 KL entered vs 1485 KL statement dial, 1468 baseline, R410 billed)', () => {
      // User entered 1400 KL physical dial reading
      // Council statement showed current: 1485 KL, previous: 1468 KL (consumption = 17 KL), billed = R 410.00
      const result = calculateMunicipalDisputeImpact({
        utilityType: 'water',
        councilReading: 1485,
        councilPreviousReading: 1468,
        councilBilledUnits: 17,
        statementCostZAR: 410.0,
        physicalReading: 1400,
        physicalPreviousReading: 1468,
        providerOrCity: 'eThekwini',
      });

      // Assertions
      expect(result.councilConsumption).toBe(17);
      expect(result.physicalConsumption).toBe(0); // 1400 < 1468, so usage resets to 0
      expect(result.isRolloverOrInverted).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('lower than starting baseline');

      // Units discrepancy should be full 17 KL over-billed
      expect(result.unitsDiscrepancy).toBe(17);

      // Raw cost: 17 * (410 / 17) = R 410.00
      // Capped dispute amount must equal R 410.00, NOT R 2,050.20!
      expect(result.cappedDisputeCostZAR).toBe(410.0);
      expect(result.cappedDisputeCostZAR).toBeLessThanOrEqual(410.0);
    });

    it('strictly caps the disputed Rand amount at the billed statement line cost', () => {
      // Even if raw calculation would yield higher, cap at statementCostZAR
      const result = calculateMunicipalDisputeImpact({
        utilityType: 'water',
        councilReading: 1500,
        councilPreviousReading: 1400, // 100 KL billed
        councilBilledUnits: 100,
        statementCostZAR: 500.0, // Statement billed only R500 (e.g. estimated flat credit)
        physicalReading: 1410, // Physical was 10 KL, discrepancy = 90 KL
        providerOrCity: 'eThekwini',
      });

      expect(result.cappedDisputeCostZAR).toBeLessThanOrEqual(500.0);
    });

    it('correctly calculates normal valid dispute for Umhlanga electricity (28,260 kWh physical vs 28,410 kWh council)', () => {
      // Council: 28,410 kWh (previous 28,090 => 320 kWh billed), statement cost R 980.00
      // Physical: 28,260 kWh (previous 28,090 => 170 kWh actual)
      // Discrepancy: 150 kWh
      // Tariff: 980 / 320 = 3.0625 R/kWh
      // Impact: 150 * 3.0625 = R 459.38
      const result = calculateMunicipalDisputeImpact({
        utilityType: 'electricity',
        councilReading: 28410,
        councilPreviousReading: 28090,
        councilBilledUnits: 320,
        statementCostZAR: 980.0,
        physicalReading: 28260,
        physicalPreviousReading: 28090,
        providerOrCity: 'eThekwini',
      });

      expect(result.councilConsumption).toBe(320);
      expect(result.physicalConsumption).toBe(170);
      expect(result.unitsDiscrepancy).toBe(150);
      expect(result.isRolloverOrInverted).toBe(false);
      expect(result.warning).toBeUndefined();
      expect(result.effectiveRatePerUnit).toBe(3.0625);
      expect(result.cappedDisputeCostZAR).toBe(459.38);
      expect(result.isCapped).toBe(false);
    });
  });
});
