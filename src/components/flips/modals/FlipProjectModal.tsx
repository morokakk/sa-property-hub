'use client';

import React, { useState, useEffect } from 'react';
import { FlipProject, PropertyTitleType, CloudDriveVault } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { parseRentalPdfStatement } from '@/lib/utilities/pdfParser';
import {
  Edit3,
  Hammer,
  FileText,
  CheckCircle2,
  Landmark,
  Scale,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface FlipProjectModalProps {
  isOpen: boolean;
  editingFlip?: FlipProject | null;
  onClose: () => void;
  onSave?: (payload: Partial<FlipProject>, isNew: boolean) => void;
  // Controlled props for Phase 4A backward compatibility with page.tsx
  editingFlipId?: string | null;
  setEditingFlipId?: (id: string | null) => void;
  flipTitle?: string;
  setFlipTitle?: (v: string) => void;
  flipAddress?: string;
  setFlipAddress?: (v: string) => void;
  flipCity?: string;
  setFlipCity?: (v: string) => void;
  flipPropertyType?: PropertyTitleType;
  setFlipPropertyType?: (v: PropertyTitleType) => void;
  flipAgmDate?: string;
  setFlipAgmDate?: (v: string) => void;
  flipPurchasePrice?: number;
  setFlipPurchasePrice?: (v: number) => void;
  flipAcquisitionCosts?: number;
  setFlipAcquisitionCosts?: (v: number) => void;
  flipRenovationBudget?: number;
  setFlipRenovationBudget?: (v: number) => void;
  flipEstimatedDuration?: number;
  setFlipEstimatedDuration?: (v: number) => void;
  flipBondPayment?: number;
  setFlipBondPayment?: (v: number) => void;
  flipLevies?: number;
  setFlipLevies?: (v: number) => void;
  flipRates?: number;
  setFlipRates?: (v: number) => void;
  flipOtherHoldingCost?: number;
  setFlipOtherHoldingCost?: (v: number) => void;
  flipTargetExit?: number;
  setFlipTargetExit?: (v: number) => void;
  flipExitCommissionPercent?: number;
  setFlipExitCommissionPercent?: (v: number) => void;
  flipCompletionDate?: string;
  setFlipCompletionDate?: (v: string) => void;
  flipTaxEntityType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  setFlipTaxEntityType?: (v: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax') => void;
  flipSec118Arrears?: number;
  setFlipSec118Arrears?: (v: number) => void;
  flipAdvanceDeposit?: number;
  setFlipAdvanceDeposit?: (v: number) => void;
  flipRccStatus?: NonNullable<FlipProject['municipalClearance']>['rccStatus'];
  setFlipRccStatus?: (v: NonNullable<FlipProject['municipalClearance']>['rccStatus']) => void;
  flipRccAppDate?: string;
  setFlipRccAppDate?: (v: string) => void;
  flipDisputeNotes?: string;
  setFlipDisputeNotes?: (v: string) => void;
  flipMasterFolderUrl?: string;
  setFlipMasterFolderUrl?: (v: string) => void;
  flipOtpUrl?: string;
  setFlipOtpUrl?: (v: string) => void;
  flipRatesBillUrl?: string;
  setFlipRatesBillUrl?: (v: string) => void;
  flipTitleDeedUrl?: string;
  setFlipTitleDeedUrl?: (v: string) => void;
  pdfParseNotice?: string | null;
  setPdfParseNotice?: (v: string | null) => void;
  extractedValuationZAR?: number | null;
  setExtractedValuationZAR?: (v: number | null) => void;
  isParsingPdf?: boolean;
  onPdfSelected?: (files: File[]) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const FlipProjectModal: React.FC<FlipProjectModalProps> = ({
  isOpen,
  editingFlip,
  onClose,
  onSave,
  editingFlipId: propEditingFlipId,
  setEditingFlipId: propSetEditingFlipId,
  flipTitle: propFlipTitle,
  setFlipTitle: propSetFlipTitle,
  flipAddress: propFlipAddress,
  setFlipAddress: propSetFlipAddress,
  flipCity: propFlipCity,
  setFlipCity: propSetFlipCity,
  flipPropertyType: propFlipPropertyType,
  setFlipPropertyType: propSetFlipPropertyType,
  flipAgmDate: propFlipAgmDate,
  setFlipAgmDate: propSetFlipAgmDate,
  flipPurchasePrice: propFlipPurchasePrice,
  setFlipPurchasePrice: propSetFlipPurchasePrice,
  flipAcquisitionCosts: propFlipAcquisitionCosts,
  setFlipAcquisitionCosts: propSetFlipAcquisitionCosts,
  flipRenovationBudget: propFlipRenovationBudget,
  setFlipRenovationBudget: propSetFlipRenovationBudget,
  flipEstimatedDuration: propFlipEstimatedDuration,
  setFlipEstimatedDuration: propSetFlipEstimatedDuration,
  flipBondPayment: propFlipBondPayment,
  setFlipBondPayment: propSetFlipBondPayment,
  flipLevies: propFlipLevies,
  setFlipLevies: propSetFlipLevies,
  flipRates: propFlipRates,
  setFlipRates: propSetFlipRates,
  flipOtherHoldingCost: propFlipOtherHoldingCost,
  setFlipOtherHoldingCost: propSetFlipOtherHoldingCost,
  flipTargetExit: propFlipTargetExit,
  setFlipTargetExit: propSetFlipTargetExit,
  flipExitCommissionPercent: propFlipExitCommissionPercent,
  setFlipExitCommissionPercent: propSetFlipExitCommissionPercent,
  flipCompletionDate: propFlipCompletionDate,
  setFlipCompletionDate: propSetFlipCompletionDate,
  flipTaxEntityType: propFlipTaxEntityType,
  setFlipTaxEntityType: propSetFlipTaxEntityType,
  flipSec118Arrears: propFlipSec118Arrears,
  setFlipSec118Arrears: propSetFlipSec118Arrears,
  flipAdvanceDeposit: propFlipAdvanceDeposit,
  setFlipAdvanceDeposit: propSetFlipAdvanceDeposit,
  flipRccStatus: propFlipRccStatus,
  setFlipRccStatus: propSetFlipRccStatus,
  flipRccAppDate: propFlipRccAppDate,
  setFlipRccAppDate: propSetFlipRccAppDate,
  flipDisputeNotes: propFlipDisputeNotes,
  setFlipDisputeNotes: propSetFlipDisputeNotes,
  flipMasterFolderUrl: propFlipMasterFolderUrl,
  setFlipMasterFolderUrl: propSetFlipMasterFolderUrl,
  flipOtpUrl: propFlipOtpUrl,
  setFlipOtpUrl: propSetFlipOtpUrl,
  flipRatesBillUrl: propFlipRatesBillUrl,
  setFlipRatesBillUrl: propSetFlipRatesBillUrl,
  flipTitleDeedUrl: propFlipTitleDeedUrl,
  setFlipTitleDeedUrl: propSetFlipTitleDeedUrl,
  pdfParseNotice: propPdfParseNotice,
  setPdfParseNotice: propSetPdfParseNotice,
  extractedValuationZAR: propExtractedValuationZAR,
  setExtractedValuationZAR: propSetExtractedValuationZAR,
  isParsingPdf: propIsParsingPdf,
  onPdfSelected: propOnPdfSelected,
  onSubmit: propOnSubmit,
}) => {
  const investorProfile = usePortfolioStore((s) => s.investorProfile);
  const aiSettings = usePortfolioStore((s) => s.aiSettings);
  const addFlipStore = usePortfolioStore((s) => s.addFlip);
  const updateFlipStore = usePortfolioStore((s) => s.updateFlip);

  // Local state fallbacks
  const [localTitle, setLocalTitle] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [localCity, setLocalCity] = useState('Cape Town');
  const [localPropertyType, setLocalPropertyType] = useState<PropertyTitleType>('Freehold House');
  const [localAgmDate, setLocalAgmDate] = useState('');
  const [localPurchasePrice, setLocalPurchasePrice] = useState<number>(2500000);
  const [localAcquisitionCosts, setLocalAcquisitionCosts] = useState<number>(185000);
  const [localRenovationBudget, setLocalRenovationBudget] = useState<number>(450000);
  const [localEstimatedDuration, setLocalEstimatedDuration] = useState<number>(6);
  const [localBondPayment, setLocalBondPayment] = useState<number>(9500);
  const [localLevies, setLocalLevies] = useState<number>(0);
  const [localRates, setLocalRates] = useState<number>(3500);
  const [localOtherHoldingCost, setLocalOtherHoldingCost] = useState<number>(2000);
  const [localTargetExit, setLocalTargetExit] = useState<number>(3800000);
  const [localExitCommissionPercent, setLocalExitCommissionPercent] = useState<number>(5.75);
  const [localCompletionDate, setLocalCompletionDate] = useState('');
  const [localTaxEntityType, setLocalTaxEntityType] = useState<'Company (27%)' | 'Individual (45%)' | 'Pre-Tax'>('Company (27%)');
  const [localSec118Arrears, setLocalSec118Arrears] = useState<number>(0);
  const [localAdvanceDeposit, setLocalAdvanceDeposit] = useState<number>(0);
  const [localRccStatus, setLocalRccStatus] = useState<NonNullable<FlipProject['municipalClearance']>['rccStatus']>('Pending Application');
  const [localRccAppDate, setLocalRccAppDate] = useState('');
  const [localDisputeNotes, setLocalDisputeNotes] = useState('');
  const [localMasterFolderUrl, setLocalMasterFolderUrl] = useState('');
  const [localOtpUrl, setLocalOtpUrl] = useState('');
  const [localRatesBillUrl, setLocalRatesBillUrl] = useState('');
  const [localTitleDeedUrl, setLocalTitleDeedUrl] = useState('');
  const [localPdfParseNotice, setLocalPdfParseNotice] = useState<string | null>(null);
  const [localExtractedValuation, setLocalExtractedValuation] = useState<number | null>(null);
  const [localIsParsingPdf, setLocalIsParsingPdf] = useState(false);

  useEffect(() => {
    if (editingFlip && isOpen && propFlipTitle === undefined) {
      setLocalTitle(editingFlip.title);
      setLocalAddress(editingFlip.address);
      setLocalCity(editingFlip.city);
      setLocalPurchasePrice(editingFlip.purchasePriceZAR);
      setLocalAcquisitionCosts(editingFlip.acquisitionCostsZAR);
      setLocalRenovationBudget(editingFlip.baselineRenovationBudgetZAR);
      setLocalEstimatedDuration(editingFlip.estimatedDurationMonths ?? 6);

      const existingHolding = editingFlip.monthlyHoldingCostZAR ?? 15000;
      const bond = editingFlip.monthlyBondPaymentZAR !== undefined ? editingFlip.monthlyBondPaymentZAR : Math.round(existingHolding * 0.6);
      const levies = editingFlip.propertyType === 'Freehold House' ? 0 : (editingFlip.monthlyLeviesZAR !== undefined ? editingFlip.monthlyLeviesZAR : Math.round(existingHolding * 0.15));
      const rates = editingFlip.monthlyRatesTaxesZAR !== undefined ? editingFlip.monthlyRatesTaxesZAR : Math.round(existingHolding * 0.15);
      const other = editingFlip.monthlyOtherHoldingCostZAR !== undefined ? editingFlip.monthlyOtherHoldingCostZAR : Math.max(0, existingHolding - (bond + levies + rates));

      setLocalBondPayment(bond);
      setLocalLevies(levies);
      setLocalRates(rates);
      setLocalOtherHoldingCost(other);
      setLocalTargetExit(editingFlip.targetExitPriceZAR);
      setLocalExitCommissionPercent(editingFlip.exitCommissionPercent ?? 5.75);
      setLocalCompletionDate(editingFlip.targetCompletionDate);
      setLocalTaxEntityType(editingFlip.taxEntityType || investorProfile?.defaultTaxEntityType || 'Company (27%)');
      setLocalSec118Arrears(editingFlip.municipalClearance?.sec118ArrearsZAR || 0);
      setLocalAdvanceDeposit(editingFlip.municipalClearance?.advanceCouncilDepositZAR || 0);
      setLocalRccStatus(editingFlip.municipalClearance?.rccStatus || 'Pending Application');
      setLocalRccAppDate(editingFlip.municipalClearance?.rccApplicationDate || '');
      setLocalDisputeNotes(editingFlip.municipalClearance?.disputeNotes || '');
      setLocalPropertyType(editingFlip.propertyType || 'Freehold House');
      setLocalAgmDate(editingFlip.agmDate || '');
      setLocalMasterFolderUrl(editingFlip.driveVault?.masterFolderUrl || '');
      setLocalOtpUrl(editingFlip.driveVault?.otpDocumentUrl || '');
      setLocalRatesBillUrl(editingFlip.driveVault?.ratesBillUrl || '');
      setLocalTitleDeedUrl(editingFlip.driveVault?.titleDeedUrl || '');
      setLocalPdfParseNotice(null);
      setLocalExtractedValuation(null);
    } else if (!editingFlip && isOpen && propFlipTitle === undefined) {
      setLocalTitle('');
      setLocalAddress('');
      setLocalCity('Cape Town');
      setLocalPurchasePrice(2500000);
      setLocalAcquisitionCosts(185000);
      setLocalRenovationBudget(450000);
      setLocalEstimatedDuration(6);
      setLocalBondPayment(9500);
      setLocalLevies(0);
      setLocalRates(3500);
      setLocalOtherHoldingCost(2000);
      setLocalTargetExit(3800000);
      setLocalExitCommissionPercent(5.75);
      setLocalCompletionDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setLocalTaxEntityType(investorProfile?.defaultTaxEntityType || 'Company (27%)');
      setLocalSec118Arrears(0);
      setLocalAdvanceDeposit(0);
      setLocalRccStatus('Pending Application');
      setLocalRccAppDate(new Date().toISOString().split('T')[0]);
      setLocalDisputeNotes('');
      setLocalPropertyType('Freehold House');
      setLocalAgmDate('');
      setLocalMasterFolderUrl('');
      setLocalOtpUrl('');
      setLocalRatesBillUrl('');
      setLocalTitleDeedUrl('');
      setLocalPdfParseNotice(null);
      setLocalExtractedValuation(null);
    }
  }, [editingFlip, isOpen, propFlipTitle, investorProfile]);

  const flipTitle = propFlipTitle !== undefined ? propFlipTitle : localTitle;
  const setFlipTitle = propSetFlipTitle || setLocalTitle;
  const flipAddress = propFlipAddress !== undefined ? propFlipAddress : localAddress;
  const setFlipAddress = propSetFlipAddress || setLocalAddress;
  const flipCity = propFlipCity !== undefined ? propFlipCity : localCity;
  const setFlipCity = propSetFlipCity || setLocalCity;
  const flipPropertyType = propFlipPropertyType !== undefined ? propFlipPropertyType : localPropertyType;
  const setFlipPropertyType = propSetFlipPropertyType || setLocalPropertyType;
  const flipAgmDate = propFlipAgmDate !== undefined ? propFlipAgmDate : localAgmDate;
  const setFlipAgmDate = propSetFlipAgmDate || setLocalAgmDate;
  const flipPurchasePrice = propFlipPurchasePrice !== undefined ? propFlipPurchasePrice : localPurchasePrice;
  const setFlipPurchasePrice = propSetFlipPurchasePrice || setLocalPurchasePrice;
  const flipAcquisitionCosts = propFlipAcquisitionCosts !== undefined ? propFlipAcquisitionCosts : localAcquisitionCosts;
  const setFlipAcquisitionCosts = propSetFlipAcquisitionCosts || setLocalAcquisitionCosts;
  const flipRenovationBudget = propFlipRenovationBudget !== undefined ? propFlipRenovationBudget : localRenovationBudget;
  const setFlipRenovationBudget = propSetFlipRenovationBudget || setLocalRenovationBudget;
  const flipEstimatedDuration = propFlipEstimatedDuration !== undefined ? propFlipEstimatedDuration : localEstimatedDuration;
  const setFlipEstimatedDuration = propSetFlipEstimatedDuration || setLocalEstimatedDuration;
  const flipBondPayment = propFlipBondPayment !== undefined ? propFlipBondPayment : localBondPayment;
  const setFlipBondPayment = propSetFlipBondPayment || setLocalBondPayment;
  const flipLevies = propFlipLevies !== undefined ? propFlipLevies : localLevies;
  const setFlipLevies = propSetFlipLevies || setLocalLevies;
  const flipRates = propFlipRates !== undefined ? propFlipRates : localRates;
  const setFlipRates = propSetFlipRates || setLocalRates;
  const flipOtherHoldingCost = propFlipOtherHoldingCost !== undefined ? propFlipOtherHoldingCost : localOtherHoldingCost;
  const setFlipOtherHoldingCost = propSetFlipOtherHoldingCost || setLocalOtherHoldingCost;
  const flipTargetExit = propFlipTargetExit !== undefined ? propFlipTargetExit : localTargetExit;
  const setFlipTargetExit = propSetFlipTargetExit || setLocalTargetExit;
  const flipExitCommissionPercent = propFlipExitCommissionPercent !== undefined ? propFlipExitCommissionPercent : localExitCommissionPercent;
  const setFlipExitCommissionPercent = propSetFlipExitCommissionPercent || setLocalExitCommissionPercent;
  const flipCompletionDate = propFlipCompletionDate !== undefined ? propFlipCompletionDate : localCompletionDate;
  const setFlipCompletionDate = propSetFlipCompletionDate || setLocalCompletionDate;
  const flipTaxEntityType = propFlipTaxEntityType !== undefined ? propFlipTaxEntityType : localTaxEntityType;
  const setFlipTaxEntityType = propSetFlipTaxEntityType || setLocalTaxEntityType;
  const flipSec118Arrears = propFlipSec118Arrears !== undefined ? propFlipSec118Arrears : localSec118Arrears;
  const setFlipSec118Arrears = propSetFlipSec118Arrears || setLocalSec118Arrears;
  const flipAdvanceDeposit = propFlipAdvanceDeposit !== undefined ? propFlipAdvanceDeposit : localAdvanceDeposit;
  const setFlipAdvanceDeposit = propSetFlipAdvanceDeposit || setLocalAdvanceDeposit;
  const flipRccStatus = propFlipRccStatus !== undefined ? propFlipRccStatus : localRccStatus;
  const setFlipRccStatus = propSetFlipRccStatus || setLocalRccStatus;
  const flipRccAppDate = propFlipRccAppDate !== undefined ? propFlipRccAppDate : localRccAppDate;
  const setFlipRccAppDate = propSetFlipRccAppDate || setLocalRccAppDate;
  const flipDisputeNotes = propFlipDisputeNotes !== undefined ? propFlipDisputeNotes : localDisputeNotes;
  const setFlipDisputeNotes = propSetFlipDisputeNotes || setLocalDisputeNotes;
  const flipMasterFolderUrl = propFlipMasterFolderUrl !== undefined ? propFlipMasterFolderUrl : localMasterFolderUrl;
  const setFlipMasterFolderUrl = propSetFlipMasterFolderUrl || setLocalMasterFolderUrl;
  const flipOtpUrl = propFlipOtpUrl !== undefined ? propFlipOtpUrl : localOtpUrl;
  const setFlipOtpUrl = propSetFlipOtpUrl || setLocalOtpUrl;
  const flipRatesBillUrl = propFlipRatesBillUrl !== undefined ? propFlipRatesBillUrl : localRatesBillUrl;
  const setFlipRatesBillUrl = propSetFlipRatesBillUrl || setLocalRatesBillUrl;
  const flipTitleDeedUrl = propFlipTitleDeedUrl !== undefined ? propFlipTitleDeedUrl : localTitleDeedUrl;
  const setFlipTitleDeedUrl = propSetFlipTitleDeedUrl || setLocalTitleDeedUrl;
  const pdfParseNotice = propPdfParseNotice !== undefined ? propPdfParseNotice : localPdfParseNotice;
  const setPdfParseNotice = propSetPdfParseNotice || setLocalPdfParseNotice;
  const extractedValuationZAR = propExtractedValuationZAR !== undefined ? propExtractedValuationZAR : localExtractedValuation;
  const setExtractedValuationZAR = propSetExtractedValuationZAR || setLocalExtractedValuation;
  const isParsingPdf = propIsParsingPdf !== undefined ? propIsParsingPdf : localIsParsingPdf;

  const isEditing = Boolean(propEditingFlipId !== undefined ? propEditingFlipId : editingFlip);

  if (!isOpen) return null;

  const handleClose = () => {
    if (propSetEditingFlipId) propSetEditingFlipId(null);
    setPdfParseNotice(null);
    setExtractedValuationZAR(null);
    onClose();
  };

  const handlePdfUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (propOnPdfSelected) {
      propOnPdfSelected(files);
      return;
    }

    setLocalIsParsingPdf(true);
    setPdfParseNotice(null);

    try {
      let combinedRates = 0;
      let combinedLevies = 0;
      let combinedUtilities = 0;
      let detectedTitle = '';
      let detectedAddress = '';
      let detectedCity = '';
      let detectedPropType: PropertyTitleType | undefined = undefined;
      let detectedValuation = 0;

      for (const file of files) {
        const parsed = await parseRentalPdfStatement(file, aiSettings);
        if (!parsed.success) continue;

        if (parsed.docType === 'municipal_utility' && parsed.utilityStatement) {
          const u = parsed.utilityStatement;
          if (u.propertyName && !detectedTitle) detectedTitle = u.propertyName;
          if (u.propertyAddress && !detectedAddress) detectedAddress = u.propertyAddress;
          if (u.propertyRatesZAR && u.propertyRatesZAR > 0) {
            combinedRates = Math.max(combinedRates, u.propertyRatesZAR);
          }
          if (u.municipalValuationZAR && u.municipalValuationZAR > 0) {
            detectedValuation = Math.max(detectedValuation, u.municipalValuationZAR);
          }
          const standingUtils = (u.electricityZAR || 0) + (u.waterZAR || 0);
          if (standingUtils > 0) {
            combinedUtilities += standingUtils;
          }
          const addr = (u.propertyAddress || '').toLowerCase();
          const pName = (u.propertyName || '').toLowerCase();
          const isScheme =
            addr.includes('unit') ||
            addr.includes('ss ') ||
            addr.includes('flat') ||
            addr.includes('apartment') ||
            pName.includes('unit') ||
            pName.includes('ss ');
          if (!isScheme && (addr.includes('stand') || pName.includes('stand') || addr.length > 5)) {
            detectedPropType = 'Freehold House';
          }
        } else if (parsed.docType === 'agent_payout' && parsed.agentUnit) {
          const a = parsed.agentUnit;
          if (a.propertyName && !detectedTitle) detectedTitle = a.propertyName;
          if (a.propertyAddress && !detectedAddress) detectedAddress = a.propertyAddress;
          if (a.leviesZAR && a.leviesZAR > 0) {
            combinedLevies = Math.max(combinedLevies, a.leviesZAR);
          }
          if (a.municipalRatesZAR && a.municipalRatesZAR > 0) {
            combinedRates = Math.max(combinedRates, a.municipalRatesZAR);
          }
          detectedPropType = 'Sectional Title Apartment';
        }
      }

      if (detectedAddress) {
        const parts = detectedAddress.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          detectedCity = parts[2] || parts[1];
        } else if (parts.length === 2) {
          detectedCity = parts[1];
        }
      }
      if (!detectedCity && detectedAddress.toLowerCase().includes('johannesburg')) {
        detectedCity = 'Johannesburg';
      }

      if (detectedTitle) setFlipTitle(detectedTitle);
      if (detectedAddress) setFlipAddress(detectedAddress);
      if (detectedCity) setFlipCity(detectedCity);
      if (detectedPropType) setFlipPropertyType(detectedPropType);
      if (combinedRates > 0) setFlipRates(Math.round(combinedRates));
      if (combinedLevies > 0) setFlipLevies(Math.round(combinedLevies));
      if (combinedUtilities > 0) setFlipOtherHoldingCost(Math.round(combinedUtilities));
      if (detectedValuation > 0) setExtractedValuationZAR(detectedValuation);

      const noticeParts = [];
      if (detectedTitle) noticeParts.push(`"${detectedTitle}"`);
      if (combinedRates > 0) noticeParts.push(`Rates: R${combinedRates.toLocaleString()}/m`);
      if (combinedLevies > 0) noticeParts.push(`Levies: R${combinedLevies.toLocaleString()}/m`);
      if (combinedUtilities > 0) noticeParts.push(`Standing Utilities: R${combinedUtilities.toLocaleString()}/m`);
      if (detectedValuation > 0) noticeParts.push(`Municipal Valuation: R${detectedValuation.toLocaleString()}`);

      setPdfParseNotice(`✓ Extracted from ${files.length} statement(s): ${noticeParts.join(' • ')}`);
    } catch (err) {
      console.error('Failed to parse statement for flip:', err);
    } finally {
      setLocalIsParsingPdf(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    if (!flipTitle.trim()) return;

    const isScheme = flipPropertyType === 'Sectional Title Apartment' || flipPropertyType === 'Townhouse / Cluster';
    const finalLevies = flipPropertyType === 'Freehold House' ? 0 : Number(flipLevies);
    const totalMonthlyHolding = Number(flipBondPayment) + finalLevies + Number(flipRates) + Number(flipOtherHoldingCost);
    const updatedDriveVault: CloudDriveVault = {
      masterFolderUrl: flipMasterFolderUrl.trim() || undefined,
      otpDocumentUrl: flipOtpUrl.trim() || undefined,
      ratesBillUrl: flipRatesBillUrl.trim() || undefined,
      titleDeedUrl: flipTitleDeedUrl.trim() || undefined,
    };

    const municipalClearanceData = {
      sec118ArrearsZAR: Number(flipSec118Arrears) || 0,
      advanceCouncilDepositZAR: Number(flipAdvanceDeposit) || 0,
      rccStatus: flipRccStatus,
      rccApplicationDate: flipRccAppDate.trim() || undefined,
      disputeNotes: flipDisputeNotes.trim() || undefined,
    };

    const payload: Partial<FlipProject> = {
      title: flipTitle,
      address: flipAddress || `${flipCity} Project`,
      city: flipCity,
      propertyType: flipPropertyType,
      agmDate: isScheme && flipAgmDate ? flipAgmDate : undefined,
      purchasePriceZAR: Number(flipPurchasePrice),
      acquisitionCostsZAR: Number(flipAcquisitionCosts),
      baselineRenovationBudgetZAR: Number(flipRenovationBudget),
      estimatedDurationMonths: Number(flipEstimatedDuration),
      monthlyHoldingCostZAR: totalMonthlyHolding,
      monthlyBondPaymentZAR: Number(flipBondPayment),
      monthlyLeviesZAR: finalLevies,
      monthlyRatesTaxesZAR: Number(flipRates),
      monthlyOtherHoldingCostZAR: Number(flipOtherHoldingCost),
      targetExitPriceZAR: Number(flipTargetExit),
      exitCommissionPercent: Number(flipExitCommissionPercent),
      targetCompletionDate: flipCompletionDate,
      taxEntityType: flipTaxEntityType,
      municipalClearance: municipalClearanceData,
      driveVault: updatedDriveVault,
      municipalValuationZAR: extractedValuationZAR || undefined,
    };

    if (onSave) {
      onSave(payload, !isEditing);
    } else {
      if (isEditing && editingFlip) {
        updateFlipStore(editingFlip.id, payload);
      } else {
        const createdFlip: FlipProject = {
          id: `flip-${Date.now()}`,
          title: flipTitle,
          address: flipAddress || `${flipCity} Project`,
          city: flipCity,
          propertyType: flipPropertyType,
          agmDate: isScheme && flipAgmDate ? flipAgmDate : undefined,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePriceZAR: Number(flipPurchasePrice),
          acquisitionCostsZAR: Number(flipAcquisitionCosts),
          baselineRenovationBudgetZAR: Number(flipRenovationBudget),
          estimatedDurationMonths: Number(flipEstimatedDuration),
          monthlyHoldingCostZAR: totalMonthlyHolding,
          monthlyBondPaymentZAR: Number(flipBondPayment),
          monthlyLeviesZAR: finalLevies,
          monthlyRatesTaxesZAR: Number(flipRates),
          monthlyOtherHoldingCostZAR: Number(flipOtherHoldingCost),
          municipalValuationZAR: extractedValuationZAR || undefined,
          targetExitPriceZAR: Number(flipTargetExit),
          exitCommissionPercent: Number(flipExitCommissionPercent),
          targetCompletionDate: flipCompletionDate,
          taxEntityType: flipTaxEntityType,
          municipalClearance: municipalClearanceData,
          drawSchedule: {
            depositPaid: false,
            firstFixApproved: false,
            finishesApproved: false,
            retentionReleased: false,
          },
          currentPhase: 'Acquisition & Conveyancing',
          linkedFundingIds: [],
          fundingRequiredZAR: Math.round((Number(flipPurchasePrice) + Number(flipAcquisitionCosts) + Number(flipRenovationBudget)) * 0.7),
          capitalRaisedZAR: 0,
          promisedReturnType: 'Fixed Interest',
          promisedReturnRatePercent: 14.0,
          promisedPayoutSchedule: 'Monthly Interest',
          securityOffered: '2nd Mortgage Bond registered over title deed',
          status: 'Active',
          driveVault: updatedDriveVault,
          boq: [],
        };
        addFlipStore(createdFlip);
      }
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Buy-and-Flip Parameters</span>
              </>
            ) : (
              <>
                <Hammer className="w-5 h-5 text-indigo-600" />
                <span>Scaffold New Buy-and-Flip Project</span>
              </>
            )}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Auto-fill from PDF statement button / dropzone */}
        <div className="relative mb-3">
          <input
            type="file"
            id="flip-pdf-upload-modal"
            accept=".pdf"
            multiple
            className="hidden"
            disabled={isParsingPdf}
            onChange={(e) => {
              const files = Array.from(e.target.files || []).slice(0, 3);
              if (files.length > 0) handlePdfUpload(files);
            }}
          />
          <label
            htmlFor="flip-pdf-upload-modal"
            className="flex items-center justify-between p-3 bg-purple-50/70 hover:bg-purple-100/70 border border-dashed border-purple-300 rounded-xl cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-950 block group-hover:text-purple-700">
                  Auto-fill from Municipal or Levy Statement (PDF)
                </span>
                <span className="text-[10px] text-purple-600">
                  Upload CoJ, Eskom, or Body Corporate bill to extract address, carrying costs & valuation
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-purple-700 px-2 py-1 rounded border border-purple-200 shrink-0">
              {isParsingPdf ? 'Parsing...' : 'Upload PDF'}
            </span>
          </label>
        </div>

        {pdfParseNotice && (
          <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-medium">{pdfParseNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              name="projectName"
              autoComplete="off"
              required
              placeholder="e.g. Camps Bay Sunset Redesign"
              value={flipTitle}
              onChange={(e) => setFlipTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                name="propertyAddress"
                autoComplete="off"
                placeholder="e.g. 18 Victoria Road"
                value={flipAddress}
                onChange={(e) => setFlipAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                name="propertyCity"
                autoComplete="off"
                value={flipCity}
                onChange={(e) => setFlipCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Property Title Type & Body Corporate AGM Section */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Property Title Type
                </label>
                <span className="text-[10px] text-slate-500">STSMA & Governance Classification</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'Freehold House', label: '🏡 Freehold House' },
                    { id: 'Townhouse / Cluster', label: '🏘️ Townhouse / Cluster' },
                    { id: 'Sectional Title Apartment', label: '🏢 Sectional Title' },
                    { id: 'Multi-unit Commercial', label: '🏬 Commercial' },
                  ] as const
                ).map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setFlipPropertyType(pt.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border cursor-pointer ${
                      flipPropertyType === pt.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {(flipPropertyType === 'Sectional Title Apartment' || flipPropertyType === 'Townhouse / Cluster') && (
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 text-xs">
                    📅 Scheduled Body Corporate AGM Date
                  </label>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    Auto-schedules reminder task 14 days prior
                  </span>
                </div>
                <input
                  type="date"
                  value={flipAgmDate}
                  onChange={(e) => setFlipAgmDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Price (ZAR)</label>
              <input
                type="number"
                name="purchasePriceZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={flipPurchasePrice}
                onChange={(e) => setFlipPurchasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Acquisition Costs (Duty + Fees)</label>
              <input
                type="number"
                name="acquisitionCostsZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={flipAcquisitionCosts}
                onChange={(e) => setFlipAcquisitionCosts(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Baseline Reno Budget (ZAR)</label>
              <input
                type="number"
                name="renovationBudgetZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={flipRenovationBudget}
                onChange={(e) => setFlipRenovationBudget(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Exit Price (ZAR)</label>
              <input
                type="number"
                name="targetExitPriceZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={flipTargetExit}
                onChange={(e) => setFlipTargetExit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Exit Commission (%)</label>
              <input
                type="number"
                name="exitCommissionPercent"
                autoComplete="off"
                min="0"
                max="100"
                step="0.05"
                value={flipExitCommissionPercent}
                onChange={(e) => setFlipExitCommissionPercent(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900"
                placeholder="5.75"
              />
            </div>
          </div>

          {/* Municipal Valuation Benchmark Chip (if extracted) */}
          {extractedValuationZAR && extractedValuationZAR > 0 ? (
            <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-purple-900 inline-flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-purple-700" />
                  <span>Municipal Valuation: <strong>{formatZAR(extractedValuationZAR)}</strong></span>
                </span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                  CoJ Benchmark
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFlipTargetExit(extractedValuationZAR)}
                className="text-[11px] font-bold text-purple-700 bg-white hover:bg-purple-100 px-2 py-1 rounded border border-purple-300 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                Use as Target Exit (ARV) →
              </button>
            </div>
          ) : null}

          {/* Holding Period Carrying Costs Inputs (Itemized) */}
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wider">
                Holding Period Carrying Costs (Itemized)
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                Total: {formatZAR(flipEstimatedDuration * (Number(flipBondPayment) + (flipPropertyType === 'Freehold House' ? 0 : Number(flipLevies)) + Number(flipRates) + Number(flipOtherHoldingCost)))}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-xs">Estimated Duration (Months)</label>
              <input
                type="number"
                name="durationMonths"
                autoComplete="off"
                min="1"
                max="36"
                value={flipEstimatedDuration}
                onChange={(e) => setFlipEstimatedDuration(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Interim Bond (ZAR/m)</label>
                <input
                  type="number"
                  name="interimBondPaymentZAR"
                  autoComplete="off"
                  min="0"
                  step="any"
                  value={flipBondPayment}
                  onChange={(e) => setFlipBondPayment(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 text-[11px]">
                    {flipPropertyType === 'Freehold House' ? 'Levies (N/A)' : 'Levies (ZAR/m)'}
                  </label>
                  {flipPropertyType === 'Freehold House' && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">R0</span>
                  )}
                </div>
                <input
                  type="number"
                  name="holdingLeviesZAR"
                  autoComplete="off"
                  min="0"
                  step="any"
                  disabled={flipPropertyType === 'Freehold House'}
                  value={flipPropertyType === 'Freehold House' ? 0 : flipLevies}
                  onChange={(e) => setFlipLevies(Number(e.target.value))}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium ${
                    flipPropertyType === 'Freehold House'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Rates & Taxes (ZAR/m)</label>
                <input
                  type="number"
                  name="holdingRatesZAR"
                  autoComplete="off"
                  min="0"
                  step="any"
                  value={flipRates}
                  onChange={(e) => setFlipRates(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Other Costs (ZAR/m)</label>
                <input
                  type="number"
                  name="holdingOtherCostsZAR"
                  autoComplete="off"
                  min="0"
                  step="any"
                  value={flipOtherHoldingCost}
                  onChange={(e) => setFlipOtherHoldingCost(Number(e.target.value))}
                  placeholder="Security, ins."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
              </div>
            </div>

            <div className="p-2 bg-amber-100/70 rounded-lg flex items-center justify-between text-xs text-amber-950 font-semibold">
              <span>Total Monthly Carrying Burn:</span>
              <span className="font-bold text-sm text-amber-800">
                {formatZAR(Number(flipBondPayment) + (flipPropertyType === 'Freehold House' ? 0 : Number(flipLevies)) + Number(flipRates) + Number(flipOtherHoldingCost))}/mo
              </span>
            </div>
          </div>

          {/* Entity Tax Structure (Requirement 5) */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tax Entity & Provisional Tax Structure</span>
              </label>
              <span className="text-[10px] text-slate-500">Corporate vs Individual</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tax Entity Type</label>
                <select
                  value={flipTaxEntityType}
                  onChange={(e) => setFlipTaxEntityType(e.target.value as 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax')}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs text-slate-800 cursor-pointer"
                >
                  <option value="Company (27%)">Company / PTY Ltd (27% Corporate Tax)</option>
                  <option value="Individual (45%)">Individual / Sole Prop (45% Marginal Tax)</option>
                  <option value="Pre-Tax">Pre-Tax / Gross Model (0%)</option>
                </select>
              </div>
              <div className="flex items-center p-2 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px] text-indigo-900 leading-snug">
                <span>
                  {flipTaxEntityType === 'Company (27%)' && 'Applies SARS 27% corporate income tax rate to net trading flip upside.'}
                  {flipTaxEntityType === 'Individual (45%)' && 'Applies top marginal individual tax rate of 45% for high-bracket investors.'}
                  {flipTaxEntityType === 'Pre-Tax' && 'Excludes provisional tax provision; models pre-tax gross operational return.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 118 Rates Clearance & Municipal Arrears (Requirement 3) */}
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-amber-700" />
                <span>Section 118 Municipal Arrears & Clearance (RCC)</span>
              </span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                Municipal Systems Act
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Sec 118(1) Arrears (ZAR)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={flipSec118Arrears}
                  onChange={(e) => setFlipSec118Arrears(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
                <span className="text-[9px] text-slate-500">2-yr historic municipal debt</span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Advance Council Deposit (ZAR)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={flipAdvanceDeposit}
                  onChange={(e) => setFlipAdvanceDeposit(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
                <span className="text-[9px] text-slate-500">4-6 mos forward deposit</span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">RCC Clearance Status</label>
                <select
                  value={flipRccStatus}
                  onChange={(e) => setFlipRccStatus(e.target.value as NonNullable<FlipProject['municipalClearance']>['rccStatus'])}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs text-slate-800 cursor-pointer"
                >
                  <option value="Pending Application">Pending Application</option>
                  <option value="Figures Issued">Figures Issued</option>
                  <option value="Paid & Awaiting Certificate">Paid & Awaiting Certificate</option>
                  <option value="Disputed">Disputed (CoJ Billing Query)</option>
                  <option value="Certificate Issued">Certificate Issued (Clear for Transfer)</option>
                </select>
                <span className="text-[9px] text-slate-500">Council certificate phase</span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">RCC Application Date</label>
                <input
                  type="date"
                  value={flipRccAppDate}
                  onChange={(e) => setFlipRccAppDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                />
                <span className="text-[9px] text-slate-500">Lodge date with council</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                Municipal Billing Query / Dispute Notes
              </label>
              <input
                type="text"
                placeholder="e.g. City of Joburg estimated meter dispute logged (Ref #...)"
                value={flipDisputeNotes}
                onChange={(e) => setFlipDisputeNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
              />
            </div>
          </div>

          {/* Cloud & Web Document Vault Section */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>☁️ Cloud & Web Document Vault</span>
              </span>
              <span className="text-[10px] text-slate-500">OneDrive • GDrive • Dropbox</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deal Folder URL</label>
                <input
                  type="url"
                  placeholder="https://1drv.ms/... or drive.google.com/..."
                  value={flipMasterFolderUrl}
                  onChange={(e) => setFlipMasterFolderUrl(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signed OTP PDF URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={flipOtpUrl}
                  onChange={(e) => setFlipOtpUrl(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rates & Levies Statement</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={flipRatesBillUrl}
                  onChange={(e) => setFlipRatesBillUrl(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title Deed / SG Diagram</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={flipTitleDeedUrl}
                  onChange={(e) => setFlipTitleDeedUrl(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Completion Date</label>
            <input
              type="date"
              value={flipCompletionDate}
              onChange={(e) => setFlipCompletionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${
                isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5`}
            >
              {isEditing && <CheckCircle2 className="w-4 h-4" />}
              <span>{isEditing ? 'Update Flip Project' : 'Create Flip'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
