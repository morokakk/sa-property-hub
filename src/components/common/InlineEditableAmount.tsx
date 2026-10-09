'use client';

import React, { useState, useEffect } from 'react';
import { formatZAR } from '@/lib/formatters';
import { Edit3 } from 'lucide-react';

export interface InlineEditableAmountProps {
  valueZAR?: number;
  value?: number | null;
  onSave: (newAmount: number) => void;
  className?: string;
  isCurrency?: boolean;
  prefix?: string;
  disabled?: boolean;
  disabledLabel?: string;
  title?: string;
}

export function InlineEditableAmount({
  valueZAR,
  value,
  onSave,
  className,
  isCurrency = true,
  prefix = '- ',
  disabled = false,
  disabledLabel,
  title,
}: InlineEditableAmountProps) {
  const safeVal = valueZAR ?? value ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(safeVal.toString());

  useEffect(() => {
    setInputVal(safeVal.toString());
  }, [safeVal]);

  if (disabled) {
    return (
      <span className="text-slate-400 text-[11px]" title={disabledLabel}>
        {disabledLabel || 'R 0'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {isCurrency && <span className="text-slate-400 text-[11px] font-bold">R</span>}
        <input
          type="number"
          step="any"
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => {
            const num = Math.max(0, Number(inputVal) || 0);
            if (num !== safeVal) onSave(num);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = Math.max(0, Number(inputVal) || 0);
              if (num !== safeVal) onSave(num);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setInputVal(safeVal.toString());
              setIsEditing(false);
            }
          }}
          className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 shadow-2xs"
        />
      </div>
    );
  }

  const formattedAmount = isCurrency ? formatZAR(safeVal) : safeVal.toString();

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`group inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer ${
        className || 'text-slate-700 font-medium'
      }`}
      title={title || 'Click to edit amount inline (auto-saves on blur or Enter)'}
    >
      <span>
        {prefix}
        {formattedAmount}
      </span>
      <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default InlineEditableAmount;
