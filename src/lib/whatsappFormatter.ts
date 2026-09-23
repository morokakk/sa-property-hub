import { formatZAR, formatPercent, formatDate } from './formatters';
import { OpportunityDeal, FlipProject, InvestorProfile, DealStrategy, DealSource } from '@/types';
import { generateLongTermProjection } from './calculations/propertyMetrics';

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
    isSection13Eligible?: boolean;
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
    interestRatePercent?: number;
    loanTermYears?: number;
    bondTermYears?: number;
    annualCapitalGrowthPercent?: number;
    annualRentalEscalationPercent?: number;
    annualExpenseInflationPercent?: number;
    primaryFunderName?: string;
    primaryFunderContact?: string;
    coFundersNotes?: string;
  };
  strategy: DealStrategy;
  capitalRequested: number;
  fundingOfferType: 'Fixed Interest' | 'Profit Share';
  offeredRate: number;
  securityType: string;
  investorProfile?: InvestorProfile;
}

/**
 * Formats deal metrics into clean plain text with emojis ready for WhatsApp copy/paste or wa.me link.
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
    ? `🇿🇦 *BUY-AND-FLIP OPPORTUNITY* 🔨\n`
    : isBrrrr
    ? `🇿🇦 *HYBRID BRRRR INVESTMENT OPPORTUNITY* ⚡\n`
    : `🇿🇦 *BUY-AND-HOLD RENTAL OPPORTUNITY* 🏢\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 *Property:* ${deal.title}\n`;
  text += `🏙️ *Location:* ${deal.address}, ${deal.city} (${deal.province})\n`;
  if (deal.amenityScorecard) {
    text += `⭐ *Location Grade:* *${deal.amenityScorecard.compositeGrade}* (${deal.amenityScorecard.compositeScore}/12 pts)\n`;
    text += `  • 🏫 Schools: ${deal.amenityScorecard.schools} | 👮 Police: ${deal.amenityScorecard.policeStation}\n`;
    text += `  • 🏥 Hospital: ${deal.amenityScorecard.medicalClinic} | 🛍️ Mall: ${deal.amenityScorecard.shoppingMall}\n`;
  }
  text += `🏷️ *Strategy:* ${isFlip ? 'Buy & Flip' : isBrrrr ? 'Hybrid BRRRR' : 'Buy & Hold Rental'} • Sourcing: ${deal.source} • Status: ${deal.status}\n\n`;

  if (isFlip) {
    // BUY-AND-FLIP METRICS
    const holdingDuration = deal.holdingPeriodMonths || 6;
    const monthlyBond = deal.monthlyBondPaymentZAR ?? (deal.bondLTV ? Math.round(deal.purchasePrice * (deal.bondLTV / 100) * 0.0108) : 0);
    const monthlyLevies = deal.monthlyLevies ?? 0;
    const monthlyRates = deal.monthlyRatesTaxes ?? 0;
    const monthlyOther = deal.monthlyOtherHoldingCostZAR ?? 1500;
    const monthlyBurnRate = deal.monthlyHoldingCostZAR || (monthlyBond + monthlyLevies + monthlyRates + monthlyOther);
    const totalHoldingReserve = monthlyBurnRate * holdingDuration;

    const acquisitionLegalAndDuty = deal.costs.totalAcquisitionCost - deal.purchasePrice;
    const totalProjectCost = deal.purchasePrice + acquisitionLegalAndDuty + deal.estimatedRehabCost + totalHoldingReserve;
    const projectedNetProfit = (deal.targetExitPrice || 0) - totalProjectCost;
    const projectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;

    const ltvVal = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
    const depositVal = deal.depositZAR !== undefined ? deal.depositZAR : Math.round(deal.purchasePrice * (1 - ltvVal / 100));
    const initialCap = deal.initialCapitalRequired ?? (depositVal + acquisitionLegalAndDuty + deal.estimatedRehabCost);

    text += `💰 *CAPITAL & ACQUISITION BREAKDOWN (ZAR)*\n`;
    if (deal.openMarketValueZAR) {
      text += `• Open Market Value: *${formatZAR(deal.openMarketValueZAR)}*\n`;
      text += `• Target Purchase / Bid: *${formatZAR(deal.purchasePrice)}*\n`;
      text += `• Built-in Equity: *${formatZAR(deal.builtInEquityZAR)}* (${deal.builtInEquityPercent >= 0 ? '+' : ''}${formatPercent(deal.builtInEquityPercent)} Below Valuation)\n`;
    } else {
      text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
    }
    text += `• SARS Duty & Legal: ${formatZAR(acquisitionLegalAndDuty)}\n`;
    text += `• Renovation / Capex (BOQ): *${formatZAR(deal.estimatedRehabCost)}*\n`;
    text += `• Holding Period Reserve: *${formatZAR(totalHoldingReserve)}* (${holdingDuration} mos @ ${formatZAR(monthlyBurnRate)}/m)\n`;
    text += `  ↳ Bond: ${formatZAR(monthlyBond)} | Levies: ${formatZAR(monthlyLevies)} | Rates: ${formatZAR(monthlyRates)} | Security: ${formatZAR(monthlyOther)}\n`;
    text += `• Total Project Outlay: *${formatZAR(totalProjectCost)}*\n`;
    text += `• Initial Capital Required (Day 1): *${formatZAR(initialCap)}*\n`;

    text += `\n📈 *EXIT VALUATION & PROJECTED PROFIT*\n`;
    text += `• Target Exit Price: *${formatZAR(deal.targetExitPrice)}*\n`;
    text += `• Projected Net Flip Profit: *${formatZAR(projectedNetProfit)}* (After capex & carrying escrow)\n`;
    text += `• Net Project ROI: *${formatPercent(projectROI)}* on total capital\n`;
  } else {
    // BUY-AND-HOLD RENTAL / BRRRR METRICS
    const ltvVal = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
    const depositVal = deal.depositZAR !== undefined ? deal.depositZAR : Math.round(deal.purchasePrice * (1 - ltvVal / 100));
    const initialCap = deal.initialCapitalRequired ?? (depositVal + (deal.costs.totalAcquisitionCost - deal.purchasePrice) + deal.estimatedRehabCost);

    text += `💰 *FINANCIAL & ACQUISITION SUMMARY (ZAR)*\n`;
    if (deal.openMarketValueZAR) {
      text += `• Open Market Value: *${formatZAR(deal.openMarketValueZAR)}*\n`;
      text += `• Target Purchase / Bid: *${formatZAR(deal.purchasePrice)}*\n`;
      text += `• Built-in Equity: *${formatZAR(deal.builtInEquityZAR)}* (${deal.builtInEquityPercent >= 0 ? '+' : ''}${formatPercent(deal.builtInEquityPercent)} Below Valuation)\n`;
    } else {
      text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
    }
    text += `• SARS Duty & Legal: ${formatZAR(deal.costs.totalAcquisitionCost - deal.purchasePrice)}\n`;
    text += `• Total Acquisition Cost: *${formatZAR(deal.costs.totalAcquisitionCost)}*\n`;
    text += `• Financing: *${ltvVal}% LTV* (Deposit: *${formatZAR(depositVal)}*)\n`;
    if (deal.estimatedRehabCost > 0) {
      text += `• Renovation / Capex: ${formatZAR(deal.estimatedRehabCost)}\n`;
    }
    text += `• Initial Capital Required (Day 1): *${formatZAR(initialCap)}*\n`;

    text += `\n📊 *CASH FLOW & YIELD PERFORMANCE*\n`;
    text += `• Est. Gross Rent: *${formatZAR(deal.monthlyRentalEstimate)}/m*\n`;
    text += `• Gross Yield: *${formatPercent(deal.grossYield)}* | Cap Rate: *${formatPercent(deal.capRate)}*\n`;
    text += `• Net Cash Flow: *${formatZAR(deal.monthlyCashFlow)}/m* (After bond, levies, rates)\n`;

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
    });

    if (projections.length >= 10) {
      const p10 = projections[9];
      const pFinal = projections[projections.length - 1];
      text += `\n🌱 *LONG-TERM WEALTH COMPOUNDING*\n`;
      text += `• 10-Yr Net Equity: *${formatZAR(p10.netEquity)}* (Valuation: ${formatZAR(p10.propertyValue)})\n`;
      text += `• ${pFinal.year}-Yr Net Equity (Debt-Free): *${formatZAR(pFinal.netEquity)}*\n`;
      text += `• Escalation: ${deal.annualCapitalGrowthPercent ?? 5}% Capital • ${deal.annualRentalEscalationPercent ?? 6}% Rent Escalation\n`;
    }

    if (isSection13 && deal.section13sex) {
      text += `\n🏛️ *SARS SECTION 13SEX TAX SHIELD*\n`;
      text += `• Annual 5% Write-off: *${formatZAR(deal.section13sex.annualAllowanceZAR)}/yr*\n`;
      text += `• Annual Tax Savings: *${formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr* (${deal.section13sex.taxRatePercent}% bracket)\n`;
      text += `• 20-Yr Cumulative Benefit: *${formatZAR(deal.section13sex.twentyYearCumulativeSavingsZAR)}*\n`;
    }
  }

  // Funding Campaign (if active)
  if (deal.fundingRequiredZAR) {
    const oppRemaining = Math.max(0, (deal.fundingRequiredZAR || 0) - (deal.capitalRaisedZAR || 0));
    text += `\n🤝 *FUNDING CAMPAIGN*\n`;
    text += `• Target Facility: *${formatZAR(deal.fundingRequiredZAR)}*\n`;
    text += `• Capital Secured: *${formatZAR(deal.capitalRaisedZAR || 0)}*\n`;
    text += `• Open Syndicate Balance: *${formatZAR(oppRemaining)}*\n`;
    if (deal.promisedReturnRatePercent) {
      text += `• Offered Return: *${deal.promisedReturnRatePercent}%* (${deal.promisedReturnType || 'Fixed Interest'})\n`;
      text += `• Payout: ${deal.promisedPayoutSchedule || 'Monthly Interest'} | Security: ${deal.securityOffered || '2nd Mortgage Bond'}\n`;
    }
  }

  if (deal.driveVault?.masterFolderUrl) {
    text += `\n📁 *Document Vault:* ${deal.driveVault.masterFolderUrl}\n`;
  }

  if (investorProfile) {
    text += `\n👤 *Sponsor:* ${investorProfile.entityName} ${investorProfile.tradingAs ? `(T/A ${investorProfile.tradingAs})` : ''}\n`;
    text += `📞 *Tel:* ${investorProfile.contactNumber} | ✉️ ${investorProfile.email}\n`;
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
  const totalHoldingReserve = monthlyHolding * holdingDuration;

  const boqSum = flip.boq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0);
  const totalBoq = boqSum > 0 ? boqSum : flip.baselineRenovationBudgetZAR;
  const totalCost = flip.purchasePriceZAR + flip.acquisitionCostsZAR + totalBoq + totalHoldingReserve;
  const netProfit = flip.targetExitPriceZAR - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  const fundingReq = flip.fundingRequiredZAR ?? Math.round(totalCost * 0.7);
  const capitalRaised = flip.capitalRaisedZAR ?? 0;
  const remainingReq = Math.max(0, fundingReq - capitalRaised);
  const pctFunded = fundingReq > 0 ? Math.min(100, Math.round((capitalRaised / fundingReq) * 100)) : 0;

  let text = `🔨 *BUY-AND-FLIP DEAL SNAPSHOT* 🏡\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 *Project:* ${flip.title}\n`;
  text += `🏙️ *Location:* ${flip.address}, ${flip.city}\n`;
  text += `⏱️ *Phase:* ${flip.currentPhase} • Target Exit: ${flip.targetCompletionDate}\n\n`;

  text += `💰 *CAPITAL & BUDGET BREAKDOWN (ZAR)*\n`;
  text += `• Purchase Price: *${formatZAR(flip.purchasePriceZAR)}*\n`;
  text += `• Acquisition Costs: ${formatZAR(flip.acquisitionCostsZAR)}\n`;
  text += `• BOQ Renovation Spend: *${formatZAR(totalBoq)}* (Budget: ${formatZAR(flip.baselineRenovationBudgetZAR)})\n`;
  text += `• Holding Period Reserve: *${formatZAR(totalHoldingReserve)}* (${holdingDuration} mos @ ${formatZAR(monthlyHolding)}/m)\n`;
  text += `  ↳ Bond: ${formatZAR(monthlyBond)} | Levies: ${formatZAR(monthlyLevies)} | Rates: ${formatZAR(monthlyRates)} | Security: ${formatZAR(monthlyOther)}\n`;
  text += `• Total Capital Invested: *${formatZAR(totalCost)}*\n\n`;

  text += `📈 *PROFIT & EXIT VALUATION*\n`;
  text += `• Target Exit Price: *${formatZAR(flip.targetExitPriceZAR)}*\n`;
  text += `• Projected Net Profit: *${formatZAR(netProfit)}* (After capex & holding reserve)\n`;
  text += `• Annualized Net ROI: *${formatPercent(roi)}*\n`;

  text += `\n🤝 *FUNDING & SYNDICATE STATUS*\n`;
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
    text += `\n📁 *Cloud Deal Folder:* ${flip.driveVault.masterFolderUrl}\n`;
  }

  if (investorProfile) {
    text += `\n👤 *Lead Developer:* ${investorProfile.entityName}\n`;
    text += `📞 *Contact:* ${investorProfile.contactNumber} | ${investorProfile.email}\n`;
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
  const holdingReserve = isFlip ? monthlyBurn * holdingDuration : 0;
  const auctionFee = deal.auctioneerCommission ?? 0;
  const arrears = deal.municipalArrears ?? 0;

  const totalProjectCost =
    deal.purchasePrice +
    deal.acquisitionCosts +
    deal.renovationBudget +
    holdingReserve +
    auctionFee +
    arrears;
  const projectedNetProfit = deal.targetExitPrice - totalProjectCost;
  const projectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;
  const loanToCost = totalProjectCost > 0 ? (capitalRequested / totalProjectCost) * 100 : 0;

  const projectedLenderPayout =
    fundingOfferType === 'Fixed Interest'
      ? capitalRequested + capitalRequested * (offeredRate / 100) * 0.5
      : capitalRequested + projectedNetProfit * (offeredRate / 100);

  let text = `🇿🇦 *CONFIDENTIAL INVESTMENT MEMORANDUM* 📄\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 *Asset:* ${deal.title}\n`;
  text += `🏙️ *Location:* ${deal.address}, ${deal.city}, South Africa\n`;
  text += `🏷️ *Strategy Mandate:* *${isFlip ? '🔄 Buy & Flip' : strategy === 'BRRRR' ? '⚡ Hybrid BRRRR' : '🏠 Buy & Hold Rental'}*\n`;

  if (deal.source) {
    if (deal.source === 'High-Street Auction') {
      text += `⚡ *Sourcing:* High-Street Auction (10% Cash Guarantee Secured)\n`;
    } else if (deal.source === 'Distressed Sale / Repo') {
      text += `🛡️ *Sourcing:* Distressed Bank Repo (Municipal Arrears & Clearance Tracked)\n`;
    } else if (deal.source === 'iGrow Rentals') {
      text += `🏢 *Sourcing:* iGrow Rentals (Turnkey • Section 13sex Tax Shield • R0 Transfer Duty)\n`;
    } else if (deal.source === 'Direct Owner') {
      text += `🤝 *Sourcing:* Direct Private Seller (Off-Market Sourced • 0% Agent Commission)\n`;
    } else if (deal.source === 'Private Agent') {
      text += `📋 *Sourcing:* Private Estate Agent (Compliant OTP • Verified Deeds Office CMA)\n`;
    }
  }

  if (investorProfile) {
    text += `👤 *Sponsor:* ${investorProfile.entityName} ${investorProfile.tradingAs ? `(T/A ${investorProfile.tradingAs})` : ''}\n`;
  }
  text += `\n`;

  text += `💰 *EXECUTIVE DEAL HIGHLIGHTS (ZAR)*\n`;
  text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
  if (deal.builtInEquity && deal.builtInEquity > 0) {
    text += `• Built-in Equity: *${formatZAR(deal.builtInEquity)}* (${deal.builtInEquityPercent ? `+${formatPercent(deal.builtInEquityPercent)}` : 'Capital Upside'})\n`;
  }
  if (auctionFee > 0) {
    text += `• Auctioneer Fee (10%+VAT): *${formatZAR(auctionFee)}*\n`;
  }
  if (arrears > 0) {
    text += `• Municipal Clearance Arrears: *${formatZAR(arrears)}*\n`;
  }
  if (deal.source === 'iGrow Rentals') {
    text += `• SARS Transfer Duty: *R 0* (VAT Inclusive Developer Stock)\n`;
  }
  if (deal.isSection13Eligible) {
    text += `• SARS Tax Shield: *Section 13sex Eligible* (5% p.a. Building Deduction)\n`;
  }
  text += `• Capex & Legal: ${formatZAR(deal.acquisitionCosts + deal.renovationBudget)}\n`;
  if (isFlip) {
    text += `• Holding Cost Escrow: *${formatZAR(holdingReserve)}* (${holdingDuration} mos @ ${formatZAR(monthlyBurn)}/m)\n`;
  }
  text += `• Total Project Outlay: *${formatZAR(totalProjectCost)}*\n`;
  text += `• Target Exit Price: *${formatZAR(deal.targetExitPrice)}*\n`;
  text += `• Projected Net Profit: *${formatZAR(projectedNetProfit)}*\n`;
  text += `• Project Net ROI: *${formatPercent(projectROI)}*\n\n`;

  text += `🤝 *PROPOSED LENDER / PARTNER RETURN TERMS*\n`;
  text += `• Facility Principal: *${formatZAR(capitalRequested)}*\n`;
  text += `• Loan-to-Cost (LTC): *${formatPercent(loanToCost)}*\n`;
  text += `• Proposed Return: *${offeredRate}%* (${fundingOfferType === 'Fixed Interest' ? 'p.a. Fixed Interest' : 'Net Profit Split'})\n`;
  text += `• Coupon Payout: ${fundingOfferType === 'Fixed Interest' ? 'Monthly in advance' : 'At property transfer'}\n`;
  text += `• Security / Collateral: *${securityType}*\n`;
  if (deal.completionDate) {
    text += `• Target Maturity: ${formatDate(deal.completionDate)}\n`;
  }
  if (strategy === 'BRRRR') {
    const arv = deal.arvZAR || deal.targetExitPrice || Math.round(deal.purchasePrice * 1.3);
    const refiLtv = deal.refinanceLtvPercent || 75;
    const estRefiCash = Math.round(arv * (refiLtv / 100));
    text += `🏦 *Post-Rehab ARV Valuation:* *${formatZAR(arv)}* (${refiLtv}% LTV Refi: ${formatZAR(estRefiCash)})\n`;
    text += `🔄 *Lender Capital Exit:* Phase 2 Bank Refinance @ Month 6 (100% Principal Repaid to Investor)\n`;
  }
  text += `• Projected Total Payout: *${formatZAR(projectedLenderPayout)}*\n`;

  if (investorProfile) {
    text += `\n📞 *Contact Sponsor:* ${investorProfile.contactNumber} | ${investorProfile.email}\n`;
    if (investorProfile.website) text += `🌐 *Web:* ${investorProfile.website}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Private & Confidential • Prepared for Invited Lenders & Syndicate Partners_`;

  return text;
}
