import { RentalProperty, TenantPaymentRecord, UtilityStatement, Lease, ArrearsWriteOff, PaymentAllocation } from '@/types';
import { formatDate, formatZAR } from '@/lib/formatters';

export interface MonthLedgerItem {
  month: string; // 'YYYY-MM'
  monthLabel: string; // 'April 2026'
  baseRent: number;
  utilitiesBilled: number;
  totalBilled: number;
  paymentsReceived: number;
  writeOffsApplied: number;
  netVariance: number; // totalBilled - paymentsReceived - writeOffsApplied
  status: 'Paid in Full' | 'Partial' | 'Unpaid' | 'Overpaid';
  payments: TenantPaymentRecord[];
  allocatedPayments: {
    payment: TenantPaymentRecord;
    allocatedAmountZAR: number;
  }[];
  writeOffs: ArrearsWriteOff[];
  allocatedWriteOffs: {
    writeOff: ArrearsWriteOff;
    allocatedAmountZAR: number;
  }[];
  utilityStatements: UtilityStatement[];
  leaseId?: string;
}

export interface ArrearsCalculationResult {
  openingBalanceZAR: number;
  totalBilledChargesZAR: number;
  totalPaymentsReceivedZAR: number;
  totalWriteOffsZAR: number;
  totalArrearsZAR: number; // openingBalance + totalBilled - totalPayments - totalWriteOffs
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
 * Returns the next 'YYYY-MM' billing month.
 */
export function getNextMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(y) || isNaN(m)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`;
  }
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Returns the previous 'YYYY-MM' billing month.
 */
export function getPreviousMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(y) || isNaN(m)) {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Formats multi-month payment allocations into a concise human-readable summary.
 * e.g. "Aug R 18 500, Sep R 18 500"
 */
export function formatAllocationsSummary(allocations: PaymentAllocation[]): string {
  if (!allocations || allocations.length === 0) return '';
  return allocations
    .map((a) => {
      const [y, m] = a.periodMonth.split('-').map(Number);
      const date = new Date(y, (m || 1) - 1, 1);
      const shortMonth = date.toLocaleDateString('en-ZA', { month: 'short' });
      return `${shortMonth} ${formatZAR(a.amountZAR)}`;
    })
    .join(', ');
}

/**
 * Calculates how much of a payment is allocated to a specific billing month.
 * Backward compatibility: legacy payments without allocations count toward periodMonth (or month of paymentDate).
 */
export function getPaymentAllocationForMonth(
  payment: TenantPaymentRecord,
  month: string
): number {
  if (payment.allocations && payment.allocations.length > 0) {
    const match = payment.allocations.find((a) => a.periodMonth === month);
    return match ? match.amountZAR : 0;
  }
  const pMonth = payment.periodMonth || getMonthKey(payment.paymentDate);
  return pMonth === month ? payment.amountReceivedZAR : 0;
}

/**
 * Calculates how much of a write-off is allocated to a specific billing month.
 */
export function getWriteOffAllocationForMonth(
  writeOff: ArrearsWriteOff,
  month: string
): number {
  if (writeOff.allocations && writeOff.allocations.length > 0) {
    const match = writeOff.allocations.find((a) => a.periodMonth === month);
    return match ? match.amountZAR : 0;
  }
  const wMonth = getMonthKey(writeOff.date);
  return wMonth === month ? writeOff.amountZAR : 0;
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

  // 1. Gather all activity months (payments, statements, write-offs)
  const activityMonths: string[] = [];

  (rental.paymentRecords || []).forEach((p) => {
    const isMatch = targetLease
      ? p.leaseId === targetLease.id || (!p.leaseId && (rental.leases || []).length <= 1)
      : true;
    if (isMatch) {
      if (p.allocations && p.allocations.length > 0) {
        p.allocations.forEach((a) => {
          monthsSet.add(a.periodMonth);
          activityMonths.push(a.periodMonth);
        });
      } else if (p.periodMonth) {
        monthsSet.add(p.periodMonth);
        activityMonths.push(p.periodMonth);
      } else if (p.paymentDate) {
        const pm = getMonthKey(p.paymentDate);
        monthsSet.add(pm);
        activityMonths.push(pm);
      }
    }
  });

  (rental.arrearsWriteOffs || []).forEach((w) => {
    const isMatch = targetLease
      ? w.leaseId === targetLease.id || (!w.leaseId && (rental.leases || []).length <= 1)
      : true;
    if (isMatch) {
      if (w.allocations && w.allocations.length > 0) {
        w.allocations.forEach((a) => {
          monthsSet.add(a.periodMonth);
          activityMonths.push(a.periodMonth);
        });
      } else if (w.date) {
        const wm = getMonthKey(w.date);
        monthsSet.add(wm);
        activityMonths.push(wm);
      }
    }
  });

  (rental.utilityStatements || []).forEach((stmt) => {
    if (stmt.statementDate) {
      const sm = getMonthKey(stmt.statementDate);
      monthsSet.add(sm);
      activityMonths.push(sm);
    }
  });

  const sortedActivities = activityMonths.filter((m) => m <= currentMonth).sort();
  const earliestActivity = sortedActivities[0];

  // 2. Determine contiguous billing months
  if (targetLease) {
    if (targetLease.leaseStartDate) {
      const startKey = getMonthKey(targetLease.leaseStartDate);
      const [startY, startM] = startKey.split('-').map(Number);
      const startDateObj = new Date(startY, startM - 1, 1);
      const diff = (currY - startY) * 12 + (currM - startM);

      if (diff >= 0 && diff <= 12) {
        for (let i = 0; i <= diff; i++) {
          const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else if (earliestActivity && earliestActivity <= currentMonth) {
        const [actY, actM] = earliestActivity.split('-').map(Number);
        const actDateObj = new Date(actY, actM - 1, 1);
        const actDiff = (currY - actY) * 12 + (currM - actM);
        for (let i = 0; i <= actDiff; i++) {
          const d = new Date(actDateObj.getFullYear(), actDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else {
        // Fallback: at least last 3 months
        for (let i = 0; i < 3; i++) {
          const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
          monthsSet.add(getMonthKey(d));
        }
      }
    } else if (earliestActivity && earliestActivity <= currentMonth) {
      const [actY, actM] = earliestActivity.split('-').map(Number);
      const actDateObj = new Date(actY, actM - 1, 1);
      const actDiff = (currY - actY) * 12 + (currM - actM);
      for (let i = 0; i <= actDiff; i++) {
        const d = new Date(actDateObj.getFullYear(), actDateObj.getMonth() + i, 1);
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
    // Consolidated Property Mode
    const leasesWithStart = (rental.leases || []).filter((l) => Boolean(l.leaseStartDate));
    if (leasesWithStart.length > 0) {
      const sortedStartKeys = leasesWithStart
        .map((l) => getMonthKey(l.leaseStartDate))
        .sort();
      const earliestStartKey = sortedStartKeys[0];
      const [startY, startM] = earliestStartKey.split('-').map(Number);
      const startDateObj = new Date(startY, startM - 1, 1);
      const diff = (currY - startY) * 12 + (currM - startM);

      if (diff >= 0 && diff <= 12) {
        for (let i = 0; i <= diff; i++) {
          const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else if (earliestActivity && earliestActivity <= currentMonth) {
        const [actY, actM] = earliestActivity.split('-').map(Number);
        const actDateObj = new Date(actY, actM - 1, 1);
        const actDiff = (currY - actY) * 12 + (currM - actM);
        for (let i = 0; i <= actDiff; i++) {
          const d = new Date(actDateObj.getFullYear(), actDateObj.getMonth() + i, 1);
          monthsSet.add(getMonthKey(d));
        }
      } else {
        // Fallback: last 3 months
        for (let i = 0; i < 3; i++) {
          const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
          monthsSet.add(getMonthKey(d));
        }
      }
    } else if (earliestActivity && earliestActivity <= currentMonth) {
      const [actY, actM] = earliestActivity.split('-').map(Number);
      const actDateObj = new Date(actY, actM - 1, 1);
      const actDiff = (currY - actY) * 12 + (currM - actM);
      for (let i = 0; i <= actDiff; i++) {
        const d = new Date(actDateObj.getFullYear(), actDateObj.getMonth() + i, 1);
        monthsSet.add(getMonthKey(d));
      }
    } else {
      // Fallback: last 3 months
      for (let i = 0; i < 3; i++) {
        const d = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
        monthsSet.add(getMonthKey(d));
      }
    }
  }

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

    // 3. Payments Received & Write-Offs Applied
    const relevantPayments = payments.filter((p) => {
      if (targetLease) {
        if (p.leaseId) return p.leaseId === targetLease.id;
        return (rental.leases || []).length <= 1;
      }
      return true;
    });

    const allocatedPayments: { payment: TenantPaymentRecord; allocatedAmountZAR: number }[] = [];
    relevantPayments.forEach((p) => {
      const allocated = getPaymentAllocationForMonth(p, month);
      if (allocated > 0) {
        allocatedPayments.push({
          payment: p,
          allocatedAmountZAR: allocated,
        });
      }
    });

    const paymentsReceived = Math.round(
      allocatedPayments.reduce((sum, item) => sum + item.allocatedAmountZAR, 0) * 100
    ) / 100;

    const relevantWriteOffs = (rental.arrearsWriteOffs || []).filter((w) => {
      if (targetLease) {
        if (w.leaseId) return w.leaseId === targetLease.id;
        return (rental.leases || []).length <= 1;
      }
      return true;
    });

    const allocatedWriteOffs: { writeOff: ArrearsWriteOff; allocatedAmountZAR: number }[] = [];
    relevantWriteOffs.forEach((w) => {
      const allocated = getWriteOffAllocationForMonth(w, month);
      if (allocated > 0) {
        allocatedWriteOffs.push({
          writeOff: w,
          allocatedAmountZAR: allocated,
        });
      }
    });

    const writeOffsApplied = Math.round(
      allocatedWriteOffs.reduce((sum, item) => sum + item.allocatedAmountZAR, 0) * 100
    ) / 100;

    const totalCovered = Math.round((paymentsReceived + writeOffsApplied) * 100) / 100;
    const netVariance = Math.round((totalBilled - totalCovered) * 100) / 100;

    let status: MonthLedgerItem['status'] = 'Unpaid';
    if (totalCovered >= totalBilled && totalBilled > 0) {
      status = totalCovered > totalBilled ? 'Overpaid' : 'Paid in Full';
    } else if (totalCovered > 0) {
      status = 'Partial';
    } else if (totalBilled === 0 && totalCovered === 0) {
      status = 'Paid in Full';
    }

    return {
      month,
      monthLabel: formatMonthLabel(month),
      baseRent,
      utilitiesBilled,
      totalBilled,
      paymentsReceived,
      writeOffsApplied,
      netVariance,
      status,
      payments: allocatedPayments.map((ap) => ap.payment),
      allocatedPayments,
      writeOffs: allocatedWriteOffs.map((aw) => aw.writeOff),
      allocatedWriteOffs,
      utilityStatements: matchingStmts,
      leaseId: targetLease?.id,
    };
  });
}

/**
 * Automatically allocates a payment or write-off amount across unpaid months,
 * starting with the oldest unpaid month.
 * Any excess beyond total debt is marked as a credit allocated to the next billing month.
 */
export function allocateOldestFirst(
  amountToAllocate: number,
  unpaidMonths: { month: string; unpaidAmountZAR: number }[],
  fallbackNextMonth?: string
): PaymentAllocation[];
export function allocateOldestFirst(
  unpaidMonths: { month: string; unpaidAmountZAR: number }[],
  amountToAllocate: number,
  fallbackNextMonth?: string
): PaymentAllocation[];
export function allocateOldestFirst(
  arg1: number | { month: string; unpaidAmountZAR: number }[],
  arg2: number | { month: string; unpaidAmountZAR: number }[],
  fallbackNextMonth?: string
): PaymentAllocation[] {
  let amountToAllocate: number;
  let unpaidMonths: { month: string; unpaidAmountZAR: number }[];

  if (typeof arg1 === 'number') {
    amountToAllocate = arg1;
    unpaidMonths = Array.isArray(arg2) ? arg2 : [];
  } else {
    unpaidMonths = Array.isArray(arg1) ? arg1 : [];
    amountToAllocate = typeof arg2 === 'number' ? arg2 : 0;
  }

  let remaining = Math.round(amountToAllocate * 100) / 100;
  const allocations: PaymentAllocation[] = [];
  const safeUnpaid = Array.isArray(unpaidMonths) ? unpaidMonths : [];

  for (const item of safeUnpaid) {
    if (remaining <= 0) break;
    if (item.unpaidAmountZAR <= 0) continue;

    const allocAmount = Math.min(remaining, item.unpaidAmountZAR);
    allocations.push({
      periodMonth: item.month,
      amountZAR: Math.round(allocAmount * 100) / 100,
    });
    remaining = Math.round((remaining - allocAmount) * 100) / 100;
  }

  // Any excess beyond debt is marked as a credit allocated to the next billing month
  if (remaining > 0) {
    const lastUnpaidMonth = safeUnpaid[safeUnpaid.length - 1]?.month;
    const nextMonth =
      fallbackNextMonth ||
      (lastUnpaidMonth ? getNextMonthKey(lastUnpaidMonth) : getNextMonthKey(getMonthKey()));
    const existing = allocations.find((a) => a.periodMonth === nextMonth);
    if (existing) {
      existing.amountZAR = Math.round((existing.amountZAR + remaining) * 100) / 100;
    } else {
      allocations.push({
        periodMonth: nextMonth,
        amountZAR: remaining,
      });
    }
  }

  return allocations;
}

/**
 * Returns unpaid ledger months (netVariance > 0) in chronological order for allocation.
 */
export function getUnpaidLedgerMonths(
  rental: RentalProperty,
  options?: ArrearsOptions
): { month: string; unpaidAmountZAR: number }[] {
  const ledger = calculateMonthlyLedger(rental, undefined, options);
  return ledger
    .filter((item) => item.netVariance > 0)
    .map((item) => ({
      month: item.month,
      unpaidAmountZAR: item.netVariance,
    }));
}

/**
 * Idempotently converts any legacy negative opening balance into an audited ArrearsWriteOff record
 * allocated oldest-unpaid-month-first and resets the opening balance to 0.
 */
export function migrateNegativeArrearsToRental(rental: RentalProperty): RentalProperty {
  let modified = false;
  let arrearsOpeningBalanceZAR = rental.arrearsOpeningBalanceZAR;
  let arrearsWriteOffs = [...(rental.arrearsWriteOffs || [])];
  let leases = rental.leases ? [...rental.leases] : [];

  // 1. Check leases for negative opening balance
  if (leases.length > 0) {
    leases = leases.map((lease) => {
      if (typeof lease.arrearsOpeningBalanceZAR === 'number' && lease.arrearsOpeningBalanceZAR < 0) {
        modified = true;
        const negativeAmount = Math.abs(lease.arrearsOpeningBalanceZAR);
        const unpaid = getUnpaidLedgerMonths(
          { ...rental, arrearsWriteOffs },
          { leaseId: lease.id }
        );
        const allocations = allocateOldestFirst(negativeAmount, unpaid);
        const writeOff: ArrearsWriteOff = {
          id: `woff-legacy-${rental.id}-${lease.id}`,
          leaseId: lease.id,
          date: new Date().toISOString().split('T')[0],
          amountZAR: negativeAmount,
          reason: 'Other',
          notes: 'Converted from Clear Arrears',
          allocations,
          createdAt: new Date().toISOString(),
        };
        arrearsWriteOffs = [writeOff, ...arrearsWriteOffs];
        return {
          ...lease,
          arrearsOpeningBalanceZAR: 0,
        };
      }
      return lease;
    });
  }

  // 2. Check property-level negative opening balance
  if (typeof arrearsOpeningBalanceZAR === 'number' && arrearsOpeningBalanceZAR < 0) {
    modified = true;
    const negativeAmount = Math.abs(arrearsOpeningBalanceZAR);
    const targetLeaseId = leases.length === 1 ? leases[0].id : undefined;
    const unpaid = getUnpaidLedgerMonths(
      { ...rental, arrearsWriteOffs, leases },
      targetLeaseId ? { leaseId: targetLeaseId } : undefined
    );
    const allocations = allocateOldestFirst(negativeAmount, unpaid);
    const writeOff: ArrearsWriteOff = {
      id: `woff-legacy-${rental.id}`,
      leaseId: targetLeaseId,
      date: new Date().toISOString().split('T')[0],
      amountZAR: negativeAmount,
      reason: 'Other',
      notes: 'Converted from Clear Arrears',
      allocations,
      createdAt: new Date().toISOString(),
    };
    arrearsWriteOffs = [writeOff, ...arrearsWriteOffs];
    arrearsOpeningBalanceZAR = 0;
  }

  if (!modified) {
    return rental;
  }

  const updatedRental: RentalProperty = {
    ...rental,
    arrearsOpeningBalanceZAR,
    arrearsWriteOffs,
    leases,
  };

  const finalizedLeases = (updatedRental.leases || []).map((l) => {
    const leaseArrears = calculatePropertyArrears(updatedRental, undefined, { leaseId: l.id });
    return {
      ...l,
      unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
    };
  });
  const propertyArrears = calculatePropertyArrears({ ...updatedRental, leases: finalizedLeases });

  return {
    ...updatedRental,
    leases: finalizedLeases,
    unpaidUtilityArrearsZAR: Math.max(0, propertyArrears.totalArrearsZAR),
  };
}

/**
 * Computes Total Arrears according to the formula:
 * Arrears = arrearsOpeningBalanceZAR + sum(Billed Charges) - sum(Payments Received) - sum(Write-Offs)
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

  const relevantWriteOffs = (rental.arrearsWriteOffs || []).filter((w) => {
    if (targetLease) {
      if (w.leaseId) return w.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const totalWriteOffsZAR = relevantWriteOffs.reduce(
    (sum, w) => sum + (w.amountZAR || 0),
    0
  );

  const totalArrearsZAR =
    Math.round(
      (openingBalanceZAR + totalBilledChargesZAR - totalPaymentsReceivedZAR - totalWriteOffsZAR) * 100
    ) / 100;

  const currentMonthItem =
    ledger.find((item) => item.month === currentMonth) || {
      month: currentMonth,
      monthLabel: formatMonthLabel(currentMonth),
      baseRent: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      utilitiesBilled: 0,
      totalBilled: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      paymentsReceived: 0,
      writeOffsApplied: 0,
      netVariance: targetLease ? (targetLease.monthlyRentZAR || 0) : getBaseRentForRental(rental),
      status: 'Unpaid' as const,
      payments: [],
      allocatedPayments: [],
      writeOffs: [],
      allocatedWriteOffs: [],
      utilityStatements: [],
      leaseId: targetLease?.id,
    };

  return {
    openingBalanceZAR,
    totalBilledChargesZAR,
    totalPaymentsReceivedZAR,
    totalWriteOffsZAR,
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
 * targetArrears = openingBalance + sum(Billed Charges) - sum(Payments Received) - sum(Write-Offs)
 * => newOpeningBalance = targetArrears - sum(Billed Charges) + sum(Payments Received) + sum(Write-Offs)
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

  const relevantWriteOffs = (rental.arrearsWriteOffs || []).filter((w) => {
    if (targetLease) {
      if (w.leaseId) return w.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const totalWriteOffs = relevantWriteOffs.reduce(
    (sum, w) => sum + (w.amountZAR || 0),
    0
  );

  const reconciled = targetArrears - totalBilled + totalPayments + totalWriteOffs;
  return Math.round(reconciled * 100) / 100;
}

/**
 * Computes 4-tier statement values for any selected statement period:
 * 1. Balance Brought Forward (Opening balance + prior billed charges - prior payments - prior write-offs)
 * 2. Current Period Charges (Base rent + itemized utilities)
 * 3. Less: Payments Received & Credits for the period
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

  const priorPayments = relevantPayments.reduce((sum, p) => {
    if (p.allocations && p.allocations.length > 0) {
      const priorAlloc = p.allocations
        .filter((a) => a.periodMonth < periodMonth)
        .reduce((s, a) => s + a.amountZAR, 0);
      return sum + priorAlloc;
    }
    const pm = p.periodMonth || getMonthKey(p.paymentDate);
    return pm < periodMonth ? sum + (p.amountReceivedZAR || 0) : sum;
  }, 0);

  // Write-offs strictly before this period
  const relevantWriteOffs = (rental.arrearsWriteOffs || []).filter((w) => {
    if (targetLease) {
      if (w.leaseId) return w.leaseId === targetLease.id;
      return (rental.leases || []).length <= 1;
    }
    return true;
  });

  const priorWriteOffs = relevantWriteOffs.reduce((sum, w) => {
    if (w.allocations && w.allocations.length > 0) {
      const priorAlloc = w.allocations
        .filter((a) => a.periodMonth < periodMonth)
        .reduce((s, a) => s + a.amountZAR, 0);
      return sum + priorAlloc;
    }
    const wm = getMonthKey(w.date);
    return wm < periodMonth ? sum + (w.amountZAR || 0) : sum;
  }, 0);

  const balanceBroughtForward =
    Math.round((openingBalanceZAR + priorCharges - priorPayments - priorWriteOffs) * 100) / 100;

  const currentItem = ledger.find((item) => item.month === periodMonth);
  const currentCharges = currentItem ? currentItem.totalBilled : (targetLease?.monthlyRentZAR || 0);

  const periodPayments = currentItem ? currentItem.payments : [];
  const periodAllocatedPayments = currentItem ? currentItem.allocatedPayments : [];
  const periodPaymentsTotal = currentItem ? currentItem.paymentsReceived : 0;

  const periodWriteOffs = currentItem ? currentItem.writeOffs : [];
  const periodAllocatedWriteOffs = currentItem ? currentItem.allocatedWriteOffs : [];
  const periodWriteOffsTotal = currentItem ? currentItem.writeOffsApplied : 0;

  const totalAmountDue =
    Math.round(
      (balanceBroughtForward + currentCharges - periodPaymentsTotal - periodWriteOffsTotal) * 100
    ) / 100;

  const priorUnpaidMonths = ledger
    .filter((item) => item.month < periodMonth && item.netVariance > 0)
    .map((item) => {
      const [y, m] = item.month.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      const shortLabel = d.toLocaleDateString('en-ZA', { month: 'short' });
      return {
        month: item.month,
        monthLabel: item.monthLabel,
        shortLabel,
        netVariance: item.netVariance,
      };
    });

  return {
    balanceBroughtForward,
    priorCharges,
    priorPayments,
    priorWriteOffs,
    priorUnpaidMonths,
    currentCharges,
    periodPayments,
    periodAllocatedPayments,
    periodPaymentsTotal,
    periodWriteOffs,
    periodAllocatedWriteOffs,
    periodWriteOffsTotal,
    totalAmountDue,
    currentItem,
    targetLease,
  };
}

export interface StatementPeriodOption {
  month: string; // '2026-10'
  label: string; // 'October 2026 (Current - Due: R 111 000)'
  monthLabel: string; // 'October 2026'
  isCurrent: boolean;
  totalDue: number;
  status: MonthLedgerItem['status'];
  hasUtilityStatement: boolean;
}

/**
 * Returns billing period options for the property ledger in descending chronological order
 * (latest month first, e.g. October 2026 (Current - Due: R 111 000), September 2026 (Unpaid), ..., April 2026 (Paid in Full ✓))
 */
export function getStatementLedgerOptions(
  rental: RentalProperty,
  options?: ArrearsOptions
): StatementPeriodOption[] {
  const currentMonth = getMonthKey();
  const ledger = calculateMonthlyLedger(rental, undefined, options);

  if (ledger.length === 0) {
    return [
      {
        month: currentMonth,
        label: `${formatMonthLabel(currentMonth)} (Current)`,
        monthLabel: formatMonthLabel(currentMonth),
        isCurrent: true,
        totalDue: 0,
        status: 'Unpaid',
        hasUtilityStatement: false,
      },
    ];
  }

  // Reverse so latest months are first (descending)
  const reversedLedger = [...ledger].reverse();

  return reversedLedger.map((item) => {
    const isCurrent = item.month === currentMonth;
    const hasUtilityStatement = (rental.utilityStatements || []).some(
      (s) => s.statementDate && s.statementDate.startsWith(item.month)
    );

    // Compute live 4-tier total due for this month
    const tiers = calculateTenantStatementTiers(rental, item.month, options);
    const totalDue = tiers.totalAmountDue;

    let suffix = '';
    if (isCurrent) {
      if (totalDue > 0) {
        suffix = ` (Current - Due: ${formatZAR(totalDue)})`;
      } else {
        suffix = ` (Current - Paid in Full ✓)`;
      }
    } else if (item.month > currentMonth) {
      suffix = ' (Upcoming)';
    } else {
      if (item.status === 'Paid in Full') {
        suffix = ' (Paid in Full ✓)';
      } else if (item.status === 'Unpaid') {
        suffix = ' (Unpaid)';
      } else if (item.status === 'Partial') {
        suffix = ` (Partial - Due: ${formatZAR(item.netVariance)})`;
      } else if (item.status === 'Overpaid') {
        suffix = ' (Overpaid)';
      }
    }

    return {
      month: item.month,
      label: `${item.monthLabel}${suffix}`,
      monthLabel: item.monthLabel,
      isCurrent,
      totalDue,
      status: item.status,
      hasUtilityStatement,
    };
  });
}

export interface ParsedDateParts {
  year: number;
  month: number;
  day: number;
  isoDate: string; // YYYY-MM-DD
  timestamp: number; // UTC ms
}

/**
 * Normalizes and parses various date string formats into standard year, month, day,
 * standardized ISO YYYY-MM-DD date, and UTC timestamp.
 * Handles ISO (YYYY-MM-DD), slash-delimited (YYYY/MM/DD), South African (DD/MM/YYYY, DD-MM-YYYY),
 * Month Year ("April 2026"), and standard date strings.
 */
export function parseDateParts(dateStr?: string | null): ParsedDateParts | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD (optional trailing time or day)
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = ymdMatch[3] ? parseInt(ymdMatch[3], 10) : 1;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        year,
        month,
        day,
        isoDate,
        timestamp: Date.UTC(year, month - 1, day),
      };
    }
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY (common South African format)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        year,
        month,
        day,
        isoDate,
        timestamp: Date.UTC(year, month - 1, day),
      };
    }
  }

  // 3. Check "Month Year" format e.g. "April 2026" or "Apr 2026"
  const parsedMonthYear = Date.parse(`1 ${trimmed} UTC`);
  if (!isNaN(parsedMonthYear)) {
    const d = new Date(parsedMonthYear);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = 1;
    const isoDate = `${year}-${String(month).padStart(2, '0')}-01`;
    return {
      year,
      month,
      day,
      isoDate,
      timestamp: Date.UTC(year, month - 1, 1),
    };
  }

  // 4. Standard Date.parse fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      year,
      month,
      day,
      isoDate,
      timestamp: Date.UTC(year, month - 1, day),
    };
  }

  return null;
}

/**
 * Calculates remaining lease term relative to a billing period or date.
 * E.g., "4 Months", "1 Month 12 Days", "28 Days", or "Expired (Month-to-Month)".
 */
export function calculateRemainingLeaseTerm(
  billingPeriodOrDate: string,
  leaseEndDate?: string
): string {
  if (!leaseEndDate || !leaseEndDate.trim()) {
    return 'Expired (Month-to-Month)';
  }

  const endParts = parseDateParts(leaseEndDate);
  if (!endParts) {
    return 'Expired (Month-to-Month)';
  }

  const startParts =
    parseDateParts(billingPeriodOrDate) ||
    parseDateParts(new Date().toISOString());
  if (!startParts) {
    return 'Expired (Month-to-Month)';
  }

  const startDate = new Date(startParts.timestamp);
  const endDate = new Date(endParts.timestamp);

  if (endDate.getTime() < startDate.getTime()) {
    return 'Expired (Month-to-Month)';
  }

  // Check if end date is the last calendar day of that month
  const lastDayOfEndMonth = new Date(Date.UTC(endParts.year, endParts.month, 0)).getUTCDate();
  const isEndOfMonth = endParts.day === lastDayOfEndMonth;

  // Calendar month boundary alignment (e.g. 2026-04-01 to 2026-07-31 = 4 Months)
  if (startParts.day === 1 && isEndOfMonth) {
    const totalMonths = (endParts.year - startParts.year) * 12 + (endParts.month - startParts.month) + 1;
    if (totalMonths <= 0) return 'Expired (Month-to-Month)';
    if (totalMonths === 1) return '1 Month';
    return `${totalMonths} Months`;
  }

  // Difference in calendar days
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Expired (Month-to-Month)';
  }

  if (diffDays < 30) {
    return `${diffDays} Day${diffDays === 1 ? '' : 's'}`;
  }

  // Multi-month breakdown
  let months = (endParts.year - startParts.year) * 12 + (endParts.month - startParts.month);
  let days = endParts.day - startParts.day;

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(Date.UTC(endParts.year, endParts.month - 1, 0)).getUTCDate();
    days += prevMonthDays;
  }

  if (months <= 0 && days > 0) {
    return `${days} Day${days === 1 ? '' : 's'}`;
  }

  if (months > 0 && days === 0) {
    return `${months} Month${months === 1 ? '' : 's'}`;
  }

  if (months > 0 && days > 0) {
    return `${months} Month${months === 1 ? '' : 's'} ${days} Day${days === 1 ? '' : 's'}`;
  }

  return 'Expired (Month-to-Month)';
}

