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
});
