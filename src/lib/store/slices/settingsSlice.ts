import { StateCreator } from 'zustand';
import { InvestorProfile, AnalyzerDraft, AiSettings } from '@/types';
import { RootStoreState, SettingsSlice } from '../types';
import {
  INITIAL_INVESTOR_PROFILE,
  INITIAL_ANALYZER_DRAFT,
  DEFAULT_AI_SETTINGS,
  DEFAULT_ANALYZER_SECTION_ORDER,
  NAPKIN_VISIBLE_ANALYZER_SECTIONS,
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
  analyzerSectionOrder: [...DEFAULT_ANALYZER_SECTION_ORDER],
  hiddenAnalyzerSections: [],

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

  toggleAnalyzerSectionVisibility: (id) =>
    set((state) => ({
      hiddenAnalyzerSections: state.hiddenAnalyzerSections.includes(id)
        ? state.hiddenAnalyzerSections.filter((sectionId) => sectionId !== id)
        : [...state.hiddenAnalyzerSections, id],
    })),

  moveAnalyzerSection: (id, direction) =>
    set((state) => {
      const order = [...state.analyzerSectionOrder];
      const index = order.indexOf(id);
      if (index === -1) return state;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return state;
      const temp = order[index];
      order[index] = order[targetIndex];
      order[targetIndex] = temp;
      return { analyzerSectionOrder: order };
    }),

  applyAnalyzerLayoutPreset: (preset) =>
    set(() => {
      if (preset === 'napkin') {
        const hidden = DEFAULT_ANALYZER_SECTION_ORDER.filter(
          (id) => !NAPKIN_VISIBLE_ANALYZER_SECTIONS.includes(id)
        );
        return {
          hiddenAnalyzerSections: hidden,
        };
      }
      return {
        analyzerSectionOrder: [...DEFAULT_ANALYZER_SECTION_ORDER],
        hiddenAnalyzerSections: [],
      };
    }),
});
