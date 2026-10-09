import { StateCreator } from 'zustand';
import {
  RentalProperty,
  ExtractedRentalUnit,
  RentalRefinanceParams,
  FlipProject,
  BOQItem,
  FlipToRentalConversionParams,
  OpportunityDeal,
  PassReason,
  FundingSource,
  UtilityStatement,
  MeterReading,
  PropertyMeter,
  TenantPaymentRecord,
  ArrearsWriteOff,
  Transaction,
  TaskItem,
  LocalSupplier,
  MunicipalContact,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
  PortfolioSummary,
} from '@/types';
import type { PortfolioStateSnapshot } from '@/lib/db/mergePortfolioState';

// 1. Rental Slice
export interface RentalSliceState {
  rentals: RentalProperty[];
}
export interface RentalSliceActions {
  addRental: (rental: RentalProperty) => void;
  bulkAddRentals: (rentals: RentalProperty[]) => { addedCount: number; duplicateCount: number };
  reconcileImportedRentals: (units: ExtractedRentalUnit[]) => {
    updatedCount: number;
    newCount: number;
    addedCount: number;
    varianceCount: number;
  };
  updateRental: (id: string, updates: Partial<RentalProperty>) => void;
  deleteRental: (id: string) => void;
  addMaintenanceLog: (rentalId: string, log: Omit<RentalProperty['maintenanceHistory'][0], 'id'>) => void;
  markRentalAsSold: (rentalId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenRental: (rentalId: string) => void;
  refinanceRental: (params: RentalRefinanceParams) => void;
}
export type RentalSlice = RentalSliceState & RentalSliceActions;

// 2. Flip Slice
export interface FlipSliceState {
  flips: FlipProject[];
}
export interface FlipSliceActions {
  addFlip: (flip: FlipProject) => void;
  bulkAddFlips: (flips: FlipProject[]) => { addedCount: number; duplicateCount: number };
  updateFlip: (id: string, updates: Partial<FlipProject>) => void;
  deleteFlip: (id: string) => void;
  addBOQItem: (flipId: string, item: Omit<BOQItem, 'id'>) => void;
  updateBOQItem: (flipId: string, boqId: string, updates: Partial<BOQItem>) => void;
  deleteBOQItem: (flipId: string, boqId: string) => void;
  markFlipAsCompleted: (flipId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenFlip: (flipId: string) => void;
  convertFlipToRental: (params: FlipToRentalConversionParams) => RentalProperty;
}
export type FlipSlice = FlipSliceState & FlipSliceActions;

// 3. Opportunity Slice
export interface OpportunitySliceState {
  opportunities: OpportunityDeal[];
}
export interface OpportunitySliceActions {
  addOpportunity: (opp: OpportunityDeal) => void;
  bulkAddOpportunities: (opps: OpportunityDeal[]) => { addedCount: number; duplicateCount: number };
  updateOpportunity: (id: string, updates: Partial<OpportunityDeal>) => void;
  deleteOpportunity: (id: string) => void;
  duplicateOpportunity: (oppId: string) => void;
  passOpportunity: (id: string, reason: PassReason, notes?: string) => void;
  reactivateOpportunity: (id: string) => void;
  advanceOpportunityStage: (id: string) => void;
  promoteOpportunityToFlip: (oppId: string) => void;
  promoteOpportunityToRental: (oppId: string) => void;
}
export type OpportunitySlice = OpportunitySliceState & OpportunitySliceActions;

// 4. Funding Slice
export interface FundingSliceState {
  funding: FundingSource[];
}
export interface FundingSliceActions {
  addFunding: (source: FundingSource) => void;
  updateFunding: (id: string, updates: Partial<FundingSource>) => void;
  deleteFunding: (id: string) => void;
  syncFundingWithDealDelay: (fundingId: string, delayDays: number, reason: string) => void;
}
export type FundingSlice = FundingSliceState & FundingSliceActions;

// 5. Utilities Slice
export interface UtilitiesSliceActions {
  addUtilityStatement: (propertyId: string, statement: UtilityStatement) => void;
  deleteUtilityStatement: (propertyId: string, statementId: string) => void;
  setStatementTenantBillingMethod: (propertyId: string, statementId: string, method: 'municipal_statement' | 'independent_actuals') => void;
  addMeterReading: (propertyId: string, reading: Omit<MeterReading, 'id' | 'createdAt'>) => void;
  deleteMeterReading: (propertyId: string, readingId: string) => void;
  updateMeterReadingDispute: (propertyId: string, readingId: string, disputeData: Partial<MeterReading>) => void;
  addPropertyMeter: (propertyId: string, meter: Omit<PropertyMeter, 'id' | 'createdAt'>) => void;
  updatePropertyMeter: (propertyId: string, meterId: string, updates: Partial<PropertyMeter>) => void;
  deletePropertyMeter: (propertyId: string, meterId: string) => void;
}
export type UtilitiesSlice = UtilitiesSliceActions;

// 6. Tenant Accounting Slice
export interface TenantAccountingSliceActions {
  recordTenantPayment: (
    propertyId: string,
    payment: Omit<TenantPaymentRecord, 'id' | 'createdAt' | 'propertyId'> & {
      id?: string;
      propertyId?: string;
    }
  ) => void;
  updateTenantPayment: (propertyId: string, paymentId: string, updates: Partial<TenantPaymentRecord>) => void;
  deleteTenantPayment: (propertyId: string, paymentId: string) => void;
  recordArrearsWriteOff: (
    propertyId: string,
    writeOff: Omit<ArrearsWriteOff, 'id' | 'createdAt'> & {
      id?: string;
    }
  ) => void;
  deleteArrearsWriteOff: (propertyId: string, writeOffId: string) => void;
  updateArrearsOpeningBalance: (propertyId: string, openingBalance: number, leaseId?: string) => void;
  addTransaction: (propertyId: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (propertyId: string, transactionId: string) => void;
}
export type TenantAccountingSlice = TenantAccountingSliceActions;

// 7. Task Slice
export interface TaskSliceState {
  tasks: TaskItem[];
}
export interface TaskSliceActions {
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  toggleTaskStatus: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
}
export type TaskSlice = TaskSliceState & TaskSliceActions;

// 8. Directory Slice
export interface DirectorySliceState {
  suppliers: LocalSupplier[];
  municipalDirectory: MunicipalContact[];
}
export interface DirectorySliceActions {
  addSupplier: (supplier: LocalSupplier) => void;
  deleteSupplier: (id: string) => void;
  addMunicipalContact: (contact: Omit<MunicipalContact, 'id'>) => void;
  updateMunicipalContact: (id: string, updates: Partial<MunicipalContact>) => void;
  deleteMunicipalContact: (id: string) => void;
  resetMunicipalDirectory: () => void;
}
export type DirectorySlice = DirectorySliceState & DirectorySliceActions;

// 9. Settings Slice
export interface SettingsSliceState {
  liquidCapitalReserve: number;
  investorProfile: InvestorProfile;
  analyzerDraft: AnalyzerDraft;
  aiSettings: AiSettings;
  rentalForecastView: 'wealth-only' | 'cashflow-only';
  completedGuideSteps: string[];
}
export interface SettingsSliceActions {
  updateLiquidReserve: (amount: number) => void;
  updateInvestorProfile: (profile: Partial<InvestorProfile>) => void;
  updateAiSettings: (settings: Partial<AiSettings>) => void;
  updateAnalyzerDraft: (patch: Partial<AnalyzerDraft>) => void;
  setRentalForecastView: (mode: 'wealth-only' | 'cashflow-only') => void;
  toggleGuideStep: (stepId: string) => void;
  resetGuideProgress: () => void;
}
export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

// 10. System Slice
export interface SystemSliceActions {
  getSummary: () => PortfolioSummary;
  hydrateFromCloudState: (snapshot: PortfolioStateSnapshot) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importPortfolioJSON: (jsonString: string) => boolean;
}
export type SystemSlice = SystemSliceActions;

// Root Store Combined Type
export type RootStoreState = RentalSlice &
  FlipSlice &
  OpportunitySlice &
  FundingSlice &
  UtilitiesSlice &
  TenantAccountingSlice &
  TaskSlice &
  DirectorySlice &
  SettingsSlice &
  SystemSlice;

// Backward-compatible alias
export type PortfolioState = RootStoreState;

// Slice creator helper type adhering to Zustand persist pattern
export type StoreSlice<TSlice> = StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  TSlice
>;
