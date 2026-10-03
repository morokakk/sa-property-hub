import { describe, it, expect } from 'vitest';
import { generateDisputeLetterPdf } from '../generateDisputeLetterPdf';
import { PDFDocument } from 'pdf-lib';
import { DisputeLetterData } from '@/types';
import { base64ToUint8Array } from '@/lib/utils/imageDownscale';

// Minimal valid 1x1 red pixel JPEG in base64
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('generateDisputeLetterPdf', () => {
  const baseData: DisputeLetterData = {
    propertyTitle: 'Umhlanga Ridge Coastal Vista',
    propertyAddress: '14 The Boulevard, Umhlanga Ridge, Durban',
    municipalityName: 'eThekwini Metropolitan Municipality',
    municipalityEmail: 'revline@durban.gov.za',
    date: '2026-10-03',
    accountNumber: 'ETH-881920',
    billDate: '2026-09-25',
    utilityType: 'electricity',
    municipalReading: 28410,
    physicalReading: 28260,
    meterNumber: 'ETH-E-33019',
    photoDate: '2026-09-26',
    photoFilename: 'meter_photo_umhlanga.jpg',
    discrepancyUnits: 150,
    effectiveTariff: 3.0625,
    estimatedOverchargeZAR: 459.38,
    referenceNumber: 'ETH-2026-88192',
    senderName: 'Moroka Portfolio Holdings',
    senderPhone: '+27 83 555 1234',
    senderEmail: 'moroka@propertysa.co.za',
  };

  it('generates a 1-page PDF when no photographic evidence is attached', async () => {
    const pdfBytes = await generateDisputeLetterPdf({
      ...baseData,
      photoBase64: undefined,
      photoBytes: undefined,
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    // Verify valid PDF header
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');

    // Reload with PDFDocument to verify page count and metadata
    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(1);
    expect(reloaded.getTitle()).toContain('ETH-881920');
    expect(reloaded.getAuthor()).toBe('Moroka Portfolio Holdings');
  });

  it('generates a 2-page PDF when photographic evidence is provided via photoBytes', async () => {
    const jpegBytes = base64ToUint8Array(TINY_JPEG_BASE64);

    const pdfBytes = await generateDisputeLetterPdf({
      ...baseData,
      photoBytes: jpegBytes,
      photoFilename: 'physical_dial_inspection.jpg',
    });

    expect(pdfBytes).toBeDefined();
    const reloaded = await PDFDocument.load(pdfBytes);

    expect(reloaded.getPageCount()).toBe(2);
    expect(reloaded.getTitle()).toContain('Municipal Billing Dispute');
  });

  it('generates a 2-page PDF when photographic evidence is provided via photoBase64', async () => {
    const pdfBytes = await generateDisputeLetterPdf({
      ...baseData,
      photoBase64: TINY_JPEG_BASE64,
    });

    expect(pdfBytes).toBeDefined();
    const reloaded = await PDFDocument.load(pdfBytes);

    expect(reloaded.getPageCount()).toBe(2);
  });

  it('handles water dispute parameters with custom discrepancy and no reference ticket', async () => {
    const waterData: DisputeLetterData = {
      propertyTitle: 'Green Point Atlantic Views',
      propertyAddress: '88 Somerset Road, Green Point, Cape Town',
      municipalityName: 'City of Cape Town',
      municipalityEmail: 'accounts@capetown.gov.za',
      date: '2026-10-03',
      accountNumber: 'CCT-WATER-99',
      billDate: '2026-09-30',
      utilityType: 'water',
      municipalReading: 1812,
      physicalReading: 1794,
      meterNumber: 'CCT-W-99120',
      photoDate: '2026-10-01',
      senderName: 'Matthew van der Merwe',
      senderPhone: '021 555 7890',
      senderEmail: 'matthew@greenpoint.co.za',
    };

    const pdfBytes = await generateDisputeLetterPdf(waterData);
    const reloaded = await PDFDocument.load(pdfBytes);

    expect(reloaded.getPageCount()).toBe(1);
  });

  it('safely handles non-WinAnsi characters (emojis, narrow spaces) without throwing encoding errors', async () => {
    const unicodeData: DisputeLetterData = {
      ...baseData,
      meterNumber: '⚡ #10003374 💧',
      propertyAddress: '14 The Boulevard, Umhlanga Ridge \u202F Durban 🇿🇦',
      senderName: 'Moroka Portfolio • “Holdings” – 2026',
    };

    const pdfBytes = await generateDisputeLetterPdf(unicodeData);
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('handles extremely long property addresses and municipality names via text truncation and wrapping', async () => {
    const longData: DisputeLetterData = {
      ...baseData,
      propertyAddress:
        'Unit 402, Block B, Cascades On The Promenade, 11 Arthurs Road, Sea Point, Cape Town, Western Cape, 8005, South Africa',
      municipalityEmail: 'extremely_long_revenue_dispute_department_mailbox_for_rates@capetown.gov.za',
      municipalityName: 'City of Cape Town Metropolitan Municipality Revenue Directorate',
      photoBase64: TINY_JPEG_BASE64,
    };

    const pdfBytes = await generateDisputeLetterPdf(longData);
    expect(pdfBytes).toBeDefined();

    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(2);
  });

  it('handles completely blank optional fields with official template fallbacks', async () => {
    const emptyData: DisputeLetterData = {
      propertyTitle: '',
      propertyAddress: '',
      municipalityName: '',
      municipalityEmail: '',
      date: '',
      accountNumber: '',
      billDate: '',
      utilityType: 'electricity',
      municipalReading: 0,
      physicalReading: 0,
      meterNumber: '',
      photoDate: '',
      senderName: '',
      senderPhone: '',
      senderEmail: '',
    };

    const pdfBytes = await generateDisputeLetterPdf(emptyData);
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(0);

    const reloaded = await PDFDocument.load(pdfBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
