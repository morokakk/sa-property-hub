import { StateCreator } from 'zustand';
import { PortfolioSummary } from '@/types';
import type { PortfolioStateSnapshot } from '@/lib/db/mergePortfolioState';
import { RootStoreState, SystemSlice } from '../types';
import { normalizeAiModel } from '@/lib/ai/modelConfig';
import { computePortfolioSummary } from '../selectors/portfolioSummarySelector';
import {
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_FUNDING,
  INITIAL_OPPORTUNITIES,
  INITIAL_SUPPLIERS,
  INITIAL_TASKS,
  INITIAL_MUNICIPAL_DIRECTORY,
  INITIAL_INVESTOR_PROFILE,
  INITIAL_ANALYZER_DRAFT,
  EMPTY_ANALYZER_DRAFT,
  DEFAULT_AI_SETTINGS,
} from '../initialData';

export const createSystemSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  SystemSlice
> = (set, get) => ({
  getSummary: (): PortfolioSummary => {
    return computePortfolioSummary(get());
  },

  hydrateFromCloudState: (snapshot: PortfolioStateSnapshot) =>
    set((state) => ({
      rentals: snapshot.rentals ?? state.rentals,
      flips: snapshot.flips ?? state.flips,
      funding: snapshot.funding ?? state.funding,
      opportunities: snapshot.opportunities ?? state.opportunities,
      suppliers: snapshot.suppliers ?? state.suppliers,
      tasks: snapshot.tasks ?? state.tasks,
      municipalDirectory: (snapshot as any).municipalDirectory ?? state.municipalDirectory,
      investorProfile: snapshot.investorProfile ?? state.investorProfile,
      liquidCapitalReserve:
        snapshot.liquidCapitalReserve !== undefined
          ? snapshot.liquidCapitalReserve
          : state.liquidCapitalReserve,
      rentalForecastView: snapshot.rentalForecastView ?? state.rentalForecastView,
      aiSettings: snapshot.aiSettings
        ? {
            ...snapshot.aiSettings,
            model: normalizeAiModel(snapshot.aiSettings.model),
          }
        : state.aiSettings,
      analyzerDraft: snapshot.analyzerDraft ?? state.analyzerDraft,
    })),

  resetToDemoData: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('cloud_sync_completed');
        window.localStorage.removeItem('cloud_sync_timestamp');
      } catch (e) {
        console.error('Failed to clear cloud sync localStorage keys', e);
      }
    }
    set({
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      funding: INITIAL_FUNDING,
      opportunities: INITIAL_OPPORTUNITIES,
      suppliers: INITIAL_SUPPLIERS,
      tasks: INITIAL_TASKS,
      municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
      liquidCapitalReserve: 650_000,
      investorProfile: INITIAL_INVESTOR_PROFILE,
      analyzerDraft: INITIAL_ANALYZER_DRAFT,
      aiSettings: DEFAULT_AI_SETTINGS,
      rentalForecastView: 'wealth-only',
    });
  },

  clearAllData: () =>
    set((state) => ({
      rentals: [],
      flips: [],
      funding: [],
      opportunities: [],
      tasks: [],
      municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
      liquidCapitalReserve: 0,
      analyzerDraft: EMPTY_ANALYZER_DRAFT,
      // Preserve South African trade suppliers directory for immediate BOQ contractor selection
      suppliers: state.suppliers.length > 0 ? state.suppliers : INITIAL_SUPPLIERS,
    })),

  importPortfolioJSON: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        set({
          rentals: parsed.rentals || [],
          flips: parsed.flips || [],
          funding: parsed.funding || [],
          opportunities: parsed.opportunities || [],
          suppliers: parsed.suppliers || [],
          tasks: parsed.tasks || [],
          municipalDirectory: parsed.municipalDirectory || INITIAL_MUNICIPAL_DIRECTORY,
          liquidCapitalReserve: parsed.liquidCapitalReserve || 0,
          investorProfile: parsed.investorProfile || INITIAL_INVESTOR_PROFILE,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse portfolio JSON', e);
      return false;
    }
  },
});
