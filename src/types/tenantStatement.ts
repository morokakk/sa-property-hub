import { UtilityStatement } from '@/types';

export interface PublicTenantStatementPayload {
  lease: {
    id: string;
    unitName: string;
    tenantName: string;
    tenantPhone?: string;
    tenantEmail?: string;
    leaseStartDate: string;
    leaseEndDate: string;
    monthlyRentZAR: number;
    depositHeldZAR: number;
    annualEscalationPercent?: number;
    status?: string;
  };
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    utility_type?: string | null;
    prepaid_vendor_name?: string | null;
  };
  landlord: {
    entity_name: string;
    trading_as?: string | null;
    contact_number?: string | null;
    email?: string | null;
    website?: string | null;
    physical_address?: string | null;
    logo_base64?: string | null;
  };
  utility_statements: UtilityStatement[];
}
