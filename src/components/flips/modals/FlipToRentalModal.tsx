'use client';

import React, { useState, useEffect } from 'react';
import { FlipProject } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { calculateGrossYield } from '@/lib/calculations/rentals';

export interface FlipToRentalModalProps {
  isOpen: boolean;
  flip: FlipProject | null;
  totalAllInCostZAR: number;
  onClose: () => void;
  onConverted: (conversionDetails: {
    marketValuationZAR: number;
    monthlyGrossRentZAR: number;
    tenantName?: string;
  }) => void;
  // Breakdown & controlled props for Phase 4A backward compatibility
  totalBOQActual?: number;
  totalHoldingCost?: number;
  flipHoldingMonths?: number;
  convertMarketValue?: number;
  setConvertMarketValue?: (v: number) => void;
  convertGrossRent?: number;
  setConvertGrossRent?: (v: number) => void;
  convertTenantName?: string;
  setConvertTenantName?: (v: string) => void;
  convertTenantPhone?: string;
  setConvertTenantPhone?: (v: string) => void;
  convertTenantEmail?: string;
  setConvertTenantEmail?: (v: string) => void;
  convertManagementType?: 'Agency' | 'Self-Managed';
  setConvertManagementType?: (v: 'Agency' | 'Self-Managed') => void;
  convertAgencyName?: string;
  setConvertAgencyName?: (v: string) => void;
  convertAgencyCommission?: number;
  setConvertAgencyCommission?: (v: number) => void;
  convertNotes?: string;
  setConvertNotes?: (v: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const FlipToRentalModal: React.FC<FlipToRentalModalProps> = ({
  isOpen,
  flip,
  totalAllInCostZAR,
  onClose,
  onConverted,
  totalBOQActual = 0,
  totalHoldingCost = 0,
  flipHoldingMonths = 0,
  convertMarketValue: propMarketValue,
  setConvertMarketValue: propSetMarketValue,
  convertGrossRent: propGrossRent,
  setConvertGrossRent: propSetGrossRent,
  convertTenantName: propTenantName,
  setConvertTenantName: propSetTenantName,
  convertTenantPhone: propTenantPhone,
  setConvertTenantPhone: propSetTenantPhone,
  convertTenantEmail: propTenantEmail,
  setConvertTenantEmail: propSetTenantEmail,
  convertManagementType: propManagementType,
  setConvertManagementType: propSetManagementType,
  convertAgencyName: propAgencyName,
  setConvertAgencyName: propSetAgencyName,
  convertAgencyCommission: propAgencyCommission,
  setConvertAgencyCommission: propSetAgencyCommission,
  convertNotes: propNotes,
  setConvertNotes: propSetNotes,
  onSubmit: propOnSubmit,
}) => {
  const [localMarketValue, setLocalMarketValue] = useState<number>(0);
  const [localGrossRent, setLocalGrossRent] = useState<number>(0);
  const [localTenantName, setLocalTenantName] = useState<string>('');
  const [localTenantPhone, setLocalTenantPhone] = useState<string>('');
  const [localTenantEmail, setLocalTenantEmail] = useState<string>('');
  const [localManagementType, setLocalManagementType] = useState<'Agency' | 'Self-Managed'>('Agency');
  const [localAgencyName, setLocalAgencyName] = useState<string>('Pam Golding Sandton');
  const [localAgencyCommission, setLocalAgencyCommission] = useState<number>(8.0);
  const [localNotes, setLocalNotes] = useState<string>('');

  useEffect(() => {
    if (flip && isOpen && propMarketValue === undefined) {
      setLocalMarketValue(flip.targetExitPriceZAR || 0);
      setLocalGrossRent(Math.round(((flip.targetExitPriceZAR || 0) * 0.008) / 500) * 500 || 18000);
      setLocalTenantName('Tenant Pending Placement');
      setLocalTenantPhone('');
      setLocalTenantEmail('');
      setLocalManagementType('Agency');
      setLocalAgencyName('Pam Golding Sandton');
      setLocalAgencyCommission(8.0);
      setLocalNotes('');
    }
  }, [flip, isOpen, propMarketValue]);

  if (!isOpen || !flip) return null;

  const marketValue = propMarketValue !== undefined ? propMarketValue : localMarketValue;
  const grossRent = propGrossRent !== undefined ? propGrossRent : localGrossRent;
  const tenantName = propTenantName !== undefined ? propTenantName : localTenantName;
  const tenantPhone = propTenantPhone !== undefined ? propTenantPhone : localTenantPhone;
  const tenantEmail = propTenantEmail !== undefined ? propTenantEmail : localTenantEmail;
  const managementType = propManagementType !== undefined ? propManagementType : localManagementType;
  const agencyName = propAgencyName !== undefined ? propAgencyName : localAgencyName;
  const agencyCommission = propAgencyCommission !== undefined ? propAgencyCommission : localAgencyCommission;
  const notes = propNotes !== undefined ? propNotes : localNotes;

  const handleMarketValueChange = (v: number) => {
    if (propSetMarketValue) propSetMarketValue(v);
    else setLocalMarketValue(v);
  };

  const handleGrossRentChange = (v: number) => {
    if (propSetGrossRent) propSetGrossRent(v);
    else setLocalGrossRent(v);
  };

  const handleTenantNameChange = (v: string) => {
    if (propSetTenantName) propSetTenantName(v);
    else setLocalTenantName(v);
  };

  const handleTenantPhoneChange = (v: string) => {
    if (propSetTenantPhone) propSetTenantPhone(v);
    else setLocalTenantPhone(v);
  };

  const handleTenantEmailChange = (v: string) => {
    if (propSetTenantEmail) propSetTenantEmail(v);
    else setLocalTenantEmail(v);
  };

  const handleManagementTypeChange = (v: 'Agency' | 'Self-Managed') => {
    if (propSetManagementType) propSetManagementType(v);
    else setLocalManagementType(v);
  };

  const handleAgencyNameChange = (v: string) => {
    if (propSetAgencyName) propSetAgencyName(v);
    else setLocalAgencyName(v);
  };

  const handleAgencyCommissionChange = (v: number) => {
    if (propSetAgencyCommission) propSetAgencyCommission(v);
    else setLocalAgencyCommission(v);
  };

  const handleNotesChange = (v: string) => {
    if (propSetNotes) propSetNotes(v);
    else setLocalNotes(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }
    e.preventDefault();
    if (marketValue <= 0 || grossRent <= 0) return;
    onConverted({
      marketValuationZAR: marketValue,
      monthlyGrossRentZAR: grossRent,
      tenantName: tenantName || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in sm:my-8 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            <span>Convert to Rental (BRRRR Transition)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Transition <strong>{flip.title}</strong> into a long-term cashflowing rental asset. This marks the Flip phase as Completed, copies over all CoCs and drive documents, and passes the <strong>total accumulated cost</strong> (Purchase + BOQ + Carrying Costs) as the rental&apos;s initial capital basis.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Cost Basis Breakdown Card */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">
                Initial Capital Basis Breakdown
              </span>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-900 font-semibold px-2 py-0.5 rounded-full">
                BRRRR Step 3: Rent
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
              <div className="bg-white p-2 rounded-lg border border-indigo-100/80">
                <span className="text-[10px] text-slate-400 block font-medium">Purchase + Duty</span>
                <strong className="text-xs text-slate-900">{formatZAR((flip.purchasePriceZAR || 0) + (flip.acquisitionCostsZAR || 0))}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-indigo-100/80">
                <span className="text-[10px] text-slate-400 block font-medium">BOQ Rehab Spend</span>
                <strong className="text-xs text-indigo-700">{formatZAR(totalBOQActual)}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-indigo-100/80">
                <span className="text-[10px] text-slate-400 block font-medium">Holding ({flipHoldingMonths} mos)</span>
                <strong className="text-xs text-amber-700">{formatZAR(totalHoldingCost)}</strong>
              </div>
              <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-2xs">
                <span className="text-[10px] text-indigo-100 block font-medium">Total Capital Basis</span>
                <strong className="text-xs text-white font-extrabold">{formatZAR(totalAllInCostZAR)}</strong>
              </div>
            </div>
          </div>

          {/* Target Valuation & Gross Rent Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Market Valuation on Handover (ZAR) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={marketValue || ''}
                onChange={(e) => handleMarketValueChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 3200000"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Target exit valuation from flip analysis
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Estimated Monthly Gross Rent (ZAR) *
                </label>
                {grossRent > 0 && totalAllInCostZAR > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600">
                    {calculateGrossYield(grossRent, totalAllInCostZAR).toFixed(1)}% Gross Yield
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={grossRent || ''}
                onChange={(e) => handleGrossRentChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. 24000"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Starting rental rate for incoming lease
              </span>
            </div>
          </div>

          {/* Tenant Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tenant Name</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Tenant Pending Placement"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tenant Phone</label>
              <input
                type="text"
                value={tenantPhone}
                onChange={(e) => handleTenantPhoneChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="+27 82 000 0000"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tenant Email</label>
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => handleTenantEmailChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="tenant@email.co.za"
              />
            </div>
          </div>

          {/* Management Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Management Type</label>
              <select
                value={managementType}
                onChange={(e) => handleManagementTypeChange(e.target.value as 'Agency' | 'Self-Managed')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="Agency">Agency Managed</option>
                <option value="Self-Managed">Self-Managed (0%)</option>
              </select>
            </div>
            {managementType === 'Agency' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agency Name</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => handleAgencyNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Pam Golding Sandton"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission % (excl. VAT)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="20"
                    value={agencyCommission}
                    onChange={(e) => handleAgencyCommissionChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>

          {/* Transition Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transition Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="e.g. Completed luxury finishes, placed executive tenant at R24k/mo"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Next BRRRR Step: Refinance &amp; Repeat</span>
              <p className="text-amber-800 mt-0.5">
                Once the tenant is placed and rental income is seasoned, go to the <strong>Rentals</strong> module and click <strong>&quot;Refinance / Pull Out Equity&quot;</strong> to recycle your capital into your Seed Capital reserve for the next property.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
              <span>Finalize Conversion to Rental</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlipToRentalModal;
