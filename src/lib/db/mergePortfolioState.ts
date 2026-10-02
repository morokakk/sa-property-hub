import type {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  LocalSupplier,
  TaskItem,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
} from '@/types';
import {
  INITIAL_ANALYZER_DRAFT,
  EMPTY_ANALYZER_DRAFT,
  DEFAULT_AI_SETTINGS,
} from '@/lib/store/initialData';

export const DEMO_RENTAL_IDS = new Set(['rental-1', 'rental-2', 'rental-3', 'rental-4']);

export function isDemoRentalProperty(propertyId?: string | null): boolean {
  if (!propertyId || typeof propertyId !== 'string') return false;
  return DEMO_RENTAL_IDS.has(propertyId) || propertyId.startsWith('demo-rental-');
}
export const DEMO_FLIP_IDS = new Set(['flip-1', 'flip-2', 'flip-3']);
export const DEMO_BOQ_IDS = new Set([
  'boq-1', 'boq-2', 'boq-3', 'boq-4', 'boq-5', 'boq-6', 'boq-7', 'boq-8',
  'boq-9', 'boq-10', 'boq-11', 'boq-12', 'boq-13', 'boq-14', 'boq-15', 'boq-16',
]);
export const DEMO_OPP_IDS = new Set(['opp-1', 'opp-2', 'opp-3']);
export const DEMO_FUNDING_IDS = new Set(['fund-1', 'fund-2', 'fund-3']);
export const DEMO_TASK_IDS = new Set([
  'task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7',
  'task-agm-rental-1', 'task-agm-rental-2',
]);
export const DEMO_SUPPLIER_IDS = new Set(['sup-1', 'sup-2', 'sup-3', 'sup-4', 'sup-5', 'sup-6']);

export interface PortfolioStateSnapshot {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  opportunities: OpportunityDeal[];
  suppliers: LocalSupplier[];
  tasks: TaskItem[];
  investorProfile?: InvestorProfile;
  liquidCapitalReserve?: number;
  rentalForecastView?: 'wealth-only' | 'cashflow-only';
  aiSettings?: AiSettings;
  analyzerDraft?: AnalyzerDraft;
}

export interface MergeResult {
  mergedState: PortfolioStateSnapshot;
  hasNewLocalItems: boolean;
}

function normalizeStr(str?: string | null): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Merges incoming Cloud state snapshot with active Local Zustand state.
 *
 * Principles:
 * 1. Cloud records take precedence on direct conflict (matching ID, or exact matching title/address).
 * 2. Untouched stock demo records on the local device are discarded when cloud records exist.
 * 3. User-created local records (non-demo IDs) that do NOT conflict with cloud records are preserved & appended.
 * 4. `hasNewLocalItems` is true if any user-created local records were preserved into the merged state.
 */
