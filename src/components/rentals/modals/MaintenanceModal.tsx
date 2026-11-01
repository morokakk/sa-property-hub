'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty, MaintenanceLog } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { Wrench, X, Share2, Trash2, UserCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { InlineEditableAmount } from '@/components/common/InlineEditableAmount';
import { formatContractorDispatchForWhatsApp } from '@/lib/whatsappFormatter';
import { normalizeWhatsAppPhone } from '@/lib/calculations/inspections';
import { hydrateNow, useCloudSyncStore } from '@/hooks/useAutoCloudSync';
import { getTenantReportedMaintenance } from '@/app/actions/submitTenantMaintenanceTicket';

type WorkOrderStatus = MaintenanceLog['status'];

const STATUS_CYCLE: WorkOrderStatus[] = ['Open', 'In Progress', 'Resolved'];

export const STATUS_BADGE_CLASSES: Record<WorkOrderStatus, string> = {
  Open: 'bg-amber-100 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export function nextWorkOrderStatus(current: WorkOrderStatus): WorkOrderStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

/** Auto status for the new-ticket form: Open when no cost, Resolved once an invoice amount is entered. */
export function deriveStatusFromCost(cost: number): WorkOrderStatus {
  return cost > 0 ? 'Resolved' : 'Open';
}

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
  const updateMaintenanceLog = usePortfolioStore((s) => s.updateMaintenanceLog);
  const deleteMaintenanceLog = usePortfolioStore((s) => s.deleteMaintenanceLog);
  const suppliers = usePortfolioStore((s) => s.suppliers);
  const investorProfile = usePortfolioStore((s) => s.investorProfile);
  // Subscribe to the live rental so inline edits reflect immediately
  const liveProperty = usePortfolioStore((s) =>
    property ? s.rentals.find((r) => r.id === property.id) : undefined
  );

  const [localIssue, setLocalIssue] = useState('');
  const [localCategory, setLocalCategory] = useState<MaintenanceLog['category']>('Plumbing');
  const [localContractor, setLocalContractor] = useState('Rapid Response Plumbing');
  const [localCost, setLocalCost] = useState(0);
  const [localStatus, setLocalStatus] = useState<WorkOrderStatus>('Open');
  const [isStatusManual, setIsStatusManual] = useState(false);
  const [reportedByTenant, setReportedByTenant] = useState(false);

  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolvingAmount, setResolvingAmount] = useState<string>('');
  const [resolvingInvoiceRef, setResolvingInvoiceRef] = useState<string>('');
  const [isCheckingCloud, setIsCheckingCloud] = useState<boolean>(false);

  const checkCloudAndTenantTickets = async () => {
    setIsCheckingCloud(true);
    try {
      const auth = useCloudSyncStore.getState().isAuthenticated;
      if (auth) {
        await hydrateNow();
      }

      const activeProp = liveProperty || property;
      const leaseIds = (activeProp?.leases || []).map((l) => l.id);
      if (activeProp?.id) {
        const res = await getTenantReportedMaintenance({
          propertyId: activeProp.id,
          leaseIds,
        });

        if (res.success && Array.isArray(res.tickets) && res.tickets.length > 0) {
          const existingDescriptions = new Set(
            (activeProp.maintenanceHistory || []).map((h) => h.issueDescription)
          );
          const existingIds = new Set(
            (activeProp.maintenanceHistory || []).map((h) => h.id)
          );

          for (const t of res.tickets) {
            if (!existingIds.has(t.id) && !existingDescriptions.has(t.issueDescription)) {
              addMaintenanceLog(activeProp.id, t);
            }
          }
        }
      }
    } catch {
      // Gracefully continue
    } finally {
      setIsCheckingCloud(false);
    }
  };

  useEffect(() => {
    if (isOpen && property?.id) {
      void checkCloudAndTenantTickets();
    }
  }, [isOpen, property?.id]);

  const handleStartResolve = (item: MaintenanceLog) => {
    setResolvingTicketId(item.id);
    setResolvingAmount(item.costZAR > 0 ? String(item.costZAR) : '');
    setResolvingInvoiceRef(item.invoiceRef || '');
  };

  const handleConfirmResolve = (logId: string) => {
    const finalCost = Math.max(0, Number(resolvingAmount) || 0);
    updateMaintenanceLog(current.id, logId, {
      status: 'Resolved',
      costZAR: finalCost,
      invoiceRef: resolvingInvoiceRef.trim() || undefined,
    });
    setResolvingTicketId(null);
    setResolvingAmount('');
    setResolvingInvoiceRef('');
  };

  const handleCancelResolve = () => {
    setResolvingTicketId(null);
    setResolvingAmount('');
    setResolvingInvoiceRef('');
  };

  if (!isOpen || !property) return null;

  const current = liveProperty || property;

  const issue = propMaintIssue !== undefined ? propMaintIssue : localIssue;
  const category = propMaintCategory !== undefined ? propMaintCategory : localCategory;
  const contractor = propMaintContractor !== undefined ? propMaintContractor : localContractor;
  const cost = propMaintCost !== undefined ? propMaintCost : localCost;
  const status: WorkOrderStatus = isStatusManual ? localStatus : deriveStatusFromCost(cost);

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
    const safe = Number.isFinite(val) ? Math.max(0, val) : 0;
    if (propSetMaintCost) propSetMaintCost(safe);
    else setLocalCost(safe);
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
      status,
      reportedByTenant: reportedByTenant || undefined,
      invoiceRef: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    handleIssueChange('');
    handleCostChange(0);
    setLocalStatus('Open');
    setIsStatusManual(false);
    setReportedByTenant(false);
  };

  const handleDispatch = (item: MaintenanceLog) => {
    const name = (item.contractorName || '').trim().toLowerCase();
    const supplier = name
      ? (suppliers || []).find((s) => (s.name || '').trim().toLowerCase() === name)
      : undefined;
    const phone = normalizeWhatsAppPhone(supplier?.phone || undefined);
    const lease =
      (current.leases || []).find((l) => l.status !== 'Vacant') || current.leases?.[0];
    const text = formatContractorDispatchForWhatsApp({
      propertyTitle: current.title,
      propertyAddress: current.address,
      propertyCity: current.city,
      unitName: lease?.unitName,
      tenantName: lease?.tenantName,
      tenantPhone: lease?.tenantPhone,
      category: item.category,
      issueDescription: item.issueDescription,
      status: item.status,
      dateLogged: item.dateLogged,
      costZAR: item.costZAR,
      invoiceRef: item.invoiceRef,
      contractorName: item.contractorName,
      landlordEntityName: investorProfile?.entityName,
      landlordContact: investorProfile?.contactNumber,
    });
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  };

  const history = current.maintenanceHistory || [];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Maintenance History: {current.title}
            </h3>
            <p className="text-xs text-slate-500">
              Track plumbing, electrical, and appliance work orders.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isCheckingCloud}
              onClick={checkCloudAndTenantTickets}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Check cloud for new tenant maintenance reports"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCloud ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{isCheckingCloud ? 'Checking...' : 'Sync Cloud'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List Existing Work Orders */}
        <div className="space-y-2.5 mb-6">
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No maintenance logs recorded for this unit.</p>
          ) : (
            history.map((item) => {
              const itemStatus: WorkOrderStatus = item.status || 'Resolved';
              return (
                <div
                  key={item.id}
                  data-testid={`work-order-${item.id}`}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">{item.issueDescription}</span>
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-medium">
                          {item.category}
                        </span>
                        {item.reportedByTenant && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                            <UserCheck className="w-2.5 h-2.5" /> Tenant Reported
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Contractor: <strong className="text-slate-700">{item.contractorName || 'Unassigned'}</strong> • {formatDate(item.dateLogged)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <InlineEditableAmount
                        value={item.costZAR || 0}
                        onSave={(val) => updateMaintenanceLog(current.id, item.id, { costZAR: Math.max(0, val) })}
                        title="Click to update the final invoice amount"
                        className="text-slate-900 font-bold"
                      />
                      <button
                        type="button"
                        data-testid={`work-order-status-${item.id}`}
                        onClick={() =>
                          updateMaintenanceLog(current.id, item.id, { status: nextWorkOrderStatus(itemStatus) })
                        }
                        title="Click to advance status"
                        className={`block ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${STATUS_BADGE_CLASSES[itemStatus]}`}
                      >
                        {itemStatus}
                      </button>
                    </div>
                  </div>
                  {resolvingTicketId === item.id ? (
                    <div className="w-full flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-emerald-900">Final Invoice: R</span>
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          data-testid={`resolving-amount-input-${item.id}`}
                          value={resolvingAmount}
                          onChange={(e) => setResolvingAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-24 px-2 py-0.5 text-xs font-bold border border-emerald-300 rounded bg-white text-slate-900 focus:outline-emerald-500"
                        />
                        <input
                          type="text"
                          data-testid={`resolving-invoiceref-input-${item.id}`}
                          value={resolvingInvoiceRef}
                          onChange={(e) => setResolvingInvoiceRef(e.target.value)}
                          placeholder="Invoice # (optional)"
                          className="w-28 px-2 py-0.5 text-[11px] border border-emerald-300 rounded bg-white text-slate-900 focus:outline-emerald-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-testid={`confirm-resolve-btn-${item.id}`}
                          onClick={() => handleConfirmResolve(item.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Confirm Resolved
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelResolve}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 flex-wrap pt-1 border-t border-slate-200/70">
                      {itemStatus !== 'Resolved' && (
                        <button
                          type="button"
                          data-testid={`mark-resolved-btn-${item.id}`}
                          onClick={() => handleStartResolve(item)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer"
                          title="Input final invoice and mark ticket as resolved"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`work-order-dispatch-${item.id}`}
                        onClick={() => handleDispatch(item)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" /> Dispatch to Contractor (WhatsApp)
                      </button>
                      <button
                        type="button"
                        aria-label="Delete work order"
                        onClick={() => {
                          if (confirm('Delete this work order?')) deleteMaintenanceLog(current.id, item.id);
                        }}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Log New Work Order Form */}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
              <select
                name="maintenanceStatus"
                value={status}
                onChange={(e) => {
                  setLocalStatus(e.target.value as WorkOrderStatus);
                  setIsStatusManual(true);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contractor</label>
              <input
                type="text"
                name="contractorName"
                autoComplete="name"
                list="maintenance-supplier-list"
                value={contractor}
                onChange={(e) => handleContractorChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
              <datalist id="maintenance-supplier-list">
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="reportedByTenant"
                checked={reportedByTenant}
                onChange={(e) => setReportedByTenant(e.target.checked)}
              />
              Reported by Tenant
            </label>
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
