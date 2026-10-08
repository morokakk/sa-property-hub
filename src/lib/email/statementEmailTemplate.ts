import { StatementBankingDetails } from '@/types';

export interface GenerateEmailHtmlParams {
  tenantName?: string;
  propertyName: string;
  unitName?: string;
  billingPeriod: string;
  totalAmountDueFormatted: string;
  statementUrl: string;
  landlordName?: string;
  filename: string;
  remainingLeaseTerm?: string;
  bankingDetails?: StatementBankingDetails;
}

/**
 * Builds the professional branded HTML email body for tenant rental & utility statements.
 */
export function generateStatementEmailHtml(params: GenerateEmailHtmlParams): string {
  const {
    tenantName,
    propertyName,
    unitName,
    billingPeriod,
    totalAmountDueFormatted,
    statementUrl,
    landlordName,
    filename,
    remainingLeaseTerm,
    bankingDetails,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Monthly Rental &amp; Utility Statement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 32px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; margin-bottom: 6px;">
                Verified Statement
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                ${propertyName}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
                ${unitName ? `${unitName} &bull; ` : ''}${billingPeriod}
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Dear <strong>${tenantName || 'Tenant'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Your monthly rental and utility breakdown statement for <strong>${billingPeriod}</strong> has been prepared and verified by your landlord. An itemized PDF copy has been attached to this email for your records.
              </p>

              <!-- Amount Due Banner -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #166534; margin-bottom: 4px;">
                      Total Amount Due
                    </div>
                    <div style="font-size: 28px; font-weight: 900; color: #14532d; letter-spacing: -0.5px;">
                      ${totalAmountDueFormatted}
                    </div>
                    <div style="font-size: 12px; color: #15803d; margin-top: 4px;">
                      Billing Period: <strong>${billingPeriod}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Details Summary Table -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Property:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${propertyName}</td>
                </tr>
                ${unitName ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Unit / Section:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${unitName}</td>
                </tr>` : ''}
                ${remainingLeaseTerm ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Remaining Lease Term:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${remainingLeaseTerm}</td>
                </tr>` : ''}
                ${landlordName ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Landlord / Lessor:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${landlordName}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Attachment:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${filename}</td>
                </tr>
              </table>

              ${bankingDetails && bankingDetails.accountNumber ? `
              <!-- Remittance Banking Details Card -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px; padding: 18px; font-size: 13px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                      🏦 Remittance Banking Details (EFT)
                    </div>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 12px; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 500; width: 40%;">Bank:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${bankingDetails.bankName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Account Holder:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${bankingDetails.accountHolder}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Account Number:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 13px;">${bankingDetails.accountNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Branch / Code:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${bankingDetails.branchCode}${bankingDetails.accountType ? ` (${bankingDetails.accountType})` : ''}</td>
                      </tr>
                      ${bankingDetails.swiftCode ? `
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 500;">SWIFT / BIC:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${bankingDetails.swiftCode}</td>
                      </tr>` : ''}
                      ${bankingDetails.paymentReference ? `
                      <tr style="border-top: 1px dashed #cbd5e1;">
                        <td style="padding: 8px 0 4px 0; color: #059669; font-weight: 700;">Beneficiary Reference:</td>
                        <td style="padding: 8px 0 4px 0; color: #059669; font-weight: 800; font-family: monospace; font-size: 13px;">${bankingDetails.paymentReference}</td>
                      </tr>` : ''}
                    </table>
                    ${bankingDetails.remittanceInstructions ? `
                    <div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                      ${bankingDetails.remittanceInstructions}
                    </div>` : ''}
                  </td>
                </tr>
              </table>` : ''}

              <!-- Prominent CTA Button -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${statementUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3); letter-spacing: 0.2px;">
                      View Secure Online Statement &rarr;
                    </a>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; text-align: center; word-break: break-all;">
                      Direct portal link: <a href="${statementUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">${statementUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                You can review your itemized municipal ledger, meter readings, and transaction history online anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This statement was manually verified and distributed by ${landlordName || 'your property landlord'}.<br>
                For any questions or payment arrangements, please contact your landlord directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
