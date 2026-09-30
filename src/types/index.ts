export type PropertyType = 'rental' | 'flip' | 'opportunity';
export type DealStrategy = 'Flip' | 'Rental' | 'BRRRR';

export type DealSource = 'iGrow Rentals' | 'High-Street Auction' | 'Distressed Sale / Repo' | 'Private Agent' | 'Direct Owner';

export type FundingType = 'Proposal-backed' | 'Ad-hoc Friends & Family' | 'Private Lender' | 'Equity Partner' | 'Bank Bond';

export type ReturnTermType = 'Fixed Interest' | 'Monthly Coupon' | 'Equity Profit Split' | 'Bullet Repayment';

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface LinkedEntity {
  type: 'rental' | 'flip' | 'opportunity' | 'funding' | 'general';
  id?: string;
  name: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  linkedEntity: LinkedEntity;
  createdAt: string;
}

// SARS Tax & Acquisition Costs
export interface AcquisitionCostBreakdown {
  purchasePrice: number;
  transferDuty: number;
  conveyancingFee: number;
  bondRegistrationFee: number;
  deedsOfficeFee: number;
  ficaSundries: number;
  totalAcquisitionCost: number;
  isTransferDutyOverridden?: boolean;
  isConveyancingOverridden?: boolean;
}

// SARS Section 13sex Tax Shield Model (Off-plan / New Developer Units)
export interface Section13sexCalculation {
  isEligible: boolean;
  buildingDeductionBaseZAR: number; // 55% of acquisition cost
  annualAllowanceZAR: number; // 5% of deduction base = 2.75% of purchase price
  taxRatePercent: number; // e.g. 27% (Corporate), 31% (Individual mid), 45% (Individual top)
  annualTaxSavingsZAR: number; // annualAllowance * (taxRate / 100)
  twentyYearCumulativeSavingsZAR: number; // annualTaxSavings * 20
}

// Mandatory South African Compliance Certificates (CoC)
export type CoCStatus = 'Not Applicable' | 'Pending Inspection' | 'Certified / Valid';

export interface CoCItem {
  type: 'Electrical' | 'Gas' | 'Electric Fence' | 'Plumbing (Cape Town)' | 'Beetle' | 'Approved SG Plans';
  status: CoCStatus;
  certificateNumber?: string;
  issueDate?: string;
  inspectorOrContractor?: string;
}

export interface ComplianceCertificates {
  electrical: CoCItem;
  gas: CoCItem;
  electricFence: CoCItem;
  plumbing?: CoCItem;
  beetle?: CoCItem;
  approvedPlansSG?: CoCItem;
}

// Cloud Drive Link Vault (Google Drive, Dropbox, OTP, Rates Bills)
export interface CloudDriveVault {
  masterFolderUrl?: string; // Google Drive / Dropbox deal folder
  otpDocumentUrl?: string; // Signed Offer to Purchase (OTP)
  ratesBillUrl?: string; // City municipal rates & taxes / levies bill
  titleDeedUrl?: string; // Title deed / SG Diagram / building plans
}

// Qualitative Location & Amenity Scorecard
export type AmenityDistance = '0-5km' | '6-10km' | '10+km';

export interface AmenityScorecard {
  schools: AmenityDistance;
  policeStation: AmenityDistance;
  medicalClinic: AmenityDistance;
  shoppingMall: AmenityDistance;
  compositeGrade: 'A-Grade (Prime Hub)' | 'B-Grade (Accessible)' | 'C-Grade (Outlying)';
  compositeScore: number; // 4 to 12 points
}

export type PropertyTitleType =
  | 'Sectional Title Apartment'
  | 'Freehold House'
  | 'Townhouse / Cluster'
  | 'Multi-unit Commercial';

export type PassReason =
  | 'Yield Too Low'
  | 'High Arrears / Municipal Risk'
  | 'Seller Countered Above MAO'
  | 'Title Deed Issues'
  | 'Structural / Damp Report Failed'
  | 'Funding Not Secured'
  | 'Other';

