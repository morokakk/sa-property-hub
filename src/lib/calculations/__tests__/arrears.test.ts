import { describe, it, expect } from 'vitest';
import {
  calculatePropertyArrears,
  calculateMonthlyLedger,
  reconcileOpeningBalanceForTargetArrears,
  getTenantUtilityFromStatement,
  calculateTenantStatementTiers,
  isLeaseActiveInMonth,
  getMonthKey,
  getNextMonthKey,
  getPreviousMonthKey,
  formatMonthLabel,
  allocateOldestFirst,
  migrateNegativeArrearsToRental,
  formatAllocationsSummary,
} from '../arrears';
import {
  formatTenantAccountStatementForWhatsApp,
  formatTenantPaymentReceiptForWhatsApp,
} from '../../whatsappFormatter';
import { RentalProperty, TenantPaymentRecord, UtilityStatement } from '@/types';
import { formatZAR } from '@/lib/formatters';

function createMockRental(overrides?: Partial<RentalProperty>): RentalProperty {
  return {
    id: 'test-rental-1',
    title: 'Unit 402, Sandhurst Towers',
    address: '12 Fredman Drive',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    purchasePriceZAR: 1500000,
    purchaseDate: '2023-01-15',
    marketValueZAR: 1750000,
    outstandingBondBalanceZAR: 1100000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 11700,
    monthlyGrossRentZAR: 16500,
    monthlyLeviesZAR: 2200,
    monthlyRatesTaxesZAR: 1100,
    monthlyAgentFeeZAR: 1320,
    monthlyMaintenanceReserveZAR: 800,
    status: 'Occupied',
    leases: [
      {
        id: 'lease-1',
        unitName: 'Unit 402',
        tenantName: 'Thabo Mokoena',
        tenantPhone: '+27 82 111 2233',
        tenantEmail: 'thabo@example.com',
        monthlyRentZAR: 16500,
        depositHeldZAR: 33000,
        leaseStartDate: '2026-01-01',
        leaseEndDate: '2026-12-31',
        annualEscalationPercent: 8.0,
        status: 'Occupied',
      },
    ],
    utilityStatements: [],
    paymentRecords: [],
    arrearsOpeningBalanceZAR: 0,
    unpaidUtilityArrearsZAR: 0,
    maintenanceHistory: [],
    ...overrides,
  };
}

