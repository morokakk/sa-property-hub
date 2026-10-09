import { useState, useCallback, useEffect } from 'react';
import { FlipProject } from '@/types';

export interface UseFlipFormReturn {
  formData: Partial<FlipProject>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<FlipProject>>>;
  editingFlipId: string | null;
  setEditingFlipId: (id: string | null) => void;
  errors: Record<string, string>;
  validate: () => boolean;
  resetForm: (initial?: FlipProject | null) => void;
  openAdd: () => void;
  openEdit: (flip: FlipProject) => void;
}

export const DEFAULT_FLIP_FORM_VALUES: Partial<FlipProject> = {
  title: '',
  address: '',
  city: 'Cape Town',
  propertyType: 'Freehold House',
  agmDate: '',
  purchasePriceZAR: 2500000,
  acquisitionCostsZAR: 185000,
  baselineRenovationBudgetZAR: 450000,
  estimatedDurationMonths: 6,
  monthlyHoldingCostZAR: 15000,
  monthlyBondPaymentZAR: 9500,
  monthlyLeviesZAR: 0,
  monthlyRatesTaxesZAR: 3500,
  monthlyOtherHoldingCostZAR: 2000,
  targetExitPriceZAR: 3800000,
  exitCommissionPercent: 5.75,
  targetCompletionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  taxEntityType: 'Company (27%)',
  municipalClearance: {
    sec118ArrearsZAR: 0,
    advanceCouncilDepositZAR: 0,
    rccStatus: 'Pending Application',
    rccApplicationDate: '',
    disputeNotes: '',
  },
  driveVault: {
    masterFolderUrl: '',
    otpDocumentUrl: '',
    ratesBillUrl: '',
    titleDeedUrl: '',
  },
};

function cloneFlipToForm(flip: FlipProject): Partial<FlipProject> {
  return {
    ...flip,
    municipalClearance: flip.municipalClearance
      ? {
          sec118ArrearsZAR: flip.municipalClearance.sec118ArrearsZAR ?? 0,
          advanceCouncilDepositZAR: flip.municipalClearance.advanceCouncilDepositZAR ?? 0,
          rccStatus: flip.municipalClearance.rccStatus || 'Pending Application',
          rccApplicationDate: flip.municipalClearance.rccApplicationDate || '',
          disputeNotes: flip.municipalClearance.disputeNotes || '',
        }
      : {
          sec118ArrearsZAR: 0,
          advanceCouncilDepositZAR: 0,
          rccStatus: 'Pending Application',
          rccApplicationDate: '',
          disputeNotes: '',
        },
    driveVault: flip.driveVault
      ? { ...flip.driveVault }
      : { masterFolderUrl: '', otpDocumentUrl: '', ratesBillUrl: '', titleDeedUrl: '' },
  };
}

export function useFlipForm(initialFlip?: FlipProject | null): UseFlipFormReturn {
  const [editingFlipId, setEditingFlipId] = useState<string | null>(initialFlip?.id || null);
  const [formData, setFormData] = useState<Partial<FlipProject>>(() => {
    if (initialFlip) {
      return cloneFlipToForm(initialFlip);
    }
    return { ...DEFAULT_FLIP_FORM_VALUES };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialFlip) {
      setEditingFlipId(initialFlip.id);
      setFormData(cloneFlipToForm(initialFlip));
    } else {
      setEditingFlipId(null);
      setFormData({ ...DEFAULT_FLIP_FORM_VALUES });
    }
    setErrors({});
  }, [initialFlip]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Project title is required';
    }

    if (formData.purchasePriceZAR !== undefined && formData.purchasePriceZAR < 0) {
      newErrors.purchasePriceZAR = 'Purchase price cannot be negative';
    }

    if (formData.baselineRenovationBudgetZAR !== undefined && formData.baselineRenovationBudgetZAR < 0) {
      newErrors.baselineRenovationBudgetZAR = 'Renovation budget cannot be negative';
    }

    if (formData.targetExitPriceZAR !== undefined && formData.targetExitPriceZAR < 0) {
      newErrors.targetExitPriceZAR = 'Target exit price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback((initial?: FlipProject | null) => {
    if (initial) {
      setEditingFlipId(initial.id);
      setFormData(cloneFlipToForm(initial));
    } else {
      setEditingFlipId(null);
      setFormData({ ...DEFAULT_FLIP_FORM_VALUES });
    }
    setErrors({});
  }, []);

  const openAdd = useCallback(() => {
    setEditingFlipId(null);
    setFormData({ ...DEFAULT_FLIP_FORM_VALUES });
    setErrors({});
  }, []);

  const openEdit = useCallback((flip: FlipProject) => {
    setEditingFlipId(flip.id);
    setFormData(cloneFlipToForm(flip));
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    editingFlipId,
    setEditingFlipId,
    errors,
    validate,
    resetForm,
    openAdd,
    openEdit,
  };
}
