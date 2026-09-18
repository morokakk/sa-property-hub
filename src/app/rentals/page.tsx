'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { RentalProperty, MaintenanceLog, PropertyTitleType } from '@/types';
import { PropertyTypeBadge, AgmDateChip, isAgmUpcoming } from '@/components/common/PropertyTypeBadge';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';
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
} from 'lucide-react';

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

export default function RentalPortfolioPage() {
  const rentals = usePortfolioStore((state) => state.rentals);
  const addRental = usePortfolioStore((state) => state.addRental);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const deleteRental = usePortfolioStore((state) => state.deleteRental);
  const addMaintenanceLog = usePortfolioStore((state) => state.addMaintenanceLog);
  const summary = usePortfolioSummary();

  // Per-card tab selection ('financials' | 'coc' | 'vault')
  const [cardTab, setCardTab] = useState<Record<string, 'financials' | 'coc' | 'vault'>>({});

  // Selected Unit for Maintenance Log
  const [selectedRentalForMaint, setSelectedRentalForMaint] = useState<RentalProperty | null>(null);
  
  // Add / Edit Rental Modal State
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);

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
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [leaseEnd, setLeaseEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [depositHeld, setDepositHeld] = useState(30000);

  // Agency Management Form State
  const [managementType, setManagementType] = useState<'Self-Managed' | 'Agency'>('Agency');
  const [agencyName, setAgencyName] = useState('Pam Golding Sandton');
  const [agencyCommissionPercent, setAgencyCommissionPercent] = useState(8.0);
  const [agencyVatApplicable, setAgencyVatApplicable] = useState(true);
  const [agencyContact, setAgencyContact] = useState('+27 82 555 1234');

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
    setTenantName('');
    setTenantPhone('');
    setTenantEmail('');
    setLeaseEnd(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setDepositHeld(30000);
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
    setTenantName(property.tenantName);
    setTenantPhone(property.tenantPhone);
    setTenantEmail(property.tenantEmail);
    setLeaseEnd(property.leaseEndDate);
    setDepositHeld(property.depositHeldZAR);
    setManagementType(property.managementType || 'Self-Managed');
    setAgencyName(property.agencyName || 'Pam Golding');
    setAgencyCommissionPercent(property.agencyCommissionPercent ?? 8.0);
    setAgencyVatApplicable(property.agencyVatApplicable !== false);
    setAgencyContact(property.agencyContact || '');
    setShowRentalModal(true);
  };

  const handleSaveRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    // Approximate monthly bond payment (11.75% over 20 yrs ~ 1.08% of loan)
    const estBondPayment = bondBalance > 0 ? Math.round(bondBalance * 0.0108) : 0;
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
        monthlyBondPaymentZAR: estBondPayment,
        tenantName: tenantName || 'Tenant Unassigned',
        tenantPhone: tenantPhone || '+27 —',
        tenantEmail: tenantEmail || 'tenant@email.co.za',
        leaseEndDate: leaseEnd,
        depositHeldZAR: depositHeld,
        monthlyGrossRentZAR: monthlyGrossRent,
        monthlyLeviesZAR: finalLevies,
        monthlyRatesTaxesZAR: monthlyRates,
        managementType,
        agencyName: managementType === 'Agency' ? agencyName : undefined,
        agencyCommissionPercent: managementType === 'Agency' ? agencyCommissionPercent : 0,
        agencyVatApplicable: managementType === 'Agency' ? agencyVatApplicable : false,
        agencyContact: managementType === 'Agency' ? agencyContact : undefined,
        monthlyAgentFeeZAR: agentFee,
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
        monthlyBondPaymentZAR: estBondPayment,
        tenantName: tenantName || 'Tenant Unassigned',
        tenantPhone: tenantPhone || '+27 —',
        tenantEmail: tenantEmail || 'tenant@email.co.za',
        leaseStartDate: new Date().toISOString().split('T')[0],
        leaseEndDate: leaseEnd,
        depositHeldZAR: depositHeld,
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

  const totalGrossMonthlyRent = rentals.reduce((s, r) => s + r.monthlyGrossRentZAR, 0);
  const totalNetMonthlyRent = summary.monthlyNetRentalCashflow;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Rental Portfolio"
        subtitle="Manage active income properties, tenant leases, trust deposits, and maintenance histories"
        actionButton={
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Rental Property
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rental Asset Value</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalRentalValue)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{rentals.length} active rental units</p>
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
            <p className="text-[11px] text-slate-400 mt-0.5">Deeds-registered mortgage debt</p>
          </div>
        </div>

        {/* Rental Properties Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {rentals.map((property) => {
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
                      className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
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
                      className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
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
                      className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
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
                      <div className="p-4 text-xs space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>Gross Monthly Rent:</span>
                          <strong className="text-slate-900">{formatZAR(property.monthlyGrossRentZAR)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>{property.propertyType === 'Freehold House' ? 'Body Corporate Levies (N/A):' : 'Body Corporate / HOA Levies:'}</span>
                          <span>{property.propertyType === 'Freehold House' ? 'R 0 (Freehold)' : `- ${formatZAR(property.monthlyLeviesZAR)}`}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Municipal Rates & Taxes:</span>
                          <span>- {formatZAR(property.monthlyRatesTaxesZAR)}</span>
                        </div>

                        {property.managementType === 'Agency' ? (
                          <div className="flex justify-between text-slate-700 font-medium bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Building2 className="w-3 h-3 text-indigo-600" />
                              Agency Fee ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ' + 15% VAT' : ''} - {property.agencyName || 'Agent'}):
                            </span>
                            <span className="text-rose-600 font-semibold">- {formatZAR(agencyCommissionZAR)}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]">
                            <span className="flex items-center gap-1">
                              <span>👤</span> Agency Fee (Self-Managed):
                            </span>
                            <span className="text-emerald-700 font-semibold">R 0 (0%)</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-500">
                          <span>Maintenance Reserve:</span>
                          <span>- {formatZAR(property.monthlyMaintenanceReserveZAR)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Bank Bond Payment:</span>
                          <span>- {formatZAR(property.monthlyBondPaymentZAR)}</span>
                        </div>
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
                    className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Maintenance ({property.maintenanceHistory?.length || 0})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(property)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
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
      </main>

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
    </div>
  );
}