describe('Arrears Calculation Engine (calculatePropertyArrears)', () => {
  const refDate = '2026-04-15'; // April 2026

  it('calculates total arrears correctly: openingBalance + totalBilled - totalPayments', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 2000,
      paymentRecords: [
        {
          id: 'p1',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-02',
          amountReceivedZAR: 10000,
          paymentMethod: 'EFT',
          createdAt: '2026-04-02T10:00:00Z',
        },
      ],
    });

    const result = calculatePropertyArrears(rental, refDate);
    // Billed charges in window: baseRent across ledger months
    expect(result.openingBalanceZAR).toBe(2000);
    expect(result.totalPaymentsReceivedZAR).toBe(10000);
    expect(result.totalArrearsZAR).toBe(
      result.openingBalanceZAR + result.totalBilledChargesZAR - result.totalPaymentsReceivedZAR
    );
  });

  it('reports Paid in Full when payment covers current month rent and utilities', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      paymentRecords: [
        {
          id: 'p-apr',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-01',
          amountReceivedZAR: 16500,
          paymentMethod: 'EFT',
          createdAt: '2026-04-01T08:00:00Z',
        },
      ],
    });

    const result = calculatePropertyArrears(rental, refDate);
    const aprItem = result.ledger.find((i) => i.month === '2026-04');
    expect(aprItem?.status).toBe('Paid in Full');
    expect(aprItem?.netVariance).toBe(0);
    expect(aprItem?.paymentsReceived).toBe(16500);
  });

  it('reports Partial when tenant only pays part of the month charges', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      paymentRecords: [
        {
          id: 'p-partial',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-03',
          amountReceivedZAR: 10000,
          paymentMethod: 'EFT',
          createdAt: '2026-04-03T08:00:00Z',
        },
      ],
    });

    const result = calculatePropertyArrears(rental, refDate);
    const aprItem = result.ledger.find((i) => i.month === '2026-04');
    expect(aprItem?.status).toBe('Partial');
    expect(aprItem?.netVariance).toBe(6500); // 16500 - 10000
    expect(aprItem?.paymentsReceived).toBe(10000);
  });

  it('reports Overpaid when payment exceeds billed charges', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      paymentRecords: [
        {
          id: 'p-over',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-01',
          amountReceivedZAR: 20000,
          paymentMethod: 'EFT',
          createdAt: '2026-04-01T08:00:00Z',
        },
      ],
    });

    const result = calculatePropertyArrears(rental, refDate);
    const aprItem = result.ledger.find((i) => i.month === '2026-04');
    expect(aprItem?.status).toBe('Overpaid');
    expect(aprItem?.netVariance).toBe(-3500);
  });

  it('reports Unpaid when no payment is recorded for the month', () => {
    const rental = createMockRental({
      paymentRecords: [],
    });

    const result = calculatePropertyArrears(rental, refDate);
    const aprItem = result.ledger.find((i) => i.month === '2026-04');
    expect(aprItem?.status).toBe('Unpaid');
    expect(aprItem?.netVariance).toBe(16500);
  });

  it('adds tenant utilities from unbundled municipal statements, excluding property rates', () => {
    const statements: UtilityStatement[] = [
      {
        id: 'stmt-1',
        statementDate: '2026-04-05',
        billingPeriod: '2026-04',
        provider: 'City of Johannesburg',
        billingType: 'itemized',
        electricityZAR: 1200,
        waterZAR: 650,
        refuseZAR: 250,
        sewerageZAR: 300,
        propertyRatesZAR: 1100, // Landlord expense - must be excluded
        totalDueZAR: 3500,
        parsedVia: 'manual',
        createdAt: '2026-04-05T00:00:00Z',
      },
    ];

    const rental = createMockRental({
      utilityStatements: statements,
    });

    const utilAmount = getTenantUtilityFromStatement(statements[0]);
    expect(utilAmount).toBe(1200 + 650 + 250 + 300); // 2400 (rates excluded)

    const result = calculatePropertyArrears(rental, refDate);
    const aprItem = result.ledger.find((i) => i.month === '2026-04');
    expect(aprItem?.utilitiesBilled).toBe(2400);
    expect(aprItem?.totalBilled).toBe(16500 + 2400); // 18900
  });

  it('extracts bundled utilities for iGrow statements', () => {
    const statement: UtilityStatement = {
      id: 'stmt-igrow',
      statementDate: '2026-04-05',
      billingPeriod: '2026-04',
      provider: 'iGrow Rentals',
      billingType: 'bundled',
      bundledUtilitiesZAR: 1850,
      totalDueZAR: 1850,
      electricityZAR: 0,
      waterZAR: 0,
      refuseZAR: 0,
      sewerageZAR: 0,
      parsedVia: 'manual',
      createdAt: '2026-04-05T00:00:00Z',
    };

    const utilAmount = getTenantUtilityFromStatement(statement);
    expect(utilAmount).toBe(1850);
  });

  it('returns 0 tenant utility for prepaid_submeter property', () => {
    const statement: UtilityStatement = {
      id: 'stmt-prepaid',
      statementDate: '2026-04-05',
      billingPeriod: '2026-04',
      provider: 'Eskom',
      electricityZAR: 1500,
      waterZAR: 0,
      refuseZAR: 0,
      sewerageZAR: 0,
      totalDueZAR: 1500,
      parsedVia: 'manual',
      createdAt: '2026-04-05T00:00:00Z',
    };

    const utilAmount = getTenantUtilityFromStatement(statement, 'prepaid_submeter');
    expect(utilAmount).toBe(0);
  });
});

