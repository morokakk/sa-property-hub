import { StateCreator } from 'zustand';
import { LocalSupplier, MunicipalContact } from '@/types';
import { RootStoreState, DirectorySlice } from '../types';
import {
  INITIAL_SUPPLIERS,
  INITIAL_MUNICIPAL_DIRECTORY,
} from '../initialData';

export const createDirectorySlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  DirectorySlice
> = (set) => ({
  suppliers: INITIAL_SUPPLIERS,
  municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,

  addSupplier: (supplier) =>
    set((state) => ({ suppliers: [supplier, ...state.suppliers] })),

  deleteSupplier: (id) =>
    set((state) => ({
      suppliers: state.suppliers.filter((s) => s.id !== id),
    })),

  addMunicipalContact: (contact) =>
    set((state) => ({
      municipalDirectory: [
        ...state.municipalDirectory,
        {
          ...contact,
          id: `muni-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          isCustom: true,
        },
      ],
    })),

  updateMunicipalContact: (id, updates) =>
    set((state) => ({
      municipalDirectory: state.municipalDirectory.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  deleteMunicipalContact: (id) =>
    set((state) => ({
      municipalDirectory: state.municipalDirectory.filter((m) => m.id !== id),
    })),

  resetMunicipalDirectory: () =>
    set({
      municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
    }),
});
