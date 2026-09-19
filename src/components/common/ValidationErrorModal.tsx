'use client';

import React from 'react';
import { AlertCircle, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ValidationErrorItem } from '@/lib/import/excelImport';

interface ValidationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  templateType: 'pipeline' | 'rentals' | 'flips';
  errors: ValidationErrorItem[];
}

export default function ValidationErrorModal({
  isOpen,
  onClose,
  fileName,
  templateType,
  errors,
}: ValidationErrorModalProps) {
  if (!isOpen) return null;

  const templateLabel =
    templateType === 'pipeline'
      ? 'Deal Pipeline (/analyzer)'
      : templateType === 'rentals'
      ? 'Rental Portfolio (/rentals)'
      : 'Buy-and-Flip (/flips)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-red-50/80 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Batch Import Rejected</span>
                <span className="text-xs bg-red-600 text-white font-semibold px-2 py-0.5 rounded-full">
                  {errors.length} {errors.length === 1 ? 'Error' : 'Errors'} Found
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                File: <span className="font-semibold text-slate-700">{fileName}</span> &bull; Template: {templateLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Table of Errors */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Atomic Validation Rule Enforced</p>
              <p className="text-amber-800 leading-relaxed">
                To protect your portfolio calculations from corrupt data, no properties were added.
                Please rectify the discrepancies listed below and re-upload your template.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 w-16 text-center">Row</th>
                  <th className="py-2.5 px-3 w-40">Column / Field</th>
                  <th className="py-2.5 px-3">Error Detail</th>
                  <th className="py-2.5 px-3 w-28">Value Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {errors.map((err, idx) => (
                  <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-red-600 bg-red-50/30">
                      {err.row}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {err.column}
                    </td>
                    <td className="py-2.5 px-3 text-red-700">
                      {err.message}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={err.value}>
                      {err.value !== undefined && err.value !== '' ? `"${err.value}"` : <span className="italic text-slate-300">&lt;empty&gt;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <span className="font-semibold text-slate-900 uppercase tracking-wider text-[10px] block">
              Quick Troubleshooting Tips:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong className="text-slate-800">Freehold Levies:</strong> Standalone houses do not pay body corporate levies (set levies to 0 or leave blank).</li>
              <li><strong className="text-slate-800">Numeric Values:</strong> Remove any currency symbols (R, ZAR) or spaces; enter purely numeric amounts.</li>
              <li><strong className="text-slate-800">Required Headers:</strong> Do not modify or delete column headers from the downloaded template.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            I Understand, Close
          </button>
        </div>
      </div>
    </div>
  );
}
