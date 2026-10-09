'use client';

import React, { useState } from 'react';
import { RentalProperty, TenantPaymentRecord } from '@/types';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';
import { calculateGrossYield, calculateRentalTaxProvision } from '@/lib/calculations/rentals';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { RentalCardHeader } from './RentalCardHeader';
import { RentalFinancialsTab } from './RentalFinancialsTab';
import { RentalPaymentsTab } from './RentalPaymentsTab';
import { RentalForecastSection } from './RentalForecastSection';
import {
  UserCheck,
  CreditCard,
  ShieldCheck,
  FolderArchive,
  Wrench,
  Gauge,
  FileText,
  ArrowUpRight,
  Coins,
  Edit3,
  Trash2,
} from 'lucide-react';

export interface RentalCardProps {
  property: RentalProperty;
  investorDefaultTaxType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  investorProfile?: import('@/types').InvestorProfile;
  forecastView: 'wealth-only' | 'cashflow-only';
  onForecastViewChange: (view: 'wealth-only' | 'cashflow-only') => void;
  onOpenEdit: (property: RentalProperty) => void;
  onOpenExit: (property: RentalProperty) => void;
  onOpenRefinance: (property: RentalProperty) => void;
  onOpenAuditHistory: (property: RentalProperty) => void;
  onOpenMaintenance: (property: RentalProperty) => void;
  onOpenMeterModal: (propertyId: string) => void;
  onOpenStatementModal: (propertyId: string) => void;
  onOpenPmtCalculator: (property: RentalProperty) => void;
  onOpenLogPayment: (
    property: RentalProperty,
    targetMonth?: string,
    suggestedAmount?: number,
    leaseId?: string,
    isArrears?: boolean
  ) => void;
  onOpenEditPayment: (payment: TenantPaymentRecord) => void;
  onOpenWriteOff: (property: RentalProperty, suggestedAmount?: number, leaseId?: string) => void;
  onUpdateOpeningBalance: (propertyId: string, amount: number, leaseId?: string) => void;
  onDeletePayment: (propertyId: string, paymentId: string, amount: number, date: string) => void;
  onDeleteWriteOff: (propertyId: string, writeOffId: string, amount: number, date: string) => void;
  onMarkMonthPaid: (propertyId: string, month: string, amountDue: number, leaseId?: string) => void;
  onShowToast: (message: string) => void;
  onDeleteProperty: (propertyId: string, propertyTitle: string) => void;
  onUpdateProperty: (propertyId: string, updates: Partial<RentalProperty>) => void;
}

