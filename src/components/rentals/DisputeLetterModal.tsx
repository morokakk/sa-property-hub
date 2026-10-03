'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FileText,
  Download,
  Mail,
  Copy,
  Check,
  Camera,
  AlertCircle,
  Building,
  Gauge,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  RentalProperty,
  MeterReading,
  UtilityStatement,
  DisputeLetterData,
  MunicipalContact,
} from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { downscaleImage, isHeicFile, DownscaleResult } from '@/lib/utils/imageDownscale';
import { generateDisputeLetterPdf, downloadDisputePdf } from '@/lib/pdf/generateDisputeLetterPdf';
import { buildConciseMailtoUrl, buildFullDisputeLetterText } from '@/lib/utils/disputeEmailHelper';
import MunicipalDirectoryModal from './MunicipalDirectoryModal';
import PropertyMeterRegistryModal from './PropertyMeterRegistryModal';

interface DisputeLetterModalProps {
  property: RentalProperty;
  reading?: MeterReading | null;
  statement?: UtilityStatement | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DisputeLetterModal({
  property,
  reading,
  statement,
  isOpen,
  onClose,
}: DisputeLetterModalProps) {
  const municipalDirectory = usePortfolioStore((state) => state.municipalDirectory);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);

  // Active view tab: 'editor' | 'preview'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Directory & Registry sub-modals
  const [isMuniDirectoryOpen, setIsMuniDirectoryOpen] = useState(false);
  const [isMeterRegistryOpen, setIsMeterRegistryOpen] = useState(false);

  // Auto-detect municipality from property address, city, or statement provider
  const defaultMunicipality = useMemo(() => {
    const textToMatch = `${statement?.provider || ''} ${property?.city || ''} ${property?.address || ''} ${property?.title || ''}`.toLowerCase();
    const match = municipalDirectory.find((m) => {
      const code = m.shortCode.toLowerCase();
      const name = m.municipalityName.toLowerCase();
      return (
        textToMatch.includes(code) ||
        (code === 'coj' && (textToMatch.includes('joburg') || textToMatch.includes('sandton') || textToMatch.includes('randburg'))) ||
        (code === 'cpt' && (textToMatch.includes('cape town') || textToMatch.includes('green point'))) ||
        (code === 'eth' && (textToMatch.includes('ethekwini') || textToMatch.includes('durban') || textToMatch.includes('umhlanga'))) ||
        (code === 'tsh' && (textToMatch.includes('tshwane') || textToMatch.includes('pretoria') || textToMatch.includes('centurion'))) ||
        (code === 'eku' && (textToMatch.includes('ekurhuleni') || textToMatch.includes('east rand'))) ||
        (code === 'plk' && textToMatch.includes('polokwane')) ||
        (code === 'man' && (textToMatch.includes('mangaung') || textToMatch.includes('bloemfontein'))) ||
        (code === 'nmb' && (textToMatch.includes('mandela') || textToMatch.includes('gqeberha') || textToMatch.includes('port elizabeth'))) ||
        name.split(' ').some((word) => word.length > 4 && textToMatch.includes(word))
      );
    });
    return match || municipalDirectory[0] || null;
  }, [municipalDirectory, property, statement]);

