'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DevelopmentProject, DevelopmentUnit, DevUnitStatus } from '@/types';
import { DevelopmentFinancialSummary } from '@/lib/calculations/developments';
import { formatZAR } from '@/lib/formatters';
import {
  PlusCircle,
  Building2,
  Sparkles,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Search,
  LayoutGrid,
  List,
  Pencil,
} from 'lucide-react';

export interface DevelopmentUnitInventoryTabProps {
  development: DevelopmentProject;
  financials: DevelopmentFinancialSummary;
  readOnly?: boolean;
  onUpdateUnit: (unitId: string, updates: Partial<DevelopmentUnit>) => void;
  onAddUnit?: (unit: Omit<DevelopmentUnit, 'id'>) => void;
  onDeleteUnit?: (unitId: string) => void;
  onMarkUnitSold: (
    unitId: string,
    buyerName?: string,
    salePriceZAR?: number,
    conveyancerRef?: string
  ) => void;
  onGraduateRetainedUnits: () => void;
}

const DEV_UNIT_STATUSES: DevUnitStatus[] = [
  'Available',
  'Reserved (OTP Signed)',
  'Bond Approved / Guarantees Issued',
  'Sold & Transferred',
  'Retained for Rental',
];

export function resolveUnitStatusOnSave(
  currentStatus: DevUnitStatus | undefined,
  buyerName?: string,
  conveyancerRef?: string
): DevUnitStatus {
  const hasBuyerOrRef = Boolean(buyerName?.trim() || conveyancerRef?.trim());
  if (!currentStatus) {
    return hasBuyerOrRef ? 'Reserved (OTP Signed)' : 'Available';
  }
  if (currentStatus === 'Available' && hasBuyerOrRef) {
    return 'Reserved (OTP Signed)';
  }
  return currentStatus;
}

