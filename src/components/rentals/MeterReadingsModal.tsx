'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Scale,
  Receipt,
  Check,
  Ban,
  Building,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  MeterReading,
  MeterDisputeStatus,
  MeterDisputeReason,
  MeterDisputeResolutionOutcome,
} from '@/types';
import { formatDate, formatZAR } from '@/lib/formatters';
import { calculateMunicipalDisputeImpact } from '@/lib/calculations/municipalTariffs';
import DisputeLetterModal from './DisputeLetterModal';
import PropertyMeterRegistryModal from './PropertyMeterRegistryModal';
import MunicipalDirectoryModal from './MunicipalDirectoryModal';

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
  const addPropertyMeter = usePortfolioStore((state) => state.addPropertyMeter);
  const municipalDirectory = usePortfolioStore((state) => state.municipalDirectory);

  // Sub-modal state
  const [isDisputeLetterModalOpen, setIsDisputeLetterModalOpen] = useState(false);
  const [disputeLetterReading, setDisputeLetterReading] = useState<MeterReading | null>(null);
  const [isMeterRegistryOpen, setIsMeterRegistryOpen] = useState(false);
  const [isMuniDirectoryOpen, setIsMuniDirectoryOpen] = useState(false);

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
  const [editResolutionOutcome, setEditResolutionOutcome] = useState<MeterDisputeResolutionOutcome>('accepted_actuals');
  const [editResolutionDate, setEditResolutionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [editSettledCreditZAR, setEditSettledCreditZAR] = useState<string>('');
  const [editAgreedReadingValue, setEditAgreedReadingValue] = useState<string>('');
  const [editCreditNoteNumber, setEditCreditNoteNumber] = useState<string>('');

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

  const propertyMeters = useMemo(() => {
    return rental?.meterRegistry || [];
  }, [rental?.meterRegistry]);

  const formTopRef = useRef<HTMLDivElement>(null);

  // Matching council reading extracted from the selected statement
  const statementExtractedReading = useMemo(() => {
    if (!selectedStatement) return null;
    const fromStmt = (selectedStatement.extractedMeterReadings || []).find(
      (r) => r.utilityType === utilityType
    );
    if (fromStmt) return fromStmt;

    const stmtDatePrefix = selectedStatement.statementDate ? selectedStatement.statementDate.substring(0, 7) : '';
    const stmtMonthName = selectedStatement.billingPeriod
      ? selectedStatement.billingPeriod.split(' ')[0].toLowerCase()
      : '';

    const fromRental = (rental?.meterReadings || []).find(
      (r) =>
        r.source === 'pdf-extracted' &&
        r.utilityType === utilityType &&
        (r.date === selectedStatement.statementDate ||
          (stmtDatePrefix && r.date.startsWith(stmtDatePrefix)) ||
          (stmtMonthName &&
            r.date &&
            new Date(r.date).toLocaleString('en-US', { month: 'long' }).toLowerCase() === stmtMonthName))
    );
    return fromRental || null;
  }, [selectedStatement, utilityType, rental?.meterReadings]);

  // Auto-populate council reading and meter number from statement when dispute mode is active
  useEffect(() => {
    if (isDisputed && statementExtractedReading) {
      setDisputedMunicipalReadingValue(statementExtractedReading.readingValue.toString());
      if (!meterNumber.trim() && statementExtractedReading.meterNumber) {
        setMeterNumber(statementExtractedReading.meterNumber);
      }
    }
  }, [isDisputed, selectedStatement?.id, utilityType, statementExtractedReading]);

  // 1-Click dispute action from chronological ledger table
  const handleInitiateDisputeFromRow = (reading: MeterReading) => {
    setUtilityType(reading.utilityType);
    setIsDisputed(true);
    setDisputedMunicipalReadingValue(reading.readingValue.toString());
    if (reading.meterNumber) {
      setMeterNumber(reading.meterNumber);
    }
    const readingMonth = reading.date
      ? new Date(reading.date).toLocaleString('en-US', { month: 'long' }).toLowerCase()
      : '';

    const matchingStmt = availableStatements.find(
      (s) =>
        s.id === reading.disputedStatementId ||
        (s.extractedMeterReadings || []).some(
          (em) => em.readingValue === reading.readingValue && em.utilityType === reading.utilityType
        ) ||
        s.statementDate === reading.date ||
        (reading.date && s.statementDate.startsWith(reading.date.substring(0, 7))) ||
        (readingMonth && s.billingPeriod && s.billingPeriod.toLowerCase().includes(readingMonth))
    );
    if (matchingStmt) {
      setDisputedStatementId(matchingStmt.id);
    }
    setReadingValue('');
    formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Baseline starting index
  // In dispute mode, prioritize the statement's starting meter reading (e.g. 1468)
  const effectiveBaseline =
    isDisputed && statementExtractedReading?.previousReadingValue !== undefined
      ? statementExtractedReading.previousReadingValue
      : latestPriorReading
      ? (latestPriorReading.disputeAgreedReadingValue ?? latestPriorReading.readingValue)
      : undefined;

  // Live consumption calculation
  const parsedValue = parseFloat(readingValue);
  const hasValidValue = !isNaN(parsedValue) && parsedValue >= 0;
  const previousValue = effectiveBaseline;
  const calculatedConsumption =
    hasValidValue && previousValue !== undefined
      ? Math.round((parsedValue - previousValue) * 1000) / 1000
      : undefined;

  const unitLabel = utilityType === 'electricity' ? 'kWh' : 'KL';

  // Live dispute discrepancy & municipal tariff calculation
  const parsedMuniReading = parseFloat(disputedMunicipalReadingValue);
  const hasValidMuniReading = !isNaN(parsedMuniReading) && parsedMuniReading >= 0;

  const statementCost = selectedStatement
    ? utilityType === 'electricity'
      ? selectedStatement.electricityZAR
      : selectedStatement.waterZAR
    : 0;

  const disputeImpact = useMemo(() => {
    if (!isDisputed) return null;
    const councilReadingNum = hasValidMuniReading
      ? parsedMuniReading
      : statementExtractedReading?.readingValue || 0;
    const councilPrevReadingNum =
      statementExtractedReading?.previousReadingValue ??
      (latestPriorReading ? latestPriorReading.readingValue : undefined);
    const councilBilledUnitsNum = statementExtractedReading?.consumption;
    const providerOrCity =
      selectedStatement?.provider || rental?.city || rental?.address || '';

    return calculateMunicipalDisputeImpact({
      utilityType,
      councilReading: councilReadingNum,
      councilPreviousReading: councilPrevReadingNum,
      councilBilledUnits: councilBilledUnitsNum,
      statementCostZAR: statementCost,
      physicalReading: hasValidValue ? parsedValue : 0,
      physicalPreviousReading: councilPrevReadingNum,
      providerOrCity,
    });
  }, [
    isDisputed,
    hasValidMuniReading,
    parsedMuniReading,
    statementExtractedReading,
    latestPriorReading,
    utilityType,
    statementCost,
    hasValidValue,
    parsedValue,
    selectedStatement?.provider,
    rental?.city,
    rental?.address,
  ]);

  const muniConsumption =
    disputeImpact
      ? disputeImpact.councilConsumption
      : hasValidMuniReading && previousValue !== undefined
      ? Math.round((parsedMuniReading - previousValue) * 1000) / 1000
      : undefined;

  const liveConsumptionDiscrepancy =
    disputeImpact && hasValidValue
      ? disputeImpact.unitsDiscrepancy
      : muniConsumption !== undefined && calculatedConsumption !== undefined
      ? Math.round((muniConsumption - calculatedConsumption) * 1000) / 1000
      : hasValidMuniReading && hasValidValue
      ? Math.round((parsedMuniReading - parsedValue) * 1000) / 1000
      : undefined;

  const effectiveTariff =
    disputeImpact
      ? disputeImpact.effectiveRatePerUnit
      : statementCost > 0 && muniConsumption && muniConsumption > 0
      ? statementCost / muniConsumption
      : utilityType === 'electricity'
      ? 3.06
      : 24.12;

  const autoDerivedRandImpact =
    disputeImpact && hasValidValue
      ? disputeImpact.cappedDisputeCostZAR
      : liveConsumptionDiscrepancy !== undefined && liveConsumptionDiscrepancy > 0
      ? Math.round(liveConsumptionDiscrepancy * effectiveTariff * 100) / 100
      : undefined;

  // Live recalculation when compromise reading index is entered
  const compromiseRecalculation = useMemo(() => {
    if (
      editDisputeStatus !== 'Resolved' ||
      editResolutionOutcome !== 'compromise_reading' ||
      !editingDisputeReading
    ) {
      return null;
    }
    const parsedAgreed = parseFloat(editAgreedReadingValue);
    if (isNaN(parsedAgreed) || parsedAgreed < 0) return null;

    const stmt =
      availableStatements.find((s) => s.id === editingDisputeReading.disputedStatementId) ||
      selectedStatement;
    const stmtCost = stmt
      ? editingDisputeReading.utilityType === 'electricity'
        ? stmt.electricityZAR
        : stmt.waterZAR
      : 0;
    const councilReading = editingDisputeReading.disputedMunicipalReadingValue || 0;
    const baseline = editingDisputeReading.previousReadingValue;
    const providerOrCity = stmt?.provider || rental?.city || '';

    return calculateMunicipalDisputeImpact({
      utilityType: editingDisputeReading.utilityType,
      councilReading,
      councilPreviousReading: baseline,
      statementCostZAR: stmtCost,
      physicalReading: parsedAgreed,
      physicalPreviousReading: baseline,
      providerOrCity,
    });
  }, [
    editDisputeStatus,
    editResolutionOutcome,
    editAgreedReadingValue,
    editingDisputeReading,
    availableStatements,
    selectedStatement,
    rental?.city,
  ]);

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
      previousReadingValue: effectiveBaseline,
      consumption:
        isDisputed && disputeImpact
          ? disputeImpact.physicalConsumption
          : calculatedConsumption !== undefined && calculatedConsumption >= 0
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
              disputeImpact && hasValidValue
                ? disputeImpact.unitsDiscrepancy
                : liveConsumptionDiscrepancy !== undefined
                ? liveConsumptionDiscrepancy
                : undefined,
            disputeEffectiveTariffPerUnit: Math.round(effectiveTariff * 10000) / 10000,
            disputeEstimatedRandImpactZAR: manualEstimatedRand
              ? parseFloat(manualEstimatedRand)
              : disputeImpact?.cappedDisputeCostZAR ?? autoDerivedRandImpact,
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

  const openDisputeEditor = (reading: MeterReading, defaultToResolved = false) => {
    setEditingDisputeReading(reading);
    setEditDisputeStatus(defaultToResolved ? 'Resolved' : (reading.disputeStatus || 'Open / Lodged'));
    setEditDisputeRef(reading.disputeReferenceNumber || '');
    setEditDisputeNotes(reading.disputeResolutionNotes || '');
    setEditResolutionOutcome(reading.disputeResolutionOutcome || 'accepted_actuals');
    setEditResolutionDate(reading.disputeResolutionDate || new Date().toISOString().split('T')[0]);
    setEditCreditNoteNumber(reading.disputeCreditNoteNumber || '');

    if (reading.disputeSettledCreditZAR !== undefined) {
      setEditSettledCreditZAR(reading.disputeSettledCreditZAR.toString());
    } else if (reading.disputeEstimatedRandImpactZAR !== undefined) {
      setEditSettledCreditZAR(reading.disputeEstimatedRandImpactZAR.toString());
    } else {
      setEditSettledCreditZAR('');
    }

    if (reading.disputeAgreedReadingValue !== undefined) {
      setEditAgreedReadingValue(reading.disputeAgreedReadingValue.toString());
    } else {
      setEditAgreedReadingValue(reading.readingValue.toString());
    }
  };

  const handleUpdateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisputeReading) return;

    const updates: Partial<MeterReading> = {
      disputeStatus: editDisputeStatus,
      disputeReferenceNumber: editDisputeRef.trim() || undefined,
      disputeResolutionNotes: editDisputeNotes.trim() || undefined,
    };

    if (editDisputeStatus === 'Resolved') {
      updates.disputeResolutionOutcome = editResolutionOutcome;
      updates.disputeResolutionDate = editResolutionDate || new Date().toISOString().split('T')[0];

      if (editResolutionOutcome === 'accepted_actuals') {
        updates.disputeAgreedReadingValue = editingDisputeReading.readingValue;
        updates.disputeAgreedConsumption = editingDisputeReading.consumption;
        updates.disputeSettledCreditZAR =
          parseFloat(editSettledCreditZAR) || editingDisputeReading.disputeEstimatedRandImpactZAR || 0;
        updates.disputeCreditNoteNumber = editCreditNoteNumber.trim() || undefined;
      } else if (editResolutionOutcome === 'credit_note_issued') {
        updates.disputeSettledCreditZAR = parseFloat(editSettledCreditZAR) || 0;
        updates.disputeCreditNoteNumber = editCreditNoteNumber.trim() || undefined;
        updates.disputeAgreedReadingValue = editingDisputeReading.readingValue;
      } else if (editResolutionOutcome === 'compromise_reading') {
        const parsedAgreed = parseFloat(editAgreedReadingValue);
        updates.disputeAgreedReadingValue = !isNaN(parsedAgreed) ? parsedAgreed : editingDisputeReading.readingValue;
        updates.disputeSettledCreditZAR =
          parseFloat(editSettledCreditZAR) ||
          compromiseRecalculation?.cappedDisputeCostZAR ||
          0;
        updates.disputeAgreedConsumption = compromiseRecalculation?.physicalConsumption;
        updates.disputeCreditNoteNumber = editCreditNoteNumber.trim() || undefined;
      } else if (editResolutionOutcome === 'dispute_rejected') {
        updates.disputeSettledCreditZAR = 0;
        updates.disputeAgreedReadingValue = editingDisputeReading.disputedMunicipalReadingValue;
      }
    }

    updateMeterReadingDispute(rental.id, editingDisputeReading.id, updates);
    setSuccessToast(
      editDisputeStatus === 'Resolved'
        ? `Dispute successfully resolved (${
            editResolutionOutcome === 'accepted_actuals'
              ? 'Council Accepted Physical Reading'
              : editResolutionOutcome === 'credit_note_issued'
              ? 'Credit Note Settled'
              : editResolutionOutcome === 'compromise_reading'
              ? 'Compromise Reading Settled'
              : 'Dispute Rejected by Council'
          })`
        : `Dispute record updated to '${editDisputeStatus}'`
    );
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

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMeterRegistryOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition-colors cursor-pointer"
              title="View and configure registered meters for this property"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-600" />
              <span>Meters ({rental?.meterRegistry?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMuniDirectoryOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
              title="View central municipal directory contacts"
            >
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <span>Directory</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const firstDispute = activeDisputes[0];
                    setDisputeLetterReading(firstDispute || null);
                    setIsDisputeLetterModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Generate official dispute letter & download PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Dispute PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('disputes')}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors shrink-0 cursor-pointer"
                >
                  View Disputes →
                </button>
              </div>
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

          {/* SECTION 1: Log Manual Reading Form / Side-by-Side Dispute Comparison */}
          <div ref={formTopRef} className={`rounded-xl transition-all ${
            isDisputed
              ? 'bg-amber-50/40 border-2 border-amber-300 p-4 sm:p-5 shadow-xs'
              : 'bg-slate-50/70 border border-slate-200 p-4.5'
          } space-y-4`}>
            {!isDisputed ? (
              /* Standard Single Reading Entry Form */
              <>
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
                  {/* Property Meter Registry Quick Chips */}
                  {propertyMeters.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap p-2 bg-white/90 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0">
                        <Gauge className="w-3 h-3 text-cyan-600" />
                        <span>Registered Meters:</span>
                      </span>
                      {propertyMeters.map((m) => {
                        const isSelected = meterNumber.trim().toLowerCase() === m.meterNumber.toLowerCase();
                        const isSameUtil = m.utilityType === utilityType;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMeterNumber(m.meterNumber);
                              if (m.utilityType !== utilityType) {
                                setUtilityType(m.utilityType);
                              }
                            }}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-cyan-600 text-white border-cyan-600 font-bold shadow-2xs'
                                : isSameUtil
                                ? 'bg-cyan-50/70 text-cyan-900 border-cyan-300 hover:border-cyan-500 hover:bg-cyan-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                            title={`${m.utilityType === 'electricity' ? '⚡ Electricity' : '💧 Water'} • ${m.meterType}${m.location ? ` (${m.location})` : ''}${m.unitName ? ` [Unit ${m.unitName}]` : ''}`}
                          >
                            <span>{m.utilityType === 'electricity' ? '⚡' : '💧'}</span>
                            <span className="font-bold">#{m.meterNumber}</span>
                            {m.unitName && <span className="opacity-75">U:{m.unitName}</span>}
                            {m.location && <span className="opacity-75 text-[9px] font-sans">({m.location})</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Meter Number / Tag (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsMeterRegistryOpen(true)}
                          className="text-[10px] text-cyan-600 hover:text-cyan-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Manage property meter registry"
                        >
                          <Gauge className="w-2.5 h-2.5" />
                          <span>Meters ({propertyMeters.length})</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        name="meterNumber"
                        autoComplete="off"
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        placeholder={utilityType === 'electricity' ? 'e.g. 10003374' : 'e.g. 211001886'}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono"
                      />
                      {meterNumber.trim() && !propertyMeters.some((m) => m.meterNumber.toLowerCase() === meterNumber.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = meterNumber.trim();
                            addPropertyMeter(rental.id, {
                              meterNumber: trimmed,
                              utilityType,
                              meterType: 'sub_meter',
                              location: 'Added from manual reading',
                            });
                            setSuccessToast(`Saved meter #${trimmed} to Property Meter Registry`);
                            setTimeout(() => setSuccessToast(null), 3000);
                          }}
                          className="mt-1 text-[10px] font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer w-full justify-center"
                          title="Save this serial number to the property's meter registry"
                        >
                          <PlusCircle className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">+ Save #{meterNumber.trim()} to Registry</span>
                        </button>
                      )}
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
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                      />
                      <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Flag as Municipal Reading Dispute (Contest Council Estimate / Dial Error)</span>
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer bg-cyan-600 hover:bg-cyan-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Reading to Ledger</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Redesigned Side-by-Side Comparative Dispute Form */
              <form onSubmit={handleSaveReading} noValidate className="space-y-4">
                {/* Dispute Mode Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-100/80 border border-amber-300 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
                      <FileWarning className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Municipal Dispute Side-by-Side Comparison</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                          Active
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        Cross-reference your verified on-site physical meter dials directly against the council statement claim.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {/* Utility Type Picker */}
                    <div className="flex items-center gap-1 p-1 bg-white border border-amber-300 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setUtilityType('electricity')}
                        className={`flex items-center gap-1 py-1 px-2.5 rounded font-bold text-xs transition-all cursor-pointer ${
                          utilityType === 'electricity'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>Electricity</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUtilityType('water')}
                        className={`flex items-center gap-1 py-1 px-2.5 rounded font-bold text-xs transition-all cursor-pointer ${
                          utilityType === 'water'
                            ? 'bg-cyan-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Droplets className="w-3 h-3" />
                        <span>Water</span>
                      </button>
                    </div>

                    {/* Exit Dispute Button */}
                    <button
                      type="button"
                      onClick={() => setIsDisputed(false)}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Exit Dispute
                    </button>
                  </div>
                </div>

                {/* The 2-Column Side-by-Side Card Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* COLUMN 1: Your Verified On-Site Reading */}
                  <div className="p-4 bg-white border-2 border-emerald-400 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        <Gauge className="w-4 h-4 text-emerald-600" />
                        <span>1. Your Physical Reading (On-Site)</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Physical Dials
                      </span>
                    </div>

                    {/* Primary Physical Dial Reading Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        Your Physical Dial Reading ({unitLabel}) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required
                          value={readingValue}
                          onChange={(e) => setReadingValue(e.target.value)}
                          placeholder="e.g. 28260"
                          className="w-full pl-3 pr-14 py-2 border-2 border-emerald-500 rounded-lg text-sm bg-emerald-50/20 text-slate-950 font-mono font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-black text-emerald-800 font-mono">
                          {unitLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        The numeric counter/index physically observed on the meter enclosure dials.
                      </p>
                    </div>

                    {/* Registered Meters Quick Pick in Dispute Form */}
                    {propertyMeters.length > 0 && (
                      <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1">
                          <Gauge className="w-3 h-3 text-emerald-600" />
                          <span>Property Registered Meters:</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {propertyMeters.map((m) => {
                            const isSelected = meterNumber.trim().toLowerCase() === m.meterNumber.toLowerCase();
                            const isSameUtil = m.utilityType === utilityType;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setMeterNumber(m.meterNumber);
                                  if (m.utilityType !== utilityType) {
                                    setUtilityType(m.utilityType);
                                  }
                                }}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                                    : isSameUtil
                                    ? 'bg-white text-emerald-950 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100/50'
                                    : 'bg-white/70 text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                                title={`${m.utilityType === 'electricity' ? '⚡ Electricity' : '💧 Water'} • ${m.meterType}${m.location ? ` (${m.location})` : ''}${m.unitName ? ` [Unit ${m.unitName}]` : ''}`}
                              >
                                <span>{m.utilityType === 'electricity' ? '⚡' : '💧'}</span>
                                <span className="font-bold">#{m.meterNumber}</span>
                                {m.unitName && <span className="opacity-75">U:{m.unitName}</span>}
                                {m.location && <span className="opacity-75 text-[9px] font-sans">({m.location})</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Meter Serial # & Inspection Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Meter Serial # / Tag
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsMeterRegistryOpen(true)}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Manage property meter registry"
                          >
                            <Gauge className="w-2.5 h-2.5" />
                            <span>Meters ({propertyMeters.length})</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={meterNumber}
                          onChange={(e) => setMeterNumber(e.target.value)}
                          placeholder={utilityType === 'electricity' ? 'e.g. 10003374' : 'e.g. 211001886'}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        {meterNumber.trim() && !propertyMeters.some((m) => m.meterNumber.toLowerCase() === meterNumber.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = meterNumber.trim();
                              addPropertyMeter(rental.id, {
                                meterNumber: trimmed,
                                utilityType,
                                meterType: 'sub_meter',
                                location: 'Added from dispute form',
                              });
                              setSuccessToast(`Saved meter #${trimmed} to Property Meter Registry`);
                              setTimeout(() => setSuccessToast(null), 3000);
                            }}
                            className="mt-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer w-full justify-center"
                            title="Save this serial number to the property's meter registry"
                          >
                            <PlusCircle className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">+ Save #{meterNumber.trim()} to Registry</span>
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Physical Inspection Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={readingDate}
                          onChange={(e) => setReadingDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Photo Evidence URL & Reading Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-500" />
                          <span>Photo Vault URL</span>
                        </label>
                        <input
                          type="url"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          placeholder="https://photos.app.goo.gl/..."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Reading Type
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setReadingType('Actual')}
                            className={`py-1 text-center font-bold text-[10px] rounded transition-colors ${
                              readingType === 'Actual'
                                ? 'bg-emerald-700 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Actual (Dials)
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingType('Estimated')}
                            className={`py-1 text-center font-bold text-[10px] rounded transition-colors ${
                              readingType === 'Estimated'
                                ? 'bg-amber-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Estimate
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Physical Consumption Preview */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-800">
                          Physical Usage Delta:
                        </span>
                        {disputeImpact?.isRolloverOrInverted ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                              Dials &lt; Baseline
                            </span>
                            <strong className="font-mono text-amber-950 font-black">
                              0 {unitLabel}
                            </strong>
                          </div>
                        ) : calculatedConsumption !== undefined ? (
                          <strong className="font-mono text-emerald-950 font-black">
                            {calculatedConsumption >= 0 ? `+${calculatedConsumption.toLocaleString('en-ZA')}` : calculatedConsumption.toLocaleString('en-ZA')} {unitLabel}
                          </strong>
                        ) : (
                          <span className="text-[10px] text-slate-400">Enter reading to compute</span>
                        )}
                      </div>
                      {effectiveBaseline !== undefined && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Baseline: {effectiveBaseline.toLocaleString('en-ZA')} {unitLabel}{' '}
                          {statementExtractedReading
                            ? '(Statement Previous Index)'
                            : latestPriorReading
                            ? `(${formatDate(latestPriorReading.date)})`
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2: Contested Municipal Statement (Council Billed) */}
                  <div className="p-4 bg-amber-50/60 border-2 border-amber-300 rounded-xl space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wide">
                        <FileWarning className="w-4 h-4 text-amber-600" />
                        <span>2. Contested Municipal Bill (Council)</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                        Council Claim
                      </span>
                    </div>

                    {/* Contested Statement Picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
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

                    {/* Council Claimed Reading Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-amber-950">
                          Council Statement Reading ({unitLabel}) *
                        </label>
                        {statementExtractedReading ? (
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Auto-pulled from PDF
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-700 italic">
                            No dials on bill - manual
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required
                          value={disputedMunicipalReadingValue}
                          onChange={(e) => setDisputedMunicipalReadingValue(e.target.value)}
                          placeholder="What council statement showed"
                          className="w-full pl-3 pr-14 py-2 border-2 border-amber-400 rounded-lg text-sm bg-white text-slate-950 font-mono font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-black text-amber-800 font-mono">
                          {unitLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-900 mt-1">
                        The reading figure claimed on the council/Eskom invoice for this billing cycle.
                      </p>
                    </div>

                    {/* Statement Details Summary */}
                    {selectedStatement && (
                      <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Provider:</span>
                          <strong className="text-slate-800">{selectedStatement.provider}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Invoice Date:</span>
                          <strong className="text-slate-800">{formatDate(selectedStatement.statementDate)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Billed Utility Line Cost:</span>
                          <strong className="font-mono text-slate-900">{formatZAR(statementCost, { includeDecimals: true })}</strong>
                        </div>
                        {muniConsumption !== undefined && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                            <span className="text-amber-800 font-bold">Council Billed Usage:</span>
                            <strong className="font-mono text-amber-950 font-bold">+{muniConsumption} {unitLabel}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Dispute Discrepancy & Tracking Panel */}
                <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3">
                  {/* Live Discrepancy Calculation Banner */}
                  {liveConsumptionDiscrepancy !== undefined && (
                    <div className="p-3 bg-white rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                          Discrepancy Analysis (Council Claim vs Physical Actuals)
                        </span>
                        <div className="text-sm font-black font-mono text-amber-950">
                          {liveConsumptionDiscrepancy >= 0 ? `+${liveConsumptionDiscrepancy}` : liveConsumptionDiscrepancy} {unitLabel}{' '}
                          <span className="text-xs font-bold text-amber-800 font-sans">
                            ({liveConsumptionDiscrepancy >= 0 ? 'Council Over-Estimate' : 'Council Under-Estimate'})
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Disputed Rand Amount
                          </span>
                          {disputeImpact?.isCapped && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Capped at Statement Total
                            </span>
                          )}
                        </div>
                        <div className="text-base font-black font-mono text-emerald-800">
                          {formatZAR(manualEstimatedRand ? parseFloat(manualEstimatedRand) : autoDerivedRandImpact || 0, { includeDecimals: true })}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {disputeImpact?.isCapped
                            ? `Capped at statement line cost (${formatZAR(statementCost, { includeDecimals: true })})`
                            : `Derived at effective tariff R ${effectiveTariff.toFixed(2)}/${unitLabel}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rollover / Inverted Warning Callout */}
                  {disputeImpact?.isRolloverOrInverted && disputeImpact.warning && (
                    <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-amber-900">
                          Meter Reading Alert: Dials Lower Than Baseline
                        </span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          {disputeImpact.warning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ticket Reference, Status & Reason */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  </div>

                  {/* Lodged Date & Manual Rand Override */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        Manual Rand Impact Override (ZAR)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={manualEstimatedRand}
                          onChange={(e) => setManualEstimatedRand(e.target.value)}
                          placeholder={autoDerivedRandImpact !== undefined ? `Auto: ~R ${autoDerivedRandImpact.toFixed(2)}` : 'e.g. 450.00'}
                          className="w-full pl-6 pr-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
                      </div>
                    </div>
                  </div>

                  {/* Dispute Notes */}
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

                {/* Submit Buttons */}
                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsDisputed(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Cancel Dispute Mode
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const draftReading: MeterReading = {
                          id: 'draft-dispute',
                          createdAt: new Date().toISOString(),
                          utilityType,
                          date: readingDate,
                          readingValue: parseFloat(readingValue) || 0,
                          meterNumber: meterNumber || undefined,
                          source: 'manual',
                          readingType,
                          photoUrl: photoUrl || undefined,
                          isDisputed: true,
                          disputedStatementId: disputedStatementId || selectedStatement?.id,
                          disputedMunicipalReadingValue: parseFloat(disputedMunicipalReadingValue) || undefined,
                          disputeReferenceNumber: disputeReferenceNumber || undefined,
                          disputeReason,
                          disputeStatus,
                          disputeLodgedDate,
                          disputeResolutionNotes,
                        };
                        setDisputeLetterReading(draftReading);
                        setIsDisputeLetterModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Preview formal dispute letter & generate downloadable PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      <span>Generate Dispute Letter (PDF)</span>
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer bg-amber-600 hover:bg-amber-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save & Flag Municipal Dispute</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
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
                                  <div
                                    className={`mt-1 p-1.5 rounded-md border text-[10px] space-y-0.5 ${
                                      reading.disputeStatus === 'Resolved'
                                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                                        : 'bg-amber-100/70 border-amber-200 text-amber-950'
                                    }`}
                                  >
                                    <div className="font-bold flex items-center justify-between gap-1">
                                      <span className="flex items-center gap-1">
                                        {reading.disputeStatus === 'Resolved' && (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        )}
                                        <span>
                                          {reading.disputeStatus === 'Resolved'
                                            ? reading.disputeResolutionOutcome === 'accepted_actuals'
                                              ? 'Council Accepted Physical Reading'
                                              : reading.disputeResolutionOutcome === 'credit_note_issued'
                                              ? 'Credit Note Settled'
                                              : reading.disputeResolutionOutcome === 'compromise_reading'
                                              ? 'Compromise Settled'
                                              : reading.disputeResolutionOutcome === 'dispute_rejected'
                                              ? 'Dispute Rejected by Council (Original Bill Upheld)'
                                              : 'Council Accepted Physical Reading'
                                            : `Council: ${reading.disputedMunicipalReadingValue?.toLocaleString('en-ZA') ?? '—'} ${uLabel}`}
                                        </span>
                                      </span>
                                      {reading.disputeStatus === 'Resolved' ? (
                                        <span className="font-mono text-emerald-800 font-black">
                                          {reading.disputeResolutionOutcome === 'dispute_rejected'
                                            ? 'R 0.00'
                                            : `-${formatZAR(reading.disputeSettledCreditZAR ?? reading.disputeEstimatedRandImpactZAR ?? 0, { includeDecimals: true })}`}
                                        </span>
                                      ) : reading.disputeEstimatedRandImpactZAR !== undefined ? (
                                        <span className="font-mono text-emerald-800 font-black">
                                          ~{formatZAR(reading.disputeEstimatedRandImpactZAR, { includeDecimals: true })}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-[9px] text-slate-600">
                                      {reading.disputeStatus === 'Resolved' ? (
                                        <span>
                                          {reading.disputeAgreedReadingValue !== undefined && `Agreed: ${reading.disputeAgreedReadingValue.toLocaleString('en-ZA')} ${uLabel}`}
                                          {reading.disputeCreditNoteNumber && ` • CN #${reading.disputeCreditNoteNumber}`}
                                          {reading.disputeResolutionDate && ` • ${formatDate(reading.disputeResolutionDate)}`}
                                        </span>
                                      ) : (
                                        <span>
                                          Delta: {reading.disputeDifferenceConsumption !== undefined ? `${reading.disputeDifferenceConsumption > 0 ? '+' : ''}${reading.disputeDifferenceConsumption} ${uLabel}` : 'Contested'}
                                          {reading.disputeLodgedDate ? ` • Lodged ${formatDate(reading.disputeLodgedDate)}` : ''}
                                        </span>
                                      )}
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
                                {!reading.isDisputed && reading.source === 'pdf-extracted' && (
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateDisputeFromRow(reading)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer mr-0.5"
                                    title="Contest this council reading with verified physical dials"
                                  >
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>Dispute</span>
                                  </button>
                                )}
                                {reading.isDisputed && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDisputeLetterReading(reading);
                                        setIsDisputeLetterModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer mr-0.5"
                                      title="Generate official dispute letter & download PDF"
                                    >
                                      <FileText className="w-3 h-3 text-amber-700" />
                                      <span>Letter/PDF</span>
                                    </button>
                                    {reading.disputeStatus !== 'Resolved' && (
                                      <button
                                        type="button"
                                        onClick={() => openDisputeEditor(reading, true)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer mr-0.5"
                                        title="Record dispute resolution & council settlement"
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Resolve</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openDisputeEditor(reading, false)}
                                      className="p-1 text-slate-400 hover:text-amber-600 transition-colors rounded hover:bg-amber-50 cursor-pointer"
                                      title="Update dispute details / settlement"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
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

      {/* Edit / Resolve Dispute Modal Popover */}
      {editingDisputeReading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
                editDisputeStatus === 'Resolved'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {editDisputeStatus === 'Resolved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <FileWarning className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {editDisputeStatus === 'Resolved'
                      ? 'Record Municipal Dispute Resolution & Settlement'
                      : 'Update Municipal Dispute'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {editDisputeStatus === 'Resolved'
                      ? 'Reconcile agreed meter index and financial credit note'
                      : 'Manage query status and municipal council ticket'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDisputeReading(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDispute} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Context Summary */}
              <div className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">Date:</span> <strong>{formatDate(editingDisputeReading.date)}</strong>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-400">Physical Dials:</span>{' '}
                  <strong className="font-mono text-emerald-700">
                    {editingDisputeReading.readingValue.toLocaleString('en-ZA')}{' '}
                    {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}
                  </strong>
                </div>
                {editingDisputeReading.disputedMunicipalReadingValue !== undefined && (
                  <div>
                    <span className="text-slate-400">Council Claim:</span>{' '}
                    <strong className="font-mono text-amber-800">
                      {editingDisputeReading.disputedMunicipalReadingValue.toLocaleString('en-ZA')}{' '}
                      {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}
                    </strong>
                    {editingDisputeReading.disputeEstimatedRandImpactZAR !== undefined && (
                      <span className="ml-1 text-[10px] font-bold text-emerald-800 font-mono">
                        (~{formatZAR(editingDisputeReading.disputeEstimatedRandImpactZAR, { includeDecimals: true })})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status Picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Dispute Lifecycle Status *
                </label>
                <select
                  value={editDisputeStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as MeterDisputeStatus;
                    setEditDisputeStatus(newStatus);
                    if (newStatus === 'Resolved' && !editSettledCreditZAR) {
                      setEditSettledCreditZAR(
                        (editingDisputeReading.disputeEstimatedRandImpactZAR ?? '').toString()
                      );
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Open / Lodged">Open / Lodged (Awaiting Council Action)</option>
                  <option value="Under Investigation">Under Investigation (Technician Dispatched)</option>
                  <option value="Credit Note Pending">Credit Note Pending (Council Approved Adjustment)</option>
                  <option value="Resolved">Resolved (Settlement Agreed & Applied)</option>
                </select>
              </div>

              {/* RESOLUTION SECTION: Only active when Status === 'Resolved' */}
              {editDisputeStatus === 'Resolved' && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Settlement Outcome Type</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Choose Resolution
                    </span>
                  </div>

                  {/* 4 Outcome Selection Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 1. Accepted Actuals */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditResolutionOutcome('accepted_actuals');
                        setEditSettledCreditZAR(
                          (editingDisputeReading.disputeEstimatedRandImpactZAR ?? 0).toString()
                        );
                        setEditAgreedReadingValue(editingDisputeReading.readingValue.toString());
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        editResolutionOutcome === 'accepted_actuals'
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1. Council Accepted Physical Reading</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Council conceded error and adopted your physical reading ({editingDisputeReading.readingValue}{' '}
                        {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}) & full credit.
                      </p>
                    </button>

                    {/* 2. Lump-Sum Credit Note */}
                    <button
                      type="button"
                      onClick={() => setEditResolutionOutcome('credit_note_issued')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        editResolutionOutcome === 'credit_note_issued'
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-0.5">
                        <Receipt className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>2. Lump-Sum Credit Note</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Council granted a monetary credit against the account without altering meter dials.
                      </p>
                    </button>

                    {/* 3. Compromise Reading */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditResolutionOutcome('compromise_reading');
                        if (compromiseRecalculation) {
                          setEditSettledCreditZAR(compromiseRecalculation.cappedDisputeCostZAR.toString());
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        editResolutionOutcome === 'compromise_reading'
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-0.5">
                        <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>3. Compromise Reading</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Agreed on a revised reading index. System auto-recalculates usage & credit.
                      </p>
                    </button>

                    {/* 4. Dispute Rejected */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditResolutionOutcome('dispute_rejected');
                        setEditSettledCreditZAR('0');
                        setEditAgreedReadingValue(
                          (editingDisputeReading.disputedMunicipalReadingValue ?? '').toString()
                        );
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        editResolutionOutcome === 'dispute_rejected'
                          ? 'bg-white border-rose-500 ring-2 ring-rose-500 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 mb-0.5">
                        <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>4. Dispute Rejected by Council</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Council rejected dispute & upheld original bill. R 0.00 credit.
                      </p>
                    </button>
                  </div>

                  {/* Outcome Inputs & Live Recalculations */}
                  {editResolutionOutcome === 'accepted_actuals' && (
                    <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">Settled Reading Index:</span>
                        <strong className="font-mono text-emerald-900">
                          {editingDisputeReading.readingValue.toLocaleString('en-ZA')}{' '}
                          {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'} (Your Physical Log)
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-600">Settled Rand Credit from Council:</span>
                        <strong className="font-mono text-emerald-900 font-black">
                          {formatZAR(
                            parseFloat(editSettledCreditZAR) ||
                              editingDisputeReading.disputeEstimatedRandImpactZAR ||
                              0,
                            { includeDecimals: true }
                          )}
                        </strong>
                      </div>
                    </div>
                  )}

                  {editResolutionOutcome === 'credit_note_issued' && (
                    <div className="p-3 bg-white rounded-lg border border-cyan-200 space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Credit Note Amount (ZAR) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R</span>
                          <input
                            type="number"
                            step="any"
                            required
                            min="0"
                            value={editSettledCreditZAR}
                            onChange={(e) => setEditSettledCreditZAR(e.target.value)}
                            placeholder="e.g. 410.00"
                            className="w-full pl-6 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editResolutionOutcome === 'compromise_reading' && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Agreed Dial Reading ({editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0"
                          value={editAgreedReadingValue}
                          onChange={(e) => {
                            setEditAgreedReadingValue(e.target.value);
                          }}
                          placeholder="e.g. 1420"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {compromiseRecalculation && (
                        <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-950 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">Agreed Consumption:</span>
                            <strong className="font-mono text-indigo-900 font-bold">
                              +{compromiseRecalculation.physicalConsumption}{' '}
                              {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">Council Over-billed:</span>
                            <strong className="font-mono text-amber-800">
                              +{compromiseRecalculation.unitsDiscrepancy}{' '}
                              {editingDisputeReading.utilityType === 'electricity' ? 'kWh' : 'KL'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-200">
                            <span className="font-bold text-emerald-800">Recalculated Rand Credit:</span>
                            <strong className="font-mono text-emerald-900 font-black">
                              {formatZAR(compromiseRecalculation.cappedDisputeCostZAR, { includeDecimals: true })}
                            </strong>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Settled Credit Amount (ZAR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">R</span>
                          <input
                            type="number"
                            step="any"
                            value={editSettledCreditZAR}
                            onChange={(e) => setEditSettledCreditZAR(e.target.value)}
                            placeholder={
                              compromiseRecalculation
                                ? compromiseRecalculation.cappedDisputeCostZAR.toString()
                                : '0.00'
                            }
                            className="w-full pl-6 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editResolutionOutcome === 'dispute_rejected' && (
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Council Upheld Original Assessment</span>
                      </div>
                      <p className="text-[10px] text-rose-800 leading-relaxed">
                        Original municipal charge remains in full on tenant statement and owner ledger. Credit applied: R 0.00.
                      </p>
                    </div>
                  )}

                  {/* Resolution Details: Credit Note Ref & Resolution Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Council Credit Note / Reversal #
                      </label>
                      <input
                        type="text"
                        value={editCreditNoteNumber}
                        onChange={(e) => setEditCreditNoteNumber(e.target.value)}
                        placeholder="e.g. CN-ETH-2026-881"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Resolution Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={editResolutionDate}
                        onChange={(e) => setEditResolutionDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Council Reference / Ticket # */}
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

              {/* Resolution & Council Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Resolution & Council Notes
                </label>
                <textarea
                  rows={2}
                  value={editDisputeNotes}
                  onChange={(e) => setEditDisputeNotes(e.target.value)}
                  placeholder="e.g. Council technician confirmed meter reading. Credit note issued."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDisputeReading(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors ${
                    editDisputeStatus === 'Resolved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {editDisputeStatus === 'Resolved' ? 'Confirm Resolution' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      {isDisputeLetterModalOpen && rental && (
        <DisputeLetterModal
          property={rental}
          reading={disputeLetterReading}
          statement={selectedStatement}
          isOpen={isDisputeLetterModalOpen}
          onClose={() => {
            setIsDisputeLetterModalOpen(false);
            setDisputeLetterReading(null);
          }}
        />
      )}

      {isMeterRegistryOpen && rental && (
        <PropertyMeterRegistryModal
          property={rental}
          isOpen={isMeterRegistryOpen}
          onClose={() => setIsMeterRegistryOpen(false)}
          onSelectMeter={(num, type) => {
            setMeterNumber(num);
            setUtilityType(type);
            setIsMeterRegistryOpen(false);
          }}
        />
      )}

      {isMuniDirectoryOpen && (
        <MunicipalDirectoryModal
          isOpen={isMuniDirectoryOpen}
          onClose={() => setIsMuniDirectoryOpen(false)}
        />
      )}
    </div>
  );
}
