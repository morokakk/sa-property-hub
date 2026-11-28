'use client';

import React from 'react';

export interface BottomSheetHandleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'light' | 'dark';
}

export default function BottomSheetHandle({
  tone = 'light',
  className = '',
  ...props
}: BottomSheetHandleProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="bottom-sheet-handle"
      {...props}
      className={`sm:hidden pt-2.5 pb-1.5 w-full flex justify-center touch-none select-none cursor-grab active:cursor-grabbing shrink-0 ${
        tone === 'dark' ? 'bg-slate-900' : ''
      } ${className}`.trim()}
    >
      <div
        className={`w-10 h-1.5 rounded-full ${
          tone === 'dark' ? 'bg-slate-600/80' : 'bg-slate-300/90'
        }`}
      />
    </div>
  );
}
