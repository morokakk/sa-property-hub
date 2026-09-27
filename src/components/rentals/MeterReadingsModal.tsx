'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Gauge,
  Zap,
  Droplets,
  PlusCircle,
  Trash2,
  ExternalLink,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  FileWarning,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { MeterReading, MeterDisputeStatus, MeterDisputeReason } from '@/types';
import { formatDate, formatZAR } from '@/lib/formatters';

interface MeterReadingsModalProps {
  propertyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeterReadingsModal({
  propertyId,
  isOpen,
  onClose,
}: MeterReadingsModalProps) {
  const rental = usePortfolioStore((state) =>
    state.rentals.find((r) => r.id === propertyId)
  );
  const addMeterReading = usePortfolioStore((state) => state.addMeterReading);
  const deleteMeterReading = usePortfolioStore((state) => state.deleteMeterReading);
  const updateMeterReadingDispute = usePortfolioStore((state) => state.updateMeterReadingDispute);

  // Tab Filtering: 'all' | 'electricity' | 'water' | 'disputes'
  const [activeTab, setActiveTab] = useState<'all' | 'electricity' | 'water' | 'disputes'>('all');

  // Form State
  const [utilityType, setUtilityType] = useState<'electricity' | 'water'>('electricity');
  const [readingDate, setReadingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [readingValue, setReadingValue] = useState<string>('');
  const [meterNumber, setMeterNumber] = useState<string>('');
  const [readingType, setReadingType] = useState<'Actual' | 'Estimated'>('Actual');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dispute Specific Form State
  const [isDisputed, setIsDisputed] = useState(false);
  const [disputedStatementId, setDisputedStatementId] = useState<string>('');
  const [disputedMunicipalReadingValue, setDisputedMunicipalReadingValue] = useState<string>('');
  const [disputeReferenceNumber, setDisputeReferenceNumber] = useState<string>('');
  const [disputeStatus, setDisputeStatus] = useState<MeterDisputeStatus>('Open / Lodged');
  const [disputeReason, setDisputeReason] = useState<MeterDisputeReason>('council_over_estimate');
  const [disputeLodgedDate, setDisputeLodgedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [manualEstimatedRand, setManualEstimatedRand] = useState<string>('');
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState<string>('');

  // Quick Dispute Editing State (Popover / Modal)
  const [editingDisputeReading, setEditingDisputeReading] = useState<MeterReading | null>(null);
  const [editDisputeStatus, setEditDisputeStatus] = useState<MeterDisputeStatus>('Open / Lodged');
  const [editDisputeRef, setEditDisputeRef] = useState<string>('');
  const [editDisputeNotes, setEditDisputeNotes] = useState<string>('');

  // Filtered readings
  const allReadings = useMemo(() => {
    if (!rental?.meterReadings) return [];
    return [...rental.meterReadings].sort((a, b) => b.date.localeCompare(a.date));
  }, [rental?.meterReadings]);

  const displayedReadings = useMemo(() => {
    if (activeTab === 'all') return allReadings;
    if (activeTab === 'disputes') return allReadings.filter((r) => r.isDisputed);
    return allReadings.filter((r) => r.utilityType === activeTab);
  }, [allReadings, activeTab]);

  // Available utility statements for dispute cross-referencing
  const availableStatements = useMemo(() => {
    if (!rental?.utilityStatements) return [];
    return [...rental.utilityStatements].sort((a, b) => b.statementDate.localeCompare(a.statementDate));
  }, [rental?.utilityStatements]);

  const selectedStatement = useMemo(() => {
    if (!availableStatements.length) return null;
    return (
      availableStatements.find((s) => s.id === disputedStatementId) ||
      availableStatements[0]
    );
  }, [availableStatements, disputedStatementId]);

  // Find latest prior reading for the selected utilityType & meterNumber
  const latestPriorReading = useMemo(() => {
    if (!rental?.meterReadings) return null;
    const filtered = rental.meterReadings
      .filter((r) => {
        if (r.utilityType !== utilityType) return false;
        if (meterNumber.trim() && r.meterNumber && r.meterNumber.trim().toLowerCase() !== meterNumber.trim().toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    return filtered[0] || null;
  }, [rental?.meterReadings, utilityType, meterNumber]);

  // Live consumption calculation
  const parsedValue = parseFloat(readingValue);
  const hasValidValue = !isNaN(parsedValue) && parsedValue >= 0;
  const previousValue = latestPriorReading ? latestPriorReading.readingValue : undefined;
  const calculatedConsumption =
    hasValidValue && previousValue !== undefined
      ? Math.round((parsedValue - previousValue) * 1000) / 1000
      : undefined;

  const unitLabel = utilityType === 'electricity' ? 'kWh' : 'KL';

  // Live dispute discrepancy & effective tariff derivation
  const parsedMuniReading = parseFloat(disputedMunicipalReadingValue);
  const hasValidMuniReading = !isNaN(parsedMuniReading) && parsedMuniReading >= 0;
  const muniConsumption =
    hasValidMuniReading && previousValue !== undefined
      ? Math.round((parsedMuniReading - previousValue) * 1000) / 1000
      : undefined;

  const liveConsumptionDiscrepancy =
    muniConsumption !== undefined && calculatedConsumption !== undefined
      ? Math.round((muniConsumption - calculatedConsumption) * 1000) / 1000
      : hasValidMuniReading && hasValidValue
      ? Math.round((parsedMuniReading - parsedValue) * 1000) / 1000
      : undefined;

  const statementCost = selectedStatement
    ? utilityType === 'electricity'
      ? selectedStatement.electricityZAR
      : selectedStatement.waterZAR
    : 0;

  const effectiveTariff =
    statementCost > 0 && muniConsumption && muniConsumption > 0
      ? statementCost / muniConsumption
      : utilityType === 'electricity'
      ? 3.06
      : 24.12;

  const autoDerivedRandImpact =
    liveConsumptionDiscrepancy !== undefined && liveConsumptionDiscrepancy > 0
      ? Math.round(liveConsumptionDiscrepancy * effectiveTariff * 100) / 100
      : undefined;

  if (!isOpen || !rental) return null;

  const handleSaveReading = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!readingDate) {
      setFormError('Please select a reading date.');
      return;
    }

    if (!hasValidValue) {
      setFormError('Please enter a valid numeric meter reading.');
      return;
    }

    const newReading: Omit<MeterReading, 'id' | 'createdAt'> = {
      date: readingDate,
      utilityType,
      readingValue: parsedValue,
      previousReadingValue: previousValue,
      consumption:
        calculatedConsumption !== undefined && calculatedConsumption >= 0
          ? calculatedConsumption
          : undefined,
      meterNumber: meterNumber.trim() || undefined,
      readingType,
      source: 'manual',
      photoUrl: photoUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      ...(isDisputed
        ? {
            isDisputed: true,
            disputeStatus,
            disputeReason,
            disputeReferenceNumber: disputeReferenceNumber.trim() || undefined,
            disputedStatementId: disputedStatementId || selectedStatement?.id || undefined,
            disputedMunicipalReadingValue: hasValidMuniReading ? parsedMuniReading : undefined,
            disputeDifferenceConsumption:
              liveConsumptionDiscrepancy !== undefined ? liveConsumptionDiscrepancy : undefined,
            disputeEffectiveTariffPerUnit: Math.round(effectiveTariff * 10000) / 10000,
            disputeEstimatedRandImpactZAR: manualEstimatedRand
              ? parseFloat(manualEstimatedRand)
              : autoDerivedRandImpact,
            disputeLodgedDate: disputeLodgedDate || undefined,
            disputeResolutionNotes: disputeResolutionNotes.trim() || undefined,
          }
        : {}),
    };

    addMeterReading(rental.id, newReading);

    // Reset inputs
    setReadingValue('');
    setNotes('');
    setPhotoUrl('');
    if (isDisputed) {
      setIsDisputed(false);
      setDisputeReferenceNumber('');
      setDisputedMunicipalReadingValue('');
      setManualEstimatedRand('');
      setDisputeResolutionNotes('');
      setSuccessToast(
        `Logged and flagged ${utilityType} reading as Municipal Dispute (Ref #${disputeReferenceNumber || 'Pending'})`
      );
    } else {
      setSuccessToast(`Logged ${utilityType} reading of ${parsedValue.toLocaleString('en-ZA')} ${unitLabel}`);
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleUpdateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisputeReading) return;
    updateMeterReadingDispute(rental.id, editingDisputeReading.id, {
      disputeStatus: editDisputeStatus,
      disputeReferenceNumber: editDisputeRef.trim() || undefined,
      disputeResolutionNotes: editDisputeNotes.trim() || undefined,
    });
    setSuccessToast(`Dispute record updated to '${editDisputeStatus}'`);
    setEditingDisputeReading(null);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDelete = (readingId: string) => {
    if (confirm('Are you sure you want to delete this meter reading record?')) {
      deleteMeterReading(rental.id, readingId);
    }
  };

  // Quick Stats
  const electricityCount = allReadings.filter((r) => r.utilityType === 'electricity').length;
  const waterCount = allReadings.filter((r) => r.utilityType === 'water').length;
  const disputesCount = allReadings.filter((r) => r.isDisputed).length;
  const activeDisputes = allReadings.filter((r) => r.isDisputed && r.disputeStatus !== 'Resolved');
  const latestElec = allReadings.find((r) => r.utilityType === 'electricity');
  const latestWater = allReadings.find((r) => r.utilityType === 'water');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-100 text-cyan-700 shrink-0">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Physical & Municipal Meter Readings
                </h3>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 shrink-0">
                  {allReadings.length} {allReadings.length === 1 ? 'Reading' : 'Readings'}
                </span>
                {disputesCount > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>{disputesCount} {disputesCount === 1 ? 'Dispute' : 'Disputes'}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                {rental.title} • {rental.address}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Latest Electricity ({electricityCount})
                </span>
                <span className="text-sm font-black font-mono text-slate-800">
                  {latestElec ? `${latestElec.readingValue.toLocaleString('en-ZA')} kWh` : 'None logged'}
                </span>
                {latestElec && (
                  <span className="text-[10px] text-slate-400 block">
                    {formatDate(latestElec.date)} {latestElec.meterNumber ? `(#${latestElec.meterNumber})` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Latest Water ({waterCount})
                </span>
                <span className="text-sm font-black font-mono text-slate-800">
                  {latestWater ? `${latestWater.readingValue.toLocaleString('en-ZA')} KL` : 'None logged'}
                </span>
                {latestWater && (
                  <span className="text-[10px] text-slate-400 block">
                    {formatDate(latestWater.date)} {latestWater.meterNumber ? `(#${latestWater.meterNumber})` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Dual-Audit Synchronization
                </span>
                <span className="text-xs font-bold text-slate-800 block">
                  Statement & Field Log
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Auto-populated from PDF bills + physical visits
                </span>
              </div>
            </div>
          </div>

          {/* Active Municipal Dispute Alert Banner */}
          {activeDisputes.length > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-amber-950 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs flex items-center gap-2 flex-wrap">
                    <span>{activeDisputes.length} Active Municipal Reading {activeDisputes.length === 1 ? 'Dispute' : 'Disputes'}</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black">
                      Action Required
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5 truncate">
                    Independent on-site meter readings contest municipal estimates. Track council reference tickets and verify credit note resolution.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('disputes')}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors shrink-0 cursor-pointer"
              >
                View Disputes →
              </button>
            </div>
          )}

          {/* Success Toast */}
          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: Log Manual Reading Form */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                <PlusCircle className="w-4 h-4 text-cyan-600" />
                <span>Log New Field / On-Site Meter Reading</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Current - Previous = Auto-Calculated Consumption
              </span>
            </div>

            <form onSubmit={handleSaveReading} noValidate className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Utility Type Toggle */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Utility Type *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setUtilityType('electricity')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        utilityType === 'electricity'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Electricity</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUtilityType('water')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold text-xs transition-all cursor-pointer ${
                        utilityType === 'water'
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Water</span>
                    </button>
                  </div>
                </div>

                {/* 2. Reading Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Reading Date *
                  </label>
                  <input
                    type="date"
                    name="readingDate"
                    autoComplete="off"
                    required
                    value={readingDate}
                    onChange={(e) => setReadingDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* 3. Meter Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Meter Number / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    name="meterNumber"
                    autoComplete="off"
                    value={meterNumber}
                    onChange={(e) => setMeterNumber(e.target.value)}
                    placeholder={utilityType === 'electricity' ? 'e.g. 10003374' : 'e.g. 211001886'}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                {/* 4. Reading Value */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Reading Value ({unitLabel}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="readingValue"
                      autoComplete="off"
                      step="any"
                      required
                      min="0"
                      value={readingValue}
                      onChange={(e) => setReadingValue(e.target.value)}
                      placeholder="e.g. 1977.00"
                      className="w-full pl-2.5 pr-10 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400 font-mono">
                      {unitLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Auto-Calculated Consumption Preview Box */}
              <div className="p-3 rounded-lg border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Dynamic Consumption Calculation ({unitLabel})
                  </span>
                  {latestPriorReading ? (
                    <div className="text-xs text-slate-600">
                      Previous baseline: <strong className="font-mono text-slate-800">{latestPriorReading.readingValue.toLocaleString('en-ZA')} {unitLabel}</strong>{' '}
                      <span className="text-[10px] text-slate-400">({formatDate(latestPriorReading.date)})</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      No prior reading recorded for this utility. This entry will establish the baseline.
                    </div>
                  )}
                </div>

                {calculatedConsumption !== undefined ? (
                  calculatedConsumption >= 0 ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800">
                      <span className="text-[10px] font-bold uppercase">Delta:</span>
                      <strong className="text-sm font-black font-mono">
                        +{calculatedConsumption.toLocaleString('en-ZA')} {unitLabel}
                      </strong>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Lower than previous ({latestPriorReading?.readingValue}). Verify meter reset/rollover.
                      </span>
                    </div>
                  )
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Enter reading value to calculate delta
                  </span>
                )}
              </div>

              {/* Secondary Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reading Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Reading Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReadingType('Actual')}
                      className={`py-1 text-center font-bold text-[11px] rounded transition-colors cursor-pointer ${
                        readingType === 'Actual'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingType('Estimated')}
                      className={`py-1 text-center font-bold text-[11px] rounded transition-colors cursor-pointer ${
                        readingType === 'Estimated'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Estimated
                    </button>
                  </div>
                </div>

                {/* Photo Vault Link */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-slate-400" />
                    <span>Photo Vault / Cloud Drive URL</span>
                  </label>
                  <input
                    type="url"
                    name="photoUrl"
                    autoComplete="off"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://photos.app.goo.gl/... or OneDrive"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Notes / Inspection Context
                  </label>
                  <input
                    type="text"
                    name="readingNotes"
                    autoComplete="off"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Quarterly physical inspection"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dispute Toggle Checkbox */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDisputed}
                    onChange={(e) => setIsDisputed(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Flag as Municipal Reading Dispute (Contest Council Estimate / Dial Error)</span>
                  </span>
                </label>
              </div>

              {/* Collapsible Dispute Fields */}
              {isDisputed && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                      <span>Municipal Dispute Details</span>
                    </span>
                    <span className="text-[10px] text-amber-700">
                      Cross-reference against municipal statement
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Contested Statement Picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Contested Statement Period *
                      </label>
                      <select
                        value={disputedStatementId || selectedStatement?.id || ''}
                        onChange={(e) => setDisputedStatementId(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        {availableStatements.map((stmt) => (
                          <option key={stmt.id} value={stmt.id}>
                            {stmt.billingPeriod || stmt.statementDate} • {stmt.provider}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Municipal Claimed Reading Value */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Council Statement Reading ({unitLabel})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={disputedMunicipalReadingValue}
                        onChange={(e) => setDisputedMunicipalReadingValue(e.target.value)}
                        placeholder="What council statement showed"
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Council Reference Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Council Reference / Ticket #
                      </label>
                      <input
                        type="text"
                        value={disputeReferenceNumber}
                        onChange={(e) => setDisputeReferenceNumber(e.target.value)}
                        placeholder="e.g. ETH-2026-88192 or CoJ-80019"
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Dispute Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Dispute Status
                      </label>
                      <select
                        value={disputeStatus}
                        onChange={(e) => setDisputeStatus(e.target.value as MeterDisputeStatus)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="Open / Lodged">Open / Lodged</option>
                        <option value="Under Investigation">Under Investigation</option>
                        <option value="Credit Note Pending">Credit Note Pending</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    {/* Dispute Reason */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Dispute Reason
                      </label>
                      <select
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value as MeterDisputeReason)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="council_over_estimate">Council Over-Estimate (No Physical Inspection)</option>
                        <option value="meter_fault">Faulty / Stuck Meter Dials</option>
                        <option value="incorrect_meter_number">Wrong Meter Number on Statement</option>
                        <option value="dials_reversed">Dials Reversed / Misread by Reader</option>
                        <option value="unexplained_spike">Unexplained Consumption Spike</option>
                        <option value="other">Other Query</option>
                      </select>
                    </div>

                    {/* Estimated Rand Impact */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Estimated Disputed Impact (ZAR)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={manualEstimatedRand}
                          onChange={(e) => setManualEstimatedRand(e.target.value)}
                          placeholder={autoDerivedRandImpact !== undefined ? `~R ${autoDerivedRandImpact.toFixed(2)}` : 'e.g. 450.00'}
                          className="w-full pl-6 pr-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Discrepancy & Tariff Preview */}
                  {liveConsumptionDiscrepancy !== undefined && (
                    <div className="p-2.5 bg-white rounded-lg border border-amber-300 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          Discrepancy:
                        </span>
                        <strong className="font-mono text-amber-950 font-black">
                          {liveConsumptionDiscrepancy >= 0 ? `+${liveConsumptionDiscrepancy}` : liveConsumptionDiscrepancy} {unitLabel}{' '}
                          <span className="text-[10px] font-semibold text-amber-800">
                            ({liveConsumptionDiscrepancy >= 0 ? 'Council Over-Billed' : 'Council Under-Billed'})
                          </span>
                        </strong>
                      </div>
                      <div className="text-slate-600 font-medium text-[11px]">
                        Effective Tariff: <strong className="font-mono text-slate-800">R {effectiveTariff.toFixed(2)}/{unitLabel}</strong> • Estimated Value:{' '}
                        <strong className="font-mono text-emerald-700">
                          {formatZAR(manualEstimatedRand ? parseFloat(manualEstimatedRand) : autoDerivedRandImpact || 0, { includeDecimals: true })}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Lodged Date & Resolution Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Dispute Lodged Date
                      </label>
                      <input
                        type="date"
                        value={disputeLodgedDate}
                        onChange={(e) => setDisputeLodgedDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Dispute & Council Notes
                      </label>
                      <input
                        type="text"
                        value={disputeResolutionNotes}
                        onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                        placeholder="e.g. Lodged ticket via eThekwini Smart Services. Technician inspection requested."
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                    isDisputed
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isDisputed ? 'Save & Flag Municipal Dispute' : 'Save Reading to Ledger'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: Historical Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Meter Reading Chronological Ledger
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({displayedReadings.length} records)
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All ({allReadings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('electricity')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'electricity'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-500 hover:text-amber-800'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Electricity ({electricityCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('water')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'water'
                      ? 'bg-white text-cyan-800 shadow-2xs'
                      : 'text-slate-500 hover:text-cyan-800'
                  }`}
                >
                  <Droplets className="w-3 h-3 text-cyan-500" />
                  <span>Water ({waterCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('disputes')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    activeTab === 'disputes'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Disputes ({disputesCount})</span>
                </button>
              </div>
            </div>

            {/* Table / Ledger */}
            {displayedReadings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No meter readings recorded</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Log physical on-site readings using the form above, or upload municipal statements to auto-extract readings.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        <th className="p-3 pl-4">Date</th>
                        <th className="p-3">Utility & Meter</th>
                        <th className="p-3 text-right">Reading Value</th>
                        <th className="p-3 text-right">Consumption</th>
                        <th className="p-3">Type & Source</th>
                        <th className="p-3">Evidence / Notes</th>
                        <th className="p-3 pr-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayedReadings.map((reading) => {
                        const isElec = reading.utilityType === 'electricity';
                        const uLabel = isElec ? 'kWh' : 'KL';

                        return (
                          <tr
                            key={reading.id}
                            className={`transition-colors ${
                              reading.isDisputed
                                ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-l-amber-500'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            {/* Date */}
                            <td className="p-3 pl-4 whitespace-nowrap">
                              <span className="font-bold text-slate-900 block">
                                {formatDate(reading.date)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {reading.date}
                              </span>
                            </td>

                            {/* Utility & Meter */}
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isElec ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    <span>Electricity</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                    <Droplets className="w-3 h-3 text-cyan-500" />
                                    <span>Water</span>
                                  </span>
                                )}
                                {reading.meterNumber && (
                                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    #{reading.meterNumber}
                                  </span>
                                )}
                              </div>
                              {reading.isDisputed && (
                                <div className="mt-1 flex items-center gap-1 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                      reading.disputeStatus === 'Resolved'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                  >
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>{reading.disputeStatus || 'Open Dispute'}</span>
                                  </span>
                                  {reading.disputeReferenceNumber && (
                                    <span className="text-[9px] font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      Ref: {reading.disputeReferenceNumber}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Reading Value */}
                            <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {reading.readingValue.toLocaleString('en-ZA', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 3,
                              })}{' '}
                              <span className="text-[10px] font-normal text-slate-400">{uLabel}</span>
                            </td>

                            {/* Consumption Delta */}
                            <td className="p-3 text-right whitespace-nowrap">
                              {reading.consumption !== undefined ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                  +{reading.consumption.toLocaleString('en-ZA', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 3,
                                  })}{' '}
                                  <span className="text-[9px] font-normal">{uLabel}</span>
                                </span>
                              ) : reading.previousReadingValue !== undefined ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {(reading.readingValue - reading.previousReadingValue).toLocaleString('en-ZA', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 3,
                                  })}{' '}
                                  <span className="text-[9px] font-normal">{uLabel}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Baseline</span>
                              )}
                            </td>

                            {/* Type & Source */}
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    reading.readingType === 'Estimated'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {reading.readingType || 'Actual'}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                    reading.source === 'pdf-extracted'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-teal-50 text-teal-800 border-teal-200'
                                  }`}
                                >
                                  {reading.source === 'pdf-extracted' ? 'PDF Extracted' : 'Field Log'}
                                </span>
                              </div>
                            </td>

                            {/* Evidence / Notes */}
                            <td className="p-3 min-w-[160px] max-w-xs">
                              <div className="space-y-0.5">
                                {reading.photoUrl && (
                                  <a
                                    href={reading.photoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:text-cyan-900 hover:underline"
                                    title="View meter photo in vault"
                                  >
                                    <Camera className="w-3 h-3 text-cyan-600" />
                                    <span>Photo Vault</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                                {reading.notes && (
                                  <p className="text-[10px] text-slate-500 truncate" title={reading.notes}>
                                    {reading.notes}
                                  </p>
                                )}
                                {reading.isDisputed && (
                                  <div className="mt-1 p-1.5 bg-amber-100/70 rounded-md border border-amber-200 text-[10px] text-amber-950 space-y-0.5">
                                    <div className="font-bold flex items-center justify-between gap-1">
                                      <span>Council: {reading.disputedMunicipalReadingValue?.toLocaleString('en-ZA') ?? '—'} {uLabel}</span>
                                      {reading.disputeEstimatedRandImpactZAR !== undefined && (
                                        <span className="font-mono text-emerald-800 font-black">
                                          ~{formatZAR(reading.disputeEstimatedRandImpactZAR, { includeDecimals: true })}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-amber-800">
                                      Delta: {reading.disputeDifferenceConsumption !== undefined ? `${reading.disputeDifferenceConsumption > 0 ? '+' : ''}${reading.disputeDifferenceConsumption} ${uLabel}` : 'Contested'}
                                      {reading.disputeLodgedDate ? ` • Lodged ${formatDate(reading.disputeLodgedDate)}` : ''}
                                    </div>
                                    {reading.disputeResolutionNotes && (
                                      <p className="text-[9px] text-slate-600 italic truncate" title={reading.disputeResolutionNotes}>
                                        {reading.disputeResolutionNotes}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {!reading.photoUrl && !reading.notes && !reading.isDisputed && (
                                  <span className="text-slate-300 text-[11px]">—</span>
                                )}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="p-3 pr-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {reading.isDisputed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDisputeReading(reading);
                                      setEditDisputeStatus(reading.disputeStatus || 'Open / Lodged');
                                      setEditDisputeRef(reading.disputeReferenceNumber || '');
                                      setEditDisputeNotes(reading.disputeResolutionNotes || '');
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-600 transition-colors rounded hover:bg-amber-50 cursor-pointer"
                                    title="Update dispute status & council ticket"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reading.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-rose-50 cursor-pointer"
                                  title="Delete meter reading"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 sm:hidden">
                  Scroll horizontally to view full ledger details →
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Readings directly correlate with CoJ & Eskom utility cost recoveries</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>

      {/* Edit Dispute Modal Popover */}
      {editingDisputeReading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  Update Municipal Dispute
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingDisputeReading(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDispute} className="p-5 space-y-3.5 text-xs">
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Date: <strong>{formatDate(editingDisputeReading.date)}</strong> • Reading: <strong>{editingDisputeReading.readingValue} {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}</strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Dispute Lifecycle Status *
                </label>
                <select
                  value={editDisputeStatus}
                  onChange={(e) => setEditDisputeStatus(e.target.value as MeterDisputeStatus)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Open / Lodged">Open / Lodged</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Credit Note Pending">Credit Note Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Council Reference / Ticket #
                </label>
                <input
                  type="text"
                  value={editDisputeRef}
                  onChange={(e) => setEditDisputeRef(e.target.value)}
                  placeholder="e.g. ETH-2026-88192"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Resolution & Council Notes
                </label>
                <textarea
                  rows={3}
                  value={editDisputeNotes}
                  onChange={(e) => setEditDisputeNotes(e.target.value)}
                  placeholder="e.g. Council technician confirmed meter reading. Credit note issued."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDisputeReading(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
