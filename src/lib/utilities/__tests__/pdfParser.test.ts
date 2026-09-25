import { describe, it, expect, vi } from 'vitest';
import {
  UtilityStatementSchema,
  parseCojUtilityRegex,
  parseEskomUtilityRegex,
  parseIgrowUtilityRegex,
  parseUtilityWithRegex,
  parseRentalPdfStatement,
  extractTextFromPdf,
} from '../pdfParser';
import * as pdfParserModule from '../pdfParser';

describe('Dual-Pipeline Utility Parser', () => {
  describe('Zod Schema & Mathematical Cross-Check', () => {
    it('validates a correct City of Johannesburg line item payload', () => {
      const payload = {
        statementDate: '2025-04-03',
        billingPeriod: 'April 2025',
        accountNumber: '553667195',
        provider: 'City of Johannesburg',
        electricityZAR: 0,
        waterZAR: 0,
        refuseZAR: 353.05,
        sewerageZAR: 0,
        propertyRatesZAR: 774.86,
        totalDueZAR: 1127.91,
      };

      const result = UtilityStatementSchema.parse(payload);
      expect(result.refuseZAR).toBe(353.05);
      expect(result.propertyRatesZAR).toBe(774.86);
      expect(result.totalDueZAR).toBe(1127.91);
    });

    it('rejects a payload where individual lines do not sum to totalDueZAR', () => {
      const invalidPayload = {
        statementDate: '2025-04-03',
        billingPeriod: 'April 2025',
        accountNumber: '553667195',
        provider: 'City of Johannesburg',
        electricityZAR: 500,
        waterZAR: 300,
        refuseZAR: 350,
        sewerageZAR: 200,
        propertyRatesZAR: 700,
        totalDueZAR: 3500, // Actual sum is 2050 -> mismatch
      };

      expect(() => UtilityStatementSchema.parse(invalidPayload)).toThrow(
        /Mathematical cross-check failed/
      );
    });

    it('allows slight cent discrepancies within R1.50 rounding tolerance', () => {
      const roundedPayload = {
        statementDate: '2025-04-03',
        billingPeriod: 'April 2025',
        provider: 'City of Johannesburg',
        electricityZAR: 500.0,
        waterZAR: 300.0,
        refuseZAR: 350.0,
        sewerageZAR: 200.0,
        propertyRatesZAR: 0,
        totalDueZAR: 1350.45, // Difference of R0.45 from 1350.00
      };

      expect(() => UtilityStatementSchema.parse(roundedPayload)).not.toThrow();
    });
  });

  describe('City of Johannesburg Regex Parser', () => {
    // Exact OCR text from user's uploaded Quarrywood / Lone Hill CoJ bill
    const mockCojRawText = `
COPY OF TAX INVOICE
VAT NO: CITY OF JOHANNESBURG: 4760117194 VAT NO: PIKITUP: 4790191292
KGOMOTSO MOROKA FAMILY TRUST
QUARRYWOOD UNIT
32 THE STRAIGHT STREET
LONE HILL EXT.48
2191
Date 2025/04/03
Statement for April 2025
Physical Address 32 THE STRAIGHT STREET
Stand No./Portion 42 QUARRYWOOD
Township LONE HILL EXT.48
Stand Size 97 m2 Date of Valuation 2023/07/01 Portion E1 Market Value R 1,319,000.00 Region A WARD 93
Invoice Number: 214000237577 Next Reading Date: 2025/04/22
Account Number: 553667195 PIN CODE: xxxxxx
Previous Account Balance 6,598.65
Less: Incoming Payment - 8,442.00
Sub Total - 1,843.35
Current Charges (Excl. VAT) 1,081.86
VAT @ 15% 46.05
Total Due - 715.44
Due Date 2025/04/22

Account Number: 553667195
City of Johannesburg
Property Rates VAT 4760117194 Sub - Total Total Amount
Category of Property: Property Rates Residential
R 1,319,000.00 X R 0.0091250 / 12 ( Billing Period 2025/04 ) 1,002.99
Less rates on first R300 000.00 of market value - 228.13
VAT: 0 % 0.00 774.86

City Power
Electricity VAT 4710191182 Sub - Total Total Amount
Unbilled Electricity: Eskom supply 0.00
VAT: 15.00% 0.00 0.00

PIKITUP
Refuse VAT 4790191292 Sub - Total Total Amount
Refuse Residential 307.00
VAT: 15.00% 46.05 353.05

Current Charges (Including VAT) 1,127.91
    `;

    it('extracts all line items and validates cross-check for City of Joburg bill', () => {
      const parsed = parseCojUtilityRegex(mockCojRawText);

      expect(parsed.accountNumber).toBe('553667195');
      expect(parsed.statementDate).toBe('2025-04-03');
      expect(parsed.billingPeriod).toBe('April 2025');
      expect(parsed.provider).toBe('City of Johannesburg');
      expect(parsed.propertyName).toBe('32 The Straight Street, Lone Hill Ext.48');
      expect(parsed.propertyAddress).toBe('32 The Straight Street, Lone Hill Ext.48 (Stand 42 QUARRYWOOD)');
      expect(parsed.propertyRatesZAR).toBe(774.86);
      expect(parsed.refuseZAR).toBe(353.05);
      expect(parsed.electricityZAR).toBe(0);
      expect(parsed.waterZAR).toBe(0);
      expect(parsed.sewerageZAR).toBe(0);
      expect(parsed.totalDueZAR).toBe(1127.91);
    });

    it('extracts property address and stand number from Parkmore CoJ table', () => {
      const parkmoreCojRaw = `
Date 2026/08/14
Statement for August 2026
Physical Address: 100 SEVENTH STREET
Stand No./Portion: 00000840 - 00000 - 00
Township: PARKMORE
Account Number: 555021234
Current Charges (Including VAT) 1,500.00
Property Rates Residential 1,500.00 VAT: 0 %
      `;
      const parsed = parseCojUtilityRegex(parkmoreCojRaw);
      expect(parsed.propertyName).toBe('100 Seventh Street, Parkmore');
      expect(parsed.propertyAddress).toBe('100 Seventh Street, Parkmore (Stand 00000840 - 00000 - 00)');
      expect(parsed.accountNumber).toBe('555021234');
      expect(parsed.propertyRatesZAR).toBe(1500.00);
      expect(parsed.totalDueZAR).toBe(1500.00);
    });

    it('correctly handles continuous inline stream OCR for CoJ table without bleeding adjacent columns into address', () => {
      const cojSingleStream = `
Physical Address: 100 SEVENTH STREET Stand No./portion 00000840 - 00000 - 00 Township Parkmore Stand Size 991 M2 Number Of Dwellings 1 Date Of Valuation 2023/07/01 Portion B1 Municipal Valuation Market Value R 3,180,000.00 Region Region B Ward 90 Invoice Number: 106006508113 Next Reading Date: 2026/05/20 Client Vat Number: Deposit: R 2,746.76 Account Number: 559235779 Pin Code: 233615 Total Due Due Date - 167.68 2026/05/20
Current Charges (Including VAT) 4,297.43
Property Rates Residential 4,297.43 VAT: 0 %
      `;
      const parsed = parseCojUtilityRegex(cojSingleStream);
      expect(parsed.propertyName).toBe('100 Seventh Street, Parkmore');
      expect(parsed.propertyAddress).toBe('100 Seventh Street, Parkmore (Stand 00000840 - 00000 - 00)');
      expect(parsed.accountNumber).toBe('559235779');
      expect(parsed.municipalValuationZAR).toBe(3180000);
    });

    it('routes CoJ text through master parseUtilityWithRegex function', () => {
      const parsed = parseUtilityWithRegex(mockCojRawText);
      expect(parsed.provider).toBe('City of Johannesburg');
      expect(parsed.refuseZAR).toBe(353.05);
      expect(parsed.totalDueZAR).toBe(1127.91);
    });

    it('correctly parses combined Johannesburg Water and Sanitation without double-counting', () => {
      const mockSeptemberCojBill = `
City of Johannesburg
Property Rates VAT 4760117194 Sub - Total Total Amount
Category of Property: Property Rates Residential
R 3,180,000.00 X R 0.0098890 / 12 ( Billing Period 2026/09 ) 2,620.59
Less rates on first R300 000.00 of market value - 247.23
VAT: 0 % 0.00 2,373.36

City Power
Electricity VAT 4710191182 Sub - Total Total Amount
Unbilled Electricity: Eskom supply 0.00
VAT: 15.00% 0.00 0.00

Johannesburg Water
Water & Sanitation VAT 4270191077 Sub - Total Total Amount
Category of Water: Consumption - Residential
(Reading period = 2026/07/11 to 2026/08/07 = 28 days)
Meter: 211001886; Register: 1; Multiply factor: 1; Start reading: 2,053.000;
End reading: 2,083.000; Difference: 30.000; Consumption: 30.000;
Units: KL; Type: Actual Readings.
Daily average consumption 1.071 KL
Charges for 30.000 KL are based on a sliding scale for a 28 day period
Step 1 5.520 KL @ R 0.0000 ( Billing Period 2026/09 ) Step 2 3.679 KL @ R 33.570 Step 3 4.600 KL
@ R 35.040 Step 4 4.599 KL @ R 49.130 Step 5 9.200 KL @ R 67.910 Step 6 2.402 KL @ R 74.260 1,313.77
Extended Social Package Grant 0.00
Demand Management Levy ( Billing Period 2026/09 ) 107.74
Category of Sewer: Residential
Sewer monthly charge based on Stand size 991 m2 ( Billing Period 2026/09 ) 774.48
VAT: 15.00% 329.40 2,525.39

PIKITUP
Refuse VAT 4790191292 Sub - Total Total Amount
Refuse Residential ( Billing Period 2026/09 ) 507.00
VAT: 15.00% 76.05 583.05

Current Charges (Including VAT) 5,481.80
      `;

      const parsed = parseCojUtilityRegex(mockSeptemberCojBill);

      expect(parsed.billingPeriod).toBe('September 2026');
      expect(parsed.propertyRatesZAR).toBe(2373.36);
      expect(parsed.electricityZAR).toBe(0);
      expect(parsed.refuseZAR).toBe(583.05);
      // Sewerage: 774.48 * 1.15 = 890.65
      expect(parsed.sewerageZAR).toBe(890.65);
      // Water: 2525.39 - 890.65 = 1634.74
      expect(parsed.waterZAR).toBe(1634.74);
      // Crucial: sum of water + sewerage MUST equal Johannesburg Water total (2,525.39)
      expect(parsed.waterZAR + parsed.sewerageZAR).toBe(2525.39);
      // Current charges
      expect(parsed.totalDueZAR).toBe(5481.80);
      expect(parsed.municipalValuationZAR).toBe(3180000);
      // Tenant utility recovery portion: water (1634.74) + sewerage (890.65) + refuse (583.05) = 3108.44
      const tenantUtilities = Math.round((parsed.waterZAR + parsed.sewerageZAR + parsed.refuseZAR + parsed.electricityZAR) * 100) / 100;
      expect(tenantUtilities).toBe(3108.44);

      // Meter Readings Extraction
      expect(parsed.extractedMeterReadings).toBeDefined();
      expect(parsed.extractedMeterReadings?.length).toBe(1);
      const waterMeter = parsed.extractedMeterReadings![0];
      expect(waterMeter.meterNumber).toBe('211001886');
      expect(waterMeter.utilityType).toBe('water');
      expect(waterMeter.readingValue).toBe(2083);
      expect(waterMeter.previousReadingValue).toBe(2053);
      expect(waterMeter.consumption).toBe(30);
      expect(waterMeter.readingType).toBe('Actual');
      expect(waterMeter.source).toBe('pdf-extracted');
    });

    it('auto-detects and extracts City of Johannesburg municipal bills via parseRentalPdfStatement', async () => {
      const result = await parseRentalPdfStatement(mockCojRawText);

      expect(result.success).toBe(true);
      expect(result.docType).toBe('municipal_utility');
      expect(result.provider).toBe('City of Johannesburg');
      expect(result.utilityStatement).toBeDefined();
      expect(result.utilityStatement?.propertyRatesZAR).toBe(774.86);
      expect(result.utilityStatement?.refuseZAR).toBe(353.05);
      expect(result.utilityStatement?.totalDueZAR).toBe(1127.91);
    });
  });

  describe('Eskom Regex Parser', () => {
    // Exact OCR text from user's uploaded Eskom bill
    const mockEskomRawText = `
ESKOM HOLDINGS SOC LTD REG NO 2002/015527/30
VAT REG NO 4740101508
CUSTOMER SELF SERVICE WEBSITE https://csonline.co.za
CENTRAL REGION PO BOX 8610 Johannesburg 2000
YOUR ACCOUNT NO 7270492027
SECURITY HELD 0.00
BILLING DATE 2026-06-19
TAX INVOICE NO 727602883143
ACCOUNT MONTH JUNE 2026
CURRENT DUE DATE 2026-07-14
DIRECT DEPOSIT DETAIL
BANK: First National Bank BRANCH CODE: 255005 BANK ACC NO: 62006191077
ACCOUNT NO / REFERENCE NO 7270492027
NAME MOROKA,KENOSI
CURRENT 0.00 TOTAL AMOUNT DUE 0.00
ACCOUNT SUMMARY FOR JUNE 2026
BALANCE BROUGHT FORWARD R -6,864.97
TOTAL CHARGES FOR BILLING PERIOD R 0.00
ADJUSTMENT REFUND ON CREDIT BALANCE R 6,864.97
    `;

    it('extracts Eskom account number, date, billing period, and electricity charges', () => {
      const parsed = parseEskomUtilityRegex(mockEskomRawText);

      expect(parsed.accountNumber).toBe('7270492027');
      expect(parsed.statementDate).toBe('2026-06-19');
      expect(parsed.billingPeriod).toBe('JUNE 2026');
      expect(parsed.provider).toBe('Eskom');
      expect(parsed.electricityZAR).toBe(0);
      expect(parsed.waterZAR).toBe(0);
      expect(parsed.refuseZAR).toBe(0);
      expect(parsed.sewerageZAR).toBe(0);
      expect(parsed.propertyRatesZAR).toBe(0);
      expect(parsed.totalDueZAR).toBe(0);
    });

    it('routes Eskom text through master parseUtilityWithRegex function', () => {
      const parsed = parseUtilityWithRegex(mockEskomRawText);
      expect(parsed.provider).toBe('Eskom');
      expect(parsed.accountNumber).toBe('7270492027');
      expect(parsed.totalDueZAR).toBe(0);
    });

    it('extracts Eskom electricity meter reading from tabular statement', () => {
      const mockEskomWithMeter = `
ESKOM HOLDINGS SOC LTD
YOUR ACCOUNT NO 7270492027
BILLING DATE 2026-02-26
ACCOUNT MONTH FEBRUARY 2026
TOTAL CHARGES FOR BILLING PERIOD R 450.00
READING TYPE: ACTUAL | READING DATES: 2026/02/17 - 2026/02/26 | NO OF DAYS: 9
METER NUMBER | PREV. READING | CURR. READING | DIFFERENCE | CONSTANT | CONSUMPTION
10003374     | 39302.0000    | 39504.0000    | 202.0000   | 1.0000   | 202.0000
      `;

      const parsed = parseEskomUtilityRegex(mockEskomWithMeter);
      expect(parsed.extractedMeterReadings).toBeDefined();
      expect(parsed.extractedMeterReadings?.length).toBe(1);
      const elecMeter = parsed.extractedMeterReadings![0];
      expect(elecMeter.meterNumber).toBe('10003374');
      expect(elecMeter.utilityType).toBe('electricity');
      expect(elecMeter.readingValue).toBe(39504);
      expect(elecMeter.previousReadingValue).toBe(39302);
      expect(elecMeter.consumption).toBe(202);
      expect(elecMeter.readingType).toBe('Actual');
      expect(elecMeter.source).toBe('pdf-extracted');
    });

    it('extracts Eskom property address and stand number from statement', () => {
      const mockEskomWithStand = `
ESKOM HOLDINGS SOC LTD
YOUR ACCOUNT NO 7270492027
BILLING DATE 2026-06-19
NAME MOROKA, KENOSI
STAND 000840, 100 7TH ST PARKMORE
CURRENT 250.00 TOTAL AMOUNT DUE 250.00
TOTAL CHARGES FOR BILLING PERIOD R 250.00
      `;

      const parsed = parseEskomUtilityRegex(mockEskomWithStand);
      expect(parsed.propertyName).toBe('100 7th St Parkmore');
      expect(parsed.propertyAddress).toBe('100 7th St Parkmore (Stand 000840)');
      expect(parsed.electricityZAR).toBe(250.00);
      expect(parsed.accountNumber).toBe('7270492027');
    });

    it('auto-detects and extracts Eskom bills with address via parseRentalPdfStatement', async () => {
      const mockEskomWithStand = `
ESKOM HOLDINGS SOC LTD
YOUR ACCOUNT NO 7270492027
BILLING DATE 2026-06-19
NAME MOROKA, KENOSI
STAND 000840, 100 7TH ST PARKMORE
CURRENT 250.00 TOTAL AMOUNT DUE 250.00
TOTAL CHARGES FOR BILLING PERIOD R 250.00
      `;

      const result = await parseRentalPdfStatement(mockEskomWithStand);

      expect(result.success).toBe(true);
      expect(result.docType).toBe('municipal_utility');
      expect(result.provider).toBe('Eskom');
      expect(result.utilityStatement?.accountNumber).toBe('7270492027');
      expect(result.utilityStatement?.propertyName).toBe('100 7th St Parkmore');
      expect(result.utilityStatement?.propertyAddress).toBe('100 7th St Parkmore (Stand 000840)');
    });

    it('correctly handles continuous inline stream OCR for Eskom without bleeding contact centre or charges into address', () => {
      const eskomSingleStream = `
ESKOM HOLDINGS SOC LTD
YOUR ACCOUNT NO 7270492027
BILLING DATE 2026-02-26
STAND 000840, 100 7TH ST PARKMORE Cont Act Cent Re: (0860) 037566shareca Fax No: 0862 437 566 E-mail: Gauteng@eskom.co.za Web: Www.eskom.co.za
TOTAL CHARGES FOR BILLING PERIOD R 705.85
      `;
      const parsed = parseEskomUtilityRegex(eskomSingleStream);
      expect(parsed.propertyName).toBe('100 7th St Parkmore');
      expect(parsed.propertyAddress).toBe('100 7th St Parkmore (Stand 000840)');
      expect(parsed.electricityZAR).toBe(705.85);
    });

    it('correctly extracts Eskom address when formatted as Stand 000840,100 7th St Parkmore Service And Admin Charge', () => {
      const eskomPremiseStream = `
ESKOM HOLDINGS SOC LTD
YOUR ACCOUNT NO 7270492027
BILLING DATE 2026-02-26
Premise Id Number 4406500000 Tariff Name: Homepower Standard Stand 000840,100 7th St Parkmore Service And Admin Charge @ R3.27 Per Day For 9 Days R 29.43
TOTAL CHARGES FOR BILLING PERIOD R 29.43
      `;
      const parsed = parseEskomUtilityRegex(eskomPremiseStream);
      expect(parsed.propertyName).toBe('100 7th St Parkmore');
      expect(parsed.propertyAddress).toBe('100 7th St Parkmore (Stand 000840)');
    });
  });

  describe('iGrow Rentals / WeconnectU Regex Parser', () => {
    // Exact OCR text from user's uploaded Clearwater Village 128 statement
    const mockIgrowRawText = `
IGrow Rentals 2014/186623/07 Powered by WeconnectU Page 1 of 3
OWNER STATEMENT
Clearwater Village 128
CREATED ON: 19 September 2026
Prabhat Gokul IGrow Rentals
128 Clearwater Village
Atlasville
Boksburg
Gauteng
1401
38 Oxford Street
Durbanville
Cape Town
Western Cape
7550
021 206 0850
10 AUGUST 2026 — 09 SEPTEMBER 2026
7 377.07
INCOME DUE
7 396.57
INCOME RECEIVED
1 871.54
EXPENSES INVOICED
1 871.54
EXPENSES PAID
PAID TO OWNER IN PERIOD 5 525.03
DUE BY TENANT
At the end of period — 09 September 2026
7 403.85
DUE BY OWNER
At the end of period — 09 September 2026
0.00
INCOME & EXPENSES SUMMARY
INCOME DUE 7 377.07
Body Corporate 477.07
Rent 6 900.00
INCOME RECEIVED 7 396.57
Rent 7 396.57
EXPENSES INVOICED 1 871.54
Commission - Rent 850.54
Municipal 1 021.00

--- Page 2 ---
EXPENSES PAID 1 871.54
Municipal 1 021.00
Commission - Rent 850.54
Net Operating Income ("income received" minus "expenses paid") 5 525.03
INCOME DUE VS. INCOME RECEIVED
Due by Tenant at the start of period 7 423.35
DATE DESCRIPTION VAT BILLED RECEIVED
01/09/2026 Water,Sewerage,Refuse & Common(2026-07-20 to 2026-08-19) 0.00 477.07
01/09/2026 Rent for September 2026 0.00 6 900.00
18/08/2026 Rent Received 7 396.57
7 377.07 7 396.57
Due by Tenant at the end of period 7 403.85
EXPENSES INVOICED VS. EXPENSES PAID
Due by Owner at the start of period 0.00
DATE REFERENCE DESCRIPTION VAT INVOICED PAID
18/08/2026 invoice Commission - rent 110.94 850.54
18/08/2026 Monthly Rates & Taxes 0.00 1 021.00
18/08/2026 Municipal 1 021.00
25/08/2026 Commission - Rent 850.54
1 871.54 1 871.54
Due by Owner at the end of period 0.00
OWNER INVOICES
DATE REFERENCE DESCRIPTION AMOUNT VAT TOTAL
18/08/2026 invoice Commission - rent 739.60 110.94 850.54
18/08/2026 Monthly Rates & Taxes 1 021.00 0.00 1 021.00
1 760.60 110.94 1 871.54

--- Page 3 ---
CURRENT POSITION SUMMARY
LEASE SUMMARY
Bongani June Mwale FIXED TERM
1 Jul '26 - 30 Jun '27 284 days to go
6 900.00
rent amount
6 965.17
deposit held
DUE BY OWNER
Account is up to date
TOTAL 0.00
IGROW RENTALS - BANK ACCOUNT
Account Name SA INVESTOR RENTALS (PTY) LTD
Bank First National Bank
Branch code / SWIFT 250655
Account number 63181912411
Payment reference IGRW11386
    `;

    it('extracts iGrow bundled utilities, rates, rent, commission, and deposit without meter readings', () => {
      const parsed = parseIgrowUtilityRegex(mockIgrowRawText);

      expect(parsed.provider).toBe('iGrow Rentals');
      expect(parsed.propertyName).toBe('Clearwater Village 128');
      expect(parsed.propertyAddress).toBe('128 Clearwater Village, Atlasville, Boksburg, Gauteng, 1401');
      expect(parsed.billingType).toBe('bundled');
      expect(parsed.bundledUtilitiesZAR).toBe(477.07);
      expect(parsed.propertyRatesZAR).toBe(1021.00);
      expect(parsed.totalDueZAR).toBe(1498.07); // 477.07 + 1021.00
      expect(parsed.statementDate).toBe('2026-09-19');
      expect(parsed.billingPeriod).toBe('10 AUGUST 2026 — 09 SEPTEMBER 2026');
      expect(parsed.accountNumber).toBe('IGRW11386');
      expect(parsed.tenantRentBilledZAR).toBe(6900.00);
      expect(parsed.tenantName).toBe('Bongani June Mwale');
      expect(parsed.depositHeldZAR).toBe(6965.17);
      expect(parsed.netDisbursementZAR).toBe(5525.03);
      expect(parsed.agencyCommissionZAR).toBe(850.54);
      expect(parsed.agencyCommissionVatZAR).toBe(110.94);
      expect(parsed.extractedMeterReadings).toBeUndefined();
    });

    it('routes iGrow statement via master parseUtilityWithRegex function', () => {
      const parsed = parseUtilityWithRegex(mockIgrowRawText);
      expect(parsed.provider).toBe('iGrow Rentals');
      expect(parsed.propertyName).toBe('Clearwater Village 128');
      expect(parsed.propertyAddress).toBe('128 Clearwater Village, Atlasville, Boksburg, Gauteng, 1401');
      expect(parsed.billingType).toBe('bundled');
      expect(parsed.bundledUtilitiesZAR).toBe(477.07);
      expect(parsed.agencyCommissionZAR).toBe(850.54);
    });

    it('validates bundled UtilityStatementSchema cross-check (bundled + rates = totalDue)', () => {
      const payload = {
        statementDate: '2026-09-19',
        billingPeriod: '10 Aug 2026 - 09 Sep 2026',
        provider: 'iGrow Rentals',
        billingType: 'bundled' as const,
        bundledUtilitiesZAR: 477.07,
        propertyRatesZAR: 1021.00,
        totalDueZAR: 1498.07,
        agencyCommissionZAR: 850.54,
        agencyCommissionVatZAR: 110.94,
      };

      expect(() => UtilityStatementSchema.parse(payload)).not.toThrow();
    });

    it('auto-detects and extracts iGrow managing agent statements as agent_payout via parseRentalPdfStatement', async () => {
      const result = await parseRentalPdfStatement(mockIgrowRawText);

      expect(result.success).toBe(true);
      expect(result.docType).toBe('agent_payout');
      expect(result.provider).toBe('iGrow Rentals');
      expect(result.agentUnit).toBeDefined();
      expect(result.agentUnit?.propertyName).toBe('Clearwater Village 128');
      expect(result.agentUnit?.propertyAddress).toBe('128 Clearwater Village, Atlasville, Boksburg, Gauteng, 1401');
      expect(result.agentUnit?.grossRentZAR).toBe(6900);
      expect(result.agentUnit?.municipalRatesZAR).toBe(1021.00);
      expect(result.agentUnit?.leviesZAR).toBe(477.07);
      expect(result.agentUnit?.agencyCommissionZAR).toBe(850.54);
      expect(result.agentUnit?.agencyCommissionVatZAR).toBe(110.94);
      expect(result.agentUnit?.isCommissionInclusiveOfVat).toBe(true);
      expect(result.agentUnit?.tenantName).toBe('Bongani June Mwale');
      expect(result.utilityStatement?.bundledUtilitiesZAR).toBe(477.07);
      expect(result.utilityStatement?.agencyCommissionZAR).toBe(850.54);
    });

    it('extracts iGrow property details from single-line flat stream OCR without newlines', () => {
      const flatIgrowRaw = `
IGrow Rentals 2014/186623/07 Powered by WeconnectU Page 1 of 3 OWNER STATEMENT Clearwater Village 128 CREATED ON: 19 September 2026 Prabhat Gokul IGrow Rentals 128 Clearwater Village Atlasville Boksburg Gauteng 1401 38 Oxford Street Durbanville Cape Town Western Cape 7550 021 206 0850 10 AUGUST 2026 — 09 SEPTEMBER 2026 LEASE SUMMARY Bongani June Mwale FIXED TERM 1 Jul '26 - 30 Jun '27 6 900.00 rent amount 6 965.17 deposit held Water,Sewerage,Refuse & Common 477.07 Monthly Rates & Taxes 1 021.00 Payment reference IGRW11386
      `;
      const parsed = parseIgrowUtilityRegex(flatIgrowRaw);
      expect(parsed.propertyName).toBe('Clearwater Village 128');
      expect(parsed.propertyAddress).toBe('128 Clearwater Village, Atlasville, Boksburg, Gauteng, 1401');
      expect(parsed.tenantName).toBe('Bongani June Mwale');
      expect(parsed.bundledUtilitiesZAR).toBe(477.07);
      expect(parsed.propertyRatesZAR).toBe(1021.00);
    });
  });
});
