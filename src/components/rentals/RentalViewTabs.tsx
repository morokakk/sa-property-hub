'use client';

import React from 'react';
import { Building2, Archive, FileSpreadsheet, PlusCircle } from 'lucide-react';

export interface RentalViewTabsProps {
  id?: string;
  activeCount: number;
  soldCount?: number;
  archiveCount?: number;
  viewTab: 'active' | 'archive';
  onTabChange?: (tab: 'active' | 'archive') => void;
  onSelectTab?: (tab: 'active' | 'archive') => void;
  onOpenAddRental?: () => void;
  onExportCsv?: () => void;
  onExportItr12?: () => void;
}

export function RentalViewTabs({
  id = 'rentals-portfolio',
  activeCount,
  soldCount,
  archiveCount,
  viewTab,
  onTabChange,
  onSelectTab,
  onOpenAddRental,
  onExportCsv,
  onExportItr12,
}: RentalViewTabsProps) {
  const effectiveArchiveCount = archiveCount ?? soldCount ?? 0;

  const handleTabChange = (tab: 'active' | 'archive') => {
    if (onTabChange) onTabChange(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Active vs Sold Archive Tab Toggle */}
      <div id={id} className="scroll-mt-20 flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md w-full sm:w-auto">
        <button
          type="button"
          onClick={() => handleTabChange('active')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewTab === 'active'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Active Portfolio ({activeCount})</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('archive')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewTab === 'archive'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-indigo-600" />
          <span>Sold Archive ({effectiveArchiveCount})</span>
        </button>
      </div>

      {(onExportCsv || onExportItr12 || onOpenAddRental) && (
        <div className="flex items-center gap-2">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              title="Download active rentals register as CSV"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          )}
          {onExportItr12 && (
            <button
              onClick={onExportItr12}
              title="Download official SARS ITR12 Rental Tax Schedule as Excel"
              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span>SARS ITR12 Export</span>
            </button>
          )}
          {onOpenAddRental && (
            <button
              onClick={onOpenAddRental}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Rental Property</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RentalViewTabs;
