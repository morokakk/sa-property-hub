import { useState, useMemo, useCallback, useEffect } from 'react';
import { RentalProperty } from '@/types';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { calculateAggregateRentalKPIs } from '@/lib/calculations/rentals';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';
import { exportRentalsCSV } from '@/lib/export/csvExport';
import { exportITR12TaxReport } from '@/lib/export/excelExport';
import { formatZAR } from '@/lib/formatters';

export interface UseRentalPortfolioReturn {
  rentals: RentalProperty[];
  activeRentals: RentalProperty[];
  soldRentals: RentalProperty[];
  summary: {
    totalRentalValue: number;
    totalGrossMonthlyRent: number;
    monthlyNetRentalCashflow: number;
    totalBondLiabilities: number;
    annualRentalTaxReserve: number;
    monthlyRentalTaxReserve: number;
    liquidCapitalReserve: number;
  };
  investorProfile: any;
  viewTab: 'active' | 'archive';
  setViewTab: (tab: 'active' | 'archive') => void;
  forecastView: 'wealth-only' | 'cashflow-only';
  setForecastView: (mode: 'wealth-only' | 'cashflow-only') => void;
  feedbackToast: string | null;
  showToast: (msg: string) => void;
  handleExportCsv: () => void;
  handleExportItr12: (taxYear?: number) => void;
  handleDeleteProperty: (propertyId: string, title?: string) => void;
  handleReopenProperty: (propertyId: string, title?: string, proceedsToRevert?: number) => void;
  handleMarkMonthPaid: (propertyId: string, month: string, amountDue: number, leaseId?: string) => void;
  handleAddRental: (payload: Partial<RentalProperty>, isNew: boolean, editingPropertyId?: string) => void;
}

