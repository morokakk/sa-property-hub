import { useState, useCallback } from 'react';
import { BOQItem } from '@/types';

export interface UseBoqFormReturn {
  formData: Partial<BOQItem>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<BOQItem>>>;
  isSponsored: boolean;
  setIsSponsored: (v: boolean) => void;
  resetForm: () => void;
  // Field accessors for direct modal binding
  category: BOQItem['category'];
  setCategory: (cat: BOQItem['category']) => void;
  status: BOQItem['status'];
  setStatus: (st: BOQItem['status']) => void;
  description: string;
  setDescription: (desc: string) => void;
  unit: string;
  setUnit: (u: string) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  baselineUnitCost: number;
  setBaselineUnitCost: (cost: number) => void;
  milestonePhase: NonNullable<BOQItem['milestonePhase']>;
  setMilestonePhase: (phase: NonNullable<BOQItem['milestonePhase']>) => void;
  retentionPercent: number;
  setRetentionPercent: (ret: number) => void;
  commercialRetailValue: number;
  setCommercialRetailValue: (val: number) => void;
  actualCashOutflow: number;
  setActualCashOutflow: (val: number) => void;
  actualCost: number;
  setActualCost: (cost: number) => void;
  supplier: string;
  setSupplier: (sup: string) => void;
}

export const DEFAULT_BOQ_ITEM_VALUES: Partial<BOQItem> = {
  category: 'Flooring & Tiling',
  itemDescription: '',
  unit: 'lump sum',
  quantity: 1,
  baselineUnitCostZAR: 25000,
  actualCostZAR: 0,
  supplierOrContractor: 'Builders Warehouse Sandton',
  status: 'Quoted',
  milestonePhase: 'First Fix / Wet Works',
  retentionPercent: 0,
  isSponsoredOrBarter: false,
  commercialRetailValueZAR: 0,
  actualCashOutflowZAR: 0,
};

export function useBoqForm(): UseBoqFormReturn {
  const [formData, setFormData] = useState<Partial<BOQItem>>({ ...DEFAULT_BOQ_ITEM_VALUES });
  const [isSponsored, setIsSponsoredState] = useState<boolean>(false);

  const setIsSponsored = useCallback((v: boolean) => {
    setIsSponsoredState(v);
    setFormData((prev) => ({
      ...prev,
      isSponsoredOrBarter: v,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_BOQ_ITEM_VALUES });
    setIsSponsoredState(false);
  }, []);

  const setCategory = useCallback((cat: BOQItem['category']) => {
    setFormData((prev) => ({ ...prev, category: cat }));
  }, []);

  const setStatus = useCallback((st: BOQItem['status']) => {
    setFormData((prev) => ({ ...prev, status: st }));
  }, []);

  const setDescription = useCallback((desc: string) => {
    setFormData((prev) => ({ ...prev, itemDescription: desc }));
  }, []);

  const setUnit = useCallback((u: string) => {
    setFormData((prev) => ({ ...prev, unit: u }));
  }, []);

  const setQuantity = useCallback((q: number) => {
    setFormData((prev) => ({ ...prev, quantity: q }));
  }, []);

  const setBaselineUnitCost = useCallback((cost: number) => {
    setFormData((prev) => ({ ...prev, baselineUnitCostZAR: cost }));
  }, []);

  const setMilestonePhase = useCallback((phase: NonNullable<BOQItem['milestonePhase']>) => {
    setFormData((prev) => ({ ...prev, milestonePhase: phase }));
  }, []);

  const setRetentionPercent = useCallback((ret: number) => {
    setFormData((prev) => ({ ...prev, retentionPercent: ret }));
  }, []);

  const setCommercialRetailValue = useCallback((val: number) => {
    setFormData((prev) => ({ ...prev, commercialRetailValueZAR: val }));
  }, []);

  const setActualCashOutflow = useCallback((val: number) => {
    setFormData((prev) => ({ ...prev, actualCashOutflowZAR: val }));
  }, []);

  const setActualCost = useCallback((cost: number) => {
    setFormData((prev) => ({ ...prev, actualCostZAR: cost }));
  }, []);

  const setSupplier = useCallback((sup: string) => {
    setFormData((prev) => ({ ...prev, supplierOrContractor: sup }));
  }, []);

  return {
    formData,
    setFormData,
    isSponsored,
    setIsSponsored,
    resetForm,
    category: formData.category || 'Flooring & Tiling',
    setCategory,
    status: formData.status || 'Quoted',
    setStatus,
    description: formData.itemDescription || '',
    setDescription,
    unit: formData.unit || 'lump sum',
    setUnit,
    quantity: formData.quantity ?? 1,
    setQuantity,
    baselineUnitCost: formData.baselineUnitCostZAR ?? 25000,
    setBaselineUnitCost,
    milestonePhase: (formData.milestonePhase || 'First Fix / Wet Works') as NonNullable<BOQItem['milestonePhase']>,
    setMilestonePhase,
    retentionPercent: formData.retentionPercent ?? 0,
    setRetentionPercent,
    commercialRetailValue: formData.commercialRetailValueZAR ?? 0,
    setCommercialRetailValue,
    actualCashOutflow: formData.actualCashOutflowZAR ?? 0,
    setActualCashOutflow,
    actualCost: formData.actualCostZAR ?? 0,
    setActualCost,
    supplier: formData.supplierOrContractor || 'Builders Warehouse Sandton',
    setSupplier,
  };
}
