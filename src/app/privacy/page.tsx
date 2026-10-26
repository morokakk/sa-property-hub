'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Printer,
  Database,
  Key,
  UserCheck,
  Lock,
  Building2,
  Mail,
  Globe,
  MapPin,
  FileText,
  Scale,
  ExternalLink,
  Server,
  Cookie,
  Clock,
  Shield,
  UserX,
  Download,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

const LEGAL_ENTITY = 'Moremela Properties (Pty) Ltd';
const CIPC_REG_NUMBER = '2026/838397/07';
const PLATFORM_DOMAIN = 'https://www.moremelaproperties.co.za';
const CONTACT_EMAIL = 'morokakk@outlook.com';
const LAST_UPDATED = 'October 26, 2026';

const TOC_SECTIONS = [
  { id: 'section-1', number: '1', title: 'What Information Do We Collect?' },
  { id: 'section-2', number: '2', title: 'How Do We Process Your Information?' },
  { id: 'section-3', number: '3', title: 'When and With Whom Do We Share Your Personal Information?' },
  { id: 'section-4', number: '4', title: 'Do We Use Cookies and Local Storage Technologies?' },
  { id: 'section-5', number: '5', title: 'How Long Do We Keep Your Information?' },
  { id: 'section-6', number: '6', title: 'How Do We Keep Your Information Safe?' },
  { id: 'section-7', number: '7', title: 'Do We Collect Information From Minors?' },
  { id: 'section-8', number: '8', title: 'What Are Your Privacy Rights & Account Termination?' },
  { id: 'section-9', number: '9', title: 'Controls for Do-Not-Track Features' },
  { id: 'section-10', number: '10', title: 'Specific Privacy Rights & Cross-Border Transfers (POPIA)' },
  { id: 'section-11', number: '11', title: 'Do We Make Updates to This Notice?' },
  { id: 'section-12', number: '12', title: 'How Can You Contact Us About This Notice?' },
];