  // Form State
  const [selectedMuniId, setSelectedMuniId] = useState<string>('');
  const [municipalityName, setMunicipalityName] = useState<string>('');
  const [municipalityEmail, setMunicipalityEmail] = useState<string>('');
  const [letterDate, setLetterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billDate, setBillDate] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState<string>('');
  const [utilityType, setUtilityType] = useState<'electricity' | 'water'>('electricity');
  const [meterNumber, setMeterNumber] = useState<string>('');
  const [municipalReading, setMunicipalReading] = useState<string>('');
  const [physicalReading, setPhysicalReading] = useState<string>('');
  const [photoDate, setPhotoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [estimatedOverchargeZAR, setEstimatedOverchargeZAR] = useState<string>('');

  // Photographic Evidence State (100% Client-Side Downscaled)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFilename, setPhotoFilename] = useState<string>('');
  const [downscaledResult, setDownscaledResult] = useState<DownscaleResult | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Sender details
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');

  // UI Feedback Toasts
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const muni = defaultMunicipality;
      setSelectedMuniId(muni?.id || '');
      setMunicipalityName(muni?.municipalityName || '');
      setMunicipalityEmail(muni?.revenueEmail || '');

      setLetterDate(new Date().toISOString().split('T')[0]);
      setPropertyAddress(property?.address || '');
      setAccountNumber(statement?.accountNumber || property?.notes?.match(/acc(?:ount)?\s*#?:?\s*([A-Za-z0-9-]+)/i)?.[1] || '');
      setBillDate(statement?.statementDate || reading?.date || new Date().toISOString().split('T')[0]);

      const util = reading?.utilityType || 'electricity';
      setUtilityType(util);

      // Meter Number
      const detectedMeterNumber =
        reading?.meterNumber ||
        property?.meterRegistry?.find((m) => m.utilityType === util)?.meterNumber ||
        '';
      setMeterNumber(detectedMeterNumber);

      // Readings
      if (reading?.disputedMunicipalReadingValue !== undefined) {
        setMunicipalReading(reading.disputedMunicipalReadingValue.toString());
      } else {
        setMunicipalReading('');
      }

      if (reading?.readingValue !== undefined) {
        setPhysicalReading(reading.readingValue.toString());
      } else {
        setPhysicalReading('');
      }

      setPhotoDate(reading?.date || new Date().toISOString().split('T')[0]);

      if (reading?.disputeEstimatedRandImpactZAR !== undefined) {
        setEstimatedOverchargeZAR(reading.disputeEstimatedRandImpactZAR.toString());
      } else {
        setEstimatedOverchargeZAR('');
      }

      // Sender Info from Investor Profile
      setSenderName(investorProfile?.entityName || 'Property Owner');
      setSenderPhone(investorProfile?.contactNumber || '+27 —');
      setSenderEmail(investorProfile?.email || 'billing@propertyhub.co.za');

      // Reset photo state
      setPhotoFile(null);
      setPhotoFilename('');
      setDownscaledResult(null);
      setPhotoError(null);
    }
  }, [isOpen, reading, statement, property, defaultMunicipality, investorProfile]);

  // Handle municipality dropdown change
  const handleSelectMunicipality = (contact: MunicipalContact) => {
    setSelectedMuniId(contact.id);
    setMunicipalityName(contact.municipalityName);
    setMunicipalityEmail(contact.revenueEmail);
  };

