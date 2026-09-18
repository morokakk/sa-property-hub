import { formatZAR, formatPercent } from './formatters';
import { OpportunityDeal, FlipProject, InvestorProfile } from '@/types';

/**
 * Formats deal metrics into clean plain text with emojis ready for WhatsApp copy/paste or wa.me link
 */
export function formatOpportunityForWhatsApp(
  deal: OpportunityDeal,
  investorProfile?: InvestorProfile
): string {
  const isSection13 = deal.section13sex?.isEligible;

  let text = `🇿🇦 *PROPERTY INVESTMENT OPPORTUNITY* 🏢\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📍 *Property:* ${deal.title}\n`;
  text += `🏙️ *Location:* ${deal.address}, ${deal.city} (${deal.province})\n`;
  if (deal.amenityScorecard) {
    text += `⭐ *Location Grade:* *${deal.amenityScorecard.compositeGrade}* (${deal.amenityScorecard.compositeScore}/12 pts)\n`;
    text += `  • 🏫 Schools: ${deal.amenityScorecard.schools} | 👮 Police: ${deal.amenityScorecard.policeStation}\n`;
    text += `  • 🏥 Hospital: ${deal.amenityScorecard.medicalClinic} | 🛍️ Mall: ${deal.amenityScorecard.shoppingMall}\n`;
  }
  text += `🏷️ *Sourcing:* ${deal.source} • Status: ${deal.status}\n\n`;

  text += `💰 *FINANCIAL SUMMARY (ZAR)*\n`;
  if (deal.openMarketValueZAR) {
    text += `• Open Market Value: *${formatZAR(deal.openMarketValueZAR)}*\n`;
    text += `• Target Purchase / Bid: *${formatZAR(deal.purchasePrice)}*\n`;
    text += `• Built-in Equity: *${formatZAR(deal.builtInEquityZAR)}* (${deal.builtInEquityPercent >= 0 ? '+' : ''}${formatPercent(deal.builtInEquityPercent)} Below Valuation)\n`;
  } else {
    text += `• Purchase Price: *${formatZAR(deal.purchasePrice)}*\n`;
  }
  text += `• SARS Transfer Duty: ${formatZAR(deal.costs.transferDuty)}\n`;
  text += `• Legal Conveyancing: ${formatZAR(deal.costs.conveyancingFee)}\n`;
  text += `• Total Acquisition: *${formatZAR(deal.costs.totalAcquisitionCost)}*\n`;

  if (deal.estimatedRehabCost > 0) {
    text += `• Renovation / Capex: ${formatZAR(deal.estimatedRehabCost)}\n`;
  }

  text += `\n📊 *PROJECTED PERFORMANCE*\n`;
  if (deal.monthlyRentalEstimate > 0) {
    text += `• Est. Monthly Rent: *${formatZAR(deal.monthlyRentalEstimate)}/m*\n`;
    text += `• Gross Yield: *${formatPercent(deal.grossYield)}* | Cap Rate: *${formatPercent(deal.capRate)}*\n`;
    text += `• Net Cash Flow: *${formatZAR(deal.monthlyCashFlow)}/m*\n`;
  }

  if (deal.targetExitPrice > 0) {
    text += `• Target Exit Price: *${formatZAR(deal.targetExitPrice)}*\n`;
    text += `• Projected Net Upside: *${formatZAR(deal.projectedFlipNetProfit)}* (${formatPercent(deal.projectedFlipRoi)} ROI)\n`;
  }

  if (isSection13 && deal.section13sex) {
    text += `\n🏛️ *SARS SECTION 13SEX TAX SHIELD*\n`;
    text += `• Annual 5% Write-off: *${formatZAR(deal.section13sex.annualAllowanceZAR)}/yr*\n`;
    text += `• Annual Tax Savings: *${formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr* (${deal.section13sex.taxRatePercent}% bracket)\n`;
    text += `• 20-Yr Cumulative Benefit: *${formatZAR(deal.section13sex.twentyYearCumulativeSavingsZAR)}*\n`;
  }

  if (deal.fundingRequiredZAR) {
    const oppRemaining = Math.max(0, (deal.fundingRequiredZAR || 0) - (deal.capitalRaisedZAR || 0));
    text += `\n🤝 *FUNDING CAMPAIGN*\n`;
    text += `• Target Facility: *${formatZAR(deal.fundingRequiredZAR)}*\n`;
    text += `• Capital Secured: *${formatZAR(deal.capitalRaisedZAR || 0)}*\n`;
    text += `• Open Syndicate Balance: *${formatZAR(oppRemaining)}*\n`;
    if (deal.promisedReturnRatePercent) {
      text += `• Promised Return: *${deal.promisedReturnRatePercent}%* (${deal.promisedReturnType || 'Fixed Interest'})\n`;
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

export function formatFlipForWhatsApp(
  flip: FlipProject,
  investorProfile?: InvestorProfile
): string {
  const totalBoq = flip.boq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR), 0);
  const totalCost = flip.purchasePriceZAR + flip.acquisitionCostsZAR + totalBoq;
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

  text += `💰 *CAPITAL & BUDGET BREAKDOWN*\n`;
  text += `• Purchase Price: *${formatZAR(flip.purchasePriceZAR)}*\n`;
  text += `• Acquisition Costs: ${formatZAR(flip.acquisitionCostsZAR)}\n`;
  text += `• BOQ Renovation Spend: *${formatZAR(totalBoq)}* (Budget: ${formatZAR(flip.baselineRenovationBudgetZAR)})\n`;
  text += `• Total Capital Invested: *${formatZAR(totalCost)}*\n\n`;

  text += `📈 *PROFIT & EXIT VALUATION*\n`;
  text += `• Target Exit Price: *${formatZAR(flip.targetExitPriceZAR)}*\n`;
  text += `• Projected Net Profit: *${formatZAR(netProfit)}*\n`;
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