export function DevelopmentUnitInventoryTab({
  development,
  financials,
  readOnly = false,
  onUpdateUnit,
  onAddUnit,
  onDeleteUnit,
  onMarkUnitSold,
  onGraduateRetainedUnits,
}: DevelopmentUnitInventoryTabProps) {
  const units = development.units || [];

  // Filter, search & view mode state (local, non-persisted)
  const [statusFilter, setStatusFilter] = useState<'All' | DevUnitStatus>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sale modal state
  const [sellingUnit, setSellingUnit] = useState<DevelopmentUnit | null>(null);
  const [saleBuyerName, setSaleBuyerName] = useState('');
  const [salePriceZAR, setSalePriceZAR] = useState<number>(0);
  const [conveyancerRef, setConveyancerRef] = useState('');

  // Unified Add / Edit Unit modal state
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<DevelopmentUnit | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [unitConfig, setUnitConfig] = useState('2 Bed 1 Bath');
  const [unitFloorArea, setUnitFloorArea] = useState<number>(65);
  const [unitListPrice, setUnitListPrice] = useState<number>(850000);
  const [unitEstRent, setUnitEstRent] = useState<number>(7500);
  const [unitCostBasis, setUnitCostBasis] = useState<number>(600000);
  const [unitBuyerName, setUnitBuyerName] = useState('');
  const [unitDepositHeld, setUnitDepositHeld] = useState('');
  const [unitConveyancerRef, setUnitConveyancerRef] = useState('');

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return units
      .filter((u) => (statusFilter === 'All' ? true : u.status === statusFilter))
      .filter((u) => {
        if (!q) return true;
        return [u.unitNumber, u.configuration, u.buyerName, u.conveyancerRef, u.status]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q));
      });
  }, [units, statusFilter, searchQuery]);

  useEffect(() => {
    if (readOnly) {
      setSellingUnit(null);
      setIsUnitModalOpen(false);
      setEditingUnit(null);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!sellingUnit && !isUnitModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSellingUnit(null);
        setIsUnitModalOpen(false);
        setEditingUnit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sellingUnit, isUnitModalOpen]);

  // Ungraduated retained units
  const ungraduatedRetainedUnits = units.filter(
    (u) => u.status === 'Retained for Rental' && !u.graduatedRentalId
  );
  const canGraduate = ungraduatedRetainedUnits.length > 0;
  const isSection13Eligible = ungraduatedRetainedUnits.length >= 5 || financials.isSection13SexEligible;

  // Open Sale Modal
  const handleOpenSaleModal = (unit: DevelopmentUnit) => {
    if (readOnly) return;
    setSellingUnit(unit);
    setSaleBuyerName(unit.buyerName || '');
    setSalePriceZAR(unit.listPriceVatInclZAR || 0);
    setConveyancerRef(unit.conveyancerRef || '');
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !sellingUnit) return;
    onMarkUnitSold(
      sellingUnit.id,
      saleBuyerName.trim() || sellingUnit.buyerName || 'Private Buyer',
      salePriceZAR,
      conveyancerRef.trim() || undefined
    );
    setSellingUnit(null);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNumber = unitNumber.trim();
    if (readOnly || !trimmedNumber) return;

    const trimmedBuyer = unitBuyerName.trim() || undefined;
    const trimmedRef = unitConveyancerRef.trim() || undefined;
    const parsedDeposit = unitDepositHeld.trim() === '' ? NaN : Number(unitDepositHeld);
    const normalizedDeposit =
      Number.isFinite(parsedDeposit) && parsedDeposit > 0 ? parsedDeposit : undefined;

    if (editingUnit) {
      const nextStatus = resolveUnitStatusOnSave(
        editingUnit.status,
        trimmedBuyer,
        trimmedRef
      );
      onUpdateUnit(editingUnit.id, {
        unitNumber: trimmedNumber,
        configuration: unitConfig.trim(),
        floorAreaSqm: Number(unitFloorArea) || 0,
        allocatedCostBasisZAR: Number(unitCostBasis) || 0,
        listPriceVatInclZAR: Number(unitListPrice) || 0,
        estimatedMonthlyRentZAR: Number(unitEstRent) || 0,
        ...(nextStatus !== editingUnit.status ? { status: nextStatus } : {}),
        buyerName: trimmedBuyer,
        depositHeldZAR: normalizedDeposit,
        conveyancerRef: trimmedRef,
      });
    } else if (onAddUnit) {
      const initialStatus = resolveUnitStatusOnSave(undefined, trimmedBuyer, trimmedRef);
      onAddUnit({
        unitNumber: trimmedNumber,
        configuration: unitConfig.trim(),
        floorAreaSqm: Number(unitFloorArea) || 0,
        allocatedCostBasisZAR: Number(unitCostBasis) || 0,
        listPriceVatInclZAR: Number(unitListPrice) || 0,
        estimatedMonthlyRentZAR: Number(unitEstRent) || 0,
        status: initialStatus,
        buyerName: trimmedBuyer,
        depositHeldZAR: normalizedDeposit,
        conveyancerRef: trimmedRef,
      });
    }

    setIsUnitModalOpen(false);
    setEditingUnit(null);
    setUnitNumber('');
  };

  const handleOpenAddUnitModal = () => {
    if (readOnly) return;
    const nextIndex = units.length + 1;
    setEditingUnit(null);
    setUnitNumber(`Unit ${nextIndex}`);
    setUnitConfig('2 Bed 1 Bath');
    setUnitFloorArea(65);
    setUnitCostBasis(600000);
    setUnitListPrice(850000);
    setUnitEstRent(7500);
    setUnitBuyerName('');
    setUnitDepositHeld('');
    setUnitConveyancerRef('');
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnitModal = (unit: DevelopmentUnit) => {
    if (readOnly) return;
    setEditingUnit(unit);
    setUnitNumber(unit.unitNumber);
    setUnitConfig(unit.configuration);
    setUnitFloorArea(unit.floorAreaSqm);
    setUnitCostBasis(unit.allocatedCostBasisZAR);
    setUnitListPrice(unit.listPriceVatInclZAR);
    setUnitEstRent(unit.estimatedMonthlyRentZAR);
    setUnitBuyerName(unit.buyerName || '');
    setUnitDepositHeld(unit.depositHeldZAR && unit.depositHeldZAR > 0 ? String(unit.depositHeldZAR) : '');
    setUnitConveyancerRef(unit.conveyancerRef || '');
    setIsUnitModalOpen(true);
  };

  // Status counters
  const statusCounts = DEV_UNIT_STATUSES.reduce((acc, status) => {
    acc[status] = units.filter((u) => u.status === status).length;
    return acc;
  }, {} as Record<DevUnitStatus, number>);

  const soldCount = statusCounts['Sold & Transferred'] || 0;
  const contractedCount =
    (statusCounts['Reserved (OTP Signed)'] || 0) +
    (statusCounts['Bond Approved / Guarantees Issued'] || 0);
  const retainedCount = statusCounts['Retained for Rental'] || 0;
  const availableCount = statusCounts['Available'] || 0;

  // Totals for sticky footer
  const totalFloorArea = financials.totalFloorAreaSqm;
  const totalCostBasis = financials.totalAllocatedCostBasisZAR;
  const totalListGdv = financials.gdvInclVatZAR;
  const totalEstRent = financials.totalMonthlyEstimatedRentZAR;

  const renderBuyerOrRetainedInfo = (
    unit: DevelopmentUnit,
    isSold: boolean,
    isRetained: boolean
  ) => {
    if (isSold) {
      const ref = unit.conveyancerRef?.trim();
      return (
        <div className="leading-tight">
          <span className="font-semibold text-slate-900">
            {unit.buyerName?.trim() || 'Private Buyer'}
          </span>
          {ref && <div className="text-[10px] text-slate-400">{`Ref: ${ref}`}</div>}
        </div>
      );
    }
    if (isRetained) {
      return unit.graduatedRentalId ? (
        <span className="text-[11px] text-purple-700 font-medium inline-flex items-center gap-1">
          <span>Graduated to /rentals</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 inline" />
        </span>
      ) : (
        <span className="text-[11px] text-purple-600 font-medium">Retained Asset</span>
      );
    }
    if (
      unit.status === 'Reserved (OTP Signed)' ||
      unit.status === 'Bond Approved / Guarantees Issued'
    ) {
      const buyer = unit.buyerName?.trim();
      const ref = unit.conveyancerRef?.trim();
      const hasDeposit = typeof unit.depositHeldZAR === 'number' && unit.depositHeldZAR > 0;
      if (buyer || ref || hasDeposit) {
        return (
          <div className="leading-tight">
            {buyer && <span className="font-semibold text-slate-900">{buyer}</span>}
            {ref && <div className="text-[10px] text-slate-400">{`Ref: ${ref}`}</div>}
            {hasDeposit && (
              <div className="text-[10px] text-amber-700 font-medium tabular-nums">
                {`Deposit: ${formatZAR(unit.depositHeldZAR!)}`}
              </div>
            )}
          </div>
        );
      }
    }
    return <span className="text-slate-400">—</span>;
  };

  const renderUnitStatusSelect = (
    unit: DevelopmentUnit,
    isSold: boolean,
    isRetained: boolean
  ) => (
    <select
      value={unit.status}
      disabled={readOnly || isSold}
      title={
        readOnly
          ? 'Locked in Read-Only View'
          : isSold
          ? 'Sale settled — use Edit to update buyer or conveyancer details'
          : undefined
      }
      onChange={(e) => {
        if (readOnly || isSold) return;
        const nextStatus = e.target.value as DevUnitStatus;
        if (nextStatus === 'Sold & Transferred') {
          handleOpenSaleModal(unit);
          return;
        }
        onUpdateUnit(unit.id, { status: nextStatus });
      }}
      aria-label={`Status for ${unit.unitNumber}`}
      className={`text-xs rounded border px-2 py-1 font-medium focus:ring-1 focus:ring-slate-400 outline-hidden ${
        readOnly
          ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
          : isSold
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-default'
          : isRetained
          ? 'bg-purple-50 text-purple-800 border-purple-300'
          : 'bg-white text-slate-800 border-slate-300'
      }`}
    >
      {DEV_UNIT_STATUSES.map((st) => (
        <option key={st} value={st}>
          {st}
        </option>
      ))}
    </select>
  );

  const renderUnitActions = (
    unit: DevelopmentUnit,
    isSold: boolean,
    isRetained: boolean
  ) => (
    <div className="inline-flex items-center gap-1.5">
      {!readOnly && (
        <button
          type="button"
          onClick={() => handleOpenEditUnitModal(unit)}
          aria-label={`Edit ${unit.unitNumber}`}
          data-testid={`edit-unit-btn-${unit.id}`}
          title="Edit unit & buyer details"
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {!isSold && !isRetained && (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && handleOpenSaleModal(unit)}
          title={readOnly ? 'Locked in Read-Only View' : 'Record sale and pay down debt'}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
            readOnly
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Mark Sold</span>
        </button>
      )}
      {onDeleteUnit && (
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return;
            if (confirm(`Remove ${unit.unitNumber} from inventory?`)) {
              onDeleteUnit(unit.id);
            }
          }}
          title={readOnly ? 'Locked in Read-Only View' : 'Delete unit'}
          className={`p-1 rounded transition-colors ${
            readOnly
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-400 hover:text-rose-600 cursor-pointer'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div data-testid="development-unit-inventory-tab" className="space-y-4">
      {/* Header bar with controls & Section 13sex callout */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Unit Inventory & Split-Exit Schedule</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                {units.length} Units
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage sectional title units, pre-sales contracts, OTP debt wipeout, and graduate retained units to the rental portfolio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0"
              role="group"
              aria-label="Unit Inventory View Mode"
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && handleOpenAddUnitModal()}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border shadow-2xs transition-colors ${
                readOnly
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer'
              }`}
            >
              <PlusCircle className={`w-3.5 h-3.5 ${readOnly ? 'text-slate-400' : 'text-slate-600'}`} />
              <span>+ Add Unit</span>
            </button>

            <button
              type="button"
              onClick={() => !readOnly && onGraduateRetainedUnits()}
              disabled={readOnly || !canGraduate}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors ${
                !readOnly && canGraduate
                  ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={
                readOnly
                  ? 'Locked in Read-Only View'
                  : canGraduate
                  ? `Graduate ${ungraduatedRetainedUnits.length} retained units to /rentals`
                  : 'No ungraduated retained units available'
              }
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{`Graduate Retained Units to Rentals (${ungraduatedRetainedUnits.length})`}</span>
            </button>
          </div>
        </div>

        {/* Clickable Status Filter Chips & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter Units by Status">
            <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              aria-pressed={statusFilter === 'All'}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold cursor-pointer tabular-nums ${
                statusFilter === 'All'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {`All (${units.length})`}
            </button>
            {DEV_UNIT_STATUSES.map((status) => {
              const count = statusCounts[status] || 0;
              const isSelected = statusFilter === status;
              let badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
              if (status === 'Sold & Transferred') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold hover:bg-emerald-100/70';
              if (status === 'Retained for Rental') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold hover:bg-purple-100/70';
              if (status === 'Bond Approved / Guarantees Issued') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70';
              if (status === 'Reserved (OTP Signed)') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70';

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(isSelected ? 'All' : status)}
                  aria-pressed={isSelected}
                  className={`text-[11px] px-2 py-0.5 rounded-full border cursor-pointer tabular-nums ${
                    isSelected ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs' : badgeStyle
                  }`}
                >
                  {`${status}: ${count}`}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unit #, config, buyer, or deeds ref..."
              aria-label="Search development units"
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear unit search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Section 13sex Banner */}
        {isSection13Eligible && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-purple-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>SARS Section 13sex Tax Shield Qualified:</strong> Holding ≥ 5 residential units unlocks a 55% tax deduction base written off at 5% per annum for 20 years in <code>/rentals</code>.
              </span>
            </div>
            <span className="font-bold shrink-0 ml-2 tabular-nums">
              {formatZAR(financials.section13sexAnnualAllowanceZAR)} / year tax shield
            </span>
          </div>
        )}
      </div>

      {/* Interactive Inventory Table or Cards */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                  <th className="py-2.5 px-3 whitespace-nowrap">Unit #</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Configuration</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Floor (m²)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Cost Basis</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">List Price (incl. VAT)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Est. Rent</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Buyer / Ref</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      No units recorded for this development. Click &quot;+ Add Unit&quot; above to add inventory.
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 text-xs space-y-2">
                      <div>No units match your current filter.</div>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('All');
                          setSearchQuery('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => {
                    const isSold = unit.status === 'Sold & Transferred';
                    const isRetained = unit.status === 'Retained for Rental';

                    return (
                      <tr
                        key={unit.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSold ? 'bg-emerald-50/20' : isRetained ? 'bg-purple-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {unit.unitNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {unit.configuration}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {`${unit.floorAreaSqm} m²`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatZAR(unit.allocatedCostBasisZAR)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {formatZAR(unit.listPriceVatInclZAR)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatZAR(unit.estimatedMonthlyRentZAR)}/mo
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {renderUnitStatusSelect(unit, isSold, isRetained)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {renderBuyerOrRetainedInfo(unit, isSold, isRetained)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {renderUnitActions(unit, isSold, isRetained)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Sticky Totals Footer */}
              {filteredUnits.length > 0 && (
                <tfoot className="bg-slate-100/95 font-semibold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10">
                  <tr>
                    <td className="py-2.5 px-3 whitespace-nowrap">Total / Portfolio</td>
                    <td className="py-2.5 px-3 text-slate-500 font-normal whitespace-nowrap tabular-nums">{`${units.length} Units`}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">{`${totalFloorArea} m²`}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">{formatZAR(totalCostBasis)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-800 whitespace-nowrap">{formatZAR(totalListGdv)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-purple-800 whitespace-nowrap">{formatZAR(totalEstRent)}/mo</td>
                    <td colSpan={3} className="py-2.5 px-3 text-right text-xs text-slate-500 font-normal whitespace-nowrap tabular-nums">
                      {`${soldCount} Sold • ${contractedCount > 0 ? `${contractedCount} Contracted • ` : ''}${retainedCount} Retained • ${availableCount} Available`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {units.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-2xs">
              No units recorded for this development. Click &quot;+ Add Unit&quot; above to add inventory.
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-2xs space-y-2">
              <div>No units match your current filter.</div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUnits.map((unit) => {
                const isSold = unit.status === 'Sold & Transferred';
                const isRetained = unit.status === 'Retained for Rental';

                return (
                  <div
                    key={unit.id}
                    className={`rounded-xl border p-4 shadow-2xs space-y-3 ${
                      isSold
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : isRetained
                        ? 'bg-purple-50/20 border-purple-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">{unit.unitNumber}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{unit.configuration}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-tight">
                          {formatZAR(unit.listPriceVatInclZAR)}
                        </div>
                        <div className="text-[11px] font-semibold text-purple-700 tabular-nums mt-0.5">
                          Est. Rent: {formatZAR(unit.estimatedMonthlyRentZAR)}/mo
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50/90 border border-slate-200/70 rounded-lg px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-slate-600 tabular-nums">
                        <span className="font-semibold text-slate-800">{`${unit.floorAreaSqm} m²`}</span>
                        <span>•</span>
                        <span>Cost: {formatZAR(unit.allocatedCostBasisZAR)}</span>
                      </div>
                      <div>{renderBuyerOrRetainedInfo(unit, isSold, isRetained)}</div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="min-w-0 flex-1">
                        {renderUnitStatusSelect(unit, isSold, isRetained)}
                      </div>
                      <div className="shrink-0">{renderUnitActions(unit, isSold, isRetained)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mark Sold & Pay Down Debt Modal */}
      {sellingUnit && !readOnly && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSellingUnit(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Mark {sellingUnit.unitNumber} as Sold
                </h4>
                <p className="text-xs text-slate-500">
                  1-Click sale settlement: automatically repays senior development debt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSellingUnit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} noValidate className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buyer Name / Purchasing SPV
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Blue Sky Trust"
                  value={saleBuyerName}
                  onChange={(e) => setSaleBuyerName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agreed Sale Price (ZAR incl. VAT)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={salePriceZAR}
                  onChange={(e) => setSalePriceZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  List price was {formatZAR(sellingUnit.listPriceVatInclZAR)}.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Conveyancer / Deeds Office File Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ST-2026/0491-CT"
                  value={conveyancerRef}
                  onChange={(e) => setConveyancerRef(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-800 text-[11px] space-y-0.5">
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Waterfall Debt Extinguishment
                </div>
                <div>
                  Net proceeds will pay down senior debt. Current outstanding facility:{' '}
                  <strong>{formatZAR(financials.outstandingDevFacilityZAR)}</strong>.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSellingUnit(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Confirm Sale & Pay Down Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Add / Edit Unit Modal */}
      {isUnitModalOpen && !readOnly && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setIsUnitModalOpen(false);
            setEditingUnit(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {editingUnit
                    ? `Edit ${editingUnit.unitNumber}`
                    : 'Add Sectional Title Unit'}
                </h4>
                <p className="text-xs text-slate-500">
                  {editingUnit
                    ? 'Update unit specification, buyer details, or conveyancing reference.'
                    : 'Record a new unit in the development schedule.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnitModalOpen(false);
                  setEditingUnit(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} noValidate className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 4B"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Configuration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Bed 1 Bath"
                    value={unitConfig}
                    onChange={(e) => setUnitConfig(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Area (m²)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={unitFloorArea}
                    onChange={(e) => setUnitFloorArea(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allocated Cost Basis (ZAR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={unitCostBasis}
                    onChange={(e) => setUnitCostBasis(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">List Price (ZAR incl. VAT)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={unitListPrice}
                    onChange={(e) => setUnitListPrice(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Est. Monthly Rent (ZAR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={unitEstRent}
                    onChange={(e) => setUnitEstRent(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Buyer &amp; Conveyancing (Optional)
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Buyer Name / Purchasing SPV
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe / Blue Sky Trust"
                    value={unitBuyerName}
                    onChange={(e) => setUnitBuyerName(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Conveyancer / Deeds Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CV/2026/112"
                      value={unitConveyancerRef}
                      onChange={(e) => setUnitConveyancerRef(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Deposit Held (ZAR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="e.g. 50000"
                      value={unitDepositHeld}
                      onChange={(e) => setUnitDepositHeld(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-1.5"
                    />
                  </div>
                </div>

                {!editingUnit ? (
                  <p className="text-[11px] text-slate-400">
                    Entering a Buyer Name or Conveyancer Ref sets initial status to Reserved (OTP Signed); otherwise Available.
                  </p>
                ) : editingUnit.status === 'Available' ? (
                  <p className="text-[11px] text-slate-400">
                    Entering a Buyer Name or Conveyancer Ref automatically promotes this Available unit to Reserved (OTP Signed).
                  </p>
                ) : editingUnit.status === 'Sold & Transferred' ? (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
                    Editing a settled unit updates metadata only and will not re-trigger senior debt paydown.
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnitModalOpen(false);
                    setEditingUnit(null);
                  }}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  {editingUnit ? 'Save Changes' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