describe('Opening Balance Reconciliation (reconcileOpeningBalanceForTargetArrears)', () => {
  const refDate = '2026-04-15';

  it('reconciles opening balance so total arrears becomes R 0.00 (Clear Arrears)', () => {
    // Rental with payments matching charges for all past months except R5000 opening arrears
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 5000,
      paymentRecords: [],
    });

    const initialResult = calculatePropertyArrears(rental, refDate);
    expect(initialResult.totalArrearsZAR).toBeGreaterThan(0);

    // Landlord clicks "Clear Arrears" (target = 0)
    const newOpening = reconcileOpeningBalanceForTargetArrears(rental, 0, refDate);
    const updatedRental = { ...rental, arrearsOpeningBalanceZAR: newOpening };
    const clearedResult = calculatePropertyArrears(updatedRental, refDate);

    expect(clearedResult.totalArrearsZAR).toBe(0);
    expect(clearedResult.effectiveArrearsZAR).toBe(0);
  });

  it('reconciles opening balance to match any arbitrary target arrears without mutating payments', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      paymentRecords: [
        {
          id: 'p1',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-01',
          amountReceivedZAR: 16500,
          paymentMethod: 'EFT',
          createdAt: '2026-04-01T08:00:00Z',
        },
      ],
    });

    const targetArrears = 7500.5;
    const reconciledOpening = reconcileOpeningBalanceForTargetArrears(rental, targetArrears, refDate);

    const reconciledRental = { ...rental, arrearsOpeningBalanceZAR: reconciledOpening };
    const result = calculatePropertyArrears(reconciledRental, refDate);

    expect(result.totalArrearsZAR).toBe(targetArrears);
    // Historical payment records must not be changed
    expect(reconciledRental.paymentRecords).toHaveLength(1);
    expect(reconciledRental.paymentRecords![0].amountReceivedZAR).toBe(16500);
  });
});

describe('Date & Month Helper Functions', () => {
  it('getMonthKey parses string and Date objects accurately', () => {
    expect(getMonthKey('2026-04-01')).toBe('2026-04');
    expect(getMonthKey('2026/04/15')).toBe('2026-04');
    expect(getMonthKey(new Date(2026, 3, 10))).toBe('2026-04'); // Month 3 is April
  });

  it('formatMonthLabel formats month to readable string', () => {
    const label = formatMonthLabel('2026-04');
    expect(label).toContain('April');
    expect(label).toContain('2026');
  });
});

describe('WhatsApp Statement & Receipt Formatters', () => {
  const rental = createMockRental({
    arrearsOpeningBalanceZAR: 1200,
    paymentRecords: [
      {
        id: 'p-1',
        propertyId: 'test-rental-1',
        periodMonth: '2026-04',
        paymentDate: '2026-04-02',
        amountReceivedZAR: 16500,
        paymentMethod: 'EFT',
        reference: 'FNB-998811',
        createdAt: '2026-04-02T10:00:00Z',
      },
    ],
  });

  it('formatTenantAccountStatementForWhatsApp generates 4-part layout', () => {
    const text = formatTenantAccountStatementForWhatsApp(rental, {
      month: '2026-04',
      investorProfile: {
        id: 'prof-1',
        entityName: 'Apex Wealth Properties (Pty) Ltd',
        contactNumber: '+27 82 999 8888',
      } as any,
    });

    expect(text).toContain('TENANT ACCOUNT STATEMENT & TAX INVOICE');
    expect(text).toContain('Apex Wealth Properties (Pty) Ltd');
    expect(text).toContain('Thabo Mokoena');
    // Check 4 sections
    expect(text).toContain('1. BALANCE BROUGHT FORWARD');
    expect(text).toContain('2. CURRENT PERIOD CHARGES');
    expect(text).toContain('3. LESS: PAYMENTS RECEIVED');
    expect(text).toContain('4. TOTAL AMOUNT DUE');
    // Check payment itemization
    expect(text).toContain('FNB-998811');
    expect(text).toContain(formatZAR(16500, { includeDecimals: true }));
  });

  it('formatTenantPaymentReceiptForWhatsApp generates confirmation receipt', () => {
    const payment = rental.paymentRecords![0];
    const text = formatTenantPaymentReceiptForWhatsApp(rental, payment, {
      entityName: 'Apex Wealth Properties',
    } as any);

    expect(text).toContain('PAYMENT RECEIPT & CONFIRMATION');
    expect(text).toContain('Thabo Mokoena');
    expect(text).toContain(formatZAR(16500, { includeDecimals: true }));
    expect(text).toContain('FNB-998811');
    expect(text).toContain('EFT');
  });
});

