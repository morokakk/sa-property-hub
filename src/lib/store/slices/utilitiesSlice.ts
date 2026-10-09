import { StateCreator } from 'zustand';
import {
  UtilityStatement,
  MeterReading,
  PropertyMeter,
} from '@/types';
import { RootStoreState, UtilitiesSlice } from '../types';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';

export const createUtilitiesSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  UtilitiesSlice
> = (set) => ({
  addUtilityStatement: (propertyId, statement) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        const existingStatements = r.utilityStatements || [];
        const filtered = existingStatements.filter(
          (s) => s.id !== statement.id && s.statementDate !== statement.statementDate
        );
        const combined = [...filtered, statement].sort((a, b) =>
          a.statementDate.localeCompare(b.statementDate)
        );

        // Auto-extract meter readings if present on incoming statement
        let updatedMeterReadings = [...(r.meterReadings || [])];
        if (statement.extractedMeterReadings && statement.extractedMeterReadings.length > 0) {
          statement.extractedMeterReadings.forEach((extracted, idx) => {
            const alreadyExists = updatedMeterReadings.some(
              (mr) =>
                mr.date === extracted.date &&
                mr.utilityType === extracted.utilityType &&
                mr.readingValue === extracted.readingValue
            );
            if (!alreadyExists) {
              const newReading: MeterReading = {
                ...extracted,
                id: `meter-pdf-${Date.now()}-${idx}`,
                createdAt: new Date().toISOString(),
              };
              updatedMeterReadings.push(newReading);
            }
          });
          updatedMeterReadings.sort((a, b) => b.date.localeCompare(a.date));
        }

        return {
          ...r,
          utilityStatements: combined,
          meterReadings: updatedMeterReadings,
          unpaidUtilityArrearsZAR: Math.max(
            0,
            calculatePropertyArrears({
              ...r,
              utilityStatements: combined,
              meterReadings: updatedMeterReadings,
            }).totalArrearsZAR
          ),
        };
      }),
    })),

  deleteUtilityStatement: (propertyId, statementId) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        const remaining = (r.utilityStatements || []).filter(
          (s) => s.id !== statementId
        );
        return {
          ...r,
          utilityStatements: remaining,
          unpaidUtilityArrearsZAR: Math.max(
            0,
            calculatePropertyArrears({
              ...r,
              utilityStatements: remaining,
            }).totalArrearsZAR
          ),
        };
      }),
    })),

  setStatementTenantBillingMethod: (propertyId, statementId, method) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          utilityStatements: (r.utilityStatements || []).map((s) => {
            if (s.id !== statementId) return s;
            return {
              ...s,
              tenantBillingMethod: method,
            };
          }),
        };
      }),
    })),

  addMeterReading: (propertyId, reading) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        const newReading: MeterReading = {
          ...reading,
          id: `meter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        const updated = [newReading, ...(r.meterReadings || [])].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        return {
          ...r,
          meterReadings: updated,
        };
      }),
    })),

  deleteMeterReading: (propertyId, readingId) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          meterReadings: (r.meterReadings || []).filter((m) => m.id !== readingId),
        };
      }),
    })),

  updateMeterReadingDispute: (propertyId, readingId, disputeData) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          meterReadings: (r.meterReadings || []).map((m) => {
            if (m.id !== readingId) return m;
            return {
              ...m,
              ...disputeData,
            };
          }),
        };
      }),
    })),

  addPropertyMeter: (propertyId, meter) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        const newMeter: PropertyMeter = {
          ...meter,
          id: `reg-m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        return {
          ...r,
          meterRegistry: [...(r.meterRegistry || []), newMeter],
        };
      }),
    })),

  updatePropertyMeter: (propertyId, meterId, updates) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          meterRegistry: (r.meterRegistry || []).map((m) =>
            m.id === meterId ? { ...m, ...updates } : m
          ),
        };
      }),
    })),

  deletePropertyMeter: (propertyId, meterId) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          meterRegistry: (r.meterRegistry || []).filter((m) => m.id !== meterId),
        };
      }),
    })),
});