// Opportunity Analyzer Model
export interface OpportunityDeal {
  id: string;
  title: string;
  address: string;
  city: string;
  province: 'Gauteng' | 'Western Cape' | 'KwaZulu-Natal' | 'Eastern Cape' | 'Free State' | 'Other';
  propertyType?: PropertyTitleType;
  agmDate?: string; // Body Corporate AGM Date (Sectional Title / Cluster)
  source: DealSource;
  openMarketValueZAR: number; // Professional valuation / Lightstone report value
  purchasePrice: number; // Target Purchase Price / Max Bid
  builtInEquityZAR: number; // openMarketValueZAR - purchasePrice
  builtInEquityPercent: number; // (builtInEquityZAR / openMarketValueZAR) * 100
  amenityScorecard?: AmenityScorecard;
  estimatedRehabCost: number;
  monthlyRentalEstimate: number;
  monthlyLevies: number;
  monthlyRatesTaxes: number;
  annualInsurance: number;
  managementFeePercent: number; // e.g. 8%
  agencyVatApplicable?: boolean; // Whether 15% VAT is added on top of agency commission (defaults to true)
  vacancyRatePercent: number; // e.g. 5%
  targetExitPrice: number; // For flip exit
  holdingPeriodMonths: number;
  strategy?: DealStrategy; // 'Flip' | 'Rental' | 'BRRRR'
  monthlyHoldingCostZAR?: number;
  monthlyBondPaymentZAR?: number;
  monthlyOtherHoldingCostZAR?: number;
  // Financing
  loanToValuePercent: number; // e.g. 80% or 0% for cash
  bondLTV: number; // e.g. 100% or 80%
  depositZAR: number; // e.g. R 0 or R 200,000
  interestRatePercent: number; // SA Prime ~11.75%
  loanTermYears: number; // e.g. 20
  // Long-Term Projections & Escalation Assumptions
  annualCapitalGrowthPercent?: number; // e.g. 5%
  annualRentalEscalationPercent?: number; // e.g. 6%
  annualExpenseInflationPercent?: number; // e.g. 6%
  bondTermYears?: number; // e.g. 20 or 30
  // Overrides
  customTransferDuty?: number;
  customConveyancing?: number;
  customBondReg?: number;
  // Auction Outlays & Distressed Arrears
  auctioneerCommissionZAR?: number;
  municipalArrearsZAR?: number;
  // Section 13sex Tax Incentive
  section13sex?: Section13sexCalculation;
  // Cloud Drive Link Vault
  driveVault?: CloudDriveVault;
  // P4: Ancillary Income Array
  ancillaryIncomes?: AncillaryIncome[];
  // Calculated outputs
  costs: AcquisitionCostBreakdown;
  grossYield: number; // %
  capRate: number; // Net Initial Yield %
  netRoi: number; // %
  monthlyCashFlow: number; // ZAR
  initialCapitalRequired?: number; // ZAR: Deposit + duty + legal + capex
  projectedFlipNetProfit: number; // ZAR
  projectedFlipRoi: number; // %
  // Funding Campaign & Investor Terms
  fundingRequiredZAR?: number;
  capitalRaisedZAR?: number;
  primaryFunderName?: string;
  primaryFunderContact?: string;
  primaryFunderType?: 'Private Lender' | 'Syndicate JV Partner' | 'Friends & Family' | 'Equity Partner';
  coFundersNotes?: string;
  promisedReturnType?: 'Fixed Interest' | 'Equity Profit Split' | 'Monthly Coupon' | 'Bullet Repayment';
  promisedReturnRatePercent?: number;
  promisedPayoutSchedule?: 'Monthly Interest' | 'Quarterly' | 'At Exit (Maturity)' | 'Bi-Annual';
  securityOffered?: string;
  status: 'Screening' | 'Offer Submitted' | 'Due Diligence' | 'Promoted to Flip' | 'Promoted to Rental' | 'Passed';
  passReason?: PassReason;
  passNotes?: string;
  passedAt?: string;
  notes?: string;
  createdAt: string;
}

