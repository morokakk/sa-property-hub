import { useState, useCallback, useEffect } from 'react';

export interface UseBrrrrConvertFormReturn {
  marketValuation: number;
  setMarketValuation: (v: number) => void;
  grossRent: number;
  setGrossRent: (v: number) => void;
  tenantName: string;
  setTenantName: (v: string) => void;
  tenantPhone: string;
  setTenantPhone: (v: string) => void;
  tenantEmail: string;
  setTenantEmail: (v: string) => void;
  managementType: 'Agency' | 'Self-Managed';
  setManagementType: (v: 'Agency' | 'Self-Managed') => void;
  agencyName: string;
  setAgencyName: (v: string) => void;
  agencyCommission: number;
  setAgencyCommission: (v: number) => void;
  notes: string;
  setNotes: (v: string) => void;
  resetForm: (defaultValuation?: number, defaultRent?: number) => void;
}

export function useBrrrrConvertForm(
  defaultValuation: number = 0,
  defaultRent: number = 18000
): UseBrrrrConvertFormReturn {
  const [marketValuation, setMarketValuation] = useState<number>(defaultValuation);
  const [grossRent, setGrossRent] = useState<number>(defaultRent);
  const [tenantName, setTenantName] = useState('Tenant Pending Placement');
  const [tenantPhone, setTenantPhone] = useState('+27 —');
  const [tenantEmail, setTenantEmail] = useState('pending@tenant.co.za');
  const [managementType, setManagementType] = useState<'Agency' | 'Self-Managed'>('Agency');
  const [agencyName, setAgencyName] = useState('Pam Golding Rentals');
  const [agencyCommission, setAgencyCommission] = useState<number>(8.0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (defaultValuation) {
      setMarketValuation(defaultValuation);
    }
    if (defaultRent) {
      setGrossRent(defaultRent);
    }
  }, [defaultValuation, defaultRent]);

  const resetForm = useCallback((val: number = defaultValuation, rent: number = defaultRent) => {
    setMarketValuation(val);
    setGrossRent(rent);
    setTenantName('Tenant Pending Placement');
    setTenantPhone('+27 —');
    setTenantEmail('pending@tenant.co.za');
    setManagementType('Agency');
    setAgencyName('Pam Golding Rentals');
    setAgencyCommission(8.0);
    setNotes('');
  }, [defaultValuation, defaultRent]);

  return {
    marketValuation,
    setMarketValuation,
    grossRent,
    setGrossRent,
    tenantName,
    setTenantName,
    tenantPhone,
    setTenantPhone,
    tenantEmail,
    setTenantEmail,
    managementType,
    setManagementType,
    agencyName,
    setAgencyName,
    agencyCommission,
    setAgencyCommission,
    notes,
    setNotes,
    resetForm,
  };
}
