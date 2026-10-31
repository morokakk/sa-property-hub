'use client';

import React, { useState, useEffect, useId } from 'react';
import { usePathname } from 'next/navigation';
import {
  X,
  MessageSquarePlus,
  Bug,
  Sparkles,
  Calculator,
  Smile,
  Send,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackDiagnostics,
  FeedbackSubmissionResult,
  collectClientDiagnostics,
  submitFeedback,
  buildFeedbackWhatsAppUrl,
} from '@/lib/feedback/submitFeedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: FeedbackCategory;
  initialModuleRoute?: string;
}

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  placeholder: string;
}[] = [
  {
    id: 'bug',
    label: 'Bug / Issue',
    icon: Bug,
    description: 'Something is broken or behaving unexpectedly',
    placeholder: 'What happened, what did you expect, or which calculation looks incorrect?',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Sparkles,
    description: 'New workflow, export, or compliance idea',
    placeholder: 'What feature or South African workflow would help your property portfolio?',
  },
  {
    id: 'data_math',
    label: 'SA Tax / Math',
    icon: Calculator,
    description: 'SARS rates, LPC scale, municipal tariffs',
    placeholder: 'Which municipal tariff, transfer duty scale, or financial formula needs adjustment?',
  },
  {
    id: 'ux',
    label: 'General UX',
    icon: Smile,
    description: 'Speed, layout, mobile design feedback',
    placeholder: 'How can we make this workflow faster, smoother, or clearer?',
  },
];

const ROUTE_OPTIONS = [
  { value: '/', label: 'Overview Dashboard (/)' },
  { value: '/rentals', label: 'Rental Portfolio (/rentals)' },
  { value: '/analyzer', label: 'Opportunity Analyzer (/analyzer)' },
  { value: '/flips', label: 'Buy-and-Flip BoQ (/flips)' },
  { value: '/funding', label: 'Funding & Campaigns (/funding)' },
  { value: '/tasks', label: 'Tasks & Milestones (/tasks)' },
  { value: '/settings', label: 'Investor Profile & Settings (/settings)' },
  { value: '/statement', label: 'Tenant Statement Portal (/statement)' },
  { value: '/other', label: 'Other / General Platform' },
];

export default function FeedbackModal({
  isOpen,
  onClose,
  initialCategory = 'bug',
  initialModuleRoute,
}: FeedbackModalProps) {
  const currentPath = usePathname();
  const titleId = useId();
  const descId = useId();

  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [moduleRoute, setModuleRoute] = useState<string>(
    initialModuleRoute || currentPath || '/'
  );
  const [message, setMessage] = useState('');
  const [contactOptional, setContactOptional] = useState('');
  const [diagnostics, setDiagnostics] = useState<FeedbackDiagnostics | null>(null);
  const [showDiagnosticsDetails, setShowDiagnosticsDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FeedbackSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    onClose();
  };

  // Initialize diagnostics, route, category, and reset state on open
  useEffect(() => {
    if (isOpen) {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      setCategory(initialCategory);
      setDiagnostics(collectClientDiagnostics());
      setModuleRoute(initialModuleRoute || currentPath || '/');
      setIsSubmitted(false);
      setSubmissionResult(null);
      setErrorMessage(null);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [isOpen, initialCategory, initialModuleRoute, currentPath]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const activeCategoryConfig =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Please enter a feedback message before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const diag = diagnostics || collectClientDiagnostics();

    try {
      const result = await submitFeedback({
        category,
        moduleRoute,
        message: message.trim(),
        contactOptional: contactOptional.trim() || null,
        diagnostics: diag,
      });

      if (!result.success) {
        setErrorMessage(
          result.error ||
            'Failed to record feedback. Please try again or use the WhatsApp button below.'
        );
        return;
      }

      setSubmissionResult(result);
      setIsSubmitted(true);
      setMessage('');

      // Auto close after 2.5s on success
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!message.trim()) {
      setErrorMessage('Please enter a message to send via WhatsApp.');
      return;
    }
    const diag = diagnostics || collectClientDiagnostics();
    const url = buildFeedbackWhatsAppUrl({
      category,
      moduleRoute,
      message: message.trim(),
      contactOptional: contactOptional.trim() || null,
      diagnostics: diag,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 -z-10"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        data-testid="feedback-modal-container"
        className="bg-slate-900 border-t md:border border-slate-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] md:max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-bottom md:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-base font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span>Feedback &amp; Ideas</span>
                <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                  Beta
                </span>
              </h2>
              <p id={descId} className="text-xs text-slate-400 mt-0.5">
                Help improve South African property investing workflows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close feedback modal"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4">
          {isSubmitted ? (
            <div
              data-testid="feedback-success-state"
              className="py-8 text-center space-y-3 animate-in fade-in zoom-in-95"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your report has been logged to the feedback registry and alerted to the engineering team.
                {submissionResult?.emailDispatched && (
                  <span className="block mt-1 text-emerald-400 font-medium">
                    &bull; Transactional notification dispatched via Resend.
                  </span>
                )}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-xs'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold truncate leading-tight">
                            {cat.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module Route Dropdown */}
              <div>
                <label
                  htmlFor="feedback-module-route"
                  className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider"
                >
                  Module / Page
                </label>
                <select
                  id="feedback-module-route"
                  value={moduleRoute}
                  onChange={(e) => setModuleRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {ROUTE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  {!ROUTE_OPTIONS.some((o) => o.value === moduleRoute) && (
                    <option value={moduleRoute}>Custom: {moduleRoute}</option>
                  )}
                </select>
              </div>

              {/* Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="feedback-message-input"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Feedback Message <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {message.length} chars
                  </span>
                </div>
                <textarea
                  id="feedback-message-input"
                  data-testid="feedback-message-textarea"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={activeCategoryConfig.placeholder}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-y min-h-[90px]"
                />
              </div>

              {/* Optional Contact Input */}
              <div>
                <label
                  htmlFor="feedback-contact-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider"
                >
                  Contact Info <span className="text-slate-400 font-normal lowercase">(optional — for follow-up)</span>
                </label>
                <input
                  id="feedback-contact-input"
                  type="text"
                  value={contactOptional}
                  onChange={(e) => setContactOptional(e.target.value)}
                  placeholder="Email or WhatsApp number (e.g. 082 123 4567)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Compact Collapsible Diagnostics Pill */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsDetails(!showDiagnosticsDetails)}
                  className="w-full flex items-center justify-between text-left text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Auto Diagnostics Attached</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                      POPIA Safe
                    </span>
                  </span>
                  {showDiagnosticsDetails ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {showDiagnosticsDetails && diagnostics && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 font-mono text-[10px] text-slate-400 animate-in fade-in">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Viewport:</span>
                      <span className="text-slate-300">{diagnostics.viewport}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Storage:</span>
                      <span className="text-slate-300">{diagnostics.storageMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Demo State:</span>
                      <span className="text-slate-300">{diagnostics.demoStatus}</span>
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  data-testid="feedback-submit-button"
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={!message.trim()}
                  data-testid="feedback-whatsapp-button"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Open formatted feedback directly in WhatsApp"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