// Funding Tranche for Phased Milestone Disbursements
export interface FundingTranche {
  id: string;
  name: string; // e.g., "Tranche 1: Acquisition", "Tranche 2: First Fix"
  amountZAR: number;
  disbursedDate?: string;
  isDisbursed: boolean;
  linkedMilestonePhase?: 'Deposit' | 'First Fix / Wet Works' | 'Finishes' | 'Retention';
}

// Funding & Capital Tracker
export interface FundingSource {
  id: string;
  lenderName: string;
  entityOrContact: string;
  emailPhone: string;
  fundingType: FundingType;
  capitalAmountZAR: number; // Principal / Total Facility
  disbursementDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  returnTermsType: ReturnTermType;
  returnRatePercent: number; // e.g. 14% p.a. or 30% profit split
  paymentSchedule: 'Monthly Interest' | 'Quarterly' | 'At Exit (Maturity)' | 'Bi-Annual';
  linkedDealId?: string; // Links to flip or rental
  linkedDealName?: string;
  totalRepaidZAR: number;
  status: 'Active' | 'Accruing' | 'Matured' | 'Settled';
  notes?: string;
  tranches?: FundingTranche[];
  delayExtensionDays?: number; // Days extended due to linked deal delays
  originalMaturityDate?: string;
  delayNotes?: string;
}

// Bill of Quantities (BOQ) Item
export interface BOQItem {
  id: string;
  category: 'Demolition & Prep' | 'Plumbing & Wet Works' | 'Electrical & Lighting' | 'Ceilings & Drywall' | 'Kitchen & Cabinetry' | 'Bathrooms' | 'Flooring & Tiling' | 'Painting & Finishes' | 'Roofing & Structural' | 'Security & Exterior';
  itemDescription: string;
  unit: string; // e.g., "m2", "linear m", "units", "lump sum"
  quantity: number;
  baselineUnitCostZAR: number;
  baselineTotalZAR: number;
  actualCostZAR: number;
  varianceZAR: number; // actual - baseline
  supplierOrContractor: string;
  status: 'Not Started' | 'Quoted' | 'In Progress' | 'Completed';
  invoiceRef?: string;
  milestonePhase?: 'Deposit' | 'First Fix / Wet Works' | 'Finishes' | 'Retention';
  retentionPercent?: number; // e.g. 10% or 20% held until practical completion
  isSponsoredOrBarter?: boolean;
  commercialRetailValueZAR?: number; // Market value if purchased at retail
  actualCashOutflowZAR?: number; // Actual cash paid out after discounts/sponsorships
}

// Local Supplier & Contractor Directory
export interface LocalSupplier {
  id: string;
  name: string;
  category: 'Hardware & Timber' | 'Plumbing Supplies' | 'Electrical Supplies' | 'Tiles & Sanitary' | 'Paint & Finishes' | 'General Building Merchant' | 'Specialist Contractor';
  branchLocation: string; // e.g., Sandton, Cape Town Foreshore, Umhlanga, Menlyn
  contactPerson?: string;
  phone: string;
  email?: string;
  accountNumber?: string;
  discountTerms?: string; // e.g., "5% Trade Account Net 30"
  hasCoC?: boolean; // Certificate of Compliance (Electrician / Plumber)
  rating: number; // 1-5
}

