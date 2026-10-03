import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
import type {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  LocalSupplier,
  TaskItem,
  BOQItem,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
} from '@/types';
import {
  mergePortfolioState,
  PortfolioStateSnapshot,
} from './mergePortfolioState';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { migrateToCloud } from './migrateToCloud';
import { migrateNegativeArrearsToRental } from '@/lib/calculations/arrears';

export interface HydrationResult {
  success: boolean;
  hydrated: boolean;
  hasNewLocalItems?: boolean;
  error?: string;
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        Object.keys(parsed).length === 0 &&
        fallback === undefined
      ) {
        return fallback;
      }
      return parsed;
    } catch {
      return fallback;
    }
  }
  if (typeof val === 'object') {
    if (val !== null && Object.keys(val).length === 0 && fallback === undefined) {
      return fallback;
    }
    return val as T;
  }
  return fallback;
}

function toNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toNullableNum(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function unmapProfile(row?: Database['public']['Tables']['profiles']['Row'] | null): {
  profile?: InvestorProfile;
  liquidCapitalReserve?: number;
  rentalForecastView?: 'wealth-only' | 'cashflow-only';
  aiSettings?: AiSettings;
  analyzerDraft?: AnalyzerDraft;
} {
  if (!row) return {};
  const profile: InvestorProfile = {
    entityName: row.entity_name || 'Portfolio Owner',
    tradingAs: row.trading_as || undefined,
    registrationOrId: row.registration_or_id || '',
    contactNumber: row.contact_number || '',
    email: row.email || '',
    website: row.website || undefined,
    physicalAddress: row.physical_address || undefined,
    logoBase64: row.logo_base64 || undefined,
    bioSummary: row.bio_summary || '',
    defaultPrimeRatePercent: toNum(row.default_prime_rate_percent, 11.75),
    baselineHurdleYieldPercent: toNum(row.baseline_hurdle_yield_percent, 10.0),
    defaultAgentCommissionPercent: toNum(row.default_agent_commission_percent, 5.0),
    defaultTaxEntityType: (row.default_tax_entity_type as any) || 'Company (27%)',
  };

  return {
    profile,
    liquidCapitalReserve: toNum(row.liquid_capital_reserve_zar, 650_000),
    rentalForecastView: (row.rental_forecast_view as any) || 'wealth-only',
    aiSettings: parseJson<AiSettings | undefined>(row.ai_settings, undefined),
    analyzerDraft: parseJson<AnalyzerDraft | undefined>(row.analyzer_draft, undefined),
  };
}

export function unmapRentals(rows: Database['public']['Tables']['properties']['Row'][] = []): RentalProperty[] {
  return rows.map((r) => migrateNegativeArrearsToRental({
    id: r.id,
    title: r.title,
    address: r.address,
    city: r.city,
    propertyType: (r.property_type as any) || 'Sectional Title Apartment',
    source: (r.source as any) || undefined,
    agmDate: r.agm_date || undefined,
    marketValueZAR: toNum(r.market_value_zar, 0),
    purchasePriceZAR: toNum(r.purchase_price_zar, 0),
    purchaseDate: r.purchase_date || new Date().toISOString().split('T')[0],
    outstandingBondBalanceZAR: toNum(r.outstanding_bond_balance_zar, 0),
    bondInterestRatePercent: toNum(r.bond_interest_rate_percent, 0),
    monthlyBondPaymentZAR: toNum(r.monthly_bond_payment_zar, 0),
    bondPaymentEffectiveDate: r.bond_payment_effective_date || undefined,
    bondRevisionNote: r.bond_revision_note || undefined,
    leases: parseJson(r.leases, []),
    managementType: (r.management_type as any) || undefined,
    agencyName: r.agency_name || undefined,
    agencyCommissionPercent: toNullableNum(r.agency_commission_percent),
    agencyVatApplicable: r.agency_vat_applicable ?? undefined,
    agencyContact: r.agency_contact || undefined,
    monthlyGrossRentZAR: toNum(r.monthly_gross_rent_zar, 0),
    monthlyLeviesZAR: toNum(r.monthly_levies_zar, 0),
    monthlyRatesTaxesZAR: toNum(r.monthly_rates_taxes_zar, 0),
    monthlyAgentFeeZAR: toNum(r.monthly_agent_fee_zar, 0),
    monthlyMaintenanceReserveZAR: toNum(r.monthly_maintenance_reserve_zar, 0),
    annualBuildingInsuranceZAR: toNullableNum(r.annual_building_insurance_zar),
    unpaidUtilityArrearsZAR: toNullableNum(r.unpaid_utility_arrears_zar),
    arrearsWriteOffs: (r as any).arrears_write_offs
      ? parseJson((r as any).arrears_write_offs, [])
      : [],
    paymentRecords: (r as any).payment_records
      ? parseJson((r as any).payment_records, [])
      : (Array.isArray(r.leases) && (r.leases[0] as any)?.paymentRecords) || [],
    arrearsOpeningBalanceZAR:
      toNullableNum((r as any).arrears_opening_balance_zar) ??
      (Array.isArray(r.leases) && (r.leases[0] as any)?.arrearsOpeningBalanceZAR) ??
      undefined,
    maintenanceHistory: parseJson(r.maintenance_history, []),
    status: (r.status as any) || 'Occupied',
    cocChecklist: r.coc_checklist ? (parseJson(r.coc_checklist, undefined) as any) : undefined,
    driveVault: r.drive_vault ? (parseJson(r.drive_vault, undefined) as any) : undefined,
    notes: r.notes || undefined,
    actualSalePriceZAR: toNullableNum(r.actual_sale_price_zar),
    netCashProceedsZAR: toNullableNum(r.net_cash_proceeds_zar),
    soldDate: r.sold_date || undefined,
    exitNotes: r.exit_notes || undefined,
    convertedFromFlipId: r.converted_from_flip_id || undefined,
    isBrrrrProperty: r.is_brrrr_property ?? undefined,
    totalEquityExtractedZAR: toNullableNum(r.total_equity_extracted_zar),
    refinanceHistory: parseJson(r.refinance_history, []),
    utilityStatements: parseJson(r.utility_statements, []),
    meterReadings: parseJson(r.meter_readings, []),
    taxEntityTypeOverride: (r.tax_entity_type_override as any) || undefined,
    section13sexAnnualShieldZAR: toNullableNum(r.section_13sex_annual_shield_zar),
    utilityType: (r.utility_type as any) || undefined,
    prepaidVendorName: r.prepaid_vendor_name || undefined,
    monthlyPrepaidVendingFeeZAR: toNullableNum(r.monthly_prepaid_vending_fee_zar),
    ancillaryIncomes: parseJson(r.ancillary_incomes, []),
  }));
}

export function unmapFlips(
  flipRows: Database['public']['Tables']['flips']['Row'][] = [],
  boqRows: Database['public']['Tables']['boq_items']['Row'][] = []
): FlipProject[] {
  const boqByFlipId = new Map<string, BOQItem[]>();
  for (const b of boqRows) {
    const boqItem: BOQItem = {
      id: b.id,
      category: (b.category as any) || 'Demolition & Prep',
      itemDescription: b.item_description,
      unit: b.unit,
      quantity: toNum(b.quantity, 1),
      baselineUnitCostZAR: toNum(b.baseline_unit_cost_zar, 0),
      baselineTotalZAR: toNum(b.baseline_total_zar, 0),
      actualCostZAR: toNum(b.actual_cost_zar, 0),
      varianceZAR: toNum(b.variance_zar, 0),
      supplierOrContractor: b.supplier_or_contractor,
      status: (b.status as any) || 'Not Started',
      invoiceRef: b.invoice_ref || undefined,
      milestonePhase: (b.milestone_phase as any) || undefined,
      retentionPercent: toNullableNum(b.retention_percent),
      isSponsoredOrBarter: b.is_sponsored_or_barter ?? undefined,
      commercialRetailValueZAR: toNullableNum(b.commercial_retail_value_zar),
      actualCashOutflowZAR: toNullableNum(b.actual_cash_outflow_zar),
    };
    if (!boqByFlipId.has(b.flip_id)) {
      boqByFlipId.set(b.flip_id, []);
    }
    boqByFlipId.get(b.flip_id)!.push(boqItem);
  }

  return flipRows.map((f) => ({
    id: f.id,
    title: f.title,
    address: f.address,
    city: f.city,
    propertyType: (f.property_type as any) || undefined,
    agmDate: f.agm_date || undefined,
    purchaseDate: f.purchase_date || new Date().toISOString().split('T')[0],
    purchasePriceZAR: toNum(f.purchase_price_zar, 0),
    acquisitionCostsZAR: toNum(f.acquisition_costs_zar, 0),
    baselineRenovationBudgetZAR: toNum(f.baseline_renovation_budget_zar, 0),
    strategy: (f.strategy as any) || undefined,
    source: (f.source as any) || undefined,
    estimatedDurationMonths: toNullableNum(f.estimated_duration_months),
    monthlyHoldingCostZAR: toNullableNum(f.monthly_holding_cost_zar),
    monthlyBondPaymentZAR: toNullableNum(f.monthly_bond_payment_zar),
    monthlyLeviesZAR: toNullableNum(f.monthly_levies_zar),
    monthlyRatesTaxesZAR: toNullableNum(f.monthly_rates_taxes_zar),
    monthlyOtherHoldingCostZAR: toNullableNum(f.monthly_other_holding_cost_zar),
    municipalValuationZAR: toNullableNum(f.municipal_valuation_zar),
    bondPaymentEffectiveDate: f.bond_payment_effective_date || undefined,
    targetExitPriceZAR: toNum(f.target_exit_price_zar, 0),
    exitCommissionPercent: toNullableNum(f.exit_commission_percent),
    targetCompletionDate: f.target_completion_date || new Date().toISOString().split('T')[0],
    currentPhase: (f.current_phase as any) || 'Acquisition & Conveyancing',
    linkedFundingIds: f.linked_funding_ids || [],
    status: (f.status as any) || 'Active',
    notes: f.notes || undefined,
    cocChecklist: f.coc_checklist ? (parseJson(f.coc_checklist, undefined) as any) : undefined,
    driveVault: f.drive_vault ? (parseJson(f.drive_vault, undefined) as any) : undefined,
    fundingRequiredZAR: toNullableNum(f.funding_required_zar),
    capitalRaisedZAR: toNullableNum(f.capital_raised_zar),
    primaryFunderName: f.primary_funder_name || undefined,
    primaryFunderContact: f.primary_funder_contact || undefined,
    primaryFunderType: (f.primary_funder_type as any) || undefined,
    coFundersNotes: f.co_funders_notes || undefined,
    promisedReturnType: (f.promised_return_type as any) || undefined,
    promisedReturnRatePercent: toNullableNum(f.promised_return_rate_percent),
    promisedPayoutSchedule: (f.promised_payout_schedule as any) || undefined,
    securityOffered: f.security_offered || undefined,
    actualSalePriceZAR: toNullableNum(f.actual_sale_price_zar),
    netCashProceedsZAR: toNullableNum(f.net_cash_proceeds_zar),
    soldDate: f.sold_date || undefined,
    exitNotes: f.exit_notes || undefined,
    exitStrategy: (f.exit_strategy as any) || undefined,
    convertedToRentalId: f.converted_to_rental_id || undefined,
    taxEntityType: (f.tax_entity_type as any) || undefined,
    municipalClearance: f.municipal_clearance ? (parseJson(f.municipal_clearance, undefined) as any) : undefined,
    drawSchedule: f.draw_schedule ? (parseJson(f.draw_schedule, undefined) as any) : undefined,
    boq: boqByFlipId.get(f.id) || [],
  }));
}

export function unmapFundingSources(
  rows: Database['public']['Tables']['funding_sources']['Row'][] = []
): FundingSource[] {
  return rows.map((fs) => ({
    id: fs.id,
    lenderName: fs.lender_name,
    entityOrContact: fs.entity_or_contact,
    emailPhone: fs.email_phone,
    fundingType: (fs.funding_type as any) || 'Private Lender',
    capitalAmountZAR: toNum(fs.capital_amount_zar, 0),
    disbursementDate: fs.disbursement_date,
    maturityDate: fs.maturity_date,
    returnTermsType: (fs.return_terms_type as any) || 'Fixed Interest',
    returnRatePercent: toNum(fs.return_rate_percent, 0),
    paymentSchedule: (fs.payment_schedule as any) || 'Monthly Interest',
    linkedDealId: fs.linked_deal_id || undefined,
    linkedDealName: fs.linked_deal_name || undefined,
    totalRepaidZAR: toNum(fs.total_repaid_zar, 0),
    totalInterestPaidZAR: toNullableNum(fs.total_interest_paid_zar),
    status: (fs.status as any) || 'Active',
    notes: fs.notes || undefined,
    tranches: parseJson(fs.tranches, []),
    delayExtensionDays: toNullableNum(fs.delay_extension_days),
    originalMaturityDate: fs.original_maturity_date || undefined,
    delayNotes: fs.delay_notes || undefined,
  }));
}

export function unmapOpportunities(
  rows: Database['public']['Tables']['opportunities']['Row'][] = []
): OpportunityDeal[] {
  return rows.map((opp) => ({
    id: opp.id,
    title: opp.title,
    address: opp.address,
    city: opp.city,
    province: (opp.province as any) || 'Gauteng',
    propertyType: (opp.property_type as any) || undefined,
    agmDate: opp.agm_date || undefined,
    source: (opp.source as any) || 'Direct Owner',
    openMarketValueZAR: toNum(opp.open_market_value_zar, 0),
    purchasePrice: toNum(opp.purchase_price_zar, 0),
    builtInEquityZAR: toNum(opp.built_in_equity_zar, 0),
    builtInEquityPercent: toNum(opp.built_in_equity_percent, 0),
    estimatedRehabCost: toNum(opp.estimated_rehab_cost_zar, 0),
    monthlyRentalEstimate: toNum(opp.monthly_rental_estimate_zar, 0),
    monthlyLevies: toNum(opp.monthly_levies_zar, 0),
    monthlyRatesTaxes: toNum(opp.monthly_rates_taxes_zar, 0),
    annualInsurance: toNum(opp.annual_insurance_zar, 0),
    managementFeePercent: toNum(opp.management_fee_percent, 8.0),
    agencyVatApplicable: opp.agency_vat_applicable ?? true,
    vacancyRatePercent: toNum(opp.vacancy_rate_percent, 5.0),
    targetExitPrice: toNum(opp.target_exit_price_zar, 0),
    exitCommissionPercent: toNum(opp.exit_commission_percent, 5.75),
    holdingPeriodMonths: toNum(opp.holding_period_months, 6),
    strategy: (opp.strategy as any) || 'Rental',
    monthlyHoldingCostZAR: toNum(opp.monthly_holding_cost_zar, 0),
    monthlyBondPaymentZAR: toNum(opp.monthly_bond_payment_zar, 0),
    monthlyOtherHoldingCostZAR: toNum(opp.monthly_other_holding_cost_zar, 0),
    loanToValuePercent: toNum(opp.loan_to_value_percent, 80.0),
    bondLTV: toNum(opp.bond_ltv, 80.0),
    depositZAR: toNum(opp.deposit_zar, 0),
    interestRatePercent: toNum(opp.interest_rate_percent, 11.75),
    loanTermYears: toNum(opp.loan_term_years, 20),
    annualCapitalGrowthPercent: toNum(opp.annual_capital_growth_percent, 5.0),
    annualRentalEscalationPercent: toNum(opp.annual_rental_escalation_percent, 6.0),
    annualExpenseInflationPercent: toNum(opp.annual_expense_inflation_percent, 6.0),
    bondTermYears: toNum(opp.bond_term_years, 20),
    customTransferDuty: toNullableNum(opp.custom_transfer_duty_zar),
    customConveyancing: toNullableNum(opp.custom_conveyancing_zar),
    customBondReg: toNullableNum(opp.custom_bond_reg_zar),
    auctioneerCommissionZAR: toNum(opp.auctioneer_commission_zar, 0),
    municipalArrearsZAR: toNum(opp.municipal_arrears_zar, 0),
    grossYield: toNum(opp.gross_yield, 0),
    capRate: toNum(opp.cap_rate, 0),
    netRoi: toNum(opp.net_roi, 0),
    monthlyCashFlow: toNum(opp.monthly_cash_flow_zar, 0),
    initialCapitalRequired: toNum(opp.initial_capital_required_zar, 0),
    projectedFlipNetProfit: toNum(opp.projected_flip_net_profit_zar, 0),
    projectedFlipRoi: toNum(opp.projected_flip_roi, 0),
    fundingRequiredZAR: toNum(opp.funding_required_zar, 0),
    capitalRaisedZAR: toNum(opp.capital_raised_zar, 0),
    primaryFunderName: opp.primary_funder_name || undefined,
    primaryFunderContact: opp.primary_funder_contact || undefined,
    primaryFunderType: (opp.primary_funder_type as any) || undefined,
    coFundersNotes: opp.co_funders_notes || undefined,
    promisedReturnType: (opp.promised_return_type as any) || undefined,
    promisedReturnRatePercent: toNum(opp.promised_return_rate_percent, 0),
    promisedPayoutSchedule: (opp.promised_payout_schedule as any) || undefined,
    securityOffered: opp.security_offered || undefined,
    amenityScorecard: opp.amenity_scorecard ? (parseJson(opp.amenity_scorecard, undefined) as any) : undefined,
    costs: opp.costs ? (parseJson(opp.costs, undefined) as any) : undefined,
    section13sex: opp.section_13sex ? (parseJson(opp.section_13sex, undefined) as any) : undefined,
    driveVault: opp.drive_vault ? (parseJson(opp.drive_vault, undefined) as any) : undefined,
    ancillaryIncomes: parseJson(opp.ancillary_incomes, []),
    status: (opp.status as any) || 'Screening',
    passReason: (opp.pass_reason as any) || undefined,
    passNotes: opp.pass_notes || undefined,
    passedAt: opp.passed_at || undefined,
    notes: opp.notes || undefined,
    createdAt: (opp as any).created_at || new Date().toISOString(),
  }));
}

export function unmapTasks(
  rows: Database['public']['Tables']['tasks']['Row'][] = []
): TaskItem[] {
  return rows.map((t) => {
    const linked = parseJson(t.linked_entity, { type: 'general', name: 'General' } as any);
    const recurrence = (t as any).recurrence || linked?.recurrence || undefined;
    const recurrenceEndDate = (t as any).recurrence_end_date || linked?.recurrenceEndDate || undefined;
    const recurrenceGroupId = (t as any).recurrence_group_id || linked?.recurrenceGroupId || undefined;

    return {
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      dueDate: t.due_date,
      priority: (t.priority as any) || 'Medium',
      status: (t.status as any) || 'Pending',
      linkedEntity: linked,
      recurrence,
      recurrenceEndDate,
      recurrenceGroupId,
      createdAt: (t as any).created_at || new Date().toISOString(),
    };
  });
}

export function unmapSuppliers(
  rows: Database['public']['Tables']['suppliers']['Row'][] = []
): LocalSupplier[] {
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    category: (s.category as any) || 'General Building Merchant',
    branchLocation: s.branch_location,
    contactPerson: s.contact_person || undefined,
    phone: s.phone,
    email: s.email || undefined,
    accountNumber: s.account_number || undefined,
    discountTerms: s.discount_terms || undefined,
    hasCoC: s.has_coc ?? false,
    rating: toNum(s.rating, 5),
  }));
}

