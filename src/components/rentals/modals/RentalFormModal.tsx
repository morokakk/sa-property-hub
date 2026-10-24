'use client';

import React, { useState, useEffect } from 'react';
import {
  RentalProperty,
  PropertyTitleType,
  Lease,
  TenantDepartureReason,
  AncillaryIncome,
  Province,
} from '@/types';
import { formatZAR } from '@/lib/formatters';
import { Building2, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import { calculateAgencyCommission, reconcilePropertyStatus } from '@/lib/calculations/rentals';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { TenantVettingDrawer } from './TenantVettingDrawer';
import { LeaseInspectionDrawer } from './LeaseInspectionDrawer';
import InvestmentNodeSelect, { InvestmentNodeBanner } from '@/components/common/InvestmentNodeSelect';
import { getNodeComplianceProfile } from '@/lib/constants/investmentNodes';

const DEPARTURE_REASONS: TenantDepartureReason[] = [
  'Relocating / work transfer',
  'Lease expired / non-renewal',
  'Purchased own home',
  'Rent affordability / downsizing',
  'Upsizing / larger property',
  'Eviction / breach of lease',
  'Notice by landlord',
  'Other',
];

export interface RentalFormModalProps {
  isOpen: boolean;
  editingProperty: RentalProperty | null;
  onClose: () => void;
  onSave: (payload: Partial<RentalProperty>, isNew: boolean) => void;
  onOpenNoticeModal?: (property: RentalProperty, leaseId?: string) => void;
  // Controlled props for Phase 4A backward compatibility
  title?: string;
  setTitle?: (v: string) => void;
  address?: string;
  setAddress?: (v: string) => void;
  city?: string;
  setCity?: (v: string) => void;
  province?: Province;
  setProvince?: (v: Province) => void;
  propertyType?: PropertyTitleType;
  setPropertyType?: (v: PropertyTitleType) => void;
  agmDate?: string;
  setAgmDate?: (v: string) => void;
  marketValue?: number;
  setMarketValue?: (v: number) => void;
  purchasePrice?: number;
  setPurchasePrice?: (v: number) => void;
  bondBalance?: number;
  setBondBalance?: (v: number) => void;
  monthlyGrossRent?: number;
  setMonthlyGrossRent?: (v: number) => void;
  monthlyLevies?: number;
  setMonthlyLevies?: React.Dispatch<React.SetStateAction<number>>;
  annualBuildingInsurance?: number;
  setAnnualBuildingInsurance?: React.Dispatch<React.SetStateAction<number>>;
  monthlyRates?: number;
  setMonthlyRates?: (v: number) => void;
  monthlyBondPayment?: number;
  setMonthlyBondPayment?: (v: number) => void;
  extraMonthlyPayment?: number;
  setExtraMonthlyPayment?: (v: number) => void;
  bondPaymentEffectiveDate?: string;
  setBondPaymentEffectiveDate?: (v: string) => void;
  bondRevisionNote?: string;
  setBondRevisionNote?: (v: string) => void;
  unpaidUtilityArrears?: number;
  setUnpaidUtilityArrears?: (v: number) => void;
  managementType?: 'Self-Managed' | 'Agency';
  setManagementType?: (v: 'Self-Managed' | 'Agency') => void;
  agencyName?: string;
  setAgencyName?: (v: string) => void;
  agencyCommissionPercent?: number;
  setAgencyCommissionPercent?: (v: number) => void;
  agencyVatApplicable?: boolean;
  setAgencyVatApplicable?: (v: boolean) => void;
  agencyContact?: string;
  setAgencyContact?: (v: string) => void;
  formLeases?: Lease[];
  setFormLeases?: React.Dispatch<React.SetStateAction<Lease[]>>;
  utilityType?: 'postpaid' | 'prepaid_submeter' | 'hybrid';
  setUtilityType?: (v: 'postpaid' | 'prepaid_submeter' | 'hybrid') => void;
  prepaidVendorName?: string;
  setPrepaidVendorName?: (v: string) => void;
  monthlyPrepaidVendingFee?: number;
  setMonthlyPrepaidVendingFee?: (v: number) => void;
  monthlyCommunalServices?: number;
  setMonthlyCommunalServices?: (v: number) => void;
  taxEntityOverride?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  setTaxEntityOverride?: (v: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' | undefined) => void;
  formAncillaryIncomes?: AncillaryIncome[];
  setFormAncillaryIncomes?: React.Dispatch<React.SetStateAction<AncillaryIncome[]>>;
  rentalMasterFolderUrl?: string;
  setRentalMasterFolderUrl?: (v: string) => void;
  rentalOtpUrl?: string;
  setRentalOtpUrl?: (v: string) => void;
  rentalRatesBillUrl?: string;
  setRentalRatesBillUrl?: (v: string) => void;
  rentalTitleDeedUrl?: string;
  setRentalTitleDeedUrl?: (v: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const RentalFormModal: React.FC<RentalFormModalProps> = ({
  isOpen,
  editingProperty,
  onClose,
  onSave,
  onOpenNoticeModal,
  title: propTitle,
  setTitle: propSetTitle,
  address: propAddress,
  setAddress: propSetAddress,
  city: propCity,
  setCity: propSetCity,
  province: propProvince,
  setProvince: propSetProvince,
  propertyType: propPropertyType,
  setPropertyType: propSetPropertyType,
  agmDate: propAgmDate,
  setAgmDate: propSetAgmDate,
  marketValue: propMarketValue,
  setMarketValue: propSetMarketValue,
  purchasePrice: propPurchasePrice,
  setPurchasePrice: propSetPurchasePrice,
  bondBalance: propBondBalance,
  setBondBalance: propSetBondBalance,
  monthlyGrossRent: propMonthlyGrossRent,
  setMonthlyGrossRent: propSetMonthlyGrossRent,
  monthlyLevies: propMonthlyLevies,
  setMonthlyLevies: propSetMonthlyLevies,
  annualBuildingInsurance: propAnnualBuildingInsurance,
  setAnnualBuildingInsurance: propSetAnnualBuildingInsurance,
  monthlyRates: propMonthlyRates,
  setMonthlyRates: propSetMonthlyRates,
  monthlyBondPayment: propMonthlyBondPayment,
  setMonthlyBondPayment: propSetMonthlyBondPayment,
  extraMonthlyPayment: propExtraMonthlyPayment,
  setExtraMonthlyPayment: propSetExtraMonthlyPayment,
  bondPaymentEffectiveDate: propBondPaymentEffectiveDate,
  setBondPaymentEffectiveDate: propSetBondPaymentEffectiveDate,
  bondRevisionNote: propBondRevisionNote,
  setBondRevisionNote: propSetBondRevisionNote,
  unpaidUtilityArrears: propUnpaidUtilityArrears,
  setUnpaidUtilityArrears: propSetUnpaidUtilityArrears,
  managementType: propManagementType,
  setManagementType: propSetManagementType,
  agencyName: propAgencyName,
  setAgencyName: propSetAgencyName,
  agencyCommissionPercent: propAgencyCommissionPercent,
  setAgencyCommissionPercent: propSetAgencyCommissionPercent,
  agencyVatApplicable: propAgencyVatApplicable,
  setAgencyVatApplicable: propSetAgencyVatApplicable,
  agencyContact: propAgencyContact,
  setAgencyContact: propSetAgencyContact,
  formLeases: propFormLeases,
  setFormLeases: propSetFormLeases,
  utilityType: propUtilityType,
  setUtilityType: propSetUtilityType,
  prepaidVendorName: propPrepaidVendorName,
  setPrepaidVendorName: propSetPrepaidVendorName,
  monthlyPrepaidVendingFee: propMonthlyPrepaidVendingFee,
  setMonthlyPrepaidVendingFee: propSetMonthlyPrepaidVendingFee,
  monthlyCommunalServices: propMonthlyCommunalServices,
  setMonthlyCommunalServices: propSetMonthlyCommunalServices,
  taxEntityOverride: propTaxEntityOverride,
  setTaxEntityOverride: propSetTaxEntityOverride,
  formAncillaryIncomes: propFormAncillaryIncomes,
  setFormAncillaryIncomes: propSetFormAncillaryIncomes,
  rentalMasterFolderUrl: propRentalMasterFolderUrl,
  setRentalMasterFolderUrl: propSetRentalMasterFolderUrl,
  rentalOtpUrl: propRentalOtpUrl,
  setRentalOtpUrl: propSetRentalOtpUrl,
  rentalRatesBillUrl: propRentalRatesBillUrl,
  setRentalRatesBillUrl: propSetRentalRatesBillUrl,
  rentalTitleDeedUrl: propRentalTitleDeedUrl,
  setRentalTitleDeedUrl: propSetRentalTitleDeedUrl,
  onSubmit: propOnSubmit,
}) => {
  const investorProfile = usePortfolioStore((s) => s.investorProfile);

  // Fallback internal state if not controlled by props
  const [localTitle, setLocalTitle] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [localCity, setLocalCity] = useState('Johannesburg CBD & Maboneng');
  const [localProvince, setLocalProvince] = useState<Province>('Gauteng');
  const [localPropertyType, setLocalPropertyType] = useState<PropertyTitleType>('Sectional Title Apartment');
  const [localAgmDate, setLocalAgmDate] = useState('');
  const [localMarketValue, setLocalMarketValue] = useState(1800000);
  const [localPurchasePrice, setLocalPurchasePrice] = useState(1650000);
  const [localBondBalance, setLocalBondBalance] = useState(1100000);
  const [localMonthlyGrossRent, setLocalMonthlyGrossRent] = useState(15000);
  const [localMonthlyLevies, setLocalMonthlyLevies] = useState(1850);
  const [localAnnualBuildingInsurance, setLocalAnnualBuildingInsurance] = useState(0);
  const [localMonthlyRates, setLocalMonthlyRates] = useState(1100);
  const [localMonthlyBondPayment, setLocalMonthlyBondPayment] = useState(0);
  const [localExtraMonthlyPayment, setLocalExtraMonthlyPayment] = useState(0);
  const [localBondPaymentEffectiveDate, setLocalBondPaymentEffectiveDate] = useState('');
  const [localBondRevisionNote, setLocalBondRevisionNote] = useState('');
  const [localUnpaidUtilityArrears, setLocalUnpaidUtilityArrears] = useState(0);
  const [localRentalMasterFolderUrl, setLocalRentalMasterFolderUrl] = useState('');
  const [localRentalOtpUrl, setLocalRentalOtpUrl] = useState('');
  const [localRentalRatesBillUrl, setLocalRentalRatesBillUrl] = useState('');
  const [localRentalTitleDeedUrl, setLocalRentalTitleDeedUrl] = useState('');
  const [localManagementType, setLocalManagementType] = useState<'Self-Managed' | 'Agency'>('Agency');
  const [localAgencyName, setLocalAgencyName] = useState('Pam Golding Sandton');
  const [localAgencyCommissionPercent, setLocalAgencyCommissionPercent] = useState(8.0);
  const [localAgencyVatApplicable, setLocalAgencyVatApplicable] = useState(true);
  const [localAgencyContact, setLocalAgencyContact] = useState('+27 82 555 1234');
  const [localFormLeases, setLocalFormLeases] = useState<Lease[]>([]);
  const [localUtilityType, setLocalUtilityType] = useState<'postpaid' | 'prepaid_submeter' | 'hybrid'>('postpaid');
  const [localPrepaidVendorName, setLocalPrepaidVendorName] = useState('');
  const [localMonthlyPrepaidVendingFee, setLocalMonthlyPrepaidVendingFee] = useState(0);
  const [localMonthlyCommunalServices, setLocalMonthlyCommunalServices] = useState<number>(0);
  const [localTaxEntityOverride, setLocalTaxEntityOverride] = useState<'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' | undefined>(undefined);
  const [localFormAncillaryIncomes, setLocalFormAncillaryIncomes] = useState<AncillaryIncome[]>([]);
  const [expandedGuarantors, setExpandedGuarantors] = useState<Record<string, boolean>>({});
  const [isVaultExpanded, setIsVaultExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && propTitle === undefined) {
      if (editingProperty) {
        setLocalTitle(editingProperty.title);
        setLocalAddress(editingProperty.address);
        setLocalCity(editingProperty.city);
        setLocalProvince(editingProperty.province || 'Gauteng');
        setLocalPropertyType(editingProperty.propertyType);
        setLocalAgmDate(editingProperty.agmDate || '');
        setLocalMarketValue(editingProperty.marketValueZAR);
        setLocalPurchasePrice(editingProperty.purchasePriceZAR);
        setLocalBondBalance(editingProperty.outstandingBondBalanceZAR || 0);
        setLocalMonthlyGrossRent(editingProperty.monthlyGrossRentZAR);
        setLocalMonthlyLevies(editingProperty.monthlyLeviesZAR);
        setLocalAnnualBuildingInsurance(editingProperty.annualBuildingInsuranceZAR || 0);
        setLocalMonthlyRates(editingProperty.monthlyRatesTaxesZAR);
        setLocalMonthlyBondPayment(editingProperty.monthlyBondPaymentZAR || 0);
        setLocalExtraMonthlyPayment(editingProperty.extraMonthlyPaymentZAR || 0);
        setLocalBondPaymentEffectiveDate(editingProperty.bondPaymentEffectiveDate || '');
        setLocalBondRevisionNote(editingProperty.bondRevisionNote || '');
        setLocalUnpaidUtilityArrears(editingProperty.unpaidUtilityArrearsZAR || 0);
        setLocalRentalMasterFolderUrl(editingProperty.driveVault?.masterFolderUrl || '');
        setLocalRentalOtpUrl(editingProperty.driveVault?.otpDocumentUrl || '');
        setLocalRentalRatesBillUrl(editingProperty.driveVault?.ratesBillUrl || '');
        setLocalRentalTitleDeedUrl(editingProperty.driveVault?.titleDeedUrl || '');
        const hasInitialVaultDocs = Boolean(
          editingProperty.driveVault?.masterFolderUrl ||
          editingProperty.driveVault?.otpDocumentUrl ||
          editingProperty.driveVault?.ratesBillUrl ||
          editingProperty.driveVault?.titleDeedUrl
        );
        setIsVaultExpanded(hasInitialVaultDocs);
        setLocalManagementType(editingProperty.managementType || 'Self-Managed');
        setLocalAgencyName(editingProperty.agencyName || '');
        setLocalAgencyCommissionPercent(editingProperty.agencyCommissionPercent || 8.0);
        setLocalAgencyVatApplicable(editingProperty.agencyVatApplicable !== false);
        setLocalAgencyContact(editingProperty.agencyContact || '');
        setLocalFormLeases(editingProperty.leases?.map(l => ({ ...l })) || []);
        const initialGuarantors: Record<string, boolean> = {};
        editingProperty.leases?.forEach((l) => {
          if (l.guarantorName || l.guarantorContact || l.deedOfSuretyshipRef || l.vettingScorecard?.riskGrade === 'Grade C (High Risk)') {
            initialGuarantors[l.id] = true;
          }
        });
        setExpandedGuarantors(initialGuarantors);
        setLocalUtilityType(editingProperty.utilityType || 'postpaid');
        setLocalPrepaidVendorName(editingProperty.prepaidVendorName || '');
        setLocalMonthlyPrepaidVendingFee(editingProperty.monthlyPrepaidVendingFeeZAR || 0);
        setLocalMonthlyCommunalServices(editingProperty.monthlyCommunalServicesZAR || 0);
        setLocalTaxEntityOverride(editingProperty.taxEntityTypeOverride);
        setLocalFormAncillaryIncomes(editingProperty.ancillaryIncomes?.map(a => ({ ...a })) || []);
      } else {
        setLocalTitle('');
        setLocalAddress('');
        setLocalCity('Johannesburg CBD & Maboneng');
        setLocalProvince('Gauteng');
        setLocalPropertyType('Sectional Title Apartment');
        setLocalAgmDate('');
        setLocalMarketValue(1800000);
        setLocalPurchasePrice(1650000);
        setLocalBondBalance(1100000);
        setLocalMonthlyGrossRent(15000);
        setLocalMonthlyLevies(1850);
        setLocalAnnualBuildingInsurance(0);
        setLocalMonthlyRates(1100);
        setLocalMonthlyBondPayment(0);
        setLocalExtraMonthlyPayment(0);
        setLocalBondPaymentEffectiveDate('');
        setLocalBondRevisionNote('');
        setLocalUnpaidUtilityArrears(0);
        setLocalRentalMasterFolderUrl('');
        setLocalRentalOtpUrl('');
        setLocalRentalRatesBillUrl('');
        setLocalRentalTitleDeedUrl('');
        setIsVaultExpanded(false);
        setLocalManagementType('Agency');
        setLocalAgencyName('Pam Golding Sandton');
        setLocalAgencyCommissionPercent(8.0);
        setLocalAgencyVatApplicable(true);
        setLocalAgencyContact('+27 82 555 1234');
        setLocalFormLeases([{
          id: crypto.randomUUID(),
          unitName: 'Main Unit',
          tenantName: '',
          tenantPhone: '',
          tenantEmail: '',
          leaseStartDate: new Date().toISOString().split('T')[0],
          leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          monthlyRentZAR: 15000,
          depositHeldZAR: 30000,
          annualEscalationPercent: 7,
          status: 'Occupied',
        }]);
        setLocalUtilityType('postpaid');
        setLocalPrepaidVendorName('');
        setLocalMonthlyPrepaidVendingFee(0);
        setLocalMonthlyCommunalServices(0);
        setLocalTaxEntityOverride(undefined);
        setLocalFormAncillaryIncomes([]);
        setExpandedGuarantors({});
      }
    }
  }, [isOpen, editingProperty, propTitle]);

  const title = propTitle !== undefined ? propTitle : localTitle;
  const setTitle = propSetTitle || setLocalTitle;
  const address = propAddress !== undefined ? propAddress : localAddress;
  const setAddress = propSetAddress || setLocalAddress;
  const city = propCity !== undefined ? propCity : localCity;
  const setCity = propSetCity || setLocalCity;
  const province = propProvince !== undefined ? propProvince : localProvince;
  const setProvince = propSetProvince || setLocalProvince;
  const propertyType = propPropertyType !== undefined ? propPropertyType : localPropertyType;
  const setPropertyType = propSetPropertyType || setLocalPropertyType;
  const agmDate = propAgmDate !== undefined ? propAgmDate : localAgmDate;
  const setAgmDate = propSetAgmDate || setLocalAgmDate;
  const marketValue = propMarketValue !== undefined ? propMarketValue : localMarketValue;
  const setMarketValue = propSetMarketValue || setLocalMarketValue;
  const purchasePrice = propPurchasePrice !== undefined ? propPurchasePrice : localPurchasePrice;
  const setPurchasePrice = propSetPurchasePrice || setLocalPurchasePrice;
  const bondBalance = propBondBalance !== undefined ? propBondBalance : localBondBalance;
  const setBondBalance = propSetBondBalance || setLocalBondBalance;
  const monthlyGrossRent = propMonthlyGrossRent !== undefined ? propMonthlyGrossRent : localMonthlyGrossRent;
  const setMonthlyGrossRent = propSetMonthlyGrossRent || setLocalMonthlyGrossRent;
  const monthlyLevies = propMonthlyLevies !== undefined ? propMonthlyLevies : localMonthlyLevies;
  const setMonthlyLevies = propSetMonthlyLevies || setLocalMonthlyLevies;
  const annualBuildingInsurance = propAnnualBuildingInsurance !== undefined ? propAnnualBuildingInsurance : localAnnualBuildingInsurance;
  const setAnnualBuildingInsurance = propSetAnnualBuildingInsurance || setLocalAnnualBuildingInsurance;
  const monthlyRates = propMonthlyRates !== undefined ? propMonthlyRates : localMonthlyRates;
  const setMonthlyRates = propSetMonthlyRates || setLocalMonthlyRates;
  const monthlyBondPayment = propMonthlyBondPayment !== undefined ? propMonthlyBondPayment : localMonthlyBondPayment;
  const setMonthlyBondPayment = propSetMonthlyBondPayment || setLocalMonthlyBondPayment;
  const extraMonthlyPayment = propExtraMonthlyPayment !== undefined ? propExtraMonthlyPayment : localExtraMonthlyPayment;
  const setExtraMonthlyPayment = propSetExtraMonthlyPayment || setLocalExtraMonthlyPayment;
  const bondPaymentEffectiveDate = propBondPaymentEffectiveDate !== undefined ? propBondPaymentEffectiveDate : localBondPaymentEffectiveDate;
  const setBondPaymentEffectiveDate = propSetBondPaymentEffectiveDate || setLocalBondPaymentEffectiveDate;
  const bondRevisionNote = propBondRevisionNote !== undefined ? propBondRevisionNote : localBondRevisionNote;
  const setBondRevisionNote = propSetBondRevisionNote || setLocalBondRevisionNote;
  const unpaidUtilityArrears = propUnpaidUtilityArrears !== undefined ? propUnpaidUtilityArrears : localUnpaidUtilityArrears;
  const setUnpaidUtilityArrears = propSetUnpaidUtilityArrears || setLocalUnpaidUtilityArrears;
  const managementType = propManagementType !== undefined ? propManagementType : localManagementType;
  const setManagementType = propSetManagementType || setLocalManagementType;
  const agencyName = propAgencyName !== undefined ? propAgencyName : localAgencyName;
  const setAgencyName = propSetAgencyName || setLocalAgencyName;
  const agencyCommissionPercent = propAgencyCommissionPercent !== undefined ? propAgencyCommissionPercent : localAgencyCommissionPercent;
  const setAgencyCommissionPercent = propSetAgencyCommissionPercent || setLocalAgencyCommissionPercent;
  const agencyVatApplicable = propAgencyVatApplicable !== undefined ? propAgencyVatApplicable : localAgencyVatApplicable;
  const setAgencyVatApplicable = propSetAgencyVatApplicable || setLocalAgencyVatApplicable;
  const agencyContact = propAgencyContact !== undefined ? propAgencyContact : localAgencyContact;
  const setAgencyContact = propSetAgencyContact || setLocalAgencyContact;
  const formLeases = propFormLeases !== undefined ? propFormLeases : localFormLeases;
  const setFormLeases = propSetFormLeases || setLocalFormLeases;
  const utilityType = propUtilityType !== undefined ? propUtilityType : localUtilityType;
  const setUtilityType = propSetUtilityType || setLocalUtilityType;
  const prepaidVendorName = propPrepaidVendorName !== undefined ? propPrepaidVendorName : localPrepaidVendorName;
  const setPrepaidVendorName = propSetPrepaidVendorName || setLocalPrepaidVendorName;
  const monthlyPrepaidVendingFee = propMonthlyPrepaidVendingFee !== undefined ? propMonthlyPrepaidVendingFee : localMonthlyPrepaidVendingFee;
  const setMonthlyPrepaidVendingFee = propSetMonthlyPrepaidVendingFee || setLocalMonthlyPrepaidVendingFee;
  const monthlyCommunalServices = propMonthlyCommunalServices !== undefined ? propMonthlyCommunalServices : localMonthlyCommunalServices;
  const setMonthlyCommunalServices = propSetMonthlyCommunalServices || setLocalMonthlyCommunalServices;
  const taxEntityOverride = propTaxEntityOverride !== undefined ? propTaxEntityOverride : localTaxEntityOverride;
  const setTaxEntityOverride = propSetTaxEntityOverride || setLocalTaxEntityOverride;
  const formAncillaryIncomes = propFormAncillaryIncomes !== undefined ? propFormAncillaryIncomes : localFormAncillaryIncomes;
  const setFormAncillaryIncomes = propSetFormAncillaryIncomes || setLocalFormAncillaryIncomes;
  const rentalMasterFolderUrl = propRentalMasterFolderUrl !== undefined ? propRentalMasterFolderUrl : localRentalMasterFolderUrl;
  const setRentalMasterFolderUrl = propSetRentalMasterFolderUrl || setLocalRentalMasterFolderUrl;
  const rentalOtpUrl = propRentalOtpUrl !== undefined ? propRentalOtpUrl : localRentalOtpUrl;
  const setRentalOtpUrl = propSetRentalOtpUrl || setLocalRentalOtpUrl;
  const rentalRatesBillUrl = propRentalRatesBillUrl !== undefined ? propRentalRatesBillUrl : localRentalRatesBillUrl;
  const setRentalRatesBillUrl = propSetRentalRatesBillUrl || setLocalRentalRatesBillUrl;
  const rentalTitleDeedUrl = propRentalTitleDeedUrl !== undefined ? propRentalTitleDeedUrl : localRentalTitleDeedUrl;
  const setRentalTitleDeedUrl = propSetRentalTitleDeedUrl || setLocalRentalTitleDeedUrl;

  const activeUnits = formLeases.filter((l) => l.status !== 'Vacant');
  const activeLeaseRentSum = activeUnits.reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0);
  const isAutoSummedRent = formLeases.length > 0 && activeLeaseRentSum > 0;

  useEffect(() => {
    if (isOpen && isAutoSummedRent && monthlyGrossRent !== activeLeaseRentSum) {
      setMonthlyGrossRent(activeLeaseRentSum);
    }
  }, [isOpen, isAutoSummedRent, activeLeaseRentSum, monthlyGrossRent, setMonthlyGrossRent]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const attachedVaultLinksCount = [
    rentalMasterFolderUrl,
    rentalOtpUrl,
    rentalRatesBillUrl,
    rentalTitleDeedUrl,
  ].filter((url) => Boolean(url && url.trim())).length;

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }
    e.preventDefault();
    if (!title) return;

    const calcBond = bondBalance > 0 ? calculateMonthlyBondRepayment(bondBalance, 11.75, 20) : 0;
    const finalBondPayment = monthlyBondPayment > 0 ? monthlyBondPayment : calcBond;

    const computedGrossRent = formLeases
      .filter((l) => l.status !== 'Vacant')
      .reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0);
    const finalGrossRent = computedGrossRent > 0 ? computedGrossRent : monthlyGrossRent;

    const agentFee = managementType === 'Agency'
      ? calculateAgencyCommission(finalGrossRent, agencyCommissionPercent, agencyVatApplicable !== false, agencyName).monthlyAgentFeeZAR
      : 0;

    const finalLevies = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const finalInsurance = propertyType === 'Freehold House' ? annualBuildingInsurance : 0;
    const isScheme = propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster';
    const finalAgmDate = isScheme && agmDate ? agmDate : undefined;

    const finalLeases = formLeases.map((l) => ({
      ...l,
      tenantName: l.tenantName || 'Tenant Unassigned',
    }));

    const reconciledStatus = reconcilePropertyStatus(finalLeases);

    const commonFields: Partial<RentalProperty> = {
      title,
      address: address || `${city} Property`,
      city,
      province,
      status: reconciledStatus,
      cocChecklist: editingProperty?.cocChecklist || getNodeComplianceProfile(city, province).defaultCertificates,
      propertyType,
      agmDate: finalAgmDate,
      marketValueZAR: marketValue,
      purchasePriceZAR: purchasePrice,
      outstandingBondBalanceZAR: bondBalance,
      monthlyBondPaymentZAR: finalBondPayment,
      extraMonthlyPaymentZAR: extraMonthlyPayment > 0 ? extraMonthlyPayment : undefined,
      bondPaymentEffectiveDate: bondPaymentEffectiveDate.trim() || undefined,
      bondRevisionNote: bondRevisionNote.trim() || undefined,
      leases: finalLeases,
      unpaidUtilityArrearsZAR: unpaidUtilityArrears,
      monthlyGrossRentZAR: finalGrossRent,
      monthlyLeviesZAR: finalLevies,
      annualBuildingInsuranceZAR: finalInsurance,
      monthlyRatesTaxesZAR: monthlyRates,
      managementType,
      agencyName: managementType === 'Agency' ? agencyName : undefined,
      agencyCommissionPercent: managementType === 'Agency' ? agencyCommissionPercent : 0,
      agencyVatApplicable: managementType === 'Agency' ? agencyVatApplicable : false,
      agencyContact: managementType === 'Agency' ? agencyContact : undefined,
      monthlyAgentFeeZAR: agentFee,
      driveVault: {
        masterFolderUrl: rentalMasterFolderUrl.trim() || undefined,
        otpDocumentUrl: rentalOtpUrl.trim() || undefined,
        ratesBillUrl: rentalRatesBillUrl.trim() || undefined,
        titleDeedUrl: rentalTitleDeedUrl.trim() || undefined,
      },
      utilityType,
      prepaidVendorName: (utilityType === 'prepaid_submeter' || utilityType === 'hybrid') ? prepaidVendorName.trim() || undefined : undefined,
      monthlyPrepaidVendingFeeZAR: (utilityType === 'prepaid_submeter' || utilityType === 'hybrid') ? monthlyPrepaidVendingFee : undefined,
      monthlyCommunalServicesZAR: monthlyCommunalServices > 0 ? monthlyCommunalServices : undefined,
      taxEntityTypeOverride: taxEntityOverride,
      ancillaryIncomes: formAncillaryIncomes.length > 0 ? formAncillaryIncomes : undefined,
    };

    onSave(commonFields, !editingProperty);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg sm:max-w-2xl w-full shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Sticky Header */}
          <div className="shrink-0 sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{editingProperty ? 'Edit Rental Property & Agency Mandate' : 'Add Rental Property to Portfolio'}</span>
                </h3>
                {editingProperty && (
                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full shrink-0">
                    Editing Active Unit
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4-Pill Section Jump Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-medium text-slate-600 no-scrollbar">
              <button
                type="button"
                onClick={() => scrollToSection('rental-sec-identity')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                1. Identity & Mandate
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('rental-sec-valuation')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                2. Valuation & Bond
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('rental-sec-leases')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                3. Leases & Compliance
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('rental-sec-tax-vault')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                4. Tax & Vault
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1: Identity & Mandate */}
            <div id="rental-sec-identity" className="scroll-mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    name="rentalTitle"
                    autoComplete="off"
                    required
                    placeholder="e.g. Melrose Arch Luxury Loft"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <InvestmentNodeSelect
                    label="City / Region"
                    name="propertyCity"
                    value={city}
                    province={province}
                    onChange={(newCity, newProvince) => {
                      setCity(newCity);
                      setProvince(newProvince);
                    }}
                    showProfileBanner={false}
                    selectClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  name="propertyAddress"
                  autoComplete="off"
                  placeholder="e.g. 10 High Street, Melrose"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Selected Investment Node Profile & Regional Compliance Strip */}
              <InvestmentNodeBanner city={city} province={province} />

              {/* Property Title Type & Body Corporate AGM Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Property Title Type
                    </label>
                    <span className="text-[10px] text-slate-500">STSMA & Governance Classification</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'Sectional Title Apartment', label: '🏢 Sectional Title' },
                        { id: 'Freehold House', label: '🏡 Freehold House' },
                        { id: 'Townhouse / Cluster', label: '🏘️ Townhouse / Cluster' },
                        { id: 'Multi-unit Commercial', label: '🏬 Commercial' },
                      ] as const
                    ).map((pt) => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => {
                          setPropertyType(pt.id);
                          if (pt.id === 'Freehold House') {
                            setMonthlyLevies(0);
                            setAnnualBuildingInsurance((prev) => (prev > 0 ? prev : 7_200));
                          } else {
                            setAnnualBuildingInsurance(0);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all text-center border cursor-pointer ${
                          propertyType === pt.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster') && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        📅 Body Corporate AGM Date
                      </label>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        Auto-schedules reminder task 14 days prior
                      </span>
                    </div>
                    <input
                      type="date"
                      value={agmDate}
                      onChange={(e) => setAgmDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Property Management Mandate Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Property Management Mandate</span>
                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setManagementType('Self-Managed')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        managementType === 'Self-Managed'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👤 Self-Managed
                    </button>
                    <button
                      type="button"
                      onClick={() => setManagementType('Agency')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        managementType === 'Agency'
                          ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🏢 Agency Managed
                    </button>
                  </div>
                </div>

                {managementType === 'Agency' ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Managing Agency Name *</label>
                        <input
                          type="text"
                          required={managementType === 'Agency'}
                          placeholder="e.g. Pam Golding, RE/MAX, Seeff"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Agent Contact (Tel / WhatsApp)</label>
                        <input
                          type="text"
                          placeholder="e.g. +27 82 555 1234"
                          value={agencyContact}
                          onChange={(e) => setAgencyContact(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700">Commission Rate (%)</label>
                          <div className="flex gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setAgencyCommissionPercent(8.0)}
                              className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                                agencyCommissionPercent === 8.0 ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-slate-600'
                              }`}
                            >
                              8%
                            </button>
                            <button
                              type="button"
                              onClick={() => setAgencyCommissionPercent(10.0)}
                              className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                                agencyCommissionPercent === 10.0 ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-slate-600'
                              }`}
                            >
                              10%
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          name="agencyCommissionPercent"
                          autoComplete="off"
                          min="0"
                          max="30"
                          step="any"
                          value={agencyCommissionPercent}
                          onChange={(e) => setAgencyCommissionPercent(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={agencyVatApplicable}
                            onChange={(e) => setAgencyVatApplicable(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-slate-700 font-medium text-[11px]">
                            Subject to 15% SARS VAT (+15%)
                          </span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Standard SA estate agency mandate structure
                        </p>
                      </div>
                    </div>

                    {/* Commission Calculation Preview */}
                    <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-indigo-800 font-semibold block uppercase">Calculated Monthly Fee</span>
                        <span className="text-slate-600 text-[11px]">
                          {agencyCommissionPercent}% of {formatZAR(monthlyGrossRent)}
                          {agencyVatApplicable ? ' + 15% VAT (effective ' + (agencyCommissionPercent * 1.15).toFixed(2) + '%)' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-rose-600 font-bold text-sm block">
                          - {formatZAR(calculateAgencyCommission(monthlyGrossRent, agencyCommissionPercent, agencyVatApplicable, agencyName).monthlyAgentFeeZAR)}/m
                        </strong>
                        <span className="text-[10px] text-slate-500">Deducted from gross rent</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                    <span className="text-sm">💡</span>
                    <span><strong>Self-Managed Unit:</strong> Direct landlord administration. <strong>R 0</strong> agency commission deducted from cash flow.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Valuation & Bond */}
            <div id="rental-sec-valuation" className="scroll-mt-4 space-y-4">
              {/* Valuation 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block font-semibold text-slate-700 truncate">Market Value (ZAR)</label>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">
                      {formatZAR(marketValue, { compact: true })}
                    </span>
                  </div>
                  <input
                    type="number"
                    name="marketValueZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={marketValue}
                    onChange={(e) => setMarketValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">{formatZAR(marketValue)}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block font-semibold text-slate-700 truncate">Purchase Price (ZAR)</label>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">
                      {formatZAR(purchasePrice, { compact: true })}
                    </span>
                  </div>
                  <input
                    type="number"
                    name="purchasePriceZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">{formatZAR(purchasePrice)}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block font-semibold text-slate-700 truncate">Bond Balance (ZAR)</label>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">
                      {formatZAR(bondBalance, { compact: true })}
                    </span>
                  </div>
                  <input
                    type="number"
                    name="bondBalanceZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={bondBalance}
                    onChange={(e) => setBondBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">{formatZAR(bondBalance)}</span>
                </div>
              </div>

              {/* Rent, Levies/Insurance, Rates 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block font-semibold text-slate-700 truncate">Gross Monthly Rent (ZAR)</label>
                    {isAutoSummedRent && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                        Auto-summed from {activeUnits.length} unit{activeUnits.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    name="grossRentZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    readOnly={isAutoSummedRent}
                    value={monthlyGrossRent}
                    onChange={(e) => setMonthlyGrossRent(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg font-bold text-xs ${
                      isAutoSummedRent
                        ? 'bg-slate-100/80 border-slate-200 text-slate-700 cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">{formatZAR(monthlyGrossRent)} / month</span>
                </div>

                {propertyType === 'Freehold House' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="block font-semibold text-slate-700 truncate">Annual Building Insurance</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                        R {Math.round(annualBuildingInsurance / 12).toLocaleString()}/m
                      </span>
                    </div>
                    <input
                      type="number"
                      name="annualInsuranceZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={annualBuildingInsurance}
                      onChange={(e) => setAnnualBuildingInsurance(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Freehold homeowners structure cover</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="block font-semibold text-slate-700 truncate">Body Corporate Levies</label>
                      <span className="text-[10px] font-medium text-slate-500 shrink-0">{formatZAR(monthlyLevies)}/m</span>
                    </div>
                    <input
                      type="number"
                      name="monthlyLeviesZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={monthlyLevies}
                      onChange={(e) => setMonthlyLevies(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Sectional title body corporate levy</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="block font-semibold text-slate-700 truncate">Rates & Taxes</label>
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">{formatZAR(monthlyRates)}/m</span>
                  </div>
                  <input
                    type="number"
                    name="monthlyRatesZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={monthlyRates}
                    onChange={(e) => setMonthlyRates(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Municipal property assessment rates</span>
                </div>
              </div>

              {/* Communal / Serviced Services Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 text-xs">
                    Communal / Serviced Services (ZAR/mo)
                  </label>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                    -{formatZAR(monthlyCommunalServices)}/pm
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    name="monthlyCommunalServicesZAR"
                    autoComplete="off"
                    min="0"
                    step="50"
                    value={monthlyCommunalServices || ''}
                    onChange={(e) => setMonthlyCommunalServices(Number(e.target.value))}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  All-inclusive amenities: Uncapped Wi-Fi, communal cleaner, armed response, garden maintenance.
                </p>
              </div>

              {/* Bank Bond Repayment & Extra Paydown & Effective Month Inputs */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs truncate">
                      Bond Debit Order (ZAR/m)
                    </label>
                    <input
                      type="number"
                      name="monthlyBondPaymentZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={monthlyBondPayment || ''}
                      onChange={(e) => setMonthlyBondPayment(Number(e.target.value))}
                      placeholder="e.g. 11800"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-900 text-xs"
                    />
                    {bondBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonthlyBondPayment(calculateMonthlyBondRepayment(bondBalance, 11.75, 20))}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold cursor-pointer transition-colors"
                        title="Auto-calculate 20-year bond at 11.75%"
                      >
                        <span>⚡ Apply SARB Auto-PMT ({formatZAR(calculateMonthlyBondRepayment(bondBalance, 11.75, 20))}/m)</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1">Owner-paid direct debit order</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="block font-semibold text-slate-700 text-xs truncate">
                        Extra Principal Paydown
                      </label>
                      {extraMonthlyPayment > 0 && (
                        <span className="text-[9px] text-emerald-600 font-semibold shrink-0">Accelerated</span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="extraMonthlyPaymentZAR"
                      autoComplete="off"
                      min="0"
                      step="100"
                      value={extraMonthlyPayment || ''}
                      onChange={(e) => setExtraMonthlyPayment(Number(e.target.value))}
                      placeholder="e.g. 1500"
                      className="w-full px-2.5 py-1.5 border border-emerald-300 focus:border-emerald-500 rounded-lg bg-white font-bold text-slate-900 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Optional monthly capital paydown</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs truncate">
                      Bond Effective Month
                    </label>
                    <input
                      type="text"
                      name="bondPaymentEffectiveDate"
                      autoComplete="off"
                      placeholder="e.g. Apr 2026 or 2026-04"
                      value={bondPaymentEffectiveDate}
                      onChange={(e) => setBondPaymentEffectiveDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 text-xs font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Upcoming effective payment date</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Leases & Compliance */}
            <div id="rental-sec-leases" className="scroll-mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Lease Units ({formLeases.length})
                </span>
                <button
                  type="button"
                  onClick={() => setFormLeases((prev) => [...prev, {
                    id: crypto.randomUUID(),
                    unitName: `Unit ${prev.length + 1}`,
                    tenantName: '',
                    tenantPhone: '',
                    tenantEmail: '',
                    leaseStartDate: new Date().toISOString().split('T')[0],
                    leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    monthlyRentZAR: 0,
                    depositHeldZAR: 0,
                    annualEscalationPercent: 7,
                    status: 'Vacant',
                  }])}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 cursor-pointer transition-colors"
                >
                  + Add Unit
                </button>
              </div>

              {formLeases.map((lease, idx) => (
                <div key={lease.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      {lease.unitName || `Unit ${idx + 1}`}
                    </span>
                    {formLeases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormLeases((prev) => prev.filter((l) => l.id !== lease.id))}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Row 1: Unit Name, Classification, Occupancy Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Unit A"
                        value={lease.unitName}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, unitName: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit Classification</label>
                      <input
                        type="text"
                        list="room-type-suggestions"
                        placeholder="e.g. Executive Suite"
                        value={lease.roomType || ''}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, roomType: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Occupancy Status</label>
                      <select
                        value={lease.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as Lease['status'];
                          setFormLeases((prev) =>
                            prev.map((l) => {
                              if (l.id !== lease.id) return l;
                              if (nextStatus === 'Notice Given') {
                                const today = new Date().toISOString().split('T')[0];
                                const defaultVacation =
                                  l.leaseEndDate && l.leaseEndDate >= today
                                    ? l.leaseEndDate
                                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                        .toISOString()
                                        .split('T')[0];
                                return {
                                  ...l,
                                  status: nextStatus,
                                  noticeGivenDate: l.noticeGivenDate || today,
                                  vacationDate: l.vacationDate || defaultVacation,
                                  noticeReason: l.noticeReason || 'Relocating / work transfer',
                                };
                              }
                              return { ...l, status: nextStatus };
                            })
                          );
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-lg font-medium ${
                          lease.status === 'Notice Given'
                            ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      >
                        <option value="Occupied">Occupied</option>
                        <option value="Vacant">Vacant</option>
                        <option value="Notice Given">Notice Given</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Tenant Name, Phone, Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Tenant Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sipho Dlamini"
                        value={lease.tenantName}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, tenantName: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Phone (WhatsApp)</label>
                      <input
                        type="tel"
                        placeholder="+27 82 000 0000"
                        value={lease.tenantPhone || ''}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, tenantPhone: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Tenant Email</label>
                      <input
                        type="email"
                        placeholder="tenant@email.co.za"
                        value={lease.tenantEmail || ''}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, tenantEmail: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Row 3: Monthly Rent, Deposit, Escalation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Monthly Rent (ZAR)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={lease.monthlyRentZAR}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, monthlyRentZAR: Number(e.target.value) } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Deposit Held (ZAR)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={lease.depositHeldZAR}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, depositHeldZAR: Number(e.target.value) } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Annual Escalation %</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="any"
                        value={lease.annualEscalationPercent}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, annualEscalationPercent: Number(e.target.value) } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Row 4: Lease Start & End Dates (full 50% width) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lease Start Date</label>
                      <input
                        type="date"
                        value={lease.leaseStartDate}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, leaseStartDate: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Lease End Date</label>
                      <input
                        type="date"
                        value={lease.leaseEndDate}
                        onChange={(e) => setFormLeases((prev) => prev.map((l) => l.id === lease.id ? { ...l, leaseEndDate: e.target.value } : l))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Inline Notice Given & Move-Out Schedule Panel */}
                  {lease.status === 'Notice Given' && (
                    <div className="p-3 bg-amber-50/90 rounded-lg border border-amber-300 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Notice Given & Move-Out Schedule</span>
                        </div>
                        {onOpenNoticeModal && editingProperty && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenNoticeModal(editingProperty, lease.id);
                            }}
                            className="text-[10px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Open dedicated modal to log formal move-out or immediate replacement"
                          >
                            <span>Launch Full Notice / Move-Out Modal</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                            Notice Given Date
                          </label>
                          <input
                            type="date"
                            value={lease.noticeGivenDate || ''}
                            onChange={(e) =>
                              setFormLeases((prev) =>
                                prev.map((l) =>
                                  l.id === lease.id ? { ...l, noticeGivenDate: e.target.value } : l
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-[11px] border border-amber-300 rounded-lg bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                            Target Vacation Date
                          </label>
                          <input
                            type="date"
                            value={lease.vacationDate || ''}
                            onChange={(e) =>
                              setFormLeases((prev) =>
                                prev.map((l) =>
                                  l.id === lease.id ? { ...l, vacationDate: e.target.value } : l
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-[11px] border border-amber-300 rounded-lg bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                            Departure Reason
                          </label>
                          <select
                            value={lease.noticeReason || 'Relocating / work transfer'}
                            onChange={(e) =>
                              setFormLeases((prev) =>
                                prev.map((l) =>
                                  l.id === lease.id ? { ...l, noticeReason: e.target.value } : l
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-[11px] border border-amber-300 rounded-lg bg-white"
                          >
                            {DEPARTURE_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                          Move-Out Handover Notes / Key Return Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Exit inspection scheduled for 31 Oct, keys to be returned to concierge"
                          value={lease.noticeNotes || ''}
                          onChange={(e) =>
                            setFormLeases((prev) =>
                              prev.map((l) =>
                                l.id === lease.id ? { ...l, noticeNotes: e.target.value } : l
                              )
                            )
                          }
                          className="w-full px-2 py-1 text-[11px] border border-amber-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pre-Lease Tenant Vetting & PIE Act Risk Assessment Drawer */}
                  <TenantVettingDrawer
                    scorecard={lease.vettingScorecard}
                    monthlyRentZAR={lease.monthlyRentZAR}
                    onUpdateScorecard={(scorecard) => {
                      setFormLeases((prev) =>
                        prev.map((l) =>
                          l.id === lease.id ? { ...l, vettingScorecard: scorecard } : l
                        )
                      );
                      // Automatically uncollapse guarantor accordion if Grade C (High Risk)
                      if (scorecard.riskGrade === 'Grade C (High Risk)') {
                        setExpandedGuarantors((prev) => ({ ...prev, [lease.id]: true }));
                      }
                    }}
                    onApplyDeposit={(depositAmount) => {
                      setFormLeases((prev) =>
                        prev.map((l) =>
                          l.id === lease.id ? { ...l, depositHeldZAR: depositAmount } : l
                        )
                      );
                    }}
                  />

                  {/* 8-Point Ingoing Property Inspection Checklist (RHA Sec 5) */}
                  <LeaseInspectionDrawer
                    inspectionRecord={lease.inspectionRecord}
                    depositHeldZAR={lease.depositHeldZAR}
                    propertyTitle={title || 'Rental Property'}
                    unitName={lease.unitName || 'Main Unit'}
                    tenantName={lease.tenantName || 'Tenant'}
                    tenantPhone={lease.tenantPhone}
                    statementToken={lease.statementToken || lease.id}
                    onUpdateInspection={(record) => {
                      setFormLeases((prev) =>
                        prev.map((l) =>
                          l.id === lease.id ? { ...l, inspectionRecord: record } : l
                        )
                      );
                    }}
                  />

                  {/* Guarantor / Corporate Sponsor subsection (Collapsible Accordion) */}
                  {(() => {
                    const isGuarantorMandated =
                      lease.vettingScorecard?.riskGrade === 'Grade C (High Risk)';
                    const isGuarantorExpanded =
                      expandedGuarantors[lease.id] ??
                      Boolean(
                        lease.guarantorName ||
                          lease.guarantorContact ||
                          lease.deedOfSuretyshipRef ||
                          isGuarantorMandated
                      );

                    return (
                      <div
                        className={`rounded-lg border transition-all ${
                          isGuarantorMandated
                            ? 'bg-amber-50/40 border-amber-300'
                            : 'bg-slate-50/80 border-slate-200/80'
                        }`}
                      >
                        <div
                          onClick={() =>
                            setExpandedGuarantors((prev) => ({
                              ...prev,
                              [lease.id]: !isGuarantorExpanded,
                            }))
                          }
                          className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 rounded-t-lg transition-colors"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedGuarantors((prev) => ({
                                ...prev,
                                [lease.id]: !isGuarantorExpanded,
                              }));
                            }
                          }}
                          aria-expanded={isGuarantorExpanded}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                              <span>🛡️</span> Guarantor / Corporate Sponsor
                            </span>
                            {isGuarantorMandated && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Mandatory (Grade C Tenant)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="text-[9px]">
                              {isGuarantorMandated
                                ? 'Required under PIE Act underwriting'
                                : 'Optional third-party guarantee'}
                            </span>
                            {isGuarantorExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>

                        {isGuarantorExpanded && (
                          <div className="p-2 pt-1 border-t border-slate-200/60 space-y-2">
                            {isGuarantorMandated && (
                              <p className="text-[9px] text-amber-800 leading-tight">
                                ⚠️ <strong>PIE Act Risk Mitigation:</strong> Prospective tenant requires a legally bound guarantor and signed Deed of Suretyship to enforce rent recovery in the event of default.
                              </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-600 mb-0.5">
                                  Guarantor / Sponsoring Company {isGuarantorMandated && <span className="text-amber-600">*</span>}
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Parent Name or Employer Entity"
                                  value={lease.guarantorName || ''}
                                  onChange={(e) =>
                                    setFormLeases((prev) =>
                                      prev.map((l) =>
                                        l.id === lease.id ? { ...l, guarantorName: e.target.value } : l
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-600 mb-0.5">
                                  Guarantor Contact (Phone / Email) {isGuarantorMandated && <span className="text-amber-600">*</span>}
                                </label>
                                <input
                                  type="text"
                                  autoComplete="tel email"
                                  placeholder="e.g. +27 82 111 2233 or legal@corp.co.za"
                                  value={lease.guarantorContact || ''}
                                  onChange={(e) =>
                                    setFormLeases((prev) =>
                                      prev.map((l) =>
                                        l.id === lease.id ? { ...l, guarantorContact: e.target.value } : l
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-semibold text-slate-600 mb-0.5">
                                  Deed of Suretyship Reference {isGuarantorMandated && <span className="text-amber-600">*</span>}
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Suretyship Doc Vault URL or Ref #"
                                  value={lease.deedOfSuretyshipRef || ''}
                                  onChange={(e) =>
                                    setFormLeases((prev) =>
                                      prev.map((l) =>
                                        l.id === lease.id ? { ...l, deedOfSuretyshipRef: e.target.value } : l
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}

              <datalist id="room-type-suggestions">
                <option value="Executive Suite" />
                <option value="En-Suite Room" />
                <option value="Standard Room" />
                <option value="Shared Ablution" />
                <option value="Garden Cottage" />
              </datalist>
            </div>

            {/* Section 4: Tax & Vault */}
            <div id="rental-sec-tax-vault" className="scroll-mt-4 space-y-4">
              {/* Unified Utilities, Arrears & Tax Configuration Card */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Utilities, Arrears & Tax Configuration
                  </span>
                  <span className="text-[10px] text-slate-500">Municipal, Billing & Fiscal Profile</span>
                </div>

                {/* 3-Column Grid: Utility Type, Tax Entity, Tenant Utility Arrears */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  {/* 1. Utility Type */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Utility Type</label>
                    <select
                      value={utilityType}
                      onChange={(e) => setUtilityType(e.target.value as 'postpaid' | 'prepaid_submeter' | 'hybrid')}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    >
                      <option value="postpaid">Post-Paid Municipal</option>
                      <option value="prepaid_submeter">Prepaid Sub-Meter</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1">Water & electricity metering model</span>
                  </div>

                  {/* 2. Tax Entity Override */}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="block text-[10px] font-semibold text-slate-600 truncate">Tax Entity (Override)</label>
                    </div>
                    <select
                      value={taxEntityOverride || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaxEntityOverride(val === '' ? undefined : (val as 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax'));
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    >
                      <option value="">Default ({investorProfile?.defaultTaxEntityType || 'Company (27%)'})</option>
                      <option value="Company (27%)">Company (27%)</option>
                      <option value="Individual (45%)">Individual (45%)</option>
                      <option value="Pre-Tax">Pre-Tax</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1">SARS corporate vs individual rate</span>
                  </div>

                  {/* 3. Tenant Utility Arrears */}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="block text-[10px] font-semibold text-slate-600 truncate">
                        Tenant Utility Arrears
                      </label>
                      {unpaidUtilityArrears > 0 && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded border border-rose-300 shrink-0">
                          ⚠️ Risk
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">R</span>
                      <input
                        type="number"
                        name="unpaidUtilityArrearsZAR"
                        autoComplete="off"
                        min="0"
                        step="any"
                        value={unpaidUtilityArrears}
                        onChange={(e) => setUnpaidUtilityArrears(Math.max(0, Number(e.target.value)))}
                        className={`w-full pl-6 pr-2.5 py-1.5 border rounded-lg font-bold text-xs bg-white ${
                          unpaidUtilityArrears > 0
                            ? 'border-rose-300 text-rose-700 focus:ring-rose-400'
                            : 'border-slate-300 text-slate-800 focus:ring-emerald-400'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Deducts from net cashflow</span>
                      {unpaidUtilityArrears > 0 && (
                        <button
                          type="button"
                          onClick={() => setUnpaidUtilityArrears(0)}
                          className="text-[10px] text-slate-600 hover:text-emerald-700 font-medium underline cursor-pointer"
                        >
                          Clear to R 0
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conditional 2-Column Sub-row for Prepaid Submeter / Hybrid */}
                {(utilityType === 'prepaid_submeter' || utilityType === 'hybrid') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Prepaid Vendor Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Citiq, Recharger"
                        value={prepaidVendorName}
                        onChange={(e) => setPrepaidVendorName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Monthly Vending Fee (ZAR)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={monthlyPrepaidVendingFee}
                        onChange={(e) => setMonthlyPrepaidVendingFee(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* Unified Note */}
                <p className="text-[10px] text-slate-500 pt-1">
                  Municipal arrears remain attached to the title deed in South Africa. Tax entity overrides determine Section 11(a) provisioning against net income.
                </p>
              </div>

              {/* Ancillary Income Management */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Ancillary Income ({formAncillaryIncomes.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormAncillaryIncomes((prev) => [...prev, {
                      id: crypto.randomUUID(),
                      type: 'cell_tower',
                      tenantName: '',
                      monthlyRentZAR: 0,
                      annualEscalationPercent: 7,
                      contractStartDate: new Date().toISOString().split('T')[0],
                      contractEndDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      vatApplicable: false,
                    }])}
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded border border-teal-200 cursor-pointer transition-colors"
                  >
                    + Add Ancillary Income
                  </button>
                </div>

                {formAncillaryIncomes.map((ai, idx) => (
                  <div key={ai.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Ancillary #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFormAncillaryIncomes((prev) => prev.filter((a) => a.id !== ai.id))}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Type</label>
                        <select
                          value={ai.type}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, type: e.target.value as AncillaryIncome['type'] } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="cell_tower">Cell Tower</option>
                          <option value="billboard">Billboard</option>
                          <option value="parking">Parking</option>
                          <option value="storage">Storage</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tenant Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Vodacom, Primedia"
                          value={ai.tenantName}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, tenantName: e.target.value } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Monthly Rent (ZAR)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={ai.monthlyRentZAR}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, monthlyRentZAR: Number(e.target.value) } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Escalation %</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="any"
                          value={ai.annualEscalationPercent}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, annualEscalationPercent: Number(e.target.value) } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Contract Start</label>
                        <input
                          type="date"
                          value={ai.contractStartDate}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, contractStartDate: e.target.value } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Contract End</label>
                        <input
                          type="date"
                          value={ai.contractEndDate}
                          onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, contractEndDate: e.target.value } : a))}
                          className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={ai.vatApplicable}
                            onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, vatApplicable: e.target.checked } : a))}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-700 font-medium">15% VAT</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Notes (optional)</label>
                      <input
                        type="text"
                        placeholder="Additional details..."
                        value={ai.notes || ''}
                        onChange={(e) => setFormAncillaryIncomes((prev) => prev.map((a) => a.id === ai.id ? { ...a, notes: e.target.value || undefined } : a))}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Collapsible Cloud & Web Document Vault */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 transition-all">
                <div
                  onClick={() => setIsVaultExpanded(!isVaultExpanded)}
                  className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 rounded-t-lg transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsVaultExpanded(!isVaultExpanded);
                    }
                  }}
                  aria-expanded={isVaultExpanded}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span>☁️</span> Cloud & Web Document Vault
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                      {attachedVaultLinksCount}/4 Links Attached
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] text-slate-500 hidden sm:inline">OneDrive • GDrive • Dropbox</span>
                    {isVaultExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isVaultExpanded && (
                  <div className="p-3 pt-2 border-t border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deal Folder URL</label>
                        <input
                          type="url"
                          placeholder="https://1drv.ms/... or drive.google.com/..."
                          value={rentalMasterFolderUrl}
                          onChange={(e) => setRentalMasterFolderUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signed Lease / OTP PDF URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={rentalOtpUrl}
                          onChange={(e) => setRentalOtpUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rates & Levies Statement</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={rentalRatesBillUrl}
                          onChange={(e) => setRentalRatesBillUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title Deed / Sectional Plan</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={rentalTitleDeedUrl}
                          onChange={(e) => setRentalTitleDeedUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                Gross Rent: <strong className="text-emerald-700 font-bold">{formatZAR(monthlyGrossRent)}/m</strong> • Units: <strong className="text-slate-900 font-bold">{formLeases.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-xs text-xs"
              >
                {editingProperty ? 'Update Rental Property' : 'Save Rental Property'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalFormModal;