  // Handle Photo File Selection & Client-Side Downscaling Pass
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 1. Guard against un-transcoded HEIC
    if (isHeicFile(file)) {
      setPhotoError(
        'HEIC format detected. Apple iPhones typically transcode to JPEG automatically when selected via standard camera picker. Please select a JPEG/PNG photo or ensure Camera Settings > Formats is set to "Most Compatible".'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPhotoFile(file);
    setPhotoFilename(file.name);
    setPhotoProcessing(true);

    try {
      // 2. Execute downscaling canvas pass: max 1600x1200 at 0.8 JPEG quality
      const result = await downscaleImage(file, 1600, 1200, 0.8);
      setDownscaledResult(result);
    } catch (err: any) {
      console.error('Image downscaling error:', err);
      setPhotoError(err.message || 'Failed to process and downscale image.');
      setDownscaledResult(null);
    } finally {
      setPhotoProcessing(false);
    }
  };

  // Live Discrepancy & Tariff
  const parsedMuni = parseFloat(municipalReading);
  const parsedPhys = parseFloat(physicalReading);
  const hasValidReadings = !isNaN(parsedMuni) && !isNaN(parsedPhys);
  const discrepancyUnits = hasValidReadings
    ? Math.round((parsedMuni - parsedPhys) * 1000) / 1000
    : undefined;

  const parsedRand = parseFloat(estimatedOverchargeZAR);
  const hasValidRand = !isNaN(parsedRand);

  // Construct DisputeLetterData object for PDF & Mailto
  const disputeData: DisputeLetterData = useMemo(() => {
    return {
      propertyTitle: property.title,
      propertyAddress: propertyAddress.trim() || property.address,
      municipalityName: municipalityName.trim() || 'Municipality Revenue Office',
      municipalityEmail: municipalityEmail.trim(),
      date: letterDate,
      accountNumber: accountNumber.trim(),
      billDate,
      utilityType,
      municipalReading: hasValidReadings ? parsedMuni : 0,
      physicalReading: hasValidReadings ? parsedPhys : 0,
      meterNumber: meterNumber.trim(),
      photoDate,
      photoFilename: photoFilename || undefined,
      photoBase64: downscaledResult?.dataUrl || undefined,
      photoBytes: downscaledResult?.uint8Array || undefined,
      discrepancyUnits,
      estimatedOverchargeZAR: hasValidRand ? parsedRand : undefined,
      referenceNumber: reading?.disputeReferenceNumber,
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      senderEmail: senderEmail.trim(),
    };
  }, [
    property,
    propertyAddress,
    municipalityName,
    municipalityEmail,
    letterDate,
    accountNumber,
    billDate,
    utilityType,
    hasValidReadings,
    parsedMuni,
    parsedPhys,
    meterNumber,
    photoDate,
    photoFilename,
    downscaledResult,
    discrepancyUnits,
    hasValidRand,
    parsedRand,
    reading?.disputeReferenceNumber,
    senderName,
    senderPhone,
    senderEmail,
  ]);

  if (!isOpen) return null;

  // 1-Click Generate & Download Client-Side PDF
  const handleDownloadPdf = async () => {
    setPdfGenerating(true);
    try {
      const pdfBytes = await generateDisputeLetterPdf(disputeData);
      const filename = `Dispute_Letter_${(property.title || 'Property').replace(/[^a-zA-Z0-9]/g, '_')}_${utilityType}_${accountNumber || 'Acc'}.pdf`;
      downloadDisputePdf(pdfBytes, filename);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert(`Failed to generate dispute PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  // 1-Click Copy Full Letter Text
  const handleCopyFullText = () => {
    const text = buildFullDisputeLetterText(disputeData);
    navigator.clipboard.writeText(text);
    setCopyToast('Full formal dispute letter copied to clipboard!');
    setTimeout(() => setCopyToast(null), 3500);
  };

  // 1-Click Copy Concise Email Text
  const handleCopyEmailBody = () => {
    const mailtoUrl = buildConciseMailtoUrl(disputeData);
    const bodyMatch = mailtoUrl.match(/body=([^&]+)/);
    const bodyText = bodyMatch ? decodeURIComponent(bodyMatch[1]) : '';
    navigator.clipboard.writeText(bodyText);
    setCopyToast('Concise email body copied to clipboard!');
    setTimeout(() => setCopyToast(null), 3500);
  };

  const mailtoUrl = buildConciseMailtoUrl(disputeData);
  const fullLetterText = buildFullDisputeLetterText(disputeData);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    Municipal Bill Dispute Letter & PDF Generator
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    100% Client-Side
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {property.title} • {accountNumber ? `Account #${accountNumber}` : property.address}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="px-5 py-2 border-b border-slate-200 bg-slate-100/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Dispute Parameters & Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Official Letter Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span>Annexure A Photo:</span>
              <span
                className={`font-bold ${
                  downscaledResult ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {downscaledResult ? 'Attached (2 Pages)' : 'None (1 Page)'}
              </span>
            </div>
          </div>

          {/* Toast Notification */}
          {copyToast && (
            <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copyToast}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'editor' ? (
              <div className="space-y-4">
                {/* 1. Municipality & Account Metadata */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Building className="w-4 h-4 text-amber-600" />
                      <span>Municipal Authority & Account Information</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsMuniDirectoryOpen(true)}
                      className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Central Municipal Directory ({municipalDirectory.length})</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Municipality Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select Municipality *
                      </label>
                      <select
                        value={selectedMuniId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedMuniId(val);
                          const found = municipalDirectory.find((m) => m.id === val);
                          if (found) {
                            setMunicipalityName(found.municipalityName);
                            setMunicipalityEmail(found.revenueEmail);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        {municipalDirectory.map((muni) => (
                          <option key={muni.id} value={muni.id}>
                            {muni.municipalityName} ({muni.shortCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Revenue Email */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Revenue Dispute Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={municipalityEmail}
                        onChange={(e) => setMunicipalityEmail(e.target.value)}
                        placeholder="regionbrevenue@joburg.org.za"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Municipal Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 500291048"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Property Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Physical Property Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={propertyAddress}
                        onChange={(e) => setPropertyAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Contested Bill Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Contested Bill Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Readings & Meter Discrepancy */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Gauge className="w-4 h-4 text-cyan-600" />
                      <span>Physical Meter Reading & Statement Discrepancy</span>
                    </h4>

                    <button
                      type="button"
                      onClick={() => setIsMeterRegistryOpen(true)}
                      className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Property Meter Registry ({property.meterRegistry?.length || 0})</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Utility Type */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Utility Type *
                      </label>
                      <select
                        value={utilityType}
                        onChange={(e) => setUtilityType(e.target.value as 'electricity' | 'water')}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      >
                        <option value="electricity">Electricity (kWh)</option>
                        <option value="water">Water (KL)</option>
                      </select>
                    </div>

                    {/* Meter Serial Number with Registry Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Meter Serial Number *
                      </label>
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          value={meterNumber}
                          onChange={(e) => setMeterNumber(e.target.value)}
                          placeholder="e.g. 10003374"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                        />
                        {property.meterRegistry && property.meterRegistry.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-slate-400">Pick registered:</span>
                            {property.meterRegistry
                              .filter((m) => m.utilityType === utilityType)
                              .map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setMeterNumber(m.meterNumber)}
                                  className="text-[10px] font-mono font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-1.5 py-0.2 rounded border border-cyan-200 cursor-pointer"
                                >
                                  #{m.meterNumber}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contested Municipal Reading */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Contested Council Dial *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={municipalReading}
                        onChange={(e) => setMunicipalReading(e.target.value)}
                        placeholder="e.g. 28410"
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Actual Physical Dial Reading */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Actual Physical Dial *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={physicalReading}
                        onChange={(e) => setPhysicalReading(e.target.value)}
                        placeholder="e.g. 28260"
                        className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Discrepancy & Rand Impact summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Calculated Discrepancy
                      </span>
                      <span className="text-sm font-mono font-black text-slate-800">
                        {discrepancyUnits !== undefined
                          ? `${discrepancyUnits > 0 ? '+' : ''}${discrepancyUnits.toLocaleString('en-ZA')} ${utilityType === 'electricity' ? 'kWh' : 'KL'}`
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Estimated Overcharge Amount (ZAR)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={estimatedOverchargeZAR}
                          onChange={(e) => setEstimatedOverchargeZAR(e.target.value)}
                          placeholder="e.g. 459.38"
                          className="w-full pl-6 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Photo Inspection Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Photographic Evidence (Canvas Downscaling Pass) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <Camera className="w-4 h-4 text-cyan-600" />
                      <span>Photographic Evidence (Annexure A - Direct PDF Embed)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Zero Supabase Upload • Auto-Downscaled to 1600×1200
                    </span>
                  </div>

                  {photoError && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-amber-900 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {!downscaledResult ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-100/60 transition-colors">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="meter-photo-input"
                      />
                      <label
                        htmlFor="meter-photo-input"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <div className="p-3 bg-cyan-50 text-cyan-700 rounded-full">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            Select or Capture Meter Photo
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            iPhone camera JPEG transcoding supported • Max 1600×1200 px downscaling pass
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold hover:bg-slate-50 shadow-2xs">
                          {photoProcessing ? 'Processing Image...' : 'Browse Image File'}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <img
                          src={downscaledResult.dataUrl}
                          alt="Meter preview"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {photoFilename}
                          </div>
                          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              Downscaled: {(downscaledResult.originalSizeBytes / (1024 * 1024)).toFixed(1)} MB →{' '}
                              {(downscaledResult.downscaledSizeBytes / 1024).toFixed(0)} KB ({downscaledResult.width}×{downscaledResult.height}px)
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Ready to embed directly onto Page 2 as Annexure A
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setDownscaledResult(null);
                            setPhotoFile(null);
                            setPhotoFilename('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Sender Details */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs">
                    Sender & Sign-Off Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Full Name & Surname *
                      </label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Contact Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-mono focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Live Text Preview of Formal Dispute Letter */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Verbatim Dispute Letter Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyFullText}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Letter Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyEmailBody}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email Body</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                  {fullLetterText}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFullText}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Copy full dispute text for manual pasting"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Letter</span>
              </button>

              <a
                href={mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Open default email client with concise URI-safe body"
              >
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                <span>Open in Email (mailto:)</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {pdfGenerating
                    ? 'Generating PDF...'
                    : downscaledResult
                    ? 'Download Dispute PDF (2 Pages)'
                    : 'Download Dispute PDF (1 Page)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Central Municipal Directory Modal */}
      <MunicipalDirectoryModal
        isOpen={isMuniDirectoryOpen}
        onClose={() => setIsMuniDirectoryOpen(false)}
        onSelectContact={handleSelectMunicipality}
      />

      {/* Property Meter Registry Modal */}
      <PropertyMeterRegistryModal
        property={property}
        isOpen={isMeterRegistryOpen}
        onClose={() => setIsMeterRegistryOpen(false)}
        onSelectMeter={(num, type) => {
          setMeterNumber(num);
          setUtilityType(type);
        }}
      />
    </>
  );
}
