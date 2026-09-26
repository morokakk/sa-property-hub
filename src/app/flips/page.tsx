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
} from 'lucide-react';
import Link from 'next/link';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';
import { parseRentalPdfStatement } from '@/lib/utilities/pdfParser';

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
  const [flipCompletionDate, setFlipCompletionDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
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
    addBOQItem(activeFlip.id, {
      category: boqCategory,
      itemDescription: boqDescription,
      unit: boqUnit,
      quantity: boqQuantity,
      baselineUnitCostZAR: boqBaselineUnitCost,
      baselineTotalZAR: baselineTotal,
      actualCostZAR: boqActualCost,
      varianceZAR: boqActualCost - baselineTotal,
      supplierOrContractor: boqSupplier,
      status: boqStatus,
    });

    setShowAddBOQModal(false);
    setBoqDescription('');
    setBoqActualCost(0);
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
    setFlipCompletionDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
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
    setFlipCompletionDate(activeFlip.targetCompletionDate);
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
        targetCompletionDate: flipCompletionDate,
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
        targetCompletionDate: flipCompletionDate,
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
  const totalBOQBaseline = activeFlip?.boq.reduce((s, i) => s + i.baselineTotalZAR, 0) || 0;
  const totalBOQActual = activeFlip?.boq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0) || 0;
  const totalBOQVariance = totalBOQActual - totalBOQBaseline;

  // Holding Period Carrying Costs (interim bond interest, rates, levies, security)
  const flipHoldingMonths = activeFlip?.estimatedDurationMonths ?? 6;
  const flipMonthlyHoldingCost = activeFlip?.monthlyHoldingCostZAR ?? 0;
  const totalHoldingCost = flipHoldingMonths * flipMonthlyHoldingCost;

  const totalCostBasis =
    (activeFlip?.purchasePriceZAR || 0) +
    (activeFlip?.acquisitionCostsZAR || 0) +
    totalBOQActual;

  const totalAllInCost = totalCostBasis + totalHoldingCost;

  const projectedNetProfit = (activeFlip?.targetExitPriceZAR || 0) - totalAllInCost;
  const projectedROI = totalAllInCost > 0 ? (projectedNetProfit / totalAllInCost) * 100 : 0;

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
                      {formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Legal/Duty: {formatZAR(activeFlip.acquisitionCostsZAR)}
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
                  <div className="bg-white p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between">
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

                    <div className="mt-2.5 pt-2 border-t border-amber-100">
                      <button
                        type="button"
                        onClick={() => setShowHoldingBreakdown((prev) => !prev)}
                        className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 flex items-center justify-between w-full cursor-pointer transition-colors"
                      >
                        <span>{showHoldingBreakdown ? '▲ Hide Breakdown' : '▼ Itemized Breakdown'}</span>
                        <span className="text-[9px] text-slate-400">Monthly</span>
                      </button>

                      {showHoldingBreakdown && (
                        <div className="mt-2 space-y-1 text-[10px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 animate-in fade-in duration-150">
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
                      {formatZAR(projectedNetProfit)}
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5 font-bold flex items-center justify-between">
                      <span>{formatPercent(projectedROI)} Net ROI</span>
                      <span className="text-[9px] text-emerald-300 opacity-90 font-medium">After Holding Costs</span>
                    </div>
                  </div>
                </div>

                {/* Holding Cost Deduction Formula Banner */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap text-slate-700">
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Operational Math:</span>
                    </span>
                    <span>Exit {formatZAR(activeFlip.targetExitPriceZAR)}</span>
                    <span className="text-slate-400">−</span>
                    <span>Acquisition ({formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR)})</span>
                    <span className="text-slate-400">−</span>
                    <span>BOQ Spend ({formatZAR(totalBOQActual)})</span>
                    <span className="text-slate-400">−</span>
                    <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      Total Holding Cost ({flipHoldingMonths} mos × {formatZAR(flipMonthlyHoldingCost)}/mo = {formatZAR(totalHoldingCost)})
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 font-medium mr-1.5">= Final Net Profit:</span>
                    <strong className="text-emerald-700 font-black text-sm">{formatZAR(projectedNetProfit)}</strong>
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

                {/* SA Statutory Compliance (CoC) */}
                <ComplianceChecklist
                  certificates={activeFlip.cocChecklist}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { cocChecklist: updated })}
                />

                {/* Cloud & Web Document Vault */}
                <CloudDriveLinkVault
                  vault={activeFlip.driveVault}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { driveVault: updated })}
                />

                {/* Bill of Quantities (BOQ) Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Bill of Quantities (BOQ)</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({activeFlip.boq.length} Line Items)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Baseline estimates vs. actual contractor & supplier invoices.
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
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                          <th className="p-3.5 pl-5">Trade Category</th>
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
                            <td className="p-3.5 max-w-xs">
                              <div className="font-medium text-slate-800">{item.itemDescription}</div>
                              {item.invoiceRef && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Ref: {item.invoiceRef}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-3.5 font-medium text-slate-700">
                              {formatZAR(item.baselineTotalZAR)}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900">
                              {formatZAR(item.actualCostZAR)}
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
                  const costBasis =
                    (flip.purchasePriceZAR || 0) +
                    (flip.acquisitionCostsZAR || 0) +
                    totalBoqActual;
                  const holdingMonths = flip.estimatedDurationMonths ?? 6;
                  const totalHoldingCost = holdingMonths * (flip.monthlyHoldingCostZAR ?? 0);
                  const fullCostBasis = costBasis + totalHoldingCost;
                  const salePrice = flip.actualSalePriceZAR || flip.targetExitPriceZAR || 0;
                  const realizedNetProfit = salePrice - costBasis;
                  const realizedROI = costBasis > 0 ? (realizedNetProfit / costBasis) * 100 : 0;
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
                              <strong className="text-xs font-bold text-slate-700">{formatZAR(costBasis)}</strong>
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

      {/* Mark as Flipped / Sold Exit Modal */}
      {showExitModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
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

      {/* Convert Flip to Rental (BRRRR Transition) Modal */}
      {showConvertModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in my-8 max-h-[90vh] overflow-y-auto">
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

      {/* Add BOQ Item Modal */}
      {showAddBOQModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Add Bill of Quantities (BOQ) Line Item
            </h3>

            <form onSubmit={handleAddBOQ} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
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

      {/* Unified Flip Project Modal (Add & Edit) */}
      {showFlipModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Renovation Budget (ZAR)</label>
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

      {/* Supplier Directory Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
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
      {/* Edit Funding Campaign Modal */}
      {showFundingModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Edit Deal Funding Campaign & Investor Terms
            </h3>

            <form onSubmit={handleSaveFunding} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
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

    </div>
  );
}
