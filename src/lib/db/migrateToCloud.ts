import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
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
  DEMO_RENTAL_IDS,
  DEMO_FLIP_IDS,
  DEMO_OPP_IDS,
  DEMO_FUNDING_IDS,
  DEMO_TASK_IDS,
  DEMO_SUPPLIER_IDS,
} from './mergePortfolioState';
import {
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_OPPORTUNITIES,
  INITIAL_FUNDING,
  INITIAL_TASKS,
  INITIAL_SUPPLIERS,
  INITIAL_INVESTOR_PROFILE,
} from '@/lib/store/initialData';

export function isStockDemoState(state?: PortfolioMigrationPayload | null): boolean {
  if (!state) return false;

  const rentals = state.rentals || [];
  const flips = state.flips || [];
  const opps = state.opportunities || [];
  const funding = state.funding || [];
  const tasks = state.tasks || [];
  const suppliers = state.suppliers || [];

  if (
    rentals.length === 0 &&
    flips.length === 0 &&
    opps.length === 0 &&
    funding.length === 0 &&
    tasks.length === 0 &&
    suppliers.length === 0
  ) {
    return false;
  }

  // If any provided collection count differs from initial demo data, the user has removed or added items
  if (state.rentals !== undefined && rentals.length !== INITIAL_RENTALS.length) return false;
  if (state.flips !== undefined && flips.length !== INITIAL_FLIPS.length) return false;
  if (state.opportunities !== undefined && opps.length !== INITIAL_OPPORTUNITIES.length) return false;
  if (state.funding !== undefined && funding.length !== INITIAL_FUNDING.length) return false;
  if (state.tasks !== undefined && tasks.length !== INITIAL_TASKS.length) return false;
  if (state.suppliers !== undefined && suppliers.length !== INITIAL_SUPPLIERS.length) return false;

  const hasCustomRentals = rentals.some((r) => !DEMO_RENTAL_IDS.has(r.id));
  const hasCustomFlips = flips.some((f) => !DEMO_FLIP_IDS.has(f.id));
  const hasCustomOpps = opps.some((o) => !DEMO_OPP_IDS.has(o.id));
  const hasCustomFunding = funding.some((f) => !DEMO_FUNDING_IDS.has(f.id));
  const hasCustomTasks = tasks.some((t) => !DEMO_TASK_IDS.has(t.id));
  const hasCustomSuppliers = suppliers.some((s) => !DEMO_SUPPLIER_IDS.has(s.id));

  if (
    hasCustomRentals ||
    hasCustomFlips ||
    hasCustomOpps ||
    hasCustomFunding ||
    hasCustomTasks ||
    hasCustomSuppliers
  ) {
    return false;
  }

  if (
    state.investorProfile?.entityName &&
    state.investorProfile.entityName !== INITIAL_INVESTOR_PROFILE.entityName &&
    state.investorProfile.entityName !== 'Portfolio Owner'
  ) {
    return false;
  }

  const initialRentalsMap = new Map(INITIAL_RENTALS.map((r) => [r.id, r]));
  const isAnyRentalModified = rentals.some((r) => {
    const orig = initialRentalsMap.get(r.id);
    if (!orig) return true;
    return (
      r.title !== orig.title ||
      r.address !== orig.address ||
      r.marketValueZAR !== orig.marketValueZAR ||
      r.purchasePriceZAR !== orig.purchasePriceZAR ||
      r.monthlyGrossRentZAR !== orig.monthlyGrossRentZAR ||
      r.outstandingBondBalanceZAR !== orig.outstandingBondBalanceZAR
    );
  });
  if (isAnyRentalModified) return false;

  const initialFlipsMap = new Map(INITIAL_FLIPS.map((f) => [f.id, f]));
  const isAnyFlipModified = flips.some((f) => {
    const orig = initialFlipsMap.get(f.id);
    if (!orig) return true;
    return (
      f.title !== orig.title ||
      f.address !== orig.address ||
      f.purchasePriceZAR !== orig.purchasePriceZAR ||
      f.baselineRenovationBudgetZAR !== orig.baselineRenovationBudgetZAR ||
      f.targetExitPriceZAR !== orig.targetExitPriceZAR
    );
  });
  if (isAnyFlipModified) return false;

  const initialOppsMap = new Map(INITIAL_OPPORTUNITIES.map((o) => [o.id, o]));
  const isAnyOppModified = opps.some((o) => {
    const orig = initialOppsMap.get(o.id);
    if (!orig) return true;
    return (
      o.title !== orig.title ||
      o.purchasePrice !== orig.purchasePrice ||
      o.openMarketValueZAR !== orig.openMarketValueZAR
    );
  });
  if (isAnyOppModified) return false;

  const initialTasksMap = new Map(INITIAL_TASKS.map((t) => [t.id, t]));
  const isAnyTaskModified = tasks.some((t) => {
    const orig = initialTasksMap.get(t.id);
    if (!orig) return true;
    return t.title !== orig.title || t.status !== orig.status;
  });
  if (isAnyTaskModified) return false;

  return true;
}

