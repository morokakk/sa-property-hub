'use client';

import React, { useState } from 'react';
import {
  X,
  Gauge,
  Zap,
  Droplets,
  PlusCircle,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Check,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { PropertyMeter, RentalProperty } from '@/types';

interface PropertyMeterRegistryModalProps {
  property: RentalProperty;
  isOpen: boolean;
  onClose: () => void;
  onSelectMeter?: (meterNumber: string, utilityType: 'water' | 'electricity') => void;
}

export default function PropertyMeterRegistryModal({
  property,
  isOpen,
  onClose,
  onSelectMeter,
}: PropertyMeterRegistryModalProps) {
  const addPropertyMeter = usePortfolioStore((state) => state.addPropertyMeter);
  const updatePropertyMeter = usePortfolioStore((state) => state.updatePropertyMeter);
  const deletePropertyMeter = usePortfolioStore((state) => state.deletePropertyMeter);

  const [isAdding, setIsAdding] = useState(false);
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);

  // Form Fields
  const [meterNumber, setMeterNumber] = useState('');
  const [utilityType, setUtilityType] = useState<'water' | 'electricity'>('electricity');
  const [meterType, setMeterType] = useState<'council_main' | 'sub_meter'>('council_main');
  const [unitName, setUnitName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !property) return null;

  const meters = property.meterRegistry || [];
  const isMultiTenant = (property.leases && property.leases.length > 1) || property.utilityType === 'hybrid';

  const resetForm = () => {
    setMeterNumber('');
    setUtilityType('electricity');
    setMeterType('council_main');
    setUnitName('');
    setTenantId('');
    setLocation('');
    setNotes('');
    setFormError(null);
    setIsAdding(false);
    setEditingMeterId(null);
  };

  const handleStartEdit = (meter: PropertyMeter) => {
    setEditingMeterId(meter.id);
    setIsAdding(true);
    setMeterNumber(meter.meterNumber);
    setUtilityType(meter.utilityType);
    setMeterType(meter.meterType);
    setUnitName(meter.unitName || '');
    setTenantId(meter.tenantId || '');
    setLocation(meter.location || '');
    setNotes(meter.notes || '');
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNumber = meterNumber.trim();
    if (!trimmedNumber) {
      setFormError('Please enter a physical meter serial number.');
      return;
    }

    // Check duplicate meter number within property (except if editing current)
    const duplicate = meters.find(
      (m) =>
        m.id !== editingMeterId &&
        m.meterNumber.trim().toLowerCase() === trimmedNumber.toLowerCase()
    );
    if (duplicate) {
      setFormError(`Meter #${trimmedNumber} is already registered on this property.`);
      return;
    }

    if (editingMeterId) {
      updatePropertyMeter(property.id, editingMeterId, {
        meterNumber: trimmedNumber,
        utilityType,
        meterType,
        unitName: unitName.trim() || undefined,
        tenantId: tenantId || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addPropertyMeter(property.id, {
        meterNumber: trimmedNumber,
        utilityType,
        meterType,
        unitName: unitName.trim() || undefined,
        tenantId: tenantId || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    resetForm();
  };

  const handleDelete = (meterId: string, serial: string) => {
    if (confirm(`Remove meter #${serial} from this property registry?`)) {
      deletePropertyMeter(property.id, meterId);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800 shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Property Meter Registry
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  {meters.length} {meters.length === 1 ? 'Meter' : 'Meters'}
                </span>
                {isMultiTenant && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>Multi-Tenant</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {property.title} • {property.address}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Top Banner & Add Button */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-slate-500">
              Track council main supply dials and private tenant sub-meters per unit.
            </p>
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAdding(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register Meter</span>
              </button>
            )}
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Add / Edit Meter Form */}
          {isAdding && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-cyan-600" />
                  <span>{editingMeterId ? 'Edit Meter Details' : 'Register New Meter'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Meter Serial Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meter Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={meterNumber}
                    onChange={(e) => setMeterNumber(e.target.value)}
                    placeholder="e.g. 10003374 or ETH-E-33019"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Utility Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Utility Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUtilityType('electricity')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        utilityType === 'electricity'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Electricity</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUtilityType('water')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        utilityType === 'water'
                          ? 'bg-cyan-600 text-white border-cyan-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Water</span>
                    </button>
                  </div>
                </div>

                {/* Meter Type: Council Main vs Sub-Meter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meter Type *
                  </label>
                  <select
                    value={meterType}
                    onChange={(e) => setMeterType(e.target.value as 'council_main' | 'sub_meter')}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="council_main">Council Main Supply (Municipal Billed)</option>
                    <option value="sub_meter">Private / Tenant Sub-Meter (Internal)</option>
                  </select>
                </div>

                {/* Unit / Tenant Assignment */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unit / Tenant Assignment
                  </label>
                  {property.leases && property.leases.length > 0 ? (
                    <select
                      value={tenantId || unitName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchLease = property.leases.find((l) => l.id === val || l.unitName === val);
                        if (matchLease) {
                          setTenantId(matchLease.id);
                          setUnitName(matchLease.unitName);
                        } else {
                          setTenantId('');
                          setUnitName(val);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="">Entire Property / Unassigned</option>
                      {property.leases.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.unitName} ({l.tenantName || 'Vacant'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="e.g. Main House, Cottage A, Suite 4B"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Physical Location */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Location on Property
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Front pavement boundary, Garage DB, Under kitchen sink"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Notes / Vending Details
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Citiq prepaid meter key code, 3-phase digital"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingMeterId ? 'Update Meter' : 'Save Meter'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Registered Meters List */}
          {meters.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No meters registered yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Add council supply meters or tenant sub-meters to easily link them to municipal dispute templates and log inspections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meters.map((meter) => {
                const isElec = meter.utilityType === 'electricity';
                const isCouncil = meter.meterType === 'council_main';

                return (
                  <div
                    key={meter.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-2xs space-y-2 relative group"
                  >
                    {/* Top Row: Badges & Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isElec ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Electricity</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <Droplets className="w-3 h-3 text-cyan-600" />
                            <span>Water</span>
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCouncil
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isCouncil ? 'Council Main' : 'Sub-Meter'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onSelectMeter && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectMeter(meter.meterNumber, meter.utilityType);
                              onClose();
                            }}
                            className="p-1 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded transition-colors"
                            title="Select for meter reading"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(meter)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Edit meter"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(meter.id, meter.meterNumber)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remove meter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meter Number */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Serial Number
                      </span>
                      <span className="text-sm font-mono font-black text-slate-900 tracking-tight">
                        #{meter.meterNumber}
                      </span>
                    </div>

                    {/* Unit / Location */}
                    {(meter.unitName || meter.location) && (
                      <div className="space-y-0.5 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                        {meter.unitName && (
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{meter.unitName}</span>
                          </div>
                        )}
                        {meter.location && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{meter.location}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {meter.notes && (
                      <p className="text-[10px] text-slate-400 italic truncate" title={meter.notes}>
                        {meter.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Saved to local portfolio profile
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
