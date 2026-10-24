import { formatZAR, formatPercent, formatDate } from './formatters';
import { OpportunityDeal, FlipProject, InvestorProfile, DealStrategy, DealSource, RentalProperty, TenantPaymentRecord, OccupantRiskProfile, ReturnTermType, AncillaryIncome, UtilityStatement, LeaseInspectionRecord } from '@/types';
import { generateLongTermProjection, calculateMonthlyBondRepayment, calculateDealMetrics } from './calculations/propertyMetrics';
import { calculatePropertyArrears, formatMonthLabel, getMonthKey, calculateTenantStatementTiers } from './calculations/arrears';
import { isEvictionActive, calculateEvictionCarryingCost } from './calculations/occupantRisk';
import { calculateInspectionDepositSummary, ensureInspectionItems } from './calculations/inspections';

export interface ProposalPitchParams {
  deal: {
    id: string;
    title: string;
    address: string;
    city: string;
    purchasePrice: number;
    acquisitionCosts: number;
    renovationBudget: number;
    targetExitPrice: number;
    completionDate?: string;
    strategy?: DealStrategy;
    source?: DealSource;
    builtInEquity?: number;
    builtInEquityPercent?: number;
    auctioneerCommission?: number;
    municipalArrears?: number;
    exitCommissionPercent?: number;
    isSection13Eligible?: boolean;
    numberOfUnits?: number;
    floorAreaSqm?: number;
    isVatInclusiveDeveloperSale?: boolean;
    tenantPlacementFeePercent?: number;
    annualSpvAdminAuditFeeZAR?: number;
    arvZAR?: number;
    refinanceLtvPercent?: number;
    holdingDurationMonths?: number;
    monthlyHoldingCost?: number;
    monthlyBondHolding?: number;
    monthlyLeviesHolding?: number;
    monthlyRatesHolding?: number;
    monthlyOtherHolding?: number;
    monthlyRent?: number;
    monthlyLevies?: number;
    monthlyRates?: number;
    depositZAR?: number;
    loanToValue?: number;
    bondLTV?: number;
    bondCancellationFeeZAR?: number;
    earlyTerminationNoticeGiven?: boolean;
    earlyTerminationPenaltyZAR?: number;
    interestRatePercent?: number;
    loanTermYears?: number;
    bondTermYears?: number;
    annualCapitalGrowthPercent?: number;
    annualRentalEscalationPercent?: number;
    annualExpenseInflationPercent?: number;
    primaryFunderName?: string;
    primaryFunderContact?: string;
    coFundersNotes?: string;
    ancillaryIncomes?: any[];
    type?: 'flip' | 'opportunity' | 'rental';
    collectionRate?: number;
    totalCollected12m?: number;
    totalBilled12m?: number;
    tenantArrears?: number;
    overdueMonths?: number;
    occupantRisk?: OccupantRiskProfile;
    notes?: string;
  };
  strategy: DealStrategy;
  capitalRequested: number;
  fundingOfferType: ReturnTermType | 'Profit Share';
  offeredRate: number;
  securityType: string;
  notes?: string;
  investorProfile?: InvestorProfile;
}

/**
 * Formats a high-priority PIE Act statutory risk and contractor protection block for WhatsApp pitch sharing.
 */
export function formatPieActWhatsAppBlock(risk?: OccupantRiskProfile | null): string {
  if (!risk || risk.occupancyStatus !== 'unlawful_occupant') return '';
  const courtLabel =
    risk.evictionJurisdiction === 'high_court'
      ? "High Court (Opposed / Complex Proceedings)"
      : "Magistrate's Court (Unopposed Proceedings)";

  let text = `*⚠️ SITE POSSESSION & STATUTORY RISK (PIE ACT)*\n`;
  text += `• Occupancy Status: *Unlawful Occupants Present*\n`;
  text += `• Legal Jurisdiction: *${courtLabel}*\n`;
  text += `• Estimated Eviction Delay: *~${risk.estimatedEvictionDelayDays} Days*\n`;
  text += `• Budgeted Legal Eviction Reserve: *${formatZAR(risk.budgetedLegalEvictionCostZAR)}*\n`;
  if (risk.monthlySiteSecurityZAR > 0) {
    text += `• Monthly Armed Site Security: *${formatZAR(risk.monthlySiteSecurityZAR)}/m*\n`;
  }
  text += `• Contractor Protection Gate: *Active* (Contractor site access and renovation capital draws gated until Sheriff of the Court executes eviction order & issues return of service)\n`;
  text += `• Statutory Mandate: Governed under Section 4(2) of Act 19 of 1998 (Common-law prohibition against self-help, lock-outs, or utility cut-offs)\n\n`;
  return text;
}

/**
 * Formats deal metrics into clean corporate plain text ready for WhatsApp copy/paste or wa.me link.
 * Adapts formatting to deal strategy: Flips emphasize holding period carrying burn rate and true net profit;
 * Rentals/BRRRR emphasize yields, net cash flow, and 10/20-year wealth compounding.
 */
