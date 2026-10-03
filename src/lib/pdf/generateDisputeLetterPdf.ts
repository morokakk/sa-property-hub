import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { DisputeLetterData } from '@/types';
import { base64ToUint8Array } from '@/lib/utils/imageDownscale';

// A4 Page dimensions in points (72 points per inch)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 45;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Professional Palette
const COLOR_PRIMARY = rgb(0.08, 0.15, 0.28); // Slate 900
const COLOR_SECONDARY = rgb(0.2, 0.3, 0.45); // Slate 700
const COLOR_MUTED = rgb(0.45, 0.52, 0.62); // Slate 500
const COLOR_LIGHT_BG = rgb(0.96, 0.97, 0.98); // Slate 50
const COLOR_BORDER = rgb(0.85, 0.88, 0.92); // Slate 200
const COLOR_AMBER = rgb(0.85, 0.45, 0.05); // Amber 600

/**
 * Sanitizes input text so it only contains characters supported by pdf-lib StandardFonts (WinAnsi).
 * Prevents unhandled crashes when users enter emojis, special punctuation, or when
 * numbers contain non-breaking / narrow spaces from locale formatting.
 */
export function sanitizeWinAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u202F\u00A0]/g, ' ') // Narrow & regular non-breaking space -> regular space
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes -> '
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes -> "
    .replace(/[\u2013\u2014]/g, '-') // En/em dash -> -
    .replace(/\u2022/g, '•')          // Bullet point (0x95 in WinAnsi)
    .replace(/[^\x00-\x7F\xA0-\xFF]/g, ''); // Strip any character outside WinAnsi range (like emojis ⚡💧)
}

/**
 * Truncates text with ellipsis if it exceeds maxWidth points.
 */
export function truncateToWidth(text: string, maxWidth: number, font: PDFFont, fontSize: number): string {
  const clean = sanitizeWinAnsi(text);
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) return clean;
  let truncated = clean;
  while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Wraps text into lines that do not exceed maxWidth points.
 */
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const cleanText = sanitizeWinAnsi(text);
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Client-Side PDF Generation for Municipal Utility Bill Disputes.
 * Produces a 2-page document:
 * - Page 1: Official Dispute Letter Template
 * - Page 2: Annexure A (Photographic Evidence with verification caption)
 */