export function mergePortfolioState(
  cloudState: PortfolioStateSnapshot,
  localState: PortfolioStateSnapshot
): MergeResult {
  let hasNewLocalItems = false;

  // 1. Merge Rentals
  const cloudRentals = cloudState.rentals || [];
  const localRentals = localState.rentals || [];
  const mergedRentals: RentalProperty[] = [...cloudRentals];

  const cloudRentalIds = new Set(cloudRentals.map((r) => r.id));
  const cloudRentalTitles = new Set(
    cloudRentals.map((r) => normalizeStr(r.title)).filter(Boolean)
  );
  const cloudRentalAddresses = new Set(
    cloudRentals.map((r) => normalizeStr(r.address)).filter(Boolean)
  );

  for (const localR of localRentals) {
    // If it's a stock demo rental, discard it unless it's already in cloud
    if (DEMO_RENTAL_IDS.has(localR.id)) {
      continue;
    }
    // Check for direct conflict
    const conflicts =
      cloudRentalIds.has(localR.id) ||
      (localR.title && cloudRentalTitles.has(normalizeStr(localR.title))) ||
      (localR.address && cloudRentalAddresses.has(normalizeStr(localR.address)));

    if (!conflicts) {
      mergedRentals.push(localR);
      hasNewLocalItems = true;
    }
  }

  // 2. Merge Flips
  const cloudFlips = cloudState.flips || [];
  const localFlips = localState.flips || [];
  const mergedFlips: FlipProject[] = [...cloudFlips];

  const cloudFlipIds = new Set(cloudFlips.map((f) => f.id));
  const cloudFlipTitles = new Set(
    cloudFlips.map((f) => normalizeStr(f.title)).filter(Boolean)
  );
  const cloudFlipAddresses = new Set(
    cloudFlips.map((f) => normalizeStr(f.address)).filter(Boolean)
  );

  for (const localF of localFlips) {
    if (DEMO_FLIP_IDS.has(localF.id)) {
      continue;
    }
    const conflicts =
      cloudFlipIds.has(localF.id) ||
      (localF.title && cloudFlipTitles.has(normalizeStr(localF.title))) ||
      (localF.address && cloudFlipAddresses.has(normalizeStr(localF.address)));

    if (!conflicts) {
      mergedFlips.push(localF);
      hasNewLocalItems = true;
    }
  }

  // 3. Merge Opportunities
  const cloudOpps = cloudState.opportunities || [];
  const localOpps = localState.opportunities || [];
  const mergedOpps: OpportunityDeal[] = [...cloudOpps];

  const cloudOppIds = new Set(cloudOpps.map((o) => o.id));
  const cloudOppTitles = new Set(
    cloudOpps.map((o) => normalizeStr(o.title)).filter(Boolean)
  );
  const cloudOppAddresses = new Set(
    cloudOpps.map((o) => normalizeStr(o.address)).filter(Boolean)
  );

  for (const localO of localOpps) {
    if (DEMO_OPP_IDS.has(localO.id)) {
      continue;
    }
    const conflicts =
      cloudOppIds.has(localO.id) ||
      (localO.title && cloudOppTitles.has(normalizeStr(localO.title))) ||
      (localO.address && cloudOppAddresses.has(normalizeStr(localO.address)));

    if (!conflicts) {
      mergedOpps.push(localO);
      hasNewLocalItems = true;
    }
  }

  // 4. Merge Funding Sources
  const cloudFunding = cloudState.funding || [];
  const localFunding = localState.funding || [];
  const mergedFunding: FundingSource[] = [...cloudFunding];

  const cloudFundingIds = new Set(cloudFunding.map((f) => f.id));

  for (const localF of localFunding) {
    if (DEMO_FUNDING_IDS.has(localF.id)) {
      continue;
    }
    const conflicts =
      cloudFundingIds.has(localF.id) ||
      (Boolean(normalizeStr(localF.lenderName)) &&
        cloudFunding.some(
          (cf) =>
            normalizeStr(cf.lenderName) === normalizeStr(localF.lenderName) &&
            cf.capitalAmountZAR === localF.capitalAmountZAR
        ));

    if (!conflicts) {
      mergedFunding.push(localF);
      hasNewLocalItems = true;
    }
  }

  // 5. Merge Tasks
  const cloudTasks = cloudState.tasks || [];
  const localTasks = localState.tasks || [];
  const mergedTasks: TaskItem[] = [...cloudTasks];

  const cloudTaskIds = new Set(cloudTasks.map((t) => t.id));

  for (const localT of localTasks) {
    if (DEMO_TASK_IDS.has(localT.id)) {
      continue;
    }
    const conflicts =
      cloudTaskIds.has(localT.id) ||
      cloudTasks.some(
        (ct) =>
          normalizeStr(ct.title) === normalizeStr(localT.title) &&
          normalizeStr(ct.linkedEntity?.name) === normalizeStr(localT.linkedEntity?.name) &&
          ct.dueDate === localT.dueDate
      );

    if (!conflicts) {
      mergedTasks.push(localT);
      hasNewLocalItems = true;
    }
  }

  // 6. Merge Suppliers
  const cloudSuppliers = cloudState.suppliers || [];
  const localSuppliers = localState.suppliers || [];
  const mergedSuppliers: LocalSupplier[] = [...cloudSuppliers];

  const cloudSupplierIds = new Set(cloudSuppliers.map((s) => s.id));
  const cloudSupplierNames = new Set(
    cloudSuppliers.map((s) => normalizeStr(s.name)).filter(Boolean)
  );

  for (const localS of localSuppliers) {
    if (DEMO_SUPPLIER_IDS.has(localS.id)) {
      continue;
    }
    const conflicts =
      cloudSupplierIds.has(localS.id) ||
      (localS.name && cloudSupplierNames.has(normalizeStr(localS.name)));

    if (!conflicts) {
      mergedSuppliers.push(localS);
      hasNewLocalItems = true;
    }
  }

  // 7. Profile & Settings (Cloud profile takes precedence, but protect local active draft & BYOK API key)
  const mergedProfile = cloudState.investorProfile || localState.investorProfile;
  const mergedReserve =
    cloudState.liquidCapitalReserve !== undefined
      ? cloudState.liquidCapitalReserve
      : localState.liquidCapitalReserve;
  const mergedForecast = cloudState.rentalForecastView || localState.rentalForecastView;

  // Preserve local BYOK API key if set and cloud has no key
  const baseAi = cloudState.aiSettings || localState.aiSettings || DEFAULT_AI_SETTINGS;
  const localApiKey = localState.aiSettings?.apiKey?.trim();
  const cloudApiKey = cloudState.aiSettings?.apiKey?.trim();
  const mergedAiSettings = {
    ...baseAi,
    apiKey: cloudApiKey || localApiKey || '',
  };

  // Preserve active in-flight analyzer draft if user modified it locally
  const isLocalDraftModified =
    Boolean(localState.analyzerDraft) &&
    JSON.stringify(localState.analyzerDraft) !== JSON.stringify(INITIAL_ANALYZER_DRAFT) &&
    JSON.stringify(localState.analyzerDraft) !== JSON.stringify(EMPTY_ANALYZER_DRAFT);

  const mergedAnalyzerDraft = isLocalDraftModified
    ? localState.analyzerDraft
    : (cloudState.analyzerDraft || localState.analyzerDraft);

  return {
    mergedState: {
      rentals: mergedRentals,
      flips: mergedFlips,
      funding: mergedFunding,
      opportunities: mergedOpps,
      suppliers: mergedSuppliers,
      tasks: mergedTasks,
      investorProfile: mergedProfile,
      liquidCapitalReserve: mergedReserve,
      rentalForecastView: mergedForecast,
      aiSettings: mergedAiSettings,
      analyzerDraft: mergedAnalyzerDraft,
    },
    hasNewLocalItems,
  };
}