// Buy-and-Flip Project
export interface FlipProject {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType?: PropertyTitleType;
  agmDate?: string;
  purchaseDate: string;
  purchasePriceZAR: number;
  acquisitionCostsZAR: number; // Transfer + legal
  baselineRenovationBudgetZAR: number;
  strategy?: DealStrategy; // Defaults to 'Flip'
  source?: DealSource;
  // Holding Period Carrying Costs
  estimatedDurationMonths?: number;
  monthlyHoldingCostZAR?: number; // Total monthly holding cost
  monthlyBondPaymentZAR?: number; // Interim bond interest / repayment
  monthlyLeviesZAR?: number; // HOA / Body corporate levies (strictly R0 for Freehold)
  monthlyRatesTaxesZAR?: number; // City municipal rates & taxes
  monthlyOtherHoldingCostZAR?: number; // Site security, builder risk insurance, standing utilities
  municipalValuationZAR?: number; // Official municipal property valuation from CoJ bill
  bondPaymentEffectiveDate?: string; // e.g. '2026-04'
  targetExitPriceZAR: number;
  targetCompletionDate: string;
  currentPhase: 'Acquisition & Conveyancing' | 'Strip & Demolition' | 'First Fix (Plumbing/Elec)' | 'Finishes & Tiling' | 'Snagging' | 'Staging & Marketing' | 'Sold / Awaiting Transfer';
  boq: BOQItem[];
  linkedFundingIds: string[];
  status: 'Active' | 'Completed' | 'Delayed';
  notes?: string;
  cocChecklist?: ComplianceCertificates;
  driveVault?: CloudDriveVault;
  // Funding Campaign & Investor Terms
  fundingRequiredZAR?: number;
  capitalRaisedZAR?: number;
  primaryFunderName?: string;
  primaryFunderContact?: string;
  primaryFunderType?: 'Private Lender' | 'Syndicate JV Partner' | 'Friends & Family' | 'Equity Partner';
  coFundersNotes?: string;
  promisedReturnType?: 'Fixed Interest' | 'Equity Profit Split' | 'Monthly Coupon' | 'Bullet Repayment';
  promisedReturnRatePercent?: number;
  promisedPayoutSchedule?: 'Monthly Interest' | 'Quarterly' | 'At Exit (Maturity)' | 'Bi-Annual';
  securityOffered?: string;
  // Realized Sale / Exit Fields
  actualSalePriceZAR?: number;
  netCashProceedsZAR?: number;
  soldDate?: string;
  exitNotes?: string;
  exitStrategy?: 'Sold' | 'BRRRR';
  convertedToRentalId?: string;
  // Professional SA Flipping Extensions (Archetype Alignment)
  taxEntityType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  municipalClearance?: {
    sec118ArrearsZAR: number;
    advanceCouncilDepositZAR: number; // 4-6 months rates in advance
    rccApplicationDate?: string;
    rccStatus: 'Pending Application' | 'Figures Issued' | 'Paid & Awaiting Certificate' | 'Disputed' | 'Certificate Issued';
    disputeNotes?: string;
  };
  drawSchedule?: {
    depositPaid: boolean;
    firstFixApproved: boolean;
    finishesApproved: boolean;
    retentionReleased: boolean;
  };
}

// Maintenance Log Item
export interface MaintenanceLog {
  id: string;
  dateLogged: string;
  issueDescription: string;
  category: 'Plumbing' | 'Electrical' | 'Appliance' | 'Structural' | 'General Wear';
  contractorName: string;
  costZAR: number;
  status: 'Open' | 'In Progress' | 'Resolved';
  invoiceRef?: string;
}

// Active Lease
export interface Lease {
  id: string;
  unitName: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRentZAR: number;
  depositHeldZAR: number;
  annualEscalationPercent: number;
  status: 'Occupied' | 'Vacant' | 'Notice Given';
}

export interface AncillaryIncome {
  id: string;
  type: 'cell_tower' | 'billboard' | 'parking' | 'storage' | 'other';
  tenantName: string;
  monthlyRentZAR: number;
  annualEscalationPercent: number;
  contractStartDate: string;
  contractEndDate: string;
  vatApplicable: boolean;
  notes?: string;
}

