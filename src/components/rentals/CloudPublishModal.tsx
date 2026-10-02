'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Cloud, ShieldCheck, Share2, LogIn, X, Info } from 'lucide-react';

export interface CloudPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyWhatsApp: () => void;
}

export default function CloudPublishModal({
  isOpen,
  onClose,
  onCopyWhatsApp,
}: CloudPublishModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-publish-modal-title"
      data-testid="cloud-publish-modal"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 p-5 sm:p-6 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 text-sky-200 shrink-0 shadow-inner">
              <div className="relative">
                <Cloud className="w-6 h-6 text-sky-200" />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-1 -right-1" />
              </div>
            </div>
            <div>
              <h2
                id="cloud-publish-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight text-white"
              >
                Cloud Sync Required to Share Online
              </h2>
              <p className="text-xs text-sky-200/90 mt-0.5">
                Public tenant statements require private cloud hosting
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-publish-modal-btn"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            Public tenant statement links are hosted securely in the cloud so tenants can view,
            verify, and download their official itemized statements directly on their phone or
            computer.
          </p>

          <p>
            Because this rental property was created locally in your browser (Local Storage mode), an
            authenticated account is needed to publish and host it online.
          </p>

          {/* Offline Fallback Callout */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-emerald-950">
                100% Offline WhatsApp Statements Available
              </span>
              <span>
                Don’t want to sign in right now? You can copy the full formatted text statement and send it directly via WhatsApp without creating an account.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
          <Link
            href="/settings?returnTo=rentals&action=publish_link"
            data-testid="sign-in-to-publish-btn"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors text-xs sm:text-sm cursor-pointer text-center"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Create Account to Publish</span>
          </Link>

          <button
            type="button"
            data-testid="copy-whatsapp-statement-btn"
            onClick={onCopyWhatsApp}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors text-xs sm:text-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Copy WhatsApp Statement Instead</span>
          </button>

          <button
            type="button"
            data-testid="cancel-publish-modal-btn"
            onClick={onClose}
            className="w-full text-slate-500 hover:text-slate-800 font-medium py-2 text-xs transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
