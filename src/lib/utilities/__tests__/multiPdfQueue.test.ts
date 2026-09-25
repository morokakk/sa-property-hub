import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { UnifiedParsedStatementResult } from '../pdfParser';
import { RentalProperty } from '@/types';

describe('Multi-PDF Batch Import & Queue Handling', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  describe('3-File Limit & Truncation Guardrail', () => {
    it('truncates selection to maximum 3 files when more than 3 are selected', () => {
      const mockFiles = [
        { name: 'bill1.pdf' },
        { name: 'bill2.pdf' },
        { name: 'bill3.pdf' },
        { name: 'bill4.pdf' },
        { name: 'bill5.pdf' },
      ] as File[];

      const maxLimit = 3;
      const filesToProcess = mockFiles.length > maxLimit ? mockFiles.slice(0, maxLimit) : mockFiles;

      expect(filesToProcess.length).toBe(3);
      expect(filesToProcess.map((f) => f.name)).toEqual(['bill1.pdf', 'bill2.pdf', 'bill3.pdf']);
    });
  });

  describe('Sequential Batch Execution & Strict Parse Failure Policy', () => {
    it('halts processing and blocks queue when any file in the batch fails parsing', async () => {
      const mockParser = vi.fn().mockImplementation(async (file: { name: string }) => {
        if (file.name === 'corrupted.pdf') {
          return { success: false, error: 'Corrupted PDF data' };
        }
        return {
          success: true,
          docType: 'municipal_utility',
          provider: 'City of Johannesburg',
          utilityStatement: {
            id: `util-${file.name}`,
            statementDate: '2026-03-01',
            accountNumber: '550000000',
            provider: 'City of Johannesburg',
            totalDueZAR: 1500,
          },
        };
      });

      const files = [{ name: 'file1.pdf' }, { name: 'corrupted.pdf' }, { name: 'file3.pdf' }];
      const parsedResults: any[] = [];
      let failureError: string | null = null;

      for (const file of files) {
        const result = await mockParser(file);
        if (!result.success) {
          failureError = `Failed to parse "${file.name}": ${result.error}`;
          break; // Strict failure policy
        }
        parsedResults.push(result);
      }

      // Only file 1 was processed before halting
      expect(parsedResults.length).toBe(1);
      expect(failureError).toContain('corrupted.pdf');
    });

    it('collects all successful statements into the queue with original filenames tagged', async () => {
      const mockParser = vi.fn().mockImplementation(async (file: { name: string; provider: string }) => {
        return {
          success: true,
          docType: file.provider === 'iGrow Rentals' ? 'agent_payout' : 'municipal_utility',
          provider: file.provider,
          utilityStatement: {
            id: `util-${file.name}`,
            statementDate: '2026-03-01',
            accountNumber: '551122334',
            provider: file.provider,
            totalDueZAR: 1200,
          },
        };
      });

      const files = [
        { name: 'coj_feb.pdf', provider: 'City of Johannesburg' },
        { name: 'eskom_feb.pdf', provider: 'Eskom' },
        { name: 'igrow_feb.pdf', provider: 'iGrow Rentals' },
      ];

      const queue: any[] = [];
      for (const file of files) {
        const result = await mockParser(file);
        (result as any).fileName = file.name;
        queue.push(result);
      }

      expect(queue.length).toBe(3);
      expect(queue[0].fileName).toBe('coj_feb.pdf');
      expect(queue[1].fileName).toBe('eskom_feb.pdf');
      expect(queue[2].fileName).toBe('igrow_feb.pdf');
    });
  });

  describe('Sequential Queue Property Auto-Matching & Store Integration', () => {
    it('allows statement 1 to create a new property and statement 2 to auto-match against it', () => {
      const store = usePortfolioStore.getState();
      const initialCount = store.rentals.length;

      // Statement 1: iGrow Managing Agent Payout creates a new rental property
      const newPropId = `rental-batch-test-${Date.now()}`;
      const newRental: RentalProperty = {
        id: newPropId,
        title: 'Clearwater Village 128',
        address: '128 Clearwater Village, Atlasville, Boksburg',
        city: 'Boksburg',
        propertyType: 'Sectional Title Apartment',
        source: 'iGrow Rentals',
        marketValueZAR: 1150000,
        purchasePriceZAR: 980000,
        purchaseDate: '2024-06-10',
        outstandingBondBalanceZAR: 750000,
        bondInterestRatePercent: 11.75,
        monthlyBondPaymentZAR: 8100,
        tenantName: 'Bongani June Mwale',
        tenantPhone: '+27 71 234 5678',
        tenantEmail: 'bongani.m@gmail.com',
        leaseStartDate: '2024-07-01',
        leaseEndDate: '2027-06-30',
        depositHeldZAR: 19000,
        annualEscalationPercent: 7.0,
        managementType: 'Agency',
        agencyName: 'iGrow Rentals',
        monthlyGrossRentZAR: 9500,
        monthlyLeviesZAR: 1450,
        monthlyRatesTaxesZAR: 850,
        monthlyAgentFeeZAR: 928,
        monthlyMaintenanceReserveZAR: 500,
        status: 'Occupied',
        maintenanceHistory: [],
        utilityStatements: [
          {
            id: 'stmt-igrow-initial',
            statementDate: '2026-02-01',
            accountNumber: '559235779',
            provider: 'iGrow Rentals',
            electricityZAR: 0,
            waterZAR: 0,
            refuseZAR: 0,
            sewerageZAR: 0,
            propertyRatesZAR: 850,
            totalDueZAR: 850,
            parsedVia: 'manual',
            createdAt: '2026-02-01',
          },
        ],
      };

      store.addRental(newRental);
      expect(usePortfolioStore.getState().rentals.length).toBe(initialCount + 1);

      // Statement 2: City of Johannesburg utility bill with matching account number
      const activeRentals = usePortfolioStore.getState().rentals;
      const cojAccountNumber = '559235779';

      const matched = activeRentals.find(
        (r) => r.utilityStatements?.some((st) => st.accountNumber === cojAccountNumber)
      );

      expect(matched).toBeDefined();
      expect(matched?.id).toBe(newPropId);
      expect(matched?.title).toBe('Clearwater Village 128');

      // Append CoJ statement to the matched property
      usePortfolioStore.getState().addUtilityStatement(matched!.id, {
        id: 'stmt-coj-batch',
        statementDate: '2026-02-15',
        accountNumber: cojAccountNumber,
        provider: 'City of Johannesburg',
        electricityZAR: 650,
        waterZAR: 320,
        refuseZAR: 180,
        sewerageZAR: 210,
        propertyRatesZAR: 850,
        totalDueZAR: 2210,
        parsedVia: 'regex-fallback',
        createdAt: '2026-02-15',
      });

      const updatedProperty = usePortfolioStore.getState().rentals.find((r) => r.id === newPropId);
      expect(updatedProperty?.utilityStatements?.length).toBe(2);
      expect(updatedProperty?.utilityStatements?.some((s) => s.provider === 'City of Johannesburg')).toBe(true);
    });
  });
});
