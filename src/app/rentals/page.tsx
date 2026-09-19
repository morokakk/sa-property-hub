'use client';

import React, { useState, useEffect } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { RentalProperty, MaintenanceLog, PropertyTitleType, CloudDriveVault } from '@/types';
import { PropertyTypeBadge, AgmDateChip, isAgmUpcoming } from '@/components/common/PropertyTypeBadge';
import { calculateRentalCashflow, calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import {
  Building2,
  PlusCircle,
  Wrench,
  UserCheck,
  Calendar,
  CreditCard,
  ShieldCheck,
  FolderArchive,
  Phone,
  Mail,
  Trash2,
  AlertCircle,
  FileCheck2,
  Edit3,
  MessageCircle,
  Archive,
  RotateCcw,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { exportRentalsCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';
import { ExtractedRentalUnit } from '@/types';
import StatementUploadModal from '@/components/rentals/StatementUploadModal';
import StatementReviewModal from '@/components/rentals/StatementReviewModal';

export function renderPropertyTypeBadge(type?: PropertyTitleType) {
  switch (type) {
    case 'Freehold House':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>🏡 Freehold House</span>
        </span>
      );
    case 'Townhouse / Cluster':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <span>🏘️ Townhouse / Cluster</span>
        </span>
      );
    case 'Multi-unit Commercial':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          <span>🏬 Commercial</span>
        </span>
      );
    case 'Sectional Title Apartment':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>🏢 Sectional Title</span>
        </span>
      );
  }
}

export function renderAgmChip(agmDate?: string) {
  if (!agmDate) return null;
  const upcoming = isAgmUpcoming(agmDate);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        upcoming
          ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
      title={upcoming ? 'Body Corporate AGM scheduled within next 30 days!' : 'Scheduled Body Corporate AGM'}
    >
      <Calendar className={`w-2.5 h-2.5 ${upcoming ? 'text-amber-700' : 'text-slate-500'}`} />
      <span>AGM: {formatDate(agmDate)}{upcoming ? ' (Upcoming)' : ''}</span>
    </span>
  );
}

