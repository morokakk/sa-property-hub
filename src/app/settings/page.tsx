'use client';

import React, { useState, useRef } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  Settings,
  Building,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  FileText,
  Percent,
  Coins,
  Shield,
  Phone,
  Mail,
  MapPin,
  Globe,
  Info,
  Sparkles,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const updateInvestorProfile = usePortfolioStore((state) => state.updateInvestorProfile);
  const aiSettings = usePortfolioStore((state) => state.aiSettings);
  const updateAiSettings = usePortfolioStore((state) => state.updateAiSettings);

  // Form state initialized from Zustand
  const [entityName, setEntityName] = useState(investorProfile.entityName || '');
  const [tradingAs, setTradingAs] = useState(investorProfile.tradingAs || '');
  const [registrationOrId, setRegistrationOrId] = useState(investorProfile.registrationOrId || '');
  const [contactNumber, setContactNumber] = useState(investorProfile.contactNumber || '');
  const [email, setEmail] = useState(investorProfile.email || '');
  const [website, setWebsite] = useState(investorProfile.website || '');
  const [physicalAddress, setPhysicalAddress] = useState(investorProfile.physicalAddress || '');
  const [bioSummary, setBioSummary] = useState(investorProfile.bioSummary || '');
  const [logoBase64, setLogoBase64] = useState<string>(investorProfile.logoBase64 || '');

  // Default acquisition metrics
  const [defaultPrimeRate, setDefaultPrimeRate] = useState<number>(
    investorProfile.defaultPrimeRatePercent || 11.75
  );
  const [baselineHurdleYield, setBaselineHurdleYield] = useState<number>(
    investorProfile.baselineHurdleYieldPercent || 10.0
  );
  const [defaultCommission, setDefaultCommission] = useState<number>(
    investorProfile.defaultAgentCommissionPercent || 5.0
  );

  // Client-Side BYOK AI Settings
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'google'>(
    aiSettings?.provider || 'anthropic'
  );
  const [aiApiKey, setAiApiKey] = useState<string>(aiSettings?.apiKey || '');
  const [aiModel, setAiModel] = useState<string>(
    aiSettings?.model || 'claude-3-5-sonnet-20241022'
  );
  const [showApiKey, setShowApiKey] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Logo Upload as Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, or WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    updateInvestorProfile({
      entityName,
      tradingAs,
      registrationOrId,
      contactNumber,
      email,
      website,
      physicalAddress,
      logoBase64,
      bioSummary,
      defaultPrimeRatePercent: defaultPrimeRate,
      baselineHurdleYieldPercent: baselineHurdleYield,
      defaultAgentCommissionPercent: defaultCommission,
    });

    updateAiSettings({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Investor Profile & Settings"
        subtitle="Manage entity details, custom branding logo, and acquisition baseline parameters"
        actionButton={
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Profile & Settings
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Saved Toast Alert */}
        {savedSuccess && (
          <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between text-xs font-medium animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Investor profile and default metrics saved successfully! Pitch proposals will now reflect this branding.</span>
            </div>
            <Link
              href="/proposal"
              className="text-emerald-200 underline hover:text-white font-semibold"
            >
              View Updated Proposal Deck
            </Link>
          </div>
        )}

        <form onSubmit={handleSave} noValidate className="space-y-6">
          {/* Section 1: Entity & Contact Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Entity & Legal Representation</h2>
                <p className="text-xs text-slate-500">
                  Used across generated lender proposals, contracts, and confidentiality memorandums.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sole Proprietor / Legal Entity Name *
                </label>
                <input
                  type="text"
                  name="organization"
                  autoComplete="organization"
                  required
                  placeholder="e.g. L&M Property Investments (Pty) Ltd"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trading Name / Brand (Optional)
                </label>
                <input
                  type="text"
                  name="tradingAs"
                  autoComplete="organization"
                  placeholder="e.g. L&M Trading & Capital"
                  value={tradingAs}
                  onChange={(e) => setTradingAs(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  CIPC Company Reg / SA National ID *
                </label>
                <input
                  type="text"
                  name="cipcOrId"
                  autoComplete="off"
                  required
                  placeholder="e.g. 2022/498211/07 or 8501015021088"
                  value={registrationOrId}
                  onChange={(e) => setRegistrationOrId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  required
                  placeholder="e.g. +27 82 890 4321"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="e.g. invest@lmtrading.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Website / Investor Portal URL
                </label>
                <input
                  type="url"
                  name="url"
                  autoComplete="url"
                  placeholder="e.g. https://www.lmtrading.co.za"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical / Office Address (South Africa)
              </label>
              <input
                type="text"
                name="street-address"
                autoComplete="street-address"
                placeholder="e.g. Suite 402, The Boulevard Office Park, Searle St, Woodstock, Cape Town"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* Section 2: Logo Upload & Bio Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Custom Brand Logo & Investor Bio</h2>
                <p className="text-xs text-slate-500">
                  Brand your pitch decks and summarize your track record for private funders.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Logo Preview & Upload */}
              <div className="space-y-3">
                <label className="block font-semibold text-slate-700">Investor / Syndicate Logo</label>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50 min-h-[160px]">
                  {logoBase64 ? (
                    <div className="space-y-3 w-full flex flex-col items-center">
                      <div className="max-h-24 max-w-full p-2 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                        <img
                          src={logoBase64}
                          alt="Investor Logo Preview"
                          className="max-h-20 max-w-[180px] object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-rose-600 hover:text-rose-700 font-semibold text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                        <Building className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Upload PNG, JPG, or SVG (Max 2MB)
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-file-input"
                />

                <label
                  htmlFor="logo-file-input"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoBase64 ? 'Replace Logo' : 'Upload Logo File'}</span>
                </label>
              </div>

              {/* Bio Summary Text Area */}
              <div className="md:col-span-2 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Investor / Firm Background & Track Record Summary
                </label>
                <p className="text-[11px] text-slate-500">
                  This narrative is embedded dynamically in the Executive Opportunity section of pitch proposals.
                </p>
                <textarea
                  rows={6}
                  value={bioSummary}
                  onChange={(e) => setBioSummary(e.target.value)}
                  placeholder="Describe your property acquisition strategy, local geographic focus, prior exits, and risk mitigation methodologies..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Default Acquisition & Hurdle Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Default Financial & Acquisition Metrics</h2>
                <p className="text-xs text-slate-500">
                  Baseline assumptions auto-populated into the Opportunity Analyzer and Deal Evaluators.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  Default SA Prime Lending Rate
                </label>
                <p className="text-[10px] text-slate-400 mb-2">SARB baseline prime repo indicator</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="defaultPrimeRate"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={defaultPrimeRate}
                    onChange={(e) => setDefaultPrimeRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                  />
                  <span className="ml-1.5 font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  Baseline Investment Hurdle Yield
                </label>
                <p className="text-[10px] text-slate-400 mb-2">Minimum net yield required to greenlight</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="baselineHurdleYield"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={baselineHurdleYield}
                    onChange={(e) => setBaselineHurdleYield(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-700 bg-white"
                  />
                  <span className="ml-1.5 font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  Default Exit Agent Sales Commission
                </label>
                <p className="text-[10px] text-slate-400 mb-2">Standard estate agency exit percentage</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="defaultCommission"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={defaultCommission}
                    onChange={(e) => setDefaultCommission(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                  />
                  <span className="ml-1.5 font-bold text-slate-600">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: AI Integration (BYOK) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Integration & Statement Extraction (BYOK)</h3>
                  <p className="text-xs text-slate-500">
                    Bring Your Own Key to parse visual managing agent statements (iGrow, WeconnectU) directly from your browser.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-600" /> Client-Side Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'anthropic' | 'google')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="anthropic">Anthropic Claude (Messages API - Active)</option>
                  <option value="google" disabled>Google Gemini 1.5 Pro (Coming Soon)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Claude Sonnet 5 supports high-precision multi-page PDF & image ledger extractions.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Extraction Model</label>
                <select
                  value={
                    ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-4-6'].includes(aiModel)
                      ? aiModel
                      : 'custom'
                  }
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setAiModel(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="claude-sonnet-5">Claude Sonnet 5 (claude-sonnet-5 - Recommended)</option>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5 (claude-haiku-4-5 - Fast & Cost-Efficient)</option>
                  <option value="claude-opus-5">Claude Opus 5 (claude-opus-5 - Deep Reasoning)</option>
                  <option value="claude-fable-5-1">Claude Fable 5.1 (claude-fable-5-1 - Flagship)</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (claude-sonnet-4-6)</option>
                  <option value="custom">Custom Model Identifier...</option>
                </select>
                {!['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-4-6'].includes(aiModel) && (
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="Enter custom model identifier (e.g. claude-sonnet-5)"
                    className="mt-2 w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-800"
                  />
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces structured tool-use schema for forensic rental ledger extraction.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Anthropic API Key <span className="text-slate-400 font-normal">(Client-Side Only)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  name="aiApiKey"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg font-mono text-xs text-slate-800 bg-white placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">Direct Browser Processing Privacy Guarantee</span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  API keys and uploaded managing agent statements are processed entirely in your browser and communicated directly with Anthropic via browser CORS. Your credentials and financial documents are never stored or logged on an external application server.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/proposal"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              ← Go to Proposal Generator
            </Link>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Profile & Settings
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
