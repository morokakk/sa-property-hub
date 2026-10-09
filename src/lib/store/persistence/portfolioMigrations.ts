import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import {
  RentalProperty,
  OpportunityDeal,
  MunicipalContact,
  AiSettings,
} from '@/types';
import { normalizeAiModel } from '@/lib/ai/modelConfig';
import { DEFAULT_AI_SETTINGS } from '../initialData';
import { migrateNegativeArrearsToRental } from '@/lib/calculations/arrears';
import {
  sanitizeCompletedGuideSteps,
  healClearwaterAgencyFee,
} from './hydrationHelpers';
import type { PortfolioState } from '../types';

export const PORTFOLIO_STORAGE_KEY = 'sa_property_portfolio_hub_v1';

let storeStateSetter: ((partial: any) => void) | null = null;

export function registerStoreForMigration(store: { setState: (partial: any) => void }) {
  storeStateSetter = store.setState.bind(store);
}

// Re-export pure hydration sanitizer
export { healClearwaterAgencyFee };

/**
 * Auto-heals and migrates persisted rental properties:
 * 1. Clearwater agency fee healing
 * 2. 2025 legacy statement restoration
 * 3. Meter readings synchronization
 * 4. Lease contract synthesis from flat fields
 * 5. Negative arrears sanitization
 */
export function migratePersistedRental(
  rental: any,
  defaultRental?: RentalProperty
): RentalProperty {
  if (!rental || typeof rental !== 'object') {
    return defaultRental || ({} as RentalProperty);
  }

  const defaultStatements = defaultRental?.utilityStatements || [];
  const defaultMeterReadings = defaultRental?.meterReadings || [];

  const { monthlyAgentFeeZAR, agencyVatApplicable, agencyCommissionPercent } =
    healClearwaterAgencyFee(rental);

  const hasLegacy2025Statements = (rental.utilityStatements || []).some(
    (s: any) =>
      s?.statementDate?.startsWith('2025') ||
      s?.billingPeriod?.includes('2025') ||
      (s?.electricityZAR === 0 && s?.waterZAR === 0)
  );

  const needsStatementMigration =
    !rental.utilityStatements ||
    rental.utilityStatements.length === 0 ||
    hasLegacy2025Statements;

  const healedStatements = needsStatementMigration
    ? defaultStatements
    : rental.utilityStatements.map((stmt: any) => {
        const defaultMatch = defaultStatements.find((ds) => ds?.id === stmt?.id);
        return {
          ...stmt,
          extractedMeterReadings:
            stmt?.extractedMeterReadings && stmt.extractedMeterReadings.length > 0
              ? stmt.extractedMeterReadings
              : defaultMatch?.extractedMeterReadings || [],
        };
      });

  const needsReadingsMigration =
    !rental.meterReadings ||
    rental.meterReadings.length === 0 ||
    hasLegacy2025Statements;

  const healedMeterReadings = needsReadingsMigration
    ? defaultMeterReadings
    : [
        ...defaultMeterReadings,
        ...(rental.meterReadings || []).filter(
          (mr: any) => mr && !defaultMeterReadings.some((dmr) => dmr?.id === mr.id)
        ),
      ];

  let leases = rental.leases;
  if (!leases || !Array.isArray(leases) || leases.length === 0) {
    leases = [
      {
        id: rental.id ? `lease-${rental.id}-${Date.now()}` : `lease-${Date.now()}`,
        unitName: 'Main Unit',
        tenantName: rental.tenantName || 'Tenant Unassigned',
        tenantPhone: rental.tenantPhone,
        tenantEmail: rental.tenantEmail,
        leaseStartDate: rental.leaseStartDate || new Date().toISOString().split('T')[0],
        leaseEndDate:
          rental.leaseEndDate ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthlyRentZAR: rental.monthlyGrossRentZAR || 0,
        depositHeldZAR: rental.depositHeldZAR || 0,
        annualEscalationPercent: rental.annualEscalationPercent || 7.0,
        status: rental.status === 'Occupied' ? 'Occupied' : 'Vacant',
      },
    ];
  }

  const defaultMeterRegistry = defaultRental?.meterRegistry || [];
  const healedMeterRegistry =
    rental.meterRegistry && rental.meterRegistry.length > 0
      ? rental.meterRegistry
      : defaultMeterRegistry;

  const migrated: any = {
    ...rental,
    monthlyAgentFeeZAR,
    agencyVatApplicable,
    agencyCommissionPercent,
    utilityStatements: healedStatements,
    meterReadings: healedMeterReadings,
    meterRegistry: healedMeterRegistry,
    leases,
  };
  delete migrated.tenantName;
  delete migrated.tenantPhone;
  delete migrated.tenantEmail;
  delete migrated.leaseStartDate;
  delete migrated.leaseEndDate;
  delete migrated.depositHeldZAR;
  delete migrated.annualEscalationPercent;

  return migrateNegativeArrearsToRental(migrated as RentalProperty);
}

