'use client';

import React, { useState } from 'react';
import { RentalProperty, TenantPaymentRecord, InvestorProfile } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';
import {
  formatTenantAccountStatementForWhatsApp,
  formatTenantPaymentReceiptForWhatsApp,
} from '@/lib/whatsappFormatter';
import {
  Building2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  Coins,
  MinusCircle,
  History,
  MessageCircle,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react';

export interface RentalPaymentsTabProps {
  property: RentalProperty;
  onOpenLogPayment: (
    targetMonth?: string,
    suggestedAmount?: number,
    leaseId?: string,
    isArrears?: boolean
  ) => void;
  onOpenEditPayment: (payment: TenantPaymentRecord) => void;
  onOpenWriteOff: (suggestedAmount?: number, leaseId?: string) => void;
  onOpenStatementModal: () => void;
  onUpdateOpeningBalance: (amount: number, leaseId?: string) => void;
  onDeletePayment: (paymentId: string, amount: number, date: string) => void;
  onDeleteWriteOff: (writeOffId: string, amount: number, date: string) => void;
  onMarkMonthPaid: (month: string, amountDue: number, leaseId?: string) => void;
  onShowToast: (message: string) => void;
  investorProfile?: InvestorProfile;
}

export function RentalPaymentsTab({
  property,
  onOpenLogPayment,
  onOpenEditPayment,
  onOpenWriteOff,
  onOpenStatementModal,
  onUpdateOpeningBalance,
  onDeletePayment,
  onDeleteWriteOff,
  onMarkMonthPaid,
  onShowToast,
  investorProfile,
}: RentalPaymentsTabProps) {
  const [activeTenantTab, setActiveTenantTab] = useState<string>('all');

  const activeTenantLease =
    activeTenantTab !== 'all'
      ? (property.leases || []).find((l) => l.id === activeTenantTab)
      : undefined;

  const currentTabArrearsInfo = calculatePropertyArrears(
    property,
    undefined,
    activeTenantLease ? { leaseId: activeTenantLease.id } : undefined
  );

  return (
    <div className="p-4 space-y-4 bg-white text-xs">
      {/* 1. Tenant / Unit Selector Pill Bar (Consolidated + Individual Leases) */}
      {property.leases && property.leases.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
          <button
            type="button"
            data-testid={`tenant-tab-all-${property.id}`}
            onClick={() => setActiveTenantTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTenantTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All Units (Consolidated)</span>
            {property.unpaidUtilityArrearsZAR && property.unpaidUtilityArrearsZAR > 0 ? (
              <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                -{formatZAR(property.unpaidUtilityArrearsZAR, { compact: true })}
              </span>
            ) : null}
          </button>

          {property.leases.map((lease) => {
            const isSelected = activeTenantTab === lease.id;
            const leaseArrears = lease.unpaidUtilityArrearsZAR || 0;
            return (
              <button
                key={lease.id}
                type="button"
                data-testid={`tenant-tab-${lease.id}`}
                onClick={() => setActiveTenantTab(lease.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{lease.unitName}: {lease.tenantName}</span>
                {leaseArrears > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    -{formatZAR(leaseArrears, { compact: true })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Current Month Status Banner */}
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          currentTabArrearsInfo.currentMonthStatus === 'Paid in Full'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : currentTabArrearsInfo.currentMonthStatus === 'Overpaid'
            ? 'bg-teal-50/80 border-teal-200 text-teal-950'
            : currentTabArrearsInfo.currentMonthStatus === 'Partial'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-rose-50/90 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs uppercase tracking-wider">
              {currentTabArrearsInfo.currentMonthItem.monthLabel}
            </span>

            {activeTenantLease ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                <UserCheck className="w-3 h-3 text-emerald-700" />
                {activeTenantLease.unitName} ({activeTenantLease.tenantName})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                <Building2 className="w-3 h-3 text-slate-600" />
                Consolidated ({property.leases?.length || 0} Units)
              </span>
            )}

            {currentTabArrearsInfo.currentMonthStatus === 'Paid in Full' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Paid in Full
              </span>
            )}
            {currentTabArrearsInfo.currentMonthStatus === 'Overpaid' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                Overpaid (+{formatZAR(Math.abs(currentTabArrearsInfo.currentMonthItem.netVariance))})
              </span>
            )}
            {currentTabArrearsInfo.currentMonthStatus === 'Partial' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Partial ({formatZAR(currentTabArrearsInfo.currentMonthDueZAR)} due)
              </span>
            )}
            {currentTabArrearsInfo.currentMonthStatus === 'Unpaid' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Unpaid (Due 1st: {formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {currentTabArrearsInfo.currentMonthDueZAR > 0 && (
              <button
                type="button"
                onClick={() => {
                  onMarkMonthPaid(
                    currentTabArrearsInfo.currentMonth,
                    currentTabArrearsInfo.currentMonthDueZAR,
                    activeTenantLease?.id
                  );
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition-colors cursor-pointer"
                title="1-Click: Mark month as Paid in Full"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Mark Month as Paid ({formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onOpenLogPayment(
                  currentTabArrearsInfo.currentMonth,
                  currentTabArrearsInfo.currentMonthDueZAR > 0
                    ? currentTabArrearsInfo.currentMonthDueZAR
                    : currentTabArrearsInfo.currentMonthBilledZAR,
                  activeTenantLease?.id
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded shadow-2xs transition-colors cursor-pointer"
              title="Log a tenant payment for this property"
            >
              <PlusCircle className="w-3 h-3 text-emerald-600" />
              <span>+ Log Payment</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
          <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
            <span className="text-[10px] text-slate-500 block">Total Billed</span>
            <span className="font-bold text-slate-900 font-mono">
              {formatZAR(currentTabArrearsInfo.currentMonthBilledZAR)}
            </span>
            <span className="text-[9px] text-slate-400 block">
              Rent {formatZAR(currentTabArrearsInfo.currentMonthItem.baseRent)} + Util {formatZAR(currentTabArrearsInfo.currentMonthItem.utilitiesBilled)}
            </span>
          </div>
          <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
            <span className="text-[10px] text-slate-500 block">Payments Received</span>
            <span className="font-bold text-emerald-700 font-mono">
              {formatZAR(currentTabArrearsInfo.currentMonthPaidZAR)}
            </span>
            <span className="text-[9px] text-slate-400 block">
              {currentTabArrearsInfo.currentMonthItem.payments.length} payment(s)
            </span>
          </div>
          <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
            <span className="text-[10px] text-slate-500 block">Period Variance</span>
            <span
              className={`font-bold font-mono ${
                currentTabArrearsInfo.currentMonthItem.netVariance > 0
                  ? 'text-rose-700'
                  : currentTabArrearsInfo.currentMonthItem.netVariance < 0
                  ? 'text-teal-700'
                  : 'text-emerald-700'
              }`}
            >
              {currentTabArrearsInfo.currentMonthItem.netVariance > 0
                ? `${formatZAR(currentTabArrearsInfo.currentMonthItem.netVariance)} Due`
                : currentTabArrearsInfo.currentMonthItem.netVariance < 0
                ? `-${formatZAR(Math.abs(currentTabArrearsInfo.currentMonthItem.netVariance))} Credit`
                : 'R 0.00'}
            </span>
            <span className="text-[9px] text-slate-400 block">
              Due 1st of month
            </span>
          </div>
        </div>

        {/* Multi-Tenant Unit Breakdown Roster in Consolidated View */}
        {activeTenantTab === 'all' && (property.leases || []).length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Tenant Unit Breakdown (This Month)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(property.leases || []).map((lease) => {
                const leaseArrears = calculatePropertyArrears(property, undefined, { leaseId: lease.id });
                const status = leaseArrears.currentMonthStatus;
                return (
                  <div
                    key={lease.id}
                    className="p-2 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {lease.unitName}: {lease.tenantName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Rent: {formatZAR(lease.monthlyRentZAR)}/m • Total Arrears: <strong className={leaseArrears.totalArrearsZAR > 0 ? 'text-rose-700' : 'text-emerald-700'}>{formatZAR(leaseArrears.totalArrearsZAR)}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          status === 'Paid in Full'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : status === 'Partial'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTenantTab(lease.id)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                      >
                        View Tab →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Arrears Balance Box with Live Reconciliation */}
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          currentTabArrearsInfo.totalArrearsZAR > 0
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider">
              {activeTenantLease ? `${activeTenantLease.unitName} Arrears Balance` : 'Total Arrears Balance (All Units)'}
            </span>
            {currentTabArrearsInfo.totalArrearsZAR > 0 ? (
              <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                ⚠️ Arrears Outstanding
              </span>
            ) : currentTabArrearsInfo.totalArrearsZAR < 0 ? (
              <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded font-bold">
                In Credit
              </span>
            ) : (
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                ✓ Account Paid Up
              </span>
            )}
          </div>
          <span className="font-mono font-black text-sm text-slate-900">
            {currentTabArrearsInfo.totalArrearsZAR > 0
              ? formatZAR(currentTabArrearsInfo.totalArrearsZAR)
              : currentTabArrearsInfo.totalArrearsZAR < 0
              ? `-${formatZAR(Math.abs(currentTabArrearsInfo.totalArrearsZAR))}`
              : 'R 0.00'}
          </span>
        </div>

        <p className="text-[10px] text-slate-500 font-mono bg-white/60 p-1.5 rounded border border-slate-200/50">
          Opening Balance ({formatZAR(currentTabArrearsInfo.openingBalanceZAR)}) + Billed Charges ({formatZAR(currentTabArrearsInfo.totalBilledChargesZAR)}) - Payments ({formatZAR(currentTabArrearsInfo.totalPaymentsReceivedZAR)}) {currentTabArrearsInfo.totalWriteOffsZAR > 0 ? `- Write-offs (${formatZAR(currentTabArrearsInfo.totalWriteOffsZAR)}) ` : ''}= <strong className="text-slate-900">{formatZAR(currentTabArrearsInfo.totalArrearsZAR)}</strong>
        </p>

        {/* Opening Balance & Action Controls */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
            <span className="text-[10px] text-slate-600 font-semibold" title="Historical debt from before system tracking. Edit directly (>= 0).">
              Opening Balance (debt from before tracking):
            </span>
            <div className="relative flex-1 max-w-[120px]">
              <span className="absolute left-2.5 top-1 text-xs text-slate-400 font-bold">R</span>
              <input
                type="number"
                step="any"
                min="0"
                key={`${property.id}-${activeTenantTab}-ob-${currentTabArrearsInfo.openingBalanceZAR}`}
                defaultValue={currentTabArrearsInfo.openingBalanceZAR}
                onBlur={(e) => {
                  const targetVal = Math.max(0, Number(e.target.value) || 0);
                  if (targetVal !== currentTabArrearsInfo.openingBalanceZAR) {
                    onUpdateOpeningBalance(targetVal, activeTenantLease?.id);
                    onShowToast(
                      activeTenantLease
                        ? `${activeTenantLease.unitName} opening balance updated to ${formatZAR(targetVal)}`
                        : `Opening balance updated to ${formatZAR(targetVal)}`
                    );
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full pl-6 pr-2 py-0.5 text-xs font-mono font-bold bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                title="Opening balance from before tracking. Direct edit (>= 0)."
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {currentTabArrearsInfo.totalArrearsZAR > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onOpenLogPayment(
                      undefined,
                      currentTabArrearsInfo.totalArrearsZAR,
                      activeTenantLease?.id,
                      true
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer shadow-2xs"
                  title="Receive payment towards accumulated arrears (allocated oldest-unpaid-month-first)"
                >
                  <Coins className="w-3 h-3" />
                  <span>Receive Arrears Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenWriteOff(
                      currentTabArrearsInfo.totalArrearsZAR,
                      activeTenantLease?.id
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shadow-2xs"
                  title="Write off uncollectable arrears with audit reason and tax deduction"
                >
                  <MinusCircle className="w-3 h-3 text-rose-500" />
                  <span>Write Off</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Historical Billing & Payment Ledger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800 text-xs">
              {activeTenantLease ? `${activeTenantLease.unitName} Billing & Payment Ledger` : 'Billing & Payment Ledger (All Units)'}
            </span>
            <span className="text-[10px] text-slate-400">
              ({currentTabArrearsInfo.ledger.length} months)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={async () => {
                const stmt = formatTenantAccountStatementForWhatsApp(property, {
                  leaseId: activeTenantLease?.id,
                  investorProfile,
                });
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(stmt);
                }
                onShowToast('WhatsApp Statement copied to clipboard!');
              }}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
              title="Copy 4-tier account statement ready for WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-emerald-600" />
              <span>WhatsApp Statement</span>
            </button>
            <button
              type="button"
              onClick={onOpenStatementModal}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors cursor-pointer"
              title="Open interactive tenant statement modal"
            >
              <FileText className="w-3 h-3 text-teal-600" />
              <span>Statement Viewer</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {[...currentTabArrearsInfo.ledger].reverse().map((item) => (
            <div
              key={item.month}
              className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">
                    {item.monthLabel}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      item.status === 'Paid in Full'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : item.status === 'Overpaid'
                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                        : item.status === 'Partial'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">
                    Billed: <strong className="text-slate-800 font-mono">{formatZAR(item.totalBilled)}</strong>
                  </span>
                  <span className="text-slate-500">
                    Paid: <strong className="text-emerald-700 font-mono">{formatZAR(item.paymentsReceived)}</strong>
                  </span>
                  {item.writeOffsApplied > 0 && (
                    <span className="text-slate-500">
                      Written off: <strong className="text-slate-600 font-mono">-{formatZAR(item.writeOffsApplied)}</strong>
                    </span>
                  )}
                  <span
                    className={`font-mono font-bold ${
                      item.netVariance > 0
                        ? 'text-rose-700'
                        : item.netVariance < 0
                        ? 'text-teal-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.netVariance > 0
                      ? `+${formatZAR(item.netVariance)}`
                      : item.netVariance < 0
                      ? `-${formatZAR(Math.abs(item.netVariance))}`
                      : 'R 0'}
                  </span>
                </div>
              </div>

              {/* Itemized Payments for this month */}
              {item.allocatedPayments && item.allocatedPayments.length > 0 ? (
                <div className="space-y-1 pt-1 border-t border-slate-200/60">
                  {item.allocatedPayments.map(({ payment: p, allocatedAmountZAR }) => {
                    const paymentLease = (property.leases || []).find((l) => l.id === p.leaseId);
                    const isDeposit = p.paymentMethod === 'Deposit Applied';
                    return (
                      <div
                        key={`${p.id}-${item.month}`}
                        className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700">
                            {formatDate(p.paymentDate)}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            isDeposit
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {isDeposit ? 'Deposit Applied' : p.paymentMethod}
                          </span>
                          {paymentLease && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {paymentLease.unitName}
                            </span>
                          )}
                          {p.reference && (
                            <span className="text-[10px] text-slate-400">
                              Ref: {p.reference}
                            </span>
                          )}
                          {allocatedAmountZAR < p.amountReceivedZAR && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({formatZAR(allocatedAmountZAR)} of {formatZAR(p.amountReceivedZAR)})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-700">
                            {formatZAR(allocatedAmountZAR)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const receipt = formatTenantPaymentReceiptForWhatsApp(
                                  property,
                                  p,
                                  investorProfile
                                );
                                if (navigator?.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(receipt);
                                }
                                onShowToast(
                                  `WhatsApp Receipt for ${formatZAR(p.amountReceivedZAR)} copied!`
                                );
                              }}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Copy WhatsApp payment receipt"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEditPayment(p)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit payment"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete payment of ${formatZAR(
                                      p.amountReceivedZAR
                                    )} recorded on ${formatDate(p.paymentDate)}?`
                                  )
                                ) {
                                  onDeletePayment(p.id, p.amountReceivedZAR, p.paymentDate);
                                  onShowToast('Payment deleted');
                                }
                              }}
                              className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>No payments recorded for {item.monthLabel}</span>
                </div>
              )}

              {/* Itemized Write-offs for this month */}
              {item.allocatedWriteOffs && item.allocatedWriteOffs.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-200/60">
                  {item.allocatedWriteOffs.map(({ writeOff: w, allocatedAmountZAR }) => (
                    <div
                      key={`woff-${w.id}-${item.month}`}
                      className="flex items-center justify-between bg-slate-100/90 px-2 py-1 rounded border border-slate-200 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-600">
                          {formatDate(w.date)}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 border border-slate-300">
                          Written off ({w.reason})
                        </span>
                        {allocatedAmountZAR < w.amountZAR && (
                          <span className="text-[10px] text-slate-500">
                            ({formatZAR(allocatedAmountZAR)} of {formatZAR(w.amountZAR)})
                          </span>
                        )}
                        {w.notes && (
                          <span className="text-[10px] text-slate-400 italic">
                            {w.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-600">
                          -{formatZAR(allocatedAmountZAR)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete write-off of ${formatZAR(
                                  w.amountZAR
                                )} recorded on ${formatDate(w.date)}? This will restore arrears.`
                              )
                            ) {
                              onDeleteWriteOff(w.id, w.amountZAR, w.date);
                              onShowToast('Write-off deleted and arrears restored');
                            }
                          }}
                          className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete write-off"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-month + Add Payment shortcut */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onOpenLogPayment(
                      item.month,
                      item.netVariance > 0 ? item.netVariance : item.totalBilled,
                      activeTenantLease?.id
                    )
                  }
                  className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline text-[10px] cursor-pointer"
                >
                  + Add Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RentalPaymentsTab;
