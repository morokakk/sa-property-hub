'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { formatFlipForWhatsApp } from '@/lib/whatsappFormatter';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { FlipProject, BOQItem, LocalSupplier, PropertyTitleType, CloudDriveVault } from '@/types';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import {
  Hammer,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  Building,
  CheckCircle2,
  Trash2,
  BookOpen,
  Phone,
  Store,
  ChevronRight,
  Filter,
  Copy,
  Check,
  Share2,
  Archive,
  RotateCcw,
  Sparkles,
  Coins,
  Edit3,
  FileSpreadsheet,
  FileText,
  ArrowRightLeft,
  Landmark,
  Clock,
  Scale,
  Gift,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';
import { parseRentalPdfStatement } from '@/lib/utilities/pdfParser';
import DelayMatrixModal from '@/components/flips/DelayMatrixModal';

export default function FlipsManagerPage() {
  const flips = usePortfolioStore((state) => state.flips);
  const addFlip = usePortfolioStore((state) => state.addFlip);
  const updateFlip = usePortfolioStore((state) => state.updateFlip);
  const deleteFlip = usePortfolioStore((state) => state.deleteFlip);
  const addBOQItem = usePortfolioStore((state) => state.addBOQItem);
  const updateBOQItem = usePortfolioStore((state) => state.updateBOQItem);
  const deleteBOQItem = usePortfolioStore((state) => state.deleteBOQItem);
  const markFlipAsCompleted = usePortfolioStore((state) => state.markFlipAsCompleted);
  const reopenFlip = usePortfolioStore((state) => state.reopenFlip);
  const convertFlipToRental = usePortfolioStore((state) => state.convertFlipToRental);
  const suppliers = usePortfolioStore((state) => state.suppliers);
  const addSupplier = usePortfolioStore((state) => state.addSupplier);
  const deleteSupplier = usePortfolioStore((state) => state.deleteSupplier);
  const funding = usePortfolioStore((state) => state.funding);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const aiSettings = usePortfolioStore((state) => state.aiSettings);

  // Active vs. Sold Archive Tab
  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');
  const activeFlips = flips.filter((f) => f.status !== 'Completed');
  const completedFlips = flips.filter((f) => f.status === 'Completed');

  // Selected Flip Project
  const [selectedFlipId, setSelectedFlipId] = useState<string>(activeFlips[0]?.id || flips[0]?.id || '');
  const activeFlip = activeFlips.find((f) => f.id === selectedFlipId) || activeFlips[0] || null;

  // WhatsApp Copy Toast State
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [showHoldingBreakdown, setShowHoldingBreakdown] = useState(false);

  // Modals
  const [showAddBOQModal, setShowAddBOQModal] = useState(false);
  const [showFlipModal, setShowFlipModal] = useState(false);
  const [editingFlipId, setEditingFlipId] = useState<string | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDelayMatrixModal, setShowDelayMatrixModal] = useState(false);

  // Convert Flip to Rental (BRRRR) Form State
  const [convertGrossRent, setConvertGrossRent] = useState<number>(18000);
  const [convertMarketValue, setConvertMarketValue] = useState<number>(0);
  const [convertTenantName, setConvertTenantName] = useState('Tenant Pending Placement');
  const [convertTenantPhone, setConvertTenantPhone] = useState('+27 —');
  const [convertTenantEmail, setConvertTenantEmail] = useState('pending@tenant.co.za');
  const [convertManagementType, setConvertManagementType] = useState<'Agency' | 'Self-Managed'>('Agency');
  const [convertAgencyName, setConvertAgencyName] = useState('Pam Golding Rentals');
  const [convertAgencyCommission, setConvertAgencyCommission] = useState<number>(8.0);
  const [convertNotes, setConvertNotes] = useState('');
  const [convertedRentalId, setConvertedRentalId] = useState<string | null>(null);


  // Funding Campaign Modal State
  const [fundingRequired, setFundingRequired] = useState<number>(0);
  const [capitalRaised, setCapitalRaised] = useState<number>(0);
  const [primaryFunderName, setPrimaryFunderName] = useState('');
  const [primaryFunderContact, setPrimaryFunderContact] = useState('');
  const [primaryFunderType, setPrimaryFunderType] = useState<FlipProject['primaryFunderType']>('Private Lender');
  const [coFundersNotes, setCoFundersNotes] = useState('');
  const [promisedReturnType, setPromisedReturnType] = useState<FlipProject['promisedReturnType']>('Fixed Interest');
  const [promisedReturnRatePercent, setPromisedReturnRatePercent] = useState<number>(14);
  const [promisedPayoutSchedule, setPromisedPayoutSchedule] = useState<FlipProject['promisedPayoutSchedule']>('Monthly Interest');
  const [securityOffered, setSecurityOffered] = useState('2nd Mortgage Bond registered over title deed');

  // Exit Modal State
  const [exitSalePrice, setExitSalePrice] = useState<number>(0);
  const [exitNetProceeds, setExitNetProceeds] = useState<number>(0);
  const [exitSoldDate, setExitSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exitNotes, setExitNotes] = useState('');

  // New BOQ Item Form State
  const [boqCategory, setBoqCategory] = useState<BOQItem['category']>('Flooring & Tiling');
  const [boqDescription, setBoqDescription] = useState('');
  const [boqUnit, setBoqUnit] = useState('lump sum');
  const [boqQuantity, setBoqQuantity] = useState(1);
  const [boqBaselineUnitCost, setBoqBaselineUnitCost] = useState(25000);
  const [boqActualCost, setBoqActualCost] = useState(0);
  const [boqSupplier, setBoqSupplier] = useState('Builders Warehouse Sandton');
  const [boqStatus, setBoqStatus] = useState<BOQItem['status']>('Quoted');
  const [boqMilestonePhase, setBoqMilestonePhase] = useState<NonNullable<BOQItem['milestonePhase']>>('First Fix / Wet Works');
  const [boqRetentionPercent, setBoqRetentionPercent] = useState<number>(0);
  const [boqIsSponsored, setBoqIsSponsored] = useState(false);
  const [boqCommercialRetailValue, setBoqCommercialRetailValue] = useState<number>(0);
  const [boqActualCashOutflow, setBoqActualCashOutflow] = useState<number>(0);

  // Flip Project Modal Form State (Unified Add & Edit)
  const [flipTitle, setFlipTitle] = useState('');
  const [flipAddress, setFlipAddress] = useState('');
  const [flipCity, setFlipCity] = useState('Cape Town');
  const [flipPurchasePrice, setFlipPurchasePrice] = useState(2500000);
  const [flipAcquisitionCosts, setFlipAcquisitionCosts] = useState(185000);
  const [flipRenovationBudget, setFlipRenovationBudget] = useState(450000);
  const [flipEstimatedDuration, setFlipEstimatedDuration] = useState(6);
  const [flipBondPayment, setFlipBondPayment] = useState(9500);
  const [flipLevies, setFlipLevies] = useState(0);
  const [flipRates, setFlipRates] = useState(3500);
  const [flipOtherHoldingCost, setFlipOtherHoldingCost] = useState(2000);
  const [flipTargetExit, setFlipTargetExit] = useState(3800000);
  const [flipExitCommissionPercent, setFlipExitCommissionPercent] = useState<number>(5.75);
  const [flipCompletionDate, setFlipCompletionDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [flipTaxEntityType, setFlipTaxEntityType] = useState<NonNullable<FlipProject['taxEntityType']>>(
    investorProfile?.defaultTaxEntityType || 'Company (27%)'
  );
  const [flipSec118Arrears, setFlipSec118Arrears] = useState<number>(0);
  const [flipAdvanceDeposit, setFlipAdvanceDeposit] = useState<number>(0);
  const [flipRccStatus, setFlipRccStatus] = useState<NonNullable<FlipProject['municipalClearance']>['rccStatus']>('Pending Application');
  const [flipRccAppDate, setFlipRccAppDate] = useState<string>('');
  const [flipDisputeNotes, setFlipDisputeNotes] = useState<string>('');
  const [flipPropertyType, setFlipPropertyType] = useState<PropertyTitleType>('Freehold House');
  const [flipAgmDate, setFlipAgmDate] = useState<string>('');
  const [flipMasterFolderUrl, setFlipMasterFolderUrl] = useState('');
  const [flipOtpUrl, setFlipOtpUrl] = useState('');
  const [flipRatesBillUrl, setFlipRatesBillUrl] = useState('');
  const [flipTitleDeedUrl, setFlipTitleDeedUrl] = useState('');

  // PDF Statement Extraction State for New Flip
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfParseNotice, setPdfParseNotice] = useState<string | null>(null);
  const [extractedValuationZAR, setExtractedValuationZAR] = useState<number | null>(null);

  const handleFlipPdfSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsParsingPdf(true);
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
      setShowFlipModal(true);
    } catch (err: any) {
      console.error('Failed to parse statement for flip:', err);
      setPdfParseNotice('Could not extract statement details. Please check the file.');
      setShowFlipModal(true);
    } finally {
      setIsParsingPdf(false);
    }
  };

  // New Supplier Form State
  const [supName, setSupName] = useState('');
  const [supCategory, setSupCategory] = useState<LocalSupplier['category']>('Hardware & Timber');
  const [supBranch, setSupBranch] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supDiscount, setSupDiscount] = useState('');
  const [supHasCoc, setSupHasCoc] = useState(false);

  // Handlers
  const handleAddBOQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlip || !boqDescription) return;

    const baselineTotal = boqQuantity * boqBaselineUnitCost;
    const finalActual = boqIsSponsored && boqActualCashOutflow !== undefined ? boqActualCashOutflow : boqActualCost;
    addBOQItem(activeFlip.id, {
      category: boqCategory,
      itemDescription: boqDescription,
      unit: boqUnit,
      quantity: boqQuantity,
      baselineUnitCostZAR: boqBaselineUnitCost,
      baselineTotalZAR: baselineTotal,
      actualCostZAR: finalActual,
      varianceZAR: finalActual - baselineTotal,
      supplierOrContractor: boqSupplier,
      status: boqStatus,
      milestonePhase: boqMilestonePhase,
      retentionPercent: boqRetentionPercent,
      isSponsoredOrBarter: boqIsSponsored,
      commercialRetailValueZAR: boqIsSponsored ? boqCommercialRetailValue : undefined,
      actualCashOutflowZAR: boqIsSponsored ? boqActualCashOutflow : undefined,
    });

    setShowAddBOQModal(false);
    setBoqDescription('');
    setBoqActualCost(0);
    setBoqMilestonePhase('First Fix / Wet Works');
    setBoqRetentionPercent(0);
    setBoqIsSponsored(false);
    setBoqCommercialRetailValue(0);
    setBoqActualCashOutflow(0);
  };

  const openAddFlipModal = () => {
    setEditingFlipId(null);
    setFlipTitle('');
    setFlipAddress('');
    setFlipCity('Cape Town');
    setFlipPurchasePrice(2500000);
    setFlipAcquisitionCosts(185000);
    setFlipRenovationBudget(450000);
    setFlipEstimatedDuration(6);
    setFlipBondPayment(9500);
    setFlipLevies(0);
    setFlipRates(3500);
    setFlipOtherHoldingCost(2000);
    setFlipTargetExit(3800000);
    setFlipExitCommissionPercent(5.75);
    setFlipCompletionDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFlipTaxEntityType(investorProfile?.defaultTaxEntityType || 'Company (27%)');
    setFlipSec118Arrears(0);
    setFlipAdvanceDeposit(0);
    setFlipRccStatus('Pending Application');
    setFlipRccAppDate(new Date().toISOString().split('T')[0]);
    setFlipDisputeNotes('');
    setFlipPropertyType('Freehold House');
    setFlipAgmDate('');
    setFlipMasterFolderUrl('');
    setFlipOtpUrl('');
    setFlipRatesBillUrl('');
    setFlipTitleDeedUrl('');
    setPdfParseNotice(null);
    setExtractedValuationZAR(null);
    setShowFlipModal(true);
  };

  const openEditFlipModal = () => {
    if (!activeFlip) return;
    setEditingFlipId(activeFlip.id);
    setFlipTitle(activeFlip.title);
    setFlipAddress(activeFlip.address);
    setFlipCity(activeFlip.city);
    setFlipPurchasePrice(activeFlip.purchasePriceZAR);
    setFlipAcquisitionCosts(activeFlip.acquisitionCostsZAR);
    setFlipRenovationBudget(activeFlip.baselineRenovationBudgetZAR);
    setFlipEstimatedDuration(activeFlip.estimatedDurationMonths ?? 6);

    const existingHolding = activeFlip.monthlyHoldingCostZAR ?? 15000;
    const bond = activeFlip.monthlyBondPaymentZAR !== undefined ? activeFlip.monthlyBondPaymentZAR : Math.round(existingHolding * 0.6);
    const levies = activeFlip.propertyType === 'Freehold House' ? 0 : (activeFlip.monthlyLeviesZAR !== undefined ? activeFlip.monthlyLeviesZAR : Math.round(existingHolding * 0.15));
    const rates = activeFlip.monthlyRatesTaxesZAR !== undefined ? activeFlip.monthlyRatesTaxesZAR : Math.round(existingHolding * 0.15);
    const other = activeFlip.monthlyOtherHoldingCostZAR !== undefined ? activeFlip.monthlyOtherHoldingCostZAR : Math.max(0, existingHolding - (bond + levies + rates));

    setFlipBondPayment(bond);
    setFlipLevies(levies);
    setFlipRates(rates);
    setFlipOtherHoldingCost(other);
    setFlipTargetExit(activeFlip.targetExitPriceZAR);
    setFlipExitCommissionPercent(activeFlip.exitCommissionPercent ?? 5.75);
    setFlipCompletionDate(activeFlip.targetCompletionDate);
    setFlipTaxEntityType(activeFlip.taxEntityType || investorProfile?.defaultTaxEntityType || 'Company (27%)');
    setFlipSec118Arrears(activeFlip.municipalClearance?.sec118ArrearsZAR || 0);
    setFlipAdvanceDeposit(activeFlip.municipalClearance?.advanceCouncilDepositZAR || 0);
    setFlipRccStatus(activeFlip.municipalClearance?.rccStatus || 'Pending Application');
    setFlipRccAppDate(activeFlip.municipalClearance?.rccApplicationDate || '');
    setFlipDisputeNotes(activeFlip.municipalClearance?.disputeNotes || '');
    setFlipPropertyType(activeFlip.propertyType || 'Freehold House');
    setFlipAgmDate(activeFlip.agmDate || '');
    setFlipMasterFolderUrl(activeFlip.driveVault?.masterFolderUrl || '');
    setFlipOtpUrl(activeFlip.driveVault?.otpDocumentUrl || '');
    setFlipRatesBillUrl(activeFlip.driveVault?.ratesBillUrl || '');
    setFlipTitleDeedUrl(activeFlip.driveVault?.titleDeedUrl || '');
    setPdfParseNotice(null);
    setExtractedValuationZAR(null);
    setShowFlipModal(true);
  };

  const handleSaveFlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flipTitle) return;

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

    if (editingFlipId) {
      updateFlip(editingFlipId, {
        title: flipTitle,
        address: flipAddress,
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
      });
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

      addFlip(createdFlip);
      setSelectedFlipId(createdFlip.id);
    }

    setShowFlipModal(false);
    setEditingFlipId(null);
    setPdfParseNotice(null);
    setExtractedValuationZAR(null);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName) return;

    const newSup: LocalSupplier = {
      id: `sup-${Date.now()}`,
      name: supName,
      category: supCategory,
      branchLocation: supBranch,
      phone: supPhone,
      discountTerms: supDiscount,
      hasCoC: supHasCoc,
      rating: 5,
    };

    addSupplier(newSup);
    setShowSupplierModal(false);
    setSupName('');
    setSupBranch('');
    setSupPhone('');
    setSupDiscount('');
  };

  const handleCompleteFlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlip || exitSalePrice <= 0) return;
    markFlipAsCompleted(activeFlip.id, exitSalePrice, exitNetProceeds, exitSoldDate, exitNotes);
    setShowExitModal(false);
    setViewTab('archive');
  };

  // Calculations for active flip
  const activeFlipBoq = activeFlip?.boq || [];
  const totalBOQBaseline = activeFlipBoq.reduce((s, i) => s + i.baselineTotalZAR, 0) || 0;
  const totalBOQActual = activeFlipBoq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0;
  const totalBOQVariance = totalBOQActual - totalBOQBaseline;

  // Empty BOQ baseline renovation budget fallback
  const effectiveRenoCost = totalBOQActual > 0 ? totalBOQActual : (activeFlip?.baselineRenovationBudgetZAR || 0);

  // Holding Period Carrying Costs (interim bond interest, rates, levies, security)
  const flipHoldingMonths = activeFlip?.estimatedDurationMonths ?? 6;
  const flipMonthlyHoldingCost = activeFlip?.monthlyHoldingCostZAR ?? 0;
  const totalHoldingCost = flipHoldingMonths * flipMonthlyHoldingCost;

  const totalCostBasis =
    (activeFlip?.purchasePriceZAR || 0) +
    (activeFlip?.acquisitionCostsZAR || 0) +
    effectiveRenoCost;

  // Section 118 Rates Clearance & Municipal Arrears (Requirement 3)
  const sec118ArrearsVal = activeFlip?.municipalClearance?.sec118ArrearsZAR || 0;
  const advanceCouncilDepositVal = activeFlip?.municipalClearance?.advanceCouncilDepositZAR || 0;
  const totalMunicipalClearanceOutlay = sec118ArrearsVal + advanceCouncilDepositVal;
  const rccStatusVal = activeFlip?.municipalClearance?.rccStatus || 'Pending Application';
  const isRccDisputed = rccStatusVal === 'Disputed';

  // Standard Exit Sales Commission (5.75% default or per-flip override)
  const exitCommissionPercent = activeFlip?.exitCommissionPercent ?? 5.75;
  const exitCommissionZAR = Math.round((activeFlip?.targetExitPriceZAR || 0) * (exitCommissionPercent / 100));

  const totalAllInCost = totalCostBasis + totalHoldingCost + totalMunicipalClearanceOutlay + exitCommissionZAR;

  const projectedNetProfit = (activeFlip?.targetExitPriceZAR || 0) - totalAllInCost;
  const projectedROI = totalAllInCost > 0 ? (projectedNetProfit / totalAllInCost) * 100 : 0;

  // After-Tax ROI & Entity Tax Toggle Calculations (Requirement 5)
  const currentTaxMode = activeFlip?.taxEntityType || 'Company (27%)';
  const effectiveTaxRate = currentTaxMode === 'Company (27%)' ? 27 : currentTaxMode === 'Individual (45%)' ? 45 : 0;
  const preTaxProfit = projectedNetProfit;
  const estimatedTaxProvision = Math.max(0, Math.round(preTaxProfit * (effectiveTaxRate / 100)));
  const netProfitAfterTax = preTaxProfit - estimatedTaxProvision;
  const afterTaxROI = totalAllInCost > 0 ? (netProfitAfterTax / totalAllInCost) * 100 : 0;

  // Sponsor / Barter Dual-Value BOQ Accounting (Requirement 6)
  const sponsoredItems = activeFlipBoq.filter((i) => i.isSponsoredOrBarter);
  const totalSponsorItemsCount = sponsoredItems.length;
  const sponsorRetailTotal = sponsoredItems.reduce((s, i) => s + (i.commercialRetailValueZAR || i.baselineTotalZAR || 0), 0);
  const sponsorCashTotal = sponsoredItems.reduce((s, i) => s + (i.actualCashOutflowZAR !== undefined ? i.actualCashOutflowZAR : (i.actualCostZAR || i.baselineTotalZAR || 0)), 0);
  const totalSponsorSavings = Math.max(0, sponsorRetailTotal - sponsorCashTotal);

  const totalRetailBOQ = activeFlipBoq.reduce((s, i) => {
    if (i.isSponsoredOrBarter) return s + (i.commercialRetailValueZAR || i.baselineTotalZAR || 0);
    return s + (i.actualCostZAR || i.baselineTotalZAR || 0);
  }, 0);
  const totalActualCashBOQ = totalBOQActual;

  // Milestone Drawdown Allocations & Retention Pool (Requirement 1)
  const milestoneDraws = {
    deposit: activeFlipBoq.filter((i) => i.milestonePhase === 'Deposit').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0,
    firstFix: activeFlipBoq.filter((i) => i.milestonePhase === 'First Fix / Wet Works').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0,
    finishes: activeFlipBoq.filter((i) => i.milestonePhase === 'Finishes').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0,
    retention: activeFlipBoq.filter((i) => i.milestonePhase === 'Retention').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0,
  };
  const currentDrawSchedule = activeFlip?.drawSchedule || {
    depositPaid: false,
    firstFixApproved: false,
    finishesApproved: false,
    retentionReleased: false,
  };
  const totalRetentionHeldZAR = activeFlipBoq.reduce((s, i) => {
    if (i.milestonePhase === 'Retention') return s + (i.actualCostZAR || i.baselineTotalZAR);
    if (i.retentionPercent && i.retentionPercent > 0) {
      return s + Math.round((i.actualCostZAR || i.baselineTotalZAR) * (i.retentionPercent / 100));
    }
    return s;
  }, 0) || Math.round(totalBOQActual * 0.2);

  const openConvertModal = () => {
    if (!activeFlip) return;
    const defaultValuation = activeFlip.targetExitPriceZAR || totalAllInCost;
    const estimatedRent = Math.round((defaultValuation * 0.008) / 500) * 500 || 18000;
    setConvertMarketValue(defaultValuation);
    setConvertGrossRent(estimatedRent);
    setConvertTenantName('Tenant Pending Placement');
    setConvertTenantPhone('+27 —');
    setConvertTenantEmail('pending@tenant.co.za');
    setConvertManagementType('Agency');
    setConvertAgencyName('Pam Golding Rentals');
    setConvertAgencyCommission(8.0);
    setConvertNotes(`Converted from Flip "${activeFlip.title}" via BRRRR timeline`);
    setShowConvertModal(true);
  };

  const handleConvertFlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlip) return;
    const created = convertFlipToRental({
      flipId: activeFlip.id,
      initialGrossRentZAR: Number(convertGrossRent),
      marketValuationZAR: Number(convertMarketValue),
      tenantName: convertTenantName.trim() || undefined,
      tenantPhone: convertTenantPhone.trim() || undefined,
      tenantEmail: convertTenantEmail.trim() || undefined,
      managementType: convertManagementType,
      agencyName: convertManagementType === 'Agency' ? convertAgencyName.trim() : undefined,
      agencyCommissionPercent: convertManagementType === 'Agency' ? Number(convertAgencyCommission) : 0,
      notes: convertNotes.trim() || undefined,
    });
    setShowConvertModal(false);
    setConvertedRentalId(created.id);
    setViewTab('archive');
  };

  // Linked Funding for this flip
  const linkedFunding = funding.filter(
    (f) => f.linkedDealId === activeFlip?.id || (activeFlip?.linkedFundingIds || []).includes(f.id)
  );
  const totalCapitalSecured = linkedFunding.reduce((sum, f) => sum + f.capitalAmountZAR, 0);

  // Funding Campaign Calculations
  const fundingRequiredVal = activeFlip?.fundingRequiredZAR ?? Math.round(totalCostBasis * 0.7);
  const capitalRaisedVal = activeFlip?.capitalRaisedZAR ?? totalCapitalSecured;
  const capitalRemainingVal = Math.max(0, fundingRequiredVal - capitalRaisedVal);
  const fundingProgressPercent = fundingRequiredVal > 0 ? Math.min(100, Math.round((capitalRaisedVal / fundingRequiredVal) * 100)) : 0;

  const openFundingModal = () => {
    if (!activeFlip) return;
    const defaultRequired = activeFlip.fundingRequiredZAR ?? Math.round(totalCostBasis * 0.7);
    const defaultRaised = activeFlip.capitalRaisedZAR ?? totalCapitalSecured;
    setFundingRequired(defaultRequired);
    setCapitalRaised(defaultRaised);
    setPrimaryFunderName(activeFlip.primaryFunderName || '');
    setPrimaryFunderContact(activeFlip.primaryFunderContact || '');
    setPrimaryFunderType(activeFlip.primaryFunderType || 'Private Lender');
    setCoFundersNotes(activeFlip.coFundersNotes || '');
    setPromisedReturnType(activeFlip.promisedReturnType || 'Fixed Interest');
    setPromisedReturnRatePercent(activeFlip.promisedReturnRatePercent ?? 14);
    setPromisedPayoutSchedule(activeFlip.promisedPayoutSchedule || 'Monthly Interest');
    setSecurityOffered(activeFlip.securityOffered || '2nd Mortgage Bond registered over title deed');
    setShowFundingModal(true);
  };

  const handleSaveFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlip) return;
    updateFlip(activeFlip.id, {
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
    });
    setShowFundingModal(false);
  };

  const handleSyncLedgerToDeal = () => {
    if (!activeFlip) return;
    updateFlip(activeFlip.id, {
      capitalRaisedZAR: totalCapitalSecured,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Buy-and-Flip Manager"
        subtitle="Dynamic budget tracker, Bill of Quantities (BOQ), and local South African trade suppliers"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <ImportDropdown type="flips" onPdfSelected={handleFlipPdfSelected} />
            <button
              onClick={() => setShowSupplierModal(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              Supplier Directory ({suppliers.length})
            </button>
            <button
              onClick={openAddFlipModal}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Flip Project
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Active vs Sold Archive Tab Toggle */}
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Pipeline ({activeFlips.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('archive')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewTab === 'archive'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sold Archive ({completedFlips.length})</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ACTIVE FLIPS PIPELINE VIEW                                    */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'active' && (
          <>
            {/* Flip Project Selector Tabs */}
            <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-2">
                {activeFlips.map((flip) => (
                  <button
                    key={flip.id}
                    onClick={() => setSelectedFlipId(flip.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeFlip?.id === flip.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>{flip.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {flip.city}
                    </span>
                  </button>
                ))}
              </div>

              {activeFlip && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const text = formatFlipForWhatsApp(activeFlip, investorProfile);
                      navigator.clipboard.writeText(text);
                      setCopiedWhatsApp(true);
                      setTimeout(() => setCopiedWhatsApp(false), 2500);
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Copy WhatsApp syndicate update to clipboard"
                  >
                    {copiedWhatsApp ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedWhatsApp ? 'Copied WhatsApp!' : 'Copy WhatsApp Summary'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(formatFlipForWhatsApp(activeFlip, investorProfile))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-lg border border-emerald-300 transition-colors"
                    title="Share directly via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>

                  <Link
                    href={`/proposal?dealId=${activeFlip.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <span>Pitch Deck</span> <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {activeFlip ? (
              <>
                {/* Active Flip Header Banner */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <PropertyTypeBadge type={activeFlip.propertyType} />
                      <AgmDateChip agmDate={activeFlip.agmDate} />
                      
                      {/* Interactive Phase Selector */}
                      <select
                        value={activeFlip.currentPhase}
                        onChange={(e) => updateFlip(activeFlip.id, { currentPhase: e.target.value as any })}
                        className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors"
                        title="Change current project phase"
                      >
                        <option value="Acquisition & Conveyancing">Acquisition & Conveyancing</option>
                        <option value="Strip & Demolition">Strip & Demolition</option>
                        <option value="First Fix (Plumbing/Elec)">First Fix (Plumbing/Elec)</option>
                        <option value="Finishes & Tiling">Finishes & Tiling</option>
                        <option value="Snagging">Snagging</option>
                        <option value="Staging & Marketing">Staging & Marketing</option>
                        <option value="Sold / Awaiting Transfer">Sold / Awaiting Transfer</option>
                      </select>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{activeFlip.title}</h2>
                    <p className="text-xs text-slate-500">{activeFlip.address}, {activeFlip.city}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 text-left md:text-right hidden sm:block">
                      <span className="block text-[10px] text-slate-400">Target Completion</span>
                      <span className="font-semibold text-slate-800">{formatDate(activeFlip.targetCompletionDate)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={openEditFlipModal}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-2 rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer"
                      title="Edit project duration, holding costs, budget & exit targets"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit Flip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const defaultSale = activeFlip.targetExitPriceZAR || 0;
                        setExitSalePrice(defaultSale);
                        setExitNetProceeds(Math.max(0, defaultSale - totalAllInCost));
                        setExitSoldDate(new Date().toISOString().split('T')[0]);
                        setExitNotes('');
                        setShowExitModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="Record realized sale price and move to sold archive"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Mark as Flipped / Sold</span>
                    </button>

                    <button
                      type="button"
                      onClick={openConvertModal}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="Convert this flip project to a long-term rental property under BRRRR strategy"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
                      <span>Convert to Rental</span>
                    </button>
                  </div>
                </div>

                {/* Active Flip Overview & Financial Health Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Purchase & Costs</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR + totalMunicipalClearanceOutlay)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={`Legal/Duty: ${formatZAR(activeFlip.acquisitionCostsZAR)}${totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}`}>
                      Legal: {formatZAR(activeFlip.acquisitionCostsZAR)}{totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">BOQ Renovation Spend</span>
                    <div className="text-xl font-bold text-indigo-700 mt-1">
                      {formatZAR(totalBOQActual)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Budget: {formatZAR(activeFlip.baselineRenovationBudgetZAR)}
                    </div>
                  </div>

                  {/* Total Holding Carrying Cost Card (Expandable Itemization) */}
                  <div id="flips-holding-cost" className="scroll-mt-20 bg-white p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Holding Cost</span>
                        <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                          {flipHoldingMonths} Mos
                        </span>
                      </div>
                      <div className="text-xl font-bold text-amber-700 mt-1">
                        - {formatZAR(totalHoldingCost)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5" title={`${formatZAR(flipMonthlyHoldingCost)}/mo carrying burn`}>
                        {formatZAR(flipMonthlyHoldingCost)}/mo carrying burn
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-amber-100 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowHoldingBreakdown((prev) => !prev)}
                        className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 flex items-center justify-between w-full cursor-pointer transition-colors"
                      >
                        <span>{showHoldingBreakdown ? '▲ Hide Breakdown' : '▼ Itemized Breakdown'}</span>
                        <span className="text-[9px] text-slate-400">Monthly</span>
                      </button>

                      {showHoldingBreakdown && (
                        <div className="mt-1 space-y-1 text-[10px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 animate-in fade-in duration-150">
                          <div className="flex justify-between">
                            <span>Interim Bond:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyBondPaymentZAR || 0)}/m</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>{activeFlip.propertyType === 'Freehold House' ? 'Levies (N/A):' : 'Body Corporate / HOA:'}</span>
                            <strong className="text-slate-800 font-semibold">{activeFlip.propertyType === 'Freehold House' ? 'R 0 (Freehold)' : `${formatZAR(activeFlip.monthlyLeviesZAR || 0)}/m`}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Rates & Taxes:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyRatesTaxesZAR || 0)}/m</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Security & Other:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyOtherHoldingCostZAR || 0)}/m</strong>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowDelayMatrixModal(true)}
                        className="w-full py-1.5 px-2 bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 font-bold text-[10px] rounded-lg border border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Simulate Council / Transfer Delay Matrix (+30, +60, +90, +120 Days)"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-800" />
                        <span>Simulate Delay Matrix (+30–120d)</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Budget Variance</span>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        totalBOQVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {totalBOQVariance > 0 ? `+${formatZAR(totalBOQVariance)}` : formatZAR(totalBOQVariance)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {totalBOQVariance <= 0 ? 'On or under budget' : 'Over budget'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Target Exit Valuation</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {formatZAR(activeFlip.targetExitPriceZAR)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Target: {formatDate(activeFlip.targetCompletionDate)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 rounded-xl shadow-sm">
                    <span className="text-[11px] font-semibold text-emerald-200 uppercase">Projected Net Upside</span>
                    <div className="text-xl font-extrabold text-white mt-1">
                      {effectiveTaxRate > 0 ? formatZAR(netProfitAfterTax) : formatZAR(projectedNetProfit)}
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5 font-bold flex items-center justify-between">
                      <span>{effectiveTaxRate > 0 ? formatPercent(afterTaxROI) : formatPercent(projectedROI)} {effectiveTaxRate > 0 ? 'After-Tax ROI' : 'Net ROI'}</span>
                      <span className="text-[9px] text-emerald-300 opacity-90 font-medium">
                        {effectiveTaxRate > 0 ? `${effectiveTaxRate}% Tax Deducted` : 'Pre-Tax Margin'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operational Math & Entity Tax Banner (Requirements 5 & 6) */}
                <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 px-4 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap text-slate-700">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Operational Math:</span>
                      </span>
                      <span>Exit {formatZAR(activeFlip.targetExitPriceZAR)}</span>
                      <span className="text-slate-400">−</span>
                      <span>Acquisition ({formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR)})</span>
                      <span className="text-slate-400">−</span>
                      <span>BOQ Spend ({formatZAR(totalBOQActual)})</span>
                      {totalMunicipalClearanceOutlay > 0 && (
                        <>
                          <span className="text-slate-400">−</span>
                          <span className="font-semibold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                            Sec 118 Clearance ({formatZAR(totalMunicipalClearanceOutlay)})
                          </span>
                        </>
                      )}
                      <span className="text-slate-400">−</span>
                      <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Holding ({flipHoldingMonths} mos × {formatZAR(flipMonthlyHoldingCost)}/mo = {formatZAR(totalHoldingCost)})
                      </span>
                      {exitCommissionZAR > 0 && (
                        <>
                          <span className="text-slate-400">−</span>
                          <span className="font-semibold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                            Exit Comm {exitCommissionPercent}% ({formatZAR(exitCommissionZAR)})
                          </span>
                        </>
                      )}
                    </div>

                    {/* Entity Tax Toggle (Pre-Tax / 27% Company / 45% Individual) */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Entity Tax:</span>
                      {(['Company (27%)', 'Individual (45%)', 'Pre-Tax'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateFlip(activeFlip.id, { taxEntityType: mode })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            currentTaxMode === mode
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {mode === 'Company (27%)' ? 'Company (27%)' : mode === 'Individual (45%)' ? 'Individual (45%)' : 'Pre-Tax'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-amber-200/60 gap-2">
                    {/* Sponsor / Barter Summary pill */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {totalSponsorItemsCount > 0 ? (
                        <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-lg font-semibold">
                          <Gift className="w-3.5 h-3.5 text-purple-600" />
                          <span>Commercial Retail Value: <strong>{formatZAR(totalRetailBOQ)}</strong></span>
                          <span>•</span>
                          <span>Cash Outlay: <strong>{formatZAR(totalActualCashBOQ)}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Saved {formatZAR(totalSponsorSavings)} ({totalRetailBOQ > 0 ? ((totalSponsorSavings / totalRetailBOQ) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          Pre-Tax Operational Profit: <strong>{formatZAR(preTaxProfit)}</strong> ({formatPercent(projectedROI)} Pre-Tax ROI)
                        </span>
                      )}
                    </div>

                    {/* Pre-Tax vs Post-Tax Result */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {effectiveTaxRate > 0 ? (
                        <>
                          <div className="text-[11px] text-slate-500">
                            <span>Pre-Tax: <strong>{formatZAR(preTaxProfit)}</strong></span>
                            <span className="text-rose-600 font-medium ml-1.5">(-{formatZAR(estimatedTaxProvision)} tax)</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium mr-1.5 text-xs">= Net Cash After {effectiveTaxRate}% Tax:</span>
                            <strong className="text-emerald-700 font-black text-sm">{formatZAR(netProfitAfterTax)}</strong>
                            <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                              {formatPercent(afterTaxROI)} After-Tax
                            </span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-slate-500 font-medium mr-1.5 text-xs">= Pre-Tax Net Profit:</span>
                          <strong className="text-emerald-700 font-black text-sm">{formatZAR(projectedNetProfit)}</strong>
                          <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {formatPercent(projectedROI)} Pre-Tax
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Funding Campaign & Investor Returns Section */}
                <div className="bg-slate-900 text-white rounded-xl shadow-xs border border-slate-800 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            Funding Campaign & Capital Progress
                          </h3>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-semibold border border-slate-700">
                            {fundingProgressPercent}% Raised
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Track target facility, capital secured to date, lead funder, and promised return structure
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={handleSyncLedgerToDeal}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Sync 'Capital Raised' with active linked ledger tranches"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sync from Ledger</span>
                      </button>
                      <button
                        onClick={openFundingModal}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Edit Funding Terms
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Funding Required</span>
                        <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                          {formatZAR(fundingRequiredVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">Target raise facility</span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">Capital Raised</span>
                        <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">
                          {formatZAR(capitalRaisedVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">Managed to raise</span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">Remaining Required</span>
                        <div className="text-base sm:text-lg font-extrabold text-amber-400 mt-0.5">
                          {formatZAR(capitalRemainingVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {capitalRemainingVal === 0 ? 'Fully funded! 🎉' : 'Still to secure'}
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Basis Drawn</span>
                        <div className="text-base sm:text-lg font-extrabold text-slate-200 mt-0.5">
                          {formatZAR(totalCostBasis)}
                        </div>
                        <span className="text-[9px] text-slate-400">Purchase + legal + spend</span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-300 text-[11px]">Fundraising Progress</span>
                        <span className="font-extrabold text-emerald-400 text-xs">
                          {formatZAR(capitalRaisedVal)} / {formatZAR(fundingRequiredVal)} ({fundingProgressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            fundingProgressPercent >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-emerald-600 to-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, fundingProgressPercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Primary Funder & Promised Terms Detailed Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Primary Funder / Syndicate Lead
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                            {activeFlip.primaryFunderType || 'Private Lender'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white">
                          {activeFlip.primaryFunderName || 'No Lead Funder Assigned'}
                        </div>
                        {activeFlip.primaryFunderContact && (
                          <div className="text-[11px] text-slate-400">
                            {activeFlip.primaryFunderContact}
                          </div>
                        )}
                        {activeFlip.coFundersNotes && (
                          <div className="text-[10px] text-indigo-300 italic pt-0.5">
                            Co-funders: {activeFlip.coFundersNotes}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Promised Return & Collateral
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            {activeFlip.promisedReturnType || 'Fixed Interest'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-emerald-400">
                          {activeFlip.promisedReturnRatePercent ?? 14}%{' '}
                          {activeFlip.promisedReturnType === 'Fixed Interest'
                            ? 'p.a. Fixed Interest'
                            : activeFlip.promisedReturnType === 'Equity Profit Split'
                            ? 'Net Flip Profit Split'
                            : activeFlip.promisedReturnType || 'Fixed Interest'}
                        </div>
                        <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2">
                          <span>Payout: {activeFlip.promisedPayoutSchedule || 'Monthly Interest'}</span>
                          <span>•</span>
                          <span className="text-slate-400">{activeFlip.securityOffered || '2nd Mortgage Bond registered'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 118 Rates Clearance Certificate (RCC) & Municipal Arrears Card (Requirement 3) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Section 118 Municipal Rates Clearance (RCC) & Arrears Tracker
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rccStatusVal === 'Certificate Issued'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : rccStatusVal === 'Disputed'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : rccStatusVal === 'Paid & Awaiting Certificate'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {rccStatusVal}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Municipal Systems Act Section 118(1) 2-year clearance, advance rates deposit & Deeds Registry clearance
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={rccStatusVal}
                        onChange={(e) =>
                          updateFlip(activeFlip.id, {
                            municipalClearance: {
                              sec118ArrearsZAR: sec118ArrearsVal,
                              advanceCouncilDepositZAR: advanceCouncilDepositVal,
                              rccStatus: e.target.value as any,
                              rccApplicationDate: activeFlip.municipalClearance?.rccApplicationDate,
                              disputeNotes: activeFlip.municipalClearance?.disputeNotes,
                            },
                          })
                        }
                        className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer text-slate-800 shadow-2xs"
                      >
                        <option value="Pending Application">Pending Application</option>
                        <option value="Figures Issued">Figures Issued</option>
                        <option value="Paid & Awaiting Certificate">Paid & Awaiting Certificate</option>
                        <option value="Disputed">Disputed (CoJ Billing Error)</option>
                        <option value="Certificate Issued">Certificate Issued (Clear for Transfer)</option>
                      </select>
                    </div>
                  </div>

                  {/* Arrears and Advance Deposit Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Section 118(1) 2-Yr Arrears</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {formatZAR(sec118ArrearsVal)}
                      </div>
                      <span className="text-[9px] text-slate-400">Statutory municipal historical debt</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Council Deposit</span>
                      <div className="text-base font-extrabold text-blue-700 mt-0.5">
                        {formatZAR(advanceCouncilDepositVal)}
                      </div>
                      <span className="text-[9px] text-slate-400">4–6 months rates required upfront</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total RCC Cash Outlay</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {formatZAR(totalMunicipalClearanceOutlay)}
                      </div>
                      <span className="text-[9px] text-slate-400">Total payable for clearance certificate</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">RCC Application Date</span>
                      <div className="text-base font-extrabold text-slate-800 mt-0.5">
                        {activeFlip.municipalClearance?.rccApplicationDate || 'Not Lodged'}
                      </div>
                      <span className="text-[9px] text-slate-400">Conveyancer lodgement date</span>
                    </div>
                  </div>

                  {/* Dispute & Holding Burn Warning */}
                  {isRccDisputed && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2 text-rose-900">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">CoJ Municipal Rates Dispute Active:</span>
                          <p className="text-[11px] text-rose-800 mt-0.5">
                            Municipal figures are disputed. Property transfer is halted while carrying costs burn at <strong>{formatZAR(flipMonthlyHoldingCost)}/month</strong>.
                            {activeFlip.municipalClearance?.disputeNotes && (
                              <span className="block mt-1 italic text-rose-900">Notes: {activeFlip.municipalClearance.disputeNotes}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDelayMatrixModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Simulate Dispute Delay (+30–120d)</span>
                      </button>
                    </div>
                  )}

                  {!isRccDisputed && rccStatusVal === 'Pending Application' && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Conveyancer awaiting City of Johannesburg rates clearance figures. Council turnaround standard is 14 to 30 days.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDelayMatrixModal(true)}
                        className="text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer shrink-0 text-[10px]"
                      >
                        Check Delay Exposure →
                      </button>
                    </div>
                  )}
                </div>

                {/* SA Statutory Compliance (CoC) (Requirement 4: Auto-adapts by City) */}
                <ComplianceChecklist
                  key={activeFlip.id}
                  certificates={activeFlip.cocChecklist}
                  city={activeFlip.city}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { cocChecklist: updated })}
                />

                {/* Cloud & Web Document Vault */}
                <CloudDriveLinkVault
                  vault={activeFlip.driveVault}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { driveVault: updated })}
                />

                {/* Contractor Milestone Drawdown & Retention Schedule (Requirement 1) */}
                <div id="flips-drawdown" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Hammer className="w-4 h-4 text-emerald-600" />
                        <span>Contractor Milestone Drawdown & Retention Schedule</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Phase-gated progress payments structured to eliminate contractor abandonment risk (Flipping Johannesburg operator model).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                          {currentDrawSchedule.retentionReleased ? 'Total Retention Pool' : 'Total Retention Pool Held'}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                          currentDrawSchedule.retentionReleased
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                            : 'text-amber-800 bg-amber-50 border-amber-200'
                        }`}>
                          {formatZAR(totalRetentionHeldZAR)} {currentDrawSchedule.retentionReleased ? '✓ Released' : 'Held (20%)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Phase Draw Gates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Gate 1: Deposit (20%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.depositPaid
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 1: Deposit</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            20% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Mobilization, prep & materials deposit</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.deposit || Math.round(activeFlip.baselineRenovationBudgetZAR * 0.2))}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(Math.round(activeFlip.baselineRenovationBudgetZAR * 0.2))}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.depositPaid}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  depositPaid: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.depositPaid ? '✓ Deposit Paid' : 'Mark Deposit Paid'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 2: First Fix / Wet Works (30%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.firstFixApproved
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 2: First Fix</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            30% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Plumbing rough-in, electrical conduit & wet works</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.firstFix || Math.round(activeFlip.baselineRenovationBudgetZAR * 0.3))}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(Math.round(activeFlip.baselineRenovationBudgetZAR * 0.3))}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.firstFixApproved}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  firstFixApproved: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.firstFixApproved ? '✓ Inspected & Approved' : 'Sign Off First Fix'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 3: Finishes & Tiling (30%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.finishesApproved
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 3: Finishes</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            30% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Tiling, joinery, sanitaryware, ceilings & paint</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.finishes || Math.round(activeFlip.baselineRenovationBudgetZAR * 0.3))}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(Math.round(activeFlip.baselineRenovationBudgetZAR * 0.3))}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.finishesApproved}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  finishesApproved: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.finishesApproved ? '✓ Finishes Approved' : 'Sign Off Finishes'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 4: Practical Completion & Retention (20%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.retentionReleased
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/60 border-amber-200 text-amber-950'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 4: Retention</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                            20% Snag Gate
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Snag list completion, CoC delivery & handover</p>
                        <div className="text-base font-extrabold text-amber-900">
                          {formatZAR(milestoneDraws.retention || Math.round(activeFlip.baselineRenovationBudgetZAR * 0.2))}
                        </div>
                        <span className="text-[10px] text-amber-800 font-semibold">Withheld until 100% snag-free</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-amber-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.retentionReleased}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  retentionReleased: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.retentionReleased ? '✓ Retention Released' : 'Release Retention'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill of Quantities (BOQ) Table */}
                <div id="flips-boq" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Bill of Quantities (BOQ)</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({activeFlip.boq.length} Line Items)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Baseline estimates vs. actual contractor & supplier invoices with phase milestones and sponsor barter tracking.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeFlip.boq && activeFlip.boq.length > 0 && (
                        <button
                          onClick={() => exportFlipBOQCSV(activeFlip)}
                          title="Download Bill of Quantities as CSV"
                          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export BOQ (CSV)</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddBOQModal(true)}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add BOQ Item
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                          <th className="p-3.5 pl-5">Trade Category</th>
                          <th className="p-3.5">Draw Phase</th>
                          <th className="p-3.5">Scope / Item Description</th>
                          <th className="p-3.5">Unit / Qty</th>
                          <th className="p-3.5">Baseline (ZAR)</th>
                          <th className="p-3.5">Actual (ZAR)</th>
                          <th className="p-3.5">Variance</th>
                          <th className="p-3.5">Supplier / Contractor</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {activeFlip.boq.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 pl-5 font-semibold text-slate-900">
                              {item.category}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={item.milestonePhase || 'First Fix / Wet Works'}
                                onChange={(e) =>
                                  updateBOQItem(activeFlip.id, item.id, {
                                    milestonePhase: e.target.value as any,
                                  })
                                }
                                className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 cursor-pointer bg-slate-50 text-slate-700 hover:bg-white shadow-2xs block"
                                title="Change milestone draw phase"
                              >
                                <option value="Deposit">Phase 1: Deposit (20%)</option>
                                <option value="First Fix / Wet Works">Phase 2: First Fix (30%)</option>
                                <option value="Finishes">Phase 3: Finishes (30%)</option>
                                <option value="Retention">Phase 4: Retention (20%)</option>
                              </select>
                              {item.retentionPercent && item.retentionPercent > 0 ? (
                                <span className="text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-1 inline-block">
                                  {item.retentionPercent}% Ret
                                </span>
                              ) : null}
                            </td>
                            <td className="p-3.5 max-w-xs">
                              <div className="font-medium text-slate-800">{item.itemDescription}</div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {item.invoiceRef && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Ref: {item.invoiceRef}
                                  </span>
                                )}
                                {item.isSponsoredOrBarter && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                    <Gift className="w-2.5 h-2.5 text-purple-600" />
                                    <span>Sponsor Barter • Retail {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-3.5 font-medium text-slate-700">
                              {formatZAR(item.baselineTotalZAR)}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900">
                              <div>{formatZAR(item.actualCostZAR)}</div>
                              {item.isSponsoredOrBarter && (
                                <div className="text-[9px] text-purple-700 font-normal">
                                  Retail: {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`font-bold ${
                                  item.varianceZAR <= 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {item.varianceZAR > 0 ? `+${formatZAR(item.varianceZAR)}` : formatZAR(item.varianceZAR)}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium">
                              {item.supplierOrContractor}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  updateBOQItem(activeFlip.id, item.id, {
                                    status: e.target.value as any,
                                  })
                                }
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : item.status === 'In Progress'
                                    ? 'bg-indigo-50 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="Quoted">Quoted</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="p-3.5 pr-5 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Delete BOQ item "${item.itemDescription}"?`)) {
                                    deleteBOQItem(activeFlip.id, item.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Hammer className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active flips in the portfolio.</p>
                <p className="text-xs text-slate-400 mt-1">Create your first flip project or promote a deal from the Opportunity Analyzer.</p>
                {completedFlips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('archive')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>View {completedFlips.length} Sold Flip(s) in Archive</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SOLD & COMPLETED ARCHIVE VIEW                                 */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-600" />
                  <span>Sold & Completed Flips Archive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical performance record of realized exit prices, capital recycling, and net profits returned to seed capital.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                {completedFlips.length} Realized Exit(s)
              </span>
            </div>

            {convertedRentalId && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Property Successfully Converted to Rental!</h4>
                    <p className="text-[11px] text-indigo-700">Initial capital basis and compliance documents transferred to the Rentals module.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/rentals"
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
                  >
                    <span>Go to Rentals</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConvertedRentalId(null)}
                    className="text-indigo-400 hover:text-indigo-700 text-xs px-1.5 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {completedFlips.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No completed flips archived yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you complete a renovation and sale or convert to rental, click &quot;Mark as Flipped / Sold&quot; or &quot;Convert to Rental&quot; to archive the deal here.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('active')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Go to Active Pipeline</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedFlips.map((flip) => {
                  const isBrrrr = flip.exitStrategy === 'BRRRR';
                  const totalBoqActual = (flip.boq || []).reduce(
                    (sum, b) => sum + (b.actualCostZAR || b.baselineTotalZAR || 0),
                    0
                  );
                  const renoCost = totalBoqActual > 0 ? totalBoqActual : (flip.baselineRenovationBudgetZAR || 0);
                  const costBasis =
                    (flip.purchasePriceZAR || 0) +
                    (flip.acquisitionCostsZAR || 0) +
                    renoCost;
                  const holdingMonths = flip.estimatedDurationMonths ?? 6;
                  const totalHoldingCost = holdingMonths * (flip.monthlyHoldingCostZAR ?? 0);
                  const sec118Cost =
                    (flip.municipalClearance?.sec118ArrearsZAR || 0) +
                    (flip.municipalClearance?.advanceCouncilDepositZAR || 0);
                  const salePrice = flip.actualSalePriceZAR || flip.targetExitPriceZAR || 0;
                  const exitCommRate = typeof flip.exitCommissionPercent === 'number' ? flip.exitCommissionPercent : 5.75;
                  const exitCommission = isBrrrr ? 0 : Math.round(salePrice * (exitCommRate / 100));
                  const fullCostBasis = costBasis + totalHoldingCost + sec118Cost + exitCommission;
                  const realizedNetProfit = salePrice - fullCostBasis;
                  const realizedROI = fullCostBasis > 0 ? (realizedNetProfit / fullCostBasis) * 100 : 0;
                  const brrrrTargetValuation = flip.targetExitPriceZAR || fullCostBasis;
                  const brrrrEquityCreated = Math.max(0, brrrrTargetValuation - fullCostBasis);

                  return (
                    <div
                      key={flip.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <PropertyTypeBadge type={flip.propertyType} />
                              {isBrrrr ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                                  <span>RETAINED AS RENTAL (BRRRR)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>FLIPPED / SOLD</span>
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base">{flip.title}</h4>
                            <p className="text-xs text-slate-500">{flip.address}, {flip.city}</p>
                          </div>
                          {flip.soldDate && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                              {isBrrrr ? 'Converted' : 'Sold'} {formatDate(flip.soldDate)}
                            </span>
                          )}
                        </div>

                        {/* Financial Highlights */}
                        {isBrrrr ? (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Accumulated Basis</span>
                              <strong className="text-xs font-bold text-slate-900">{formatZAR(fullCostBasis)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Target Valuation</span>
                              <strong className="text-xs font-bold text-slate-700">{formatZAR(brrrrTargetValuation)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Equity Created</span>
                              <strong className="text-xs font-extrabold text-indigo-700">+{formatZAR(brrrrEquityCreated)}</strong>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Sale</span>
                              <strong className="text-xs font-bold text-slate-900">{formatZAR(salePrice)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Cost Basis</span>
                              <strong className="text-xs font-bold text-slate-700">{formatZAR(fullCostBasis)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Profit</span>
                              <strong className={`text-xs font-extrabold ${realizedNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {realizedNetProfit >= 0 ? `+${formatZAR(realizedNetProfit)}` : formatZAR(realizedNetProfit)}
                              </strong>
                            </div>
                          </div>
                        )}

                        {isBrrrr ? (
                          <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">
                                Active in Rental Portfolio
                              </span>
                              <span className="text-[11px] text-indigo-700">
                                Eligible for Refinance & equity pull-out in Rentals module
                              </span>
                            </div>
                            <Link
                              href="/rentals"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0 shadow-2xs"
                            >
                              <span>View in Rentals</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                                Liquid Cash Released to Seed Capital
                              </span>
                              <span className="text-[11px] text-emerald-700">
                                Credited to Reserve for next acquisition
                              </span>
                            </div>
                            <strong className="text-sm font-black text-emerald-900">
                              {formatZAR(flip.netCashProceedsZAR || 0)}
                            </strong>
                          </div>
                        )}

                        {flip.exitNotes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700">Exit Notes: </span>
                            <span>{flip.exitNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          {isBrrrr ? (
                            <span>Strategy: <strong className="text-indigo-800 font-bold">BRRRR (Rent & Refinance)</strong></span>
                          ) : (
                            <span>Final Realized ROI: <strong className="text-slate-900 font-bold">{formatPercent(realizedROI)}</strong></span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(isBrrrr
                              ? `Reopen flip "${flip.title}" back to active pipeline? This will remove the linked rental property from your portfolio.`
                              : `Reopen flip "${flip.title}" back to active pipeline? This will revert the credited cash of ${formatZAR(flip.netCashProceedsZAR || 0)} from Cash in Reserve.`
                            )) {
                              reopenFlip(flip.id);
                              setSelectedFlipId(flip.id);
                              setViewTab('active');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen Project</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mark as Flipped / Sold Exit Modal (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showExitModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Mark Project as Flipped & Record Sale</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Finalize <strong>{activeFlip.title}</strong>. This records your realized sale price, archives the flip into historical records, and automatically deposits the net cash proceeds directly into your <strong>Liquid Cash Reserve / Seed Capital</strong> for your next deal.
            </p>

            <form onSubmit={handleCompleteFlip} noValidate className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost Basis</span>
                  <strong className="text-sm text-slate-800">{formatZAR(totalCostBasis)}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Purchase + BOQ Spend</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Exit (Estimate)</span>
                  <strong className="text-sm text-indigo-600">{formatZAR(activeFlip.targetExitPriceZAR)}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Target Completion</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actual Realized Sale Price (ZAR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={exitSalePrice || ''}
                  onChange={(e) => {
                    const price = Number(e.target.value);
                    setExitSalePrice(price);
                    setExitNetProceeds(Math.max(0, price - totalCostBasis));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm"
                  placeholder="e.g. 3850000"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Net Cash Proceeds Received (ZAR) *
                  </label>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Deposited 100% to Cash in Reserve
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={exitNetProceeds || ''}
                  onChange={(e) => setExitNetProceeds(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm"
                  placeholder="Net cash received after commissions/settlement"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sale / Transfer Date *</label>
                  <input
                    type="date"
                    required
                    value={exitSoldDate}
                    onChange={(e) => setExitSoldDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Realized Net Profit</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800">
                    {formatZAR((exitSalePrice || 0) - totalCostBasis)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exit Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sold via Pam Golding private buyer, 45 days on market"
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Sale & Credit Reserve</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Flip to Rental (BRRRR Transition) Modal (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showConvertModal && activeFlip && (
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
                onClick={() => setShowConvertModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Transition <strong>{activeFlip.title}</strong> into a long-term cashflowing rental asset. This marks the Flip phase as Completed, copies over all CoCs and drive documents, and passes the <strong>total accumulated cost</strong> (Purchase + BOQ + Carrying Costs) as the rental&apos;s initial capital basis.
            </p>

            <form onSubmit={handleConvertFlip} noValidate className="space-y-4 text-xs">
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
                    <strong className="text-xs text-slate-900">{formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR)}</strong>
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
                    <strong className="text-xs text-white font-extrabold">{formatZAR(totalAllInCost)}</strong>
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
                    value={convertMarketValue || ''}
                    onChange={(e) => setConvertMarketValue(Number(e.target.value))}
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
                    {convertGrossRent > 0 && totalAllInCost > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600">
                        {((convertGrossRent * 12 / totalAllInCost) * 100).toFixed(1)}% Gross Yield
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={convertGrossRent || ''}
                    onChange={(e) => setConvertGrossRent(Number(e.target.value))}
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
                    value={convertTenantName}
                    onChange={(e) => setConvertTenantName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Tenant Pending Placement"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Phone</label>
                  <input
                    type="text"
                    value={convertTenantPhone}
                    onChange={(e) => setConvertTenantPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="+27 82 000 0000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Email</label>
                  <input
                    type="email"
                    value={convertTenantEmail}
                    onChange={(e) => setConvertTenantEmail(e.target.value)}
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
                    value={convertManagementType}
                    onChange={(e) => setConvertManagementType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Agency">Agency Managed</option>
                    <option value="Self-Managed">Self-Managed (0%)</option>
                  </select>
                </div>
                {convertManagementType === 'Agency' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Agency Name</label>
                      <input
                        type="text"
                        value={convertAgencyName}
                        onChange={(e) => setConvertAgencyName(e.target.value)}
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
                        value={convertAgencyCommission}
                        onChange={(e) => setConvertAgencyCommission(Number(e.target.value))}
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
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. Completed luxury finishes, placed executive tenant at R24k/mo"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Next BRRRR Step: Refinance & Repeat</span>
                  <p className="text-amber-800 mt-0.5">
                    Once the tenant is placed and rental income is seasoned, go to the <strong>Rentals</strong> module and click <strong>&quot;Refinance / Pull Out Equity&quot;</strong> to recycle your capital into your Seed Capital reserve for the next property.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
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
      )}

      {/* Add BOQ Item Modal (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showAddBOQModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Add Bill of Quantities (BOQ) Line Item
            </h3>

            <form onSubmit={handleAddBOQ} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                  <select
                    value={boqCategory}
                    onChange={(e) => setBoqCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Demolition & Prep">Demolition & Prep</option>
                    <option value="Plumbing & Wet Works">Plumbing & Wet Works</option>
                    <option value="Electrical & Lighting">Electrical & Lighting</option>
                    <option value="Ceilings & Drywall">Ceilings & Drywall</option>
                    <option value="Kitchen & Cabinetry">Kitchen & Cabinetry</option>
                    <option value="Bathrooms">Bathrooms</option>
                    <option value="Flooring & Tiling">Flooring & Tiling</option>
                    <option value="Painting & Finishes">Painting & Finishes</option>
                    <option value="Roofing & Structural">Roofing & Structural</option>
                    <option value="Security & Exterior">Security & Exterior</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={boqStatus}
                    onChange={(e) => setBoqStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Quoted">Quoted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope / Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1200x600 Rectified Polished Porcelain Floor Tiles"
                  value={boqDescription}
                  onChange={(e) => setBoqDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="m2, linear m, units"
                    value={boqUnit}
                    onChange={(e) => setBoqUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={boqQuantity}
                    onChange={(e) => setBoqQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Cost (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={boqBaselineUnitCost}
                    onChange={(e) => setBoqBaselineUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contractor Milestone Draw Phase</label>
                  <select
                    value={boqMilestonePhase}
                    onChange={(e) => setBoqMilestonePhase(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Deposit">Phase 1: Deposit (20%)</option>
                    <option value="First Fix / Wet Works">Phase 2: First Fix / Wet Works (30%)</option>
                    <option value="Finishes">Phase 3: Finishes & Tiling (30%)</option>
                    <option value="Retention">Phase 4: Practical Completion Retention (20%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Retention Withheld (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={boqRetentionPercent}
                    onChange={(e) => setBoqRetentionPercent(Number(e.target.value))}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Held until practical completion</span>
                </div>
              </div>

              {/* Sponsor / Barter Accounting Section */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-purple-950">
                  <input
                    type="checkbox"
                    checked={boqIsSponsored}
                    onChange={(e) => setBoqIsSponsored(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-purple-700" />
                    <span>Sponsor Barter / Trade Partner Item (Builders Warehouse, Saint-Gobain, Sonae Arauco)</span>
                  </span>
                </label>

                {boqIsSponsored && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Commercial Retail Value (ZAR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={boqCommercialRetailValue}
                        onChange={(e) => setBoqCommercialRetailValue(Number(e.target.value))}
                        placeholder="e.g. 45000"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                      <span className="text-[9px] text-slate-500 mt-0.5 block">Full store retail price</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Net Cash Outflow (ZAR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={boqActualCashOutflow}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBoqActualCashOutflow(val);
                          setBoqActualCost(val);
                        }}
                        placeholder="e.g. 15000"
                        className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-bold text-purple-900"
                      />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5 block">
                        Saved: {formatZAR(Math.max(0, boqCommercialRetailValue - boqActualCashOutflow))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Actual Invoice Cost (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={boqActualCost}
                    onChange={(e) => setBoqActualCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Contractor</label>
                  <select
                    value={boqSupplier}
                    onChange={(e) => setBoqSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.branchLocation})
                      </option>
                    ))}
                    <option value="Builders Warehouse Sandton">Builders Warehouse Sandton</option>
                    <option value="Saint-Gobain Gyproc">Saint-Gobain Gyproc</option>
                    <option value="Sonae Arauco Panels">Sonae Arauco Panels</option>
                    <option value="Independent Contractor">Independent Contractor</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddBOQModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Flip Project Modal (Add & Edit) (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showFlipModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {editingFlipId ? (
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
                onClick={() => {
                  setShowFlipModal(false);
                  setEditingFlipId(null);
                  setPdfParseNotice(null);
                  setExtractedValuationZAR(null);
                }}
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
                  if (files.length > 0) handleFlipPdfSelected(files);
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

            <form onSubmit={handleSaveFlip} noValidate className="space-y-4 text-xs">
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
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border ${
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
                      onChange={(e) => setFlipTaxEntityType(e.target.value as any)}
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
                      onChange={(e) => setFlipRccStatus(e.target.value as any)}
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
                  onClick={() => {
                    setShowFlipModal(false);
                    setEditingFlipId(null);
                    setPdfParseNotice(null);
                    setExtractedValuationZAR(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 ${
                    editingFlipId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  } text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5`}
                >
                  {editingFlipId && <CheckCircle2 className="w-4 h-4" />}
                  <span>{editingFlipId ? 'Update Flip Project' : 'Create Flip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Directory Modal (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-indigo-600" />
                  Local South African Supplier & Contractor Book
                </h3>
                <p className="text-xs text-slate-500">
                  Builders Warehouse, Chamberlains, Plumblink, Tile Africa, and certified Wireman electricians.
                </p>
              </div>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* List Suppliers */}
            <div className="space-y-3 mb-6">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{sup.name}</span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                        {sup.category}
                      </span>
                      {sup.hasCoC && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          Wireman CoC Certified
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {sup.branchLocation} {sup.contactPerson && `• Contact: ${sup.contactPerson}`}
                    </p>
                    <div className="text-slate-600 text-[11px] mt-1 flex items-center gap-3">
                      <span>Phone: <strong className="text-slate-800">{sup.phone}</strong></span>
                      {sup.discountTerms && (
                        <span className="text-emerald-700 font-semibold">{sup.discountTerms}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSupplier(sup.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Remove supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Supplier Form */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <h4 className="font-bold text-xs text-slate-800 mb-3">Add Local Supplier / Contractor</h4>
              <form onSubmit={handleAddSupplier} noValidate className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier / Contractor Name *</label>
                    <input
                      type="text"
                      name="supplierCompany"
                      autoComplete="organization"
                      required
                      placeholder="e.g. Buco Menlyn"
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                    <select
                      value={supCategory}
                      onChange={(e) => setSupCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="General Building Merchant">General Building Merchant</option>
                      <option value="Hardware & Timber">Hardware & Timber</option>
                      <option value="Plumbing Supplies">Plumbing Supplies</option>
                      <option value="Electrical Supplies">Electrical Supplies</option>
                      <option value="Tiles & Sanitary">Tiles & Sanitary</option>
                      <option value="Specialist Contractor">Specialist Contractor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch / Location</label>
                    <input
                      type="text"
                      name="supplierBranch"
                      autoComplete="off"
                      placeholder="e.g. Paarden Eiland"
                      value={supBranch}
                      onChange={(e) => setSupBranch(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      placeholder="+27 11 000 0000"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trade Discount Terms</label>
                    <input
                      type="text"
                      name="tradeDiscount"
                      autoComplete="off"
                      placeholder="e.g. 5% Cash Discount"
                      value={supDiscount}
                      onChange={(e) => setSupDiscount(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supHasCoc}
                      onChange={(e) => setSupHasCoc(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Has CoC Accreditation (Electrical / Plumbing)</span>
                  </label>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit Funding Campaign Modal (Mobile Bottom-Sheet / Desktop Centered Dialog) */}
      {showFundingModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Edit Deal Funding Campaign & Investor Terms
            </h3>

            <form onSubmit={handleSaveFunding} noValidate className="space-y-4 text-xs">
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
                    onChange={(e) => setPrimaryFunderType(e.target.value as any)}
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
                    onChange={(e) => setPromisedReturnType(e.target.value as any)}
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
                    onChange={(e) => setPromisedPayoutSchedule(e.target.value as any)}
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
                  onClick={() => setShowFundingModal(false)}
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
      )}

      {/* Delay Sensitivity Matrix Modal (Requirement 2) */}
      {activeFlip && showDelayMatrixModal && (
        <DelayMatrixModal
          key={activeFlip.id}
          isOpen={showDelayMatrixModal}
          onClose={() => setShowDelayMatrixModal(false)}
          flip={activeFlip}
          totalCostBasisZAR={totalCostBasis}
        />
      )}

    </div>
  );
}
