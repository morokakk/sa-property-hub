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
} from 'lucide-react';
import Link from 'next/link';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';

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
  const suppliers = usePortfolioStore((state) => state.suppliers);
  const addSupplier = usePortfolioStore((state) => state.addSupplier);
  const deleteSupplier = usePortfolioStore((state) => state.deleteSupplier);
  const funding = usePortfolioStore((state) => state.funding);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);

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
  const [showAddFlipModal, setShowAddFlipModal] = useState(false);
  const [showEditFlipModal, setShowEditFlipModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showFundingModal, setShowFundingModal] = useState(false);

  // Edit Flip Modal Form State
  const [editFlipTitle, setEditFlipTitle] = useState('');
  const [editFlipAddress, setEditFlipAddress] = useState('');
  const [editFlipCity, setEditFlipCity] = useState('');
  const [editFlipPurchasePrice, setEditFlipPurchasePrice] = useState(0);
  const [editFlipAcquisitionCosts, setEditFlipAcquisitionCosts] = useState(0);
  const [editFlipRenovationBudget, setEditFlipRenovationBudget] = useState(0);
  const [editFlipEstimatedDuration, setEditFlipEstimatedDuration] = useState(6);
  const [editFlipBondPayment, setEditFlipBondPayment] = useState(0);
  const [editFlipLevies, setEditFlipLevies] = useState(0);
  const [editFlipRates, setEditFlipRates] = useState(0);
  const [editFlipOtherHoldingCost, setEditFlipOtherHoldingCost] = useState(0);
  const [editFlipTargetExit, setEditFlipTargetExit] = useState(0);
  const [editFlipCompletionDate, setEditFlipCompletionDate] = useState('');
  const [editFlipPropertyType, setEditFlipPropertyType] = useState<PropertyTitleType>('Freehold House');
  const [editFlipAgmDate, setEditFlipAgmDate] = useState('');
  const [editFlipMasterFolderUrl, setEditFlipMasterFolderUrl] = useState('');
  const [editFlipOtpUrl, setEditFlipOtpUrl] = useState('');
  const [editFlipRatesBillUrl, setEditFlipRatesBillUrl] = useState('');
  const [editFlipTitleDeedUrl, setEditFlipTitleDeedUrl] = useState('');

  const openEditFlipModal = () => {
    if (!activeFlip) return;
    setEditFlipTitle(activeFlip.title);
    setEditFlipAddress(activeFlip.address);
    setEditFlipCity(activeFlip.city);
    setEditFlipPurchasePrice(activeFlip.purchasePriceZAR);
    setEditFlipAcquisitionCosts(activeFlip.acquisitionCostsZAR);
    setEditFlipRenovationBudget(activeFlip.baselineRenovationBudgetZAR);
    setEditFlipEstimatedDuration(activeFlip.estimatedDurationMonths ?? 6);

    const existingHolding = activeFlip.monthlyHoldingCostZAR ?? 15000;
    const bond = activeFlip.monthlyBondPaymentZAR !== undefined ? activeFlip.monthlyBondPaymentZAR : Math.round(existingHolding * 0.6);
    const levies = activeFlip.propertyType === 'Freehold House' ? 0 : (activeFlip.monthlyLeviesZAR !== undefined ? activeFlip.monthlyLeviesZAR : Math.round(existingHolding * 0.15));
    const rates = activeFlip.monthlyRatesTaxesZAR !== undefined ? activeFlip.monthlyRatesTaxesZAR : Math.round(existingHolding * 0.15);
    const other = activeFlip.monthlyOtherHoldingCostZAR !== undefined ? activeFlip.monthlyOtherHoldingCostZAR : Math.max(0, existingHolding - (bond + levies + rates));

    setEditFlipBondPayment(bond);
    setEditFlipLevies(levies);
    setEditFlipRates(rates);
    setEditFlipOtherHoldingCost(other);
    setEditFlipTargetExit(activeFlip.targetExitPriceZAR);
    setEditFlipCompletionDate(activeFlip.targetCompletionDate);
    setEditFlipPropertyType(activeFlip.propertyType || 'Freehold House');
    setEditFlipAgmDate(activeFlip.agmDate || '');
    setEditFlipMasterFolderUrl(activeFlip.driveVault?.masterFolderUrl || '');
    setEditFlipOtpUrl(activeFlip.driveVault?.otpDocumentUrl || '');
    setEditFlipRatesBillUrl(activeFlip.driveVault?.ratesBillUrl || '');
    setEditFlipTitleDeedUrl(activeFlip.driveVault?.titleDeedUrl || '');
    setShowEditFlipModal(true);
  };

  const handleSaveEditFlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlip) return;
    const isScheme = editFlipPropertyType === 'Sectional Title Apartment' || editFlipPropertyType === 'Townhouse / Cluster';
    const updatedDriveVault: CloudDriveVault = {
      masterFolderUrl: editFlipMasterFolderUrl.trim() || undefined,
      otpDocumentUrl: editFlipOtpUrl.trim() || undefined,
      ratesBillUrl: editFlipRatesBillUrl.trim() || undefined,
      titleDeedUrl: editFlipTitleDeedUrl.trim() || undefined,
    };
    const finalLevies = editFlipPropertyType === 'Freehold House' ? 0 : Number(editFlipLevies);
    const totalMonthlyHolding = Number(editFlipBondPayment) + finalLevies + Number(editFlipRates) + Number(editFlipOtherHoldingCost);

    updateFlip(activeFlip.id, {
      title: editFlipTitle,
      address: editFlipAddress,
      city: editFlipCity,
      propertyType: editFlipPropertyType,
      agmDate: isScheme && editFlipAgmDate ? editFlipAgmDate : undefined,
      purchasePriceZAR: Number(editFlipPurchasePrice),
      acquisitionCostsZAR: Number(editFlipAcquisitionCosts),
      baselineRenovationBudgetZAR: Number(editFlipRenovationBudget),
      estimatedDurationMonths: Number(editFlipEstimatedDuration),
      monthlyHoldingCostZAR: totalMonthlyHolding,
      monthlyBondPaymentZAR: Number(editFlipBondPayment),
      monthlyLeviesZAR: finalLevies,
      monthlyRatesTaxesZAR: Number(editFlipRates),
      monthlyOtherHoldingCostZAR: Number(editFlipOtherHoldingCost),
      targetExitPriceZAR: Number(editFlipTargetExit),
      targetCompletionDate: editFlipCompletionDate,
      driveVault: updatedDriveVault,
    });
    setShowEditFlipModal(false);
  };

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

  // New Flip Project Form State
  const [newFlipTitle, setNewFlipTitle] = useState('');
  const [newFlipAddress, setNewFlipAddress] = useState('');
  const [newFlipCity, setNewFlipCity] = useState('Cape Town');
  const [newFlipPurchasePrice, setNewFlipPurchasePrice] = useState(2500000);
  const [newFlipAcquisitionCosts, setNewFlipAcquisitionCosts] = useState(185000);
  const [newFlipRenovationBudget, setNewFlipRenovationBudget] = useState(450000);
  const [newFlipEstimatedDuration, setNewFlipEstimatedDuration] = useState(6);
  const [newFlipBondPayment, setNewFlipBondPayment] = useState(9500);
  const [newFlipLevies, setNewFlipLevies] = useState(0);
  const [newFlipRates, setNewFlipRates] = useState(3500);
  const [newFlipOtherHoldingCost, setNewFlipOtherHoldingCost] = useState(2000);
  const [newFlipTargetExit, setNewFlipTargetExit] = useState(3800000);
  const [newFlipCompletionDate, setNewFlipCompletionDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newFlipPropertyType, setNewFlipPropertyType] = useState<PropertyTitleType>('Freehold House');
  const [newFlipAgmDate, setNewFlipAgmDate] = useState<string>('');
  const [newFlipMasterFolderUrl, setNewFlipMasterFolderUrl] = useState('');
  const [newFlipOtpUrl, setNewFlipOtpUrl] = useState('');
  const [newFlipRatesBillUrl, setNewFlipRatesBillUrl] = useState('');
  const [newFlipTitleDeedUrl, setNewFlipTitleDeedUrl] = useState('');

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

  const handleAddFlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlipTitle) return;

    const isScheme = newFlipPropertyType === 'Sectional Title Apartment' || newFlipPropertyType === 'Townhouse / Cluster';
    const finalLevies = newFlipPropertyType === 'Freehold House' ? 0 : Number(newFlipLevies);
    const totalMonthlyHolding = Number(newFlipBondPayment) + finalLevies + Number(newFlipRates) + Number(newFlipOtherHoldingCost);

    const createdFlip: FlipProject = {
      id: `flip-${Date.now()}`,
      title: newFlipTitle,
      address: newFlipAddress || `${newFlipCity} Project`,
      city: newFlipCity,
      propertyType: newFlipPropertyType,
      agmDate: isScheme && newFlipAgmDate ? newFlipAgmDate : undefined,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePriceZAR: newFlipPurchasePrice,
      acquisitionCostsZAR: newFlipAcquisitionCosts,
      baselineRenovationBudgetZAR: newFlipRenovationBudget,
      estimatedDurationMonths: newFlipEstimatedDuration,
      monthlyHoldingCostZAR: totalMonthlyHolding,
      monthlyBondPaymentZAR: Number(newFlipBondPayment),
      monthlyLeviesZAR: finalLevies,
      monthlyRatesTaxesZAR: Number(newFlipRates),
      monthlyOtherHoldingCostZAR: Number(newFlipOtherHoldingCost),
      targetExitPriceZAR: newFlipTargetExit,
      targetCompletionDate: newFlipCompletionDate,
      currentPhase: 'Acquisition & Conveyancing',
      linkedFundingIds: [],
      fundingRequiredZAR: Math.round((newFlipPurchasePrice + newFlipAcquisitionCosts + newFlipRenovationBudget) * 0.7),
      capitalRaisedZAR: 0,
      promisedReturnType: 'Fixed Interest',
      promisedReturnRatePercent: 14.0,
      promisedPayoutSchedule: 'Monthly Interest',
      securityOffered: '2nd Mortgage Bond registered over title deed',
      status: 'Active',
      driveVault: {
        masterFolderUrl: newFlipMasterFolderUrl.trim() || undefined,
        otpDocumentUrl: newFlipOtpUrl.trim() || undefined,
        ratesBillUrl: newFlipRatesBillUrl.trim() || undefined,
        titleDeedUrl: newFlipTitleDeedUrl.trim() || undefined,
      },
      boq: [],
    };

    addFlip(createdFlip);
    setSelectedFlipId(createdFlip.id);
    setShowAddFlipModal(false);
    setNewFlipTitle('');
    setNewFlipAddress('');
    setNewFlipPropertyType('Freehold House');
    setNewFlipAgmDate('');
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
          <div className="flex items-center gap-2">
            <ImportDropdown type="flips" />
            <button
              onClick={() => setShowSupplierModal(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Supplier Directory ({suppliers.length})
            </button>
            <button
              onClick={() => setShowAddFlipModal(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
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

            {completedFlips.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No completed flips archived yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you complete a renovation and sale, click &quot;Mark as Flipped / Sold&quot; to record your realized figures and archive the deal here.
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
                  const totalBoqActual = (flip.boq || []).reduce(
                    (sum, b) => sum + (b.actualCostZAR || b.baselineTotalZAR || 0),
                    0
                  );
                  const costBasis =
                    (flip.purchasePriceZAR || 0) +
                    (flip.acquisitionCostsZAR || 0) +
                    totalBoqActual;
                  const salePrice = flip.actualSalePriceZAR || flip.targetExitPriceZAR || 0;
                  const realizedNetProfit = salePrice - costBasis;
                  const realizedROI = costBasis > 0 ? (realizedNetProfit / costBasis) * 100 : 0;

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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>FLIPPED / SOLD</span>
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-base">{flip.title}</h4>
                            <p className="text-xs text-slate-500">{flip.address}, {flip.city}</p>
                          </div>
                          {flip.soldDate && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                              Sold {formatDate(flip.soldDate)}
                            </span>
                          )}
                        </div>

                        {/* Financial Realized Highlights */}
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

                        {flip.exitNotes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700">Exit Notes: </span>
                            <span>{flip.exitNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          Final Realized ROI: <strong className="text-slate-900 font-bold">{formatPercent(realizedROI)}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Reopen flip "${flip.title}" back to active pipeline? This will revert the credited cash of ${formatZAR(flip.netCashProceedsZAR || 0)} from Cash in Reserve.`)) {
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

            <form onSubmit={handleCompleteFlip} className="space-y-4 text-xs">
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
                  min="1"
                  step="10000"
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
                  step="5000"
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

      {/* Add BOQ Item Modal */}
      {showAddBOQModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Add Bill of Quantities (BOQ) Line Item
            </h3>

            <form onSubmit={handleAddBOQ} className="space-y-4 text-xs">
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
                    min="1"
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
                    step="500"
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
                    step="500"
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

      {/* Add Flip Modal */}
      {showAddFlipModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Hammer className="w-5 h-5 text-indigo-600" />
              Scaffold New Buy-and-Flip Project
            </h3>

            <form onSubmit={handleAddFlip} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camps Bay Sunset Redesign"
                  value={newFlipTitle}
                  onChange={(e) => setNewFlipTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 18 Victoria Road"
                    value={newFlipAddress}
                    onChange={(e) => setNewFlipAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newFlipCity}
                    onChange={(e) => setNewFlipCity(e.target.value)}
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
                        onClick={() => setNewFlipPropertyType(pt.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border ${
                          newFlipPropertyType === pt.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(newFlipPropertyType === 'Sectional Title Apartment' || newFlipPropertyType === 'Townhouse / Cluster') && (
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
                      value={newFlipAgmDate}
                      onChange={(e) => setNewFlipAgmDate(e.target.value)}
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
                    min="100000"
                    step="50000"
                    value={newFlipPurchasePrice}
                    onChange={(e) => setNewFlipPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Acquisition Costs (Duty + Fees)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={newFlipAcquisitionCosts}
                    onChange={(e) => setNewFlipAcquisitionCosts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Renovation Budget (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="25000"
                    value={newFlipRenovationBudget}
                    onChange={(e) => setNewFlipRenovationBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Exit Price (ZAR)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={newFlipTargetExit}
                    onChange={(e) => setNewFlipTargetExit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Holding Period Carrying Costs Inputs (Itemized) */}
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wider">
                    Holding Period Carrying Costs (Itemized)
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Total: {formatZAR(newFlipEstimatedDuration * (Number(newFlipBondPayment) + (newFlipPropertyType === 'Freehold House' ? 0 : Number(newFlipLevies)) + Number(newFlipRates) + Number(newFlipOtherHoldingCost)))}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Estimated Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={newFlipEstimatedDuration}
                    onChange={(e) => setNewFlipEstimatedDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Interim Bond (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newFlipBondPayment}
                      onChange={(e) => setNewFlipBondPayment(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 text-[11px]">
                        {newFlipPropertyType === 'Freehold House' ? 'Levies (N/A)' : 'Levies (ZAR/m)'}
                      </label>
                      {newFlipPropertyType === 'Freehold House' && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">R0</span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      disabled={newFlipPropertyType === 'Freehold House'}
                      value={newFlipPropertyType === 'Freehold House' ? 0 : newFlipLevies}
                      onChange={(e) => setNewFlipLevies(Number(e.target.value))}
                      className={`w-full px-2 py-1.5 border rounded-lg text-xs font-medium ${
                        newFlipPropertyType === 'Freehold House'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Rates & Taxes (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newFlipRates}
                      onChange={(e) => setNewFlipRates(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Other Costs (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newFlipOtherHoldingCost}
                      onChange={(e) => setNewFlipOtherHoldingCost(Number(e.target.value))}
                      placeholder="Security, ins."
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                </div>

                <div className="p-2 bg-amber-100/70 rounded-lg flex items-center justify-between text-xs text-amber-950 font-semibold">
                  <span>Total Monthly Carrying Burn:</span>
                  <span className="font-bold text-sm text-amber-800">
                    {formatZAR(Number(newFlipBondPayment) + (newFlipPropertyType === 'Freehold House' ? 0 : Number(newFlipLevies)) + Number(newFlipRates) + Number(newFlipOtherHoldingCost))}/mo
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
                      value={newFlipMasterFolderUrl}
                      onChange={(e) => setNewFlipMasterFolderUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signed OTP PDF URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newFlipOtpUrl}
                      onChange={(e) => setNewFlipOtpUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rates & Levies Statement</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newFlipRatesBillUrl}
                      onChange={(e) => setNewFlipRatesBillUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title Deed / SG Diagram</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newFlipTitleDeedUrl}
                      onChange={(e) => setNewFlipTitleDeedUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={newFlipCompletionDate}
                  onChange={(e) => setNewFlipCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddFlipModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Create Flip
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
              <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier / Contractor Name *</label>
                    <input
                      type="text"
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
                      placeholder="e.g. Paarden Eiland"
                      value={supBranch}
                      onChange={(e) => setSupBranch(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="text"
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

            <form onSubmit={handleSaveFunding} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Facility (ZAR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
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
                    min="0"
                    step="50000"
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
                    step="0.5"
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

      {/* Edit Flip Project Modal */}
      {showEditFlipModal && activeFlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Buy-and-Flip Parameters</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditFlipModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditFlip} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editFlipTitle}
                  onChange={(e) => setEditFlipTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={editFlipAddress}
                    onChange={(e) => setEditFlipAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editFlipCity}
                    onChange={(e) => setEditFlipCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Property Title Type */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Property Title Type
                </label>
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
                      onClick={() => setEditFlipPropertyType(pt.id)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border ${
                        editFlipPropertyType === pt.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>

                {(editFlipPropertyType === 'Sectional Title Apartment' || editFlipPropertyType === 'Townhouse / Cluster') && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block font-semibold text-slate-700 text-xs mb-1">
                      📅 Scheduled Body Corporate AGM Date
                    </label>
                    <input
                      type="date"
                      value={editFlipAgmDate}
                      onChange={(e) => setEditFlipAgmDate(e.target.value)}
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
                    min="100000"
                    step="50000"
                    value={editFlipPurchasePrice}
                    onChange={(e) => setEditFlipPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Acquisition Costs (Duty + Fees)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={editFlipAcquisitionCosts}
                    onChange={(e) => setEditFlipAcquisitionCosts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Renovation Budget (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={editFlipRenovationBudget}
                    onChange={(e) => setEditFlipRenovationBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Exit Price (ZAR)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={editFlipTargetExit}
                    onChange={(e) => setEditFlipTargetExit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Holding Period Carrying Costs Inputs */}
              {/* Holding Period Carrying Costs Inputs (Itemized) */}
              <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Holding Period Carrying Costs (Itemized)</span>
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Total: {formatZAR(editFlipEstimatedDuration * (Number(editFlipBondPayment) + (editFlipPropertyType === 'Freehold House' ? 0 : Number(editFlipLevies)) + Number(editFlipRates) + Number(editFlipOtherHoldingCost)))}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Estimated Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    required
                    value={editFlipEstimatedDuration}
                    onChange={(e) => setEditFlipEstimatedDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Total flip lifecycle</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Interim Bond (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editFlipBondPayment}
                      onChange={(e) => setEditFlipBondPayment(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 text-[11px]">
                        {editFlipPropertyType === 'Freehold House' ? 'Levies (N/A)' : 'Levies (ZAR/m)'}
                      </label>
                      {editFlipPropertyType === 'Freehold House' && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">R0</span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      disabled={editFlipPropertyType === 'Freehold House'}
                      value={editFlipPropertyType === 'Freehold House' ? 0 : editFlipLevies}
                      onChange={(e) => setEditFlipLevies(Number(e.target.value))}
                      className={`w-full px-2 py-1.5 border rounded-lg text-xs font-medium ${
                        editFlipPropertyType === 'Freehold House'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Rates & Taxes (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editFlipRates}
                      onChange={(e) => setEditFlipRates(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Other Costs (ZAR/m)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editFlipOtherHoldingCost}
                      onChange={(e) => setEditFlipOtherHoldingCost(Number(e.target.value))}
                      placeholder="Security, ins."
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                    />
                  </div>
                </div>

                <div className="p-2 bg-amber-100/70 rounded-lg flex items-center justify-between text-xs text-amber-950 font-semibold">
                  <span>Total Monthly Carrying Burn:</span>
                  <span className="font-bold text-sm text-amber-800">
                    {formatZAR(Number(editFlipBondPayment) + (editFlipPropertyType === 'Freehold House' ? 0 : Number(editFlipLevies)) + Number(editFlipRates) + Number(editFlipOtherHoldingCost))}/mo
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 italic">
                  Deducted automatically from Projected Net Upside to capture true operational cash burn during renovations.
                </p>
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
                      value={editFlipMasterFolderUrl}
                      onChange={(e) => setEditFlipMasterFolderUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signed OTP PDF URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editFlipOtpUrl}
                      onChange={(e) => setEditFlipOtpUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rates & Levies Statement</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editFlipRatesBillUrl}
                      onChange={(e) => setEditFlipRatesBillUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title Deed / SG Diagram</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editFlipTitleDeedUrl}
                      onChange={(e) => setEditFlipTitleDeedUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={editFlipCompletionDate}
                  onChange={(e) => setEditFlipCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditFlipModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Flip Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
