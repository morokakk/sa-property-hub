'use client';

import React, { useState, useMemo } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { calculateDevelopmentFinancials } from '@/lib/calculations/developments';
import { DevelopmentKpiBanner } from '@/components/developments/DevelopmentKpiBanner';
import { DevelopmentUnitInventoryTab } from '@/components/developments/DevelopmentUnitInventoryTab';
import { DevelopmentCostStackTab } from '@/components/developments/DevelopmentCostStackTab';
import { DevelopmentApprovalsTab } from '@/components/developments/DevelopmentApprovalsTab';
import { DevelopmentFinanceTab } from '@/components/developments/DevelopmentFinanceTab';
import { DevelopmentProjectModal } from '@/components/developments/DevelopmentProjectModal';
import { PlusCircle, HardHat, FileSpreadsheet, FileCheck, Coins, Edit2, Trash2, Building } from 'lucide-react';
import { DevelopmentProject, DevelopmentUnit } from '@/types';

type OperationalTab = 'units' | 'costs' | 'approvals' | 'finance';

export default function DevelopmentsPage() {
  const store = usePortfolioStore();
  const storeDevelopments = usePortfolioStore((state) => state.developments);
  const developments = (typeof window === 'undefined' ? usePortfolioStore.getState().developments : storeDevelopments) ?? [];

  const [selectedDevId, setSelectedDevId] = useState<string>(developments[0]?.id || '');
  const [activeTab, setActiveTab] = useState<OperationalTab>('units');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAfterTax, setShowAfterTax] = useState(false);

  React.useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '');
      if (hash === 'developments-inventory') setActiveTab('units');
      else if (hash === 'developments-costs') setActiveTab('costs');
      else if (hash === 'developments-approvals') setActiveTab('approvals');
      else if (hash === 'developments-finance') setActiveTab('finance');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const activeDev = useMemo(
    () => developments.find((d) => d.id === selectedDevId) || developments[0] || null,
    [developments, selectedDevId]
  );
  const financials = useMemo(
    () => (activeDev ? calculateDevelopmentFinancials(activeDev) : null),
    [activeDev]
  );

  const handleDeleteProject = () => {
    if (!activeDev || !confirm(`Delete development "${activeDev.title}"?`)) return;
    store.deleteDevelopment(activeDev.id);
    const remaining = developments.filter((d) => d.id !== activeDev.id);
    if (remaining[0]) setSelectedDevId(remaining[0].id);
  };

  const handleUpdateUnit = (unitId: string, updates: Partial<DevelopmentUnit>) => {
    if (!activeDev) return;
    const units = (activeDev.units || []).map((u) => (u.id === unitId ? { ...u, ...updates } : u));
    store.updateDevelopment(activeDev.id, { units });
  };

  const handleAddUnit = (unit: Omit<DevelopmentUnit, 'id'>) => {
    if (!activeDev) return;
    const newUnit = { ...unit, id: `dev-unit-${Date.now()}-${(activeDev.units?.length || 0) + 1}` };
    store.updateDevelopment(activeDev.id, { units: [...(activeDev.units || []), newUnit] });
  };

  const handleDeleteUnit = (unitId: string) => {
    if (!activeDev) return;
    store.updateDevelopment(activeDev.id, {
      units: (activeDev.units || []).filter((u) => u.id !== unitId),
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Developments Manager"
        subtitle="Township infill, sectional title clusters, statutory approvals, and hybrid split-exit models"
        actionButton={
          <button
            type="button"
            onClick={() => { setIsEditing(false); setIsProjectModalOpen(true); }}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Development Project</span>
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {developments.length > 0 ? (
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {developments.map((dev) => {
                const isSelected = activeDev?.id === dev.id;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => setSelectedDevId(dev.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <HardHat className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{dev.title}</span>
                    <span className="text-[10px] opacity-75 font-normal">({dev.units?.length || 0}u)</span>
                  </button>
                );
              })}
            </div>

            {activeDev && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {activeDev.currentPhase}
                </span>
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setIsProjectModalOpen(true); }}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
            <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Development Projects</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Get started by creating your first sectional title or township infill project.</p>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setIsProjectModalOpen(true); }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Development Project</span>
            </button>
          </div>
        )}

        {activeDev && financials && (
          <div className="space-y-6">
            <DevelopmentKpiBanner
              development={activeDev}
              financials={financials}
              showAfterTax={showAfterTax}
              onToggleAfterTax={() => setShowAfterTax((prev) => !prev)}
            />

            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
              {[
                { id: 'units', label: `Unit Inventory & Split-Exit (${activeDev.units?.length || 0})`, icon: Building },
                { id: 'costs', label: 'Cost Stack & Hard Build BOQ', icon: FileSpreadsheet },
                { id: 'approvals', label: 'Paper Rights & Approvals (6)', icon: FileCheck },
                { id: 'finance', label: 'Finance & Pre-Sales Gate', icon: Coins },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id as OperationalTab)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === id
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'units' && (
              <div id="developments-inventory">
                <DevelopmentUnitInventoryTab
                  development={activeDev}
                  financials={financials}
                  onUpdateUnit={handleUpdateUnit}
                  onAddUnit={handleAddUnit}
                  onDeleteUnit={handleDeleteUnit}
                  onMarkUnitSold={(unitId, buyer, price) => store.sellDevelopmentUnit(activeDev.id, unitId, buyer, price)}
                  onGraduateRetainedUnits={() => store.graduateRetainedUnitsToRental(activeDev.id)}
                />
              </div>
            )}

            {activeTab === 'costs' && (
              <div id="developments-costs">
                <DevelopmentCostStackTab
                  development={activeDev}
                  financials={financials}
                  onUpdateSoftCosts={(sc) => store.updateDevelopment(activeDev.id, { softCosts: { ...activeDev.softCosts, ...sc } })}
                  onUpdateDevelopment={(updates) => store.updateDevelopment(activeDev.id, updates)}
                  onAddBOQItem={(item) => store.addDevelopmentBOQItem(activeDev.id, item)}
                  onUpdateBOQItem={(id, u) => store.updateDevelopmentBOQItem(activeDev.id, id, u)}
                  onDeleteBOQItem={(id) => store.deleteDevelopmentBOQItem(activeDev.id, id)}
                />
              </div>
            )}

            {activeTab === 'approvals' && (
              <div id="developments-approvals">
                <DevelopmentApprovalsTab
                  development={activeDev}
                  financials={financials}
                  onUpdateApproval={(key, u) =>
                    store.updateDevelopment(activeDev.id, {
                      approvals: { ...activeDev.approvals, [key]: { ...activeDev.approvals[key], ...u } },
                    })
                  }
                />
              </div>
            )}

            {activeTab === 'finance' && (
              <div id="developments-finance">
                <DevelopmentFinanceTab
                  development={activeDev}
                  financials={financials}
                  onUpdateDevelopment={(u) => store.updateDevelopment(activeDev.id, u)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <DevelopmentProjectModal
        isOpen={isProjectModalOpen}
        editingDevelopment={isEditing ? activeDev : null}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={(project, isNew) => {
          if (isNew) {
            store.addDevelopment(project as DevelopmentProject);
            if (project.id) setSelectedDevId(project.id);
          } else if (activeDev) {
            store.updateDevelopment(activeDev.id, project);
          }
        }}
      />
    </div>
  );
}
