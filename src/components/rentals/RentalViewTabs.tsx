'use client';

import React from 'react';
import { Building2, Archive, FileSpreadsheet, Plus, Search, LayoutGrid, List, X } from 'lucide-react';

export interface RentalViewTabsProps {
  id?: string;
  activeCount: number;
  soldCount?: number;
  archiveCount?: number;
  viewTab: 'active' | 'archive';
  onTabChange?: (tab: 'active' | 'archive') => void;
  onSelectTab?: (tab: 'active' | 'archive') => void;
  viewMode?: 'cards' | 'ledger';
  onViewModeChange?: (mode: 'cards' | 'ledger') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
  viewMode = 'cards',
  onViewModeChange,
  searchQuery = '',
  onSearchChange,
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
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      {/* Active vs Sold Archive Tab Toggle */}
      <div id={id} className="scroll-mt-20 flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md w-full lg:w-auto shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('active')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
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
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
            viewTab === 'archive'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-indigo-600" />
          <span>Sold Archive ({effectiveArchiveCount})</span>
        </button>
      </div>

      {(onSearchChange || onViewModeChange) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:justify-end flex-1">
          {onSearchChange && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                data-testid="rentals-search-input"
                aria-label="Search rental properties"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search suburb, address, property, or tenant..."
                className="w-full text-xs pl-8 pr-8 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear rental search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {onViewModeChange && (
            <div
              role="group"
              aria-label="Rental portfolio view mode"
              className="bg-slate-100 p-1 rounded-xl inline-flex items-center shrink-0 self-start sm:self-auto"
            >
              <button
                type="button"
                data-testid="rentals-view-cards"
                aria-pressed={viewMode === 'cards'}
                onClick={() => onViewModeChange('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                data-testid="rentals-view-ledger"
                aria-pressed={viewMode === 'ledger'}
                onClick={() => onViewModeChange('ledger')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'ledger'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
            </div>
          )}
        </div>
      )}

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
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rental Property</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RentalViewTabs;
