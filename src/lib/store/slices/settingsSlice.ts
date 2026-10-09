import { StateCreator } from 'zustand';
import { InvestorProfile, AnalyzerDraft, AiSettings } from '@/types';
import { RootStoreState, SettingsSlice } from '../types';
import {
  INITIAL_INVESTOR_PROFILE,
  INITIAL_ANALYZER_DRAFT,
  DEFAULT_AI_SETTINGS,
} from '../initialData';

export const createSettingsSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  SettingsSlice
> = (set) => ({
  liquidCapitalReserve: 650_000,
  investorProfile: INITIAL_INVESTOR_PROFILE,
  analyzerDraft: INITIAL_ANALYZER_DRAFT,
  aiSettings: DEFAULT_AI_SETTINGS,
  rentalForecastView: 'wealth-only',
  completedGuideSteps: [],

  toggleGuideStep: (stepId) => {
    if (typeof stepId !== 'string' || stepId.trim().length === 0) return;
    set((state) => ({
      completedGuideSteps: state.completedGuideSteps.includes(stepId)
        ? state.completedGuideSteps.filter((id) => id !== stepId)
        : [...state.completedGuideSteps, stepId],
    }));
  },

  resetGuideProgress: () => set({ completedGuideSteps: [] }),

  setRentalForecastView: (mode) => set({ rentalForecastView: mode }),

  updateAiSettings: (updates) =>
    set((state) => ({
      aiSettings: { ...state.aiSettings, ...updates },
    })),

  updateInvestorProfile: (updates) =>
    set((state) => ({
      investorProfile: { ...state.investorProfile, ...updates },
    })),

  updateAnalyzerDraft: (patch) =>
    set((state) => ({
      analyzerDraft: { ...state.analyzerDraft, ...patch },
    })),

  updateLiquidReserve: (amount) => set({ liquidCapitalReserve: amount }),
});