// Active Rental Property
export interface RentalProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType: PropertyTitleType;
  source?: DealSource;
  agmDate?: string;
  marketValueZAR: number;
  purchasePriceZAR: number;
  purchaseDate: string;
  outstandingBondBalanceZAR: number;
  bondInterestRatePercent: number; // e.g. 11.5%
  monthlyBondPaymentZAR: number;
  bondPaymentEffectiveDate?: string; // e.g. '2026-04' (upcoming forward-only month)
  bondRevisionNote?: string; // e.g. 'SARB 25bps repo rate cut'
  // Tenant & Lease details
  leases: Lease[];
  // Agency & Property Management
  managementType?: 'Self-Managed' | 'Agency';
  agencyName?: string;
  agencyCommissionPercent?: number;
  agencyVatApplicable?: boolean;
  agencyContact?: string;
  // Monthly Cash Flow Ledger
  monthlyGrossRentZAR: number;
  monthlyLeviesZAR: number;
  monthlyRatesTaxesZAR: number;
  monthlyAgentFeeZAR: number;
  monthlyMaintenanceReserveZAR: number;
  annualBuildingInsuranceZAR?: number; // Homeowner structural insurance for Freehold properties
  // Tenant Utility Arrears & Operational Risk
  unpaidUtilityArrearsZAR?: number;
  maintenanceHistory: MaintenanceLog[];
  status: 'Occupied' | 'Vacant' | 'Notice Given' | 'Sold';
  cocChecklist?: ComplianceCertificates;
  driveVault?: CloudDriveVault;
  notes?: string;
  // Realized Sale / Exit Fields
  actualSalePriceZAR?: number;
  netCashProceedsZAR?: number;
  soldDate?: string;
  exitNotes?: string;
  // BRRRR Lifecycle Fields
  convertedFromFlipId?: string;
  isBrrrrProperty?: boolean;
  totalEquityExtractedZAR?: number;
  refinanceHistory?: RentalRefinanceRecord[];
  // Historical Utility Statements & Variance Ledger
  utilityStatements?: UtilityStatement[];
  // Physical & Municipal Meter Readings
  meterReadings?: MeterReading[];
  
  // P1: Rental Tax Reserve
  taxEntityTypeOverride?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  section13sexAnnualShieldZAR?: number;
  // P2: Utility Type Attribute
  utilityType?: 'postpaid' | 'prepaid_submeter' | 'hybrid';
  prepaidVendorName?: string;
  monthlyPrepaidVendingFeeZAR?: number;
  // P4: Ancillary Income Array
  ancillaryIncomes?: AncillaryIncome[];
}

// Municipal Meter Dispute Status & Reason Types
export type MeterDisputeStatus =
  | 'Open / Lodged'
  | 'Under Investigation'
  | 'Credit Note Pending'
  | 'Resolved';

export type MeterDisputeReason =
  | 'council_over_estimate'
  | 'meter_fault'
  | 'incorrect_meter_number'
  | 'dials_reversed'
  | 'unexplained_spike'
  | 'other';

// Physical & Municipal Meter Reading Record
export interface MeterReading {
  id: string;
  date: string; // YYYY-MM-DD
  utilityType: 'electricity' | 'water';
  readingValue: number;
  previousReadingValue?: number;
  consumption?: number; // KL for water, kWh for electricity
  meterNumber?: string;
  readingType?: 'Actual' | 'Estimated';
  source: 'pdf-extracted' | 'manual';
  photoUrl?: string;
  notes?: string;
  createdAt: string;

  // Municipal Dispute Extension
  isDisputed?: boolean;
  disputeStatus?: MeterDisputeStatus;
  disputeReason?: MeterDisputeReason;
  disputeReferenceNumber?: string; // Council ticket / C-Ref (e.g. "ETH-2026-88192" or "CoJ 80019284")
  disputedStatementId?: string; // ID of the contested UtilityStatement
  disputedMunicipalReadingValue?: number; // What the municipality claimed on their statement
  disputeDifferenceConsumption?: number; // Municipal - Independent (positive = council over-billed)
  disputeEffectiveTariffPerUnit?: number; // Derived or overridden rate (ZAR / kWh or ZAR / KL)
  disputeEstimatedRandImpactZAR?: number; // Estimated financial impact of the discrepancy
  disputeLodgedDate?: string;
  disputeResolutionNotes?: string;

  // Municipal Dispute Resolution Extension
  disputeResolutionOutcome?: MeterDisputeResolutionOutcome;
  disputeResolutionDate?: string; // YYYY-MM-DD
  disputeAgreedReadingValue?: number; // Final agreed dial reading
  disputeAgreedConsumption?: number; // Final agreed consumption (units)
  disputeSettledCreditZAR?: number; // Final credited amount in Rand (0 if rejected)
  disputeCreditNoteNumber?: string; // Council credit note invoice / reversal #
}

