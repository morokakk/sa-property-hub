import { DisputeLetterData } from '@/types';
import { formatZAR } from '@/lib/formatters';

/**
 * Builds a concise, URI-safe mailto link strictly under 2,000 characters.
 *
 * Keeps the email body focused on critical references (Account #, Property,
 * Disputed Amount, Meter #) while letting the downloaded PDF carry the full
 * legal grounds, readings table, and photographic annexure.
 */
export function buildConciseMailtoUrl(data: DisputeLetterData): string {
  const discrepancy =
    data.discrepancyUnits !== undefined
      ? data.discrepancyUnits
      : Math.round(((data.municipalReading || 0) - (data.physicalReading || 0)) * 1000) / 1000;

  const randAmountFormatted =
    data.estimatedOverchargeZAR !== undefined
      ? formatZAR(data.estimatedOverchargeZAR, { includeDecimals: true })
      : 'Under audit';

  const subject = `FORMAL BILLING DISPUTE: Account No: ${data.accountNumber || 'Pending'} – Incorrect Meter Reading`;

  const senderName = data.senderName || 'Property Owner';
  const senderPhone = data.senderPhone || '[Phone]';
  const senderEmail = data.senderEmail || '[Email]';

  const bodyLines = [
    `To: ${data.municipalityName || 'Municipality Revenue Dept'}`,
    `Date: ${data.date || new Date().toISOString().split('T')[0]}`,
    `Account Number: ${data.accountNumber || 'Pending'}`,
    `Property: ${data.propertyAddress || 'Unspecified'}`,
    `Utility: ${(data.utilityType || 'electricity').toUpperCase()} (Meter #${data.meterNumber || 'Pending'})`,
    `Contested Council Reading: ${(data.municipalReading || 0).toLocaleString('en-ZA')}`,
    `Actual Physical Reading: ${(data.physicalReading || 0).toLocaleString('en-ZA')}`,
    `Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString('en-ZA')} units (${randAmountFormatted})`,
    ...(data.referenceNumber ? [`Prior Ref Ticket: ${data.referenceNumber}`] : []),
    '',
    'Dear Sir / Madam,',
    '',
    'Please see attached our formal municipal dispute letter (PDF) and photographic evidence of the physical dials (Annexure A).',
    '',
    'We formally request that an official dispute reference number be assigned, and our account be re-audited and credited according to our actual physical meter reading.',
    '',
    'Sincerely,',
    senderName,
    `Tel: ${senderPhone}`,
    `Email: ${senderEmail}`,
  ];

  const body = bodyLines.join('\n');
  const recipient = encodeURIComponent((data.municipalityEmail || '').trim());
  const encodedSubject = encodeURIComponent(subject.trim());
  const encodedBody = encodeURIComponent(body);

  const mailtoUrl = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

  // If client URL exceeds safe 2,000 char threshold (e.g. extremely long address), truncate body safely
  if (mailtoUrl.length > 2000) {
    const compactBodyLines = [
      `Account: ${data.accountNumber || 'Pending'} | Property: ${data.propertyAddress || 'Unspecified'}`,
      `Disputed ${data.utilityType}: Council ${data.municipalReading || 0} vs Actual ${data.physicalReading || 0}`,
      `Impact: ${randAmountFormatted} | Meter #${data.meterNumber || 'Pending'}`,
      '',
      'Dear Sir / Madam,',
      'Please see attached formal dispute letter (PDF) with meter photographic evidence.',
      'Kindly register dispute and confirm reference number.',
      '',
      `Sincerely, ${senderName} (${senderPhone})`,
    ];
    const compactBody = encodeURIComponent(compactBodyLines.join('\n'));
    return `mailto:${recipient}?subject=${encodedSubject}&body=${compactBody}`;
  }

  return mailtoUrl;
}

/**
 * Generates the full verbatim municipal dispute letter text matching the official template.
 * Ideal for 1-click "Copy Full Email Text" to clipboard.
 */
export function buildFullDisputeLetterText(data: DisputeLetterData): string {
  const utilityLabel = data.utilityType === 'electricity' ? 'Electricity' : 'Water';
  const photoName =
    data.photoFilename ||
    (data.photoBase64 || data.photoBytes ? 'Annexure_A_Meter_Photo.jpg' : 'meter_reading_photo.jpg');

  const muniEmail = data.municipalityEmail ? data.municipalityEmail.trim() : '[Insert Municipality Revenue Dept Email]';
  const currentDate = data.date || new Date().toISOString().split('T')[0];
  const accountNum = data.accountNumber ? data.accountNumber.trim() : '[Insert Account Number]';
  const billDateStr = data.billDate ? data.billDate.trim() : '[Insert Bill Date]';
  const addressStr = data.propertyAddress ? data.propertyAddress.trim() : '[Insert Physical Property Address]';
  const muniReadingStr = data.municipalReading ? data.municipalReading.toLocaleString('en-ZA') : '[Insert Reading on the Bill]';
  const physReadingStr = data.physicalReading ? data.physicalReading.toLocaleString('en-ZA') : '[Insert Current Digits shown on physical meter]';
  const meterSerialStr = data.meterNumber ? data.meterNumber.trim() : '[Insert Serial Number found on physical meter]';
  const photoDateStr = data.photoDate ? data.photoDate.trim() : '[Insert Date Photo Was Taken]';
  const senderNameStr = data.senderName ? data.senderName.trim() : '[Your Name & Surname]';
  const senderPhoneStr = data.senderPhone ? data.senderPhone.trim() : '[Your Phone Number]';
  const senderEmailStr = data.senderEmail ? data.senderEmail.trim() : '[Your Email]';

  return `MUNICIPAL BILL DISPUTE LETTER TEMPLATE

To: ${muniEmail}
Date: ${currentDate}
Subject: FORMAL BILLING DISPUTE: Account No: ${accountNum} – Incorrect Meter Reading

Dear Sir / Madam,

I am writing to lodge a formal dispute regarding my recent municipal bill dated ${billDateStr} for Account Number: ${accountNum}. The property concerned is located at ${addressStr}.

Grounds for Dispute:
The current statement reflects an incorrect, estimated, or faulty reading for my ${utilityLabel} meter. The municipality's recorded reading of ${muniReadingStr} significantly exceeds the actual consumption currently showing on my physical meter.

Evidence Provided:
To support this dispute, I have attached a clear, high-resolution photograph of my meter taken on ${photoDateStr}.
• Meter Serial Number: ${meterSerialStr}
• Actual Current Reading: ${physReadingStr}
• Attachment Filename: ${photoName}

Requested Action:
Please register this dispute and provide me with a official reference number. I request that my account be re-audited and reversed/credited according to my actual physical usage as evidenced by the attached photo. Please acknowledge receipt of this email and confirm when the corrected adjustment will reflect.

Sincerely,
${senderNameStr}
Contact Number: ${senderPhoneStr}
Email Address: ${senderEmailStr}`;
}
