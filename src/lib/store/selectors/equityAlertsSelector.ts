import { RentalProperty, EquityExtractionAlert } from '@/types';

/**
 * Pure calculation identifying BRRRR rental properties ripe for equity refinance.
 * Rules:
 * - Must be active (status !== 'Sold') and marked as BRRRR (isBrrrrProperty === true)
 * - Must be stabilized for at least 6 months since purchase
 * - Current LTV must be below 70% (ltv < 0.70)
 * - Extractable equity is up to 80% LTV minus outstanding bond
 */
export function computeEquityAlerts(rentals: RentalProperty[]): EquityExtractionAlert[] {
  const now = new Date();
  return (rentals || [])
    .filter((r): r is RentalProperty => Boolean(r && r.status !== 'Sold' && r.isBrrrrProperty))
    .map((r) => {
      const marketVal = typeof r.marketValueZAR === 'number' && r.marketValueZAR > 0 ? r.marketValueZAR : 0;
      const bondBalance = typeof r.outstandingBondBalanceZAR === 'number' && r.outstandingBondBalanceZAR > 0 ? r.outstandingBondBalanceZAR : 0;
      const ltv = marketVal > 0 ? bondBalance / marketVal : (bondBalance > 0 ? 1 : 0);

      const purchaseTime = r.purchaseDate ? new Date(r.purchaseDate).getTime() : NaN;
      const purchaseDate = !isNaN(purchaseTime) ? new Date(purchaseTime) : now;
      const months = Math.max(
        0,
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
          (now.getMonth() - purchaseDate.getMonth())
      );

      const extractable = Math.max(0, (marketVal * 0.8) - bondBalance);

      return {
        propertyId: r.id,
        propertyTitle: r.title || 'Untitled Property',
        currentLTV: ltv,
        extractableEquityZAR: extractable,
        monthsStabilized: months,
        isRipe: ltv < 0.7 && months >= 6,
      };
    })
    .filter((a) => a.isRipe);
}
