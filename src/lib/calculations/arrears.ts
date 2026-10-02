import { RentalProperty, TenantPaymentRecord, UtilityStatement, Lease } from '@/types';
import { formatDate, formatZAR } from '@/lib/formatters';

export interface MonthLedgerItem {
  month: string; // 'YYYY-MM'
  monthLabel: string; // 'April 2026'
  baseRent: number;
  utilitiesBilled: number;
  totalBilled: number;
  paymentsReceived: number;
  netVariance: number; // totalBilled - paymentsReceived (positive = balance due, negative = credit)
  status: 'Paid in Full' | 'Partial' | 'Unpaid' | 'Overpaid';
  payments: TenantPaymentRecord[];
  utilityStatements: UtilityStatement[];
  leaseId?: string;
}

export interface ArrearsCalculationResult {
  openingBalanceZAR: number;
  totalBilledChargesZAR: number;
  totalPaymentsReceivedZAR: number;
  totalArrearsZAR: number; // openingBalance + totalBilled - totalPayments
  effectiveArrearsZAR: number; // Math.max(0, totalArrearsZAR)
  currentMonth: string;
  currentMonthItem: MonthLedgerItem;
  currentMonthStatus: 'Paid in Full' | 'Partial' | 'Unpaid' | 'Overpaid';
  currentMonthDueZAR: number;
  currentMonthBilledZAR: number;
  currentMonthPaidZAR: number;
  ledger: MonthLedgerItem[];
  selectedLeaseId?: string;
}

export interface ArrearsOptions {
  leaseId?: string; // When provided, scopes calculations strictly to this specific tenant/unit
}

/**
 * Returns 'YYYY-MM' format from date string or Date object.
 */
