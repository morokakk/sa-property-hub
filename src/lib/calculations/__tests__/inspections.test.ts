import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INSPECTION_CATEGORIES,
  createDefaultInspectionRecord,
  ensureInspectionItems,
  calculateInspectionDepositSummary,
  normalizeWhatsAppPhone,
} from '../inspections';
import { formatInspectionForWhatsApp } from '../../whatsappFormatter';
import { formatZAR } from '../../formatters';
import { LeaseInspectionRecord } from '@/types';

describe('8-Point Property Inspection Engine (RHA Section 5)', () => {
  it('defines all 8 standard categories', () => {
    expect(DEFAULT_INSPECTION_CATEGORIES).toHaveLength(8);
    expect(DEFAULT_INSPECTION_CATEGORIES).toEqual([
      'Walls, Paint & Ceilings',
      'Floors, Tiles & Skirting',
      'Doors, Locks, Keys & Remotes',
      'Windows, Glass & Blinds',
      'Plumbing, Taps & Geyser',
      'Electrical, Lights & Plugs',
      'Kitchen Stove, Oven & Cupboards',
      'Meters, Exterior & Parking',
    ]);
  });

  describe('createDefaultInspectionRecord', () => {
    it('initializes all 8 categories to Good condition with ingoingTenantAgreed false', () => {
      const record = createDefaultInspectionRecord('2026-10-01');

      expect(record.ingoingDate).toBe('2026-10-01');
      expect(record.ingoingTenantAgreed).toBe(false);
      expect(record.items).toHaveLength(8);

      record.items.forEach((item, idx) => {
        expect(item.category).toBe(DEFAULT_INSPECTION_CATEGORIES[idx]);
        expect(item.ingoingCondition).toBe('Good');
        expect(item.repairDeductionZAR).toBeUndefined();
      });
    });

    it('defaults ingoingDate to today if not supplied', () => {
      const record = createDefaultInspectionRecord();
      expect(record.ingoingDate).toBeDefined();
      expect(record.ingoingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('ensureInspectionItems', () => {
    it('backfills missing categories with Good while preserving existing items', () => {
      const partialItems = [
        {
          category: 'Walls, Paint & Ceilings' as const,
          ingoingCondition: 'Fair' as const,
          ingoingNotes: 'Minor scuff',
        },
      ];

      const fullItems = ensureInspectionItems(partialItems);
      expect(fullItems).toHaveLength(8);

      const walls = fullItems.find((i) => i.category === 'Walls, Paint & Ceilings');
      expect(walls?.ingoingCondition).toBe('Fair');
      expect(walls?.ingoingNotes).toBe('Minor scuff');

      const plumbing = fullItems.find((i) => i.category === 'Plumbing, Taps & Geyser');
      expect(plumbing?.ingoingCondition).toBe('Good');
    });

    it('handles undefined or empty items array', () => {
      const fullItems = ensureInspectionItems(undefined);
      expect(fullItems).toHaveLength(8);
      fullItems.forEach((i) => expect(i.ingoingCondition).toBe('Good'));
    });
  });

  describe('calculateInspectionDepositSummary', () => {
    it('returns full refund when no repair deductions are present', () => {
      const record: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: true,
        exitDate: '2026-01-01',
        exitTenantAgreed: true,
        items: DEFAULT_INSPECTION_CATEGORIES.map((category) => ({
          category,
          ingoingCondition: 'Good',
          exitCondition: 'Good',
          repairDeductionZAR: 0,
        })),
      };

      const summary = calculateInspectionDepositSummary(20000, record);

      expect(summary.totalRepairDeductionsZAR).toBe(0);
      expect(summary.netDepositRefundableZAR).toBe(20000);
      expect(summary.excessDamageShortfallZAR).toBe(0);
      expect(summary.degradedItemsCount).toBe(0);
      expect(summary.isRhaCompliantForDeductions).toBe(true);
    });

    it('accurately sums repair deductions and calculates net refund', () => {
      const record: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: true,
        exitDate: '2026-01-01',
        exitTenantAgreed: true,
        items: [
          {
            category: 'Walls, Paint & Ceilings',
            ingoingCondition: 'Good',
            exitCondition: 'Defective',
            repairDeductionZAR: 1500,
          },
          {
            category: 'Kitchen Stove, Oven & Cupboards',
            ingoingCondition: 'Good',
            exitCondition: 'Defective',
            repairDeductionZAR: 2500,
          },
          {
            category: 'Plumbing, Taps & Geyser',
            ingoingCondition: 'Good',
            exitCondition: 'Good',
            repairDeductionZAR: 0,
          },
        ],
      };

      const summary = calculateInspectionDepositSummary(10000, record);

      expect(summary.totalRepairDeductionsZAR).toBe(4000);
      expect(summary.netDepositRefundableZAR).toBe(6000);
      expect(summary.excessDamageShortfallZAR).toBe(0);
      expect(summary.degradedItemsCount).toBe(2);
      expect(summary.isRhaCompliantForDeductions).toBe(true);
    });

    it('detects excess damage shortfall when repair costs exceed deposit held', () => {
      const record: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: true,
        exitDate: '2026-01-01',
        items: [
          {
            category: 'Floors, Tiles & Skirting',
            ingoingCondition: 'Good',
            exitCondition: 'Defective',
            repairDeductionZAR: 18000,
          },
        ],
      };

      const summary = calculateInspectionDepositSummary(10000, record);

      expect(summary.totalRepairDeductionsZAR).toBe(18000);
      expect(summary.netDepositRefundableZAR).toBe(0);
      expect(summary.excessDamageShortfallZAR).toBe(8000);
    });

    it('flags RHA Section 5 compliance accurately', () => {
      // 1. Missing ingoing inspection
      const uninspected = calculateInspectionDepositSummary(10000, undefined);
      expect(uninspected.isRhaCompliantForDeductions).toBe(false);

      // 2. Inspected but tenant agreement not recorded
      const pendingAgreement: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: false,
        items: [],
      };
      const pendingSummary = calculateInspectionDepositSummary(10000, pendingAgreement);
      expect(pendingSummary.isRhaCompliantForDeductions).toBe(false);

      // 3. Fully agreed ingoing joint inspection
      const agreedRecord: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: true,
        ingoingTenantAgreedDate: '2025-01-01',
        items: [],
      };
      const agreedSummary = calculateInspectionDepositSummary(10000, agreedRecord);
      expect(agreedSummary.isRhaCompliantForDeductions).toBe(true);
    });

    it('handles negative or strict zero deduction values safely', () => {
      const record: LeaseInspectionRecord = {
        ingoingDate: '2025-01-01',
        ingoingTenantAgreed: true,
        items: [
          {
            category: 'Plumbing, Taps & Geyser',
            ingoingCondition: 'Good',
            repairDeductionZAR: -500, // Should be clamped to 0
          },
          {
            category: 'Doors, Locks, Keys & Remotes',
            ingoingCondition: 'Good',
            repairDeductionZAR: 0,
          },
        ],
      };

      const summary = calculateInspectionDepositSummary(5000, record);
      expect(summary.totalRepairDeductionsZAR).toBe(0);
      expect(summary.netDepositRefundableZAR).toBe(5000);
    });
  });

  describe('normalizeWhatsAppPhone', () => {
    it('converts local SA numbers to international format', () => {
      expect(normalizeWhatsAppPhone('0821234567')).toBe('27821234567');
      expect(normalizeWhatsAppPhone('082 123 4567')).toBe('27821234567');
      expect(normalizeWhatsAppPhone('+27 82 123 4567')).toBe('27821234567');
      expect(normalizeWhatsAppPhone('(082) 123-4567')).toBe('27821234567');
    });

    it('handles invalid or empty phone numbers gracefully', () => {
      expect(normalizeWhatsAppPhone('')).toBe('');
      expect(normalizeWhatsAppPhone(undefined)).toBe('');
      expect(normalizeWhatsAppPhone('abc')).toBe('');
    });
  });

  describe('formatInspectionForWhatsApp', () => {
    const sampleRecord: LeaseInspectionRecord = {
      ingoingDate: '2025-01-15',
      ingoingTenantAgreed: true,
      ingoingTenantAgreedDate: '2025-01-15',
      ingoingPhotoVaultUrl: 'https://drive.google.com/test-vault',
      exitDate: '2026-01-15',
      exitTenantAgreed: false,
      items: [
        {
          category: 'Walls, Paint & Ceilings',
          ingoingCondition: 'Good',
          exitCondition: 'Defective',
          repairDeductionZAR: 800,
          exitNotes: 'Scuff marks in hallway',
        },
        {
          category: 'Kitchen Stove, Oven & Cupboards',
          ingoingCondition: 'Good',
          exitCondition: 'Good',
        },
      ],
    };

    it('formats ingoing report with all required particulars and prompt', () => {
      const output = formatInspectionForWhatsApp({
        propertyTitle: 'Sandhurst Executive Suite',
        unitName: 'Unit 4B',
        tenantName: 'Sipho Khumalo',
        mode: 'ingoing',
        depositHeldZAR: 15000,
        record: sampleRecord,
        portalUrl: 'https://portal.example.com/statement/lease-1?tab=inspection',
      });

      expect(output).toContain('JOINT INGOING PROPERTY INSPECTION REPORT');
      expect(output).toContain('Sandhurst Executive Suite — Unit 4B');
      expect(output).toContain('Sipho Khumalo');
      expect(output).toContain('[Good]');
      expect(output).toContain(formatZAR(15000, { includeDecimals: true }));
      expect(output).toContain('https://drive.google.com/test-vault');
      expect(output).toContain('https://portal.example.com/statement/lease-1?tab=inspection');
      expect(output).toContain('AGREED');
    });

    it('formats exit settlement with repair deductions and net refundable deposit', () => {
      const output = formatInspectionForWhatsApp({
        propertyTitle: 'Sandhurst Executive Suite',
        unitName: 'Unit 4B',
        tenantName: 'Sipho Khumalo',
        mode: 'exit',
        depositHeldZAR: 15000,
        record: sampleRecord,
      });

      expect(output).toContain('JOINT EXIT PROPERTY INSPECTION & DEPOSIT SETTLEMENT');
      expect(output).toContain(`Total Repair Deductions: *${formatZAR(800, { includeDecimals: true })}*`);
      expect(output).toContain(`Net Deposit Refundable: *${formatZAR(14200, { includeDecimals: true })}*`);
      expect(output).toContain('Scuff marks in hallway');
    });

    it('STRICT EMOJI TEST: contains ZERO unicode emojis to satisfy global WhatsApp formatter rules', () => {
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u;

      const ingoingOutput = formatInspectionForWhatsApp({
        propertyTitle: 'Sandhurst Executive Suite',
        unitName: 'Unit 4B',
        tenantName: 'Sipho Khumalo',
        mode: 'ingoing',
        depositHeldZAR: 15000,
        record: sampleRecord,
      });

      const exitOutput = formatInspectionForWhatsApp({
        propertyTitle: 'Sandhurst Executive Suite',
        unitName: 'Unit 4B',
        tenantName: 'Sipho Khumalo',
        mode: 'exit',
        depositHeldZAR: 15000,
        record: sampleRecord,
      });

      expect(ingoingOutput).not.toMatch(emojiRegex);
      expect(exitOutput).not.toMatch(emojiRegex);
    });
  });
});
