'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Building,
  Sparkles,
  Zap,
  Droplets,
  Trash2,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
  ShieldCheck,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  RentalProperty,
  UtilityStatement,
  ExtractedRentalUnit,
  MeterReading,
  PropertyTitleType,
} from '@/types';
import { UnifiedParsedStatementResult, findMatchingRental } from '@/lib/utilities/pdfParser';
import { formatZAR, formatDate } from '@/lib/formatters';

export type VerificationStatementItem = UnifiedParsedStatementResult & { fileName?: string };

interface UnifiedPdfVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue?: VerificationStatementItem[];
  data?: VerificationStatementItem | null;
  onOpenTenantStatement?: (propertyId: string) => void;
}

export default function UnifiedPdfVerificationModal({
  isOpen,
  onClose,
  queue,
  data: singleData,
  onOpenTenantStatement,
}: UnifiedPdfVerificationModalProps) {
  const rentals = usePortfolioStore((state) => state.rentals);
  const addRental = usePortfolioStore((state) => state.addRental);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const addUtilityStatement = usePortfolioStore((state) => state.addUtilityStatement);

  const activeRentals = useMemo(() => rentals.filter((r) => r.status !== 'Sold'), [rentals]);

  const items: VerificationStatementItem[] = useMemo(() => {
    if (queue && queue.length > 0) return queue;
    if (singleData) return [singleData];
    return [];
  }, [queue, singleData]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemStatuses, setItemStatuses] = useState<Record<number, 'pending' | 'saved' | 'skipped'>>({});

  // Form State
  const [targetPropertyId, setTargetPropertyId] = useState<string>('__NEW__');
  const [propertyType, setPropertyType] = useState<PropertyTitleType>('Freehold House');
  const [manualPropertyAssignments, setManualPropertyAssignments] = useState<Record<number, string>>({});
  const [manualPropertyTypes, setManualPropertyTypes] = useState<Record<number, PropertyTitleType>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPropId, setSavedPropId] = useState<string>('');

  // Reset index and statuses when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setItemStatuses({});
      setManualPropertyAssignments({});
      setManualPropertyTypes({});
      setManualFinancials({});
      setMarketValueZAR(0);
      setPurchasePriceZAR(0);
      setSaveSuccess(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  const data = items[currentIndex] || null;

  // Editable Financial & Valuation Fields (cross-statement)
  const [marketValueZAR, setMarketValueZAR] = useState(0);
  const [purchasePriceZAR, setPurchasePriceZAR] = useState(0);
  const [manualFinancials, setManualFinancials] = useState<Record<number, { rent?: number; marketValue?: number; purchasePrice?: number }>>({});

  // Editable Agent Payout Fields
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [grossRentZAR, setGrossRentZAR] = useState(0);
  const [leviesZAR, setLeviesZAR] = useState(0);
  const [municipalRatesZAR, setMunicipalRatesZAR] = useState(0);
  const [agencyCommissionZAR, setAgencyCommissionZAR] = useState(0);
  const [depositHeldZAR, setDepositHeldZAR] = useState(0);
  const [bundledUtilitiesZAR, setBundledUtilitiesZAR] = useState<number | undefined>(undefined);

  // Editable Municipal Utility Fields
  const [accountNumber, setAccountNumber] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [electricityZAR, setElectricityZAR] = useState(0);
  const [waterZAR, setWaterZAR] = useState(0);
  const [refuseZAR, setRefuseZAR] = useState(0);
  const [sewerageZAR, setSewerageZAR] = useState(0);
  const [utilRatesZAR, setUtilRatesZAR] = useState(0);
  const [totalDueZAR, setTotalDueZAR] = useState(0);

  // Initialize and Auto-match on Data Change
  useEffect(() => {
    if (!data || !isOpen) return;

    setSaveSuccess(itemStatuses[currentIndex] === 'saved');
    setIsSaving(false);

    const docType = data.docType;

    // 1. Initial property type detection heuristic
    let defaultType: PropertyTitleType = 'Sectional Title Apartment';
    if (docType === 'municipal_utility') {
      const s = data.utilityStatement;
      const addr = (s?.propertyAddress || '').toLowerCase();
      const pName = (s?.propertyName || '').toLowerCase();
      const raw = (data.rawText || '').toLowerCase();

      // Signals of Sectional Scheme vs Freehold
      const isScheme =
        addr.includes('unit') ||
        addr.includes('ss ') ||
        addr.includes('sectional') ||
        addr.includes('flat') ||
        addr.includes('apartment') ||
        pName.includes('unit') ||
        pName.includes('ss ') ||
        (s?.bundledUtilitiesZAR !== undefined && s.bundledUtilitiesZAR > 0) ||
        raw.includes('sectional title') ||
        raw.includes('body corporate');

      const hasStand =
        addr.includes('stand') ||
        pName.includes('stand') ||
        raw.includes('category of property: property rates residential');

      if (!isScheme && (hasStand || addr.length > 5)) {
        defaultType = 'Freehold House';
      }
    } else if (docType === 'agent_payout') {
      defaultType = 'Sectional Title Apartment';
    }

    if (manualPropertyTypes[currentIndex]) {
      setPropertyType(manualPropertyTypes[currentIndex]);
    } else {
      setPropertyType(defaultType);
    }

    // 2. Set parsed statement line items
    if (docType === 'agent_payout' && data.agentUnit) {
      const u = data.agentUnit;
      setPropertyName(u.propertyName || '');
      setPropertyAddress(u.propertyAddress || u.address || '');
      setTenantName(u.tenantName || '');
      const rent = manualFinancials[currentIndex]?.rent ?? (u.grossRentZAR || 0);
      setGrossRentZAR(rent);
      setLeviesZAR(u.leviesZAR || 0);
      setMunicipalRatesZAR(u.municipalRatesZAR || 0);
      setAgencyCommissionZAR(u.agencyCommissionZAR || 0);
      setDepositHeldZAR(u.depositHeldZAR || 0);
      const estMarket = Math.round((u.grossRentZAR || 7000) * 120);
      const estPurchase = Math.round((u.grossRentZAR || 7000) * 110);
      setMarketValueZAR(manualFinancials[currentIndex]?.marketValue ?? estMarket);
      setPurchasePriceZAR(manualFinancials[currentIndex]?.purchasePrice ?? estPurchase);
      if (data.utilityStatement?.bundledUtilitiesZAR !== undefined) {
        setBundledUtilitiesZAR(data.utilityStatement.bundledUtilitiesZAR);
      } else {
        setBundledUtilitiesZAR(undefined);
      }
    } else if (docType === 'municipal_utility' && data.utilityStatement) {
      const s = data.utilityStatement;
      setAccountNumber(s.accountNumber || '');
      setBillingPeriod(s.billingPeriod || '');
      setStatementDate(s.statementDate || '');
      setElectricityZAR(s.electricityZAR || 0);
      setWaterZAR(s.waterZAR || 0);
      setRefuseZAR(s.refuseZAR || 0);
      setSewerageZAR(s.sewerageZAR || 0);
      setUtilRatesZAR(s.propertyRatesZAR || 0);
      setTotalDueZAR(s.totalDueZAR || 0);
      setPropertyName(s.propertyName || '');
      setPropertyAddress(s.propertyAddress || '');
      setGrossRentZAR(manualFinancials[currentIndex]?.rent ?? 0);
      setMarketValueZAR(manualFinancials[currentIndex]?.marketValue ?? (s.municipalValuationZAR || 0));
      setPurchasePriceZAR(manualFinancials[currentIndex]?.purchasePrice ?? 0);
    }

    // 3. Match Target Property
    if (manualPropertyAssignments[currentIndex]) {
      setTargetPropertyId(manualPropertyAssignments[currentIndex]);
      const manuallySelected = activeRentals.find((r) => r.id === manualPropertyAssignments[currentIndex]);
      if (manuallySelected?.propertyType && !manualPropertyTypes[currentIndex]) {
        setPropertyType(manuallySelected.propertyType);
      }
    } else {
      const matched = findMatchingRental(data, activeRentals);
      if (matched) {
        setTargetPropertyId(matched.id);
        if (matched.propertyType) {
          setPropertyType(matched.propertyType);
        }
      } else {
        setTargetPropertyId('__NEW__');
      }
    }
  }, [data, isOpen, activeRentals, currentIndex, manualPropertyAssignments, manualPropertyTypes, manualFinancials, itemStatuses]);

  const handleTargetPropertyChange = (newTargetId: string) => {
    setTargetPropertyId(newTargetId);
    setManualPropertyAssignments((prev) => ({ ...prev, [currentIndex]: newTargetId }));
    if (newTargetId !== '__NEW__') {
      const selected = activeRentals.find((r) => r.id === newTargetId);
      if (selected?.propertyType) {
        setPropertyType(selected.propertyType);
        setManualPropertyTypes((prev) => ({ ...prev, [currentIndex]: selected.propertyType! }));
      }
    }
  };

  const handlePropertyTypeChange = (pt: PropertyTitleType) => {
    setPropertyType(pt);
    setManualPropertyTypes((prev) => ({ ...prev, [currentIndex]: pt }));
  };

  const handleRentChange = (val: number) => {
    setGrossRentZAR(val);
    setManualFinancials((prev) => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], rent: val },
    }));
  };

  const handleMarketValueChange = (val: number) => {
    setMarketValueZAR(val);
    setManualFinancials((prev) => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], marketValue: val },
    }));
  };

  const handlePurchasePriceChange = (val: number) => {
    setPurchasePriceZAR(val);
    setManualFinancials((prev) => ({
      ...prev,
      [currentIndex]: { ...prev[currentIndex], purchasePrice: val },
    }));
  };

  if (!isOpen || !data) return null;

  const isAgentPayout = data.docType === 'agent_payout';
  const matchedRental = activeRentals.find((r) => r.id === targetPropertyId);
  const isNewProperty = targetPropertyId === '__NEW__';

  const handleConfirmAndSync = (advanceAfterSave: boolean = false) => {
    setIsSaving(true);
    let finalPropId = targetPropertyId;

    try {
      if (isAgentPayout) {
        if (isNewProperty) {
          const newId = `rental-pdf-${Date.now()}`;
          finalPropId = newId;
          let detectedCity = 'Gauteng';
          if (propertyAddress) {
            const parts = propertyAddress.split(',').map((p) => p.trim());
            if (parts.length >= 3) {
              detectedCity = parts[2] || parts[1] || 'Gauteng';
            } else if (parts.length === 2) {
              detectedCity = parts[1];
            }
          }

          const newRental: RentalProperty = {
            id: newId,
            title: propertyName || 'New Rental Property',
            address: propertyAddress || `${propertyName}, South Africa`,
            city: detectedCity,
            propertyType,
            source: data.provider === 'iGrow Rentals' ? 'iGrow Rentals' : 'Private Agent',
            marketValueZAR: marketValueZAR > 0 ? marketValueZAR : Math.round((grossRentZAR || 7000) * 120),
            purchasePriceZAR: purchasePriceZAR > 0 ? purchasePriceZAR : Math.round((grossRentZAR || 7000) * 110),
            purchaseDate: new Date().toISOString().split('T')[0],
            outstandingBondBalanceZAR: 0,
            bondInterestRatePercent: 11.5,
            monthlyBondPaymentZAR: 0,
            tenantName: tenantName || 'Tenant Unassigned',
            tenantPhone: '+27 —',
            tenantEmail: 'pending@tenant.co.za',
            leaseStartDate: new Date().toISOString().split('T')[0],
            leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositHeldZAR: depositHeldZAR || 0,
            annualEscalationPercent: 6,
            managementType: 'Agency',
            agencyName: data.provider || 'Managing Agent',
            agencyCommissionPercent: grossRentZAR > 0 ? Number(((agencyCommissionZAR / grossRentZAR) * 100).toFixed(1)) : 8,
            agencyVatApplicable: data.provider === 'iGrow Rentals' || Boolean(data.agentUnit?.isCommissionInclusiveOfVat) ? false : true,
            monthlyGrossRentZAR: grossRentZAR || 0,
            monthlyLeviesZAR: leviesZAR || 0,
            monthlyRatesTaxesZAR: municipalRatesZAR || 0,
            monthlyAgentFeeZAR: Math.round(agencyCommissionZAR || 0),
            monthlyMaintenanceReserveZAR: Math.round((grossRentZAR || 0) * 0.05),
            status: 'Occupied',
            maintenanceHistory: [],
            utilityStatements: data.utilityStatement ? [data.utilityStatement] : [],
          };
          addRental(newRental);
        } else {
          // Update existing rental
          const updates: Partial<RentalProperty> = {
            monthlyGrossRentZAR: grossRentZAR,
            monthlyLeviesZAR: leviesZAR,
            monthlyRatesTaxesZAR: municipalRatesZAR,
            monthlyAgentFeeZAR: Math.round(agencyCommissionZAR),
          };
          if (grossRentZAR > 0 && agencyCommissionZAR > 0) {
            updates.agencyCommissionPercent = Number(((agencyCommissionZAR / grossRentZAR) * 100).toFixed(1));
          }
          if (data.provider === 'iGrow Rentals' || Boolean(data.agentUnit?.isCommissionInclusiveOfVat)) {
            updates.agencyVatApplicable = false;
          }
          if (tenantName) updates.tenantName = tenantName;
          if (depositHeldZAR > 0) updates.depositHeldZAR = depositHeldZAR;
          if (data.provider) updates.agencyName = data.provider;

          updateRental(targetPropertyId, updates);

          // If statement also contains bundled utility recovery, append statement
          if (data.utilityStatement) {
            addUtilityStatement(targetPropertyId, {
              ...data.utilityStatement,
              bundledUtilitiesZAR: bundledUtilitiesZAR ?? data.utilityStatement.bundledUtilitiesZAR,
              propertyRatesZAR: municipalRatesZAR,
              totalDueZAR: (bundledUtilitiesZAR || 0) + (municipalRatesZAR || 0),
            });
          }
        }
      } else {
        // Municipal Utility Bill (CoJ / Eskom)
        const fallbackParsedVia = data.utilityStatement?.parsedVia || 'regex-fallback';
        const updatedUtilStatement: UtilityStatement = {
          ...(data.utilityStatement || {
            id: `util-${Date.now()}`,
            statementDate: statementDate || new Date().toISOString().split('T')[0],
            provider: data.provider,
            electricityZAR,
            waterZAR,
            refuseZAR,
            sewerageZAR,
            propertyRatesZAR: utilRatesZAR,
            totalDueZAR,
            parsedVia: fallbackParsedVia,
            createdAt: new Date().toISOString(),
          }),
          accountNumber,
          billingPeriod,
          statementDate,
          electricityZAR,
          waterZAR,
          refuseZAR,
          sewerageZAR,
          propertyRatesZAR: utilRatesZAR,
          totalDueZAR,
          propertyName,
          propertyAddress,
          municipalValuationZAR: data.utilityStatement?.municipalValuationZAR || (marketValueZAR > 0 ? marketValueZAR : undefined),
          parsedVia: fallbackParsedVia,
        };

        if (isNewProperty) {
          const newId = `rental-util-${Date.now()}`;
          finalPropId = newId;

          let detectedCity = 'Johannesburg';
          if (propertyAddress) {
            const parts = propertyAddress.split(',').map((p) => p.trim());
            if (parts.length >= 3) {
              detectedCity = parts[2] || parts[1] || 'Gauteng';
            } else if (parts.length === 2) {
              detectedCity = parts[1];
            }
          }

          const newRental: RentalProperty = {
            id: newId,
            title: propertyName || `${data.provider} Property`,
            address: propertyAddress || `${data.provider} Location, South Africa`,
            city: detectedCity,
            propertyType,
            source: 'Private Agent',
            marketValueZAR: marketValueZAR || 0,
            purchasePriceZAR: purchasePriceZAR || 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            outstandingBondBalanceZAR: 0,
            bondInterestRatePercent: 11.5,
            monthlyBondPaymentZAR: 0,
            tenantName: 'Tenant Unassigned',
            tenantPhone: '+27 —',
            tenantEmail: 'pending@tenant.co.za',
            leaseStartDate: new Date().toISOString().split('T')[0],
            leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            depositHeldZAR: 0,
            annualEscalationPercent: 6,
            monthlyGrossRentZAR: grossRentZAR || 0,
            monthlyLeviesZAR: 0,
            monthlyRatesTaxesZAR: utilRatesZAR,
            monthlyAgentFeeZAR: 0,
            monthlyMaintenanceReserveZAR: Math.round((grossRentZAR || 0) * 0.05),
            status: 'Occupied',
            maintenanceHistory: [],
            utilityStatements: [updatedUtilStatement],
            meterReadings: updatedUtilStatement.extractedMeterReadings?.map((emr) => ({
              id: `mr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              date: emr.date,
              utilityType: emr.utilityType,
              readingValue: emr.readingValue,
              previousReadingValue: emr.previousReadingValue,
              consumption: emr.consumption,
              meterNumber: emr.meterNumber,
              readingType: emr.readingType,
              source: 'pdf-extracted' as const,
              createdAt: new Date().toISOString(),
            })) || [],
          };
          addRental(newRental);
        } else {
          // Update existing rental rates and append statement + meter readings
          const updates: Partial<RentalProperty> = {};
          if (utilRatesZAR > 0) {
            updates.monthlyRatesTaxesZAR = utilRatesZAR;
          }
          if (updatedUtilStatement.municipalValuationZAR && updatedUtilStatement.municipalValuationZAR > 0) {
            const matched = activeRentals.find((r) => r.id === targetPropertyId);
            if (matched && (!matched.marketValueZAR || matched.marketValueZAR === 0 || matched.marketValueZAR === 900000)) {
              updates.marketValueZAR = updatedUtilStatement.municipalValuationZAR;
            }
          }
          if (Object.keys(updates).length > 0) {
            updateRental(targetPropertyId, updates);
          }
          addUtilityStatement(targetPropertyId, updatedUtilStatement);
        }
      }

      setSavedPropId(finalPropId);
      setSaveSuccess(true);
      setItemStatuses((prev) => ({ ...prev, [currentIndex]: 'saved' }));

      if (advanceAfterSave) {
        if (currentIndex < items.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setTimeout(() => {
            onClose();
          }, 500);
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setItemStatuses((prev) => ({ ...prev, [currentIndex]: 'skipped' }));
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const isCurrentSaved = itemStatuses[currentIndex] === 'saved';
  const savedCount = Object.values(itemStatuses).filter((s) => s === 'saved').length;
  const allDone =
    items.length > 0 &&
    items.every((_, idx) => itemStatuses[idx] !== undefined && itemStatuses[idx] !== 'pending');

  const displayName = isNewProperty
    ? propertyName || 'New Property'
    : matchedRental?.title || 'Selected Property';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold tracking-tight">
                  Verify PDF Statement Details
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {data.provider}
                </span>
                {items.length > 1 && (
                  <span className="text-[11px] font-semibold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
                    {currentIndex + 1} of {items.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {items.length > 1 && data.fileName ? `${data.fileName} • ` : ''}
                {isAgentPayout
                  ? 'Managing Agent Statement: Review rent, levies, rates, and tenant details.'
                  : 'Municipal Utility Bill: Review charges and extracted meter readings.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Queue Tabs (rendered when multiple PDFs in queue) */}
        {items.length > 1 && (
          <div className="bg-slate-950 px-3 sm:px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              {items.map((item, idx) => {
                const status = itemStatuses[idx] || 'pending';
                const isCurrent = idx === currentIndex;
                const tabTitle =
                  item.fileName ||
                  item.utilityStatement?.propertyName ||
                  item.agentUnit?.propertyName ||
                  item.provider ||
                  `Statement ${idx + 1}`;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="opacity-70 text-[10px]">#{idx + 1}</span>
                    <span className="max-w-[130px] truncate" title={tabTitle}>
                      {tabTitle}
                    </span>
                    {status === 'saved' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Saved
                      </span>
                    )}
                    {status === 'skipped' && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        Skipped
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Pending" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 shrink-0">
              Batch: {savedCount}/{items.length} saved
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Property Target & Match Status Banner */}
          <div className={`p-3.5 rounded-xl border space-y-3 ${
            isNewProperty
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            {/* Status text */}
            <div className="flex items-start gap-2.5">
              {isNewProperty ? (
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">
                  {isNewProperty
                    ? '✨ New Rental Property Will Be Created'
                    : `✓ Matches Existing Property: ${matchedRental?.title}`}
                </span>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isNewProperty
                    ? `No existing rental matches "${propertyName}". It will be onboarded as a new unit.`
                    : 'Financials will update this rental and append to its historical ledger.'}
                </p>
              </div>
            </div>

            {/* Controls row — stacks on mobile, side-by-side on sm+ */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Target Property Select Override */}
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Assign to Rental
                </label>
                <select
                  value={targetPropertyId}
                  onChange={(e) => handleTargetPropertyChange(e.target.value)}
                  className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="__NEW__" className="text-purple-700 font-bold">
                    ✨ + Create New Rental Property
                  </option>
                  {activeRentals.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type Selector — shown only for new properties */}
              {isNewProperty && (
                <div className="sm:w-64 shrink-0">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Property Type
                  </label>
                  <div className="flex gap-1">
                    {(['Freehold House', 'Sectional Title Apartment', 'Townhouse / Cluster'] as const).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handlePropertyTypeChange(pt)}
                        className={`flex-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                          propertyType === pt
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                        }`}
                      >
                        {pt === 'Freehold House' ? '🏠 Freehold' : pt === 'Sectional Title Apartment' ? '🏢 Sectional' : '🏘️ Townhouse'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields: Managing Agent Payout */}
          {isAgentPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property / Complex Name *
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. The Blyde 402"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property Address
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. Bronkhorstspruit Road, Pretoria"
                  />
                </div>
              </div>

              {/* Financial Metrics Grid */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Extracted Financial Line Items (ZAR)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Gross Rent (Billed)
                    </label>
                    <input
                      type="number"
                      value={grossRentZAR}
                      onChange={(e) => setGrossRentZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Body Corp Levies
                    </label>
                    <input
                      type="number"
                      value={leviesZAR}
                      onChange={(e) => setLeviesZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Rates & Taxes (Owner)
                    </label>
                    <input
                      type="number"
                      value={municipalRatesZAR}
                      onChange={(e) => setMunicipalRatesZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Agency Fee (incl VAT)
                    </label>
                    <input
                      type="number"
                      value={agencyCommissionZAR}
                      onChange={(e) => setAgencyCommissionZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bundled Utilities row if present (iGrow statements) */}
                {bundledUtilitiesZAR !== undefined && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">
                        Water, Sewerage, Refuse & Common (Bundled Recovery)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Billed to tenant on unmetered statement
                      </span>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={bundledUtilitiesZAR}
                        onChange={(e) => setBundledUtilitiesZAR(Number(e.target.value) || 0)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-emerald-800 text-right focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tenant Details & Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tenant Full Name
                  </label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Trust Deposit Held (ZAR)
                  </label>
                  <input
                    type="number"
                    value={depositHeldZAR}
                    onChange={(e) => setDepositHeldZAR(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-semibold px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Fields: Municipal Utility Bill (CoJ / Eskom) */}
          {!isAgentPayout && (
            <div className="space-y-4">
              {/* Property / Complex Name & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property / Complex Name {isNewProperty && '*'}
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. 100 Seventh Street, Parkmore"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property Address / Stand
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. 100 Seventh Street, Parkmore (Stand 000840)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. 555021234"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Billing Period
                  </label>
                  <input
                    type="text"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. April 2025"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Statement Date
                  </label>
                  <input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* New Property Financials — shown when creating from utility bill */}
              {isNewProperty && (
                <div className="bg-purple-50/70 rounded-xl p-4 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                      New Property Financials
                    </span>
                    {data.utilityStatement?.municipalValuationZAR ? (
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                        ✓ Municipal Valuation Extracted (R {data.utilityStatement.municipalValuationZAR.toLocaleString()})
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Gross Monthly Rent (ZAR)
                      </label>
                      <input
                        type="number"
                        value={grossRentZAR}
                        onChange={(e) => handleRentChange(Number(e.target.value) || 0)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Market Value (ZAR)
                      </label>
                      <input
                        type="number"
                        value={marketValueZAR}
                        onChange={(e) => handleMarketValueChange(Number(e.target.value) || 0)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                        Purchase Price (ZAR)
                      </label>
                      <input
                        type="number"
                        value={purchasePriceZAR}
                        onChange={(e) => handlePurchasePriceChange(Number(e.target.value) || 0)}
                        className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Utility Line Items Grid */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Municipal Line Item Charges (ZAR)
                  </span>
                  {!isNewProperty && data.utilityStatement?.municipalValuationZAR ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      CoJ Municipal Valuation: R {data.utilityStatement.municipalValuationZAR.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Electricity
                    </label>
                    <input
                      type="number"
                      value={electricityZAR}
                      onChange={(e) => setElectricityZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Water
                    </label>
                    <input
                      type="number"
                      value={waterZAR}
                      onChange={(e) => setWaterZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Refuse
                    </label>
                    <input
                      type="number"
                      value={refuseZAR}
                      onChange={(e) => setRefuseZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Sewerage
                    </label>
                    <input
                      type="number"
                      value={sewerageZAR}
                      onChange={(e) => setSewerageZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Municipal Rates & Taxes (Owner)
                    </label>
                    <input
                      type="number"
                      value={utilRatesZAR}
                      onChange={(e) => setUtilRatesZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Total Invoice Due
                    </label>
                    <input
                      type="number"
                      value={totalDueZAR}
                      onChange={(e) => setTotalDueZAR(Number(e.target.value) || 0)}
                      className="w-full text-xs font-mono font-black px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Extracted Meter Readings list */}
              {data.utilityStatement?.extractedMeterReadings && data.utilityStatement.extractedMeterReadings.length > 0 && (
                <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-cyan-900 block">
                    Auto-Extracted Meter Readings ({data.utilityStatement.extractedMeterReadings.length})
                  </span>
                  <div className="space-y-1">
                    {data.utilityStatement.extractedMeterReadings.map((mr, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-cyan-950 font-mono bg-white p-2 rounded border border-cyan-100">
                        <span>
                          {mr.utilityType.toUpperCase()} (Meter #{mr.meterNumber || '—'}): {mr.previousReadingValue ?? '—'} → {mr.readingValue}
                        </span>
                        <span className="font-bold text-emerald-700">
                          +{mr.consumption ?? 0} {mr.utilityType === 'electricity' ? 'kWh' : 'KL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-semibold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Successfully {isNewProperty ? 'created and synced' : 'updated'} {displayName}!
                </span>
              </div>
              {onOpenTenantStatement && (
                <button
                  type="button"
                  onClick={() => onOpenTenantStatement(savedPropId)}
                  className="inline-flex items-center gap-1 text-emerald-950 font-bold underline cursor-pointer"
                >
                  <span>Open Tenant Statement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {allDone ? 'Close' : 'Cancel All'}
            </button>

            {items.length > 1 && !isCurrentSaved && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSaving}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                Skip This Statement
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {items.length > 1 ? (
              isCurrentSaved ? (
                currentIndex < items.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Statement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish ({savedCount}/{items.length} Saved)</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmAndSync(true)}
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Syncing...'
                      : currentIndex < items.length - 1
                      ? `Save & Next (${currentIndex + 1}/${items.length})`
                      : 'Save & Finish'}
                  </span>
                </button>
              )
            ) : !saveSuccess ? (
              <button
                type="button"
                onClick={() => handleConfirmAndSync(false)}
                disabled={isSaving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Syncing to Portfolio...'
                    : isNewProperty
                    ? 'Confirm & Create New Rental'
                    : 'Confirm & Update Property'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Close Verification</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
