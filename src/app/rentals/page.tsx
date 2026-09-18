'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { RentalProperty, MaintenanceLog } from '@/types';
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
} from 'lucide-react';

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
  const [showAddRentalModal, setShowAddRentalModal] = useState(false);

  // New Maintenance Form State
  const [maintIssue, setMaintIssue] = useState('');
  const [maintCategory, setMaintCategory] = useState<MaintenanceLog['category']>('Plumbing');
  const [maintContractor, setMaintContractor] = useState('Rapid Response Plumbing');
  const [maintCost, setMaintCost] = useState(1500);

  // New Rental Property Form State
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [marketValue, setMarketValue] = useState(1800000);
  const [purchasePrice, setPurchasePrice] = useState(1650000);
  const [bondBalance, setBondBalance] = useState(1100000);
  const [monthlyGrossRent, setMonthlyGrossRent] = useState(14500);
  const [monthlyLevies, setMonthlyLevies] = useState(1850);
  const [monthlyRates, setMonthlyRates] = useState(1100);
  const [agentFee, setAgentFee] = useState(1160); // 8%
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [leaseEnd, setLeaseEnd] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [depositHeld, setDepositHeld] = useState(29000);

  const handleAddRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    // Approximate monthly bond payment (11.75% over 20 yrs ~ 1.08% of loan)
    const estBondPayment = bondBalance > 0 ? Math.round(bondBalance * 0.0108) : 0;

    const newUnit: RentalProperty = {
      id: `rental-${Date.now()}`,
      title,
      address: address || `${city} Property`,
      city,
      propertyType: 'Sectional Title Apartment',
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
      monthlyGrossRentZAR: monthlyGrossRent,
      monthlyLeviesZAR: monthlyLevies,
      monthlyRatesTaxesZAR: monthlyRates,
      monthlyAgentFeeZAR: agentFee,
      monthlyMaintenanceReserveZAR: 600,
      maintenanceHistory: [],
      status: tenantName ? 'Occupied' : 'Vacant',
    };

    addRental(newUnit);
    setShowAddRentalModal(false);
    // Reset Form
    setTitle('');
    setAddress('');
    setTenantName('');
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
            onClick={() => setShowAddRentalModal(true)}
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
            <p className="text-[11px] text-slate-400 mt-0.5">After bonds, levies & taxes</p>
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
            const netCashflow =
              property.monthlyGrossRentZAR -
              (property.monthlyLeviesZAR +
                property.monthlyRatesTaxesZAR +
                property.monthlyAgentFeeZAR +
                property.monthlyMaintenanceReserveZAR +
                property.monthlyBondPaymentZAR);

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
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        property.status === 'Occupied'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {property.status}
                    </span>
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
                          <span>Gross Rent:</span>
                          <strong className="text-slate-900">{formatZAR(property.monthlyGrossRentZAR)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Body Corporate Levies:</span>
                          <span>- {formatZAR(property.monthlyLeviesZAR)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Rates & Taxes:</span>
                          <span>- {formatZAR(property.monthlyRatesTaxesZAR)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Managing Agent Fee:</span>
                          <span>- {formatZAR(property.monthlyAgentFeeZAR)}</span>
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
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedRentalForMaint(property)}
                    className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Maintenance History ({property.maintenanceHistory?.length || 0})</span>
                  </button>

                  <button
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

      {/* Add Rental Property Modal */}
      {showAddRentalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Add Rental Property to Portfolio
            </h3>

            <form onSubmit={handleAddRental} className="space-y-4 text-xs">
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
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Levies</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyLevies}
                    onChange={(e) => setMonthlyLevies(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                  onClick={() => setShowAddRentalModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Save Rental Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
