'use client';

import React, { useState, useEffect } from 'react';
import { FlipProject } from '@/types';
import { Coins } from 'lucide-react';
import { formatZAR } from '@/lib/formatters';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface FlipFundingModalProps {
  isOpen: boolean;
  flip: FlipProject | null;
  totalCostBasisZAR?: number;
  totalCapitalSecuredZAR?: number;
  onClose: () => void;
  onSave?: (campaign: Partial<FlipProject>) => void;
  // Controlled props for Phase 4A backward compatibility with page.tsx
  fundingRequired?: number;
  setFundingRequired?: (val: number) => void;
  capitalRaised?: number;
  setCapitalRaised?: (val: number) => void;
  primaryFunderName?: string;
  setPrimaryFunderName?: (val: string) => void;
  primaryFunderContact?: string;
  setPrimaryFunderContact?: (val: string) => void;
  primaryFunderType?: FlipProject['primaryFunderType'];
  setPrimaryFunderType?: (val: FlipProject['primaryFunderType']) => void;
  coFundersNotes?: string;
  setCoFundersNotes?: (val: string) => void;
  promisedReturnType?: FlipProject['promisedReturnType'];
  setPromisedReturnType?: (val: FlipProject['promisedReturnType']) => void;
  promisedReturnRatePercent?: number;
  setPromisedReturnRatePercent?: (val: number) => void;
  promisedPayoutSchedule?: FlipProject['promisedPayoutSchedule'];
  setPromisedPayoutSchedule?: (val: FlipProject['promisedPayoutSchedule']) => void;
  securityOffered?: string;
  setSecurityOffered?: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const FlipFundingModal: React.FC<FlipFundingModalProps> = ({
  isOpen,
  flip,
  totalCostBasisZAR,
  totalCapitalSecuredZAR,
  onClose,
  onSave,
  fundingRequired: propFundingRequired,
  setFundingRequired: propSetFundingRequired,
  capitalRaised: propCapitalRaised,
  setCapitalRaised: propSetCapitalRaised,
  primaryFunderName: propPrimaryFunderName,
  setPrimaryFunderName: propSetPrimaryFunderName,
  primaryFunderContact: propPrimaryFunderContact,
  setPrimaryFunderContact: propSetPrimaryFunderContact,
  primaryFunderType: propPrimaryFunderType,
  setPrimaryFunderType: propSetPrimaryFunderType,
  coFundersNotes: propCoFundersNotes,
  setCoFundersNotes: propSetCoFundersNotes,
  promisedReturnType: propPromisedReturnType,
  setPromisedReturnType: propSetPromisedReturnType,
  promisedReturnRatePercent: propPromisedReturnRatePercent,
  setPromisedReturnRatePercent: propSetPromisedReturnRatePercent,
  promisedPayoutSchedule: propPromisedPayoutSchedule,
  setPromisedPayoutSchedule: propSetPromisedPayoutSchedule,
  securityOffered: propSecurityOffered,
  setSecurityOffered: propSetSecurityOffered,
  onSubmit: propOnSubmit,
}) => {
  const updateFlipStore = usePortfolioStore((s) => s.updateFlip);

  // Local state fallbacks
  const [localFundingRequired, setLocalFundingRequired] = useState<number>(0);
  const [localCapitalRaised, setLocalCapitalRaised] = useState<number>(0);
  const [localPrimaryFunderName, setLocalPrimaryFunderName] = useState<string>('');
  const [localPrimaryFunderContact, setLocalPrimaryFunderContact] = useState<string>('');
  const [localPrimaryFunderType, setLocalPrimaryFunderType] = useState<FlipProject['primaryFunderType']>('Private Lender');
  const [localCoFundersNotes, setLocalCoFundersNotes] = useState<string>('');
  const [localPromisedReturnType, setLocalPromisedReturnType] = useState<FlipProject['promisedReturnType']>('Fixed Interest');
  const [localPromisedReturnRatePercent, setLocalPromisedReturnRatePercent] = useState<number>(14);
  const [localPromisedPayoutSchedule, setLocalPromisedPayoutSchedule] = useState<FlipProject['promisedPayoutSchedule']>('Monthly Interest');
  const [localSecurityOffered, setLocalSecurityOffered] = useState<string>('2nd Mortgage Bond registered over title deed');

  useEffect(() => {
    if (flip && isOpen && propFundingRequired === undefined) {
      setLocalFundingRequired(flip.fundingRequiredZAR || Math.round((flip.purchasePriceZAR + flip.acquisitionCostsZAR + flip.baselineRenovationBudgetZAR) * 0.7));
      setLocalCapitalRaised(flip.capitalRaisedZAR || 0);
      setLocalPrimaryFunderName(flip.primaryFunderName || '');
      setLocalPrimaryFunderContact(flip.primaryFunderContact || '');
      setLocalPrimaryFunderType(flip.primaryFunderType || 'Private Lender');
      setLocalCoFundersNotes(flip.coFundersNotes || '');
      setLocalPromisedReturnType(flip.promisedReturnType || 'Fixed Interest');
      setLocalPromisedReturnRatePercent(flip.promisedReturnRatePercent ?? 14);
      setLocalPromisedPayoutSchedule(flip.promisedPayoutSchedule || 'Monthly Interest');
      setLocalSecurityOffered(flip.securityOffered || '2nd Mortgage Bond registered over title deed');
    }
  }, [flip, isOpen, propFundingRequired]);

  const fundingRequired = propFundingRequired !== undefined ? propFundingRequired : localFundingRequired;
  const setFundingRequired = propSetFundingRequired || setLocalFundingRequired;
  const capitalRaised = propCapitalRaised !== undefined ? propCapitalRaised : localCapitalRaised;
  const setCapitalRaised = propSetCapitalRaised || setLocalCapitalRaised;
  const primaryFunderName = propPrimaryFunderName !== undefined ? propPrimaryFunderName : localPrimaryFunderName;
  const setPrimaryFunderName = propSetPrimaryFunderName || setLocalPrimaryFunderName;
  const primaryFunderContact = propPrimaryFunderContact !== undefined ? propPrimaryFunderContact : localPrimaryFunderContact;
  const setPrimaryFunderContact = propSetPrimaryFunderContact || setLocalPrimaryFunderContact;
  const primaryFunderType = propPrimaryFunderType !== undefined ? propPrimaryFunderType : localPrimaryFunderType;
  const setPrimaryFunderType = propSetPrimaryFunderType || setLocalPrimaryFunderType;
  const coFundersNotes = propCoFundersNotes !== undefined ? propCoFundersNotes : localCoFundersNotes;
  const setCoFundersNotes = propSetCoFundersNotes || setLocalCoFundersNotes;
  const promisedReturnType = propPromisedReturnType !== undefined ? propPromisedReturnType : localPromisedReturnType;
  const setPromisedReturnType = propSetPromisedReturnType || setLocalPromisedReturnType;
  const promisedReturnRatePercent = propPromisedReturnRatePercent !== undefined ? propPromisedReturnRatePercent : localPromisedReturnRatePercent;
  const setPromisedReturnRatePercent = propSetPromisedReturnRatePercent || setLocalPromisedReturnRatePercent;
  const promisedPayoutSchedule = propPromisedPayoutSchedule !== undefined ? propPromisedPayoutSchedule : localPromisedPayoutSchedule;
  const setPromisedPayoutSchedule = propSetPromisedPayoutSchedule || setLocalPromisedPayoutSchedule;
  const securityOffered = propSecurityOffered !== undefined ? propSecurityOffered : localSecurityOffered;
  const setSecurityOffered = propSetSecurityOffered || setLocalSecurityOffered;

  if (!isOpen || !flip) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    const payload: Partial<FlipProject> = {
      fundingRequiredZAR: Number(fundingRequired),
      capitalRaisedZAR: Number(capitalRaised),
      primaryFunderName: primaryFunderName.trim() || undefined,
      primaryFunderContact: primaryFunderContact.trim() || undefined,
      primaryFunderType,
      coFundersNotes: coFundersNotes.trim() || undefined,
      promisedReturnType,
      promisedReturnRatePercent: Number(promisedReturnRatePercent),
      promisedPayoutSchedule,
      securityOffered: securityOffered.trim() || undefined,
    };

    if (onSave) {
      onSave(payload);
    } else {
      updateFlipStore(flip.id, payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-600" />
          Edit Deal Funding Campaign & Investor Terms
        </h3>

        {(totalCostBasisZAR !== undefined || totalCapitalSecuredZAR !== undefined) && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-center mb-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost Basis</span>
              <strong className="text-xs text-slate-800">{formatZAR(totalCostBasisZAR || 0)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Capital Secured</span>
              <strong className="text-xs text-emerald-700">{formatZAR(totalCapitalSecuredZAR || 0)}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Facility (ZAR) *</label>
              <input
                type="number"
                name="targetFacilityZAR"
                autoComplete="off"
                min="0"
                step="any"
                required
                value={fundingRequired}
                onChange={(e) => setFundingRequired(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Total capital needed</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capital Raised to Date (ZAR)</label>
              <input
                type="number"
                name="capitalRaisedZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={capitalRaised}
                onChange={(e) => setCapitalRaised(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
              />
              <span className="text-[10px] text-slate-400">Managed to raise so far</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Funder Name</label>
              <input
                type="text"
                name="contactPerson"
                autoComplete="name"
                placeholder="e.g. Johan Meyer"
                value={primaryFunderName}
                onChange={(e) => setPrimaryFunderName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Funder Category</label>
              <select
                value={primaryFunderType}
                onChange={(e) => setPrimaryFunderType(e.target.value as FlipProject['primaryFunderType'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Private Lender">Private Lender (Angel / HNW)</option>
                <option value="Syndicate JV Partner">Syndicate JV Partner</option>
                <option value="Friends & Family">Friends & Family</option>
                <option value="Equity Partner">Equity Partner</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Funder Contact / Trust Info</label>
            <input
              type="text"
              name="funderContact"
              autoComplete="off"
              placeholder="e.g. Meyer Family Trust / +27 82 555 1234"
              value={primaryFunderContact}
              onChange={(e) => setPrimaryFunderContact(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Promised Return Structure</label>
              <select
                value={promisedReturnType}
                onChange={(e) => setPromisedReturnType(e.target.value as FlipProject['promisedReturnType'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Fixed Interest">Fixed Interest (% p.a.)</option>
                <option value="Equity Profit Split">Equity Profit Split (% of Net Flip)</option>
                <option value="Monthly Coupon">Monthly Coupon</option>
                <option value="Bullet Repayment">Bullet Repayment</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Promised Rate / Split (%)</label>
              <input
                type="number"
                name="returnRatePercent"
                autoComplete="off"
                min="0"
                step="any"
                value={promisedReturnRatePercent}
                onChange={(e) => setPromisedReturnRatePercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payout Schedule</label>
              <select
                value={promisedPayoutSchedule}
                onChange={(e) => setPromisedPayoutSchedule(e.target.value as FlipProject['promisedPayoutSchedule'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Monthly Interest">Monthly Interest</option>
                <option value="Quarterly">Quarterly</option>
                <option value="At Exit (Maturity)">At Exit (Maturity / Transfer)</option>
                <option value="Bi-Annual">Bi-Annual</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Security / Collateral Offered</label>
              <input
                type="text"
                value={securityOffered}
                onChange={(e) => setSecurityOffered(e.target.value)}
                placeholder="e.g. 2nd Mortgage Bond registered"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Co-Funders / Syndicate Notes</label>
            <input
              type="text"
              placeholder="e.g. R300k open tranche or co-funded with Piet"
              value={coFundersNotes}
              onChange={(e) => setCoFundersNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
            >
              Save Funding Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