export type MeterDisputeResolutionOutcome =
  | 'accepted_actuals'
  | 'credit_note_issued'
  | 'compromise_reading'
  | 'dispute_rejected';

// Municipal / Eskom Utility Statement Record
export interface UtilityStatement {
  id: string;
  statementDate: string; // YYYY-MM-DD (e.g. '2025-04-03')
  billingPeriod?: string; // e.g. 'April 2025' or '10 Aug 2026 - 09 Sep 2026'
  accountNumber?: string;
  provider: 'City of Johannesburg' | 'Eskom' | 'City Power' | 'iGrow Rentals' | 'Other' | string;
  billingType?: 'itemized' | 'bundled'; // 'bundled' for iGrow / Body Corporate single recovery
  bundledUtilitiesZAR?: number; // e.g. 477.07 for "Water, Sewerage, Refuse & Common"
  bundledUtilityLabel?: string; // default: "Water, Sewerage, Refuse & Common"
  electricityZAR: number;
  waterZAR: number;
  refuseZAR: number;
  sewerageZAR: number;
  propertyRatesZAR?: number;
  totalDueZAR: number; // Current charges (rates + utilities)
  // Managing agent statement metadata & sync
  propertyName?: string; // Scheme or complex title extracted from statement (e.g. "Clearwater Village 128", "The Blyde 402")
  propertyAddress?: string;
  bodyCorporateLeviesZAR?: number;
  agencyCommissionZAR?: number;
  agencyCommissionVatZAR?: number;
  netDisbursementZAR?: number;
  tenantRentBilledZAR?: number;
  depositHeldZAR?: number;
  tenantName?: string;
  municipalValuationZAR?: number; // Extracted municipal property valuation (e.g. CoJ "Market Value R 3,180,000.00")
  rawText?: string;
  parsedVia: 'byok-llm' | 'regex-fallback' | 'manual';
  extractedMeterReadings?: Omit<MeterReading, 'id' | 'createdAt'>[];
  tenantBillingMethod?: 'municipal_statement' | 'independent_actuals';
  createdAt: string;
}

// Rental Refinance Audit Record
export interface RentalRefinanceRecord {
  id: string;
  refinanceDate: string;
  newBankValuationZAR: number;
  newMonthlyBondPaymentZAR: number;
  cashEquityPulledOutZAR: number;
  newBondBalanceZAR: number;
  notes?: string;
}

// Parameters for converting an active Flip to a Rental (BRRRR)
export interface FlipToRentalConversionParams {
  flipId: string;
  initialGrossRentZAR: number;
  marketValuationZAR?: number;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  depositHeldZAR?: number;
  managementType?: 'Self-Managed' | 'Agency';
  agencyName?: string;
  agencyCommissionPercent?: number;
  notes?: string;
}

// Parameters for refinancing a Rental property (BRRRR)
export interface RentalRefinanceParams {
  rentalId: string;
  newBankValuationZAR: number;
  newMonthlyBondPaymentZAR: number;
  cashEquityPulledOutZAR: number;
  newBondBalanceZAR: number;
  refinanceDate?: string;
  notes?: string;
}

export interface EquityExtractionAlert {
  propertyId: string;
  propertyTitle: string;
  currentLTV: number;
  extractableEquityZAR: number;
  monthsStabilized: number;
  isRipe: boolean;
}