export function RentalCard({
  property,
  investorDefaultTaxType = 'Company (27%)',
  investorProfile,
  forecastView,
  onForecastViewChange,
  onOpenEdit,
  onOpenExit,
  onOpenRefinance,
  onOpenAuditHistory,
  onOpenMaintenance,
  onOpenMeterModal,
  onOpenStatementModal,
  onOpenPmtCalculator,
  onOpenLogPayment,
  onOpenEditPayment,
  onOpenWriteOff,
  onUpdateOpeningBalance,
  onDeletePayment,
  onDeleteWriteOff,
  onMarkMonthPaid,
  onShowToast,
  onDeleteProperty,
  onUpdateProperty,
}: RentalCardProps) {
  const [activeTab, setActiveTab] = useState<'financials' | 'payments' | 'coc' | 'vault'>('financials');

  const calculatedCashflow = calculateRentalCashflow(property);
  const yieldGross = calculateGrossYield(calculatedCashflow.totalGrossIncomeZAR, property.marketValueZAR);
  const taxCalculation = calculateRentalTaxProvision(
    property,
    calculatedCashflow.netMonthlyCashflowZAR,
    investorDefaultTaxType
  );
  const arrearsInfo = calculatePropertyArrears(property);

  return (
    <div
      data-testid={`rental-card-${property.id}`}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <RentalCardHeader
          property={property}
          grossYieldPercent={yieldGross}
          netMonthlyCashflowZAR={calculatedCashflow.netMonthlyCashflowZAR}
          postTaxCashflowZAR={taxCalculation.postTaxCashflowZAR}
          onOpenEdit={() => onOpenEdit(property)}
          onOpenExit={() => onOpenExit(property)}
          onOpenAuditHistory={() => onOpenAuditHistory(property)}
          onOpenMaintenance={() => onOpenMaintenance(property)}
          onOpenMeterModal={() => onOpenMeterModal(property.id)}
          onDeleteProperty={() => onDeleteProperty(property.id, property.title)}
        />

        {/* Card Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'financials'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Lease & Costs</span>
          </button>

          <button
            type="button"
            data-testid={`tab-payments-${property.id}`}
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payments & Arrears</span>
            {arrearsInfo.totalArrearsZAR > 0 && (
              <span
                className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                title={`Outstanding Arrears: R ${arrearsInfo.totalArrearsZAR}`}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coc')}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'coc'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mandatory CoC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-white text-indigo-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cloud Vault</span>
          </button>
        </div>

        {/* Tab 1: Financials */}
        {activeTab === 'financials' && (
          <RentalFinancialsTab
            property={property}
            calculatedCashflow={calculatedCashflow}
            taxCalculation={taxCalculation}
            investorDefaultTaxType={investorDefaultTaxType}
            onUpdateProperty={(updates) => onUpdateProperty(property.id, updates)}
            onOpenPmtCalculator={() => onOpenPmtCalculator(property)}
            onOpenRefinance={() => onOpenRefinance(property)}
            onOpenStatementModal={() => onOpenStatementModal(property.id)}
          />
        )}

        {/* Tab 2: Payments */}
        {activeTab === 'payments' && (
          <RentalPaymentsTab
            property={property}
            investorProfile={investorProfile}
            onOpenLogPayment={(targetMonth, suggestedAmount, leaseId, isArrears) =>
              onOpenLogPayment(property, targetMonth, suggestedAmount, leaseId, isArrears)
            }
            onOpenEditPayment={onOpenEditPayment}
            onOpenWriteOff={(suggestedAmount, leaseId) =>
              onOpenWriteOff(property, suggestedAmount, leaseId)
            }
            onOpenStatementModal={() => onOpenStatementModal(property.id)}
            onUpdateOpeningBalance={(amount, leaseId) =>
              onUpdateOpeningBalance(property.id, amount, leaseId)
            }
            onDeletePayment={(paymentId, amount, date) =>
              onDeletePayment(property.id, paymentId, amount, date)
            }
            onDeleteWriteOff={(writeOffId, amount, date) =>
              onDeleteWriteOff(property.id, writeOffId, amount, date)
            }
            onMarkMonthPaid={(month, amountDue, leaseId) =>
              onMarkMonthPaid(property.id, month, amountDue, leaseId)
            }
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 3: CoC Checklist */}
        {activeTab === 'coc' && (
          <div className="p-3 bg-white">
            <ComplianceChecklist
              certificates={property.cocChecklist}
              city={property.city}
              onUpdate={(updated) => onUpdateProperty(property.id, { cocChecklist: updated })}
              compact
            />
          </div>
        )}

        {/* Tab 4: Cloud Vault */}
        {activeTab === 'vault' && (
          <div className="p-3 bg-white">
            <CloudDriveLinkVault
              vault={property.driveVault}
              onUpdate={(updated) => onUpdateProperty(property.id, { driveVault: updated })}
              compact
            />
          </div>
        )}
      </div>

      {/* 20-Year Long-Term Forecast Accordion */}
      <RentalForecastSection
        property={property}
        forecastView={forecastView}
        onForecastViewChange={onForecastViewChange}
      />

      {/* Footer: Maintenance & Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenMaintenance(property)}
          className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Maintenance ({property.maintenanceHistory?.length || 0})</span>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => onOpenMeterModal(property.id)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-md border border-cyan-200 transition-colors cursor-pointer"
            title="View physical meter readings and log field inspections"
          >
            <Gauge className="w-3 h-3 text-cyan-600" />
            <span>Log Meter</span>
            {(property.meterReadings?.length || 0) > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-200 text-cyan-900 rounded-full text-[9px] font-black">
                {property.meterReadings?.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenStatementModal(property.id)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition-colors cursor-pointer"
            title="View tenant utility recovery and month-over-month variance statement"
          >
            <FileText className="w-3 h-3 text-teal-600" />
            <span>Utilities & Statement</span>
            {(property.utilityStatements?.length || 0) > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-teal-200 text-teal-900 rounded-full text-[9px] font-black">
                {property.utilityStatements?.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenRefinance(property)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 transition-colors cursor-pointer"
            title="BRRRR: Refinance and pull out equity into seed capital pool"
          >
            <ArrowUpRight className="w-3 h-3 text-purple-600" />
            <span>Refinance</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExit(property)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
            title="Mark rental property as sold"
          >
            <Coins className="w-3 h-3 text-emerald-600" />
            <span>Mark as Sold</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenEdit(property)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors cursor-pointer"
            title="Edit property & agency mandate"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remove rental "${property.title}"?`)) {
                onDeleteProperty(property.id, property.title);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
            title="Delete property"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RentalCard;