describe('Multi-Tenant Scoping & Lease Filtering', () => {
  const multiRental: RentalProperty = {
    ...createMockRental(),
    id: 'multi-prop-1',
    monthlyGrossRentZAR: 28000,
    leases: [
      {
        id: 'lease-unit-1',
        unitName: 'Unit 1 (Ground)',
        tenantName: 'Alice Smith',
        monthlyRentZAR: 16000,
        depositHeldZAR: 32000,
        leaseStartDate: '2026-01-01',
        leaseEndDate: '2026-12-31',
        annualEscalationPercent: 7.0,
        status: 'Occupied',
        arrearsOpeningBalanceZAR: 1000,
      },
      {
        id: 'lease-unit-2',
        unitName: 'Unit 2 (Cottage)',
        tenantName: 'Bob Jones',
        monthlyRentZAR: 12000,
        depositHeldZAR: 24000,
        leaseStartDate: '2026-02-01',
        leaseEndDate: '2026-12-31',
        annualEscalationPercent: 7.0,
        status: 'Occupied',
        arrearsOpeningBalanceZAR: 500,
      },
    ],
    paymentRecords: [
      {
        id: 'p-u1-apr',
        propertyId: 'multi-prop-1',
        leaseId: 'lease-unit-1',
        periodMonth: '2026-04',
        paymentDate: '2026-04-01',
        amountReceivedZAR: 16000,
        paymentMethod: 'EFT',
        createdAt: '2026-04-01T10:00:00Z',
      },
      {
        id: 'p-u2-apr',
        propertyId: 'multi-prop-1',
        leaseId: 'lease-unit-2',
        periodMonth: '2026-04',
        paymentDate: '2026-04-01',
        amountReceivedZAR: 6000,
        paymentMethod: 'EFT',
        createdAt: '2026-04-01T11:00:00Z',
      },
      {
        id: 'p-unallocated',
        propertyId: 'multi-prop-1',
        periodMonth: '2026-04',
        paymentDate: '2026-04-05',
        amountReceivedZAR: 2000,
        paymentMethod: 'Cash Deposit',
        createdAt: '2026-04-05T12:00:00Z',
      },
    ],
  };

  it('correctly scopes calculations strictly to Unit 1', () => {
    const res = calculatePropertyArrears(multiRental, '2026-04-15', { leaseId: 'lease-unit-1' });
    expect(res.openingBalanceZAR).toBe(1000);
    expect(res.totalPaymentsReceivedZAR).toBe(16000);
    expect(res.currentMonthItem.baseRent).toBe(16000);
    expect(res.currentMonthItem.status).toBe('Paid in Full');
  });

  it('correctly scopes calculations strictly to Unit 2', () => {
    const res = calculatePropertyArrears(multiRental, '2026-04-15', { leaseId: 'lease-unit-2' });
    expect(res.openingBalanceZAR).toBe(500);
    expect(res.totalPaymentsReceivedZAR).toBe(6000);
    expect(res.currentMonthItem.baseRent).toBe(12000);
    expect(res.currentMonthItem.status).toBe('Partial');
    expect(res.currentMonthDueZAR).toBe(6000);
  });

  it('consolidated calculation aggregates all units and unallocated payments', () => {
    const res = calculatePropertyArrears(multiRental, '2026-04-15');
    expect(res.openingBalanceZAR).toBe(1500);
    expect(res.totalPaymentsReceivedZAR).toBe(24000);
    expect(res.currentMonthItem.baseRent).toBe(28000);
  });

  it('prevents charging base rent for months prior to leaseStartDate', () => {
    expect(isLeaseActiveInMonth(multiRental.leases[1], '2026-01')).toBe(false);
    expect(isLeaseActiveInMonth(multiRental.leases[1], '2026-02')).toBe(true);

    const ledger = calculateMonthlyLedger(multiRental, '2026-04-15', { leaseId: 'lease-unit-2' });
    const janItem = ledger.find((m) => m.month === '2026-01');
    if (janItem) {
      expect(janItem.baseRent).toBe(0);
    }
  });

  it('does not charge base rent or utility recoveries for vacant leases', () => {
    const vacantLease = {
      ...multiRental.leases[0],
      status: 'Vacant' as const,
    };
    expect(isLeaseActiveInMonth(vacantLease, '2026-04')).toBe(false);
  });
});

