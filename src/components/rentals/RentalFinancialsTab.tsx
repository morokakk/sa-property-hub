'use client';

import React from 'react';
import { RentalProperty } from '@/types';
import { RentalTaxCalculationResult } from '@/lib/calculations/rentals';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { InlineEditableAmount } from '@/components/common/InlineEditableAmount';
import {
  UserCheck,
  Calendar,
  ShieldCheck,
  Building2,
  Calculator,
  ArrowUpRight,
  Clock,
  Archive,
  Mail,
  Phone,
  User,
  Check,
} from 'lucide-react';

export interface RentalFinancialsTabProps {
  property: RentalProperty;
  calculatedCashflow: {
    agencyCommissionZAR: number;
    netMonthlyCashflowZAR: number;
    totalGrossIncomeZAR: number;
    ancillaryIncomeZAR: number;
  };
  taxCalculation: RentalTaxCalculationResult;
  investorDefaultTaxType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  onUpdateProperty: (updates: Partial<RentalProperty>) => void;
  onOpenPmtCalculator: () => void;
  onOpenRefinance?: () => void;
  onOpenStatementModal?: () => void;
  onOpenNoticeModal?: (leaseId?: string) => void;
}

export function RentalFinancialsTab({
  property,
  calculatedCashflow,
  taxCalculation,
  investorDefaultTaxType = 'Company (27%)',
  onUpdateProperty,
  onOpenPmtCalculator,
  onOpenNoticeModal,
}: RentalFinancialsTabProps) {
  const [showPastTenants, setShowPastTenants] = React.useState(false);
  const { agencyCommissionZAR, netMonthlyCashflowZAR: netCashflow, ancillaryIncomeZAR } = calculatedCashflow;
  const {
    taxRate,
    taxRateLabel,
    sec13Shield,
    annualTaxZAR,
    monthlyTaxZAR,
    taxSavingsZAR,
    postTaxCashflow,
    yieldPostTax,
  } = taxCalculation;

  const [isOpExExpanded, setIsOpExExpanded] = React.useState(false);

  const isFreehold = property.propertyType === 'Freehold House';
  const monthlyLeviesOrInsurance = isFreehold
    ? Math.round((property.annualBuildingInsuranceZAR || 0) / 12)
    : (property.monthlyLeviesZAR || 0);
  const monthlyRates = property.monthlyRatesTaxesZAR || 0;
  const monthlyAgency = property.managementType === 'Agency' ? agencyCommissionZAR : 0;
  const monthlyMaint = property.monthlyMaintenanceReserveZAR || 0;
  const monthlyVending = property.monthlyPrepaidVendingFeeZAR || 0;
  const monthlyCommunal = property.monthlyCommunalServicesZAR || 0;

  const totalOpEx =
    monthlyLeviesOrInsurance +
    monthlyRates +
    monthlyAgency +
    monthlyMaint +
    monthlyVending +
    monthlyCommunal;

  let opexItemsCount = 3;
  if (property.managementType === 'Agency') opexItemsCount += 1;
  if (monthlyVending > 0) opexItemsCount += 1;
  if (monthlyCommunal > 0) opexItemsCount += 1;

  return (
    <>
      {/* Tenant Lease Details */}
      <div className="p-4 space-y-2 text-xs border-b border-slate-100">
        {(property.leases?.length || 0) > 1 ? (
          <>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Units:
              </span>
              <strong className="text-slate-900">
                {property.leases!.length} Units • {property.leases!.filter((l) => l.status === 'Occupied').length} Occupied • {formatZAR(property.leases!.filter((l) => l.status === 'Occupied').reduce((s, l) => s + l.monthlyRentZAR, 0))}/m
              </strong>
            </div>
            <div className="space-y-2 pt-1">
              {property.leases!.map((l) => (
                <div key={l.id} className="pt-2 border-t border-slate-100 first:border-t-0 first:pt-0 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className={`font-medium ${l.status === 'Occupied' ? 'text-slate-700' : l.status === 'Notice Given' ? 'text-amber-800 font-bold' : 'text-slate-400'}`}>
                        {l.unitName}: {l.tenantName} ({l.status})
                      </span>
                      {l.roomType && (
                        <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          {l.roomType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-slate-900 tabular-nums shrink-0">{formatZAR(l.monthlyRentZAR)}/m</span>
                      {onOpenNoticeModal && (
                        <button
                          type="button"
                          onClick={() => onOpenNoticeModal(l.id)}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                            l.status === 'Notice Given'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="Manage notice or record move-out"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{l.status === 'Notice Given' ? 'Notice' : 'Notice/Exit'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {l.guarantorName && (
                    <div className="flex items-center">
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 max-w-full truncate"
                        title={`Guarantor: ${l.guarantorName}${l.guarantorContact ? ` (${l.guarantorContact})` : ''}`}
                      >
                        <ShieldCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Guarantor: {l.guarantorName}</span>
                        {l.guarantorContact && (
                          l.guarantorContact.includes('@') ? (
                            <a
                              href={`mailto:${l.guarantorContact}`}
                              className="text-indigo-600 hover:text-indigo-900 shrink-0 inline-flex items-center"
                              onClick={(e) => e.stopPropagation()}
                              title={`Email guarantor: ${l.guarantorContact}`}
                            >
                              <Mail className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <a
                              href={`tel:${l.guarantorContact.replace(/\s+/g, '')}`}
                              className="text-indigo-600 hover:text-indigo-900 shrink-0 inline-flex items-center"
                              onClick={(e) => e.stopPropagation()}
                              title={`Call guarantor: ${l.guarantorContact}`}
                            >
                              <Phone className="w-2.5 h-2.5" />
                            </a>
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Tenant:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <strong className="text-slate-900">{property.leases?.[0]?.tenantName}</strong>
                {property.leases?.[0]?.roomType && (
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                    {property.leases[0].roomType}
                  </span>
                )}
                {property.leases?.[0]?.guarantorName && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 max-w-[220px] truncate"
                    title={`Guarantor: ${property.leases[0].guarantorName}${property.leases[0].guarantorContact ? ` (${property.leases[0].guarantorContact})` : ''}`}
                  >
                    <ShieldCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">Guarantor: {property.leases[0].guarantorName}</span>
                    {property.leases[0].guarantorContact && (
                      property.leases[0].guarantorContact.includes('@') ? (
                        <a
                          href={`mailto:${property.leases[0].guarantorContact}`}
                          className="text-indigo-600 hover:text-indigo-900 shrink-0 inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                          title={`Email guarantor: ${property.leases[0].guarantorContact}`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <a
                          href={`tel:${property.leases[0].guarantorContact.replace(/\s+/g, '')}`}
                          className="text-indigo-600 hover:text-indigo-900 shrink-0 inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                          title={`Call guarantor: ${property.leases[0].guarantorContact}`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                        </a>
                      )
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Lease Expiry:
              </span>
              <div className="flex items-center gap-2">
                <span>{formatDate(property.leases?.[0]?.leaseEndDate || '')}</span>
                {onOpenNoticeModal && (
                  <button
                    type="button"
                    onClick={() => onOpenNoticeModal(property.leases?.[0]?.id)}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                      property.leases?.[0]?.status === 'Notice Given'
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Manage notice or record move-out"
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>{property.leases?.[0]?.status === 'Notice Given' ? 'Notice Details' : 'Notice / Exit'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Deposit Held in Trust:
              </span>
              <strong className="text-slate-800">{formatZAR(property.leases?.[0]?.depositHeldZAR || 0)}</strong>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">Annual Escalation:</span>
              <strong className="text-emerald-700">{property.leases?.[0]?.annualEscalationPercent || 0}% p.a.</strong>
            </div>
          </>
        )}

        {/* Ancillary Income Summary */}
        {(property.ancillaryIncomes?.length || 0) > 0 && (
          <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-medium text-teal-700">+ Ancillary Income:</span>
            <span className="text-[10px] font-bold text-teal-800">
              + {formatZAR(property.ancillaryIncomes!.reduce((s, a) => s + a.monthlyRentZAR, 0))}/m ({property.ancillaryIncomes!.map((a) => {
                const typeLabels: Record<string, string> = { cell_tower: 'Tower', billboard: 'Billboard', parking: 'Parking', storage: 'Storage', other: 'Other' };
                return `${a.tenantName} ${typeLabels[a.type] || a.type}`;
              }).join(', ')})
            </span>
          </div>
        )}
      </div>

      {/* Monthly P&L Breakdown */}
      <div className="p-3.5 sm:p-4 text-xs space-y-2.5 text-slate-600">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-800">Gross Monthly Rent:</span>
          <InlineEditableAmount
            value={property.monthlyGrossRentZAR || 0}
            onSave={(val) => onUpdateProperty({ monthlyGrossRentZAR: val })}
            title="Click to edit gross monthly rent inline"
            prefix=""
            className="text-slate-900 font-bold"
          />
        </div>

        {ancillaryIncomeZAR > 0 && (
          <div className="flex justify-between items-center text-teal-700 bg-teal-50/60 px-2 py-1 rounded border border-teal-100 text-[11px]">
            <span className="font-semibold">Commercial Ancillary Leases:</span>
            <span className="font-bold font-mono">+ {formatZAR(ancillaryIncomeZAR)}/m</span>
          </div>
        )}

        {/* Collapsible OpEx Row & Accordion */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/40">
          <div className="p-2 flex items-center justify-between gap-2 text-slate-700">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-800 text-[11px]">Total Operating Expenses:</span>
              <button
                type="button"
                onClick={() => setIsOpExExpanded(!isOpExExpanded)}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
                title="Toggle itemized OpEx breakdown"
              >
                <span>{isOpExExpanded ? '▲ Hide Breakdown' : `View Itemized OpEx (${opexItemsCount}) ▾`}</span>
              </button>
            </div>
            <span className="font-mono font-bold text-slate-800 text-xs shrink-0">
              - {formatZAR(totalOpEx)}/m
            </span>
          </div>

          {isOpExExpanded && (
            <div className="p-2.5 pt-1.5 border-t border-slate-200/80 bg-white space-y-2 animate-in fade-in">
              {isFreehold ? (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Building Insurance (Homeowner):</span>
                  <InlineEditableAmount
                    value={Math.round((property.annualBuildingInsuranceZAR || 0) / 12)}
                    onSave={(val) => onUpdateProperty({ annualBuildingInsuranceZAR: Math.round(val * 12) })}
                    title="Click to edit monthly building insurance inline"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Body Corporate / HOA Levies:</span>
                  <InlineEditableAmount
                    value={property.monthlyLeviesZAR}
                    onSave={(val) => onUpdateProperty({ monthlyLeviesZAR: val })}
                    title="Click to edit monthly levies inline"
                  />
                </div>
              )}

              <div className="flex justify-between items-center text-slate-500">
                <span>Municipal Rates & Taxes:</span>
                <InlineEditableAmount
                  value={property.monthlyRatesTaxesZAR}
                  onSave={(val) => onUpdateProperty({ monthlyRatesTaxesZAR: val })}
                  title="Click to edit municipal rates & taxes inline"
                />
              </div>

              {property.managementType === 'Agency' ? (
                <div className="flex justify-between items-center text-slate-700 font-medium bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    Agency Fee ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ' + 15% VAT' : ''} - {property.agencyName || 'Agent'}):
                  </span>
                  <InlineEditableAmount
                    value={agencyCommissionZAR}
                    onSave={(val) => {
                      const gross = property.monthlyGrossRentZAR || 0;
                      const newPercent = gross > 0 ? Number(((val / gross) * 100).toFixed(1)) : (property.agencyCommissionPercent || 8);
                      onUpdateProperty({
                        monthlyAgentFeeZAR: val,
                        agencyCommissionPercent: newPercent,
                        ...(property.agencyName === 'iGrow Rentals' ? { agencyVatApplicable: false } : {}),
                      });
                    }}
                    title="Click to edit agency fee inline"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500" /> Agency Fee (Self-Managed):
                  </span>
                  <span className="text-emerald-700 font-semibold">R 0 (0%)</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-500">
                <span>Maintenance Reserve:</span>
                <span>- {formatZAR(property.monthlyMaintenanceReserveZAR)}</span>
              </div>

              {monthlyVending > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Prepaid Sub-Meter Fee ({property.prepaidVendorName || 'Vendor'}):</span>
                  <span>- {formatZAR(monthlyVending)}</span>
                </div>
              )}

              {monthlyCommunal > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Communal / Serviced:</span>
                  <span>- {formatZAR(monthlyCommunal)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bank Bond Repayment */}
        <div className="flex justify-between items-center text-slate-700 bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 text-[11px]">Bank Bond Payment:</span>
            {property.bondPaymentEffectiveDate && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200"
                title={property.bondRevisionNote || 'Forward-only effective month'}
              >
                Effective: {property.bondPaymentEffectiveDate}
              </span>
            )}
            <button
              type="button"
              onClick={onOpenPmtCalculator}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
              title="SARB Repo Rate PMT Calculator - forward-only bond adjustment"
            >
              <Calculator className="w-3 h-3 text-indigo-600" />
              <span>SARB PMT</span>
            </button>
          </div>
          <InlineEditableAmount
            value={property.monthlyBondPaymentZAR}
            onSave={(val) => onUpdateProperty({ monthlyBondPaymentZAR: val })}
            title="Click to edit bond repayment inline"
          />
        </div>

        {/* Compact Single-Line SARS Income Tax Provision Row */}
        <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/60 rounded-lg border border-amber-200 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-semibold text-amber-950">Est. SARS Tax:</span>
            <span className="font-mono font-bold text-amber-900">
              {monthlyTaxZAR > 0 ? `- ${formatZAR(monthlyTaxZAR)}/m` : 'R 0/m'}
            </span>
            {sec13Shield > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shrink-0"
                title={`Section 13sex Tax Shield: ${formatZAR(sec13Shield)}/yr allowance saves ${formatZAR(taxSavingsZAR)}/yr in SARS income tax`}
              >
                <Check className="w-2.5 h-2.5 text-emerald-700" /> Sec 13sex Shield Active (-{formatZAR(taxSavingsZAR)}/yr)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={property.taxEntityTypeOverride || 'Default'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateProperty({
                  taxEntityTypeOverride: val === 'Default' ? undefined : (val as any),
                });
              }}
              className="text-[10px] font-bold bg-white text-slate-800 border border-amber-300 rounded px-1.5 py-0.5 cursor-pointer hover:border-amber-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
              title="Switch SARS income tax entity structure"
            >
              <option value="Default">Default ({investorDefaultTaxType === 'Individual (45%)' ? '45%' : investorDefaultTaxType === 'Pre-Tax' ? '0%' : '27%'})</option>
              <option value="Company (27%)">Company (27%)</option>
              <option value="Individual (45%)">Individual (45%)</option>
              <option value="Pre-Tax">Pre-Tax (0%)</option>
            </select>
          </div>
        </div>

        {/* Net Post-Tax Cash Flow */}
        <div className="flex justify-between items-center text-slate-900 bg-emerald-50/70 px-2.5 py-2 rounded-lg border border-emerald-200">
          <div>
            <span className="font-bold text-emerald-950 text-xs block">
              Net Post-Tax Cash Flow:
            </span>
            <span className="text-[10px] text-emerald-700">
              Post-tax yield: {formatPercent(yieldPostTax)}
            </span>
          </div>
          <span className={`font-mono font-black text-sm ${postTaxCashflow >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
            {formatZAR(postTaxCashflow)}/m
          </span>
        </div>
      </div>

      {/* Collapsible Past Tenants & Historical Leases History */}
      {(property.archivedLeases || []).length > 0 && (
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowPastTenants(!showPastTenants)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-slate-950 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Past Tenants & Historical Leases</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {property.archivedLeases!.length}
              </span>
            </span>
            <span className="text-[11px] text-slate-500">{showPastTenants ? '▲ Hide' : '▼ View History'}</span>
          </button>

          {showPastTenants && (
            <div className="mt-3 space-y-2 animate-in fade-in">
              {property.archivedLeases!.map((archived) => (
                <div
                  key={archived.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900">{archived.tenantName}</strong>
                      <span className="text-[11px] text-slate-500 ml-1.5">({archived.unitName})</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {archived.departureReason}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1">
                    <span>
                      Tenancy: {formatDate(archived.leaseStartDate)} – {formatDate(archived.vacationDate || archived.leaseEndDate)}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatZAR(archived.monthlyRentZAR)}/m
                    </span>
                  </div>
                  {archived.forwardingNotes && (
                    <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded mt-1 border border-slate-100">
                      Notes: {archived.forwardingNotes}
                    </p>
                  )}
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      Archived {formatDate(archived.archivedAt)}
                    </span>
                    <a
                      href={`/statement/${archived.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5"
                    >
                      <span>View Historic Statement</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default RentalFinancialsTab;
