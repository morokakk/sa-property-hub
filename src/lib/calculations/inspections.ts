import {
  InspectionCategory,
  InspectionCondition,
  InspectionItem,
  LeaseInspectionRecord,
} from '@/types';

/**
 * Standard 8-point inspection checklist categories compliant with
 * Section 5 of the South African Rental Housing Act (Act 50 of 1999).
 */
export const DEFAULT_INSPECTION_CATEGORIES: InspectionCategory[] = [
  'Walls, Paint & Ceilings',
  'Floors, Tiles & Skirting',
  'Doors, Locks, Keys & Remotes',
  'Windows, Glass & Blinds',
  'Plumbing, Taps & Geyser',
  'Electrical, Lights & Plugs',
  'Kitchen Stove, Oven & Cupboards',
  'Meters, Exterior & Parking',
];

/**
 * Creates a default 8-point inspection record with all categories set to 'Good'.
 * Provides a "tap-only-what's-broken" onboarding UX so landlords can complete
 * inspections in seconds on mobile devices.
 */
export function createDefaultInspectionRecord(ingoingDate?: string): LeaseInspectionRecord {
  const effectiveDate = ingoingDate || new Date().toISOString().split('T')[0];
  return {
    ingoingDate: effectiveDate,
    ingoingTenantAgreed: false,
    items: DEFAULT_INSPECTION_CATEGORIES.map((category) => ({
      category,
      ingoingCondition: 'Good' as InspectionCondition,
    })),
  };
}

/**
 * Ensures all 8 standard categories are represented in an inspection items array,
 * backfilling any missing categories with 'Good' ingoing condition while preserving
 * existing category data.
 */
export function ensureInspectionItems(items?: InspectionItem[]): InspectionItem[] {
  if (!items || items.length === 0) {
    return DEFAULT_INSPECTION_CATEGORIES.map((category) => ({
      category,
      ingoingCondition: 'Good' as InspectionCondition,
    }));
  }

  const existingMap = new Map<string, InspectionItem>();
  items.forEach((item) => {
    existingMap.set(item.category, item);
  });

  return DEFAULT_INSPECTION_CATEGORIES.map((category) => {
    const existing = existingMap.get(category);
    if (existing) {
      return existing;
    }
    return {
      category,
      ingoingCondition: 'Good' as InspectionCondition,
    };
  });
}

export interface InspectionDepositSummary {
  totalRepairDeductionsZAR: number;
  netDepositRefundableZAR: number;
  excessDamageShortfallZAR: number;
  degradedItemsCount: number;
  isRhaCompliantForDeductions: boolean;
}

/**
 * Pure calculation helper computing deposit settlement, damages shortfall,
 * degraded item counts, and RHA Section 5 compliance.
 */
export function calculateInspectionDepositSummary(
  depositHeldZAR: number,
  record?: LeaseInspectionRecord
): InspectionDepositSummary {
  const safeDeposit = Math.max(0, depositHeldZAR || 0);

  // Section 5(3)(e)-(k) of RHA mandates both ingoing joint inspection and tenant sign-off
  // to legally deduct tenant-caused repair costs from deposit
  const isRhaCompliantForDeductions = Boolean(
    record?.ingoingDate && record?.ingoingTenantAgreed
  );

  if (!record || !record.items || record.items.length === 0) {
    return {
      totalRepairDeductionsZAR: 0,
      netDepositRefundableZAR: safeDeposit,
      excessDamageShortfallZAR: 0,
      degradedItemsCount: 0,
      isRhaCompliantForDeductions,
    };
  }

  let totalRepairDeductionsZAR = 0;
  let degradedItemsCount = 0;

  for (const item of record.items) {
    const deduction = Math.max(0, item.repairDeductionZAR ?? 0);
    totalRepairDeductionsZAR += deduction;

    const wasAcceptable = item.ingoingCondition === 'Good' || item.ingoingCondition === 'Fair';
    if (wasAcceptable && item.exitCondition === 'Defective') {
      degradedItemsCount += 1;
    }
  }

  const netDepositRefundableZAR = Math.max(0, safeDeposit - totalRepairDeductionsZAR);
  const excessDamageShortfallZAR = Math.max(0, totalRepairDeductionsZAR - safeDeposit);

  return {
    totalRepairDeductionsZAR,
    netDepositRefundableZAR,
    excessDamageShortfallZAR,
    degradedItemsCount,
    isRhaCompliantForDeductions,
  };
}

/**
 * Normalizes South African phone numbers for WhatsApp wa.me links.
 * Converts local '082...' to international '2782...', removes spaces, dashes, symbols.
 */
export function normalizeWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `27${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith('27') && digitsOnly.length >= 11) {
    return digitsOnly;
  }
  return digitsOnly;
}