export interface PortfolioMigrationPayload {
  rentals?: RentalProperty[];
  flips?: FlipProject[];
  funding?: FundingSource[];
  opportunities?: OpportunityDeal[];
  suppliers?: LocalSupplier[];
  tasks?: TaskItem[];
  liquidCapitalReserve?: number;
  investorProfile?: InvestorProfile;
  analyzerDraft?: AnalyzerDraft;
  aiSettings?: AiSettings;
  rentalForecastView?: 'wealth-only' | 'cashflow-only';
}

export interface MigrationCounts {
  profile: number;
  properties: number;
  flips: number;
  boqItems: number;
  fundingSources: number;
  opportunities: number;
  tasks: number;
  suppliers: number;
}

export interface MigrationResult {
  success: boolean;
  counts: MigrationCounts;
  error?: string;
}

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type FlipInsert = Database['public']['Tables']['flips']['Insert'];
type BOQItemInsert = Database['public']['Tables']['boq_items']['Insert'];
type FundingSourceInsert = Database['public']['Tables']['funding_sources']['Insert'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];

/**
 * Format string dates to PostgreSQL YYYY-MM-DD
 */
export function toDateOnly(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

function toNumeric(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function toNullableNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function toNullableInteger(val: unknown): number | null {
  const n = toNullableNumeric(val);
  return n != null ? Math.round(n) : null;
}

function toInteger(val: unknown, fallback = 0): number {
  return Math.round(toNumeric(val, fallback));
}

export function mapProfile(
  investorProfile: InvestorProfile | undefined,
  extra: {
    liquidCapitalReserve?: number;
    rentalForecastView?: 'wealth-only' | 'cashflow-only';
    aiSettings?: AiSettings;
    analyzerDraft?: AnalyzerDraft;
  },
  userId: string,
  userEmail?: string
): ProfileInsert {
  const profile = investorProfile || ({} as Partial<InvestorProfile>);
  return {
    id: userId,
    user_id: userId,
    entity_name: profile.entityName || 'Portfolio Owner',
    trading_as: profile.tradingAs || null,
    registration_or_id: profile.registrationOrId || null,
    contact_number: profile.contactNumber || null,
    email: profile.email || userEmail || null,
    website: profile.website || null,
    physical_address: profile.physicalAddress || null,
    logo_base64: profile.logoBase64 || null,
    bio_summary: profile.bioSummary || '',
    default_prime_rate_percent: toNumeric(profile.defaultPrimeRatePercent, 11.75),
    baseline_hurdle_yield_percent: toNumeric(profile.baselineHurdleYieldPercent, 10.0),
    default_agent_commission_percent: toNumeric(profile.defaultAgentCommissionPercent, 5.0),
    default_tax_entity_type: profile.defaultTaxEntityType || 'Company (27%)',
    liquid_capital_reserve_zar: toNumeric(extra.liquidCapitalReserve, 0),
    rental_forecast_view: extra.rentalForecastView || 'wealth-only',
    ai_settings: (extra.aiSettings as any) || null,
    analyzer_draft: (extra.analyzerDraft as any) || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapRentals(rentals: RentalProperty[] = [], userId: string): PropertyInsert[] {
  return rentals.map((r, index) => ({
    id: r.id || `rental-${index + 1}-${Date.now()}`,
    user_id: userId,
    title: r.title || 'Untitled Rental',
    address: r.address || '',
    city: r.city || 'Johannesburg',
    property_type: r.propertyType || null,
    source: r.source || null,
    agm_date: toDateOnly(r.agmDate),
    market_value_zar: toNumeric(r.marketValueZAR, 0),
    purchase_price_zar: toNumeric(r.purchasePriceZAR, 0),
    purchase_date: toDateOnly(r.purchaseDate),
    outstanding_bond_balance_zar: toNumeric(r.outstandingBondBalanceZAR, 0),
    bond_interest_rate_percent: toNumeric(r.bondInterestRatePercent, 0),
    monthly_bond_payment_zar: toNumeric(r.monthlyBondPaymentZAR, 0),
    bond_payment_effective_date: r.bondPaymentEffectiveDate || null,
    bond_revision_note: r.bondRevisionNote || null,
    leases: (r.leases ? JSON.parse(JSON.stringify(r.leases)) : []) as any,
    management_type: r.managementType || null,
    agency_name: r.agencyName || null,
    agency_commission_percent: toNullableNumeric(r.agencyCommissionPercent),
    agency_vat_applicable: r.agencyVatApplicable ?? null,
    agency_contact: r.agencyContact || null,
    monthly_gross_rent_zar: toNumeric(r.monthlyGrossRentZAR, 0),
    monthly_levies_zar: toNumeric(r.monthlyLeviesZAR, 0),
    monthly_rates_taxes_zar: toNumeric(r.monthlyRatesTaxesZAR, 0),
    monthly_agent_fee_zar: toNumeric(r.monthlyAgentFeeZAR, 0),
    monthly_maintenance_reserve_zar: toNumeric(r.monthlyMaintenanceReserveZAR, 0),
    annual_building_insurance_zar: toNullableNumeric(r.annualBuildingInsuranceZAR),
    unpaid_utility_arrears_zar: toNullableNumeric(r.unpaidUtilityArrearsZAR),
    arrears_opening_balance_zar: toNullableNumeric(r.arrearsOpeningBalanceZAR),
    payment_records: (r.paymentRecords ? JSON.parse(JSON.stringify(r.paymentRecords)) : []) as any,
    maintenance_history: (r.maintenanceHistory ? JSON.parse(JSON.stringify(r.maintenanceHistory)) : []) as any,
    status: r.status || 'Occupied',
    coc_checklist: (r.cocChecklist ? JSON.parse(JSON.stringify(r.cocChecklist)) : {}) as any,
    drive_vault: (r.driveVault ? JSON.parse(JSON.stringify(r.driveVault)) : {}) as any,
    notes: r.notes || null,
    actual_sale_price_zar: toNullableNumeric(r.actualSalePriceZAR),
    net_cash_proceeds_zar: toNullableNumeric(r.netCashProceedsZAR),
    sold_date: toDateOnly(r.soldDate),
    exit_notes: r.exitNotes || null,
    converted_from_flip_id: r.convertedFromFlipId || null,
    is_brrrr_property: r.isBrrrrProperty ?? null,
    total_equity_extracted_zar: toNullableNumeric(r.totalEquityExtractedZAR),
    refinance_history: (r.refinanceHistory ? JSON.parse(JSON.stringify(r.refinanceHistory)) : []) as any,
    utility_statements: (r.utilityStatements ? JSON.parse(JSON.stringify(r.utilityStatements)) : []) as any,
    meter_readings: (r.meterReadings ? JSON.parse(JSON.stringify(r.meterReadings)) : []) as any,
    tax_entity_type_override: r.taxEntityTypeOverride || null,
    section_13sex_annual_shield_zar: toNullableNumeric(r.section13sexAnnualShieldZAR),
    utility_type: r.utilityType || null,
    prepaid_vendor_name: r.prepaidVendorName || null,
    monthly_prepaid_vending_fee_zar: toNullableNumeric(r.monthlyPrepaidVendingFeeZAR),
    ancillary_incomes: (r.ancillaryIncomes ? JSON.parse(JSON.stringify(r.ancillaryIncomes)) : []) as any,
    updated_at: new Date().toISOString(),
  }));
}

export function mapFlips(flips: FlipProject[] = [], userId: string): FlipInsert[] {
  return flips.map((f, index) => ({
    id: f.id || `flip-${index + 1}-${Date.now()}`,
    user_id: userId,
    title: f.title || 'Untitled Flip',
    address: f.address || '',
    city: f.city || 'Johannesburg',
    property_type: f.propertyType || null,
    agm_date: toDateOnly(f.agmDate),
    purchase_date: toDateOnly(f.purchaseDate),
    purchase_price_zar: toNumeric(f.purchasePriceZAR, 0),
    acquisition_costs_zar: toNumeric(f.acquisitionCostsZAR, 0),
    baseline_renovation_budget_zar: toNumeric(f.baselineRenovationBudgetZAR, 0),
    strategy: f.strategy || null,
    source: f.source || null,
    estimated_duration_months: toNullableInteger(f.estimatedDurationMonths),
    monthly_holding_cost_zar: toNullableNumeric(f.monthlyHoldingCostZAR),
    monthly_bond_payment_zar: toNullableNumeric(f.monthlyBondPaymentZAR),
    monthly_levies_zar: toNullableNumeric(f.monthlyLeviesZAR),
    monthly_rates_taxes_zar: toNullableNumeric(f.monthlyRatesTaxesZAR),
    monthly_other_holding_cost_zar: toNullableNumeric(f.monthlyOtherHoldingCostZAR),
    municipal_valuation_zar: toNullableNumeric(f.municipalValuationZAR),
    bond_payment_effective_date: f.bondPaymentEffectiveDate || null,
    target_exit_price_zar: toNumeric(f.targetExitPriceZAR, 0),
    exit_commission_percent: toNullableNumeric(f.exitCommissionPercent),
    target_completion_date: toDateOnly(f.targetCompletionDate),
    current_phase: f.currentPhase || null,
    linked_funding_ids: f.linkedFundingIds || [],
    status: f.status || 'Active',
    notes: f.notes || null,
    coc_checklist: (f.cocChecklist ? JSON.parse(JSON.stringify(f.cocChecklist)) : {}) as any,
    drive_vault: (f.driveVault ? JSON.parse(JSON.stringify(f.driveVault)) : {}) as any,
    funding_required_zar: toNullableNumeric(f.fundingRequiredZAR),
    capital_raised_zar: toNullableNumeric(f.capitalRaisedZAR),
    primary_funder_name: f.primaryFunderName || null,
    primary_funder_contact: f.primaryFunderContact || null,
    primary_funder_type: f.primaryFunderType || null,
    co_funders_notes: f.coFundersNotes || null,
    promised_return_type: f.promisedReturnType || null,
    promised_return_rate_percent: toNullableNumeric(f.promisedReturnRatePercent),
    promised_payout_schedule: f.promisedPayoutSchedule || null,
    security_offered: f.securityOffered || null,
    actual_sale_price_zar: toNullableNumeric(f.actualSalePriceZAR),
    net_cash_proceeds_zar: toNullableNumeric(f.netCashProceedsZAR),
    sold_date: toDateOnly(f.soldDate),
    exit_notes: f.exitNotes || null,
    exit_strategy: f.exitStrategy || null,
    converted_to_rental_id: f.convertedToRentalId || null,
    tax_entity_type: f.taxEntityType || null,
    municipal_clearance: (f.municipalClearance ? JSON.parse(JSON.stringify(f.municipalClearance)) : {}) as any,
    draw_schedule: (f.drawSchedule ? JSON.parse(JSON.stringify(f.drawSchedule)) : {}) as any,
    updated_at: new Date().toISOString(),
  }));
}

export function extractAndMapBOQItems(flips: FlipProject[] = [], userId: string): BOQItemInsert[] {
  const items: BOQItemInsert[] = [];
  const validFlipIds = new Set(flips.map((f) => f.id).filter(Boolean));
  const seenIds = new Set<string>();

  for (const flip of flips) {
    if (!flip.id || !validFlipIds.has(flip.id)) continue;
    if (Array.isArray(flip.boq)) {
      for (let i = 0; i < flip.boq.length; i++) {
        const item = flip.boq[i];
        if (!item) continue;
        let itemId = item.id?.trim();
        if (!itemId || seenIds.has(itemId)) {
          itemId = `${flip.id}-boq-${i + 1}-${Math.random().toString(36).slice(2, 7)}`;
        }
        seenIds.add(itemId);

        items.push({
          id: itemId,
          flip_id: flip.id,
          user_id: userId,
          category: item.category || 'Demolition & Prep',
          item_description: item.itemDescription || 'BOQ Line Item',
          unit: item.unit || 'units',
          quantity: toNumeric(item.quantity, 1),
          baseline_unit_cost_zar: toNumeric(item.baselineUnitCostZAR, 0),
          baseline_total_zar: toNumeric(item.baselineTotalZAR, 0),
          actual_cost_zar: toNumeric(item.actualCostZAR, 0),
          variance_zar: toNumeric(item.varianceZAR, 0),
          supplier_or_contractor: item.supplierOrContractor || 'Unassigned',
          status: item.status || 'Not Started',
          invoice_ref: item.invoiceRef || null,
          milestone_phase: item.milestonePhase || null,
          retention_percent: toNullableNumeric(item.retentionPercent),
          is_sponsored_or_barter: item.isSponsoredOrBarter ?? null,
          commercial_retail_value_zar: toNullableNumeric(item.commercialRetailValueZAR),
          actual_cash_outflow_zar: toNullableNumeric(item.actualCashOutflowZAR),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
  return items;
}

export function mapFundingSources(funding: FundingSource[] = [], userId: string): FundingSourceInsert[] {
  return funding.map((fs, index) => ({
    id: fs.id || `fund-${index + 1}-${Date.now()}`,
    user_id: userId,
    lender_name: fs.lenderName || 'Lender',
    entity_or_contact: fs.entityOrContact || '',
    email_phone: fs.emailPhone || '',
    funding_type: fs.fundingType || 'Private Lender',
    capital_amount_zar: toNumeric(fs.capitalAmountZAR, 0),
    disbursement_date: toDateOnly(fs.disbursementDate) || new Date().toISOString().split('T')[0],
    maturity_date: toDateOnly(fs.maturityDate) || new Date().toISOString().split('T')[0],
    return_terms_type: fs.returnTermsType || 'Fixed Interest',
    return_rate_percent: toNumeric(fs.returnRatePercent, 0),
    payment_schedule: fs.paymentSchedule || 'Monthly Interest',
    linked_deal_id: fs.linkedDealId || null,
    linked_deal_name: fs.linkedDealName || null,
    total_repaid_zar: toNumeric(fs.totalRepaidZAR, 0),
    total_interest_paid_zar: toNullableNumeric(fs.totalInterestPaidZAR),
    status: fs.status || 'Active',
    notes: fs.notes || null,
    tranches: (fs.tranches ? JSON.parse(JSON.stringify(fs.tranches)) : []) as any,
    delay_extension_days: toNullableInteger(fs.delayExtensionDays),
    original_maturity_date: toDateOnly(fs.originalMaturityDate),
    delay_notes: fs.delayNotes || null,
    updated_at: new Date().toISOString(),
  }));
}

export function mapOpportunities(opportunities: OpportunityDeal[] = [], userId: string): OpportunityInsert[] {
  return opportunities.map((opp, index) => ({
    id: opp.id || `opp-${index + 1}-${Date.now()}`,
    user_id: userId,
    title: opp.title || 'Untitled Opportunity',
    address: opp.address || '',
    city: opp.city || 'Johannesburg',
    province: opp.province || 'Gauteng',
    property_type: opp.propertyType || null,
    agm_date: toDateOnly(opp.agmDate),
    source: opp.source || 'Direct Owner',
    open_market_value_zar: toNumeric(opp.openMarketValueZAR, 0),
    purchase_price_zar: toNumeric(opp.purchasePrice, 0),
    built_in_equity_zar: toNumeric(opp.builtInEquityZAR, 0),
    built_in_equity_percent: toNumeric(opp.builtInEquityPercent, 0),
    estimated_rehab_cost_zar: toNumeric(opp.estimatedRehabCost, 0),
    monthly_rental_estimate_zar: toNumeric(opp.monthlyRentalEstimate, 0),
    monthly_levies_zar: toNumeric(opp.monthlyLevies, 0),
    monthly_rates_taxes_zar: toNumeric(opp.monthlyRatesTaxes, 0),
    annual_insurance_zar: toNumeric(opp.annualInsurance, 0),
    management_fee_percent: toNumeric(opp.managementFeePercent, 8.0),
    agency_vat_applicable: opp.agencyVatApplicable ?? true,
    vacancy_rate_percent: toNumeric(opp.vacancyRatePercent, 5.0),
    target_exit_price_zar: toNumeric(opp.targetExitPrice, 0),
    exit_commission_percent: toNumeric(opp.exitCommissionPercent, 5.75),
    holding_period_months: toInteger(opp.holdingPeriodMonths, 6),
    strategy: opp.strategy || 'Rental',
    monthly_holding_cost_zar: toNumeric(opp.monthlyHoldingCostZAR, 0),
    monthly_bond_payment_zar: toNumeric(opp.monthlyBondPaymentZAR, 0),
    monthly_other_holding_cost_zar: toNumeric(opp.monthlyOtherHoldingCostZAR, 0),
    loan_to_value_percent: toNumeric(opp.loanToValuePercent, 80.0),
    bond_ltv: toNumeric(opp.bondLTV, 80.0),
    deposit_zar: toNumeric(opp.depositZAR, 0),
    interest_rate_percent: toNumeric(opp.interestRatePercent, 11.75),
    loan_term_years: toInteger(opp.loanTermYears, 20),
    annual_capital_growth_percent: toNumeric(opp.annualCapitalGrowthPercent, 5.0),
    annual_rental_escalation_percent: toNumeric(opp.annualRentalEscalationPercent, 6.0),
    annual_expense_inflation_percent: toNumeric(opp.annualExpenseInflationPercent, 6.0),
    bond_term_years: toInteger(opp.bondTermYears, 20),
    custom_transfer_duty_zar: toNullableNumeric(opp.customTransferDuty),
    custom_conveyancing_zar: toNullableNumeric(opp.customConveyancing),
    custom_bond_reg_zar: toNullableNumeric(opp.customBondReg),
    auctioneer_commission_zar: toNumeric(opp.auctioneerCommissionZAR, 0),
    municipal_arrears_zar: toNumeric(opp.municipalArrearsZAR, 0),
    gross_yield: toNumeric(opp.grossYield, 0),
    cap_rate: toNumeric(opp.capRate, 0),
    net_roi: toNumeric(opp.netRoi, 0),
    monthly_cash_flow_zar: toNumeric(opp.monthlyCashFlow, 0),
    initial_capital_required_zar: toNumeric(opp.initialCapitalRequired, 0),
    projected_flip_net_profit_zar: toNumeric(opp.projectedFlipNetProfit, 0),
    projected_flip_roi: toNumeric(opp.projectedFlipRoi, 0),
    funding_required_zar: toNumeric(opp.fundingRequiredZAR, 0),
    capital_raised_zar: toNumeric(opp.capitalRaisedZAR, 0),
    primary_funder_name: opp.primaryFunderName || null,
    primary_funder_contact: opp.primaryFunderContact || null,
    primary_funder_type: opp.primaryFunderType || null,
    co_funders_notes: opp.coFundersNotes || null,
    promised_return_type: opp.promisedReturnType || null,
    promised_return_rate_percent: toNumeric(opp.promisedReturnRatePercent, 0),
    promised_payout_schedule: opp.promisedPayoutSchedule || null,
    security_offered: opp.securityOffered || null,
    amenity_scorecard: (opp.amenityScorecard ? JSON.parse(JSON.stringify(opp.amenityScorecard)) : {}) as any,
    costs: (opp.costs ? JSON.parse(JSON.stringify(opp.costs)) : {}) as any,
    section_13sex: (opp.section13sex ? JSON.parse(JSON.stringify(opp.section13sex)) : {}) as any,
    drive_vault: (opp.driveVault ? JSON.parse(JSON.stringify(opp.driveVault)) : {}) as any,
    ancillary_incomes: (opp.ancillaryIncomes ? JSON.parse(JSON.stringify(opp.ancillaryIncomes)) : []) as any,
    status: opp.status || 'Screening',
    pass_reason: opp.passReason || null,
    pass_notes: opp.passNotes || null,
    passed_at: opp.passedAt || null,
    notes: opp.notes || null,
    updated_at: new Date().toISOString(),
  }));
}

export function mapTasks(tasks: TaskItem[] = [], userId: string): TaskInsert[] {
  return tasks.map((t, index) => {
    const linkedEntityData = t.linkedEntity ? { ...t.linkedEntity } : { type: 'general', name: 'General' };
    if (t.recurrence && t.recurrence !== 'None') {
      (linkedEntityData as any).recurrence = t.recurrence;
      if (t.recurrenceEndDate) (linkedEntityData as any).recurrenceEndDate = t.recurrenceEndDate;
      if (t.recurrenceGroupId) (linkedEntityData as any).recurrenceGroupId = t.recurrenceGroupId;
    }
    return {
      id: t.id || `task-${index + 1}-${Date.now()}`,
      user_id: userId,
      title: t.title || 'Untitled Task',
      description: t.description || null,
      due_date: toDateOnly(t.dueDate) || new Date().toISOString().split('T')[0],
      priority: t.priority || 'Medium',
      status: t.status || 'Pending',
      linked_entity: linkedEntityData as any,
      updated_at: new Date().toISOString(),
    };
  });
}

export function mapSuppliers(suppliers: LocalSupplier[] = [], userId: string): SupplierInsert[] {
  return suppliers.map((s, index) => ({
    id: s.id || `sup-${index + 1}-${Date.now()}`,
    user_id: userId,
    name: s.name || 'Supplier',
    category: s.category || 'General Building Merchant',
    branch_location: s.branchLocation || 'Johannesburg',
    contact_person: s.contactPerson || null,
    phone: s.phone || '',
    email: s.email || null,
    account_number: s.accountNumber || null,
    discount_terms: s.discountTerms || null,
    has_coc: s.hasCoC ?? false,
    rating: s.rating != null ? Math.min(5, Math.max(1, Math.round(toNumeric(s.rating, 5)))) : 5,
    updated_at: new Date().toISOString(),
  }));
}

export async function migrateToCloud(options?: {
  state?: PortfolioMigrationPayload;
}): Promise<MigrationResult> {
  const counts: MigrationCounts = {
    profile: 0,
    properties: 0,
    flips: 0,
    boqItems: 0,
    fundingSources: 0,
    opportunities: 0,
    tasks: 0,
    suppliers: 0,
  };

  // 1. Verify authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      counts,
      error: 'NO_AUTH',
    };
  }

  const userId = user.id;

  // 2. Read local state payload
  let state = options?.state;
  if (!state && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('sa_property_portfolio_hub_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        state = parsed.state || parsed;
      }
    } catch (e) {
      console.error('Failed to parse localStorage portfolio', e);
    }
  }

  if (!state) {
    return {
      success: false,
      counts,
      error: 'NO_DATA',
    };
  }

  // Guard against accidental demo data overwrite
  if (isStockDemoState(state)) {
    try {
      const propQuery = supabase.from('properties');
      if (typeof propQuery?.select === 'function') {
        const [pRes, fRes, oRes, fsRes, tRes, sRes] = await Promise.all([
          supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('flips').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('funding_sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        ]);
        const totalCloudRecords =
          (pRes.count || 0) +
          (fRes.count || 0) +
          (oRes.count || 0) +
          (fsRes.count || 0) +
          (tRes.count || 0) +
          (sRes.count || 0);

        if (totalCloudRecords > 0) {
          return {
            success: false,
            counts,
            error: 'CLOUD_PORTFOLIO_EXISTS: Cannot overwrite cloud portfolio with default demo data.',
          };
        }
      }
    } catch (checkErr) {
      console.warn('Could not verify existing cloud records count:', checkErr);
    }
  }

  try {
    // 3. Map entities
    const profileRow = mapProfile(
      state.investorProfile,
      {
        liquidCapitalReserve: state.liquidCapitalReserve,
        rentalForecastView: state.rentalForecastView,
        aiSettings: state.aiSettings,
        analyzerDraft: state.analyzerDraft,
      },
      userId,
      user.email
    );

    const propertyRows = mapRentals(state.rentals, userId);
    const flipRows = mapFlips(state.flips, userId);
    const boqRows = extractAndMapBOQItems(state.flips, userId);
    const fundingRows = mapFundingSources(state.funding, userId);
    const opportunityRows = mapOpportunities(state.opportunities, userId);
    const taskRows = mapTasks(state.tasks, userId);
    const supplierRows = mapSuppliers(state.suppliers, userId);

    // 4. Batch upserts with strict dependency order
    // Step 4.1: Profile
    const { error: profileError } = await supabase.from('profiles').upsert(profileRow);
    if (profileError) throw new Error(`Profile sync failed: ${profileError.message}`);
    counts.profile = 1;

    // Step 4.2: Properties (Rentals)
    if (propertyRows.length > 0) {
      const { error: propError } = await supabase.from('properties').upsert(propertyRows);
      if (propError) throw new Error(`Rentals sync failed: ${propError.message}`);
      counts.properties = propertyRows.length;
    }

    // Step 4.3: Funding sources
    if (fundingRows.length > 0) {
      const { error: fundingError } = await supabase.from('funding_sources').upsert(fundingRows);
      if (fundingError) throw new Error(`Funding sync failed: ${fundingError.message}`);
      counts.fundingSources = fundingRows.length;
    }

    // Step 4.4: Flips (Must precede boq_items due to foreign key)
    if (flipRows.length > 0) {
      const { error: flipError } = await supabase.from('flips').upsert(flipRows);
      if (flipError) throw new Error(`Flips sync failed: ${flipError.message}`);
      counts.flips = flipRows.length;
    }

    // Step 4.5: BOQ Items
    if (boqRows.length > 0) {
      const { error: boqError } = await supabase.from('boq_items').upsert(boqRows);
      if (boqError) throw new Error(`BOQ items sync failed: ${boqError.message}`);
      counts.boqItems = boqRows.length;
    }

    // Step 4.6: Opportunities
    if (opportunityRows.length > 0) {
      const { error: oppError } = await supabase.from('opportunities').upsert(opportunityRows);
      if (oppError) throw new Error(`Opportunities sync failed: ${oppError.message}`);
      counts.opportunities = opportunityRows.length;
    }

    // Step 4.7: Tasks
    if (taskRows.length > 0) {
      const { error: taskError } = await supabase.from('tasks').upsert(taskRows);
      if (taskError) throw new Error(`Tasks sync failed: ${taskError.message}`);
      counts.tasks = taskRows.length;
    }

    // Step 4.8: Suppliers
    if (supplierRows.length > 0) {
      const { error: supplierError } = await supabase.from('suppliers').upsert(supplierRows);
      if (supplierError) throw new Error(`Suppliers sync failed: ${supplierError.message}`);
      counts.suppliers = supplierRows.length;
    }

    // Step 4.9: Deletion Reconciliation
    // Reconcile deleted records in cloud that are no longer present in local payload
    const deleteRecordsNotInPayload = async (
      table: 'properties' | 'flips' | 'boq_items' | 'funding_sources' | 'opportunities' | 'tasks' | 'suppliers',
      localIds: string[]
    ) => {
      try {
        const tbl = supabase.from(table);
        if (typeof tbl?.delete !== 'function') return;

        if (localIds.length === 0) {
          const res = await supabase.from(table).delete().eq('user_id', userId);
          if (res?.error) {
            console.warn(`Deletion reconciliation error for ${table}:`, res.error.message);
          }
        } else {
          const res = await supabase
            .from(table)
            .delete()
            .eq('user_id', userId)
            .not('id', 'in', `(${localIds.join(',')})`);
          if (res?.error) {
            console.warn(`Deletion reconciliation error for ${table}:`, res.error.message);
          }
        }
      } catch (delErr) {
        console.warn(`Deletion reconciliation warning for ${table}:`, delErr);
      }
    };

    if (Array.isArray(state.flips)) {
      // Reconcile BOQ items first (foreign key dependency on flips)
      const localBoqIds = boqRows.map((b) => b.id).filter(Boolean);
      await deleteRecordsNotInPayload('boq_items', localBoqIds as string[]);
      const localFlipIds = flipRows.map((f) => f.id).filter(Boolean);
      await deleteRecordsNotInPayload('flips', localFlipIds as string[]);
    }

    if (Array.isArray(state.rentals)) {
      const localPropIds = propertyRows.map((p) => p.id).filter(Boolean);
      await deleteRecordsNotInPayload('properties', localPropIds as string[]);
    }

    if (Array.isArray(state.funding)) {
      const localFundIds = fundingRows.map((f) => f.id).filter(Boolean);
      await deleteRecordsNotInPayload('funding_sources', localFundIds as string[]);
    }

    if (Array.isArray(state.opportunities)) {
      const localOppIds = opportunityRows.map((o) => o.id).filter(Boolean);
      await deleteRecordsNotInPayload('opportunities', localOppIds as string[]);
    }

    if (Array.isArray(state.tasks)) {
      const localTaskIds = taskRows.map((t) => t.id).filter(Boolean);
      await deleteRecordsNotInPayload('tasks', localTaskIds as string[]);
    }

    if (Array.isArray(state.suppliers)) {
      const localSupIds = supplierRows.map((s) => s.id).filter(Boolean);
      await deleteRecordsNotInPayload('suppliers', localSupIds as string[]);
    }

    // 5. On complete success, record flags in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cloud_sync_completed', 'true');
        localStorage.setItem('cloud_sync_timestamp', new Date().toISOString());
      } catch (e) {
        console.error('Failed to set localStorage sync flags', e);
      }
    }

    return {
      success: true,
      counts,
    };
  } catch (err: any) {
    console.error('migrateToCloud execution failed:', err);
    return {
      success: false,
      counts,
      error: err?.message || 'Unknown migration error',
    };
  }
}
