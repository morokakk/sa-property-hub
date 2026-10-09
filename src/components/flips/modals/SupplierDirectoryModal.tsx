'use client';

import React, { useState } from 'react';
import { LocalSupplier } from '@/types';
import { Store, Trash2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface SupplierDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Controlled props for Phase 4A backward compatibility with page.tsx
  suppliers?: LocalSupplier[];
  onDeleteSupplier?: (id: string) => void;
  onAddSupplier?: (supplier: LocalSupplier) => void;
  supName?: string;
  setSupName?: (val: string) => void;
  supCategory?: LocalSupplier['category'];
  setSupCategory?: (val: LocalSupplier['category']) => void;
  supBranch?: string;
  setSupBranch?: (val: string) => void;
  supPhone?: string;
  setSupPhone?: (val: string) => void;
  supDiscount?: string;
  setSupDiscount?: (val: string) => void;
  supHasCoc?: boolean;
  setSupHasCoc?: (val: boolean) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const SupplierDirectoryModal: React.FC<SupplierDirectoryModalProps> = ({
  isOpen,
  onClose,
  suppliers: propSuppliers,
  onDeleteSupplier: propOnDeleteSupplier,
  onAddSupplier: propOnAddSupplier,
  supName: propSupName,
  setSupName: propSetSupName,
  supCategory: propSupCategory,
  setSupCategory: propSetSupCategory,
  supBranch: propSupBranch,
  setSupBranch: propSetSupBranch,
  supPhone: propSupPhone,
  setSupPhone: propSetSupPhone,
  supDiscount: propSupDiscount,
  setSupDiscount: propSetSupDiscount,
  supHasCoc: propSupHasCoc,
  setSupHasCoc: propSetSupHasCoc,
  onSubmit: propOnSubmit,
}) => {
  const storeSuppliers = usePortfolioStore((s) => s.suppliers);
  const storeAddSupplier = usePortfolioStore((s) => s.addSupplier);
  const storeDeleteSupplier = usePortfolioStore((s) => s.deleteSupplier);

  const suppliers = propSuppliers || storeSuppliers;
  const deleteSupplier = propOnDeleteSupplier || storeDeleteSupplier;

  // Local state fallbacks
  const [localName, setLocalName] = useState('');
  const [localCategory, setLocalCategory] = useState<LocalSupplier['category']>('Hardware & Timber');
  const [localBranch, setLocalBranch] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [localDiscount, setLocalDiscount] = useState('');
  const [localHasCoc, setLocalHasCoc] = useState(false);

  const supName = propSupName !== undefined ? propSupName : localName;
  const setSupName = propSetSupName || setLocalName;
  const supCategory = propSupCategory !== undefined ? propSupCategory : localCategory;
  const setSupCategory = propSetSupCategory || setLocalCategory;
  const supBranch = propSupBranch !== undefined ? propSupBranch : localBranch;
  const setSupBranch = propSetSupBranch || setLocalBranch;
  const supPhone = propSupPhone !== undefined ? propSupPhone : localPhone;
  const setSupPhone = propSetSupPhone || setLocalPhone;
  const supDiscount = propSupDiscount !== undefined ? propSupDiscount : localDiscount;
  const setSupDiscount = propSetSupDiscount || setLocalDiscount;
  const supHasCoc = propSupHasCoc !== undefined ? propSupHasCoc : localHasCoc;
  const setSupHasCoc = propSetSupHasCoc || setLocalHasCoc;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    if (!supName.trim()) return;

    const newSup: LocalSupplier = {
      id: `sup-${Date.now()}`,
      name: supName.trim(),
      category: supCategory,
      branchLocation: supBranch.trim(),
      phone: supPhone.trim(),
      discountTerms: supDiscount.trim(),
      hasCoC: supHasCoc,
      rating: 5,
    };

    if (propOnAddSupplier) {
      propOnAddSupplier(newSup);
    } else {
      storeAddSupplier(newSup);
    }

    setSupName('');
    setSupBranch('');
    setSupPhone('');
    setSupDiscount('');
    setSupHasCoc(false);
  };

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
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
                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
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
          <form onSubmit={handleSubmit} noValidate className="space-y-3 text-xs">
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
                  onChange={(e) => setSupCategory(e.target.value as LocalSupplier['category'])}
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
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