let activeHydrationPromise: Promise<HydrationResult> | null = null;

export async function hydrateFromCloud(): Promise<HydrationResult> {
  if (activeHydrationPromise) {
    return activeHydrationPromise;
  }

  activeHydrationPromise = (async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, hydrated: false, error: 'NO_AUTH' };
    }

    const userId = user.id;

    try {
      // 1. Fetch data from all 8 tables for this user in parallel
      const [
        profilesRes,
        propertiesRes,
        flipsRes,
        boqRes,
        fundingRes,
        oppsRes,
        tasksRes,
        suppliersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId),
        supabase.from('properties').select('*').eq('user_id', userId),
        supabase.from('flips').select('*').eq('user_id', userId),
        supabase.from('boq_items').select('*').eq('user_id', userId),
        supabase.from('funding_sources').select('*').eq('user_id', userId),
        supabase.from('opportunities').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('suppliers').select('*').eq('user_id', userId),
      ]);

      if (profilesRes.error) throw new Error(`Profiles fetch failed: ${profilesRes.error.message}`);
      if (propertiesRes.error) throw new Error(`Properties fetch failed: ${propertiesRes.error.message}`);
      if (flipsRes.error) throw new Error(`Flips fetch failed: ${flipsRes.error.message}`);
      if (boqRes.error) throw new Error(`BOQ items fetch failed: ${boqRes.error.message}`);
      if (fundingRes.error) throw new Error(`Funding fetch failed: ${fundingRes.error.message}`);
      if (oppsRes.error) throw new Error(`Opportunities fetch failed: ${oppsRes.error.message}`);
      if (tasksRes.error) throw new Error(`Tasks fetch failed: ${tasksRes.error.message}`);
      if (suppliersRes.error) throw new Error(`Suppliers fetch failed: ${suppliersRes.error.message}`);

      const profileRow = profilesRes.data?.[0];
      const propertyRows = propertiesRes.data || [];
      const flipRows = flipsRes.data || [];
      const boqRows = boqRes.data || [];
      const fundingRows = fundingRes.data || [];
      const oppRows = oppsRes.data || [];
      const taskRows = tasksRes.data || [];
      const supplierRows = suppliersRes.data || [];

      const hasRecords =
        Boolean(profileRow) ||
        propertyRows.length > 0 ||
        flipRows.length > 0 ||
        fundingRows.length > 0 ||
        oppRows.length > 0 ||
        taskRows.length > 0 ||
        supplierRows.length > 0;

      if (!hasRecords) {
        return { success: true, hydrated: false };
      }

      // 2. Unmap DB records to domain models
      const {
        profile,
        liquidCapitalReserve,
        rentalForecastView,
        aiSettings,
        analyzerDraft,
      } = unmapProfile(profileRow);

      const cloudSnapshot: PortfolioStateSnapshot = {
        rentals: unmapRentals(propertyRows),
        flips: unmapFlips(flipRows, boqRows),
        funding: unmapFundingSources(fundingRows),
        opportunities: unmapOpportunities(oppRows),
        tasks: unmapTasks(taskRows),
        suppliers: unmapSuppliers(supplierRows),
        investorProfile: profile,
        liquidCapitalReserve,
        rentalForecastView,
        aiSettings,
        analyzerDraft,
      };

      // 3. Merge with current local state
      const localState = usePortfolioStore.getState();
      const { mergedState, hasNewLocalItems } = mergePortfolioState(cloudSnapshot, localState);

      // 4. Update Zustand store atomically
      usePortfolioStore.getState().hydrateFromCloudState(mergedState);

      // 5. If new local items were preserved, auto-upload to Supabase
      if (hasNewLocalItems) {
        try {
          const uploadRes = await migrateToCloud({ state: mergedState });
          if (!uploadRes.success) {
            console.warn('Auto-upload of newly merged local items returned error:', uploadRes.error);
          }
        } catch (uploadErr) {
          console.error('Failed to auto-upload newly merged local items to cloud:', uploadErr);
        }
      }

      // 6. Set localStorage sync indicators
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('cloud_sync_completed', 'true');
          localStorage.setItem('cloud_sync_timestamp', new Date().toISOString());
        } catch (e) {
          console.error('Failed to set localStorage sync keys', e);
        }
      }

      return {
        success: true,
        hydrated: true,
        hasNewLocalItems,
      };
    } catch (err: any) {
      console.error('hydrateFromCloud failed:', err);
      return {
        success: false,
        hydrated: false,
        error: err?.message || 'Hydration failed',
      };
    }
  })();

  try {
    return await activeHydrationPromise;
  } finally {
    activeHydrationPromise = null;
  }
}
