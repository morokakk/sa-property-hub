'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileUp,
  Download,
  Upload,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  downloadPipelineTemplate,
  downloadRentalsTemplate,
  downloadFlipsTemplate,
  parseImportFile,
  ValidationErrorItem,
} from '@/lib/import/excelImport';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import ValidationErrorModal from './ValidationErrorModal';

interface ImportDropdownProps {
  type: 'pipeline' | 'rentals' | 'flips';
  className?: string;
  onImportSuccess?: () => void;
  onPdfSelected?: (files: File[]) => void;
}

export default function ImportDropdown({
  type,
  className = '',
  onImportSuccess,
  onPdfSelected,
}: ImportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; isWarning?: boolean } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const bulkAddOpportunities = usePortfolioStore((state) => state.bulkAddOpportunities);
  const bulkAddRentals = usePortfolioStore((state) => state.bulkAddRentals);
  const bulkAddFlips = usePortfolioStore((state) => state.bulkAddFlips);

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

  const showToast = (text: string, isWarning = false) => {
    setToastMessage({ text, isWarning });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleDownloadTemplate = () => {
    setIsOpen(false);
    try {
      if (type === 'pipeline') {
        downloadPipelineTemplate();
        showToast('Downloaded Deal Pipeline template (.xlsx).');
      } else if (type === 'rentals') {
        downloadRentalsTemplate();
        showToast('Downloaded Rental Portfolio template (.xlsx).');
      } else {
        downloadFlipsTemplate();
        showToast('Downloaded Buy-and-Flip template (.xlsx).');
      }
    } catch (err) {
      console.error('Template download error:', err);
      showToast('Failed to generate template workbook.', true);
    }
  };

  const handleTriggerUpload = () => {
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleTriggerPdfUpload = () => {
    setIsOpen(false);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
      pdfInputRef.current.click();
    }
  };

  const handlePdfSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    let filesToProcess = rawFiles;
    if (rawFiles.length > 3) {
      filesToProcess = rawFiles.slice(0, 3);
      const names = filesToProcess.map((f) => f.name).join(', ');
      showToast(`Batch limit: 3 files. Uploading the first 3: ${names}`, true);
    }

    onPdfSelected?.(filesToProcess);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessing(true);

    try {
      if (type === 'pipeline') {
        const result = await parseImportFile<any>(file, 'pipeline');
        if (!result.success) {
          setValidationErrors(result.errors);
          setErrorModalOpen(true);
        } else {
          const stats = bulkAddOpportunities(result.data);
          let msg = `Successfully imported ${stats.addedCount} deal opportunities!`;
          if (stats.duplicateCount > 0) {
            msg += ` (${stats.duplicateCount} duplicate deals updated)`;
          }
          if (result.warnings.length > 0) {
            msg += ` Note: ${result.warnings[0]}`;
          }
          showToast(msg);
          onImportSuccess?.();
        }
      } else if (type === 'rentals') {
        const result = await parseImportFile<any>(file, 'rentals');
        if (!result.success) {
          setValidationErrors(result.errors);
          setErrorModalOpen(true);
        } else {
          const stats = bulkAddRentals(result.data);
          let msg = `Successfully imported ${stats.addedCount} rental properties!`;
          if (stats.duplicateCount > 0) {
            msg += ` (${stats.duplicateCount} duplicate properties detected)`;
          }
          if (result.warnings.length > 0) {
            msg += ` Note: ${result.warnings[0]}`;
          }
          showToast(msg);
          onImportSuccess?.();
        }
      } else if (type === 'flips') {
        const result = await parseImportFile<any>(file, 'flips');
        if (!result.success) {
          setValidationErrors(result.errors);
          setErrorModalOpen(true);
        } else {
          const stats = bulkAddFlips(result.data);
          let msg = `Successfully imported ${stats.addedCount} flip projects!`;
          if (stats.duplicateCount > 0) {
            msg += ` (${stats.duplicateCount} duplicate projects detected)`;
          }
          if (result.warnings.length > 0) {
            msg += ` Note: ${result.warnings[0]}`;
          }
          showToast(msg);
          onImportSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setValidationErrors([
        {
          row: 1,
          column: 'File Parsing',
          message: err?.message || 'Could not parse the workbook file. Please ensure it is a valid .xlsx or .csv format.',
        },
      ]);
      setErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const moduleTitle =
    type === 'pipeline'
      ? 'Deal Pipeline'
      : type === 'rentals'
      ? 'Rental Portfolio'
      : 'Buy-and-Flip';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Hidden PDF File Input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handlePdfSelected}
      />

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isProcessing}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs hover:shadow-xs transition-all disabled:opacity-60 cursor-pointer"
        title={`Import ${moduleTitle} records via Excel or CSV`}
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
        ) : (
          <FileUp className="w-3.5 h-3.5 text-slate-600" />
        )}
        <span>{isProcessing ? 'Processing...' : 'Import'}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-68 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {moduleTitle} Batch Import
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">Download Template (.xlsx)</div>
              <div className="text-[10px] text-slate-500">
                Pre-formatted headers with realistic SA sample rows
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleTriggerUpload}
            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-950 flex items-start gap-2.5 transition-colors cursor-pointer"
          >
            <div className="p-1 rounded bg-indigo-100 text-indigo-700 mt-0.5 shrink-0">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">Upload Spreadsheet</div>
              <div className="text-[10px] text-slate-500">
                Accepts completed .xlsx, .xls, or .csv files
              </div>
            </div>
          </button>

          {(type === 'rentals' || type === 'flips') && (
            <button
              type="button"
              onClick={handleTriggerPdfUpload}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-950 flex items-start gap-2.5 transition-colors cursor-pointer border-t border-slate-100"
            >
              <div className="p-1 rounded bg-purple-100 text-purple-700 mt-0.5 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>Upload PDF Statement(s)</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-1 py-0.2 rounded">
                    Max 3
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {type === 'flips'
                    ? 'Auto-populates flip address, carrying costs & municipal valuation'
                    : 'Auto-detects CoJ, Eskom & iGrow bills (up to 3 PDFs at once)'}
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Validation Error Modal */}
      <ValidationErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        fileName={uploadedFileName}
        templateType={type}
        errors={validationErrors}
      />

      {/* Action Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.isWarning
              ? 'bg-amber-900 border-amber-700'
              : 'bg-slate-900 border-slate-700'
          }`}
        >
          {toastMessage.isWarning ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
