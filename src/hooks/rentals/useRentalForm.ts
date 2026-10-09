import { useState, useCallback, useEffect } from 'react';
import { RentalProperty } from '@/types';

export interface UseRentalFormReturn {
  formData: Partial<RentalProperty>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<RentalProperty>>>;
  errors: Record<string, string>;
  validate: () => boolean;
  resetForm: (initial?: RentalProperty | null) => void;
}

export const DEFAULT_RENTAL_FORM_VALUES: Partial<RentalProperty> = {
  title: '',
  address: '',
  city: 'Johannesburg',
  propertyType: 'Sectional Title Apartment',
  agmDate: '',
  marketValueZAR: 1800000,
  purchasePriceZAR: 1650000,
  outstandingBondBalanceZAR: 1100000,
  bondInterestRatePercent: 11.75,
  monthlyGrossRentZAR: 15000,
  monthlyLeviesZAR: 1850,
  annualBuildingInsuranceZAR: 0,
  monthlyRatesTaxesZAR: 1100,
  monthlyBondPaymentZAR: 0,
  bondPaymentEffectiveDate: '',
  bondRevisionNote: '',
  unpaidUtilityArrearsZAR: 0,
  managementType: 'Agency',
  agencyName: 'Pam Golding Sandton',
  agencyCommissionPercent: 8.0,
  agencyVatApplicable: true,
  agencyContact: '+27 82 555 1234',
  leases: [],
  utilityType: 'postpaid',
  prepaidVendorName: '',
  monthlyPrepaidVendingFeeZAR: 0,
  monthlyCommunalServicesZAR: 0,
  taxEntityTypeOverride: undefined,
  ancillaryIncomes: [],
  driveVault: {
    masterFolderUrl: '',
    otpDocumentUrl: '',
    ratesBillUrl: '',
    titleDeedUrl: '',
  },
};

function clonePropertyToForm(prop: RentalProperty): Partial<RentalProperty> {
  return {
    ...prop,
    leases: prop.leases ? prop.leases.map((l) => ({ ...l })) : [],
    ancillaryIncomes: prop.ancillaryIncomes ? prop.ancillaryIncomes.map((a) => ({ ...a })) : [],
    driveVault: prop.driveVault ? { ...prop.driveVault } : { masterFolderUrl: '', otpDocumentUrl: '', ratesBillUrl: '', titleDeedUrl: '' },
  };
}

export function useRentalForm(initialProperty?: RentalProperty | null): UseRentalFormReturn {
  const [formData, setFormData] = useState<Partial<RentalProperty>>(() => {
    if (initialProperty) {
      return clonePropertyToForm(initialProperty);
    }
    return { ...DEFAULT_RENTAL_FORM_VALUES };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProperty) {
      setFormData(clonePropertyToForm(initialProperty));
    } else {
      setFormData({ ...DEFAULT_RENTAL_FORM_VALUES });
    }
    setErrors({});
  }, [initialProperty]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Property title is required';
    }

    if (formData.marketValueZAR !== undefined && formData.marketValueZAR < 0) {
      newErrors.marketValueZAR = 'Market value cannot be negative';
    }

    if (formData.purchasePriceZAR !== undefined && formData.purchasePriceZAR < 0) {
      newErrors.purchasePriceZAR = 'Purchase price cannot be negative';
    }

    if (formData.monthlyGrossRentZAR !== undefined && formData.monthlyGrossRentZAR < 0) {
      newErrors.monthlyGrossRentZAR = 'Monthly rent cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback((initial?: RentalProperty | null) => {
    if (initial) {
      setFormData(clonePropertyToForm(initial));
    } else {
      setFormData({ ...DEFAULT_RENTAL_FORM_VALUES });
    }
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    errors,
    validate,
    resetForm,
  };
}