export async function generateDisputeLetterPdf(data: DisputeLetterData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  doc.setTitle(sanitizeWinAnsi(`Municipal Billing Dispute - Account ${data.accountNumber || 'Pending'}`));
  doc.setAuthor(sanitizeWinAnsi(data.senderName || 'Property Owner / Manager'));
  doc.setSubject(sanitizeWinAnsi(`Dispute for ${data.propertyAddress || 'Property'}`));
  doc.setCreationDate(new Date());

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Determine if photo evidence is provided
  let photoBytes: Uint8Array | null = null;
  if (data.photoBytes && data.photoBytes.length > 0) {
    photoBytes = data.photoBytes;
  } else if (data.photoBase64) {
    try {
      photoBytes = base64ToUint8Array(data.photoBase64);
    } catch {
      photoBytes = null;
    }
  }

  const hasPhoto = Boolean(photoBytes && photoBytes.length > 0);
  const totalPages = hasPhoto ? 2 : 1;
  const utilityLabel = data.utilityType === 'electricity' ? 'Electricity' : 'Water';
  const unitLabel = data.utilityType === 'electricity' ? 'kWh' : 'KL';
  const discrepancy =
    data.discrepancyUnits !== undefined
      ? data.discrepancyUnits
      : Math.round(((data.municipalReading || 0) - (data.physicalReading || 0)) * 1000) / 1000;

  // --------------------------------------------------------------------------
  // PAGE 1: FORMAL DISPUTE LETTER
  // --------------------------------------------------------------------------
  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // 1. Header Banner
  page1.drawRectangle({
    x: MARGIN,
    y: y - 36,
    width: CONTENT_WIDTH,
    height: 36,
    color: COLOR_LIGHT_BG,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
  });

  page1.drawText('MUNICIPAL BILL DISPUTE LETTER TEMPLATE', {
    x: MARGIN + 12,
    y: y - 22,
    size: 13,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  page1.drawText('Notice of Contested Utility Reading (Municipal Systems Act 32 of 2000, Sec 102)', {
    x: MARGIN + 12,
    y: y - 32,
    size: 7.5,
    font: fontRegular,
    color: COLOR_MUTED,
  });

  y -= 48;

  // 2. Metadata Grid (To, Date, Account, Property)
  const metaBoxHeight = 62;
  page1.drawRectangle({
    x: MARGIN,
    y: y - metaBoxHeight,
    width: CONTENT_WIDTH,
    height: metaBoxHeight,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const colRightX = MARGIN + CONTENT_WIDTH * 0.62;
  const maxColLeftWidth = colRightX - MARGIN - 16;

  // Left Column: Recipient
  page1.drawText('TO (REVENUE DEPT):', {
    x: MARGIN + 10,
    y: y - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  const recipientStr = truncateToWidth(
    `${data.municipalityEmail || '[Insert Municipality Email]'} (${data.municipalityName || 'Revenue Office'})`,
    maxColLeftWidth,
    fontRegular,
    8.5
  );
  page1.drawText(recipientStr, {
    x: MARGIN + 10,
    y: y - 26,
    size: 8.5,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  page1.drawText('PROPERTY ADDRESS:', {
    x: MARGIN + 10,
    y: y - 39,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  const addressStr = truncateToWidth(
    data.propertyAddress || '[Insert Physical Property Address]',
    maxColLeftWidth,
    fontRegular,
    8.5
  );
  page1.drawText(addressStr, {
    x: MARGIN + 10,
    y: y - 51,
    size: 8.5,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  // Right Column: Date & Account
  page1.drawText('LETTER DATE:', {
    x: colRightX,
    y: y - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  const dateStr = truncateToWidth(
    data.date || new Date().toISOString().split('T')[0],
    CONTENT_WIDTH - (colRightX - MARGIN) - 10,
    fontRegular,
    9
  );
  page1.drawText(dateStr, {
    x: colRightX,
    y: y - 26,
    size: 9,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  page1.drawText('ACCOUNT NUMBER:', {
    x: colRightX,
    y: y - 39,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });
  const accountStr = truncateToWidth(
    data.accountNumber || '[Insert Account Number]',
    CONTENT_WIDTH - (colRightX - MARGIN) - 10,
    fontBold,
    9
  );
  page1.drawText(accountStr, {
    x: colRightX,
    y: y - 51,
    size: 9,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= metaBoxHeight + 14;

  // 3. Subject Line (Highlighted)
  page1.drawRectangle({
    x: MARGIN,
    y: y - 22,
    width: CONTENT_WIDTH,
    height: 22,
    color: COLOR_LIGHT_BG,
  });

  const subjectText = truncateToWidth(
    `Subject: FORMAL BILLING DISPUTE: Account No: ${data.accountNumber || '[Insert Account Number]'} – Incorrect Meter Reading`,
    CONTENT_WIDTH - 16,
    fontBold,
    9.5
  );
  page1.drawText(subjectText, {
    x: MARGIN + 8,
    y: y - 15,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= 34;

  // 4. Salutation & Opening
  page1.drawText('Dear Sir / Madam,', {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  y -= 16;

  const openingPara = `I am writing to lodge a formal dispute regarding my recent municipal bill dated ${data.billDate || '[Insert Bill Date]'} for Account Number: ${data.accountNumber || '[Insert Account Number]'}. The property concerned is located at ${data.propertyAddress || '[Insert Physical Property Address]'}.`;
  for (const line of wrapText(openingPara, CONTENT_WIDTH, fontRegular, 9)) {
    page1.drawText(line, {
      x: MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: COLOR_PRIMARY,
    });
    y -= 13;
  }

  y -= 6;

  // 5. Grounds for Dispute
  page1.drawText('Grounds for Dispute:', {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= 14;

  const recordedReadingStr = data.municipalReading ? data.municipalReading.toLocaleString('en-ZA') : '[Insert Reading on the Bill]';
  const groundsPara = `The current statement reflects an incorrect, estimated, or faulty reading for my ${utilityLabel} meter. The municipality's recorded reading of ${recordedReadingStr} significantly exceeds the actual consumption currently showing on my physical meter.`;
  for (const line of wrapText(groundsPara, CONTENT_WIDTH, fontRegular, 9)) {
    page1.drawText(line, {
      x: MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: COLOR_PRIMARY,
    });
    y -= 13;
  }

  y -= 6;

  // 6. Comparative Meter Audit Table
  const tableHeight = 64;
  page1.drawRectangle({
    x: MARGIN,
    y: y - tableHeight,
    width: CONTENT_WIDTH,
    height: tableHeight,
    borderColor: COLOR_BORDER,
    borderWidth: 1,
    color: COLOR_LIGHT_BG,
  });

  // Table header
  page1.drawText('VERIFIED READING COMPARISON & REVENUE RECONCILIATION', {
    x: MARGIN + 10,
    y: y - 13,
    size: 7.5,
    font: fontBold,
    color: COLOR_SECONDARY,
  });

  const colW = (CONTENT_WIDTH - 20) / 4;
  const tRowY = y - 30;

  // Cell 1: Physical Reading
  page1.drawText('Physical Dial Reading:', {
    x: MARGIN + 10,
    y: tRowY,
    size: 7,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  page1.drawText(sanitizeWinAnsi(`${(data.physicalReading || 0).toLocaleString('en-ZA')} ${unitLabel}`), {
    x: MARGIN + 10,
    y: tRowY - 11,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.5, 0.3),
  });

  // Cell 2: Council Reading
  page1.drawText('Contested Council Dial:', {
    x: MARGIN + 10 + colW,
    y: tRowY,
    size: 7,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  page1.drawText(sanitizeWinAnsi(`${(data.municipalReading || 0).toLocaleString('en-ZA')} ${unitLabel}`), {
    x: MARGIN + 10 + colW,
    y: tRowY - 11,
    size: 9.5,
    font: fontBold,
    color: COLOR_AMBER,
  });

  // Cell 3: Discrepancy
  page1.drawText('Over-Billed Consumption:', {
    x: MARGIN + 10 + colW * 2,
    y: tRowY,
    size: 7,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  page1.drawText(sanitizeWinAnsi(`${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString('en-ZA')} ${unitLabel}`), {
    x: MARGIN + 10 + colW * 2,
    y: tRowY - 11,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  // Cell 4: Disputed Rand Amount
  page1.drawText('Estimated Rand Impact:', {
    x: MARGIN + 10 + colW * 3,
    y: tRowY,
    size: 7,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  const randText =
    data.estimatedOverchargeZAR !== undefined
      ? sanitizeWinAnsi(`R ${data.estimatedOverchargeZAR.toLocaleString('en-ZA', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`)
      : 'Under audit';
  page1.drawText(randText, {
    x: MARGIN + 10 + colW * 3,
    y: tRowY - 11,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= tableHeight + 14;

  // 7. Evidence Provided
  page1.drawText('Evidence Provided:', {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= 14;

  const photoName = sanitizeWinAnsi(
    data.photoFilename ||
    (hasPhoto ? 'Annexure_A_Meter_Photo.jpg' : 'meter_reading_photo.jpg')
  );

  const evidenceIntro = `To support this dispute, I have attached a clear, high-resolution photograph of my meter taken on ${data.photoDate || '[Insert Date Photo Was Taken]'}.`;
  page1.drawText(sanitizeWinAnsi(evidenceIntro), {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  y -= 14;

  const bullets = [
    sanitizeWinAnsi(`• Meter Serial Number: ${data.meterNumber || '[Insert Serial Number found on physical meter]'}`),
    sanitizeWinAnsi(`• Actual Current Reading: ${(data.physicalReading || 0).toLocaleString('en-ZA')} ${unitLabel}`),
    sanitizeWinAnsi(`• Attachment Filename: ${photoName} ${hasPhoto ? '(Refer to Annexure A attached)' : ''}`),
  ];

  for (const bullet of bullets) {
    page1.drawText(bullet, {
      x: MARGIN + 10,
      y,
      size: 9,
      font: fontRegular,
      color: COLOR_PRIMARY,
    });
    y -= 13;
  }

  y -= 6;

  // 8. Requested Action
  page1.drawText('Requested Action:', {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= 14;

  const requestedPara =
    'Please register this dispute and provide me with a official reference number. I request that my account be re-audited and reversed/credited according to my actual physical usage as evidenced by the attached photo. Please acknowledge receipt of this email and confirm when the corrected adjustment will reflect.';
  for (const line of wrapText(requestedPara, CONTENT_WIDTH, fontRegular, 9)) {
    page1.drawText(line, {
      x: MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: COLOR_PRIMARY,
    });
    y -= 13;
  }

  y -= 10;

  // 9. Sign-Off
  page1.drawText('Sincerely,', {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontRegular,
    color: COLOR_PRIMARY,
  });

  y -= 16;
  page1.drawText(truncateToWidth(data.senderName || '[Your Name & Surname]', CONTENT_WIDTH, fontBold, 9.5), {
    x: MARGIN,
    y,
    size: 9.5,
    font: fontBold,
    color: COLOR_PRIMARY,
  });

  y -= 13;
  page1.drawText(truncateToWidth(`Contact Number: ${data.senderPhone || '[Your Phone Number]'}`, CONTENT_WIDTH, fontRegular, 8.5), {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });

  y -= 12;
  page1.drawText(truncateToWidth(`Email Address: ${data.senderEmail || '[Your Email]'}`, CONTENT_WIDTH, fontRegular, 8.5), {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontRegular,
    color: COLOR_SECONDARY,
  });

  // Footer: Page 1 of N
  page1.drawLine({
    start: { x: MARGIN, y: MARGIN + 14 },
    end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 14 },
    thickness: 0.5,
    color: COLOR_BORDER,
  });

  page1.drawText(
    hasPhoto
      ? `Page 1 of ${totalPages} • Annexure A: Photographic Evidence Attached`
      : `Page 1 of 1 • Formal Municipal Dispute Letter`,
    {
      x: MARGIN,
      y: MARGIN + 4,
      size: 7.5,
      font: fontRegular,
      color: COLOR_MUTED,
    }
  );

  page1.drawText('South African Property Portfolio Hub', {
    x: PAGE_WIDTH - MARGIN - 140,
    y: MARGIN + 4,
    size: 7.5,
    font: fontItalic,
    color: COLOR_MUTED,
  });

  // --------------------------------------------------------------------------
  // PAGE 2: ANNEXURE A: PHOTOGRAPHIC EVIDENCE
  // --------------------------------------------------------------------------
  if (hasPhoto && photoBytes) {
    const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y2 = PAGE_HEIGHT - MARGIN;

    // 1. Annexure Header Banner
    page2.drawRectangle({
      x: MARGIN,
      y: y2 - 36,
      width: CONTENT_WIDTH,
      height: 36,
      color: COLOR_LIGHT_BG,
      borderColor: COLOR_BORDER,
      borderWidth: 1,
    });

    page2.drawText('ANNEXURE A: PHOTOGRAPHIC EVIDENCE OF PHYSICAL METER DIALS', {
      x: MARGIN + 12,
      y: y2 - 22,
      size: 11,
      font: fontBold,
      color: COLOR_PRIMARY,
    });

    page2.drawText(
      truncateToWidth(
        `Property: ${data.propertyAddress || 'Unspecified'} • Account #${data.accountNumber || 'Pending'} • Meter #${data.meterNumber || 'Pending'}`,
        CONTENT_WIDTH - 24,
        fontRegular,
        7.5
      ),
      {
        x: MARGIN + 12,
        y: y2 - 32,
        size: 7.5,
        font: fontRegular,
        color: COLOR_MUTED,
      }
    );

    y2 -= 46;

    // 2. Embed Downscaled JPEG Photo
    let embeddedImg;
    try {
      // Check if image is PNG vs JPEG by header bytes
      const isPng =
        photoBytes[0] === 0x89 &&
        photoBytes[1] === 0x50 &&
        photoBytes[2] === 0x4e &&
        photoBytes[3] === 0x47;

      if (isPng) {
        embeddedImg = await doc.embedPng(photoBytes);
      } else {
        embeddedImg = await doc.embedJpg(photoBytes);
      }
    } catch {
      // If embedJpg fails, attempt fallback
      try {
        embeddedImg = await doc.embedPng(photoBytes);
      } catch {
        embeddedImg = null;
      }
    }

    if (embeddedImg) {
      // Bounding box for photograph on Page 2
      const maxImgWidth = CONTENT_WIDTH;
      const maxImgHeight = 440;

      const scale = Math.min(
        maxImgWidth / embeddedImg.width,
        maxImgHeight / embeddedImg.height,
        1
      );

      const drawWidth = embeddedImg.width * scale;
      const drawHeight = embeddedImg.height * scale;

      const imgX = MARGIN + (CONTENT_WIDTH - drawWidth) / 2;
      const imgY = y2 - drawHeight - 10;

      // Draw photo container background & border
      page2.drawRectangle({
        x: imgX - 4,
        y: imgY - 4,
        width: drawWidth + 8,
        height: drawHeight + 8,
        color: COLOR_LIGHT_BG,
        borderColor: COLOR_BORDER,
        borderWidth: 1,
      });

      page2.drawImage(embeddedImg, {
        x: imgX,
        y: imgY,
        width: drawWidth,
        height: drawHeight,
      });

      y2 = imgY - 20;
    } else {
      // Fallback if image byte decoding failed
      page2.drawRectangle({
        x: MARGIN,
        y: y2 - 120,
        width: CONTENT_WIDTH,
        height: 120,
        color: COLOR_LIGHT_BG,
        borderColor: COLOR_BORDER,
        borderWidth: 1,
      });
      page2.drawText('Photo attachment could not be rendered inline. Attached as raw file.', {
        x: MARGIN + 20,
        y: y2 - 60,
        size: 9,
        font: fontItalic,
        color: COLOR_MUTED,
      });
      y2 -= 140;
    }

    // 3. Photographic Evidence Verification Caption Box
    const captionHeight = 110;
    page2.drawRectangle({
      x: MARGIN,
      y: y2 - captionHeight,
      width: CONTENT_WIDTH,
      height: captionHeight,
      borderColor: COLOR_BORDER,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    page2.drawText('PHYSICAL METER VERIFICATION & FIELD AUDIT CERTIFICATION', {
      x: MARGIN + 10,
      y: y2 - 14,
      size: 7.5,
      font: fontBold,
      color: COLOR_SECONDARY,
    });

    const capColW = (CONTENT_WIDTH - 20) / 3;
    const cRowY = y2 - 30;

    // Field 1
    page2.drawText('Meter Serial Number:', {
      x: MARGIN + 10,
      y: cRowY,
      size: 7,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page2.drawText(truncateToWidth(data.meterNumber || 'Verified On-Site', capColW - 15, fontBold, 9), {
      x: MARGIN + 10,
      y: cRowY - 11,
      size: 9,
      font: fontBold,
      color: COLOR_PRIMARY,
    });

    // Field 2
    page2.drawText('Dial Reading Recorded:', {
      x: MARGIN + 10 + capColW,
      y: cRowY,
      size: 7,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page2.drawText(
      truncateToWidth(`${(data.physicalReading || 0).toLocaleString('en-ZA')} ${unitLabel}`, capColW - 15, fontBold, 9),
      {
        x: MARGIN + 10 + capColW,
        y: cRowY - 11,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.5, 0.3),
      }
    );

    // Field 3
    page2.drawText('Date Photo Captured:', {
      x: MARGIN + 10 + capColW * 2,
      y: cRowY,
      size: 7,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page2.drawText(truncateToWidth(data.photoDate || 'On-site date', capColW - 15, fontBold, 9), {
      x: MARGIN + 10 + capColW * 2,
      y: cRowY - 11,
      size: 9,
      font: fontBold,
      color: COLOR_PRIMARY,
    });

    // Formal Verification Statement
    const legalStatement =
      'Verification Statement: I hereby declare and confirm that this photograph was captured on-site at the property indicated above on the stated inspection date and represents a true, accurate, and unedited record of the physical meter dials.';
    let legY = y2 - 58;
    for (const line of wrapText(legalStatement, CONTENT_WIDTH - 20, fontItalic, 7.5)) {
      page2.drawText(line, {
        x: MARGIN + 10,
        y: legY,
        size: 7.5,
        font: fontItalic,
        color: COLOR_MUTED,
      });
      legY -= 10;
    }

    page2.drawText(
      truncateToWidth(
        `Verified By: ${data.senderName || '[Your Name]'} (${data.senderPhone || '[Phone]'}) • Attachment: ${photoName}`,
        CONTENT_WIDTH - 20,
        fontRegular,
        7.5
      ),
      {
        x: MARGIN + 10,
        y: legY - 4,
        size: 7.5,
        font: fontRegular,
        color: COLOR_SECONDARY,
      }
    );

    // Footer: Page 2 of 2
    page2.drawLine({
      start: { x: MARGIN, y: MARGIN + 14 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 14 },
      thickness: 0.5,
      color: COLOR_BORDER,
    });

    page2.drawText(
      `Page 2 of ${totalPages} • Annexure A: Photographic Evidence`,
      {
        x: MARGIN,
        y: MARGIN + 4,
        size: 7.5,
        font: fontRegular,
        color: COLOR_MUTED,
      }
    );

    page2.drawText('South African Property Portfolio Hub', {
      x: PAGE_WIDTH - MARGIN - 140,
      y: MARGIN + 4,
      size: 7.5,
      font: fontItalic,
      color: COLOR_MUTED,
    });
  }

  return await doc.save();
}

/**
 * Client-Side helper: downloads generated PDF bytes directly in the user's browser.
 * Zero Supabase upload required.
 */
export function downloadDisputePdf(pdfBytes: Uint8Array, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