export function useRentalPortfolio(): UseRentalPortfolioReturn {
  const rentals = usePortfolioStore((state) => state.rentals);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const rentalForecastView = usePortfolioStore((state) => state.rentalForecastView);
  const setRentalForecastView = usePortfolioStore((state) => state.setRentalForecastView);
  const deleteRental = usePortfolioStore((state) => state.deleteRental);
  const reopenRental = usePortfolioStore((state) => state.reopenRental);
  const addRental = usePortfolioStore((state) => state.addRental);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const recordTenantPayment = usePortfolioStore((state) => state.recordTenantPayment);
  const summary = usePortfolioSummary();

  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');

  const activeRentals = useMemo(() => rentals.filter((r) => r.status !== 'Sold'), [rentals]);
  const soldRentals = useMemo(() => rentals.filter((r) => r.status === 'Sold'), [rentals]);
  const aggregateKPIs = useMemo(() => calculateAggregateRentalKPIs(rentals), [rentals]);

  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setFeedbackToast(msg);
  }, []);

  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  const handleExportCsv = useCallback(() => {
    exportRentalsCSV(activeRentals);
    showToast('Exported active rentals register as CSV');
  }, [activeRentals, showToast]);

  const handleExportItr12 = useCallback(
    (taxYear: number = 2026) => {
      exportITR12TaxReport(rentals, taxYear);
      showToast(`Exported SARS ITR12 tax schedule (${taxYear})`);
    },
    [rentals, showToast]
  );

  const handleDeleteProperty = useCallback(
    (propertyId: string, title?: string) => {
      deleteRental(propertyId);
      showToast(`Deleted ${title || 'property'}`);
    },
    [deleteRental, showToast]
  );

  const handleReopenProperty = useCallback(
    (propertyId: string, title?: string, _proceedsToRevert?: number) => {
      reopenRental(propertyId);
      setViewTab('active');
      showToast(`Reopened ${title || 'property'} back to active portfolio`);
    },
    [reopenRental, showToast]
  );

  const handleMarkMonthPaid = useCallback(
    (propertyId: string, month: string, amountDue: number, leaseId?: string) => {
      const prop = rentals.find((p) => p.id === propertyId);
      if (!prop) return;
      if (leaseId) {
        const lease = (prop.leases || []).find((l) => l.id === leaseId);
        recordTenantPayment(propertyId, {
          periodMonth: month,
          paymentDate: new Date().toISOString().split('T')[0],
          amountReceivedZAR: amountDue,
          paymentMethod: 'EFT',
          leaseId: lease?.id,
          reference: `${lease?.unitName || 'Rent'} Paid in Full`,
          notes: `Paid in full for ${month} (${lease?.tenantName || 'Tenant'})`,
        });
        showToast(`Marked ${lease?.unitName || 'unit'} as Paid in Full (${formatZAR(amountDue)})`);
      } else if ((prop.leases || []).length > 0) {
        let recordedCount = 0;
        prop.leases.forEach((l) => {
          const leaseArrears = calculatePropertyArrears(prop, undefined, { leaseId: l.id });
          if (leaseArrears.currentMonthDueZAR > 0) {
            recordTenantPayment(propertyId, {
              periodMonth: month,
              paymentDate: new Date().toISOString().split('T')[0],
              amountReceivedZAR: leaseArrears.currentMonthDueZAR,
              paymentMethod: 'EFT',
              leaseId: l.id,
              reference: `${l.unitName || 'Rent'} Paid in Full`,
              notes: `Paid in full for ${month} (${l.tenantName})`,
            });
            recordedCount++;
          }
        });
        showToast(`Marked ${recordedCount} lease(s) as Paid in Full (${formatZAR(amountDue)})`);
      } else {
        recordTenantPayment(propertyId, {
          periodMonth: month,
          paymentDate: new Date().toISOString().split('T')[0],
          amountReceivedZAR: amountDue,
          paymentMethod: 'EFT',
          reference: 'Full Rent & Utilities',
          notes: `Paid in full for ${month}`,
        });
        showToast(`Marked ${month} as Paid in Full (${formatZAR(amountDue)})`);
      }
    },
    [rentals, recordTenantPayment, showToast]
  );

  const handleAddRental = useCallback(
    (payload: Partial<RentalProperty>, isNew: boolean, editingPropertyId?: string) => {
      if (isNew) {
        const newUnit: RentalProperty = {
          id: payload.id || `rental-${Date.now()}`,
          title: payload.title || 'New Rental Property',
          address: payload.address || `${payload.city || 'Johannesburg'} Property`,
          city: payload.city || 'Johannesburg',
          propertyType: payload.propertyType || 'Sectional Title Apartment',
          source: payload.source,
          agmDate: payload.agmDate,
          marketValueZAR: payload.marketValueZAR ?? 0,
          purchasePriceZAR: payload.purchasePriceZAR ?? 0,
          purchaseDate: payload.purchaseDate || new Date().toISOString().split('T')[0],
          outstandingBondBalanceZAR: payload.outstandingBondBalanceZAR ?? 0,
          bondInterestRatePercent: payload.bondInterestRatePercent ?? 11.75,
          monthlyBondPaymentZAR: payload.monthlyBondPaymentZAR ?? 0,
          bondPaymentEffectiveDate: payload.bondPaymentEffectiveDate,
          bondRevisionNote: payload.bondRevisionNote,
          leases: payload.leases || [],
          managementType: payload.managementType,
          agencyName: payload.agencyName,
          agencyCommissionPercent: payload.agencyCommissionPercent,
          agencyVatApplicable: payload.agencyVatApplicable,
          agencyContact: payload.agencyContact,
          monthlyGrossRentZAR: payload.monthlyGrossRentZAR ?? 0,
          monthlyLeviesZAR: payload.monthlyLeviesZAR ?? 0,
          monthlyRatesTaxesZAR: payload.monthlyRatesTaxesZAR ?? 0,
          monthlyAgentFeeZAR: payload.monthlyAgentFeeZAR ?? 0,
          monthlyMaintenanceReserveZAR: payload.monthlyMaintenanceReserveZAR ?? 600,
          monthlyCommunalServicesZAR: payload.monthlyCommunalServicesZAR,
          annualBuildingInsuranceZAR: payload.annualBuildingInsuranceZAR,
          paymentRecords: payload.paymentRecords,
          arrearsWriteOffs: payload.arrearsWriteOffs,
          arrearsOpeningBalanceZAR: payload.arrearsOpeningBalanceZAR,
          unpaidUtilityArrearsZAR: payload.unpaidUtilityArrearsZAR,
          maintenanceHistory: payload.maintenanceHistory || [],
          status: payload.status || (payload.leases?.some((l) => l.status === 'Occupied') ? 'Occupied' : 'Vacant'),
          cocChecklist: payload.cocChecklist,
          driveVault: payload.driveVault,
          notes: payload.notes,
          taxEntityTypeOverride: payload.taxEntityTypeOverride,
          section13sexAnnualShieldZAR: payload.section13sexAnnualShieldZAR,
          utilityType: payload.utilityType,
          prepaidVendorName: payload.prepaidVendorName,
          monthlyPrepaidVendingFeeZAR: payload.monthlyPrepaidVendingFeeZAR,
          ancillaryIncomes: payload.ancillaryIncomes,
          meterRegistry: payload.meterRegistry,
          transactions: payload.transactions,
        };
        addRental(newUnit);
        showToast(`Added rental property "${newUnit.title}"`);
      } else if (editingPropertyId) {
        updateRental(editingPropertyId, payload);
        showToast('Updated rental property successfully');
      }
    },
    [addRental, updateRental, showToast]
  );

  return {
    rentals,
    activeRentals,
    soldRentals,
    summary: {
      totalRentalValue: summary.totalRentalValue,
      totalGrossMonthlyRent: aggregateKPIs.totalGrossMonthlyRentZAR,
      monthlyNetRentalCashflow: summary.monthlyNetRentalCashflow,
      totalBondLiabilities: summary.totalBondLiabilities,
      annualRentalTaxReserve: summary.annualRentalTaxReserve,
      monthlyRentalTaxReserve: summary.monthlyRentalTaxReserve,
      liquidCapitalReserve: summary.liquidCapitalReserve,
    },
    investorProfile,
    viewTab,
    setViewTab,
    forecastView: rentalForecastView,
    setForecastView: setRentalForecastView,
    feedbackToast,
    showToast,
    handleExportCsv,
    handleExportItr12,
    handleDeleteProperty,
    handleReopenProperty,
    handleMarkMonthPaid,
    handleAddRental,
  };
}

export default useRentalPortfolio;
