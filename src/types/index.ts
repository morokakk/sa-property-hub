export type PropertyType = 'rental' | 'flip' | 'opportunity';

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
  type: 'Electrical' | 'Gas' | 'Electric Fence' | 'Plumbing (Cape Town)' | 'Beetle';
  status: CoCStatus;
  certificateNumber?: string;
  issueDate?: string;
  inspectorOrContractor?: string;
}

export interface ComplianceCertificates {
  electrical: CoCItem;
  gas: CoCItem;
  electricFence: CoCItem;
  plumbing: CoCItem;
  beetle: CoCItem;
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
  vacancyRatePercent: number; // e.g. 5%
  targetExitPrice: number; // For flip exit
  holdingPeriodMonths: number;
  // Financing
  loanToValuePercent: number; // e.g. 80% or 0% for cash
  bondLTV: number; // e.g. 100% or 80%
  depositZAR: number; // e.g. R 0 or R 200,000
  interestRatePercent: number; // SA Prime ~11.75%
  loanTermYears: number; // e.g. 20
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
  status: 'Analyzing' | 'Offer Submitted' | 'Under Due Diligence' | 'Promoted to Flip' | 'Promoted to Rental' | 'Passed';
  notes?: string;
  createdAt: string;
}

// Funding & Capital Tracker
export interface FundingSource {
  id: string;
  lenderName: string;
  entityOrContact: string;
  emailPhone: string;
  fundingType: FundingType;
  capitalAmountZAR: number; // Principal
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
  // Holding Period Carrying Costs
  estimatedDurationMonths?: number;
  monthlyHoldingCostZAR?: number;
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

// Active Rental Property
export interface RentalProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType: PropertyTitleType;
  agmDate?: string;
  marketValueZAR: number;
  purchasePriceZAR: number;
  purchaseDate: string;
  outstandingBondBalanceZAR: number;
  bondInterestRatePercent: number; // e.g. 11.5%
  monthlyBondPaymentZAR: number;
  // Tenant & Lease details
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositHeldZAR: number;
  annualEscalationPercent: number; // e.g. 7%
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
  // Tenant Utility Arrears & Operational Risk
  unpaidUtilityArrearsZAR?: number;
  maintenanceHistory: MaintenanceLog[];
  status: 'Occupied' | 'Vacant' | 'Notice Given' | 'Sold';
  cocChecklist?: ComplianceCertificates;
  driveVault?: CloudDriveVault;
  // Realized Sale / Exit Fields
  actualSalePriceZAR?: number;
  netCashProceedsZAR?: number;
  soldDate?: string;
  exitNotes?: string;
}

// Global Portfolio Aggregates
export interface PortfolioSummary {
  totalGrossAssetValue: number;
  totalRentalValue: number;
  totalFlipValue: number;
  liquidCapitalReserve: number;
  unallocatedFundingReserve: number;
  totalAvailablePurchasingPower: number;
  totalFundingLiabilities: number;
  totalPrivateFundingLiability: number;
  totalBondLiabilities: number;
  netEquity: number;
  monthlyNetRentalCashflow: number;
  totalProjectedFlipProfits: number;
  totalRealizedFlipProfits: number;
  activeRentalsCount: number;
  soldRentalsCount: number;
  activeFlipsCount: number;
  completedFlipsCount: number;
  pendingOpportunitiesCount: number;
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
  depositHeldZAR?: number; // e.g. 6965.17
  netOperatingIncomeZAR?: number; // e.g. 5525.03
  netPayoutZAR?: number; // alias for netOperatingIncomeZAR
  managingAgent?: string;
  statementDate?: string;
}