export function formatOpportunityForWhatsApp(
  deal: OpportunityDeal,
  investorProfile?: InvestorProfile
): string {
  const isFlip = deal.strategy === 'Flip';
  const isBrrrr = deal.strategy === 'BRRRR';
  const isSection13 = deal.section13sex?.isEligible;

  // Header and Strategy Tag
  let text = isFlip
    ? `*BUY-AND-FLIP OPPORTUNITY*\n`
    : isBrrrr
    ? `*HYBRID BRRRR INVESTMENT OPPORTUNITY*\n`
    : `*BUY-AND-HOLD RENTAL OPPORTUNITY*\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Property: *${deal.title}*\n`;
  text += `• Location: ${deal.address}, ${deal.city} (${deal.province})\n`;
  if (deal.numberOfUnits && deal.numberOfUnits > 1) {
    text += `• Multi-Unit Configuration: *${deal.numberOfUnits} Units* (${formatZAR(Math.round(deal.purchasePrice / deal.numberOfUnits))}/unit)\n`;
  }
  if (deal.floorAreaSqm && deal.floorAreaSqm > 0) {
    const pSqm = Math.round(deal.purchasePrice / deal.floorAreaSqm);
    const vSqm = deal.openMarketValueZAR ? Math.round(deal.openMarketValueZAR / deal.floorAreaSqm) : 0;
    text += `• Floor Area: *${deal.floorAreaSqm} m²* (Purchase: *${formatZAR(pSqm)}/m²*${vSqm > 0 ? ` | Valuation: ${formatZAR(vSqm)}/m²` : ''})\n`;
  }
  if (deal.amenityScorecard) {
    text += `• Location Grade: *${deal.amenityScorecard.compositeGrade}* (${deal.amenityScorecard.compositeScore}/12 pts)\n`;
    text += `  - Schools: ${deal.amenityScorecard.schools} | Police: ${deal.amenityScorecard.policeStation}\n`;
    text += `  - Healthcare: ${deal.amenityScorecard.medicalClinic} | Retail/Mall: ${deal.amenityScorecard.shoppingMall}\n`;
  }
  text += `• Strategy: ${isFlip ? 'Buy & Flip' : isBrrrr ? 'Hybrid BRRRR' : 'Buy & Hold Rental'} • Sourcing: ${deal.source} • Status: ${deal.status}\n\n`;

  if (deal.occupantRisk?.occupancyStatus === 'unlawful_occupant') {
    text += formatPieActWhatsAppBlock(deal.occupantRisk);
  }

  if (isFlip) {
    // BUY-AND-FLIP METRICS
    const holdingDuration = deal.holdingPeriodMonths || 6;
    const bondLtv = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
    const monthlyBond = deal.monthlyBondPaymentZAR ?? (bondLtv > 0 ? calculateMonthlyBondRepayment(deal.purchasePrice * (bondLtv / 100), deal.interestRatePercent ?? 11.75, deal.bondTermYears ?? deal.loanTermYears ?? 20) : 0);
    const monthlyLevies = deal.monthlyLevies ?? 0;
    const monthlyRates = deal.monthlyRatesTaxes ?? 0;
    const monthlyOther = deal.monthlyOtherHoldingCostZAR ?? 1500;
    const monthlyBurnRate = deal.monthlyHoldingCostZAR || (monthlyBond + monthlyLevies + monthlyRates + monthlyOther);

    const isEviction = isEvictionActive(deal.occupantRisk);
    const evictionCosts = calculateEvictionCarryingCost({
      risk: deal.occupantRisk,
      monthlyBondInterestZAR: monthlyBond,
      monthlyRatesZAR: monthlyRates,
      monthlyLeviesZAR: monthlyLevies,
    });
    const evictionDelayBurn = isEviction ? evictionCosts.evictionDelayBurnZAR : 0;
    const legalEvictionReserve = isEviction ? Math.max(0, deal.occupantRisk?.budgetedLegalEvictionCostZAR || 0) : 0;
    const totalHoldingReserve = (monthlyBurnRate * holdingDuration) + evictionDelayBurn;

    const exitCommissionPercent = deal.exitCommissionPercent ?? 5.75;
    const exitCommission = (deal.targetExitPrice || 0) > 0 ? ((deal.targetExitPrice || 0) * exitCommissionPercent) / 100 : 0;
    const hasBond = monthlyBond > 0 || (deal.bondLTV ?? deal.loanToValuePercent ?? 0) > 0;
    const bondCancellationFee = hasBond
      ? (deal.bondCancellationFeeZAR !== undefined && deal.bondCancellationFeeZAR !== null ? deal.bondCancellationFeeZAR : 5200)
      : 0;
    const earlyPenalty = hasBond && deal.earlyTerminationNoticeGiven === false
      ? (deal.earlyTerminationPenaltyZAR !== undefined && deal.earlyTerminationPenaltyZAR !== null ? deal.earlyTerminationPenaltyZAR : Math.round(3 * monthlyBond))
      : 0;
    const exitLegalCosts = bondCancellationFee + earlyPenalty;
    const acquisitionLegalAndDuty = deal.costs.totalAcquisitionCost - deal.purchasePrice;
    const totalProjectCost = deal.purchasePrice + acquisitionLegalAndDuty + deal.estimatedRehabCost + legalEvictionReserve + totalHoldingReserve + exitCommission + exitLegalCosts;
    const projectedNetProfit = (deal.targetExitPrice || 0) - totalProjectCost;
    const projectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;

    const ltvVal = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
    const depositVal = deal.depositZAR !== undefined ? deal.depositZAR : Math.round(deal.purchasePrice * (1 - ltvVal / 100));
    const initialCap = deal.initialCapitalRequired ?? (depositVal + acquisitionLegalAndDuty + deal.estimatedRehabCost + legalEvictionReserve);

    text += `*CAPITAL & ACQUISITION BREAKDOWN (ZAR)*\n`;
    if (deal.openMarketValueZAR) {
      text += `• Open Market Value: *${formatZAR(deal.openMarketValueZAR)}*\n`;
      text += `• Target Purchase / Bid: *${formatZAR(deal.purchasePrice)}*\n`;
      text += `• Built-in Equity: *${formatZAR(deal.builtInEquityZAR)}* (${deal.builtInEquityPercent >= 0 ? '+' : ''}${formatPercent(deal.builtInEquityPercent)} Below Valuation)\n`;
    } else {
      text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
    }
    text += `• SARS Duty & Legal: ${formatZAR(acquisitionLegalAndDuty)}${deal.isVatInclusiveDeveloperSale ? ' (R 0 SARS Transfer Duty - VAT-Inclusive Developer Sale)' : ''}\n`;
    if (legalEvictionReserve > 0) {
      text += `• PIE Act Legal Eviction Reserve: *${formatZAR(legalEvictionReserve)}*\n`;
    }
    text += `• Renovation / Capex (BOQ): *${formatZAR(deal.estimatedRehabCost)}*\n`;
    text += `• Holding Period Reserve: *${formatZAR(totalHoldingReserve)}* (${isEviction ? `${holdingDuration}m works + ~${deal.occupantRisk?.estimatedEvictionDelayDays}d legal` : `${holdingDuration} mos`} @ ${formatZAR(monthlyBurnRate)}/m)\n`;
    text += `  ↳ Bond: ${formatZAR(monthlyBond)} | Levies: ${formatZAR(monthlyLevies)} | Rates: ${formatZAR(monthlyRates)} | Security: ${formatZAR(monthlyOther)}\n`;
    if (exitCommission > 0) {
      text += `• Exit Commission (${exitCommissionPercent}%): ${formatZAR(exitCommission)}\n`;
    }
    if (exitLegalCosts > 0) {
      text += `• Bond Cancellation & Exit Legal: ${formatZAR(exitLegalCosts)}${earlyPenalty > 0 ? ' (incl. 90-day early settlement penalty)' : ''}\n`;
    }
    text += `• Total Project Outlay: *${formatZAR(totalProjectCost)}*\n`;
    text += `• Initial Capital Required (Day 1): *${formatZAR(initialCap)}*\n`;

    const nominalRoi = projectROI;
    const annualizedRoi = holdingDuration > 0 ? nominalRoi * (12 / holdingDuration) : nominalRoi;

    text += `\n*EXIT VALUATION & PROJECTED PROFIT*\n`;
    text += `• Target Exit Price: *${formatZAR(deal.targetExitPrice)}*\n`;
    text += `• Projected Net Flip Profit: *${formatZAR(projectedNetProfit)}* (After capex & carrying escrow)\n`;
    text += `• Net Project ROI: *${formatPercent(nominalRoi)}* (Nominal)\n`;
    text += `• Annualized Net ROI: *${formatPercent(annualizedRoi)}*\n`;
  } else {
    // BUY-AND-HOLD RENTAL / BRRRR METRICS
    const isEviction = isEvictionActive(deal.occupantRisk);
    const legalEvictionReserve = isEviction ? Math.max(0, deal.occupantRisk?.budgetedLegalEvictionCostZAR || 0) : 0;
    const ltvVal = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
    const depositVal = deal.depositZAR !== undefined ? deal.depositZAR : Math.round(deal.purchasePrice * (1 - ltvVal / 100));
    const initialCap = deal.initialCapitalRequired ?? (depositVal + (deal.costs.totalAcquisitionCost - deal.purchasePrice) + deal.estimatedRehabCost + legalEvictionReserve);

    const liveMetrics = calculateDealMetrics({
      purchasePrice: deal.purchasePrice,
      openMarketValueZAR: deal.openMarketValueZAR,
      numberOfUnits: deal.numberOfUnits,
      floorAreaSqm: deal.floorAreaSqm,
      isVatInclusiveDeveloperSale: deal.isVatInclusiveDeveloperSale,
      depositZAR: depositVal,
      bondLTV: ltvVal,
      loanToValuePercent: deal.loanToValuePercent,
      interestRatePercent: deal.interestRatePercent,
      loanTermYears: deal.bondTermYears ?? deal.loanTermYears ?? 20,
      estimatedRehabCost: deal.estimatedRehabCost,
      targetExitPrice: deal.targetExitPrice,
      monthlyRentalEstimate: deal.monthlyRentalEstimate,
      monthlyLevies: deal.monthlyLevies,
      monthlyRatesTaxes: deal.monthlyRatesTaxes,
      monthlyCommunalServicesZAR: deal.monthlyCommunalServicesZAR,
      monthlyMaintenanceReserveZAR: deal.monthlyMaintenanceReserveZAR,
      monthlyPrepaidVendingFeeZAR: deal.monthlyPrepaidVendingFeeZAR,
      tenantPlacementFeePercent: deal.tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR: deal.annualSpvAdminAuditFeeZAR,
      managementFeePercent: deal.managementFeePercent ?? 8,
      agencyVatApplicable: deal.agencyVatApplicable ?? false,
      vacancyRatePercent: deal.vacancyRatePercent ?? 5,
      annualInsurance: deal.annualInsurance ?? 6000,
      strategy: deal.strategy,
      refinanceLtvPercent: deal.refinanceLtvPercent,
      occupantRisk: deal.occupantRisk,
    });

    text += `*FINANCIAL & ACQUISITION SUMMARY (ZAR)*\n`;
    if (deal.openMarketValueZAR) {
      text += `• Open Market Value: *${formatZAR(deal.openMarketValueZAR)}*\n`;
      text += `• Target Purchase / Bid: *${formatZAR(deal.purchasePrice)}*\n`;
      text += `• Built-in Equity: *${formatZAR(deal.builtInEquityZAR)}* (${deal.builtInEquityPercent >= 0 ? '+' : ''}${formatPercent(deal.builtInEquityPercent)} Below Valuation)\n`;
    } else {
      text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
    }
    text += `• SARS Duty & Legal: ${formatZAR(deal.costs.totalAcquisitionCost - deal.purchasePrice)}${deal.isVatInclusiveDeveloperSale ? ' (R 0 SARS Transfer Duty - VAT-Inclusive Developer Sale)' : ''}\n`;
    if (legalEvictionReserve > 0) {
      text += `• PIE Act Legal Eviction Reserve: *${formatZAR(legalEvictionReserve)}*\n`;
    }
    text += `• Total Acquisition Cost: *${formatZAR(deal.costs.totalAcquisitionCost + legalEvictionReserve)}*\n`;
    text += `• Financing: *${ltvVal}% LTV* (Deposit: *${formatZAR(depositVal)}*)\n`;
    if (deal.estimatedRehabCost > 0) {
      text += `• Renovation / Capex: ${formatZAR(deal.estimatedRehabCost)}\n`;
    }
    text += `• Initial Capital Required (Day 1): *${formatZAR(initialCap)}*\n`;

    text += `\n*CASH FLOW & YIELD PERFORMANCE*\n`;
    text += `• Est. Gross Rent: *${formatZAR(deal.monthlyRentalEstimate)}/m*\n`;
    text += `• Gross Yield: *${formatPercent(deal.grossYield)}* | Cap Rate: *${formatPercent(deal.capRate)}*\n`;
    const dscrStr = liveMetrics.dscr !== null ? `${liveMetrics.dscr.toFixed(2)}x` : 'N/A (Cash)';
    text += `• Debt Service Coverage (DSCR): *${dscrStr}* | 5-Yr IRR: *${formatPercent(liveMetrics.fiveYearIrrPercent)}*\n`;
    text += `• Net Cash Flow: *${formatZAR(deal.monthlyCashFlow)}/m* (After bond, levies, rates${deal.monthlyCommunalServicesZAR ? ', communal services' : ''})\n`;
    if (deal.monthlyCommunalServicesZAR) {
      text += `• Communal / Serviced OpEx: *${formatZAR(deal.monthlyCommunalServicesZAR)}/m* (Wi-Fi, cleaning, security, garden)\n`;
    }
    if ((deal.tenantPlacementFeePercent ?? 0) > 0 || (deal.annualSpvAdminAuditFeeZAR ?? 0) > 0) {
      text += `• Corporate & Placement Provision: Placement ${formatZAR(liveMetrics.monthlyPlacementFeeZAR)}/m (${deal.tenantPlacementFeePercent ?? 8.33}% p.a.) | SPV Audit/Tax ${formatZAR(liveMetrics.monthlySpvAdminZAR)}/m\n`;
    }

    if (isBrrrr) {
      const refiLtv = deal.refinanceLtvPercent ?? 75;
      text += `\n*PHASE 2 BRRRR REFINANCE MODEL*\n`;
      text += `• Post-Rehab Valuation (ARV): *${formatZAR(deal.targetExitPrice || deal.openMarketValueZAR || deal.purchasePrice)}* (${refiLtv}% Refi LTV)\n`;
      text += `• Refinance Facility: *${formatZAR(liveMetrics.brrrrRefinanceLoanZAR)}*\n`;
      if (liveMetrics.brrrrEquityExtractedZAR > 0) {
        text += `• Tax-Free Equity Extracted: *+${formatZAR(liveMetrics.brrrrEquityExtractedZAR)}* (Infinite Return)\n`;
      } else {
        text += `• Net Capital Left in Deal: *${formatZAR(liveMetrics.brrrrCashLeftInDealZAR)}*\n`;
      }
      text += `• Post-Refinance Cash Flow: *${formatZAR(liveMetrics.brrrrPostRefiCashflowZAR)}/m*\n`;
    }

    // Ancillary Commercial Covenant Lines (P4)
    if (deal.ancillaryIncomes?.length) {
      text += `\n*ANCILLARY COMMERCIAL COVENANTS*\n`;
      deal.ancillaryIncomes.forEach((a: any) => {
        const typeLabel = a.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        text += `• ${a.tenantName} (${typeLabel}): *${formatZAR(a.monthlyRentZAR)}/m* (${a.annualEscalationPercent}% escalation, expires ${a.contractEndDate})${a.vatApplicable ? ' +VAT' : ''}\n`;
      });
      const ancTotal = deal.ancillaryIncomes.reduce((s: number, a: any) => s + a.monthlyRentZAR, 0);
      text += `• Combined Gross Income: *${formatZAR(deal.monthlyRentalEstimate + ancTotal)}/m*\n`;
    }

    // Long-Term Wealth Compounding
    const projections = generateLongTermProjection({
      purchasePrice: deal.purchasePrice,
      openMarketValueZAR: deal.openMarketValueZAR,
      depositZAR: depositVal,
      bondLTV: ltvVal,
      interestRatePercent: deal.interestRatePercent,
      loanTermYears: deal.bondTermYears ?? deal.loanTermYears ?? 20,
      bondTermYears: deal.bondTermYears ?? 20,
      annualCapitalGrowthPercent: deal.annualCapitalGrowthPercent ?? 5.0,
      annualRentalEscalationPercent: deal.annualRentalEscalationPercent ?? 6.0,
      annualExpenseInflationPercent: deal.annualExpenseInflationPercent ?? 6.0,
      monthlyRentalEstimate: deal.monthlyRentalEstimate,
      monthlyLevies: deal.monthlyLevies,
      monthlyRatesTaxes: deal.monthlyRatesTaxes,
      monthlyCommunalServicesZAR: deal.monthlyCommunalServicesZAR,
      monthlyMaintenanceReserveZAR: deal.monthlyMaintenanceReserveZAR,
      monthlyPrepaidVendingFeeZAR: deal.monthlyPrepaidVendingFeeZAR,
      tenantPlacementFeePercent: deal.tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR: deal.annualSpvAdminAuditFeeZAR,
      managementFeePercent: deal.managementFeePercent,
      agencyVatApplicable: deal.agencyVatApplicable,
      vacancyRatePercent: deal.vacancyRatePercent,
      annualInsurance: deal.annualInsurance,
    });

    if (projections.length >= 10) {
      const p10 = projections[9];
      const pFinal = projections[projections.length - 1];
      text += `\n*LONG-TERM WEALTH COMPOUNDING*\n`;
      text += `• 10-Yr Net Equity: *${formatZAR(p10.netEquity)}* (Valuation: ${formatZAR(p10.propertyValue)})\n`;
      text += `• ${pFinal.year}-Yr Net Equity (Debt-Free): *${formatZAR(pFinal.netEquity)}*\n`;
      text += `• Escalation: ${deal.annualCapitalGrowthPercent ?? 5}% Capital • ${deal.annualRentalEscalationPercent ?? 6}% Rent Escalation\n`;
    }

    if (isSection13 && deal.section13sex) {
      text += `\n*SARS SECTION 13SEX TAX SHIELD*\n`;
      text += `• Annual 5% Write-off: *${formatZAR(deal.section13sex.annualAllowanceZAR)}/yr*\n`;
      text += `• Annual Tax Savings: *${formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr* (${deal.section13sex.taxRatePercent}% bracket)\n`;
      text += `• 20-Yr Cumulative Benefit: *${formatZAR(deal.section13sex.twentyYearCumulativeSavingsZAR)}*\n`;
    }
  }

  // Funding Campaign (if active)
  if (deal.fundingRequiredZAR) {
    const oppRemaining = Math.max(0, (deal.fundingRequiredZAR || 0) - (deal.capitalRaisedZAR || 0));
    text += `\n*FUNDING CAMPAIGN*\n`;
    text += `• Target Facility: *${formatZAR(deal.fundingRequiredZAR)}*\n`;
    text += `• Capital Secured: *${formatZAR(deal.capitalRaisedZAR || 0)}*\n`;
    text += `• Open Syndicate Balance: *${formatZAR(oppRemaining)}*\n`;
    if (deal.promisedReturnRatePercent) {
      text += `• Offered Return: *${deal.promisedReturnRatePercent}%* (${deal.promisedReturnType || 'Fixed Interest'})\n`;
      text += `• Payout: ${deal.promisedPayoutSchedule || 'Monthly Interest'} | Security: ${deal.securityOffered || '2nd Mortgage Bond'}\n`;
    }
  }

  if (deal.driveVault?.masterFolderUrl) {
    text += `\n• Document Vault: ${deal.driveVault.masterFolderUrl}\n`;
  }

  if (investorProfile) {
    text += `\n• Sponsor: ${investorProfile.entityName} ${investorProfile.tradingAs ? `(T/A ${investorProfile.tradingAs})` : ''}\n`;
    text += `• Tel: ${investorProfile.contactNumber} | Email: ${investorProfile.email}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Confidential Deal Sheet • SA Property Investment Hub_`;

  return text;
}

/**
 * Formats a Buy-and-Flip project for WhatsApp.
 * Accurately capitalizes holding period carrying costs into total capital and deducts them from net profit.
 */
export function formatFlipForWhatsApp(
  flip: FlipProject,
  investorProfile?: InvestorProfile
): string {
  const holdingDuration = flip.estimatedDurationMonths ?? 6;
  const monthlyBond = flip.monthlyBondPaymentZAR ?? 0;
  const monthlyLevies = flip.monthlyLeviesZAR ?? 0;
  const monthlyRates = flip.monthlyRatesTaxesZAR ?? 0;
  const monthlyOther = flip.monthlyOtherHoldingCostZAR ?? 0;
  const monthlyHolding = flip.monthlyHoldingCostZAR || (monthlyBond + monthlyLevies + monthlyRates + monthlyOther);

  const isEviction = isEvictionActive(flip.occupantRisk);
  const evictionCosts = calculateEvictionCarryingCost({
    risk: flip.occupantRisk,
    monthlyBondInterestZAR: monthlyBond,
    monthlyRatesZAR: monthlyRates,
    monthlyLeviesZAR: monthlyLevies,
  });
  const evictionDelayBurn = isEviction ? evictionCosts.evictionDelayBurnZAR : 0;
  const legalEvictionReserve = isEviction ? Math.max(0, flip.occupantRisk?.budgetedLegalEvictionCostZAR || 0) : 0;
  const totalHoldingReserve = (monthlyHolding * holdingDuration) + evictionDelayBurn;

  const boqSum = (flip.boq || []).reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0);
  const totalBoq = boqSum > 0 ? boqSum : flip.baselineRenovationBudgetZAR;
  const sec118Cost =
    (flip.municipalClearance?.sec118ArrearsZAR || 0) +
    (flip.municipalClearance?.advanceCouncilDepositZAR || 0);
  const exitCommissionPercent = flip.exitCommissionPercent ?? 5.75;
  const exitCommission = flip.targetExitPriceZAR > 0 ? (flip.targetExitPriceZAR * exitCommissionPercent) / 100 : 0;
  const hasBond = (flip.monthlyBondPaymentZAR ?? 0) > 0;
  const bondCancellationFee = hasBond
    ? (flip.bondCancellationFeeZAR !== undefined && flip.bondCancellationFeeZAR !== null ? flip.bondCancellationFeeZAR : 5200)
    : 0;
  const earlyPenalty = hasBond && flip.earlyTerminationNoticeGiven === false
    ? (flip.earlyTerminationPenaltyZAR !== undefined && flip.earlyTerminationPenaltyZAR !== null ? flip.earlyTerminationPenaltyZAR : Math.round(3 * (flip.monthlyBondPaymentZAR ?? 0)))
    : 0;
  const exitLegalCosts = bondCancellationFee + earlyPenalty;
  const totalCost = flip.purchasePriceZAR + flip.acquisitionCostsZAR + totalBoq + legalEvictionReserve + totalHoldingReserve + sec118Cost + exitCommission + exitLegalCosts;
  const netProfit = flip.targetExitPriceZAR - totalCost;
  const nominalRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const annualizedRoi = holdingDuration > 0 ? nominalRoi * (12 / holdingDuration) : nominalRoi;

  const fundingReq = flip.fundingRequiredZAR ?? Math.round(totalCost * 0.7);
  const capitalRaised = flip.capitalRaisedZAR ?? 0;
  const remainingReq = Math.max(0, fundingReq - capitalRaised);
  const pctFunded = fundingReq > 0 ? Math.min(100, Math.round((capitalRaised / fundingReq) * 100)) : 0;

  let text = `*BUY-AND-FLIP DEAL SNAPSHOT*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Project: *${flip.title}*\n`;
  text += `• Location: ${flip.address}, ${flip.city}\n`;
  text += `• Phase: ${flip.currentPhase} • Target Exit: ${flip.targetCompletionDate}\n\n`;

  if (flip.occupantRisk?.occupancyStatus === 'unlawful_occupant') {
    text += formatPieActWhatsAppBlock(flip.occupantRisk);
  }

  text += `*CAPITAL & BUDGET BREAKDOWN (ZAR)*\n`;
  text += `• Purchase Price: *${formatZAR(flip.purchasePriceZAR)}*\n`;
  text += `• Acquisition Costs: ${formatZAR(flip.acquisitionCostsZAR)}\n`;
  if (legalEvictionReserve > 0) {
    text += `• PIE Act Legal Eviction Reserve: *${formatZAR(legalEvictionReserve)}*\n`;
  }
  text += `• BOQ Renovation Spend: *${formatZAR(totalBoq)}* (Budget: ${formatZAR(flip.baselineRenovationBudgetZAR)})\n`;
  text += `• Holding Period Reserve: *${formatZAR(totalHoldingReserve)}* (${isEviction ? `${holdingDuration}m works + ~${flip.occupantRisk?.estimatedEvictionDelayDays}d legal` : `${holdingDuration} mos`} @ ${formatZAR(monthlyHolding)}/m)\n`;
  text += `  ↳ Bond: ${formatZAR(monthlyBond)} | Levies: ${formatZAR(monthlyLevies)} | Rates: ${formatZAR(monthlyRates)} | Security: ${formatZAR(monthlyOther)}\n`;
  if (sec118Cost > 0) {
    text += `• Municipal Clearance (Sec 118): ${formatZAR(sec118Cost)}\n`;
  }
  if (exitCommission > 0) {
    text += `• Exit Commission (${exitCommissionPercent}%): ${formatZAR(exitCommission)}\n`;
  }
  text += `• Total Capital Invested: *${formatZAR(totalCost)}*\n\n`;

  text += `*PROFIT & EXIT VALUATION*\n`;
  text += `• Target Exit Price: *${formatZAR(flip.targetExitPriceZAR)}*\n`;
  text += `• Projected Net Profit: *${formatZAR(netProfit)}* (After capex & holding reserve)\n`;
  text += `• Project Net ROI (Nominal): *${formatPercent(nominalRoi)}*\n`;
  text += `• Annualized Net ROI: *${formatPercent(annualizedRoi)}*\n`;

  text += `\n*FUNDING & SYNDICATE STATUS*\n`;
  text += `• Target Facility Required: *${formatZAR(fundingReq)}*\n`;
  text += `• Capital Secured: *${formatZAR(capitalRaised)}* (${pctFunded}% Funded)\n`;
  text += `• Balance Open: *${formatZAR(remainingReq)}*\n`;
  if (flip.primaryFunderName) {
    text += `• Lead Funder: *${flip.primaryFunderName}* (${flip.primaryFunderType || 'Private Lender'})\n`;
  }
  if (flip.promisedReturnRatePercent) {
    text += `• Promised Return: *${flip.promisedReturnRatePercent}%* (${flip.promisedReturnType || 'Fixed Interest'})\n`;
    text += `• Payout: ${flip.promisedPayoutSchedule || 'Monthly Interest'} | Security: ${flip.securityOffered || '2nd Mortgage Bond'}\n`;
  }

  if (flip.driveVault?.masterFolderUrl) {
    text += `\n• Cloud Deal Folder: ${flip.driveVault.masterFolderUrl}\n`;
  }

  if (investorProfile) {
    text += `\n• Lead Developer: ${investorProfile.entityName}\n`;
    text += `• Contact: ${investorProfile.contactNumber} | Email: ${investorProfile.email}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Confidential Syndicate Update • SA Property Investment Hub_`;

  return text;
}

/**
 * Formats tailored Proposal Generator pitch terms for WhatsApp private lender syndication.
 */
export function formatProposalPitchForWhatsApp(
  params: ProposalPitchParams
): string {
  const { deal, strategy, capitalRequested, fundingOfferType, offeredRate, securityType, investorProfile } = params;
  const isFlip = strategy === 'Flip';

  const holdingDuration = deal.holdingDurationMonths || 6;
  const monthlyBond = deal.monthlyBondHolding ?? 0;
  const monthlyLevies = deal.monthlyLeviesHolding ?? 0;
  const monthlyRates = deal.monthlyRatesHolding ?? 0;
  const monthlyOther = deal.monthlyOtherHolding ?? 0;
  const monthlyBurn = deal.monthlyHoldingCost || (monthlyBond + monthlyLevies + monthlyRates + monthlyOther);

  const isEviction = isEvictionActive(deal.occupantRisk);
  const evictionCosts = calculateEvictionCarryingCost({
    risk: deal.occupantRisk,
    monthlyBondInterestZAR: monthlyBond,
    monthlyRatesZAR: monthlyRates,
    monthlyLeviesZAR: monthlyLevies,
  });
  const evictionDelayBurn = isFlip && isEviction ? evictionCosts.evictionDelayBurnZAR : 0;
  const legalEvictionReserve = isEviction ? Math.max(0, deal.occupantRisk?.budgetedLegalEvictionCostZAR || 0) : 0;
  const holdingReserve = isFlip ? (monthlyBurn * holdingDuration) + evictionDelayBurn : 0;

  const auctionFee = deal.auctioneerCommission ?? 0;
  const arrears = deal.municipalArrears ?? 0;
  const exitCommissionPercent = deal.exitCommissionPercent ?? 5.75;
  const exitCommission = isFlip && deal.targetExitPrice > 0 ? (deal.targetExitPrice * exitCommissionPercent) / 100 : 0;

  const hasBond = (deal.monthlyBondHolding ?? 0) > 0 || (deal.bondLTV ?? 0) > 0;
  const bondCancellationFee = isFlip && hasBond
    ? (deal.bondCancellationFeeZAR !== undefined && deal.bondCancellationFeeZAR !== null ? deal.bondCancellationFeeZAR : 5200)
    : 0;
  const earlyPenalty = isFlip && hasBond && deal.earlyTerminationNoticeGiven === false
    ? (deal.earlyTerminationPenaltyZAR !== undefined && deal.earlyTerminationPenaltyZAR !== null ? deal.earlyTerminationPenaltyZAR : Math.round(3 * (deal.monthlyBondHolding || 0)))
    : 0;
  const exitLegalCosts = bondCancellationFee + earlyPenalty;

  const totalProjectCost =
    deal.purchasePrice +
    deal.acquisitionCosts +
    deal.renovationBudget +
    legalEvictionReserve +
    holdingReserve +
    auctionFee +
    arrears +
    exitCommission +
    exitLegalCosts;
  const projectedNetProfit = deal.targetExitPrice - totalProjectCost;
  const projectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;
  const loanToCost = totalProjectCost > 0 ? (capitalRequested / totalProjectCost) * 100 : 0;

  const durationMonths = holdingDuration || 6;
  const durationFactor = durationMonths / 12;

  const normalizedType: ReturnTermType =
    fundingOfferType === 'Profit Share' ? 'Equity Profit Split' : fundingOfferType;

  let proposedReturnLabel = '';
  let couponPayoutLabel = '';
  let projectedPayoutDetails = '';
  let projectedLenderPayout = capitalRequested;

  if (normalizedType === 'Equity Profit Split') {
    const profitShareAmount = Math.round(projectedNetProfit * (offeredRate / 100));
    projectedLenderPayout = capitalRequested + profitShareAmount;
    proposedReturnLabel = `*${offeredRate}%* (Net Profit Split)`;
    couponPayoutLabel = 'At property transfer';
    projectedPayoutDetails = `*${formatZAR(projectedLenderPayout)}* (${formatZAR(profitShareAmount)} profit share on exit)`;
  } else if (normalizedType === 'Monthly Coupon') {
    const monthlyCoupon = Math.round((capitalRequested * (offeredRate / 100)) / 12);
    const totalCoupon = monthlyCoupon * durationMonths;
    projectedLenderPayout = capitalRequested + totalCoupon;
    proposedReturnLabel = `*${offeredRate}%* (p.a. Monthly Coupon)`;
    couponPayoutLabel = 'Monthly in advance';
    projectedPayoutDetails = `*${formatZAR(projectedLenderPayout)}* (${formatZAR(monthlyCoupon)}/mo over ${durationMonths} months)`;
  } else if (normalizedType === 'Bullet Repayment') {
    const accruedReturn = Math.round(capitalRequested * (offeredRate / 100) * durationFactor);
    projectedLenderPayout = capitalRequested + accruedReturn;
    proposedReturnLabel = `*${offeredRate}%* (p.a. Bullet Return - Accrued)`;
    couponPayoutLabel = 'Lump sum at property transfer (0 monthly drag)';
    projectedPayoutDetails = `*${formatZAR(projectedLenderPayout)}* (${formatZAR(accruedReturn)} accrued return on exit)`;
  } else {
    // Fixed Interest
    const accruedReturn = Math.round(capitalRequested * (offeredRate / 100) * durationFactor);
    projectedLenderPayout = capitalRequested + accruedReturn;
    proposedReturnLabel = `*${offeredRate}%* (p.a. Fixed Interest)`;
    couponPayoutLabel = 'Monthly in advance';
    projectedPayoutDetails = `*${formatZAR(projectedLenderPayout)}*`;
  }

  let text = `*CONFIDENTIAL INVESTMENT MEMORANDUM*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Asset: *${deal.title}*\n`;
  text += `• Location: ${deal.address}, ${deal.city}, South Africa\n`;
  text += `• Strategy Mandate: *${isFlip ? 'Buy & Flip' : strategy === 'BRRRR' ? 'Hybrid BRRRR' : 'Buy & Hold Rental'}*\n`;
  if (deal.numberOfUnits && deal.numberOfUnits > 1) {
    text += `• Multi-Unit Configuration: *${deal.numberOfUnits} Units* (${formatZAR(Math.round(deal.purchasePrice / deal.numberOfUnits))}/unit)\n`;
  }
  if (deal.floorAreaSqm && deal.floorAreaSqm > 0) {
    text += `• Floor Area: *${deal.floorAreaSqm} m²* (${formatZAR(Math.round(deal.purchasePrice / deal.floorAreaSqm))}/m²)\n`;
  }

  if (deal.source) {
    if (deal.source === 'High-Street Auction') {
      text += `• Sourcing Channel: High-Street Auction (10% Cash Guarantee Secured)\n`;
    } else if (deal.source === 'Distressed Sale / Repo') {
      text += `• Sourcing Channel: Distressed Bank Repo (Municipal Arrears & Clearance Tracked)\n`;
    } else if (deal.source === 'iGrow Rentals') {
      text += `• Sourcing Channel: iGrow Rentals (Turnkey • Section 13sex Tax Shield • R0 Transfer Duty)\n`;
    } else if (deal.source === 'Direct Owner') {
      text += `• Sourcing Channel: Direct Private Seller (Off-Market Sourced • 0% Agent Commission)\n`;
    } else if (deal.source === 'Private Agent') {
      text += `• Sourcing Channel: Private Estate Agent (Compliant OTP • Verified Deeds Office CMA)\n`;
    }
  }

  if (investorProfile) {
    text += `• Sponsor: ${investorProfile.entityName} ${investorProfile.tradingAs ? `(T/A ${investorProfile.tradingAs})` : ''}\n`;
  }

  const pitchThesis = params.notes !== undefined ? params.notes : deal.notes;
  if (pitchThesis && pitchThesis.trim()) {
    text += `• Value-Add Thesis: "${pitchThesis.trim()}"\n`;
  }
  text += `\n`;

  if (deal.occupantRisk?.occupancyStatus === 'unlawful_occupant') {
    text += formatPieActWhatsAppBlock(deal.occupantRisk);
  }

  text += `*EXECUTIVE DEAL HIGHLIGHTS (ZAR)*\n`;
  text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
  if (deal.builtInEquity && deal.builtInEquity > 0) {
    text += `• Built-in Equity: *${formatZAR(deal.builtInEquity)}* (${deal.builtInEquityPercent ? `+${formatPercent(deal.builtInEquityPercent)}` : 'Capital Upside'})\n`;
  }
  if (auctionFee > 0) {
    text += `• Auctioneer Fee (10%+VAT): *${formatZAR(auctionFee)}*\n`;
  }
  if (deal.type !== 'rental' && arrears > 0) {
    text += `• Municipal Clearance Arrears: *${formatZAR(arrears)}*\n`;
  }
  if (deal.source === 'iGrow Rentals' || deal.isVatInclusiveDeveloperSale) {
    text += `• SARS Transfer Duty: *R 0* (VAT Inclusive Developer Stock)\n`;
  }
  if (deal.isSection13Eligible) {
    text += `• SARS Tax Shield: *Section 13sex Eligible* (5% p.a. Building Deduction)\n`;
  }
  if (deal.annualSpvAdminAuditFeeZAR && deal.annualSpvAdminAuditFeeZAR > 0) {
    text += `• Corporate SPV Admin & Audit: *${formatZAR(deal.annualSpvAdminAuditFeeZAR)}/yr*\n`;
  }
  text += `• Capex & Legal: ${formatZAR(deal.acquisitionCosts + deal.renovationBudget)}\n`;
  if (legalEvictionReserve > 0) {
    text += `• PIE Act Legal Eviction Reserve: *${formatZAR(legalEvictionReserve)}*\n`;
  }
  if (isFlip) {
    text += `• Holding Cost Escrow: *${formatZAR(holdingReserve)}* (${isEviction ? `${holdingDuration}m works + ~${deal.occupantRisk?.estimatedEvictionDelayDays}d legal` : `${holdingDuration} mos`} @ ${formatZAR(monthlyBurn)}/m)\n`;
    if (exitCommission > 0) {
      text += `• Exit Commission (${exitCommissionPercent}%): ${formatZAR(exitCommission)}\n`;
    }
    if (exitLegalCosts > 0) {
      text += `• Bond Cancellation & Exit Legal: ${formatZAR(exitLegalCosts)}${earlyPenalty > 0 ? ' (incl. 90-day early settlement penalty)' : ''}\n`;
    }
  }
  text += `• Total Project Outlay: *${formatZAR(totalProjectCost)}*\n`;
  text += `• Target Exit Price: *${formatZAR(deal.targetExitPrice)}*\n`;
  text += `• Projected Net Profit: *${formatZAR(projectedNetProfit)}*\n`;
  text += `• Project Net ROI: *${formatPercent(projectROI)}*\n`;

  if (deal.type === 'rental') {
    const colRate = deal.collectionRate ?? 100;
    const collected = deal.totalCollected12m ?? 0;
    const billed = deal.totalBilled12m ?? 0;
    const tArrears = deal.tenantArrears ?? 0;
    const colRateStr = Number(colRate.toFixed(1)).toString();

    text += `• 12-Mo Collection Rate: ${colRateStr}% (${formatZAR(collected)} of ${formatZAR(billed)})\n`;
    if (tArrears > 0) {
      text += `• Tenant Arrears Receivable: ${formatZAR(tArrears)} (Excluded from project outlay)\n`;
    }
    if (colRate < 90) {
      text += `⚠️ Diligence Note: Tenant Collection Risk flagged (<90% collection).\n`;
    }
  }
  text += `\n`;

  if (deal.ancillaryIncomes?.length) {
    text += `*ANCILLARY COMMERCIAL COVENANTS*\n`;
    deal.ancillaryIncomes.forEach((a: any) => {
      const typeLabel = a.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      text += `• ${a.tenantName} (${typeLabel}): *${formatZAR(a.monthlyRentZAR)}/m* (${a.annualEscalationPercent}% escalation, expires ${a.contractEndDate})${a.vatApplicable ? ' +VAT' : ''}\n`;
    });
    const ancTotal = deal.ancillaryIncomes.reduce((s: number, a: any) => s + a.monthlyRentZAR, 0);
    text += `• Combined Gross Income: *${formatZAR((deal.monthlyRent || 0) + ancTotal)}/m*\n\n`;
  }

  text += `*PROPOSED LENDER / PARTNER RETURN TERMS*\n`;
  text += `• Facility Principal: *${formatZAR(capitalRequested)}*\n`;
  text += `• Loan-to-Cost (LTC): *${formatPercent(loanToCost)}*\n`;
  text += `• Proposed Return: ${proposedReturnLabel}\n`;
  text += `• Coupon Payout: ${couponPayoutLabel}\n`;
  text += `• Security / Collateral: *${securityType}*\n`;
  if (deal.completionDate) {
    text += `• Target Maturity: ${formatDate(deal.completionDate)}\n`;
  }
  if (strategy === 'BRRRR') {
    const arv = deal.arvZAR || deal.targetExitPrice || Math.round(deal.purchasePrice * 1.3);
    const refiLtv = deal.refinanceLtvPercent || 75;
    const estRefiCash = Math.round(arv * (refiLtv / 100));
    text += `• Post-Rehab ARV Valuation: *${formatZAR(arv)}* (${refiLtv}% LTV Refi: ${formatZAR(estRefiCash)})\n`;
    text += `• Lender Capital Exit: Phase 2 Bank Refinance @ Month 6 (100% Principal Repaid to Investor)\n`;
  }
  text += `• Projected Total Payout: ${projectedPayoutDetails}\n`;

  if (investorProfile) {
    text += `\n• Contact Sponsor: ${investorProfile.contactNumber} | Email: ${investorProfile.email}\n`;
    if (investorProfile.website) text += `• Website: ${investorProfile.website}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Private & Confidential • Prepared for Invited Lenders & Syndicate Partners_`;

  return text;
}

export interface PaymentStatementDetails {
  funderName: string;
  funderEntity?: string;
  linkedAsset?: string;
  paymentType: string;
  returnTerms: string;
  amount: number;
  date: string;
  paymentReference?: string;
}

/**
 * Formats a 1-click WhatsApp payment statement receipt for private lenders or syndicate partners.
 */
export function formatPaymentStatement(details: PaymentStatementDetails): string {
  const {
    funderName,
    funderEntity,
    linkedAsset,
    paymentType,
    returnTerms,
    amount,
    date,
    paymentReference,
  } = details;

  const investorLine =
    funderEntity && funderEntity.trim().length > 0
      ? `${funderName} (${funderEntity.trim()})`
      : funderName;

  const assetLine =
    linkedAsset && linkedAsset.trim().length > 0
      ? linkedAsset.trim()
      : 'General Portfolio Liquidity';

  const formattedDate = date ? formatDate(date) : formatDate(new Date().toISOString().split('T')[0]);

  let text = `*INVESTMENT PAYMENT NOTIFICATION*\n`;
  text += `• Investor: ${investorLine}\n`;
  text += `• Linked Asset: ${assetLine}\n`;
  text += `• Payment Type: ${paymentType} (${returnTerms})\n`;
  text += `• Amount Disbursed: ${formatZAR(amount)}\n`;
  text += `• Date: ${formattedDate}\n`;
  if (paymentReference && paymentReference.trim().length > 0) {
    text += `• Reference: ${paymentReference.trim()}\n`;
  }
  text += `\n`;
  text += `Thank you for partnering with us. Your capital remains actively deployed and performing.`;

  return text;
}

export interface TenantAccountStatementOptions {
  leaseId?: string;
  month?: string; // 'YYYY-MM'
  investorProfile?: InvestorProfile;
  statementUrl?: string;
}

/**
 * Calculates the payment due date for a given billing period.
 * For example, a statement for '2026-04' (April 2026) is due on '1st May 2026'.
 */
export function getStatementDueDate(periodMonth?: string): string {
  if (!periodMonth) return '1st of the month';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // If format is 'YYYY-MM'
  if (/^\d{4}-\d{2}$/.test(periodMonth.trim())) {
    const [yStr, mStr] = periodMonth.trim().split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10); // 1 to 12
    if (!isNaN(year) && !isNaN(month)) {
      // 0-indexed Date month: passing month (1-12) yields the 1st of the subsequent month
      const nextMonthDate = new Date(year, month, 1);
      return `1st ${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
    }
  }

  // If format is like 'April 2026'
  const match = periodMonth.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const currentMonthIdx = monthNames.findIndex(
      (m) => m.toLowerCase() === match[1].toLowerCase()
    );
    const year = parseInt(match[2], 10);
    if (currentMonthIdx !== -1 && !isNaN(year)) {
      const nextMonthDate = new Date(year, currentMonthIdx + 1, 1);
      return `1st ${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
    }
  }

  return '1st of the upcoming month';
}

/**
 * Formats a 4-part account statement ready for WhatsApp transmission:
 * 1. Balance Brought Forward
 * 2. Current Period Charges (Rent + Utilities with meter readings)
 * 3. Less: Payments Received (Itemized list)
 * 4. Total Amount Due / Outstanding Balance
 * Followed by full structured EFT banking and remittance particulars.
 */
export function formatTenantAccountStatementForWhatsApp(
  rental: RentalProperty,
  options?: TenantAccountStatementOptions
): string {
  const targetMonth = options?.month || getMonthKey();
  const tiers = calculateTenantStatementTiers(rental, targetMonth, { leaseId: options?.leaseId });
  const arrearsResult = calculatePropertyArrears(rental, `${targetMonth}-01`, { leaseId: options?.leaseId });
  const currentMonthItem =
    tiers.currentItem ||
    arrearsResult.ledger.find((item) => item.month === targetMonth) ||
    arrearsResult.currentMonthItem;

  const selectedLease =
    (rental.leases || []).find((l) => l.id === options?.leaseId) || tiers.targetLease || rental.leases?.[0];
  const tenantName = selectedLease?.tenantName || 'Valued Tenant';
  const unitName = selectedLease?.unitName || 'Main Unit';
  const roomType = selectedLease?.roomType;
  const guarantorName = selectedLease?.guarantorName;
  const guarantorContact = selectedLease?.guarantorContact;

  const balanceBroughtForward = tiers.balanceBroughtForward;
  const periodPayments = tiers.periodPayments;
  const periodPaymentsTotal = tiers.periodPaymentsTotal;
  const totalAmountDue = tiers.totalAmountDue;
  const profile = options?.investorProfile;
  const entityName = profile?.entityName || 'Property Landlord';

  let text = `*TENANT ACCOUNT STATEMENT & TAX INVOICE*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Landlord: ${entityName}\n`;
  text += `• Property: ${rental.title} — ${unitName}${roomType ? ` (${roomType})` : ''}\n`;
  text += `• Address: ${rental.address}, ${rental.city}\n`;
  text += `• Tenant: ${tenantName}\n`;
  if (guarantorName) {
    text += `• Guarantor / Sponsor: ${guarantorName}${guarantorContact ? ` (${guarantorContact})` : ''}\n`;
  }
  text += `• Billing Period: ${currentMonthItem.monthLabel}\n\n`;

  // 1. Balance Brought Forward
  text += `*1. BALANCE BROUGHT FORWARD*\n`;
  if (balanceBroughtForward > 0) {
    text += `• Prior Period Arrears: *${formatZAR(balanceBroughtForward, { includeDecimals: true })}*\n\n`;
  } else if (balanceBroughtForward < 0) {
    text += `• Prior Period Credit: *-${formatZAR(Math.abs(balanceBroughtForward), { includeDecimals: true })}*\n\n`;
  } else {
    text += `• Prior Period Balance: *R 0.00* (Paid up)\n\n`;
  }

  // 2. Current Period Charges
  text += `*2. CURRENT PERIOD CHARGES*\n`;
  text += `• Base Contract Rent: ${formatZAR(currentMonthItem.baseRent, { includeDecimals: true })}\n`;
  if (currentMonthItem.utilityStatements.length > 0) {
    currentMonthItem.utilityStatements.forEach((stmt) => {
      const isBundled = stmt.billingType === 'bundled' || stmt.bundledUtilitiesZAR !== undefined;
      if (isBundled) {
        text += `• Utility Recovery (${stmt.bundledUtilityLabel || 'Water/Sewerage/Refuse'}): ${formatZAR(stmt.bundledUtilitiesZAR || 0, { includeDecimals: true })}\n`;
      } else {
        const elecReading =
          stmt.extractedMeterReadings?.find((r) => r.utilityType === 'electricity') ||
          rental.meterReadings?.find(
            (r) => r.utilityType === 'electricity' && (!stmt.statementDate || r.date.startsWith(stmt.statementDate.substring(0, 7)))
          );

        const waterReading =
          stmt.extractedMeterReadings?.find((r) => r.utilityType === 'water') ||
          rental.meterReadings?.find(
            (r) => r.utilityType === 'water' && (!stmt.statementDate || r.date.startsWith(stmt.statementDate.substring(0, 7)))
          );

        const formatMeterSuffix = (
          r?: { readingValue: number; previousReadingValue?: number; consumption?: number; readingType?: string },
          unit = ''
        ) => {
          if (!r) return '';
          if (r.previousReadingValue !== undefined && r.readingValue !== undefined) {
            const cons = r.consumption !== undefined ? r.consumption : r.readingValue - r.previousReadingValue;
            return ` (Reading: ${r.previousReadingValue} -> ${r.readingValue} = ${cons} ${unit}${r.readingType ? ` [${r.readingType}]` : ''})`;
          }
          if (r.consumption !== undefined) {
            return ` (Consumption: ${r.consumption} ${unit}${r.readingType ? ` [${r.readingType}]` : ''})`;
          }
          return '';
        };

        if (stmt.electricityZAR) {
          text += `  - Electricity: ${formatZAR(stmt.electricityZAR, { includeDecimals: true })}${formatMeterSuffix(elecReading, 'kWh')}\n`;
        }
        if (stmt.waterZAR) {
          text += `  - Water: ${formatZAR(stmt.waterZAR, { includeDecimals: true })}${formatMeterSuffix(waterReading, 'kL')}\n`;
        }
        if (stmt.refuseZAR) text += `  - Refuse: ${formatZAR(stmt.refuseZAR, { includeDecimals: true })}\n`;
        if (stmt.sewerageZAR) text += `  - Sewerage: ${formatZAR(stmt.sewerageZAR, { includeDecimals: true })}\n`;
      }
    });
    text += `• Subtotal Utilities: ${formatZAR(currentMonthItem.utilitiesBilled, { includeDecimals: true })}\n`;
  } else if (rental.utilityType === 'prepaid_submeter') {
    text += `• Utilities: Self-vended Prepaid Submeter (R 0.00 on statement)\n`;
  }
  text += `• *Total Current Charges: ${formatZAR(currentMonthItem.totalBilled, { includeDecimals: true })}*\n\n`;

  // 3. Less: Payments Received
  text += `*3. LESS: PAYMENTS RECEIVED*\n`;
  if (tiers.periodAllocatedPayments && tiers.periodAllocatedPayments.length > 0) {
    tiers.periodAllocatedPayments.forEach(({ payment: p, allocatedAmountZAR }) => {
      const isDeposit = p.paymentMethod === 'Deposit Applied';
      const methodLabel = isDeposit ? 'Deposit Applied' : p.paymentMethod;
      let allocDetail = '';
      if (p.allocations && p.allocations.length > 1) {
        const clearedMonths = p.allocations.map((a) => formatMonthLabel(a.periodMonth)).join(', ');
        allocDetail = ` (${formatZAR(allocatedAmountZAR)} of ${formatZAR(p.amountReceivedZAR)} lump sum — Cleared: ${clearedMonths})`;
      } else if (p.allocations && p.allocations.length === 1) {
        allocDetail = ` (Cleared: ${formatMonthLabel(p.allocations[0].periodMonth)})`;
      } else if (isDeposit) {
        allocDetail = ' (Deposit applied to arrears)';
      }
      text += `• ${formatDate(p.paymentDate)} [${methodLabel}]: -${formatZAR(allocatedAmountZAR, { includeDecimals: true })}${allocDetail}${p.reference ? ` (Ref: ${p.reference})` : ''}\n`;
    });
    text += `• *Total Payments Received: -${formatZAR(periodPaymentsTotal, { includeDecimals: true })}*\n\n`;
  } else if (periodPayments.length > 0) {
    periodPayments.forEach((p) => {
      const isDeposit = p.paymentMethod === 'Deposit Applied';
      const methodLabel = isDeposit ? 'Deposit Applied' : p.paymentMethod;
      const allocDetail = isDeposit ? ' (Deposit applied to arrears)' : '';
      text += `• ${formatDate(p.paymentDate)} [${methodLabel}]: -${formatZAR(p.amountReceivedZAR, { includeDecimals: true })}${allocDetail}${p.reference ? ` (Ref: ${p.reference})` : ''}\n`;
    });
    text += `• *Total Payments Received: -${formatZAR(periodPaymentsTotal, { includeDecimals: true })}*\n\n`;
  } else {
    text += `• No payments recorded for this period.\n\n`;
  }

  // Credits / Write-offs applied (Sanitized: internal notes/reasons omitted)
  if (tiers.periodWriteOffsTotal > 0) {
    text += `*CREDITS / BALANCE WRITE-OFFS*\n`;
    text += `• Credit applied (Balance written off): -${formatZAR(tiers.periodWriteOffsTotal, { includeDecimals: true })}\n\n`;
  }

  // 4. Total Amount Due / Outstanding Balance
  text += `*4. TOTAL AMOUNT DUE / OUTSTANDING BALANCE*\n`;
  if (totalAmountDue > 0) {
    text += `• *TOTAL AMOUNT DUE: ${formatZAR(totalAmountDue, { includeDecimals: true })}*\n`;
  } else if (totalAmountDue < 0) {
    text += `• *ACCOUNT IN CREDIT: -${formatZAR(Math.abs(totalAmountDue), { includeDecimals: true })}*\n`;
  } else {
    text += `• *TOTAL AMOUNT DUE: R 0.00 (PAID IN FULL)*\n`;
  }

  // Payment Reference: Unit + Tenant Surname (e.g., UNIT1-MOKOENA)
  const cleanUnit = unitName.replace(/\s+/g, '').toUpperCase() || 'UNIT';
  const tenantSurname =
    tenantName.trim().split(/\s+/).filter(Boolean).slice(-1)[0]?.toUpperCase() || 'TENANT';
  const paymentReference = `${cleanUnit}-${tenantSurname}`;
  const dueDateStr = getStatementDueDate(targetMonth);

  const hasBankDetails = Boolean(profile?.accountNumber && profile.accountNumber.trim().length > 0);

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*BANKING & PAYMENT DETAILS*\n`;
  if (hasBankDetails) {
    text += `• Bank: ${profile?.bankName || 'Standard Bank'}\n`;
    text += `• Account Name: ${profile?.accountHolder || profile?.entityName || entityName}\n`;
    text += `• Account Number: ${profile?.accountNumber}\n`;
    text += `• Branch Code: ${profile?.branchCode || 'Universal'}\n`;
    if (profile?.accountType) {
      text += `• Account Type: ${profile.accountType}\n`;
    }
    if (profile?.swiftCode) {
      text += `• SWIFT / BIC: ${profile.swiftCode}\n`;
    }
    text += `• Payment Reference: *${paymentReference}*\n`;
    text += `• Payment Due Date: *${dueDateStr}*\n`;
    if (profile?.email) {
      text += `• Proof of Payment: Send to ${profile.email}\n`;
    }
    if (profile?.remittanceInstructions) {
      text += `• Instructions: ${profile.remittanceInstructions}\n`;
    }
  } else {
    text += `• Account Name: ${entityName}\n`;
    text += `• Payment Reference: *${paymentReference}*\n`;
    text += `• Payment Due Date: *${dueDateStr}*\n`;
    text += `• Banking Details: Please contact landlord for account details.\n`;
    if (profile?.email) {
      text += `• Proof of Payment: Send to ${profile.email}\n`;
    }
  }
  if (profile?.contactNumber) {
    text += `• Enquiries: ${profile.contactNumber}\n`;
  }
  if (options?.statementUrl) {
    text += `• Online Statement & PDF: ${options.statementUrl}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━`;

  return text;
}

export interface CommercialInvoiceWhatsAppOptions {
  rental: RentalProperty;
  selectedAncillary: AncillaryIncome;
  periodStr: string;
  activePeriodMonth?: string;
  baseRent: number;
  commercialVatAmount: number;
  currentGrandTotal: number;
  investorProfile?: InvestorProfile;
}

export function formatCommercialInvoiceForWhatsApp(options: CommercialInvoiceWhatsAppOptions): string {
  const {
    rental,
    selectedAncillary,
    periodStr,
    activePeriodMonth,
    baseRent,
    commercialVatAmount,
    currentGrandTotal,
    investorProfile,
  } = options;

  const commRef = `INV-${selectedAncillary.tenantName.substring(0, 10).replace(/\s+/g, '').toUpperCase()}-${rental.title.substring(0, 10).replace(/\s+/g, '').toUpperCase()}`;
  const dueDateStr = getStatementDueDate(activePeriodMonth || periodStr);
  const hasBankDetails = Boolean(investorProfile?.accountNumber && investorProfile.accountNumber.trim().length > 0);

  let text = `*COMMERCIAL TAX INVOICE & RENT REMITTANCE*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Entity: ${investorProfile?.entityName || 'Commercial Property Lessor'}\n`;
  text += `• Company Reg / ID: ${investorProfile?.registrationOrId || 'On Record'}\n`;
  text += `• Property: ${rental.title}\n`;
  text += `• Site Address: ${rental.address}, ${rental.city}\n`;
  text += `• Commercial Tenant: ${selectedAncillary.tenantName}\n`;
  text += `• Lease Type: ${selectedAncillary.type.replace('_', ' ').toUpperCase()} LEASE\n`;
  text += `• Billing Period: ${periodStr}\n`;
  text += `• Contract Expiry: ${selectedAncillary.contractEndDate} (${selectedAncillary.annualEscalationPercent}% p.a. escalation)\n\n`;

  text += `*INVOICE BREAKDOWN:*\n`;
  text += `• Net Monthly Site Lease: ${formatZAR(baseRent, { includeDecimals: true })}\n`;
  if (selectedAncillary.vatApplicable) {
    text += `• South African VAT (15%): ${formatZAR(commercialVatAmount, { includeDecimals: true })}\n`;
  }
  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• *TOTAL AMOUNT DUE: ${formatZAR(currentGrandTotal, { includeDecimals: true })}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  text += `*BANKING & PAYMENT DETAILS*\n`;
  if (hasBankDetails) {
    text += `• Bank: ${investorProfile?.bankName || 'Standard Bank'}\n`;
    text += `• Account Name: ${investorProfile?.accountHolder || investorProfile?.entityName || 'Commercial Property Lessor'}\n`;
    text += `• Account Number: ${investorProfile?.accountNumber}\n`;
    text += `• Branch Code: ${investorProfile?.branchCode || 'Universal'}\n`;
    if (investorProfile?.accountType) {
      text += `• Account Type: ${investorProfile.accountType}\n`;
    }
    if (investorProfile?.swiftCode) {
      text += `• SWIFT / BIC: ${investorProfile.swiftCode}\n`;
    }
    text += `• Payment Reference: *${commRef}*\n`;
    text += `• Payment Due Date: *${dueDateStr}*\n`;
    if (investorProfile?.email) {
      text += `• Proof of Payment: Send to ${investorProfile.email}\n`;
    }
    if (investorProfile?.remittanceInstructions) {
      text += `• Instructions: ${investorProfile.remittanceInstructions}\n`;
    }
  } else {
    text += `• Account Name: ${investorProfile?.entityName || 'Commercial Property Lessor'}\n`;
    text += `• Payment Reference: *${commRef}*\n`;
    text += `• Payment Due Date: *${dueDateStr}*\n`;
    text += `• Banking Details: Please contact landlord for account details.\n`;
    if (investorProfile?.email) {
      text += `• Proof of Payment: Send to ${investorProfile.email}\n`;
    }
  }
  if (investorProfile?.contactNumber) {
    text += `• Enquiries: ${investorProfile.contactNumber}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `_Commercial Tax Invoice issued in terms of the South African Value-Added Tax Act. Domestic municipal utilities not applicable._`;

  return text;
}

export interface ConsolidatedOverviewWhatsAppOptions {
  rental: RentalProperty;
  periodStr: string;
  currentGrandTotal: number;
  currentStatement?: UtilityStatement;
  currentTenantUtilities: number;
  investorProfile?: InvestorProfile;
}

export function formatConsolidatedOverviewForWhatsApp(options: ConsolidatedOverviewWhatsAppOptions): string {
  const {
    rental,
    periodStr,
    currentGrandTotal,
    currentStatement,
    currentTenantUtilities,
    investorProfile,
  } = options;

  let text = `*CONSOLIDATED PROPERTY REVENUE & AUDIT STATEMENT*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Landlord Entity: ${investorProfile?.entityName || 'Property Landlord'}\n`;
  text += `• Property: ${rental.title}\n`;
  text += `• Address: ${rental.address}, ${rental.city}\n`;
  text += `• Billing Period: ${periodStr}\n\n`;

  text += `*RESIDENTIAL UNITS (${rental.leases?.length || 0} Units):*\n`;
  (rental.leases || []).forEach((l) => {
    text += `• ${l.unitName}: ${l.tenantName || '(Vacant)'} — ${formatZAR(l.monthlyRentZAR)}/m [${l.status}]\n`;
  });

  if ((rental.ancillaryIncomes?.length || 0) > 0) {
    text += `\n*COMMERCIAL ANCILLARY COVENANTS:*\n`;
    rental.ancillaryIncomes?.forEach((a) => {
      text += `• ${a.tenantName} (${a.type.replace('_', ' ')}): ${formatZAR(a.monthlyRentZAR)}/m ${a.vatApplicable ? '+15% VAT' : ''}\n`;
    });
  }

  text += `\n*MUNICIPAL RECONCILIATION:*\n`;
  text += `• Total Council Charges: ${formatZAR(currentStatement?.totalDueZAR || 0, { includeDecimals: true })}\n`;
  text += `• Landlord Rates & Taxes: ${formatZAR(currentStatement?.propertyRatesZAR || 0, { includeDecimals: true })}\n`;
  text += `• Total Tenant Recoveries Billed: ${formatZAR(currentTenantUtilities, { includeDecimals: true })}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• *TOTAL MONTHLY PORTFOLIO COLLECTION: ${formatZAR(currentGrandTotal, { includeDecimals: true })}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Master Audit Ref: MASTER-${rental.title.substring(0, 15).replace(/\s+/g, '').toUpperCase()}\n`;

  return text;
}

/**
 * Formats a WhatsApp payment receipt confirmation snippet.
 */
export function formatTenantPaymentReceiptForWhatsApp(
  rental: RentalProperty,
  payment: TenantPaymentRecord,
  investorProfile?: InvestorProfile
): string {
  const arrearsResult = calculatePropertyArrears(rental, undefined, { leaseId: payment.leaseId });
  const selectedLease =
    (rental.leases || []).find((l) => l.id === payment.leaseId) || rental.leases?.[0];
  const tenantName = selectedLease?.tenantName || 'Valued Tenant';
  const unitName = selectedLease?.unitName || 'Main Unit';
  const entityName = investorProfile?.entityName || 'Property Landlord';

  let text = `*PAYMENT RECEIPT & CONFIRMATION*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Landlord: ${entityName}\n`;
  text += `• Property: ${rental.title} — ${unitName}\n`;
  text += `• Tenant: ${tenantName}\n\n`;

  text += `*PAYMENT PARTICULARS:*\n`;
  text += `• Date Received: *${formatDate(payment.paymentDate)}*\n`;
  text += `• Period Applied: *${formatMonthLabel(payment.periodMonth || getMonthKey(payment.paymentDate))}*\n`;
  text += `• Payment Method: *${payment.paymentMethod}*${payment.paymentMethod === 'Deposit Applied' ? ' (Deposit applied to rent arrears)' : ''}\n`;
  if (payment.allocations && payment.allocations.length > 0) {
    text += `• Allocated Months: *${payment.allocations.map((a) => `${formatMonthLabel(a.periodMonth)} (${formatZAR(a.amountZAR)})`).join(', ')}*\n`;
  }
  if (payment.reference) {
    text += `• Reference / Proof: *${payment.reference}*\n`;
  }
  text += `• Amount Received: *${formatZAR(payment.amountReceivedZAR, { includeDecimals: true })}*\n\n`;

  text += `*CURRENT ACCOUNT STATUS:*\n`;
  if (arrearsResult.totalArrearsZAR <= 0) {
    text += `• Outstanding Balance: *R 0.00 (Paid in Full)*\n`;
  } else {
    text += `• Remaining Balance Due: *${formatZAR(arrearsResult.totalArrearsZAR, { includeDecimals: true })}*\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Thank you for your prompt payment! This serves as official electronic confirmation.`;

  return text;
}

export interface FormatInspectionWhatsAppParams {
  propertyTitle: string;
  unitName: string;
  tenantName: string;
  mode: 'ingoing' | 'exit';
  depositHeldZAR: number;
  record: LeaseInspectionRecord;
  portalUrl?: string;
  landlordEntityName?: string;
}

/**
 * Formats a clean, professional, emoji-free WhatsApp report for Joint Ingoing/Exit
 * property inspections compliant with Section 5 of the SA Rental Housing Act (Act 50 of 1999).
 */
export function formatInspectionForWhatsApp(params: {
  propertyTitle: string;
  unitName: string;
  tenantName: string;
  mode: 'ingoing' | 'exit';
  depositHeldZAR: number;
  record: LeaseInspectionRecord;
  portalUrl?: string;
  landlordEntityName?: string;
}): string {
  const {
    propertyTitle,
    unitName,
    tenantName,
    mode,
    depositHeldZAR,
    record,
    portalUrl,
    landlordEntityName,
  } = params;

  const isIngoing = mode === 'ingoing';
  const inspectionDate = isIngoing ? record.ingoingDate : record.exitDate;
  const isAgreed = isIngoing ? record.ingoingTenantAgreed : record.exitTenantAgreed;
  const agreedDate = isIngoing ? record.ingoingTenantAgreedDate : record.exitTenantAgreedDate;
  const photoVaultUrl = isIngoing ? record.ingoingPhotoVaultUrl : record.exitPhotoVaultUrl;

  const items = ensureInspectionItems(record.items);
  const summary = calculateInspectionDepositSummary(depositHeldZAR, record);

  let text = isIngoing
    ? `*JOINT INGOING PROPERTY INSPECTION REPORT (RHA SEC 5)*\n`
    : `*JOINT EXIT PROPERTY INSPECTION & DEPOSIT SETTLEMENT (RHA SEC 5)*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (landlordEntityName) {
    text += `• Landlord: ${landlordEntityName}\n`;
  }
  text += `• Property: ${propertyTitle} — ${unitName}\n`;
  text += `• Tenant: ${tenantName}\n`;
  if (inspectionDate) {
    text += `• Inspection Date: *${formatDate(inspectionDate)}*\n`;
  }
  text += `• Sign-Off Status: *${isAgreed ? `[Tenant Agreed - ${formatDate(agreedDate || inspectionDate || '')}]` : '[Pending Tenant Sign-Off]'}*\n\n`;

  text += `*8-POINT CHECKLIST PARTICULARS:*\n`;
  items.forEach((item) => {
    if (isIngoing) {
      text += `• ${item.category}: *[${item.ingoingCondition}]*`;
      if (item.ingoingNotes && item.ingoingNotes.trim()) {
        text += `\n  Note: ${item.ingoingNotes.trim()}`;
      }
      text += `\n`;
    } else {
      const exitCond = item.exitCondition || 'Good';
      text += `• ${item.category}: Ingoing [${item.ingoingCondition}] -> Exit *[${exitCond}]*`;
      if (item.repairDeductionZAR && item.repairDeductionZAR > 0) {
        text += `\n  Deduction: *${formatZAR(item.repairDeductionZAR, { includeDecimals: true })}*`;
      }
      if (item.exitNotes && item.exitNotes.trim()) {
        text += `\n  Exit Note: ${item.exitNotes.trim()}`;
      }
      text += `\n`;
    }
  });

  text += `\n`;
  if (isIngoing) {
    text += `*DEPOSIT PARTICULARS:*\n`;
    text += `• Deposit Held in Trust: *${formatZAR(depositHeldZAR, { includeDecimals: true })}*\n`;
  } else {
    text += `*DEPOSIT SETTLEMENT BREAKDOWN:*\n`;
    text += `• Deposit Held in Trust: *${formatZAR(depositHeldZAR, { includeDecimals: true })}*\n`;
    text += `• Total Repair Deductions: *${formatZAR(summary.totalRepairDeductionsZAR, { includeDecimals: true })}*\n`;
    text += `• Net Deposit Refundable: *${formatZAR(summary.netDepositRefundableZAR, { includeDecimals: true })}*\n`;
    if (summary.excessDamageShortfallZAR > 0) {
      text += `• Excess Damage Shortfall Due by Tenant: *${formatZAR(summary.excessDamageShortfallZAR, { includeDecimals: true })}*\n`;
    }
  }

  if (photoVaultUrl && photoVaultUrl.trim()) {
    text += `\n*PHOTOGRAPHIC EVIDENCE VAULT:*\n• ${photoVaultUrl.trim()}\n`;
  }

  if (portalUrl && portalUrl.trim()) {
    text += `\n*ONLINE STATEMENT & INSPECTION PORTAL:*\n• ${portalUrl.trim()}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*SECTION 5 RENTAL HOUSING ACT NOTICE:*\n`;
  text += `Under Act 50 of 1999, joint property inspections protect both parties. Please review this report and reply with:\n`;
  text += `*AGREED*\n`;
  text += `to confirm your electronic acknowledgement of this inspection record.`;

  return text;
}

