import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RootStoreState, PortfolioState } from './types';
import { createRentalSlice } from './slices/rentalSlice';
import { createFlipSlice } from './slices/flipSlice';
import { createOpportunitySlice } from './slices/opportunitySlice';
import { createFundingSlice } from './slices/fundingSlice';
import { createUtilitiesSlice } from './slices/utilitiesSlice';
import { createTenantAccountingSlice } from './slices/tenantAccountingSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createDirectorySlice } from './slices/directorySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createSystemSlice } from './slices/systemSlice';
import {
  portfolioPersistConfig,
  registerStoreForMigration,
} from './persistence/portfolioMigrations';

export const usePortfolioStore = create<RootStoreState>()(
  persist(
    (...a) => ({
      ...createRentalSlice(...a),
      ...createFlipSlice(...a),
      ...createOpportunitySlice(...a),
      ...createFundingSlice(...a),
      ...createUtilitiesSlice(...a),
      ...createTenantAccountingSlice(...a),
      ...createTaskSlice(...a),
      ...createDirectorySlice(...a),
      ...createSettingsSlice(...a),
      ...createSystemSlice(...a),
    }),
    portfolioPersistConfig
  )
);

registerStoreForMigration(usePortfolioStore);

// Preserve 100% backward-compatible named re-exports
export {
  computePortfolioSummary,
  usePortfolioSummary,
  computeEquityAlerts,
} from './selectors/portfolioSummarySelector';
export { syncLeaseExpiryTasks, syncAgmReminderTask } from './utils/taskSync';
export { sanitizeCompletedGuideSteps } from './persistence/hydrationHelpers';
export type { RootStoreState, PortfolioState };
