'use client';

import React from 'react';
import { RentalProperty } from '@/types';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';
import { calculateRentalTaxProvision } from '@/lib/calculations/rentals';
import {
  Building2,
  ArrowRightLeft,
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  AlertCircle,
} from 'lucide-react';

export interface RentalCardHeaderProps {
  property: RentalProperty;
  grossYieldPercent: number;
  netMonthlyCashflowZAR?: number;
  postTaxCashflowZAR?: number;
  onOpenEdit: () => void;
  onOpenExit: () => void;
  onOpenAuditHistory: () => void;
  onOpenMaintenance: () => void;
  onOpenMeterModal: () => void;
  onDeleteProperty: () => void;
}

export function renderAgencyContactLinks(contact: string) {
  if (!contact) return null;
  const isEmail = contact.includes('@');
  const cleanPhone = contact.replace(/[^\d]/g, '');
  const isPhone = !isEmail && cleanPhone.length >= 7;

  return (
    <div className="flex items-center gap-1.5">
      {isPhone ? (
        <>
          <a
            href={`tel:${contact.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
            title={`Call ${contact}`}
          >
            <Phone className="w-2.5 h-2.5" />
            <span>Call</span>
          </a>
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            title="WhatsApp Agent"
          >
            <MessageCircle className="w-2.5 h-2.5" />
            <span>WhatsApp</span>
          </a>
        </>
      ) : (
        <a
          href={`mailto:${contact.trim()}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
          title={`Email ${contact}`}
        >
          <Mail className="w-2.5 h-2.5" />
          <span>Email</span>
        </a>
      )}
    </div>
  );
}

export function RentalCardHeader({
  property,
  grossYieldPercent,
  netMonthlyCashflowZAR,
  postTaxCashflowZAR,
  onOpenAuditHistory,
}: RentalCardHeaderProps) {
  const arrearsInfo = calculatePropertyArrears(property);

  const netCashflow =
    netMonthlyCashflowZAR !== undefined
      ? netMonthlyCashflowZAR
      : calculateRentalCashflow(property).netMonthlyCashflowZAR;

  const postTaxCashflow =
    postTaxCashflowZAR !== undefined
      ? postTaxCashflowZAR
      : calculateRentalTaxProvision(property, netCashflow).postTaxCashflowZAR;

  return (
    <div>
      {/* Property Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <PropertyTypeBadge type={property.propertyType} />
              <AgmDateChip agmDate={property.agmDate} />
              {property.isBrrrrProperty && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <ArrowRightLeft className="w-2.5 h-2.5 text-indigo-600" />
                  <span>BRRRR Asset</span>
                </span>
              )}
              {(property.totalEquityExtractedZAR || 0) > 0 && (
                <button
                  type="button"
                  onClick={onOpenAuditHistory}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                  title="View timestamped refinance and equity extraction history"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                  <span>Equity Recycled: {formatZAR(property.totalEquityExtractedZAR || 0, { compact: true })}</span>
                </button>
              )}
            </div>
            <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              property.status === 'Occupied'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {property.status}
          </span>
        </div>

        {/* Management Status & 1-Click Contact */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-50">
          {property.managementType === 'Agency' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>🏢 Managed: {property.agencyName || 'Agency'} ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ` + VAT = ${((property.agencyCommissionPercent || 8) * 1.15).toFixed(1)}%` : ''})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <span>👤 Self-Managed</span>
            </span>
          )}

          {property.managementType === 'Agency' && property.agencyContact && (
            <div className="flex items-center gap-1 text-[11px]">
              {renderAgencyContactLinks(property.agencyContact)}
            </div>
          )}
        </div>
      </div>

      {/* Tenant Default Risk Alert Banner */}
      {arrearsInfo.totalArrearsZAR > 0 && (
        <div className="bg-rose-50 border-y border-rose-200 px-4 py-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            ⚠️ Tenant Default Risk: Arrears Accruing
          </span>
          <span className="font-extrabold text-rose-700 font-mono">
            -{formatZAR(arrearsInfo.totalArrearsZAR)}
          </span>
        </div>
      )}

      {/* Property Financial Highlights */}
      <div className="p-4 bg-slate-50/60 grid grid-cols-3 gap-2 text-center border-b border-slate-100 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block">Market Value</span>
          <strong className="text-slate-900">{formatZAR(property.marketValueZAR, { compact: true })}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Gross Yield</span>
          <strong className="text-emerald-700">{formatPercent(grossYieldPercent)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Net Cashflow</span>
          <strong className={netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
            {formatZAR(netCashflow)}/m
          </strong>
          <span className="text-[9px] text-slate-400 block font-normal">
            Post-tax: {formatZAR(postTaxCashflow)}/m
          </span>
        </div>
      </div>
    </div>
  );
}

export default RentalCardHeader;
