'use client';

import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TopHeader from '@/components/navigation/TopHeader';
import PublishLinkGuidanceBanner from '@/components/rentals/PublishLinkGuidanceBanner';
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
  Cloud,
  Database as DbIcon,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  UserCheck,
  UserPlus,
  Lock,
  ArrowLeft,
  Target,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { migrateToCloud, MigrationResult } from '@/lib/db/migrateToCloud';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';
import { SOUTH_AFRICAN_BANKS, ACCOUNT_TYPES } from '@/lib/constants/banks';
import {
  DEFAULT_ANTHROPIC_MODEL,
  SUPPORTED_ANTHROPIC_MODELS,
  normalizeAiModel,
} from '@/lib/ai/modelConfig';
import { formatZAR, formatPercent } from '@/lib/formatters';

type SettingsTab = 'entity' | 'underwriting' | 'ai';

function SettingsContent() {
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const returnToParam = searchParams.get('returnTo');

  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const updateInvestorProfile = usePortfolioStore((state) => state.updateInvestorProfile);
  const aiSettings = usePortfolioStore((state) => state.aiSettings);
  const updateAiSettings = usePortfolioStore((state) => state.updateAiSettings);
  const resetToDemoData = usePortfolioStore((state) => state.resetToDemoData);

  // Active Tab & View Mode State
  const [activeTab, setActiveTab] = useState<SettingsTab>('entity');
  const [showAllSections, setShowAllSections] = useState<boolean>(false);
  const [isAuthExpanded, setIsAuthExpanded] = useState<boolean>(false);

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
  const [bankName, setBankName] = useState(investorProfile.bankName || '');
  const [accountHolder, setAccountHolder] = useState(investorProfile.accountHolder || '');
  const [accountNumber, setAccountNumber] = useState(investorProfile.accountNumber || '');
  const [accountType, setAccountType] = useState<string>(investorProfile.accountType || 'Cheque / Current');
  const [branchCode, setBranchCode] = useState(investorProfile.branchCode || '');
  const [swiftCode, setSwiftCode] = useState(investorProfile.swiftCode || '');
  const [remittanceInstructions, setRemittanceInstructions] = useState(investorProfile.remittanceInstructions || '');

  // Default acquisition metrics
  const [defaultPrimeRate, setDefaultPrimeRate] = useState<number>(
    investorProfile.defaultPrimeRatePercent || 10.75
  );
  const [baselineHurdleYield, setBaselineHurdleYield] = useState<number>(
    investorProfile.baselineHurdleYieldPercent || 10.0
  );
  const [defaultCommission, setDefaultCommission] = useState<number>(
    investorProfile.defaultAgentCommissionPercent || 5.0
  );
  const [defaultTaxEntity, setDefaultTaxEntity] = useState<'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' | undefined>(
    investorProfile.defaultTaxEntityType
  );
  const [vatExemptAgent, setVatExemptAgent] = useState<boolean>(
    investorProfile.vatExemptAgent ?? false
  );
  const [minNetYield, setMinNetYield] = useState<number>(
    investorProfile.minNetYieldPercent ?? 8.0
  );
  const [minMonthlyCashflow, setMinMonthlyCashflow] = useState<number>(
    investorProfile.minMonthlyCashflowZAR ?? 1500
  );
  const [minNetRoi, setMinNetRoi] = useState<number>(
    investorProfile.minNetRoiPercent ?? 8.0
  );
  const [minFlipRoi, setMinFlipRoi] = useState<number>(
    investorProfile.minFlipRoiPercent ?? 18.0
  );
  const [maxDay1Cash, setMaxDay1Cash] = useState<number>(
    investorProfile.maxDay1CashZAR ?? 500000
  );
  const [minDscr, setMinDscr] = useState<number>(
    investorProfile.minDscr ?? 1.20
  );
  const [marginalTaxRate, setMarginalTaxRate] = useState<number>(
    investorProfile.marginalTaxRatePercent ?? 31.0
  );

  // Client-Side BYOK AI Settings
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'google'>(
    aiSettings?.provider || 'anthropic'
  );
  const [aiApiKey, setAiApiKey] = useState<string>(aiSettings?.apiKey || '');
  const [aiModel, setAiModel] = useState<string>(
    normalizeAiModel(aiSettings?.model)
  );
  const [showApiKey, setShowApiKey] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Database Synchronization & Supabase Auth State
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password' | 'update_password'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  // Sync execution state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MigrationResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Cloud hydration execution state
  const [isHydrating, setIsHydrating] = useState(false);
  const [hydrateFeedback, setHydrateFeedback] = useState<string | null>(null);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  // Synchronize active tab based on URL deep-link anchor
  const syncTabFromHash = () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.toLowerCase();
    let targetTab: SettingsTab | null = null;
    let targetElementId: string | null = null;

    if (hash.includes('settings-entity')) {
      targetTab = 'entity';
      targetElementId = 'settings-entity';
    } else if (hash.includes('settings-branding')) {
      targetTab = 'entity';
      targetElementId = 'settings-branding';
    } else if (hash.includes('settings-banking')) {
      targetTab = 'entity';
      targetElementId = 'settings-banking';
    } else if (hash.includes('settings-finance')) {
      targetTab = 'underwriting';
      targetElementId = 'settings-finance';
    } else if (hash.includes('settings-buybox')) {
      targetTab = 'underwriting';
      targetElementId = 'settings-buybox';
    } else if (hash.includes('settings-ai')) {
      targetTab = 'ai';
      targetElementId = 'settings-ai';
    }

    if (targetTab) {
      setActiveTab(targetTab);
      if (targetElementId) {
        setTimeout(() => {
          const el = document.getElementById(targetElementId!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  };

  useEffect(() => {
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    });

    // Check for password recovery hash / parameters on mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('type=recovery') ||
        hash.includes('recovery') ||
        search.includes('reset_password=true')
      ) {
        setAuthMode('update_password');
        setIsAuthExpanded(true);
        setAuthInfo('Password recovery session detected. Please enter your new password below.');
      } else if (actionParam === 'signin' || actionParam === 'cloud') {
        setIsAuthExpanded(true);
      }
    }

    // Subscribe to auth state updates
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password');
        setIsAuthExpanded(true);
        setAuthError(null);
        setAuthInfo('Please set your new password below.');
      }
      setCurrentUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    if (typeof localStorage !== 'undefined') {
      const ts = localStorage.getItem('cloud_sync_timestamp');
      if (ts) setLastSyncTime(ts);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [actionParam]);

  // Compute dirty changes state
  const isDirty = useMemo(() => {
    return (
      entityName !== (investorProfile.entityName || '') ||
      tradingAs !== (investorProfile.tradingAs || '') ||
      registrationOrId !== (investorProfile.registrationOrId || '') ||
      contactNumber !== (investorProfile.contactNumber || '') ||
      email !== (investorProfile.email || '') ||
      website !== (investorProfile.website || '') ||
      physicalAddress !== (investorProfile.physicalAddress || '') ||
      bioSummary !== (investorProfile.bioSummary || '') ||
      logoBase64 !== (investorProfile.logoBase64 || '') ||
      bankName !== (investorProfile.bankName || '') ||
      accountHolder !== (investorProfile.accountHolder || '') ||
      accountNumber !== (investorProfile.accountNumber || '') ||
      accountType !== (investorProfile.accountType || 'Cheque / Current') ||
      branchCode !== (investorProfile.branchCode || '') ||
      swiftCode !== (investorProfile.swiftCode || '') ||
      remittanceInstructions !== (investorProfile.remittanceInstructions || '') ||
      defaultPrimeRate !== (investorProfile.defaultPrimeRatePercent || 10.75) ||
      baselineHurdleYield !== (investorProfile.baselineHurdleYieldPercent || 10.0) ||
      defaultCommission !== (investorProfile.defaultAgentCommissionPercent || 5.0) ||
      defaultTaxEntity !== investorProfile.defaultTaxEntityType ||
      vatExemptAgent !== (investorProfile.vatExemptAgent ?? false) ||
      minNetYield !== (investorProfile.minNetYieldPercent ?? 8.0) ||
      minMonthlyCashflow !== (investorProfile.minMonthlyCashflowZAR ?? 1500) ||
      minNetRoi !== (investorProfile.minNetRoiPercent ?? 8.0) ||
      minFlipRoi !== (investorProfile.minFlipRoiPercent ?? 18.0) ||
      maxDay1Cash !== (investorProfile.maxDay1CashZAR ?? 500000) ||
      minDscr !== (investorProfile.minDscr ?? 1.20) ||
      marginalTaxRate !== (investorProfile.marginalTaxRatePercent ?? 31.0) ||
      aiProvider !== (aiSettings?.provider || 'anthropic') ||
      aiApiKey !== (aiSettings?.apiKey || '') ||
      aiModel !== normalizeAiModel(aiSettings?.model)
    );
  }, [
    investorProfile,
    aiSettings,
    entityName,
    tradingAs,
    registrationOrId,
    contactNumber,
    email,
    website,
    physicalAddress,
    bioSummary,
    logoBase64,
    bankName,
    accountHolder,
    accountNumber,
    accountType,
    branchCode,
    swiftCode,
    remittanceInstructions,
    defaultPrimeRate,
    baselineHurdleYield,
    defaultCommission,
    defaultTaxEntity,
    vatExemptAgent,
    minNetYield,
    minMonthlyCashflow,
    minNetRoi,
    minFlipRoi,
    maxDay1Cash,
    minDscr,
    marginalTaxRate,
    aiProvider,
    aiApiKey,
    aiModel,
  ]);

  const handleDiscardChanges = () => {
    setEntityName(investorProfile.entityName || '');
    setTradingAs(investorProfile.tradingAs || '');
    setRegistrationOrId(investorProfile.registrationOrId || '');
    setContactNumber(investorProfile.contactNumber || '');
    setEmail(investorProfile.email || '');
    setWebsite(investorProfile.website || '');
    setPhysicalAddress(investorProfile.physicalAddress || '');
    setBioSummary(investorProfile.bioSummary || '');
    setLogoBase64(investorProfile.logoBase64 || '');
    setBankName(investorProfile.bankName || '');
    setAccountHolder(investorProfile.accountHolder || '');
    setAccountNumber(investorProfile.accountNumber || '');
    setAccountType(investorProfile.accountType || 'Cheque / Current');
    setBranchCode(investorProfile.branchCode || '');
    setSwiftCode(investorProfile.swiftCode || '');
    setRemittanceInstructions(investorProfile.remittanceInstructions || '');
    setDefaultPrimeRate(investorProfile.defaultPrimeRatePercent || 10.75);
    setBaselineHurdleYield(investorProfile.baselineHurdleYieldPercent || 10.0);
    setDefaultCommission(investorProfile.defaultAgentCommissionPercent || 5.0);
    setDefaultTaxEntity(investorProfile.defaultTaxEntityType);
    setVatExemptAgent(investorProfile.vatExemptAgent ?? false);
    setMinNetYield(investorProfile.minNetYieldPercent ?? 8.0);
    setMinMonthlyCashflow(investorProfile.minMonthlyCashflowZAR ?? 1500);
    setMinNetRoi(investorProfile.minNetRoiPercent ?? 8.0);
    setMinFlipRoi(investorProfile.minFlipRoiPercent ?? 18.0);
    setMaxDay1Cash(investorProfile.maxDay1CashZAR ?? 500000);
    setMinDscr(investorProfile.minDscr ?? 1.20);
    setMarginalTaxRate(investorProfile.marginalTaxRatePercent ?? 31.0);
    setAiProvider(aiSettings?.provider || 'anthropic');
    setAiApiKey(aiSettings?.apiKey || '');
    setAiModel(normalizeAiModel(aiSettings?.model));
    setLogoError(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    setAuthSubmitting(true);
    try {
      if (authMode === 'signin') {
        if (authPassword.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setCurrentUser(data.user ? { id: data.user.id, email: data.user.email } : null);
        setAuthEmail('');
        setAuthPassword('');
      } else if (authMode === 'signup') {
        if (authPassword.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setAuthInfo('Account created! If confirmation is enabled, please verify your email before syncing.');
          setCurrentUser(null);
        } else {
          setCurrentUser(data.user ? { id: data.user.id, email: data.user.email } : null);
        }
        setAuthEmail('');
        setAuthPassword('');
      } else if (authMode === 'forgot_password') {
        if (!authEmail.trim()) {
          throw new Error('Please enter your email address.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/settings#recovery`,
        });
        if (error) throw error;
        setAuthInfo(
          `Password reset link sent to "${authEmail.trim()}". Check your inbox (and spam folder) for instructions.`
        );
      } else if (authMode === 'update_password') {
        if (newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters.');
        }
        if (newPassword !== confirmNewPassword) {
          throw new Error('Passwords do not match. Please verify both fields.');
        }
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        setCurrentUser(data.user ? { id: data.user.id, email: data.user.email } : null);
        setAuthInfo('Password successfully updated! You are now signed in.');
        setAuthMode('signin');
        setNewPassword('');
        setConfirmNewPassword('');
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (err: any) {
      if (
        err?.code === 'email_address_invalid' ||
        (err?.message?.toLowerCase().includes('email') && err?.message?.toLowerCase().includes('invalid'))
      ) {
        setAuthError(
          `Supabase's default mailer flagged "${authEmail}" (addresses containing words like "audit", "sponsor", or "admin" are treated as role accounts). Try using a standard personal email, or disable "Confirm email" in Supabase Auth settings.`
        );
      } else {
        setAuthError(err.message || 'Authentication failed');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    resetToDemoData();
    setCurrentUser(null);
    setLastSyncTime(null);
    setSyncResult(null);
    setSyncError(null);
    setHydrateFeedback(null);
    setHydrateError(null);
  };

  const handleRefreshFromCloud = async () => {
    setIsHydrating(true);
    setHydrateError(null);
    setHydrateFeedback(null);
    try {
      const result = await hydrateFromCloud();
      if (result.success) {
        if (result.hydrated) {
          setHydrateFeedback(
            result.hasNewLocalItems
              ? 'Portfolio hydrated from cloud & new local items synchronized!'
              : 'Portfolio successfully refreshed from cloud!'
          );
        } else {
          setHydrateFeedback('No cloud portfolio found for this account.');
        }
        if (typeof localStorage !== 'undefined') {
          const ts = localStorage.getItem('cloud_sync_timestamp');
          if (ts) setLastSyncTime(ts);
        }
      } else {
        setHydrateError(result.error || 'Failed to refresh from cloud');
      }
    } catch (err: any) {
      setHydrateError(err?.message || 'An unexpected error occurred during cloud refresh');
    } finally {
      setIsHydrating(false);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await migrateToCloud({
        state: usePortfolioStore.getState(),
      });
      if (result.success) {
        setSyncResult(result);
        if (typeof localStorage !== 'undefined') {
          const ts = localStorage.getItem('cloud_sync_timestamp');
          if (ts) setLastSyncTime(ts);
        }
      } else {
        setSyncError(result.error || 'Failed to sync data to cloud');
      }
    } catch (err: any) {
      setSyncError(err.message || 'An unexpected error occurred during sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Logo Upload as Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image file (PNG, JPG, SVG, or WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setLogoError(`File size (${fileSizeMB}MB) exceeds the 2MB limit. Please upload a smaller image.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoBase64(result);
      setLogoError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    setLogoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBankSelect = (selectedBank: string) => {
    setBankName(selectedBank);
    const preset = SOUTH_AFRICAN_BANKS.find((b) => b.name === selectedBank);
    if (preset) {
      setBranchCode(preset.universalBranchCode);
    }
  };

  // Universal Save handler: updates Zustand store, stamps settingsSavedAt, and syncs to Supabase
  const handleSave = (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const nowIso = new Date().toISOString();

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
      bankName,
      accountHolder: accountHolder || entityName,
      accountNumber,
      accountType,
      branchCode,
      swiftCode,
      remittanceInstructions,
      defaultPrimeRatePercent: defaultPrimeRate,
      baselineHurdleYieldPercent: baselineHurdleYield,
      defaultAgentCommissionPercent: defaultCommission,
      defaultTaxEntityType: defaultTaxEntity,
      vatExemptAgent,
      minNetYieldPercent: minNetYield,
      minMonthlyCashflowZAR: minMonthlyCashflow,
      minNetRoiPercent: minNetRoi,
      minFlipRoiPercent: minFlipRoi,
      maxDay1CashZAR: maxDay1Cash,
      minDscr: minDscr,
      marginalTaxRatePercent: marginalTaxRate,
      settingsSavedAt: nowIso,
    });

    updateAiSettings({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel,
    });

    // Auto-complete Step 0 onboarding checklist items
    const store = usePortfolioStore.getState();
    const completedGuideSteps = store.completedGuideSteps;
    const toggleGuideStep = store.toggleGuideStep;
    ['settings-entity-branding', 'settings-finance-defaults', 'settings-buy-box'].forEach((stepId) => {
      if (!completedGuideSteps.includes(stepId)) {
        toggleGuideStep(stepId);
      }
    });

    if (currentUser?.id) {
      supabase
        .from('profiles')
        .update({
          entity_name: entityName,
          trading_as: tradingAs || null,
          registration_or_id: registrationOrId || null,
          contact_number: contactNumber || null,
          email: email || null,
          website: website || null,
          physical_address: physicalAddress || null,
          logo_base64: logoBase64 || null,
          bio_summary: bioSummary || null,
          bank_name: bankName || null,
          account_holder: (accountHolder || entityName) || null,
          account_number: accountNumber || null,
          account_type: accountType || null,
          branch_code: branchCode || null,
          swift_code: swiftCode || null,
          remittance_instructions: remittanceInstructions || null,
          default_prime_rate_percent: defaultPrimeRate,
          baseline_hurdle_yield_percent: baselineHurdleYield,
          default_agent_commission_percent: defaultCommission,
          default_tax_entity_type: defaultTaxEntity,
          updated_at: nowIso,
        })
        .eq('user_id', currentUser.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to sync profile changes to Supabase:', error.message);
          }
        });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // AI API Key validation check
  const apiKeyValidationState = useMemo(() => {
    const key = aiApiKey.trim();
    if (!key) return 'empty';
    if (key.startsWith('sk-ant-') && key.length >= 20) return 'valid';
    return 'invalid_prefix';
  }, [aiApiKey]);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Investor Profile & Settings"
        subtitle="Manage entity details, custom branding logo, and acquisition baseline parameters"
        actionButton={
          <button
            onClick={handleSave}
            className="relative inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile &amp; Settings</span>
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5"
                title="Unsaved changes pending"
              />
            )}
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

        {/* Publish Link Guidance Banner */}
        <PublishLinkGuidanceBanner
          action={actionParam}
          returnTo={returnToParam}
          currentUser={currentUser}
        />

        {/* Compact Cloud Database Synchronization Bar */}
        <div
          data-testid="cloud-sync-card"
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-700 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Cloud Database Synchronization
                  </h2>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Multi-Device Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  POC Zero-Gate Experience: Securely backup and replicate your local portfolio into PostgreSQL.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentUser ? (
                <span
                  data-testid="cloud-status-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Cloud Connected
                </span>
              ) : (
                <>
                  <span
                    data-testid="local-mode-badge"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    <DbIcon className="w-3.5 h-3.5" />
                    Local Storage Only
                  </span>
                  <button
                    type="button"
                    data-testid="toggle-cloud-auth-btn"
                    onClick={() => setIsAuthExpanded(!isAuthExpanded)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
                  >
                    <span>{isAuthExpanded ? 'Collapse Form' : 'Sign In / Enable Cloud Sync'}</span>
                    {isAuthExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sync Success Feedback Banner */}
          {syncResult && (
            <div
              data-testid="sync-success-banner"
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 text-xs space-y-2 animate-in fade-in"
            >
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cloud Portfolio Migration Complete!</span>
              </div>
              <p className="text-emerald-700">
                All local portfolio records were successfully backed up and synchronized to your private cloud database schema.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-medium text-emerald-800 text-[11px]">
                <div>• Profile: {syncResult.counts.profile}</div>
                <div>• Rentals: {syncResult.counts.properties}</div>
                <div>• Flips: {syncResult.counts.flips}</div>
                <div>• BOQ Items: {syncResult.counts.boqItems}</div>
                <div>• Funding: {syncResult.counts.fundingSources}</div>
                <div>• Opportunities: {syncResult.counts.opportunities}</div>
                <div>• Tasks: {syncResult.counts.tasks}</div>
                <div>• Suppliers: {syncResult.counts.suppliers}</div>
              </div>
            </div>
          )}

          {/* Sync Error Feedback Banner */}
          {syncError && (
            <div
              data-testid="sync-error-banner"
              className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Synchronization Failed</span>
                <span className="text-rose-700">{syncError}</span>
              </div>
            </div>
          )}

          {/* Hydrate Feedback Banners */}
          {hydrateFeedback && (
            <div
              data-testid="hydrate-success-banner"
              className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl p-4 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Cloud Refresh Complete</span>
                <span className="text-sky-700">{hydrateFeedback}</span>
              </div>
            </div>
          )}

          {hydrateError && (
            <div
              data-testid="hydrate-error-banner"
              className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Cloud Refresh Failed</span>
                <span className="text-rose-700">{hydrateError}</span>
              </div>
            </div>
          )}

          {currentUser ? (
            /* Authenticated View */
            <div className="pt-2 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Logged in as: <strong className="text-slate-900 font-bold">{currentUser.email}</strong></span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Last Cloud Sync:{' '}
                    {lastSyncTime ? (
                      <span className="font-semibold text-slate-700">{new Date(lastSyncTime).toLocaleString('en-ZA')}</span>
                    ) : (
                      <span className="italic">Not synced yet</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>

                  <button
                    type="button"
                    data-testid="refresh-cloud-btn"
                    onClick={handleRefreshFromCloud}
                    disabled={isHydrating || isSyncing}
                    className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-lg shadow-sm text-xs transition-colors cursor-pointer"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isHydrating ? 'animate-spin' : ''}`} />
                    {isHydrating ? 'Refreshing...' : 'Refresh from Cloud'}
                  </button>

                  <button
                    type="button"
                    data-testid="sync-cloud-btn"
                    onClick={handleSyncToCloud}
                    disabled={isSyncing || isHydrating}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold px-4 py-2 rounded-lg shadow-sm text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Local Data to Cloud'}
                  </button>
                </div>
              </div>
            </div>
          ) : isAuthExpanded ? (
            /* Unauthenticated Expanded View (Inline Auth Controls) */
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  POC Zero-Gate Experience: Sign in is strictly optional.
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your property portfolios, deals, and finances operate completely offline in your browser&apos;s Local Storage without requiring an account. To enable multi-tenant cloud storage, backup, or team sharing, sign in or register below.
                </p>
              </div>

              {/* Mode Switcher for Sign In / Sign Up */}
              {(authMode === 'signin' || authMode === 'signup') && (
                <div className="bg-slate-100 p-1 rounded-lg inline-flex gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    data-testid="auth-mode-signin"
                    onClick={() => { setAuthMode('signin'); setAuthError(null); }}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      authMode === 'signin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    data-testid="auth-mode-signup"
                    onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      authMode === 'signup' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Forgot Password Header */}
              {authMode === 'forgot_password' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Reset Your Password</h3>
                      <p className="text-[11px] text-slate-500">
                        Enter your email address to receive a secure recovery link.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="back-to-signin-btn"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                      setAuthInfo(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              )}

              {/* Update Password Header */}
              {authMode === 'update_password' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Set New Password</h3>
                      <p className="text-[11px] text-slate-500">
                        Enter a new secure password (minimum 8 characters).
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Recovery Session
                  </span>
                </div>
              )}

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authInfo && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{authInfo}</span>
                </div>
              )}

              {/* Inline Auth Form: Sign In / Create Account */}
              {(authMode === 'signin' || authMode === 'signup') && (
                <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          placeholder="investor@example.co.za"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Password</label>
                        <span className="text-[10px] text-slate-400 font-normal">Min. 8 characters</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          data-testid="auth-password-input"
                          placeholder="Min. 8 characters"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                        />
                      </div>
                      {authMode === 'signin' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            data-testid="forgot-password-link"
                            onClick={() => {
                              setAuthMode('forgot_password');
                              setAuthError(null);
                              setAuthInfo(null);
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500">
                      {authMode === 'signin'
                        ? 'Sign in to access your Supabase multi-tenant cloud portfolio.'
                        : 'Creates your private Supabase user account to begin syncing.'}
                    </p>

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg shadow-sm text-xs transition-colors cursor-pointer"
                    >
                      {authMode === 'signin' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{authSubmitting ? 'Signing In...' : 'Sign In'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{authSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Inline Auth Form: Forgot Password */}
              {authMode === 'forgot_password' && (
                <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        data-testid="forgot-password-email-input"
                        placeholder="investor@example.co.za"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500">
                      We will email you a password recovery link.
                    </p>

                    <button
                      type="submit"
                      data-testid="send-reset-link-btn"
                      disabled={authSubmitting}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg shadow-sm text-xs transition-colors cursor-pointer"
                    >
                      <Key className="w-4 h-4" />
                      <span>{authSubmitting ? 'Sending...' : 'Send Recovery Link'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Inline Auth Form: Set New Password */}
              {authMode === 'update_password' && (
                <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">New Password</label>
                        <span className="text-[10px] text-slate-400 font-normal">Min. 8 characters</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          data-testid="new-password-input"
                          placeholder="Min. 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Confirm New Password</label>
                        <span className="text-[10px] text-slate-400 font-normal">Must match</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          data-testid="confirm-new-password-input"
                          placeholder="Re-enter new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 font-medium bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500">
                      Must be at least 8 characters. You will be automatically signed in upon saving.
                    </p>

                    <button
                      type="submit"
                      data-testid="save-new-password-btn"
                      disabled={authSubmitting}
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold py-2 px-5 rounded-lg shadow-sm text-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{authSubmitting ? 'Saving Password...' : 'Save New Password & Sign In'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>

        {/* 3-Tab Foundation Workspace Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 text-xs font-semibold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab('entity');
                setShowAllSections(false);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                !showAllSections && activeTab === 'entity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>🏢 Entity, Banking &amp; Branding</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('underwriting');
                setShowAllSections(false);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                !showAllSections && activeTab === 'underwriting'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>🎯 Underwriting, Buy Box &amp; SARS Tax</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ai');
                setShowAllSections(false);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                !showAllSections && activeTab === 'ai'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>✨ AI Extraction &amp; BYOK</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              data-testid="view-mode-toggle"
              onClick={() => setShowAllSections(!showAllSections)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                showAllSections
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {showAllSections ? '✓ Showing All Sections' : 'Show All Sections'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-6">
          {/* TAB 1: Entity, Banking & Branding */}
          {(showAllSections || activeTab === 'entity') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section 1: Entity & Legal Representation */}
              <div id="settings-entity" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Entity &amp; Legal Representation</h2>
                      <p className="text-xs text-slate-500">
                        Used across generated lender proposals, contracts, and confidentiality memorandums.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                    Powers ➔ Proposal Generator
                  </span>
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
              <div id="settings-branding" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Custom Brand Logo &amp; Investor Bio</h2>
                      <p className="text-xs text-slate-500">
                        Brand your pitch decks and summarize your track record for private funders.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 self-start sm:self-auto">
                    Powers ➔ Pitch Decks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  {/* Compact Logo Preview & Upload */}
                  <div className="space-y-2.5">
                    <label className="block font-semibold text-slate-700">Investor / Syndicate Logo</label>
                    
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-50 min-h-[110px]">
                      {logoBase64 ? (
                        <div className="space-y-2 w-full flex flex-col items-center">
                          <div className="max-h-20 max-w-full p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                            <img
                              src={logoBase64}
                              alt="Investor Logo Preview"
                              className="max-h-16 max-w-[160px] object-contain"
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
                        <div className="space-y-1.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                            <Building className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            PNG, JPG, or SVG (Max 2MB)
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
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition-colors text-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoBase64 ? 'Replace Logo' : 'Upload Logo File'}</span>
                    </label>

                    {logoError && (
                      <div
                        data-testid="logo-upload-error"
                        className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2 animate-in fade-in"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{logoError}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio Summary Text Area */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block font-semibold text-slate-700">
                      Investor / Firm Background &amp; Track Record Summary
                    </label>
                    <p className="text-[11px] text-slate-500">
                      This narrative is embedded dynamically in the Executive Opportunity section of pitch proposals.
                    </p>
                    <textarea
                      rows={5}
                      value={bioSummary}
                      onChange={(e) => setBioSummary(e.target.value)}
                      placeholder="Describe your property acquisition strategy, local geographic focus, prior exits, and risk mitigation methodologies..."
                      className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Banking & Remittance Details */}
              <div id="settings-banking" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Banking &amp; Remittance Details</h2>
                      <p className="text-xs text-slate-500">
                        Account information displayed on monthly tenant statements, tax invoices, and payment receipts.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                    Powers ➔ Tenant Statements
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* Bank Selection */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank Name (South Africa) *
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={SOUTH_AFRICAN_BANKS.some((b) => b.name === bankName) ? bankName : bankName ? 'Other' : ''}
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setBankName('');
                          } else {
                            handleBankSelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-slate-900 font-medium"
                      >
                        <option value="">Select a South African Bank...</option>
                        {SOUTH_AFRICAN_BANKS.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name} ({b.universalBranchCode})
                          </option>
                        ))}
                        <option value="Other">Other / Custom Bank</option>
                      </select>

                      {(!SOUTH_AFRICAN_BANKS.some((b) => b.name === bankName) || bankName === '') && (
                        <input
                          type="text"
                          placeholder="Enter custom bank name"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                        />
                      )}
                    </div>
                  </div>

                  {/* Account Holder */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Holder / Beneficiary Name *
                    </label>
                    <input
                      type="text"
                      placeholder={entityName || 'e.g. L&M Property Investments (Pty) Ltd'}
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900 font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Defaults to entity name if left blank
                    </span>
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 62891044321"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900 font-bold"
                    />
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Type *
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-slate-900 font-medium"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="Transmission">Transmission</option>
                    </select>
                  </div>

                  {/* Branch Code */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Branch / Clearing Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 250655"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900 font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Universal electronic code (auto-filled on bank selection)
                    </span>
                  </div>

                  {/* SWIFT / BIC Code (Optional) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      SWIFT / BIC Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FIRNZAJJ"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Required only for international cross-border EFTs
                    </span>
                  </div>
                </div>

                {/* Custom Remittance Instructions */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Custom Remittance Instructions / Payment Terms Note
                  </label>
                  <textarea
                    rows={2}
                    value={remittanceInstructions}
                    onChange={(e) => setRemittanceInstructions(e.target.value)}
                    placeholder="e.g. Please use the statement payment reference as your bank beneficiary reference. Email POP to invest@lmtrading.co.za."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Printed beneath bank account details on generated statements and PDF invoices.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Underwriting, Buy Box & SARS Tax */}
          {(showAllSections || activeTab === 'underwriting') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section 4: Default Financial & Acquisition Metrics */}
              <div id="settings-finance" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Default Financial &amp; Acquisition Metrics</h2>
                      <p className="text-xs text-slate-500">
                        Baseline assumptions auto-populated into the Opportunity Analyzer and Deal Evaluators.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
                    Powers ➔ Opportunity Analyzer
                  </span>
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
                    <div className="flex items-center mb-2">
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
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vatExemptAgent}
                        onChange={(e) => setVatExemptAgent(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="font-medium">Agency is VAT-Exempt (no 1.15x VAT)</span>
                    </label>
                  </div>
                </div>

                {/* Unified SARS Tax Treatment Controls */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      SARS Income Tax Treatment &amp; Rate Entity
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Synchronized across Rental Tax Reserve &amp; Flip Corporate Tax
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Default Tax Entity
                      </label>
                      <select
                        value={defaultTaxEntity || 'Pre-Tax'}
                        onChange={(e) => {
                          const val = e.target.value as 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
                          setDefaultTaxEntity(val);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      >
                        <option value="Company (27%)">Company (27%) - Corporate Income Tax</option>
                        <option value="Individual (45%)">Individual (45%) - Top Marginal Bracket</option>
                        <option value="Pre-Tax">Pre-Tax - Gross Cash Flow Analysis</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">
                          Marginal Tax Rate (SARS Section 11(a) Individual)
                        </label>
                        <span className="text-[10px] text-slate-400">Default: 31%</span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="any"
                          value={marginalTaxRate}
                          onChange={(e) => setMarginalTaxRate(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                        />
                        <span className="ml-1.5 font-bold text-slate-600">%</span>
                      </div>
                      {(defaultTaxEntity === 'Company (27%)' || defaultTaxEntity === 'Pre-Tax') && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">
                          Applied when Individual tax override is selected on a rental card.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Strategy-Aware Buy Box Hurdles & SARS Criteria */}
              <div id="settings-buybox" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Strategy-Aware Buy Box Hurdles &amp; SARS Criteria</h2>
                      <p className="text-xs text-slate-500">
                        Automated pass/fail criteria matching pipeline deals against your investment mandate.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                    Powers ➔ Deal Sourcing Match
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min Net Yield (Rental / BRRRR)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Minimum net cap rate yield hurdle</p>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="any"
                        value={minNetYield}
                        onChange={(e) => setMinNetYield(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-700 bg-white"
                      />
                      <span className="ml-1.5 font-bold text-slate-600">%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min Monthly Cash Flow
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Net rental cash flow after bond and opex</p>
                    <div className="flex items-center mb-1.5">
                      <span className="mr-1.5 font-bold text-slate-500">R</span>
                      <input
                        type="number"
                        step="100"
                        value={minMonthlyCashflow}
                        onChange={(e) => setMinMonthlyCashflow(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold inline-block">
                      {formatZAR(minMonthlyCashflow)} / mo
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min Cash-on-Cash ROI
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Net cashflow return on Day-1 capital</p>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="any"
                        value={minNetRoi}
                        onChange={(e) => setMinNetRoi(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 bg-white"
                      />
                      <span className="ml-1.5 font-bold text-slate-600">%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min Flip ROI Hurdle
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Minimum net ROI on flip project capital</p>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="any"
                        value={minFlipRoi}
                        onChange={(e) => setMinFlipRoi(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-amber-700 bg-white"
                      />
                      <span className="ml-1.5 font-bold text-slate-600">%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Max Day-1 Capital Required
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Deposit + transfer duty + legal + initial capex</p>
                    <div className="flex items-center mb-1.5">
                      <span className="mr-1.5 font-bold text-slate-500">R</span>
                      <input
                        type="number"
                        step="10000"
                        value={maxDay1Cash}
                        onChange={(e) => setMaxDay1Cash(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <span className="text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold inline-block">
                      {formatZAR(maxDay1Cash)} max cash outlay
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min DSCR (Debt Service Coverage)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">Net Operating Income / Bond Repayment</p>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.05"
                        value={minDscr}
                        onChange={(e) => setMinDscr(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-700 bg-white"
                      />
                      <span className="ml-1.5 font-bold text-slate-600">x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI Extraction & BYOK */}
          {(showAllSections || activeTab === 'ai') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section 6: AI Integration & Statement Extraction (BYOK) */}
              <div id="settings-ai" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">AI Integration &amp; Statement Extraction (BYOK)</h3>
                      <p className="text-xs text-slate-500">
                        Bring Your Own Key to parse visual managing agent statements (iGrow, WeconnectU) directly from your browser.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-indigo-600" /> Client-Side Only
                    </span>
                  </div>
                </div>

                {/* Telemetry and Key Status Ribbon */}
                <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    0 tokens used in this browser session
                  </span>

                  {apiKeyValidationState === 'valid' && (
                    <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Valid Anthropic API Key Format
                    </span>
                  )}
                  {apiKeyValidationState === 'empty' && (
                    <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Client-Side Only • No Key Configured
                    </span>
                  )}
                  {apiKeyValidationState === 'invalid_prefix' && (
                    <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Check Key Format (Anthropic keys typically start with sk-ant-)
                    </span>
                  )}
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
                      Claude Sonnet 5 supports high-precision multi-page PDF &amp; image ledger extractions.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Extraction Model</label>
                    <select
                      value={
                        (SUPPORTED_ANTHROPIC_MODELS as readonly string[]).includes(aiModel)
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
                      <option value="claude-haiku-4-5">Claude Haiku 4.5 (claude-haiku-4-5 - Fast &amp; Cost-Efficient)</option>
                      <option value="claude-opus-5">Claude Opus 5 (claude-opus-5 - Deep Reasoning)</option>
                      <option value="claude-fable-5-1">Claude Fable 5.1 (claude-fable-5-1 - Flagship)</option>
                      <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (claude-sonnet-4-6)</option>
                      <option value="custom">Custom Model Identifier...</option>
                    </select>
                    {!(SUPPORTED_ANTHROPIC_MODELS as readonly string[]).includes(aiModel) && (
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
            </div>
          )}

          {/* Footer Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
            <Link
              href="/proposal"
              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
            >
              ← Go to Proposal Generator
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/get-started#stage-0"
                className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>View Step 0 in Get Started Guide ➔</span>
              </Link>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Profile &amp; Settings
              </button>
            </div>
          </div>
        </form>

        {/* Adaptive Floating Save Dock for Dirty Changes (Guardrail 1: bottom-16 on mobile to avoid bottom navigation bar, md:bottom-4 on desktop) */}
        {isDirty && (
          <div className="fixed bottom-16 md:bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 flex items-center justify-between sm:justify-end gap-3.5 animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="font-semibold text-slate-200">Unsaved Changes</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="floating-discard-btn"
                onClick={handleDiscardChanges}
                className="px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                type="button"
                data-testid="floating-save-btn"
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile &amp; Settings</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Loading Settings...</span>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
