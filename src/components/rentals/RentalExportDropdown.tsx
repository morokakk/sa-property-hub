'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, ChevronDown, BookOpen, FileText } from 'lucide-react';

interface RentalExportDropdownProps {
  id?: string;
  onExportCsv: () => void;
  onExportAccountantJournal: () => void;
  onExportItr12: () => void;
  className?: string;
}

export default function RentalExportDropdown({
  id,
  onExportCsv,
  onExportAccountantJournal,
  onExportItr12,
  className = '',
}: RentalExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  return (
    <div id={id} className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="rentals-export-csv-dropdown"
        data-testid="rentals-export-csv-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        title="Export rental portfolio to CSV, Accountant GL Journal, or SARS ITR12"
        className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Export CSV</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Export Rental Reports
          </div>

          {/* Option 1: Active Rentals Register CSV */}
          <button
            type="button"
            data-testid="export-rentals-register-csv"
            onClick={() => handleSelect(onExportCsv)}
            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">Rentals Register (.csv)</div>
              <div className="text-[10px] text-slate-500">
                Active units, leases, deposits, arrears & monthly net cashflow
              </div>
            </div>
          </button>

          {/* Option 2: Accountant GL Journal CSV */}
          <button
            type="button"
            data-testid="export-accountant-journal-csv"
            onClick={() => handleSelect(onExportAccountantJournal)}
            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded bg-amber-100 text-amber-700 mt-0.5 shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">Accountant GL Journal (.csv)</div>
              <div className="text-[10px] text-slate-500">
                Xero, QuickBooks & Sage balanced general ledger (tax-year-to-date)
              </div>
            </div>
          </button>

          {/* Option 3: SARS ITR12 Tax Report */}
          <button
            type="button"
            data-testid="export-sars-itr12"
            onClick={() => handleSelect(onExportItr12)}
            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded bg-indigo-100 text-indigo-700 mt-0.5 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">SARS ITR12 Tax Schedule (.xlsx)</div>
              <div className="text-[10px] text-slate-500">
                Section 11(a) local business rental income & allowable deductions
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