/**
 * Migrates persisted opportunities schema:
 * Standardizes legacy statuses and assigns default vacancy/management rates.
 */
export function migratePersistedOpportunities(rawOpportunities: any[]): OpportunityDeal[] {
  return (rawOpportunities || []).map((opp: any) => {
    if (!opp || typeof opp !== 'object') return opp;
    return {
      ...opp,
      status:
        opp.status === 'Analyzing'
          ? 'Screening'
          : opp.status === 'Under Due Diligence'
          ? 'Due Diligence'
          : opp.status,
      vacancyRatePercent: opp.vacancyRatePercent ?? 6,
      managementFeePercent: opp.managementFeePercent ?? 8,
    };
  });
}

/**
 * Zustand persist merge function:
 * Merges persisted storage into the current in-memory state while executing schema migrations.
 */
export function mergePortfolioPersistedState<T extends {
  rentals: RentalProperty[];
  opportunities: OpportunityDeal[];
  municipalDirectory?: MunicipalContact[];
  aiSettings?: AiSettings;
  completedGuideSteps?: string[];
}>(
  persistedState: unknown,
  currentState: T
): T {
  const pState = (persistedState && typeof persistedState === 'object' && !Array.isArray(persistedState)
    ? persistedState
    : {}) as Partial<T>;
  const rawModel = (pState.aiSettings as any)?.model;
  const migratedModel = normalizeAiModel(rawModel);

  const rawOpps = pState.opportunities || currentState?.opportunities || [];
  const migratedOpportunities = migratePersistedOpportunities(rawOpps || []);

  const rawRentals = pState.rentals || currentState?.rentals || [];
  const currentRentalsList = currentState?.rentals || [];
  const migratedRentals = (rawRentals || []).map((rental: any) => {
    const defaultRental = currentRentalsList.find((r) => r && r.id === rental?.id);
    return migratePersistedRental(rental, defaultRental);
  });

  return {
    ...currentState,
    ...pState,
    rentals: migratedRentals,
    opportunities: migratedOpportunities,
    municipalDirectory:
      pState.municipalDirectory && pState.municipalDirectory.length > 0
        ? pState.municipalDirectory
        : currentState?.municipalDirectory,
    aiSettings: {
      ...DEFAULT_AI_SETTINGS,
      ...((pState.aiSettings as any) || {}),
      model: migratedModel,
    },
    completedGuideSteps: sanitizeCompletedGuideSteps(pState.completedGuideSteps),
  };
}

/**
 * Zustand Persist Middleware Configuration Object
 */
export const portfolioPersistConfig: PersistOptions<PortfolioState, PortfolioState> = {
  name: PORTFOLIO_STORAGE_KEY,
  storage: createJSONStorage<PortfolioState>(() => localStorage),
  merge: (persistedState: unknown, currentState: PortfolioState) =>
    mergePortfolioPersistedState(persistedState, currentState),
  onRehydrateStorage: () => (state, error) => {
    if (error || !state || !Array.isArray(state.rentals)) return;
    const hasNegative = state.rentals.some(
      (r) =>
        r &&
        ((typeof r.arrearsOpeningBalanceZAR === 'number' && r.arrearsOpeningBalanceZAR < 0) ||
          (r.leases || []).some(
            (l) => l && typeof l.arrearsOpeningBalanceZAR === 'number' && l.arrearsOpeningBalanceZAR < 0
          ))
    );
    if (hasNegative) {
      const healed = state.rentals.map((r) => (r ? migrateNegativeArrearsToRental(r) : r));
      if (storeStateSetter) {
        storeStateSetter({ rentals: healed });
      } else {
        state.rentals = healed;
      }
    }
  },
};