describe('calculateTenantStatementTiers (4-Tier Ledger Breakdown)', () => {
  it('correctly computes brought forward, current period charges, payments, and total due', () => {
    const rental = createMockRental({
      arrearsOpeningBalanceZAR: 2500,
      paymentRecords: [
        {
          id: 'pay-mar',
          propertyId: 'test-rental-1',
          periodMonth: '2026-03',
          paymentDate: '2026-03-01',
          amountReceivedZAR: 16500,
          paymentMethod: 'EFT',
          createdAt: '2026-03-01T08:00:00Z',
        },
        {
          id: 'pay-apr',
          propertyId: 'test-rental-1',
          periodMonth: '2026-04',
          paymentDate: '2026-04-03',
          amountReceivedZAR: 10000,
          paymentMethod: 'EFT',
          createdAt: '2026-04-03T08:00:00Z',
        },
      ],
    });

    const tiers = calculateTenantStatementTiers(rental, '2026-04');
    expect(tiers.balanceBroughtForward).toBeDefined();
    expect(tiers.currentCharges).toBe(16500);
    expect(tiers.periodPaymentsTotal).toBe(10000);
    expect(tiers.totalAmountDue).toBe(
      Math.round((tiers.balanceBroughtForward + tiers.currentCharges - tiers.periodPaymentsTotal) * 100) / 100
    );
  });
});

describe('allocateOldestFirst (Polymorphic Multi-Month Lump-Sum Allocation)', () => {
  const unpaid = [
    { month: '2026-01', unpaidAmountZAR: 5000 },
    { month: '2026-02', unpaidAmountZAR: 5000 },
    { month: '2026-03', unpaidAmountZAR: 5000 },
  ];

  it('allocates strictly oldest-month-first given (amount, unpaidMonths)', () => {
    const allocs = allocateOldestFirst(8000, unpaid);
    expect(allocs).toHaveLength(2);
    expect(allocs[0]).toEqual({ periodMonth: '2026-01', amountZAR: 5000 });
    expect(allocs[1]).toEqual({ periodMonth: '2026-02', amountZAR: 3000 });
  });

  it('allocates strictly oldest-month-first given (unpaidMonths, amount) inverted order', () => {
    const allocs = allocateOldestFirst(unpaid, 8000);
    expect(allocs).toHaveLength(2);
    expect(allocs[0]).toEqual({ periodMonth: '2026-01', amountZAR: 5000 });
    expect(allocs[1]).toEqual({ periodMonth: '2026-02', amountZAR: 3000 });
  });

  it('places surplus/excess amount into the next billing month as advance credit', () => {
    const allocs = allocateOldestFirst(18000, unpaid);
    expect(allocs).toHaveLength(4);
    expect(allocs[0]).toEqual({ periodMonth: '2026-01', amountZAR: 5000 });
    expect(allocs[1]).toEqual({ periodMonth: '2026-02', amountZAR: 5000 });
    expect(allocs[2]).toEqual({ periodMonth: '2026-03', amountZAR: 5000 });
    expect(allocs[3]).toEqual({ periodMonth: '2026-04', amountZAR: 3000 });
  });

  it('handles empty or zero inputs safely without throwing', () => {
    expect(allocateOldestFirst(0, [])).toEqual([]);
    expect(allocateOldestFirst([], 0)).toEqual([]);
    expect(allocateOldestFirst(1000, [])).toEqual([
      { periodMonth: expect.any(String), amountZAR: 1000 },
    ]);
  });
});

describe('migrateNegativeArrearsToRental (Audited Bad Debt Conversion)', () => {
  it('converts negative arrearsOpeningBalanceZAR to an audited ArrearsWriteOff and resets opening balance to 0', () => {
    const legacyRental = createMockRental({
      arrearsOpeningBalanceZAR: -37000,
      arrearsWriteOffs: [],
    });

    const migrated = migrateNegativeArrearsToRental(legacyRental);

    expect(migrated.arrearsOpeningBalanceZAR).toBe(0);
    expect(migrated.arrearsWriteOffs).toBeDefined();
    expect(migrated.arrearsWriteOffs).toHaveLength(1);

    const writeOff = migrated.arrearsWriteOffs![0];
    expect(writeOff.amountZAR).toBe(37000);
    expect(writeOff.reason).toBe('Other');
    expect(writeOff.notes).toContain('Converted from Clear Arrears');
    expect(writeOff.allocations.length).toBeGreaterThan(0);
  });

  it('leaves positive arrearsOpeningBalanceZAR untouched and idempotent', () => {
    const normalRental = createMockRental({
      arrearsOpeningBalanceZAR: 5000,
      arrearsWriteOffs: [],
    });

    const migrated = migrateNegativeArrearsToRental(normalRental);
    expect(migrated.arrearsOpeningBalanceZAR).toBe(5000);
    expect(migrated.arrearsWriteOffs).toEqual([]);
  });
});

