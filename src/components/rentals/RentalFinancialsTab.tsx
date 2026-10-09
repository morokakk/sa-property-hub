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
  AlertCircle,
  FileText,
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
  onOpenRefinance: () => void;
  onOpenStatementModal: () => void;
}

export function RentalFinancialsTab({
  property,
  calculatedCashflow,
  taxCalculation,
  investorDefaultTaxType = 'Company (27%)',
  onUpdateProperty,
  onOpenPmtCalculator,
  onOpenRefinance,
  onOpenStatementModal,
}: RentalFinancialsTabProps) {
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
            <div className="space-y-1 pl-5">
              {property.leases!.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-[11px] gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={l.status === 'Occupied' ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                      {l.unitName}: {l.tenantName} ({l.status})
                    </span>
                    {l.roomType && (
                      <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {l.roomType}
                      </span>
                    )}
                    {l.guarantorName && (
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 max-w-[220px] truncate"
                        title={`Guarantor: ${l.guarantorName}${l.guarantorContact ? ` (${l.guarantorContact})` : ''}`}
                      >
                        <span className="shrink-0">🛡️</span>
                        <span className="truncate">Guarantor: {l.guarantorName}</span>
                        {l.guarantorContact && (
                          l.guarantorContact.includes('@') ? (
                            <a
                              href={`mailto:${l.guarantorContact}`}
                              className="text-indigo-600 hover:underline shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title={`Email guarantor: ${l.guarantorContact}`}
                            >
                              ✉️
                            </a>
                          ) : (
                            <a
                              href={`tel:${l.guarantorContact.replace(/\s+/g, '')}`}
                              className="text-indigo-600 hover:underline shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title={`Call guarantor: ${l.guarantorContact}`}
                            >
                              📞
                            </a>
                          )
                        )}
                      </span>
                    )}
                  </div>
                  <span className="font-medium shrink-0">{formatZAR(l.monthlyRentZAR)}/m</span>
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
                    <span className="shrink-0">🛡️</span>
                    <span className="truncate">Guarantor: {property.leases[0].guarantorName}</span>
                    {property.leases[0].guarantorContact && (
                      property.leases[0].guarantorContact.includes('@') ? (
                        <a
                          href={`mailto:${property.leases[0].guarantorContact}`}
                          className="text-indigo-600 hover:underline shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title={`Email guarantor: ${property.leases[0].guarantorContact}`}
                        >
                          ✉️
                        </a>
                      ) : (
                        <a
                          href={`tel:${property.leases[0].guarantorContact.replace(/\s+/g, '')}`}
                          className="text-indigo-600 hover:underline shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title={`Call guarantor: ${property.leases[0].guarantorContact}`}
                        >
                          📞
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
              <span>{formatDate(property.leases?.[0]?.leaseEndDate || '')}</span>
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

      {/* Monthly Expenses Breakdown */}
      <div className="p-4 text-xs space-y-2 text-slate-600">
        <div className="flex justify-between items-center">
          <span className="font-medium">Gross Monthly Rent:</span>
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

        {property.propertyType === 'Freehold House' ? (
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
            <span className="flex items-center gap-1">
              <span>👤</span> Agency Fee (Self-Managed):
            </span>
            <span className="text-emerald-700 font-semibold">R 0 (0%)</span>
          </div>
        )}

        <div className="flex justify-between items-center text-slate-500">
          <span>Maintenance Reserve:</span>
          <span>- {formatZAR(property.monthlyMaintenanceReserveZAR)}</span>
        </div>

        {(property.monthlyPrepaidVendingFeeZAR || 0) > 0 && (
          <div className="flex justify-between items-center text-slate-500">
            <span>Prepaid Sub-Meter Fee ({property.prepaidVendorName || 'Vendor'}):</span>
            <span>- {formatZAR(property.monthlyPrepaidVendingFeeZAR || 0)}</span>
          </div>
        )}

        {(property.monthlyCommunalServicesZAR || 0) > 0 && (
          <div className="flex justify-between items-center text-slate-500">
            <span>Communal / Serviced:</span>
            <span>- {formatZAR(property.monthlyCommunalServicesZAR || 0)}</span>
          </div>
        )}

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
            <button
              type="button"
              onClick={onOpenRefinance}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shadow-2xs transition-colors cursor-pointer"
              title="BRRRR: Refinance and pull out equity into seed capital"
            >
              <ArrowUpRight className="w-3 h-3 text-purple-600" />
              <span>Refinance</span>
            </button>
          </div>
          <InlineEditableAmount
            value={property.monthlyBondPaymentZAR}
            onSave={(val) => onUpdateProperty({ monthlyBondPaymentZAR: val })}
            title="Click to edit bond repayment inline"
          />
        </div>

        {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
          <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200 text-[11px]">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Utility Arrears Deduction:
            </span>
            <span>- {formatZAR(property.unpaidUtilityArrearsZAR || 0)}</span>
          </div>
        )}

        {/* SARS Income Tax Provision */}
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex flex-col gap-2 text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-amber-950 text-[11px]">
                    Est. SARS Tax Provision:
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    {taxRateLabel} {property.taxEntityTypeOverride ? '(Override)' : '(Default)'}
                  </span>
                  {sec13Shield > 0 && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5"
                      title={`Section 13sex Tax Shield: ${formatZAR(sec13Shield)}/yr allowance saves ${formatZAR(taxSavingsZAR)}/yr in SARS income tax`}
                    >
                      ✓ Sec 13sex Shield Active (-{formatZAR(taxSavingsZAR)}/yr)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  {taxRate === 0
                    ? 'Pre-Tax entity structure (0% tax liability)'
                    : netCashflow <= 0
                    ? 'Assessed operational loss (R 0 tax liability)'
                    : `${formatZAR(annualTaxZAR)}/yr tax reserve liability`}
                </span>
              </div>
              <span className="font-mono font-bold text-amber-900 text-xs shrink-0">
                {monthlyTaxZAR > 0 ? `- ${formatZAR(monthlyTaxZAR)}` : 'R 0'}
              </span>
            </div>

            {/* 1-Click Interactive Tax Entity Toggle */}
            <div className="flex items-center gap-1 pt-1.5 border-t border-amber-200/60 flex-wrap">
              <span className="text-[9px] font-bold text-amber-900/70 uppercase tracking-wider mr-0.5">
                Entity:
              </span>
              <button
                type="button"
                onClick={() => onUpdateProperty({ taxEntityTypeOverride: undefined })}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                  property.taxEntityTypeOverride === undefined
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                }`}
                title={`Inherit global default from Settings (${investorDefaultTaxType})`}
              >
                Default ({investorDefaultTaxType === 'Individual (45%)' ? '45%' : investorDefaultTaxType === 'Pre-Tax' ? '0%' : '27%'})
              </button>
              <button
                type="button"
                onClick={() => onUpdateProperty({ taxEntityTypeOverride: 'Company (27%)' })}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                  property.taxEntityTypeOverride === 'Company (27%)'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Company 27%
              </button>
              <button
                type="button"
                onClick={() => onUpdateProperty({ taxEntityTypeOverride: 'Individual (45%)' })}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                  property.taxEntityTypeOverride === 'Individual (45%)'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Individual 45%
              </button>
              <button
                type="button"
                onClick={() => onUpdateProperty({ taxEntityTypeOverride: 'Pre-Tax' })}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                  property.taxEntityTypeOverride === 'Pre-Tax'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Pre-Tax 0%
              </button>
            </div>
          </div>

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
      </div>

      {/* Inline Editable Utility Arrears Box */}
      <div className={`mx-4 mb-4 p-3 rounded-lg border text-xs transition-colors ${
        (property.unpaidUtilityArrearsZAR || 0) > 0
          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider">Utility Arrears</span>
            {(property.unpaidUtilityArrearsZAR || 0) > 0 ? (
              <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                ⚠️ Tenant Default Risk
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-semibold">✓ Paid Up</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStatementModal}
              className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              title="View tenant utility recovery and month-over-month variance statement"
            >
              <FileText className="w-2.5 h-2.5 text-teal-600" />
              <span>Statements ({(property.utilityStatements?.length || 0)})</span>
            </button>
            <span className="text-[10px] text-slate-400">Inline edit</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
            <input
              type="number"
              min={0}
              step="any"
              key={`${property.id}-${property.unpaidUtilityArrearsZAR || 0}`}
              defaultValue={property.unpaidUtilityArrearsZAR || 0}
              onBlur={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                if (val !== (property.unpaidUtilityArrearsZAR || 0)) {
                  onUpdateProperty({ unpaidUtilityArrearsZAR: val });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`w-full pl-6 pr-2 py-1 text-xs font-mono font-bold rounded border transition-colors focus:outline-none focus:ring-1 ${
                (property.unpaidUtilityArrearsZAR || 0) > 0
                  ? 'bg-white border-rose-300 text-rose-700 focus:ring-rose-400'
                  : 'bg-white border-slate-300 text-slate-700 focus:ring-emerald-400'
              }`}
              placeholder="0"
              title="Edit utility arrears and press Enter or click away to save"
            />
          </div>
          {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
            <button
              type="button"
              onClick={() => onUpdateProperty({ unpaidUtilityArrearsZAR: 0 })}
              className="px-2 py-1 text-[10px] font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
              title="Mark arrears as cleared"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {(property.unpaidUtilityArrearsZAR || 0) > 0
            ? 'Unpaid municipal water/lights debt deducted directly from Net Monthly Cashflow.'
            : 'No outstanding municipal utility debt on this unit.'}
        </p>
      </div>
    </>
  );
}

export default RentalFinancialsTab;