// Global Portfolio Aggregates
export interface PortfolioSummary {
  totalGrossAssetValue: number;
  totalRentalValue: number;
  totalFlipValue: number;
  liquidCapitalReserve: number;
  ringFencedWorkingCapital: number; // Retentions + Committed Pending Milestones + Council Deposits
  freeUnallocatedCash: number; // liquidCapitalReserve - ringFencedWorkingCapital
  unallocatedFundingReserve: number;
  totalAvailablePurchasingPower: number;
  totalFundingLiabilities: number;
  totalPrivateFundingLiability: number;
  totalBondLiabilities: number;
  netEquity: number;
  monthlyNetRentalCashflow: number;
  totalProjectedFlipProfits: number; // Backward-compatible alias for totalGrossProjectedFlipProfits
  totalGrossProjectedFlipProfits: number; // Pre-tax pipeline profit
  totalSarsProvisionalTaxReserve: number; // SARS corporate tax liability (27% Company / 45% Individual)
  totalNetProjectedFlipProfits: number; // Net realizable equity after tax
  totalRealizedFlipProfits: number;
  activeRentalsCount: number;
  soldRentalsCount: number;
  activeFlipsCount: number;
  completedFlipsCount: number;
  pendingOpportunitiesCount: number;
  annualRentalTaxReserve: number;
  monthlyRentalTaxReserve: number;
  equityAlerts: EquityExtractionAlert[];
}

// Investor Profile & Platform Settings
export interface InvestorProfile {
  entityName: string;
  tradingAs?: string;
  registrationOrId: string;
  contactNumber: string;
  email: string;
  website?: string;
  physicalAddress?: string;
  logoBase64?: string;
  bioSummary: string;
  // Default Acquisition & Investment Hurdles
  defaultPrimeRatePercent: number; // e.g. 11.75%
  baselineHurdleYieldPercent: number; // e.g. 10.0%
  defaultAgentCommissionPercent: number; // e.g. 5.0%
  defaultTaxEntityType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
}

// Long-Term Financial & Wealth Projection Yearly Snapshot
export interface LongTermProjectionYear {
  year: number;
  rent: number;
  costs: number;
  bondPayment: number;
  netCashflow: number;
  propertyValue: number;
  outstandingBond: number;
  netEquity: number;
}

// Deal Sourcing Calculator Scratchpad State
export interface AnalyzerDraft {
  openMarketValue: number;
  purchasePrice: number;
  rehabCost: number;
  monthlyRent: number;
  monthlyLevies: number;
  monthlyRates: number;
  targetExitPrice: number;
  auctioneerCommission: number;
  municipalArrears: number;
  depositZAR: number;
  loanToValue: number;
  annualCapitalGrowthPercent?: number;
  annualRentalEscalationPercent?: number;
  annualExpenseInflationPercent?: number;
  bondTermYears?: number;
  strategy?: DealStrategy;
  annualInsurance?: number;
  source?: DealSource;
  vacancyRatePercent?: number;
  managementFeePercent?: number;
  agencyVatApplicable?: boolean;
}

// Client-side BYOK AI Integration Settings
export interface AiSettings {
  provider: 'anthropic' | 'google';
  apiKey: string;
  model: string; // e.g. 'claude-3-5-sonnet-20241022'
}

// Extracted Rental Unit from Visual Statement Parser
export interface ExtractedRentalUnit {
  propertyName: string; // e.g. "Clearwater Village 128"
  address?: string;
  propertyAddress?: string;
  tenantName?: string; // e.g. "Bongani June Mwale"
  leaseExpiryDate?: string; // YYYY-MM-DD
  leaseEndDate?: string; // alias for leaseExpiryDate
  grossRentZAR: number; // e.g. 6900
  leviesZAR?: number; // e.g. 477.07
  municipalRatesZAR?: number; // e.g. 1021.00
  agencyCommissionZAR?: number; // e.g. 850.54
  agencyCommissionVatZAR?: number; // e.g. 110.94 (15% SARS VAT)
  isCommissionInclusiveOfVat?: boolean; // true if agencyCommissionZAR already includes VAT
  estimatedMarketValueZAR?: number; // e.g. 828000
  purchasePriceZAR?: number; // e.g. 759000
  monthlyBondPaymentZAR?: number; // Owner direct debit order (not on agent statement)
  bondPaymentEffectiveDate?: string; // e.g. '2026-04'
  depositHeldZAR?: number; // e.g. 6965.17
  netOperatingIncomeZAR?: number; // e.g. 5525.03
  netPayoutZAR?: number; // alias for netOperatingIncomeZAR
  managingAgent?: string;
  statementDate?: string;
  propertyType?: PropertyTitleType;
}