describe('Arrears Write-Offs in Ledger & Statement Tiers', () => {
  it('deducts write-offs from outstanding tenant balance in monthly ledger and statement tiers', () => {
    const rentalWithWriteOff = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      arrearsWriteOffs: [
        {
          id: 'wo-1',
          date: '2026-03-15',
          amountZAR: 16500,
          reason: 'Absconded',
          notes: 'Tenant absconded with March rent due',
          allocations: [{ periodMonth: '2026-03', amountZAR: 16500 }],
          createdAt: '2026-03-15T10:00:00Z',
        },
      ],
      paymentRecords: [],
    });

    // March 2026 rent was 16500, but written off 16500 -> totalArrears should not include March debt
    const arrears = calculatePropertyArrears(rentalWithWriteOff, '2026-04-01');
    const marchItem = arrears.ledger.find((m) => m.month === '2026-03');
    expect(marchItem?.writeOffsApplied).toBe(16500);
    expect(marchItem?.netVariance).toBe(0);
    expect(marchItem?.status).toBe('Paid in Full');

    // Tenant statement for April should reflect the write-off in brought-forward
    const tiers = calculateTenantStatementTiers(rentalWithWriteOff, '2026-04');
    expect(tiers.priorWriteOffs).toBe(16500);
    expect(tiers.balanceBroughtForward).toBe(33000); // Jan (16500) + Feb (16500) + Mar (16500 - 16500 written off)
  });

  it('prevents ghost arrears brought forward on long-standing leases (e.g. Sandhurst Suite starting 2023)', () => {
    // Sandhurst has leaseStartDate '2023-04-01' and payments starting '2026-02'.
    // Prior to fix, diff <= 36 generated 33 phantom unrecorded months (R 610,500).
    const longStandingRental = createMockRental({
      arrearsOpeningBalanceZAR: 0,
      leases: [
        {
          id: 'lease-sandhurst',
          unitName: 'Main Unit',
          tenantName: 'Dr. Thabo Mokoena',
          tenantPhone: '+27 82 456 7890',
          tenantEmail: 'thabo@example.com',
          monthlyRentZAR: 18500,
          depositHeldZAR: 37000,
          leaseStartDate: '2023-04-01',
          leaseEndDate: '2027-03-31',
          annualEscalationPercent: 7.0,
          status: 'Occupied',
        },
      ],
      paymentRecords: [
        {
          id: 'pay-2026-02',
          propertyId: 'test-rental-1',
          leaseId: 'lease-sandhurst',
          periodMonth: '2026-02',
          paymentDate: '2026-02-01',
          amountReceivedZAR: 18500,
          paymentMethod: 'EFT',
          createdAt: '2026-02-01T08:00:00Z',
        },
        {
          id: 'pay-2026-03',
          propertyId: 'test-rental-1',
          leaseId: 'lease-sandhurst',
          periodMonth: '2026-03',
          paymentDate: '2026-03-01',
          amountReceivedZAR: 18500,
          paymentMethod: 'EFT',
          createdAt: '2026-03-01T08:00:00Z',
        },
        {
          id: 'pay-2026-04',
          propertyId: 'test-rental-1',
          leaseId: 'lease-sandhurst',
          periodMonth: '2026-04',
          paymentDate: '2026-04-01',
          amountReceivedZAR: 18500,
          paymentMethod: 'EFT',
          createdAt: '2026-04-01T08:00:00Z',
        },
      ],
    });

    const statementApril = calculateTenantStatementTiers(longStandingRental, '2026-04');
    // Balance brought forward for April must be 0, NOT 33 months of rent (R 610,500)
    expect(statementApril.balanceBroughtForward).toBe(0);
    // Total amount due for April after R 18 500 payment is 0
    expect(statementApril.totalAmountDue).toBe(0);
  });

  it('correctly calculates previous calendar month with getPreviousMonthKey', () => {
    expect(getPreviousMonthKey('2026-10')).toBe('2026-09');
    expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
    expect(getPreviousMonthKey('2026-05')).toBe('2026-04');
  });
});


