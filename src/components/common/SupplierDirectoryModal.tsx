'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LocalSupplier } from '@/types';
import {
  Store,
  Trash2,
  X,
  Pencil,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Star,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { useModalBackdropDismiss } from '@/hooks/useModalBackdropDismiss';
import { useBottomSheetDragToDismiss } from '@/hooks/useBottomSheetDragToDismiss';
import BottomSheetHandle from '@/components/common/BottomSheetHandle';
import { normalizeWhatsAppPhone } from '@/lib/calculations/inspections';
import { exportSuppliersCSV } from '@/lib/export/csvExport';

export const SUPPLIER_CATEGORIES: readonly LocalSupplier['category'][] = [
  'General Building Merchant',
  'Hardware & Timber',
  'Plumbing Supplies',
  'Electrical Supplies',
  'Tiles & Sanitary',
  'Paint & Finishes',
  'Specialist Contractor',
  'Maintenance & Handyman',
  'Professional / Consultant',
] as const;

export interface SupplierDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Controlled props for backward compatibility
  suppliers?: LocalSupplier[];
  onDeleteSupplier?: (id: string) => void;
  onAddSupplier?: (supplier: LocalSupplier) => void;
  onUpdateSupplier?: (id: string, updates: Partial<LocalSupplier>) => void;
  supName?: string;
  setSupName?: (val: string) => void;
  supCategory?: LocalSupplier['category'];
  setSupCategory?: (val: LocalSupplier['category']) => void;
  supBranch?: string;
  setSupBranch?: (val: string) => void;
  supContactPerson?: string;
  setSupContactPerson?: (val: string) => void;
  supPhone?: string;
  setSupPhone?: (val: string) => void;
  supEmail?: string;
  setSupEmail?: (val: string) => void;
  supAccountNumber?: string;
  setSupAccountNumber?: (val: string) => void;
  supDiscount?: string;
  setSupDiscount?: (val: string) => void;
  supHasCoc?: boolean;
  setSupHasCoc?: (val: boolean) => void;
  supRating?: number;
  setSupRating?: (val: number) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const SupplierDirectoryModal: React.FC<SupplierDirectoryModalProps> = ({
  isOpen,
  onClose,
  suppliers: propSuppliers,
  onDeleteSupplier: propOnDeleteSupplier,
  onAddSupplier: propOnAddSupplier,
  onUpdateSupplier: propOnUpdateSupplier,
  supName: propSupName,
  setSupName: propSetSupName,
  supCategory: propSupCategory,
  setSupCategory: propSetSupCategory,
  supBranch: propSupBranch,
  setSupBranch: propSetSupBranch,
  supContactPerson: propSupContactPerson,
  setSupContactPerson: propSetSupContactPerson,
  supPhone: propSupPhone,
  setSupPhone: propSetSupPhone,
  supEmail: propSupEmail,
  setSupEmail: propSetSupEmail,
  supAccountNumber: propSupAccountNumber,
  setSupAccountNumber: propSetSupAccountNumber,
  supDiscount: propSupDiscount,
  setSupDiscount: propSetSupDiscount,
  supHasCoc: propSupHasCoc,
  setSupHasCoc: propSetSupHasCoc,
  supRating: propSupRating,
  setSupRating: propSetSupRating,
  onSubmit: propOnSubmit,
}) => {
  const storeSuppliers = usePortfolioStore((s) => s.suppliers);
  const storeAddSupplier = usePortfolioStore((s) => s.addSupplier);
  const storeUpdateSupplier = usePortfolioStore((s) => s.updateSupplier);
  const storeDeleteSupplier = usePortfolioStore((s) => s.deleteSupplier);

  const suppliers = propSuppliers || storeSuppliers;
  const deleteSupplier = propOnDeleteSupplier || storeDeleteSupplier;
  const updateSupplier = propOnUpdateSupplier || storeUpdateSupplier;

  const backdropDismiss = useModalBackdropDismiss(onClose);
  const { sheetStyle, dragHandleProps } = useBottomSheetDragToDismiss({ onClose });

  // Collapsible Add/Edit form & search/filter state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'CoC' | LocalSupplier['category']>('All');
  const formRef = useRef<HTMLDivElement>(null);

  // Local state fallbacks
  const [localName, setLocalName] = useState('');
  const [localCategory, setLocalCategory] = useState<LocalSupplier['category']>('Hardware & Timber');
  const [localBranch, setLocalBranch] = useState('');
  const [localContactPerson, setLocalContactPerson] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localAccountNumber, setLocalAccountNumber] = useState('');
  const [localDiscount, setLocalDiscount] = useState('');
  const [localHasCoc, setLocalHasCoc] = useState(false);
  const [localRating, setLocalRating] = useState<number>(5);

  const supName = propSupName !== undefined ? propSupName : localName;
  const setSupName = propSetSupName || setLocalName;
  const supCategory = propSupCategory !== undefined ? propSupCategory : localCategory;
  const setSupCategory = propSetSupCategory || setLocalCategory;
  const supBranch = propSupBranch !== undefined ? propSupBranch : localBranch;
  const setSupBranch = propSetSupBranch || setLocalBranch;
  const supContactPerson = propSupContactPerson !== undefined ? propSupContactPerson : localContactPerson;
  const setSupContactPerson = propSetSupContactPerson || setLocalContactPerson;
  const supPhone = propSupPhone !== undefined ? propSupPhone : localPhone;
  const setSupPhone = propSetSupPhone || setLocalPhone;
  const supEmail = propSupEmail !== undefined ? propSupEmail : localEmail;
  const setSupEmail = propSetSupEmail || setLocalEmail;
  const supAccountNumber = propSupAccountNumber !== undefined ? propSupAccountNumber : localAccountNumber;
  const setSupAccountNumber = propSetSupAccountNumber || setLocalAccountNumber;
  const supDiscount = propSupDiscount !== undefined ? propSupDiscount : localDiscount;
  const setSupDiscount = propSetSupDiscount || setLocalDiscount;
  const supHasCoc = propSupHasCoc !== undefined ? propSupHasCoc : localHasCoc;
  const setSupHasCoc = propSetSupHasCoc || setLocalHasCoc;
  const supRating = propSupRating !== undefined ? propSupRating : localRating;
  const setSupRating = propSetSupRating || setLocalRating;

  // Keyboard accessibility: exit top-most SupplierDirectoryModal on Escape without closing underlying modals
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const activeCategoryCounts = useMemo(() => {
    const counts = new Map<LocalSupplier['category'], number>();
    for (const sup of suppliers) {
      counts.set(sup.category, (counts.get(sup.category) || 0) + 1);
    }
    return counts;
  }, [suppliers]);

  const cocCount = useMemo(
    () => suppliers.filter((s) => Boolean(s.hasCoC)).length,
    [suppliers]
  );

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((sup) => {
      if (categoryFilter === 'CoC' && !sup.hasCoC) return false;
      if (categoryFilter !== 'All' && categoryFilter !== 'CoC' && sup.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return [
        sup.name,
        sup.category,
        sup.branchLocation,
        sup.contactPerson,
        sup.phone,
        sup.email,
        sup.accountNumber,
        sup.discountTerms,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [suppliers, searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const resetFormFields = () => {
    setEditingSupplierId(null);
    setSupName('');
    setSupBranch('');
    setSupContactPerson('');
    setSupPhone('');
    setSupEmail('');
    setSupAccountNumber('');
    setSupDiscount('');
    setSupHasCoc(false);
    setSupRating(5);
    setSupCategory('Hardware & Timber');
  };

  const handleToggleAddForm = () => {
    if (isFormOpen) {
      resetFormFields();
      setIsFormOpen(false);
    } else {
      resetFormFields();
      setIsFormOpen(true);
    }
  };

  const handleStartEdit = (sup: LocalSupplier) => {
    setEditingSupplierId(sup.id);
    setSupName(sup.name);
    setSupCategory(sup.category);
    setSupBranch(sup.branchLocation || '');
    setSupContactPerson(sup.contactPerson || '');
    setSupPhone(sup.phone || '');
    setSupEmail(sup.email || '');
    setSupAccountNumber(sup.accountNumber || '');
    setSupDiscount(sup.discountTerms || '');
    setSupHasCoc(!!sup.hasCoC);
    setSupRating(sup.rating >= 1 && sup.rating <= 5 ? Math.round(sup.rating) : 5);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  };

  const handleCancelEdit = () => {
    resetFormFields();
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    if (!supName.trim()) return;

    const normalizedRating = Math.min(5, Math.max(1, Math.round(supRating || 5)));

    if (editingSupplierId) {
      const updates: Partial<LocalSupplier> = {
        name: supName.trim(),
        category: supCategory,
        branchLocation: supBranch.trim(),
        contactPerson: supContactPerson.trim() || undefined,
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        accountNumber: supAccountNumber.trim() || undefined,
        discountTerms: supDiscount.trim() || undefined,
        hasCoC: supHasCoc,
        rating: normalizedRating,
      };

      updateSupplier(editingSupplierId, updates);
      handleCancelEdit();
    } else {
      const newSup: LocalSupplier = {
        id: `sup-${Date.now()}`,
        name: supName.trim(),
        category: supCategory,
        branchLocation: supBranch.trim(),
        contactPerson: supContactPerson.trim() || undefined,
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        accountNumber: supAccountNumber.trim() || undefined,
        discountTerms: supDiscount.trim() || undefined,
        hasCoC: supHasCoc,
        rating: normalizedRating,
      };

      if (propOnAddSupplier) {
        propOnAddSupplier(newSup);
      } else {
        storeAddSupplier(newSup);
      }

      handleCancelEdit();
    }
  };

  return (
    <div
      {...backdropDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="South African Supplier & Contractor Book"
      data-testid="supplier-directory-modal"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60] cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        className="bg-white rounded-t-3xl sm:rounded-xl max-w-2xl w-full shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-[86vh] flex flex-col overflow-hidden cursor-default"
      >
        <BottomSheetHandle {...dragHandleProps} />
        {/* Sticky Modal Header */}
        <div
          {...dragHandleProps}
          className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 pt-1.5 sm:pt-3 pb-3.5 shrink-0 touch-none sm:touch-auto select-none sm:select-auto"
        >
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-2.5 sm:gap-y-0">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span className="whitespace-nowrap">SA Supplier &amp; Contractor Book</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums shrink-0">
                  {suppliers.length}
                </span>
              </h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5 line-clamp-1">
                Vetted building merchants, maintenance handymen, and CoC / NHBRC trades.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sm:order-3 justify-self-end text-slate-400 hover:text-slate-700 p-1.5 rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="col-span-2 sm:col-span-1 sm:order-2 flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="supplier-export-csv-btn"
                disabled={suppliers.length === 0}
                onClick={() => exportSuppliersCSV(suppliers)}
                title="Export suppliers to CSV"
                aria-label="Export suppliers to CSV"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                data-testid="supplier-add-toggle-btn"
                onClick={handleToggleAddForm}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  isFormOpen
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                }`}
              >
                {isFormOpen ? (
                  <>
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>Close Form</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Add Supplier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Collapsible Top Add / Edit Supplier Form */}
          {isFormOpen && (
            <div
              ref={formRef}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <h4 className="font-bold text-xs text-slate-900">
                  {editingSupplierId
                    ? 'Edit Local Supplier / Contractor'
                    : 'Add Local Supplier / Contractor'}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                data-testid="supplier-directory-form"
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Trade Category
                  </label>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Supplier Trade Category"
                  >
                    {SUPPLIER_CATEGORIES.map((cat) => {
                      const isSelected = supCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSupCategory(cat)}
                          aria-pressed={isSelected}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Supplier / Contractor Name *
                    </label>
                    <input
                      type="text"
                      name="supplierCompany"
                      autoComplete="organization"
                      required
                      placeholder="e.g. Buco Menlyn"
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Branch / Suburb
                    </label>
                    <input
                      type="text"
                      name="supplierBranch"
                      autoComplete="off"
                      placeholder="e.g. Paarden Eiland"
                      value={supBranch}
                      onChange={(e) => setSupBranch(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      autoComplete="name"
                      placeholder="e.g. David Khumalo"
                      value={supContactPerson}
                      onChange={(e) => setSupContactPerson(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      placeholder="+27 11 000 0000"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="orders@supplier.co.za"
                      value={supEmail}
                      onChange={(e) => setSupEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Trade Account # (Optional)
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      autoComplete="off"
                      placeholder="e.g. BW-90234"
                      value={supAccountNumber}
                      onChange={(e) => setSupAccountNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Trade Discount Terms
                    </label>
                    <input
                      type="text"
                      name="tradeDiscount"
                      autoComplete="off"
                      placeholder="e.g. 5% Cash Discount"
                      value={supDiscount}
                      onChange={(e) => setSupDiscount(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Rating (1–5)
                    </label>
                    <div
                      className="flex items-center gap-1 h-[32px] px-2.5 rounded-lg border border-slate-300 bg-white"
                      role="group"
                      aria-label="Supplier rating"
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= supRating;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSupRating(star)}
                            aria-label={`Rate ${star} out of 5 stars`}
                            aria-pressed={supRating === star}
                            className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                active
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-auto text-[11px] font-semibold text-slate-600 tabular-nums">
                        {supRating}/5
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supHasCoc}
                      onChange={(e) => setSupHasCoc(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-medium text-slate-700">
                      CoC / NHBRC Accredited (Electrical, Plumbing, Gas, Fence, Builder)
                    </span>
                  </label>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs"
                    >
                      {editingSupplierId ? 'Update Supplier' : 'Save Supplier'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Search & 1-Tap Horizontal Chip Filter Strip */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                data-testid="supplier-search-input"
                aria-label="Search suppliers and contractors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supplier, trade, suburb, or contact..."
                className="w-full pl-8 pr-8 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear supplier search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full"
              role="group"
              aria-label="Filter Suppliers by Category"
            >
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                aria-pressed={categoryFilter === 'All'}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors ${
                  categoryFilter === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {`All (${suppliers.length})`}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCategoryFilter(categoryFilter === 'CoC' ? 'All' : 'CoC')
                }
                aria-pressed={categoryFilter === 'CoC'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors ${
                  categoryFilter === 'CoC'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{`CoC / NHBRC (${cocCount})`}</span>
              </button>
              {SUPPLIER_CATEGORIES.filter((cat) => (activeCategoryCounts.get(cat) || 0) > 0).map(
                (cat) => {
                  const count = activeCategoryCounts.get(cat) || 0;
                  const isSelected = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(isSelected ? 'All' : cat)}
                      aria-pressed={isSelected}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {`${cat} (${count})`}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Supplier Cards List */}
          <div className="space-y-3">
            {suppliers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
                <div>No suppliers or contractors recorded yet.</div>
                <button
                  type="button"
                  onClick={() => {
                    resetFormFields();
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Add First Supplier</span>
                </button>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
                <div>No suppliers match your current search or filter.</div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const waPhone = normalizeWhatsAppPhone(sup.phone);
                const telHref = sup.phone ? `tel:${sup.phone.replace(/\s+/g, '')}` : '';
                const ratingVal = sup.rating >= 1 && sup.rating <= 5 ? Math.round(sup.rating) : 5;

                return (
                  <div
                    key={sup.id}
                    data-testid={`supplier-card-${sup.id}`}
                    className={`p-3.5 rounded-xl border transition-colors space-y-2.5 text-xs ${
                      editingSupplierId === sup.id
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-[13px] leading-snug">
                            {sup.name}
                          </span>
                          <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                            {sup.category}
                          </span>
                          {sup.hasCoC && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-700" />
                              <span>CoC / NHBRC</span>
                            </span>
                          )}
                          {editingSupplierId === sup.id && (
                            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold">
                              Editing
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1" aria-label={`Rated ${ratingVal} out of 5`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= ratingVal
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-semibold text-slate-500 ml-0.5 tabular-nums">
                            {ratingVal}.0
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sup)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            editingSupplierId === sup.id
                              ? 'text-emerald-700 bg-emerald-100'
                              : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/70'
                          }`}
                          title="Edit supplier"
                          aria-label={`Edit ${sup.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingSupplierId === sup.id) {
                              handleCancelEdit();
                            }
                            deleteSupplier(sup.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Remove supplier"
                          aria-label={`Remove ${sup.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {(sup.branchLocation || sup.contactPerson || sup.email || sup.accountNumber || sup.discountTerms) && (
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        {(sup.branchLocation || sup.contactPerson) && (
                          <p>
                            {sup.branchLocation}
                            {sup.branchLocation && sup.contactPerson ? ' • ' : ''}
                            {sup.contactPerson && `Contact: ${sup.contactPerson}`}
                          </p>
                        )}
                        {(sup.email || sup.accountNumber) && (
                          <p className="text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                            {sup.email && <span className="break-all">{sup.email}</span>}
                            {sup.accountNumber && (
                              <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                Acct: {sup.accountNumber}
                              </span>
                            )}
                          </p>
                        )}
                        {sup.discountTerms && (
                          <p className="text-emerald-700 font-semibold">{sup.discountTerms}</p>
                        )}
                      </div>
                    )}

                    {/* 390px-safe Contact & 1-Tap Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                      <span
                        data-testid="supplier-phone"
                        className="text-[11px] font-semibold text-slate-800 whitespace-nowrap shrink-0 tabular-nums"
                      >
                        {sup.phone || 'No phone recorded'}
                      </span>

                      {waPhone && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={telHref}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-semibold whitespace-nowrap transition-colors"
                          >
                            <Phone className="w-3 h-3 text-slate-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap transition-colors shadow-2xs"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDirectoryModal;