function renderAgencyContactLinks(contact: string) {
  if (!contact) return null;
  const isEmail = contact.includes('@');
  const cleanPhone = contact.replace(/[^\d]/g, '');
  const isPhone = !isEmail && cleanPhone.length >= 7;

  return (
    <div className="flex items-center gap-1.5">
      {isPhone ? (
        <>
          <a
            href={`tel:${contact.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
            title={`Call ${contact}`}
          >
            <Phone className="w-2.5 h-2.5" />
            <span>Call</span>
          </a>
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            title="WhatsApp Agent"
          >
            <MessageCircle className="w-2.5 h-2.5" />
            <span>WhatsApp</span>
          </a>
        </>
      ) : (
        <a
          href={`mailto:${contact.trim()}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
          title={`Email ${contact}`}
        >
          <Mail className="w-2.5 h-2.5" />
          <span>Email</span>
        </a>
      )}
    </div>
  );
}

function InlineEditableAmount({
  value,
  onSave,
  prefix = '- ',
  disabled = false,
  disabledLabel,
  title,
}: {
  value: number;
  onSave: (val: number) => void;
  prefix?: string;
  disabled?: boolean;
  disabledLabel?: string;
  title?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(value.toString());

  useEffect(() => {
    setInputVal(value.toString());
  }, [value]);

  if (disabled) {
    return (
      <span className="text-slate-400 text-[11px]" title={disabledLabel}>
        {disabledLabel || 'R 0'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-[11px] font-bold">R</span>
        <input
          type="number"
          step="10"
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => {
            const num = Math.max(0, Number(inputVal) || 0);
            if (num !== value) onSave(num);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = Math.max(0, Number(inputVal) || 0);
              if (num !== value) onSave(num);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setInputVal(value.toString());
              setIsEditing(false);
            }
          }}
          className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 shadow-2xs"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
      title={title || 'Click to edit amount inline (auto-saves on blur or Enter)'}
    >
      <span>{prefix}{formatZAR(value)}</span>
      <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function RentalPortfolioPage() {
  const rentals = usePortfolioStore((state) => state.rentals);
  const addRental = usePortfolioStore((state) => state.addRental);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const deleteRental = usePortfolioStore((state) => state.deleteRental);
  const addMaintenanceLog = usePortfolioStore((state) => state.addMaintenanceLog);
  const markRentalAsSold = usePortfolioStore((state) => state.markRentalAsSold);
  const reopenRental = usePortfolioStore((state) => state.reopenRental);
  const reconcileImportedRentals = usePortfolioStore((state) => state.reconcileImportedRentals);
  const summary = usePortfolioSummary();

  // Active vs Sold Archive View Tab
  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');
  const activeRentals = rentals.filter((r) => r.status !== 'Sold');
  const soldRentals = rentals.filter((r) => r.status === 'Sold');

  // AI Statement BYOK Parser State
  const [showAiUploadModal, setShowAiUploadModal] = useState(false);
  const [showAiReviewModal, setShowAiReviewModal] = useState(false);
  const [aiExtractedUnits, setAiExtractedUnits] = useState<ExtractedRentalUnit[]>([]);

  // Per-card tab selection ('financials' | 'coc' | 'vault')
  const [cardTab, setCardTab] = useState<Record<string, 'financials' | 'coc' | 'vault'>>({});

  // Selected Unit for Maintenance Log
  const [selectedRentalForMaint, setSelectedRentalForMaint] = useState<RentalProperty | null>(null);
  
  // Add / Edit Rental Modal State
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);

  // Mark as Sold Exit Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedRentalForExit, setSelectedRentalForExit] = useState<RentalProperty | null>(null);
  const [exitSalePrice, setExitSalePrice] = useState<number>(0);
  const [exitNetProceeds, setExitNetProceeds] = useState<number>(0);
  const [exitSoldDate, setExitSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exitNotes, setExitNotes] = useState('');

  // New Maintenance Form State
  const [maintIssue, setMaintIssue] = useState('');
  const [maintCategory, setMaintCategory] = useState<MaintenanceLog['category']>('Plumbing');
  const [maintContractor, setMaintContractor] = useState('Rapid Response Plumbing');
  const [maintCost, setMaintCost] = useState(1500);

  // Rental Property Form State
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [propertyType, setPropertyType] = useState<PropertyTitleType>('Sectional Title Apartment');
  const [agmDate, setAgmDate] = useState('');
  const [marketValue, setMarketValue] = useState(1800000);
  const [purchasePrice, setPurchasePrice] = useState(1650000);
  const [bondBalance, setBondBalance] = useState(1100000);
  const [monthlyGrossRent, setMonthlyGrossRent] = useState(15000);
  const [monthlyLevies, setMonthlyLevies] = useState(1850);
  const [monthlyRates, setMonthlyRates] = useState(1100);
  const [monthlyBondPayment, setMonthlyBondPayment] = useState(0);
  const [bondPaymentEffectiveDate, setBondPaymentEffectiveDate] = useState('');
  const [bondRevisionNote, setBondRevisionNote] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [leaseEnd, setLeaseEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [depositHeld, setDepositHeld] = useState(30000);
  const [unpaidUtilityArrears, setUnpaidUtilityArrears] = useState(0);
  const [rentalMasterFolderUrl, setRentalMasterFolderUrl] = useState('');
  const [rentalOtpUrl, setRentalOtpUrl] = useState('');
  const [rentalRatesBillUrl, setRentalRatesBillUrl] = useState('');
  const [rentalTitleDeedUrl, setRentalTitleDeedUrl] = useState('');

  // Agency Management Form State
  const [managementType, setManagementType] = useState<'Self-Managed' | 'Agency'>('Agency');
  const [agencyName, setAgencyName] = useState('Pam Golding Sandton');
  const [agencyCommissionPercent, setAgencyCommissionPercent] = useState(8.0);
  const [agencyVatApplicable, setAgencyVatApplicable] = useState(true);
  const [agencyContact, setAgencyContact] = useState('+27 82 555 1234');

  // SARB Repo Rate PMT Calculator State
  const [pmtTargetProperty, setPmtTargetProperty] = useState<RentalProperty | null>(null);
  const [pmtInterestRate, setPmtInterestRate] = useState<number>(11.5);
  const [pmtLoanBalance, setPmtLoanBalance] = useState<number>(0);
  const [pmtLoanYears, setPmtLoanYears] = useState<number>(20);
  const [pmtEffectiveMonth, setPmtEffectiveMonth] = useState<string>('');
  const [pmtRevisionNote, setPmtRevisionNote] = useState<string>('SARB 25bps repo rate cut');

  const handleOpenPmtCalculator = (property: RentalProperty) => {
    setPmtTargetProperty(property);
    setPmtInterestRate(property.bondInterestRatePercent || 11.5);
    setPmtLoanBalance(property.outstandingBondBalanceZAR || 0);
    setPmtLoanYears(20);

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthStr = nextMonth.toLocaleString('en-ZA', { month: 'short', year: 'numeric' });

    setPmtEffectiveMonth(property.bondPaymentEffectiveDate || monthStr);
    setPmtRevisionNote(property.bondRevisionNote || 'SARB 25bps repo rate cut');
  };

  const handleApplyPmt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmtTargetProperty) return;

    const newPayment = calculateMonthlyBondRepayment(pmtLoanBalance, pmtInterestRate, pmtLoanYears);
    updateRental(pmtTargetProperty.id, {
      monthlyBondPaymentZAR: newPayment,
      outstandingBondBalanceZAR: pmtLoanBalance,
      bondInterestRatePercent: pmtInterestRate,
      bondPaymentEffectiveDate: pmtEffectiveMonth.trim() || undefined,
      bondRevisionNote: pmtRevisionNote.trim() || undefined,
    });
    setPmtTargetProperty(null);
  };

  const handleOpenAdd = () => {
    setEditingRentalId(null);
    setTitle('');
    setAddress('');
    setCity('Johannesburg');
    setPropertyType('Sectional Title Apartment');
    setAgmDate('');
    setMarketValue(1800000);
    setPurchasePrice(1650000);
    setBondBalance(1100000);
    setMonthlyGrossRent(15000);
    setMonthlyLevies(1850);
    setMonthlyRates(1100);
    setMonthlyBondPayment(0);
    setBondPaymentEffectiveDate('');
    setBondRevisionNote('');
    setTenantName('');
    setTenantPhone('');
    setTenantEmail('');
    setLeaseEnd(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setDepositHeld(30000);
    setUnpaidUtilityArrears(0);
    setRentalMasterFolderUrl('');
    setRentalOtpUrl('');
    setRentalRatesBillUrl('');
    setRentalTitleDeedUrl('');
    setManagementType('Agency');
    setAgencyName('Pam Golding Sandton');
    setAgencyCommissionPercent(8.0);
    setAgencyVatApplicable(true);
    setAgencyContact('+27 82 555 1234');
    setShowRentalModal(true);
  };

  const handleOpenEdit = (property: RentalProperty) => {
    setEditingRentalId(property.id);
    setTitle(property.title);
    setAddress(property.address);
    setCity(property.city);
    setPropertyType(property.propertyType || 'Sectional Title Apartment');
    setAgmDate(property.agmDate || '');
    setMarketValue(property.marketValueZAR);
    setPurchasePrice(property.purchasePriceZAR);
    setBondBalance(property.outstandingBondBalanceZAR);
    setMonthlyGrossRent(property.monthlyGrossRentZAR);
    setMonthlyLevies(property.propertyType === 'Freehold House' ? 0 : property.monthlyLeviesZAR);
    setMonthlyRates(property.monthlyRatesTaxesZAR);
    const estEditBond =
      property.monthlyBondPaymentZAR ||
      (property.outstandingBondBalanceZAR > 0
        ? calculateMonthlyBondRepayment(
            property.outstandingBondBalanceZAR,
            property.bondInterestRatePercent || 11.75,
            20
          )
        : 0);
    setMonthlyBondPayment(estEditBond);
    setBondPaymentEffectiveDate(property.bondPaymentEffectiveDate || '');
    setBondRevisionNote(property.bondRevisionNote || '');
    setTenantName(property.tenantName);
    setTenantPhone(property.tenantPhone);
    setTenantEmail(property.tenantEmail);
    setLeaseEnd(property.leaseEndDate);
    setDepositHeld(property.depositHeldZAR);
    setUnpaidUtilityArrears(property.unpaidUtilityArrearsZAR || 0);
    setRentalMasterFolderUrl(property.driveVault?.masterFolderUrl || '');
    setRentalOtpUrl(property.driveVault?.otpDocumentUrl || '');
    setRentalRatesBillUrl(property.driveVault?.ratesBillUrl || '');
    setRentalTitleDeedUrl(property.driveVault?.titleDeedUrl || '');
    setManagementType(property.managementType || 'Self-Managed');
    setAgencyName(property.agencyName || 'Pam Golding');
    setAgencyCommissionPercent(property.agencyCommissionPercent ?? 8.0);
    setAgencyVatApplicable(property.agencyVatApplicable !== false);
    setAgencyContact(property.agencyContact || '');
    setShowRentalModal(true);
  };

  const handleOpenExit = (property: RentalProperty) => {
    setSelectedRentalForExit(property);
    const estSale = property.marketValueZAR || property.purchasePriceZAR || 0;
    setExitSalePrice(estSale);
    const estProceeds = Math.max(0, estSale - (property.outstandingBondBalanceZAR || 0));
    setExitNetProceeds(estProceeds);
    setExitSoldDate(new Date().toISOString().split('T')[0]);
    setExitNotes('');
    setShowExitModal(true);
  };

  const handleCompleteRentalSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForExit || exitSalePrice <= 0) return;
    markRentalAsSold(selectedRentalForExit.id, exitSalePrice, exitNetProceeds, exitSoldDate, exitNotes);
    setShowExitModal(false);
    setSelectedRentalForExit(null);
    setViewTab('archive');
  };

  const handleSaveRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    // Calculate monthly bond payment (or use user-specified debit order)
    const calcBond = bondBalance > 0 ? calculateMonthlyBondRepayment(bondBalance, 11.75, 20) : 0;
    const finalBondPayment = monthlyBondPayment > 0 ? monthlyBondPayment : calcBond;
    const baseComm = managementType === 'Agency' ? monthlyGrossRent * (agencyCommissionPercent / 100) : 0;
    const agentFee = Math.round(baseComm * (agencyVatApplicable !== false ? 1.15 : 1.0));

    const finalLevies = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const isScheme = propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster';
    const finalAgmDate = isScheme && agmDate ? agmDate : undefined;

    if (editingRentalId) {
      updateRental(editingRentalId, {
        title,
        address: address || `${city} Property`,
        city,
        propertyType,
        agmDate: finalAgmDate,
        marketValueZAR: marketValue,
        purchasePriceZAR: purchasePrice,
        outstandingBondBalanceZAR: bondBalance,
        monthlyBondPaymentZAR: finalBondPayment,
        bondPaymentEffectiveDate: bondPaymentEffectiveDate.trim() || undefined,
        bondRevisionNote: bondRevisionNote.trim() || undefined,
        tenantName: tenantName || 'Tenant Unassigned',
        tenantPhone: tenantPhone || '+27 —',
        tenantEmail: tenantEmail || 'tenant@email.co.za',
        leaseEndDate: leaseEnd,
        depositHeldZAR: depositHeld,
        unpaidUtilityArrearsZAR: unpaidUtilityArrears,
        monthlyGrossRentZAR: monthlyGrossRent,
        monthlyLeviesZAR: finalLevies,
        monthlyRatesTaxesZAR: monthlyRates,
        managementType,
        agencyName: managementType === 'Agency' ? agencyName : undefined,
        agencyCommissionPercent: managementType === 'Agency' ? agencyCommissionPercent : 0,
        agencyVatApplicable: managementType === 'Agency' ? agencyVatApplicable : false,
        agencyContact: managementType === 'Agency' ? agencyContact : undefined,
        monthlyAgentFeeZAR: agentFee,
        driveVault: {
          masterFolderUrl: rentalMasterFolderUrl.trim() || undefined,
          otpDocumentUrl: rentalOtpUrl.trim() || undefined,
          ratesBillUrl: rentalRatesBillUrl.trim() || undefined,
          titleDeedUrl: rentalTitleDeedUrl.trim() || undefined,
        },
      });
    } else {
      const newUnit: RentalProperty = {
        id: `rental-${Date.now()}`,
        title,
        address: address || `${city} Property`,
        city,
        propertyType,
        agmDate: finalAgmDate,
        marketValueZAR: marketValue,
        purchasePriceZAR: purchasePrice,
        purchaseDate: new Date().toISOString().split('T')[0],
        outstandingBondBalanceZAR: bondBalance,
        bondInterestRatePercent: 11.75,
        monthlyBondPaymentZAR: finalBondPayment,
        bondPaymentEffectiveDate: bondPaymentEffectiveDate.trim() || undefined,
        bondRevisionNote: bondRevisionNote.trim() || undefined,
        tenantName: tenantName || 'Tenant Unassigned',
        tenantPhone: tenantPhone || '+27 —',
        tenantEmail: tenantEmail || 'tenant@email.co.za',
        leaseStartDate: new Date().toISOString().split('T')[0],
        leaseEndDate: leaseEnd,
        depositHeldZAR: depositHeld,
        unpaidUtilityArrearsZAR: unpaidUtilityArrears,
        annualEscalationPercent: 7.0,
        managementType,
        agencyName: managementType === 'Agency' ? agencyName : undefined,
        agencyCommissionPercent: managementType === 'Agency' ? agencyCommissionPercent : 0,
        agencyVatApplicable: managementType === 'Agency' ? agencyVatApplicable : false,
        agencyContact: managementType === 'Agency' ? agencyContact : undefined,
        monthlyGrossRentZAR: monthlyGrossRent,
        monthlyLeviesZAR: finalLevies,
        monthlyRatesTaxesZAR: monthlyRates,
        monthlyAgentFeeZAR: agentFee,
        monthlyMaintenanceReserveZAR: 600,
        driveVault: {
          masterFolderUrl: rentalMasterFolderUrl.trim() || undefined,
          otpDocumentUrl: rentalOtpUrl.trim() || undefined,
          ratesBillUrl: rentalRatesBillUrl.trim() || undefined,
          titleDeedUrl: rentalTitleDeedUrl.trim() || undefined,
        },
        maintenanceHistory: [],
        status: tenantName ? 'Occupied' : 'Vacant',
      };
      addRental(newUnit);
    }

    setShowRentalModal(false);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalForMaint || !maintIssue) return;

    addMaintenanceLog(selectedRentalForMaint.id, {
      dateLogged: new Date().toISOString().split('T')[0],
      issueDescription: maintIssue,
      category: maintCategory,
      contractorName: maintContractor,
      costZAR: maintCost,
      status: 'Resolved',
      invoiceRef: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setMaintIssue('');
    setMaintCost(1500);
    // Refresh modal
    const updated = rentals.find((r) => r.id === selectedRentalForMaint.id);
    if (updated) setSelectedRentalForMaint(updated);
  };

  const totalGrossMonthlyRent = activeRentals.reduce((s, r) => s + r.monthlyGrossRentZAR, 0);
  const totalNetMonthlyRent = summary.monthlyNetRentalCashflow;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Rental Portfolio"
        subtitle="Manage active income properties, tenant leases, trust deposits, and maintenance histories"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiUploadModal(true)}
              title="Parse managing agent PDF / image statements with AI"
              className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>AI Statement Import</span>
            </button>
            <ImportDropdown type="rentals" />
            <button
              onClick={() => exportRentalsCSV(activeRentals)}
              title="Download active rentals register as CSV"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Rental Property</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rental Asset Value</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalRentalValue)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeRentals.length} active rental units</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Monthly Rent</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalGrossMonthlyRent)}/m</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Annual: {formatZAR(totalGrossMonthlyRent * 12)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Monthly Cash Flow</span>
            <div className={`text-xl font-bold mt-1 ${totalNetMonthlyRent >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatZAR(totalNetMonthlyRent)}/m
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">After bonds, levies, agency & taxes</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Rental Bonds Outstanding</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalBondLiabilities)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active mortgage debt</p>
          </div>
        </div>

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
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Portfolio ({activeRentals.length})</span>
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
            <span>Sold Archive ({soldRentals.length})</span>
          </button>
        </div>

        {/* ACTIVE PORTFOLIO VIEW */}
        {viewTab === 'active' && (
          <>
            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active rental units in portfolio.</p>
                <p className="text-xs text-slate-400 mt-1">Add a rental unit or promote one from the Opportunity Analyzer.</p>
                {soldRentals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('archive')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>View {soldRentals.length} Sold Rental(s) in Archive</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeRentals.map((property) => {
                  const { agencyCommissionZAR, netMonthlyCashflowZAR: netCashflow } = calculateRentalCashflow(property);

                  const yieldGross =
                    property.marketValueZAR > 0
                      ? ((property.monthlyGrossRentZAR * 12) / property.marketValueZAR) * 100
                      : 0;

                  return (
                    <div
                      key={property.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Property Header */}
                        <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                <PropertyTypeBadge type={property.propertyType} />
                                <AgmDateChip agmDate={property.agmDate} />
                              </div>
                              <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                property.status === 'Occupied'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {property.status}
                            </span>
                          </div>

                          {/* Management Status & 1-Click Contact */}
                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-50">
                            {property.managementType === 'Agency' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                <span>🏢 Managed: {property.agencyName || 'Agency'} ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ` + VAT = ${((property.agencyCommissionPercent || 8) * 1.15).toFixed(1)}%` : ''})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <span>👤 Self-Managed</span>
                              </span>
                            )}

                            {property.managementType === 'Agency' && property.agencyContact && (
                              <div className="flex items-center gap-1 text-[11px]">
                                {renderAgencyContactLinks(property.agencyContact)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tenant Default Risk Alert Banner */}
                        {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
                          <div className="bg-rose-50 border-y border-rose-200 px-4 py-2 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-rose-700">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                              ⚠️ Tenant Default Risk: Utility Arrears Accruing
                            </span>
                            <span className="font-extrabold text-rose-700 font-mono">
                              -{formatZAR(property.unpaidUtilityArrearsZAR || 0)}
                            </span>
                          </div>
                        )}

                        {/* Property Financial Highlights */}
                        <div className="p-4 bg-slate-50/60 grid grid-cols-3 gap-2 text-center border-b border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Market Value</span>
                            <strong className="text-slate-900">{formatZAR(property.marketValueZAR, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Gross Yield</span>
                            <strong className="text-emerald-700">{formatPercent(yieldGross)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Net Cashflow</span>
                            <strong className={netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {formatZAR(netCashflow)}/m
                            </strong>
                          </div>
                        </div>

                        {/* Card Tab Switcher */}
                        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'financials' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              (cardTab[property.id] || 'financials') === 'financials'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Lease & Costs</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'coc' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              cardTab[property.id] === 'coc'
                                ? 'bg-white text-emerald-800 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mandatory CoC</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'vault' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              cardTab[property.id] === 'vault'
                                ? 'bg-white text-indigo-800 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Cloud Vault</span>
                          </button>
                        </div>

                        {(cardTab[property.id] || 'financials') === 'financials' && (
                          <>
                            {/* Tenant Lease Details */}
                            <div className="p-4 space-y-2 text-xs border-b border-slate-100">
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                  Tenant:
                                </span>
                                <strong className="text-slate-900">{property.tenantName}</strong>
                              </div>

                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Lease Expiry:
                                </span>
                                <span>{formatDate(property.leaseEndDate)}</span>
                              </div>

                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                  Deposit Held in Trust:
                                </span>
                                <strong className="text-slate-800">{formatZAR(property.depositHeldZAR)}</strong>
                              </div>

                              <div className="flex items-center justify-between text-slate-600">
                                <span className="text-slate-500">Annual Escalation:</span>
                                <strong className="text-emerald-700">{property.annualEscalationPercent}% p.a.</strong>
                              </div>
                            </div>

                            {/* Monthly Expenses Breakdown */}
                            <div className="p-4 text-xs space-y-2 text-slate-600">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Gross Monthly Rent:</span>
                                <strong className="text-slate-900 font-bold">{formatZAR(property.monthlyGrossRentZAR)}</strong>
                              </div>

                              <div className="flex justify-between items-center text-slate-500">
                                <span>{property.propertyType === 'Freehold House' ? 'Body Corporate Levies (N/A):' : 'Body Corporate / HOA Levies:'}</span>
                                <InlineEditableAmount
                                  value={property.monthlyLeviesZAR}
                                  disabled={property.propertyType === 'Freehold House'}
                                  disabledLabel="R 0 (Freehold)"
                                  onSave={(val) => updateRental(property.id, { monthlyLeviesZAR: val })}
                                  title="Click to edit monthly levies inline"
                                />
                              </div>

                              <div className="flex justify-between items-center text-slate-500">
                                <span>Municipal Rates & Taxes:</span>
                                <InlineEditableAmount
                                  value={property.monthlyRatesTaxesZAR}
                                  onSave={(val) => updateRental(property.id, { monthlyRatesTaxesZAR: val })}
                                  title="Click to edit municipal rates & taxes inline"
                                />
                              </div>

                              {property.managementType === 'Agency' ? (
                                <div className="flex justify-between items-center text-slate-700 font-medium bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100">
                                  <span className="flex items-center gap-1 text-[11px]">
                                    <Building2 className="w-3 h-3 text-indigo-600" />
                                    Agency Fee ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ' + 15% VAT' : ''} - {property.agencyName || 'Agent'}):
                                  </span>
                                  <span className="text-rose-600 font-semibold">- {formatZAR(agencyCommissionZAR)}</span>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <span>👤</span> Agency Fee (Self-Managed):
                                  </span>
                                  <span className="text-emerald-700 font-semibold">R 0 (0%)</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-slate-500">
                                <span>Maintenance Reserve:</span>
                                <span>- {formatZAR(property.monthlyMaintenanceReserveZAR)}</span>
                              </div>

                              <div className="flex justify-between items-center text-slate-700 bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800 text-[11px]">Bank Bond Payment:</span>
                                  {property.bondPaymentEffectiveDate && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200"
                                      title={property.bondRevisionNote || 'Forward-only effective month'}
                                    >
                                      Effective: {property.bondPaymentEffectiveDate}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPmtCalculator(property)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
                                    title="SARB Repo Rate PMT Calculator - forward-only bond adjustment"
                                  >
                                    <Calculator className="w-3 h-3 text-indigo-600" />
                                    <span>SARB PMT</span>
                                  </button>
                                </div>
                                <InlineEditableAmount
                                  value={property.monthlyBondPaymentZAR}
                                  onSave={(val) => updateRental(property.id, { monthlyBondPaymentZAR: val })}
                                  title="Click to edit bond repayment inline"
                                />
                              </div>

                              {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
                                <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    Utility Arrears Deduction:
                                  </span>
                                  <span>- {formatZAR(property.unpaidUtilityArrearsZAR || 0)}</span>
                                </div>
                              )}
                            </div>

                            {/* Inline Editable Utility Arrears Box */}
                            <div className={`mx-4 mb-4 p-3 rounded-lg border text-xs transition-colors ${
                              (property.unpaidUtilityArrearsZAR || 0) > 0
                                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[11px] uppercase tracking-wider">Utility Arrears</span>
                                  {(property.unpaidUtilityArrearsZAR || 0) > 0 ? (
                                    <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                                      ⚠️ Tenant Default Risk
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-600 font-semibold">✓ Paid Up</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">Inline edit (auto-saves)</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={100}
                                    key={`${property.id}-${property.unpaidUtilityArrearsZAR || 0}`}
                                    defaultValue={property.unpaidUtilityArrearsZAR || 0}
                                    onBlur={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      if (val !== (property.unpaidUtilityArrearsZAR || 0)) {
                                        updateRental(property.id, { unpaidUtilityArrearsZAR: val });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    className={`w-full pl-6 pr-2 py-1 text-xs font-mono font-bold rounded border transition-colors focus:outline-none focus:ring-1 ${
                                      (property.unpaidUtilityArrearsZAR || 0) > 0
                                        ? 'bg-white border-rose-300 text-rose-700 focus:ring-rose-400'
                                        : 'bg-white border-slate-300 text-slate-700 focus:ring-emerald-400'
                                    }`}
                                    placeholder="0"
                                    title="Edit utility arrears and press Enter or click away to save"
                                  />
                                </div>
                                {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateRental(property.id, { unpaidUtilityArrearsZAR: 0 })}
                                    className="px-2 py-1 text-[10px] font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Mark arrears as cleared"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {(property.unpaidUtilityArrearsZAR || 0) > 0
                                  ? 'Unpaid municipal water/lights debt deducted directly from Net Monthly Cashflow.'
                                  : 'No outstanding municipal utility debt on this unit.'}
                              </p>
                            </div>
                          </>
                        )}

                        {cardTab[property.id] === 'coc' && (
                          <div className="p-3 bg-white">
                            <ComplianceChecklist
                              certificates={property.cocChecklist}
                              onUpdate={(updated) => updateRental(property.id, { cocChecklist: updated })}
                            />
                          </div>
                        )}

                        {cardTab[property.id] === 'vault' && (
                          <div className="p-3 bg-white">
                            <CloudDriveLinkVault
                              vault={property.driveVault}
                              onUpdate={(updated) => updateRental(property.id, { driveVault: updated })}
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer: Maintenance & Actions */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRentalForMaint(property)}
                          className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Maintenance ({property.maintenanceHistory?.length || 0})</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenExit(property)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                            title="Mark rental property as sold"
                          >
                            <Coins className="w-3 h-3 text-emerald-600" />
                            <span>Mark as Sold</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(property)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                            title="Edit property & agency mandate"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove rental "${property.title}"?`)) {
                                deleteRental(property.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete property"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SOLD & EXITED ARCHIVE VIEW */}
        {viewTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-600" />
                  <span>Sold & Exited Rental Properties Archive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical record of disposed rental assets, realized capital gains, and liquid cash recycled into seed capital reserves.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                {soldRentals.length} Disposed Asset(s)
              </span>
            </div>

            {soldRentals.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No sold rentals in archive</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you dispose of or sell a rental property, click &quot;Mark as Sold&quot; to cancel its bond liability, archive its historical record, and credit your seed capital.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('active')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Go to Active Portfolio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {soldRentals.map((property) => {
                  const salePrice = property.actualSalePriceZAR || property.marketValueZAR || 0;
                  const purchasePrice = property.purchasePriceZAR || 0;
                  const grossCapitalGain = salePrice - purchasePrice;
                  const gainPercent = purchasePrice > 0 ? (grossCapitalGain / purchasePrice) * 100 : 0;

                  return (
                    <div
                      key={property.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <PropertyTypeBadge type={property.propertyType} />
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>SOLD & EXITED</span>
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
                          </div>
                          {property.soldDate && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {formatDate(property.soldDate)}
                            </span>
                          )}
                        </div>

                        {/* Realized Disposal Metrics */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Exit Price</span>
                            <strong className="text-slate-900 font-bold">{formatZAR(salePrice, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Purchase</span>
                            <strong className="text-slate-700 font-bold">{formatZAR(purchasePrice, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Gain</span>
                            <strong className={`font-bold ${grossCapitalGain >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {grossCapitalGain >= 0 ? `+${formatPercent(gainPercent)}` : formatPercent(gainPercent)}
                            </strong>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Liquid Cash Released to Seed Capital
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Credited to Reserve for next purchase
                            </span>
                          </div>
                          <strong className="text-sm font-black text-emerald-900">
                            {formatZAR(property.netCashProceedsZAR || 0)}
                          </strong>
                        </div>

                        {property.exitNotes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700">Disposal Notes: </span>
                            <span>{property.exitNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Bond liability settled & cancelled
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Reopen rental "${property.title}" back to active portfolio? This will revert the credited cash of ${formatZAR(property.netCashProceedsZAR || 0)} from Cash in Reserve.`)) {
                              reopenRental(property.id);
                              setViewTab('active');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen Unit</span>
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

      {/* Mark Rental as Sold Exit Modal */}
      {showExitModal && selectedRentalForExit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Mark Rental Property as Sold</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  setSelectedRentalForExit(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Disposal of <strong>{selectedRentalForExit.title}</strong>. This records your realized exit price, removes the unit and its bond from active portfolio liabilities, and automatically deposits the net cash proceeds directly into your <strong>Liquid Cash Reserve / Seed Capital</strong>.
            </p>

            <form onSubmit={handleCompleteRentalSale} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Original Purchase Price</span>
                  <strong className="text-sm text-slate-800">{formatZAR(selectedRentalForExit.purchasePriceZAR)}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Purchased {formatDate(selectedRentalForExit.purchaseDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outstanding Bond Debt</span>
                  <strong className="text-sm text-rose-600">{formatZAR(selectedRentalForExit.outstandingBondBalanceZAR)}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Cancelled / Settled upon transfer</span>
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
                    setExitNetProceeds(Math.max(0, price - (selectedRentalForExit.outstandingBondBalanceZAR || 0)));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm"
                  placeholder="e.g. 2100000"
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
                  placeholder="Net cash received after bond settlement & agent fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sale / Registration Date *</label>
                  <input
                    type="date"
                    required
                    value={exitSoldDate}
                    onChange={(e) => setExitSoldDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gross Capital Gain</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800">
                    {formatZAR((exitSalePrice || 0) - selectedRentalForExit.purchasePriceZAR)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disposal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sold with sitting tenant, conveyanced by STBB"
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    setSelectedRentalForExit(null);
                  }}
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

      {/* Maintenance Log Modal */}
      {selectedRentalForMaint && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Maintenance History: {selectedRentalForMaint.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Track plumbing, electrical, and appliance work orders.
                </p>
              </div>
              <button
                onClick={() => setSelectedRentalForMaint(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* List Existing Logs */}
            <div className="space-y-2.5 mb-6">
              {selectedRentalForMaint.maintenanceHistory?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No maintenance logs recorded for this unit.</p>
              ) : (
                selectedRentalForMaint.maintenanceHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.issueDescription}</span>
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-medium">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Contractor: <strong className="text-slate-700">{item.contractorName}</strong> • {formatDate(item.dateLogged)}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className="text-slate-900 block">{formatZAR(item.costZAR)}</strong>
                      <span className="text-[10px] text-emerald-700 font-bold">{item.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Log New Maintenance Form */}
            <form onSubmit={handleAddMaintenance} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
              <h4 className="font-bold text-xs text-slate-800">Log New Work Order / Expense</h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Issue Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inverter battery firmware inspection & cable replacement"
                  value={maintIssue}
                  onChange={(e) => setMaintIssue(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={maintCategory}
                    onChange={(e) => setMaintCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Appliance">Appliance</option>
                    <option value="Structural">Structural</option>
                    <option value="General Wear">General Wear</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cost (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={maintCost}
                    onChange={(e) => setMaintCost(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contractor</label>
                  <input
                    type="text"
                    value={maintContractor}
                    onChange={(e) => setMaintContractor(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                >
                  Log Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Rental Property Modal */}
      {showRentalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>{editingRentalId ? 'Edit Rental Property & Agency Mandate' : 'Add Rental Property to Portfolio'}</span>
              </h3>
              {editingRentalId && (
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  Editing Active Unit
                </span>
              )}
            </div>

            <form onSubmit={handleSaveRental} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Melrose Arch Luxury Loft"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. 10 High Street, Melrose"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
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
                        { id: 'Sectional Title Apartment', label: '🏢 Sectional Title' },
                        { id: 'Freehold House', label: '🏡 Freehold House' },
                        { id: 'Townhouse / Cluster', label: '🏘️ Townhouse / Cluster' },
                        { id: 'Multi-unit Commercial', label: '🏬 Commercial' },
                      ] as const
                    ).map((pt) => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => {
                          setPropertyType(pt.id);
                          if (pt.id === 'Freehold House') {
                            setMonthlyLevies(0);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border ${
                          propertyType === pt.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster') && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        📅 Body Corporate AGM Date
                      </label>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        Auto-schedules reminder task 14 days prior
                      </span>
                    </div>
                    <input
                      type="date"
                      value={agmDate}
                      onChange={(e) => setAgmDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Property Management Mandate Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Property Management Mandate</span>
                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setManagementType('Self-Managed')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        managementType === 'Self-Managed'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👤 Self-Managed
                    </button>
                    <button
                      type="button"
                      onClick={() => setManagementType('Agency')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        managementType === 'Agency'
                          ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏢 Agency Managed
                    </button>
                  </div>
                </div>

                {managementType === 'Agency' ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Managing Agency Name *</label>
                        <input
                          type="text"
                          required={managementType === 'Agency'}
                          placeholder="e.g. Pam Golding, RE/MAX, Seeff"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Agent Contact (Tel / WhatsApp)</label>
                        <input
                          type="text"
                          placeholder="e.g. +27 82 555 1234"
                          value={agencyContact}
                          onChange={(e) => setAgencyContact(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700">Commission Rate (%)</label>
                          <div className="flex gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setAgencyCommissionPercent(8.0)}
                              className={`px-1.5 py-0.5 rounded border ${
                                agencyCommissionPercent === 8.0 ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-slate-600'
                              }`}
                            >
                              8%
                            </button>
                            <button
                              type="button"
                              onClick={() => setAgencyCommissionPercent(10.0)}
                              className={`px-1.5 py-0.5 rounded border ${
                                agencyCommissionPercent === 10.0 ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-slate-600'
                              }`}
                            >
                              10%
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={agencyCommissionPercent}
                          onChange={(e) => setAgencyCommissionPercent(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={agencyVatApplicable}
                            onChange={(e) => setAgencyVatApplicable(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span className="text-slate-700 font-medium text-[11px]">
                            Subject to 15% SARS VAT (+15%)
                          </span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Standard SA estate agency mandate structure
                        </p>
                      </div>
                    </div>

                    {/* Commission Calculation Preview */}
                    <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-indigo-800 font-semibold block uppercase">Calculated Monthly Fee</span>
                        <span className="text-slate-600 text-[11px]">
                          {agencyCommissionPercent}% of {formatZAR(monthlyGrossRent)}
                          {agencyVatApplicable ? ' + 15% VAT (effective ' + (agencyCommissionPercent * 1.15).toFixed(2) + '%)' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-rose-600 font-bold text-sm block">
                          - {formatZAR(Math.round(monthlyGrossRent * (agencyCommissionPercent / 100) * (agencyVatApplicable ? 1.15 : 1.0)))}/m
                        </strong>
                        <span className="text-[10px] text-slate-500">Deducted from gross rent</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                    <span className="text-sm">💡</span>
                    <span><strong>Self-Managed Unit:</strong> Direct landlord administration. <strong>R 0</strong> agency commission deducted from cash flow.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Market Value (ZAR)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={marketValue}
                    onChange={(e) => setMarketValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (ZAR)</label>
                  <input
                    type="number"
                    min="100000"
                    step="50000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bond Balance (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={bondBalance}
                    onChange={(e) => setBondBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gross Monthly Rent (ZAR)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={monthlyGrossRent}
                    onChange={(e) => setMonthlyGrossRent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      {propertyType === 'Freehold House' ? 'Monthly Levies' : 'Body Corporate Levies'}
                    </label>
                    {propertyType === 'Freehold House' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        N/A (Freehold Title)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    disabled={propertyType === 'Freehold House'}
                    value={propertyType === 'Freehold House' ? 0 : monthlyLevies}
                    onChange={(e) => setMonthlyLevies(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      propertyType === 'Freehold House'
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rates & Taxes</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyRates}
                    onChange={(e) => setMonthlyRates(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Bank Bond Repayment & Effective Month Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 text-xs">Bank Bond Repayment (Debit Order)</label>
                    {bondBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonthlyBondPayment(calculateMonthlyBondRepayment(bondBalance, 11.75, 20))}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        title="Auto-calculate 20-year bond at 11.75%"
                      >
                        Auto-PMT: {formatZAR(calculateMonthlyBondRepayment(bondBalance, 11.75, 20))}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyBondPayment || ''}
                    onChange={(e) => setMonthlyBondPayment(Number(e.target.value))}
                    placeholder="e.g. 11800"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Owner-paid direct debit order</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Bond Effective Month (Forward-Only)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apr 2026 or 2026-04"
                    value={bondPaymentEffectiveDate}
                    onChange={(e) => setBondPaymentEffectiveDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Upcoming effective payment date</span>
                </div>
              </div>

              {/* Tenant Utility Arrears Section */}
              <div className={`p-3 rounded-lg border transition-colors ${
                unpaidUtilityArrears > 0
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Tenant Utility Arrears (Water & Lights)
                    </label>
                    {unpaidUtilityArrears > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                        ⚠️ Tenant Default Risk
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Deducts directly from Net Monthly Cashflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">R</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={unpaidUtilityArrears}
                      onChange={(e) => setUnpaidUtilityArrears(Math.max(0, Number(e.target.value)))}
                      className={`w-full pl-7 pr-3 py-1.5 border rounded-lg font-bold text-xs bg-white ${
                        unpaidUtilityArrears > 0
                          ? 'border-rose-300 text-rose-700 focus:ring-rose-400'
                          : 'border-slate-300 text-slate-800 focus:ring-emerald-400'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {unpaidUtilityArrears > 0 && (
                    <button
                      type="button"
                      onClick={() => setUnpaidUtilityArrears(0)}
                      className="text-xs px-2.5 py-1.5 bg-white text-slate-600 hover:text-emerald-700 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors cursor-pointer"
                    >
                      Clear to R 0
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  SA municipal utility debt remains attached to the property. Unrecovered balances directly impair monthly net cashflow.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-[11px]">Tenant & Lease Info</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tenant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sipho Dlamini"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lease Expiry Date</label>
                    <input
                      type="date"
                      value={leaseEnd}
                      onChange={(e) => setLeaseEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tenant Phone</label>
                    <input
                      type="text"
                      placeholder="+27 82 000 0000"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deposit in Trust (ZAR)</label>
                    <input
                      type="number"
                      value={depositHeld}
                      onChange={(e) => setDepositHeld(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                    />
                  </div>
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
                      value={rentalMasterFolderUrl}
                      onChange={(e) => setRentalMasterFolderUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signed Lease / OTP PDF URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={rentalOtpUrl}
                      onChange={(e) => setRentalOtpUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rates & Levies Statement</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={rentalRatesBillUrl}
                      onChange={(e) => setRentalRatesBillUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title Deed / Sectional Plan</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={rentalTitleDeedUrl}
                      onChange={(e) => setRentalTitleDeedUrl(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRentalModal(false);
                    setEditingRentalId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  {editingRentalId ? 'Update Rental Property' : 'Save Rental Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SARB Repo Rate PMT Calculator Modal */}
      {pmtTargetProperty && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    SARB Repo Rate Bond Recalculator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Forward-only adjustment for &ldquo;{pmtTargetProperty.title}&rdquo;
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPmtTargetProperty(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyPmt} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed">
                💡 <strong>Forward-Only Guarantee:</strong> Modifying the bond repayment takes effect from the selected <strong>Effective Month</strong> for upcoming bank debit orders. Historical performance and past months remain uncorrupted.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Outstanding Bond Balance (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    required
                    value={pmtLoanBalance}
                    onChange={(e) => setPmtLoanBalance(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Bond Interest Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="30"
                      required
                      value={pmtInterestRate}
                      onChange={(e) => setPmtInterestRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 pr-7"
                    />
                    <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Remaining Term (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={pmtLoanYears}
                    onChange={(e) => setPmtLoanYears(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Month (Forward-Only)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apr 2026 or 2026-04"
                    value={pmtEffectiveMonth}
                    onChange={(e) => setPmtEffectiveMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Revision Note / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. SARB 25bps repo rate cut"
                  value={pmtRevisionNote}
                  onChange={(e) => setPmtRevisionNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>

              {/* Dynamic PMT Calculation Comparison Preview */}
              {(() => {
                const calculatedPmt = calculateMonthlyBondRepayment(pmtLoanBalance, pmtInterestRate, pmtLoanYears);
                const currentPmt = pmtTargetProperty.monthlyBondPaymentZAR || 0;
                const savings = currentPmt - calculatedPmt;

                return (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase">Recalculated Bond PMT</span>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded">
                        Standard SA Amortization Formula
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-indigo-950 font-mono">
                        {formatZAR(calculatedPmt)}/month
                      </span>
                      {currentPmt > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Current: {formatZAR(currentPmt)}/m</span>
                          <span className={`text-xs font-bold ${savings >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {savings >= 0 ? `+${formatZAR(savings)}/m cashflow relief` : `${formatZAR(savings)}/m increase`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPmtTargetProperty(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply Forward-Only ({pmtEffectiveMonth})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BYOK AI Statement Parser Modals */}
      <StatementUploadModal
        isOpen={showAiUploadModal}
        onClose={() => setShowAiUploadModal(false)}
        onExtracted={(units: ExtractedRentalUnit[]) => {
          setAiExtractedUnits(units);
          setShowAiUploadModal(false);
          setShowAiReviewModal(true);
        }}
      />

      <StatementReviewModal
        isOpen={showAiReviewModal}
        onClose={() => setShowAiReviewModal(false)}
        extractedUnits={aiExtractedUnits}
        onConfirmSync={(finalUnits: ExtractedRentalUnit[]) => {
          reconcileImportedRentals(finalUnits);
          setShowAiReviewModal(false);
          setAiExtractedUnits([]);
        }}
      />
    </div>
  );
}