export default function PrivacyNoticePage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 print:bg-white print:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER (Deep Institutional Navy #0B132B + Emerald #10B981)        */}
      {/* ========================================================================= */}
      <header className="bg-[#0B132B] text-white border-b border-slate-800 print:bg-white print:text-slate-950 print:border-slate-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
          {/* Action Bar (print:hidden) */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link
              href="/"
              data-testid="privacy-back-to-workspace"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#10B981]" />
              <span>← Back to Workspace</span>
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              data-testid="privacy-print-btn"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-950 bg-[#10B981] hover:bg-emerald-400 px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {/* Institutional Badge, Title & Subtitle */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-[#10B981] border border-[#10B981]/40 print:bg-emerald-50 print:text-emerald-900 print:border-emerald-300">
              <span>🛡️ POPIA &amp; Statutory Compliance Framework</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white print:text-slate-950">
              Privacy Notice &amp; Legal Disclaimers
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium print:text-slate-600">
              {LEGAL_ENTITY} (Reg. No: {CIPC_REG_NUMBER}) • Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT CONTAINER                                                 */}
      {/* ========================================================================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Prominent POC Pilot & FAIS / SARS Financial Calculation Disclaimer Banner */}
        <section
          data-testid="poc-legal-disclaimer"
          aria-label="Proof of Concept and Financial Estimate Disclaimer"
          className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 sm:p-6 shadow-xs space-y-4 text-slate-800 print:border-slate-400 print:bg-white"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                ⚠️ Proof of Concept (POC) Pilot &amp; Financial / Statutory Estimate Disclaimer
              </h2>
              <p className="text-xs font-semibold text-amber-900">
                Mandatory Statutory Disclosure — South African Real Estate Underwriting &amp; Portfolio Hub
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-200/80 text-xs leading-relaxed">
            <div className="bg-white/90 rounded-xl p-4 border border-amber-200/90 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Clause 1: POC Pilot Status</span>
              </div>
              <p className="text-slate-700">
                <span className="font-mono font-semibold text-slate-900">www.moremelaproperties.co.za</span> is
                currently operating in an Early-Access Proof of Concept (POC) pilot phase. While cloud synchronization
                is protected by enterprise row-level security, pilot participants are encouraged to periodically export
                local JSON/Excel portfolio backups via the{' '}
                <Link href="/settings" className="text-emerald-700 hover:underline font-semibold">
                  Settings workspace
                </Link>
                .
              </p>
            </div>

            <div className="bg-white/90 rounded-xl p-4 border border-amber-200/90 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Clause 2: No Financial, Tax, or Legal Advice — FAIS &amp; SARS Disclaimer</span>
              </div>
              <p className="text-slate-700">
                All mathematical outputs—including progressive SARS Transfer Duty brackets, Section 13sex building
                allowances, Legal Practice Council (LPC) conveyancing and bond registration tariff scales, Section 118
                municipal clearance estimates, Inclining Block Tariff (IBT) utility dispute calculations, and PIE Act
                eviction reserves—are automated underwriting approximations provided strictly for informational and
                modeling purposes.{' '}
                <strong className="font-bold text-slate-900">
                  {LEGAL_ENTITY} (Reg. No: {CIPC_REG_NUMBER})
                </strong>{' '}
                is a technology software provider, not a registered Financial Services Provider (FSP) under the FAIS
                Act, a registered SARS tax practitioner, or a practicing conveyancing attorney. Always verify final
                figures with your appointed conveyancer, tax practitioner, or bond originator before signing an Offer to
                Purchase (OTP) or lodging a municipal dispute.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. EXECUTIVE SUMMARY STRIP (4 PRIVACY PILLARS)                            */}
        {/* ========================================================================= */}
        <section aria-label="Four Privacy Pillars" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Executive Summary — 4 Privacy &amp; Security Pillars
            </h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              POPIA Act 4 of 2013 Aligned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">1. Local-First by Default</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculators and portfolio data remain in browser <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">localStorage</code> (
                <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">sa_property_portfolio_hub_v1</code>) until you explicitly opt in to Cloud Sync.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">2. Zero Cloud Storage of AI Keys</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bring-Your-Own-Key (BYOK) credentials (Anthropic/Gemini) stay in local browser memory and are stripped (
                <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">apiKey: &apos;&apos;</code>) prior to cloud synchronization.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">3. POPIA Operator Safeguards</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tenant vetting scorecards, net salary verifications, and guarantor contacts are strictly redacted from
                public <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">/statement/[token]</code> routes, and tenant names are masked by default on{' '}
                <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">/proposal</code>.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">4. RLS Database Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cloud records in Supabase (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">eu-central-1</code>) are strictly isolated per account via PostgreSQL
                Row-Level Security (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">auth.uid() = user_id</code>).
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. QUICK-JUMP TABLE OF CONTENTS (Print-Hidden)                            */}
        {/* ========================================================================= */}
        <nav
          aria-label="Privacy Notice Table of Contents"
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 print:hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Statutory Sections Index (Quick Jump)</span>
            </span>
            <span className="text-[11px] text-slate-400">12 Consolidated Clauses</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {TOC_SECTIONS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/70 transition-colors font-medium"
              >
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                  {item.number}
                </span>
                <span className="truncate">{item.title}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* 5. INTRODUCTORY BLOCK & 12 CONSOLIDATED PRIVACY NOTICE SECTIONS           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed">
          {/* Introductory Block */}
          <section className="space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Official Privacy Notice — {LEGAL_ENTITY}
            </h2>
            <p className="text-slate-700">
              This Privacy Notice for <strong className="text-slate-900">{LEGAL_ENTITY}</strong> (Registration No:{' '}
              <strong className="font-mono text-slate-900">{CIPC_REG_NUMBER}</strong>) (doing business as{' '}
              <strong className="text-slate-900">Moremela Properties</strong>) describes how and why we might access,
              collect, store, use, and/or share (&quot;process&quot;) your personal information when you use our services
              across{' '}
              <a
                href={PLATFORM_DOMAIN}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline font-semibold"
              >
                {PLATFORM_DOMAIN}
              </a>{' '}
              (and any linked Vercel deployment domain), public Tenant Statement links (
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/statement/[token]</code>), and
              related investor or tenant support channels.
            </p>
            <p className="text-slate-700">
              Reading this Privacy Notice will help you understand your privacy rights and choices under the South
              African <strong>Protection of Personal Information Act, No. 4 of 2013 (POPIA)</strong>. If you do not
              agree with our policies and practices, please do not synchronize sensitive personal records to the cloud.
              If you still have any questions or concerns, please contact our Information Officer at{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-emerald-700 hover:underline font-semibold font-mono"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          {/* SECTION 1 */}
          <section id="section-1" className="scroll-mt-6 space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              1. What Information Do We Collect?
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900">
                  1A. Local-First Storage vs. Opt-In Cloud Synchronization
                </h3>
                <p className="text-slate-700">
                  By default, Moremela Property Hub operates on a <strong>Local-First architecture</strong>. When you
                  use the Opportunity Analyzer, Buy-and-Flip Manager, Rental Portfolio, or Proposal Generator without
                  signing in, all portfolio inputs remain strictly inside your local browser storage (
                  <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    sa_property_portfolio_hub_v1
                  </code>
                  ). We only collect and persist your portfolio data on our cloud servers when you explicitly create an
                  account or sign in (via email/password or optional <strong>Google OAuth 2.0 Single Sign-On</strong>,
                  which shares only your basic OpenID Connect identity scopes: <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">openid</code>,{' '}
                  <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">email</code>, and{' '}
                  <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">profile</code>) and click{' '}
                  <strong>Sync Local Data to Cloud</strong> in the Settings workspace.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900">
                  1B. Personal Information You Disclose to Us (Landlords &amp; Property Entrepreneurs)
                </h3>
                <p className="text-slate-700">
                  When you register for Cloud Sync or configure your Investor Profile, we collect personal and entity
                  information that you voluntarily provide to us, including:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>
                    <strong>Identity &amp; Contact Data:</strong> Legal entity name, trading name, CIPC registration or
                    South African National ID number, email address, phone number, website, and physical office address.
                  </li>
                  <li>
                    <strong>Property Underwriting &amp; Financial Metrics:</strong> Property addresses, purchase prices,
                    bond balances, interest rates, 10-trade Bill of Quantities (BOQ) renovation budgets, municipal
                    account/meter numbers, and SARS tax entity elections.
                  </li>
                  <li>
                    <strong>Landlord Remittance &amp; Banking Details:</strong> Bank name, account holder, account
                    number, branch clearing code, SWIFT code, and custom remittance instructions used to populate
                    official tenant statements and municipal dispute notices.
                  </li>
                  <li>
                    <strong>External Cloud Vault URLs:</strong> Optional links to external Google Drive, Dropbox, or
                    OneDrive inspection photo folders or FICA document vaults.{' '}
                    <strong>
                      We strictly store only the text URL string and never ingest, scrape, or host the underlying
                      external files on our servers.
                    </strong>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900">
                  1C. Bring Your Own Key (BYOK) AI Credentials
                </h3>
                <p className="text-slate-700">
                  If you use our AI Statement Extraction tool, you may configure a personal Anthropic (Claude) or Google
                  (Gemini) API key. Your API key is stored <strong>strictly in local browser memory</strong> and is
                  automatically stripped (<code className="font-mono text-xs bg-white px-1 py-0.5 rounded">apiKey: &apos;&apos;</code>)
                  before any portfolio state is uploaded to our cloud database.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900">
                  1D. No Platform Payment Processing or Card Storage
                </h3>
                <p className="text-slate-700">
                  Moremela Property Hub operates as a free-to-test Proof of Concept (POC) pilot and{' '}
                  <strong>does not process platform subscription payments, credit cards, debit cards, or debit orders</strong>.
                  Any landlord banking details configured in the Settings workspace are used strictly to display direct
                  Electronic Funds Transfer (EFT) remittance instructions on tenant statements and municipal dispute
                  letters—no funds or rental payments ever pass through Moremela Properties (Pty) Ltd.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <h3 className="font-bold text-emerald-950">
                  1E. Data Processing Roles (POPIA Compliance — Tenant, Guarantor &amp; Supplier Data)
                </h3>
                <p className="text-slate-700">
                  In terms of the Protection of Personal Information Act (POPIA), when a landlord or property manager
                  inputs tenant names, lease agreements, utility consumption records, guarantor details, or contractor
                  contacts into the platform:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>
                    The <strong>Landlord / Property Investor</strong> acts as the{' '}
                    <strong>&quot;Responsible Party&quot;</strong> (Section 1 of POPIA) who determines the purpose of
                    and means for processing tenant and contractor personal information.
                  </li>
                  <li>
                    <strong>{LEGAL_ENTITY}</strong> acts strictly as an <strong>&quot;Operator&quot;</strong> (Sections
                    20 and 21 of POPIA), processing such information only on the Responsible Party&apos;s behalf and
                    under strict technical safeguards.
                  </li>
                  <li>
                    <strong>Public Route Redaction:</strong> Publicly shareable tenant statement portals (
                    <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">/statement/[token]</code>) strictly
                    redact internal tenant vetting scorecards, net salary verifications, credit bureau notes, and
                    internal guarantor contact notes. Furthermore, the Proposal Generator (
                    <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">/proposal</code>) masks tenant
                    identities by default (<code className="font-mono text-xs bg-white px-1 py-0.5 rounded">Tenant A</code>,{' '}
                    <code className="font-mono text-xs bg-white px-1 py-0.5 rounded">Tenant B</code>) when generating
                    lender pitch decks.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-slate-900">
                  1F. Product Analytics, Telemetry &amp; Masked Session Diagnostics (PostHog)
                </h3>
                <p className="text-slate-700">
                  To improve platform reliability, calculator usability, and mobile responsiveness during the POC pilot,
                  we may collect technical usage telemetry and diagnostic session replays via{' '}
                  <strong>PostHog (EU Cloud)</strong>, including page views, feature interaction events, browser/viewport
                  dimensions, and error logs.{' '}
                  <strong>
                    Strict Client-Side PII &amp; Financial Masking: All form inputs, financial underwriting figures,
                    tenant names, contact numbers, landlord banking details, and BYOK API keys are strictly masked and
                    redacted client-side (<code className="font-mono text-xs bg-white px-1 py-0.5 rounded">maskAllInputs: true</code>)
                    before any telemetry or diagnostic event leaves your browser.
                  </strong>
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="section-2" className="scroll-mt-6 space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              2. How Do We Process Your Information?
            </h2>
            <p className="text-slate-700">
              We process your personal information for the following legitimate operational and statutory purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Account Creation &amp; Multi-Device Synchronization:</strong> To authenticate your identity via
                Supabase Auth and synchronize your encrypted portfolio across desktop and mobile devices.
              </li>
              <li>
                <strong>Underwriting, BOQ, Statement &amp; Dispute PDF Generation:</strong> To compute South African
                real estate underwriting metrics, track 10-trade renovation budgets, generate monthly tenant tax
                invoices/statements, and compile formal municipal utility dispute letters.
              </li>
              <li>
                <strong>Opt-In BYOK AI Document Parsing:</strong> To facilitate structured OCR extraction of municipal
                bills (e.g., City of Johannesburg, City of Tshwane, Ekurhuleni, eThekwini, City of Cape Town) and
                managing agent statements (e.g., iGrow, WeconnectU, Trafalgar) using your personal API key.
              </li>
              <li>
                <strong>Platform Security, IP Rate-Limiting &amp; Magic-Byte Validation:</strong> To protect server
                actions against brute-force abuse via per-IP sliding-window rate limiting and to verify that uploaded
                statement attachments contain authentic <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">%PDF-</code> magic bytes.
              </li>
              <li>
                <strong>Product Stability &amp; Masked UX Diagnostics:</strong> To diagnose UI bottlenecks, calculation
                errors, and feature adoption using input-masked PostHog product telemetry without profiling individual
                tenants or exposing private portfolio values.
              </li>
            </ul>
          </section>

          {/* SECTION 3 */}
          <section id="section-3" className="scroll-mt-6 space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              3. When and With Whom Do We Share Your Personal Information?
            </h2>
            <p className="text-slate-700">
              We do not sell, rent, or trade your personal or portfolio data to third-party data brokers or marketing
              agencies. We only share data with essential infrastructure sub-processors required to deliver the
              platform:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Cloud Web Hosting &amp; Edge Infrastructure
                </span>
                <span className="font-bold text-slate-900">Vercel</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Hosts the Next.js application and executes serverless API routes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Cloud Database &amp; RLS Persistence
                </span>
                <span className="font-bold text-slate-900">Supabase (eu-central-1)</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  PostgreSQL cloud database with strict per-user Row-Level Security isolation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  User Account Registration &amp; Authentication
                </span>
                <span className="font-bold text-slate-900">Supabase Auth &amp; Google OAuth 2.0</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Manages encrypted password hashing, optional Google OAuth 2.0 single sign-on, JWT sessions, and
                  password recovery flows.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Transactional Email Delivery
                </span>
                <span className="font-bold text-slate-900">Resend</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Dispatches landlord-initiated monthly tenant statement emails and PDF attachments.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  AI Document Parsing (Opt-In BYOK)
                </span>
                <span className="font-bold text-slate-900">Anthropic (Claude API) &amp; Google (Gemini API)</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Processes uploaded utility/rental statements only when invoked with your own API key.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Product Analytics &amp; Masked Diagnostics
                </span>
                <span className="font-bold text-slate-900">PostHog (EU Cloud — eu.i.posthog.com)</span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Provides privacy-first product usage analytics and input-masked UX diagnostics.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="section-4" className="scroll-mt-6 space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              4. Do We Use Cookies and Local Storage Technologies?
            </h2>
            <p className="text-slate-700">
              We do not use invasive third-party advertising pixels or cross-site marketing cookies. Our platform relies
              strictly on essential browser storage and first-party product telemetry mechanisms:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Browser Local Storage (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">sa_property_portfolio_hub_v1</code>):</strong>{' '}
                Persists your Zustand portfolio state, calculator drafts, and onboarding checklist progress locally in
                your browser for instant offline-capable responsiveness.
              </li>
              <li>
                <strong>Supabase Auth Session Storage (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">sb-*-auth-token</code>):</strong>{' '}
                Stores your encrypted JWT authentication session in browser <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">localStorage</code> when you sign in to
                Cloud Sync via the Settings workspace.
              </li>
              <li>
                <strong>PostHog Product Telemetry Identifiers:</strong> Where PostHog analytics is active, it uses
                first-party browser storage/cookies (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">ph_*</code>) or in-memory session identifiers strictly to
                measure feature stability and masked UX diagnostics—never for cross-site advertising.
              </li>
              <li>
                <strong>Automatic Sign-Out Purge:</strong> When you click <strong>Sign Out</strong> in the Settings
                workspace, the application automatically terminates your Supabase Auth session, resets telemetry
                session state, purges cloud sync timestamps, and resets the local workspace to default South African
                demo data so no private records remain exposed on shared computers.
              </li>
            </ul>
          </section>

          {/* SECTION 5 */}
          <section id="section-5" className="scroll-mt-6 space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              5. How Long Do We Keep Your Information?
            </h2>
            <p className="text-slate-700">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this
              Privacy Notice, unless a longer retention period is required or permitted by South African law:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Local-Only Users:</strong> Data stays in your browser until you clear your browser cache or
                click <strong>Clear All Portfolio Data</strong>. We hold zero server-side copies.
              </li>
              <li>
                <strong>Cloud-Synced Users:</strong> Your cloud portfolio records are retained for the duration of your
                active account.
              </li>
              <li>
                <strong>Statutory SARS Tax &amp; Accounting Retention:</strong> Where landlord-generated tenant
                statements or statutory compliance records are stored in Cloud Sync, records may be retained for up to
                five (5) years in accordance with the South African Tax Administration Act, No. 28 of 2011 and the
                Companies Act, No. 71 of 2008.
              </li>
            </ul>
          </section>

          {/* SECTION 6 */}
          <section id="section-6" className="scroll-mt-6 space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              6. How Do We Keep Your Information Safe?
            </h2>
            <p className="text-slate-700">
              In compliance with Section 19 of POPIA (Security Measures on Integrity and Confidentiality of Personal
              Information), we have implemented multi-layered organizational and technical safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>PostgreSQL Row-Level Security (RLS):</strong> Every cloud table enforces{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">auth.uid() = user_id</code>{' '}
                policies at the database engine layer, ensuring no user can query or mutate another investor&apos;s
                records.
              </li>
              <li>
                <strong>Unguessable 128-Bit Statement Tokens:</strong> Public tenant statements are protected by
                cryptographically random 128-bit UUID capability tokens (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">statementToken</code>) and served with{' '}
                <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">noindex, nofollow</code> robot meta
                directives to prevent search engine indexing.
              </li>
              <li>
                <strong>BYOK Key Stripping:</strong> Client-side sanitization guarantees AI API keys are stripped before
                any database upsert.
              </li>
              <li>
                <strong>HTML Email Escaping &amp; PDF Magic-Byte Verification:</strong> Outbound statement emails
                sanitize all dynamic strings against HTML/XSS injection and verify that attached buffers start with the{' '}
                <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">%PDF-</code> header.
              </li>
            </ul>
          </section>

          {/* SECTION 7 */}
          <section id="section-7" className="scroll-mt-6 space-y-2 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              7. Do We Collect Information From Minors?
            </h2>
            <p className="text-slate-700">
              Our platform is designed exclusively for adult real estate investors, landlords, and property
              professionals aged <strong>18 years and older</strong>. In accordance with Sections 34 and 35 of POPIA, we
              do not knowingly solicit data from or market to children under 18 years of age. If we learn that personal
              information from a minor has been uploaded without competent parental/guardian consent, we will promptly
              delete such data.
            </p>
          </section>

          {/* SECTION 8 */}
          <section id="section-8" className="scroll-mt-6 space-y-3 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              8. What Are Your Privacy Rights &amp; Account Termination (Soft Delete &amp; Portability Policy)?
            </h2>
            <p className="text-slate-700">
              Under POPIA (Sections 23–25), you have the right to request access to, correction of, or deletion of your
              personal information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Self-Service Data Portability (JSON / CSV / Excel):</strong> At any time, you can export your
                complete portfolio state—including properties, leases, flips, BOQ line items, funding sources, and SARS
                general ledger journals—to open <strong>JSON</strong>, <strong>CSV</strong>, or multi-sheet{' '}
                <strong>Excel (.xlsx)</strong> formats via the Sidebar or{' '}
                <Link href="/settings" className="text-emerald-700 hover:underline font-semibold">
                  /settings
                </Link>{' '}
                workspace.
              </li>
              <li>
                <strong>Account Termination &amp; Deletion Requests:</strong> You may request full termination and
                deletion of your cloud-synced account by emailing our Information Officer at{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-emerald-700 hover:underline font-semibold font-mono"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </li>
              <li>
                <strong>Compliance &amp; Fraud Prevention Retention:</strong> Upon receiving a verified termination
                request, we will deactivate and purge your active cloud portfolio records, retaining only minimal
                audit/opt-out logs where strictly required to prevent fraud, resolve disputes, or comply with South
                African statutory tax obligations.
              </li>
            </ul>
          </section>

          {/* SECTION 9 */}
          <section id="section-9" className="scroll-mt-6 space-y-2 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              9. Controls for Do-Not-Track Features
            </h2>
            <p className="text-slate-700">
              Most web browsers and mobile operating systems include a Do-Not-Track (&quot;DNT&quot;) or Global Privacy
              Control (&quot;GPC&quot;) setting you can activate to signal your privacy preference. We do not deploy
              third-party behavioral advertising trackers or cross-site profiling scripts, and our first-party PostHog
              telemetry configuration is designed to respect browser DNT/opt-out preferences while masking all sensitive
              financial and personal inputs.
            </p>
          </section>

          {/* SECTION 10 */}
          <section id="section-10" className="scroll-mt-6 space-y-4 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              10. Specific Privacy Rights &amp; Cross-Border Transfers (Republic of South Africa — POPIA)
            </h2>

            <div className="p-4 rounded-xl bg-sky-50/80 border border-sky-200 space-y-2">
              <h3 className="font-bold text-sky-950">
                POPIA Section 72 Cross-Border Transfer Disclosure
              </h3>
              <p className="text-slate-700">
                In accordance with <strong>Section 72 of the Protection of Personal Information Act (POPIA)</strong>,
                please be advised that when you explicitly opt in to <strong>Cloud Sync</strong> or when input-masked
                product telemetry is processed, data is transmitted to and stored on{' '}
                <strong>Supabase cloud database infrastructure</strong> and{' '}
                <strong>PostHog EU Cloud (<code className="font-mono text-xs">eu.i.posthog.com</code>)</strong> located
                in <strong>Frankfurt, Germany (<code className="font-mono text-xs">eu-central-1</code>)</strong>.
                Germany is a member state of the European Union and is subject to the{' '}
                <strong>EU General Data Protection Regulation (GDPR)</strong>, which provides an adequate level of
                statutory data protection substantially similar to, or stricter than, the conditions for the lawful
                processing of personal information under POPIA.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900">
                Information Regulator (South Africa) — Statutory Escalation Channel
              </h3>
              <p className="text-slate-700">
                If you believe we are unlawfully processing your personal information, we encourage you to contact our
                Information Officer first at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 hover:underline font-semibold font-mono">
                  {CONTACT_EMAIL}
                </a>
                . You also have the statutory right to lodge a complaint directly with the{' '}
                <strong>Information Regulator (South Africa)</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>
                  <strong>Website:</strong>{' '}
                  <a
                    href="https://inforegulator.org.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>https://inforegulator.org.za</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <strong>General Enquiries:</strong>{' '}
                  <a
                    href="mailto:enquiries@inforegulator.org.za"
                    className="text-emerald-700 hover:underline font-semibold font-mono"
                  >
                    enquiries@inforegulator.org.za
                  </a>
                </li>
                <li>
                  <strong>POPIA Complaints:</strong>{' '}
                  <a
                    href="mailto:POPIAComplaints@inforegulator.org.za"
                    className="text-emerald-700 hover:underline font-semibold font-mono"
                  >
                    POPIAComplaints@inforegulator.org.za
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 11 */}
          <section id="section-11" className="scroll-mt-6 space-y-2 pb-6 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              11. Do We Make Updates to This Notice?
            </h2>
            <p className="text-slate-700">
              We may update this Privacy Notice from time to time to reflect changes to our operational practices,
              South African tax/property legislation, or POPIA regulatory guidance. The updated version will be
              indicated by an updated <strong>&quot;Last updated&quot;</strong> date at the top of this page and will be
              effective as soon as it is accessible.
            </p>
          </section>

          {/* SECTION 12 */}
          <section id="section-12" className="scroll-mt-6 space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              12. How Can You Contact Us About This Notice?
            </h2>
            <p className="text-slate-700">
              If you have questions, comments, or POPIA data subject requests regarding this Notice, you may contact our
              designated Information Officer using the official corporate details below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#0B132B] text-white border border-slate-800 print:bg-slate-50 print:text-slate-950 print:border-slate-300">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Legal Entity</span>
                </span>
                <p className="font-bold text-sm">{LEGAL_ENTITY}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>CIPC Registration Number</span>
                </span>
                <p className="font-mono font-bold text-sm text-[#10B981] print:text-emerald-800">{CIPC_REG_NUMBER}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Information Officer Email</span>
                </span>
                <p className="font-mono font-semibold text-sm">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-[#10B981]">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Website</span>
                </span>
                <p className="font-mono font-semibold text-sm">
                  <a
                    href={PLATFORM_DOMAIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#10B981]"
                  >
                    {PLATFORM_DOMAIN}
                  </a>
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 print:text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Jurisdiction</span>
                </span>
                <p className="font-semibold text-sm">Gauteng, Republic of South Africa</p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Print & Return Footer */}
        <footer className="pt-2 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-200">
          <div>
            © {new Date().getFullYear()} <strong className="text-slate-700">{LEGAL_ENTITY}</strong> (Reg. No:{' '}
            {CIPC_REG_NUMBER}) • All Rights Reserved.
          </div>
          <div className="flex items-center gap-4 print:hidden">
            <Link href="/settings" className="text-slate-600 hover:text-slate-900 font-semibold">
              Investor Profile &amp; Settings
            </Link>
            <span>•</span>
            <Link href="/" className="text-emerald-700 hover:text-emerald-800 font-semibold">
              Return to Portfolio Dashboard ➔
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
