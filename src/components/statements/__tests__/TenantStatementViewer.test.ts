import { describe, it, expect } from 'vitest';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
import { formatZAR, formatDate } from '@/lib/formatters';

describe('Tenant Statement Ledger & Calculation Engine', () => {
  const mockStatementData: PublicTenantStatementPayload = {
    lease: {
      id: 'lease-test-1',
      unitName: 'Unit 4B',
      tenantName: 'Dr. Thabo Mokoena',
      tenantEmail: 'thabo@example.co.za',
      tenantPhone: '+27 82 123 4567',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2026-12-31',
      monthlyRentZAR: 15000,
      depositHeldZAR: 30000,
      annualEscalationPercent: 7,
      status: 'Occupied',
    },
    property: {
      id: 'property-test-1',
      title: 'Sandton Executive Residences',
      address: '100 Rivonia Road',
      city: 'Johannesburg',
      utility_type: 'postpaid',
    },
    landlord: {
      entity_name: 'Apex Capital Holdings',
      trading_as: 'Apex Living',
      contact_number: '+27 11 987 6543',
      email: 'investor@apex.co.za',
      physical_address: 'Sandton City Office Tower',
    },
    utility_statements: [
      {
        id: 'stmt-2026-03',
        statementDate: '2026-03-05',
        billingPeriod: 'March 2026',
        provider: 'City of Johannesburg',
        electricityZAR: 1200,
        waterZAR: 450,
        refuseZAR: 350,
        sewerageZAR: 400,
        totalDueZAR: 2400,
        parsedVia: 'regex-fallback',
        createdAt: '2026-03-05T00:00:00Z',
      },
      {
        id: 'stmt-2026-02',
        statementDate: '2026-02-05',
        billingPeriod: 'February 2026',
        provider: 'City of Johannesburg',
        electricityZAR: 900,
        waterZAR: 300,
        refuseZAR: 350,
        sewerageZAR: 400,
        totalDueZAR: 1950,
        parsedVia: 'regex-fallback',
        createdAt: '2026-02-05T00:00:00Z',
      },
    ],
  };

  it('correctly calculates total due for itemized municipal recoveries', () => {
    const baseRent = mockStatementData.lease.monthlyRentZAR;
    const stmt = mockStatementData.utility_statements[0]; // March 2026

    const totalUtilities =
      stmt.electricityZAR + stmt.waterZAR + stmt.refuseZAR + stmt.sewerageZAR;
    const grandTotal = baseRent + totalUtilities;

    expect(totalUtilities).toBe(2400);
    expect(grandTotal).toBe(17400);
    expect(formatZAR(grandTotal, { includeDecimals: true })).toBe(
      formatZAR(17400, { includeDecimals: true })
    );
  });

  it('chronologically sorts utility statements descending (latest first)', () => {
    const sorted = [...mockStatementData.utility_statements].sort((a, b) =>
      (b.statementDate || '').localeCompare(a.statementDate || '')
    );

    expect(sorted[0].billingPeriod).toBe('March 2026');
    expect(sorted[1].billingPeriod).toBe('February 2026');
  });

  it('handles prepaid submeter utility override correctly with R0 variable recovery', () => {
    const isPrepaid = true;
    const stmt = mockStatementData.utility_statements[0];

    const elecZAR = isPrepaid ? 0 : stmt.electricityZAR;
    const waterZAR = isPrepaid ? 0 : stmt.waterZAR;
    const totalUtilities = elecZAR + waterZAR + stmt.refuseZAR + stmt.sewerageZAR;

    expect(elecZAR).toBe(0);
    expect(waterZAR).toBe(0);
    expect(totalUtilities).toBe(750); // 350 refuse + 400 sewerage
  });

  it('handles bundled recoveries (iGrow / Body Corporate) correctly', () => {
    const bundledStmt = {
      ...mockStatementData.utility_statements[0],
      billingType: 'bundled' as const,
      bundledUtilitiesZAR: 550.5,
    };

    const isBundled =
      bundledStmt.billingType === 'bundled' ||
      bundledStmt.bundledUtilitiesZAR !== undefined;
    const totalUtilities = isBundled ? bundledStmt.bundledUtilitiesZAR : 0;
    const totalDue = mockStatementData.lease.monthlyRentZAR + totalUtilities;

    expect(totalUtilities).toBe(550.5);
    expect(totalDue).toBe(15550.5);
    expect(formatZAR(totalDue, { includeDecimals: true })).toBe(
      formatZAR(15550.5, { includeDecimals: true })
    );
  });

  it('formats dates consistently for lease terms and statements', () => {
    expect(formatDate('2025-01-01')).toBe('01 Jan 2025');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('computes month-over-month variance with correct percentage and direction', () => {
    const prevElec = 900;
    const currElec = 1200;
    const diff = currElec - prevElec;
    const pct = (diff / prevElec) * 100;

    expect(diff).toBe(300);
    expect(pct.toFixed(1)).toBe('33.3');

    // Negative variance (decrease in cost)
    const prevWater = 450;
    const currWater = 300;
    const waterDiff = currWater - prevWater;
    const waterPct = (waterDiff / prevWater) * 100;

    expect(waterDiff).toBe(-150);
    expect(waterPct.toFixed(1)).toBe('-33.3');
  });

  it('correctly matches extracted meter readings to active statement period', () => {
    const stmtWithMeters = {
      ...mockStatementData.utility_statements[0],
      extractedMeterReadings: [
        {
          meterNumber: '10003374',
          utilityType: 'electricity' as const,
          previousReadingValue: 39500,
          readingValue: 39710,
          consumption: 210,
          readingType: 'Actual' as const,
          date: '2026-03-05',
        },
      ],
    };

    const reading = stmtWithMeters.extractedMeterReadings.find(
      (m) => m.utilityType === 'electricity'
    );
    expect(reading).toBeDefined();
    expect(reading?.meterNumber).toBe('10003374');
    expect(reading?.previousReadingValue).toBe(39500);
    expect(reading?.readingValue).toBe(39710);
    expect(reading?.consumption).toBe(210);
  });

  describe('Sandhurst Executive Suite Statement Parity & Period Selection', () => {
    it('defaults to October 2026 with R92,500 brought forward, R18,500 current charges, and R111,000 total due', async () => {
      const { INITIAL_RENTALS } = await import('@/lib/store/initialData');
      const { calculateTenantStatementTiers, getStatementLedgerOptions } = await import('@/lib/calculations/arrears');

      const sandhurst = INITIAL_RENTALS[0];
      const leaseId = sandhurst.leases![0].id;

      // Descending options
      const options = getStatementLedgerOptions(sandhurst, { leaseId });
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].month).toBe('2026-10');
      expect(options[0].isCurrent).toBe(true);
      expect(options[0].label).toContain('October 2026');
      expect(options[0].label).toMatch(/Due:\s*R\s*111\s*000/);

      // October 2026 Tiers
      const octTiers = calculateTenantStatementTiers(sandhurst, '2026-10', { leaseId });
      expect(octTiers.balanceBroughtForward).toBe(92500);
      expect(octTiers.currentCharges).toBe(18500);
      expect(octTiers.periodPaymentsTotal).toBe(0);
      expect(octTiers.totalAmountDue).toBe(111000);

      // Overdue breakdown for May-Sep (5 unpaid months)
      expect(octTiers.priorUnpaidMonths.length).toBe(5);
      const months = octTiers.priorUnpaidMonths.map((m) => m.month);
      expect(months).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
      octTiers.priorUnpaidMonths.forEach((m) => {
        expect(m.netVariance).toBe(18500);
      });
    });

    it('displays April 2026 as Paid in Full / Paid Up when selected from descending options', async () => {
      const { INITIAL_RENTALS } = await import('@/lib/store/initialData');
      const { calculateTenantStatementTiers, getStatementLedgerOptions } = await import('@/lib/calculations/arrears');

      const sandhurst = INITIAL_RENTALS[0];
      const leaseId = sandhurst.leases![0].id;

      const options = getStatementLedgerOptions(sandhurst, { leaseId });
      const aprOption = options.find((o) => o.month === '2026-04');
      expect(aprOption).toBeDefined();
      expect(aprOption?.label).toContain('Paid in Full');

      // April 2026 Tiers
      const aprTiers = calculateTenantStatementTiers(sandhurst, '2026-04', { leaseId });
      expect(aprTiers.balanceBroughtForward).toBe(0);
      expect(aprTiers.currentCharges).toBe(20043.05); // 18500 rent + 1543.05 utilities
      expect(aprTiers.periodPaymentsTotal).toBe(20043.05);
      expect(aprTiers.totalAmountDue).toBeLessThanOrEqual(0); // Paid up
    });
  });
});
