'use client';

import React, { useState } from 'react';
import { RentalProperty, MaintenanceLog } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { Wrench } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface MaintenanceModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
  // Controlled props for Phase 4A backward compatibility
  maintIssue?: string;
  setMaintIssue?: (v: string) => void;
  maintCategory?: MaintenanceLog['category'];
  setMaintCategory?: (v: MaintenanceLog['category']) => void;
  maintContractor?: string;
  setMaintContractor?: (v: string) => void;
  maintCost?: number;
  setMaintCost?: (v: number) => void;
  onAddMaintenance?: (e: React.FormEvent) => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  property,
  onClose,
  maintIssue: propMaintIssue,
  setMaintIssue: propSetMaintIssue,
  maintCategory: propMaintCategory,
  setMaintCategory: propSetMaintCategory,
  maintContractor: propMaintContractor,
  setMaintContractor: propSetMaintContractor,
  maintCost: propMaintCost,
  setMaintCost: propSetMaintCost,
  onAddMaintenance: propOnAddMaintenance,
}) => {
  const addMaintenanceLog = usePortfolioStore((s) => s.addMaintenanceLog);

  const [localIssue, setLocalIssue] = useState('');
  const [localCategory, setLocalCategory] = useState<MaintenanceLog['category']>('Plumbing');
  const [localContractor, setLocalContractor] = useState('Rapid Response Plumbing');
  const [localCost, setLocalCost] = useState(1500);

  if (!isOpen || !property) return null;

  const issue = propMaintIssue !== undefined ? propMaintIssue : localIssue;
  const category = propMaintCategory !== undefined ? propMaintCategory : localCategory;
  const contractor = propMaintContractor !== undefined ? propMaintContractor : localContractor;
  const cost = propMaintCost !== undefined ? propMaintCost : localCost;

  const handleIssueChange = (val: string) => {
    if (propSetMaintIssue) propSetMaintIssue(val);
    else setLocalIssue(val);
  };

  const handleCategoryChange = (val: MaintenanceLog['category']) => {
    if (propSetMaintCategory) propSetMaintCategory(val);
    else setLocalCategory(val);
  };

  const handleContractorChange = (val: string) => {
    if (propSetMaintContractor) propSetMaintContractor(val);
    else setLocalContractor(val);
  };

  const handleCostChange = (val: number) => {
    if (propSetMaintCost) propSetMaintCost(val);
    else setLocalCost(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnAddMaintenance) {
      propOnAddMaintenance(e);
      return;
    }
    e.preventDefault();
    if (!issue) return;
    addMaintenanceLog(property.id, {
      dateLogged: new Date().toISOString().split('T')[0],
      issueDescription: issue,
      category,
      costZAR: cost,
      contractorName: contractor,
      status: 'Resolved',
      invoiceRef: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    handleIssueChange('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Maintenance History: {property.title}
            </h3>
            <p className="text-xs text-slate-500">
              Track plumbing, electrical, and appliance work orders.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* List Existing Logs */}
        <div className="space-y-2.5 mb-6">
          {(!property.maintenanceHistory || property.maintenanceHistory.length === 0) ? (
            <p className="text-xs text-slate-400 py-4 text-center">No maintenance logs recorded for this unit.</p>
          ) : (
            property.maintenanceHistory.map((item) => (
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
        <form onSubmit={handleSubmit} noValidate className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
          <h4 className="font-bold text-xs text-slate-800">Log New Work Order / Expense</h4>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Issue Description *</label>
            <input
              type="text"
              name="maintenanceDescription"
              autoComplete="off"
              required
              placeholder="e.g. Inverter battery firmware inspection & cable replacement"
              value={issue}
              onChange={(e) => handleIssueChange(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as MaintenanceLog['category'])}
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
                name="maintenanceCostZAR"
                autoComplete="off"
                min="0"
                step="any"
                value={cost}
                onChange={(e) => handleCostChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contractor</label>
              <input
                type="text"
                name="contractorName"
                autoComplete="name"
                value={contractor}
                onChange={(e) => handleContractorChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs cursor-pointer"
            >
              Log Maintenance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;