export function getMonthKey(date: Date | string = new Date()): string {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}`;
    }
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Human readable month label (e.g. 'April 2026')
 */
export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

/**
 * Calculate the tenant utility recovery amount from a UtilityStatement.
 * Municipal property rates are strictly excluded (landlord expense).
 */
export function getTenantUtilityFromStatement(
  statement: UtilityStatement,
  utilityType?: RentalProperty['utilityType']
): number {
  if (utilityType === 'prepaid_submeter') {
    return 0;
  }

  const isBundled =
    statement.billingType === 'bundled' ||
    statement.bundledUtilitiesZAR !== undefined ||
    Boolean(statement.provider?.toLowerCase().includes('igrow'));

  if (isBundled) {
    return statement.bundledUtilitiesZAR ?? 0;
  }

  const elec = statement.electricityZAR || 0;
  const water = statement.waterZAR || 0;
  const refuse = statement.refuseZAR || 0;
  const sewerage = statement.sewerageZAR || 0;

  return Math.round((elec + water + refuse + sewerage) * 100) / 100;
}

/**
 * Get base monthly rent for a rental property for a given month.
 */
export function getBaseRentForRental(rental: RentalProperty): number {
  if (rental.leases && rental.leases.length > 0) {
    const occupiedRent = rental.leases
      .filter((l) => l.status === 'Occupied')
      .reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0);
    if (occupiedRent > 0) return occupiedRent;
    return rental.leases.reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0);
  }
  return rental.monthlyGrossRentZAR || 0;
}

/**
 * Checks whether a lease is active in a given month ('YYYY-MM').
 */
export function isLeaseActiveInMonth(lease: Lease, monthKey: string): boolean {
  if (lease.status === 'Vacant') return false;
  if (lease.leaseStartDate) {
    const startKey = getMonthKey(lease.leaseStartDate);
    if (monthKey < startKey) return false;
  }
  if (lease.leaseEndDate) {
    const endKey = getMonthKey(lease.leaseEndDate);
    if (monthKey > endKey) return false;
  }
  return true;
}

/**
 * Derives the list of billing months (YYYY-MM) to track in chronological ascending order.
 * - If leaseId is specified: auto-populates from that lease's start date up to reference month.
 * - If consolidated: auto-populates from the earliest active lease start date up to reference month.
 * - If no lease start date: falls back to last 3 months up to reference month.
 * - Always includes any months where payments or utility statements exist.
 */
export function getLedgerMonths(
  rental: RentalProperty,
  referenceDate: Date | string = new Date(),
  options?: ArrearsOptions
): string[] {
  const currentMonth = getMonthKey(referenceDate);
  const monthsSet = new Set<string>();

  monthsSet.add(currentMonth);

  const [currY, currM] = currentMonth.split('-').map(Number);
  const refDateObj = new Date(currY, currM - 1, 1);

  const targetLease = options?.leaseId
    ? (rental.leases || []).find((l) => l.id === options.leaseId)
    : undefined;

  if (targetLease) {
    // Specific Lease Mode:
    if (targetLease.leaseStartDate) {
      const startKey = getMonthKey(targetLease.leaseStartDate);
      const [startY, startM] = startKey.split('-').map(Number);
      const startDateObj = new Date(startY, startM - 1, 1);
      const diff = (currY - startY) * 12 + (currM - startM);

      if (diff >= 0 && diff <= 36) {
        for (let i = 0; i <= diff; i++) {
          const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else {
        monthsSet.add(startKey);
        // Fallback: at least last 3 months
        for (let i = 0; i < 3; i++) {
          const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
          monthsSet.add(getMonthKey(d));
        }
      }
    } else {
      // Fallback: last 3 months
      for (let i = 0; i < 3; i++) {
        const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
        monthsSet.add(getMonthKey(d));
      }
    }

    // Add months from this tenant's payment records
    (rental.paymentRecords || []).forEach((p) => {
      const isMatch = p.leaseId === targetLease.id || (!p.leaseId && (rental.leases || []).length <= 1);
      if (isMatch) {
        if (p.periodMonth) monthsSet.add(p.periodMonth);
        else if (p.paymentDate) monthsSet.add(getMonthKey(p.paymentDate));
      }
    });
  } else {
    // Consolidated Property Mode:
    const leasesWithStart = (rental.leases || []).filter((l) => Boolean(l.leaseStartDate));
    if (leasesWithStart.length > 0) {
      // Find earliest lease start date
      const sortedStartKeys = leasesWithStart
        .map((l) => getMonthKey(l.leaseStartDate))
        .sort();
      const earliestStartKey = sortedStartKeys[0];
      const [startY, startM] = earliestStartKey.split('-').map(Number);
      const startDateObj = new Date(startY, startM - 1, 1);
      const diff = (currY - startY) * 12 + (currM - startM);

      if (diff >= 0 && diff <= 36) {
        for (let i = 0; i <= diff; i++) {
          const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else {
        // Fallback: last 3 months
        for (let i = 0; i < 3; i++) {
          const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
          monthsSet.add(getMonthKey(d));
        }
      }
    } else {
      // Fallback: last 3 months
      for (let i = 0; i < 3; i++) {
        const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
        monthsSet.add(getMonthKey(d));
      }
    }

    // Add months from any payment records
    (rental.paymentRecords || []).forEach((p) => {
      if (p.periodMonth) monthsSet.add(p.periodMonth);
      else if (p.paymentDate) monthsSet.add(getMonthKey(p.paymentDate));
    });
  }

  // Add months from utility statements
  (rental.utilityStatements || []).forEach((stmt) => {
    if (stmt.statementDate) {
      monthsSet.add(getMonthKey(stmt.statementDate));
    }
  });

  return Array.from(monthsSet).sort();
}

/**
 * Calculates complete month-by-month billing and payment ledger items.
 * Supports filtering by specific leaseId or consolidated property view.
 */
export function calculateMonthlyLedger(
  rental: RentalProperty,
  referenceDate: Date | string = new Date(),
  options?: ArrearsOptions
): MonthLedgerItem[] {
  const months = getLedgerMonths(rental, referenceDate, options);
  const payments = rental.paymentRecords || [];
  const statements = rental.utilityStatements || [];

  const targetLease = options?.leaseId
    ? (rental.leases || []).find((l) => l.id === options.leaseId)
    : undefined;

  const occupiedLeases = (rental.leases || []).filter((l) => l.status === 'Occupied');
  const occupiedCount = Math.max(1, occupiedLeases.length);

  return months.map((month) => {
    // 1. Base Rent Calculation
    let baseRent = 0;
    if (targetLease) {
      if (isLeaseActiveInMonth(targetLease, month)) {
        baseRent = targetLease.monthlyRentZAR || 0;
      }
    } else {
      if (rental.leases && rental.leases.length > 0) {
        const activeLeases = rental.leases.filter((l) => isLeaseActiveInMonth(l, month));
        baseRent = activeLeases.reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0);
        // Fallback for leases without dates in current/future window
        if (baseRent === 0 && activeLeases.length === 0 && month === getMonthKey(referenceDate)) {
          baseRent = getBaseRentForRental(rental);
        }
      } else {
        baseRent = rental.monthlyGrossRentZAR || 0;
      }
    }

    // 2. Utility Recoveries Calculation
    const matchingStmts = statements.filter((s) => {
      const stmtMonth = getMonthKey(s.statementDate);
      return stmtMonth === month;
    });

    const totalPropUtilities = matchingStmts.reduce(
      (sum, stmt) => sum + getTenantUtilityFromStatement(stmt, rental.utilityType),
      0
    );

    let utilitiesBilled = 0;
    if (targetLease) {
      if (rental.utilityType === 'prepaid_submeter') {
        utilitiesBilled = 0;
      } else if (rental.utilityType === 'hybrid') {
        const isMain =
          targetLease.unitName?.toLowerCase().includes('main') || occupiedCount <= 1;
        utilitiesBilled = isMain ? totalPropUtilities : 0;
      } else {
        utilitiesBilled = Math.round((totalPropUtilities / occupiedCount) * 100) / 100;
      }
    } else {
      utilitiesBilled = totalPropUtilities;
    }

    const totalBilled = Math.round((baseRent + utilitiesBilled) * 100) / 100;

    // 3. Payments Received
    const matchingPayments = payments.filter((p) => {
      const pMonth = p.periodMonth || getMonthKey(p.paymentDate);
      if (pMonth !== month) return false;
      if (targetLease) {
        if (p.leaseId) return p.leaseId === targetLease.id;
        return (rental.leases || []).length <= 1;
      }
      return true;
    });

    const paymentsReceived = matchingPayments.reduce(
      (sum, p) => sum + (p.amountReceivedZAR || 0),
      0
    );

    const netVariance = Math.round((totalBilled - paymentsReceived) * 100) / 100;

    let status: MonthLedgerItem['status'] = 'Unpaid';
    if (paymentsReceived >= totalBilled && totalBilled > 0) {
      status = paymentsReceived > totalBilled ? 'Overpaid' : 'Paid in Full';
    } else if (paymentsReceived > 0) {
      status = 'Partial';
    } else if (totalBilled === 0 && paymentsReceived === 0) {
      status = 'Paid in Full';
    }

    return {
      month,
      monthLabel: formatMonthLabel(month),
      baseRent,
      utilitiesBilled,
      totalBilled,
      paymentsReceived,
      netVariance,
      status,
      payments: matchingPayments,
      utilityStatements: matchingStmts,
      leaseId: targetLease?.id,
    };
  });
}

/**
 * Computes Total Arrears according to the formula:
 * Arrears = arrearsOpeningBalanceZAR + sum(Billed Charges) - sum(Payments Received)
 */
export function calculatePropertyArrears(
  rental: RentalProperty,
  referenceDate: Date | string = new Date(),
  options?: ArrearsOptions
): ArrearsCalculationResult {
  const targetLease = options?.leaseId
    ? (rental.leases || []).find((l) => l.id === options.leaseId)
    : undefined;

  let openingBalanceZAR = 0;
  if (targetLease) {
    openingBalanceZAR = targetLease.arrearsOpeningBalanceZAR ?? 0;
  } else {
    const hasLeaseOpening = (rental.leases || []).some((l) => l.arrearsOpeningBalanceZAR !== undefined);
    if (hasLeaseOpening) {
      openingBalanceZAR = (rental.leases || []).reduce(
        (sum, l) => sum + (l.arrearsOpeningBalanceZAR || 0),
        0
      );
    } else if (rental.arrearsOpeningBalanceZAR !== undefined) {
      openingBalanceZAR = rental.arrearsOpeningBalanceZAR;
    }
  }

  const ledger = calculateMonthlyLedger(rental, referenceDate, options);
  const currentMonth = getMonthKey(referenceDate);

  const totalBilledChargesZAR = ledger.reduce((sum, item) => sum + item.totalBilled, 0);

  const relevantPayments = (rental.paymentRecords || []).filter((p) => {
    if (targetLease) {
      if (p.leaseId) return p.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const totalPaymentsReceivedZAR = relevantPayments.reduce(
    (sum, p) => sum + (p.amountReceivedZAR || 0),
    0
  );

  const totalArrearsZAR =
    Math.round((openingBalanceZAR + totalBilledChargesZAR - totalPaymentsReceivedZAR) * 100) / 100;

  const currentMonthItem =
    ledger.find((item) => item.month === currentMonth) || {
      month: currentMonth,
      monthLabel: formatMonthLabel(currentMonth),
      baseRent: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      utilitiesBilled: 0,
      totalBilled: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      paymentsReceived: 0,
      netVariance: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      status: 'Unpaid' as const,
      payments: [],
      utilityStatements: [],
      leaseId: targetLease?.id,
    };

  return {
    openingBalanceZAR,
    totalBilledChargesZAR,
    totalPaymentsReceivedZAR,
    totalArrearsZAR,
    effectiveArrearsZAR: Math.max(0, totalArrearsZAR),
    currentMonth,
    currentMonthItem,
    currentMonthStatus: currentMonthItem.status,
    currentMonthDueZAR: Math.max(0, currentMonthItem.netVariance),
    currentMonthBilledZAR: currentMonthItem.totalBilled,
    currentMonthPaidZAR: currentMonthItem.paymentsReceived,
    ledger,
    selectedLeaseId: targetLease?.id,
  };
}

/**
 * Reconciles the opening balance adjustment so that:
 * targetArrears = openingBalance + sum(Billed Charges) - sum(Payments Received)
 * => newOpeningBalance = targetArrears - sum(Billed Charges) + sum(Payments Received)
 */
export function reconcileOpeningBalanceForTargetArrears(
  rental: RentalProperty,
  targetArrears: number,
  referenceDate: Date | string = new Date(),
  options?: ArrearsOptions
): number {
  const ledger = calculateMonthlyLedger(rental, referenceDate, options);
  const totalBilled = ledger.reduce((sum, item) => sum + item.totalBilled, 0);

  const targetLease = options?.leaseId
    ? (rental.leases || []).find((l) => l.id === options.leaseId)
    : undefined;

  const relevantPayments = (rental.paymentRecords || []).filter((p) => {
    if (targetLease) {
      if (p.leaseId) return p.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const totalPayments = relevantPayments.reduce(
    (sum, p) => sum + (p.amountReceivedZAR || 0),
    0
  );

  const reconciled = targetArrears - totalBilled + totalPayments;
  return Math.round(reconciled * 100) / 100;
}

/**
 * Computes 4-tier statement values for any selected statement period:
 * 1. Balance Brought Forward (Opening balance + prior billed charges - prior payments)
 * 2. Current Period Charges (Base rent + itemized utilities)
 * 3. Less: Payments Received for the period
 * 4. Total Amount Due / Outstanding Balance
 */
export function calculateTenantStatementTiers(
  rental: RentalProperty,
  periodMonth: string,
  options?: ArrearsOptions
) {
  const ledger = calculateMonthlyLedger(rental, `${periodMonth}-01`, options);

  const targetLease = options?.leaseId
    ? (rental.leases || []).find((l) => l.id === options.leaseId)
    : rental.leases?.[0];

  const openingBalanceZAR = targetLease?.arrearsOpeningBalanceZAR ?? (rental.arrearsOpeningBalanceZAR || 0);

  // Charges strictly before this period
  const priorCharges = ledger
    .filter((item) => item.month < periodMonth)
    .reduce((sum, item) => sum + item.totalBilled, 0);

  // Payments strictly before this period
  const relevantPayments = (rental.paymentRecords || []).filter((p) => {
    if (targetLease) {
      if (p.leaseId) return p.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const priorPayments = relevantPayments
    .filter((p) => (p.periodMonth || getMonthKey(p.paymentDate)) < periodMonth)
    .reduce((sum, p) => sum + (p.amountReceivedZAR || 0), 0);

  const balanceBroughtForward =
    Math.round((openingBalanceZAR + priorCharges - priorPayments) * 100) / 100;

  const currentItem = ledger.find((item) => item.month === periodMonth);
  const currentCharges = currentItem ? currentItem.totalBilled : (targetLease?.monthlyRentZAR || 0);

  const periodPayments = relevantPayments.filter(
    (p) => (p.periodMonth || getMonthKey(p.paymentDate)) === periodMonth
  );
  const periodPaymentsTotal = periodPayments.reduce(
    (sum, p) => sum + (p.amountReceivedZAR || 0),
    0
  );

  const totalAmountDue =
    Math.round((balanceBroughtForward + currentCharges - periodPaymentsTotal) * 100) / 100;

  return {
    balanceBroughtForward,
    currentCharges,
    periodPayments,
    periodPaymentsTotal,
    totalAmountDue,
    currentItem,
    targetLease,
  };
}
