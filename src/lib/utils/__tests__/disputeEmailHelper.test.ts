import { describe, it, expect } from 'vitest';
import {
  buildConciseMailtoUrl,
  buildFullDisputeLetterText,
} from '../disputeEmailHelper';
import { DisputeLetterData } from '@/types';

const mockDisputeData: DisputeLetterData = {
  propertyTitle: 'Sandhurst Executive Suite',
  propertyAddress: '35 Fredman Drive, Sandton, Johannesburg',
  municipalityName: 'City of Johannesburg (CoJ)',
  municipalityEmail: 'regionbrevenue@joburg.org.za',
  date: '2026-10-03',
  accountNumber: 'COJ-992014',
  billDate: '2026-09-28',
  utilityType: 'electricity',
  municipalReading: 40250,
  physicalReading: 39910,
  meterNumber: '10003374',
  photoDate: '2026-10-02',
  photoFilename: 'meter_photo_sandton_oct26.jpg',
  discrepancyUnits: 340,
  effectiveTariff: 3.15,
  estimatedOverchargeZAR: 1071.0,
  referenceNumber: 'REF-COJ-8819',
  senderName: 'Moroka Portfolio Holdings',
  senderPhone: '+27 82 123 4567',
  senderEmail: 'investor@propertyhub.co.za',
};

describe('disputeEmailHelper', () => {
  it('buildConciseMailtoUrl generates valid mailto URL strictly under 2,000 characters', () => {
    const mailtoUrl = buildConciseMailtoUrl(mockDisputeData);

    expect(mailtoUrl.startsWith('mailto:regionbrevenue%40joburg.org.za')).toBe(true);
    expect(mailtoUrl).toContain('subject=FORMAL%20BILLING%20DISPUTE');
    expect(mailtoUrl).toContain('COJ-992014');
    expect(mailtoUrl).toContain('10003374');
    expect(mailtoUrl).toContain(encodeURIComponent('1 071,00').replace(/%20/g, '%C2%A0'));

    // Mailto length assertion
    expect(mailtoUrl.length).toBeLessThan(2000);
    // Typical length is around 700-900 chars
    expect(mailtoUrl.length).toBeLessThan(1200);
  });

  it('buildConciseMailtoUrl falls back cleanly when optional fields are missing', () => {
    const minimalData: DisputeLetterData = {
      propertyTitle: 'Cottage A',
      propertyAddress: '42 Kruger St, Krugersdorp',
      municipalityName: 'Mogale City',
      municipalityEmail: 'billing@mogalecity.gov.za',
      date: '2026-10-03',
      accountNumber: '',
      billDate: '2026-09-30',
      utilityType: 'water',
      municipalReading: 2500,
      physicalReading: 2420,
      meterNumber: 'MGM-W-MAIN-01',
      photoDate: '2026-10-03',
      senderName: 'John Doe',
      senderPhone: '0820000000',
      senderEmail: 'john@example.com',
    };

    const url = buildConciseMailtoUrl(minimalData);
    expect(url).toContain('mailto:billing%40mogalecity.gov.za');
    expect(url).toContain('Account%20No%3A%20Pending');
    expect(url.length).toBeLessThan(2000);
  });

  it('buildFullDisputeLetterText matches the official user template format', () => {
    const fullText = buildFullDisputeLetterText(mockDisputeData);

    expect(fullText).toContain('MUNICIPAL BILL DISPUTE LETTER TEMPLATE');
    expect(fullText).toContain('To: regionbrevenue@joburg.org.za');
    expect(fullText).toContain('Date: 2026-10-03');
    expect(fullText).toContain('Subject: FORMAL BILLING DISPUTE: Account No: COJ-992014 – Incorrect Meter Reading');
    expect(fullText).toContain('Dear Sir / Madam,');
    expect(fullText).toContain('Account Number: COJ-992014');
    expect(fullText).toContain('Grounds for Dispute:');
    expect(fullText).toContain('Electricity meter');
    expect(fullText).toMatch(/recorded reading of 40[\s\u00a0]250/);
    expect(fullText).toContain('Evidence Provided:');
    expect(fullText).toContain('• Meter Serial Number: 10003374');
    expect(fullText).toMatch(/Actual Current Reading: 39[\s\u00a0]910/);
    expect(fullText).toContain('• Attachment Filename: meter_photo_sandton_oct26.jpg');
    expect(fullText).toContain('Requested Action:');
    expect(fullText).toContain('Please register this dispute and provide me with a official reference number');
    expect(fullText).toContain('Sincerely,\nMoroka Portfolio Holdings');
    expect(fullText).toContain('Contact Number: +27 82 123 4567');
    expect(fullText).toContain('Email Address: investor@propertyhub.co.za');
  });

  it('buildFullDisputeLetterText and buildConciseMailtoUrl provide robust template fallbacks without emitting "undefined"', () => {
    const emptyData: DisputeLetterData = {
      propertyTitle: '',
      propertyAddress: '',
      municipalityName: '',
      municipalityEmail: '',
      date: '',
      accountNumber: '',
      billDate: '',
      utilityType: 'water',
      municipalReading: 0,
      physicalReading: 0,
      meterNumber: '',
      photoDate: '',
      senderName: '',
      senderPhone: '',
      senderEmail: '',
    };

    const fullText = buildFullDisputeLetterText(emptyData);
    expect(fullText).not.toContain('undefined');
    expect(fullText).toContain('[Insert Account Number]');
    expect(fullText).toContain('[Insert Bill Date]');
    expect(fullText).toContain('[Insert Physical Property Address]');
    expect(fullText).toContain('[Your Name & Surname]');
    expect(fullText).toContain('[Your Phone Number]');
    expect(fullText).toContain('[Your Email]');

    const mailto = buildConciseMailtoUrl(emptyData);
    expect(mailto).not.toContain('undefined');
    expect(mailto.length).toBeLessThan(2000);
  });
});
