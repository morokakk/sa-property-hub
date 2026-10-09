import { useState, useCallback, useEffect } from 'react';

export interface UseFlipExitFormReturn {
  salePrice: number;
  setSalePrice: (v: number) => void;
  netProceeds: number;
  setNetProceeds: (v: number) => void;
  soldDate: string;
  setSoldDate: (v: string) => void;
  exitNotes: string;
  setExitNotes: (v: string) => void;
  resetForm: (defaultPrice?: number, totalCostBasis?: number) => void;
}

export function useFlipExitForm(
  defaultPrice: number = 0,
  defaultCostBasis: number = 0
): UseFlipExitFormReturn {
  const [salePrice, setSalePrice] = useState<number>(defaultPrice);
  const [netProceeds, setNetProceeds] = useState<number>(Math.max(0, defaultPrice - defaultCostBasis));
  const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exitNotes, setExitNotes] = useState<string>('');

  useEffect(() => {
    setSalePrice(defaultPrice);
    setNetProceeds(Math.max(0, defaultPrice - defaultCostBasis));
  }, [defaultPrice, defaultCostBasis]);

  const resetForm = useCallback((price: number = defaultPrice, totalCostBasis: number = defaultCostBasis) => {
    setSalePrice(price);
    setNetProceeds(Math.max(0, price - totalCostBasis));
    setSoldDate(new Date().toISOString().split('T')[0]);
    setExitNotes('');
  }, [defaultPrice, defaultCostBasis]);

  return {
    salePrice,
    setSalePrice,
    netProceeds,
    setNetProceeds,
    soldDate,
    setSoldDate,
    exitNotes,
    setExitNotes,
    resetForm,
  };
}
