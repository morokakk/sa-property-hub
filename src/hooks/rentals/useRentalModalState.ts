import { useState, useCallback } from 'react';
import { RentalProperty } from '@/types';

export interface UseRentalModalStateReturn {
  isRentalFormOpen: boolean;
  editingProperty: RentalProperty | null;
  openAddRental: () => void;
  openEditRental: (property: RentalProperty) => void;
  closeRentalForm: () => void;

  isRefinanceOpen: boolean;
  refinanceProperty: RentalProperty | null;
  refinanceSuccessBanner: { amount: number; propertyTitle: string } | null;
  clearRefinanceBanner: () => void;
  setRefinanceSuccessBanner: React.Dispatch<React.SetStateAction<{ amount: number; propertyTitle: string } | null>>;
  openRefinance: (property: RentalProperty) => void;
  closeRefinance: () => void;

  isAuditHistoryOpen: boolean;
  auditProperty: RentalProperty | null;
  openAuditHistory: (property: RentalProperty) => void;
  closeAuditHistory: () => void;

  isMaintenanceOpen: boolean;
  maintenanceProperty: RentalProperty | null;
  openMaintenance: (property: RentalProperty) => void;
  closeMaintenance: () => void;

  isExitOpen: boolean;
  exitProperty: RentalProperty | null;
  openExit: (property: RentalProperty) => void;
  closeExit: () => void;

  isPmtOpen: boolean;
  pmtProperty: RentalProperty | null;
  openPmtCalculator: (property: RentalProperty) => void;
  closePmtCalculator: () => void;

  statementPropertyId: string | null;
  openStatementModal: (propertyId: string) => void;
  closeStatementModal: () => void;

  meterPropertyId: string | null;
  openMeterModal: (propertyId: string) => void;
  closeMeterModal: () => void;
}

export function useRentalModalState(): UseRentalModalStateReturn {
  // Add / Edit Rental Property Modal
  const [isRentalFormOpen, setIsRentalFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentalProperty | null>(null);

  const openAddRental = useCallback(() => {
    setEditingProperty(null);
    setIsRentalFormOpen(true);
  }, []);

  const openEditRental = useCallback((property: RentalProperty) => {
    setEditingProperty(property);
    setIsRentalFormOpen(true);
  }, []);

  const closeRentalForm = useCallback(() => {
    setIsRentalFormOpen(false);
    setEditingProperty(null);
  }, []);

  // BRRRR Refinance Modal
  const [isRefinanceOpen, setIsRefinanceOpen] = useState(false);
  const [refinanceProperty, setRefinanceProperty] = useState<RentalProperty | null>(null);
  const [refinanceSuccessBanner, setRefinanceSuccessBanner] = useState<{ amount: number; propertyTitle: string } | null>(null);

  const openRefinance = useCallback((property: RentalProperty) => {
    setRefinanceProperty(property);
    setIsRefinanceOpen(true);
  }, []);

  const closeRefinance = useCallback(() => {
    setIsRefinanceOpen(false);
    setRefinanceProperty(null);
  }, []);

  const clearRefinanceBanner = useCallback(() => {
    setRefinanceSuccessBanner(null);
  }, []);

  // Refinance Audit History Modal
  const [isAuditHistoryOpen, setIsAuditHistoryOpen] = useState(false);
  const [auditProperty, setAuditProperty] = useState<RentalProperty | null>(null);

  const openAuditHistory = useCallback((property: RentalProperty) => {
    setAuditProperty(property);
    setIsAuditHistoryOpen(true);
  }, []);

  const closeAuditHistory = useCallback(() => {
    setIsAuditHistoryOpen(false);
    setAuditProperty(null);
  }, []);

  // Maintenance Modal
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [maintenanceProperty, setMaintenanceProperty] = useState<RentalProperty | null>(null);

  const openMaintenance = useCallback((property: RentalProperty) => {
    setMaintenanceProperty(property);
    setIsMaintenanceOpen(true);
  }, []);

  const closeMaintenance = useCallback(() => {
    setIsMaintenanceOpen(false);
    setMaintenanceProperty(null);
  }, []);

  // Disposal / Exit Sale Modal
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [exitProperty, setExitProperty] = useState<RentalProperty | null>(null);

  const openExit = useCallback((property: RentalProperty) => {
    setExitProperty(property);
    setIsExitOpen(true);
  }, []);

  const closeExit = useCallback(() => {
    setIsExitOpen(false);
    setExitProperty(null);
  }, []);

  // SARB Repo Rate PMT Calculator Modal
  const [isPmtOpen, setIsPmtOpen] = useState(false);
  const [pmtProperty, setPmtProperty] = useState<RentalProperty | null>(null);

  const openPmtCalculator = useCallback((property: RentalProperty) => {
    setPmtProperty(property);
    setIsPmtOpen(true);
  }, []);

  const closePmtCalculator = useCallback(() => {
    setIsPmtOpen(false);
    setPmtProperty(null);
  }, []);

  // Statement Modal
  const [statementPropertyId, setStatementPropertyId] = useState<string | null>(null);

  const openStatementModal = useCallback((propertyId: string) => {
    setStatementPropertyId(propertyId);
  }, []);

  const closeStatementModal = useCallback(() => {
    setStatementPropertyId(null);
  }, []);

  // Meter Readings Modal
  const [meterPropertyId, setMeterPropertyId] = useState<string | null>(null);

  const openMeterModal = useCallback((propertyId: string) => {
    setMeterPropertyId(propertyId);
  }, []);

  const closeMeterModal = useCallback(() => {
    setMeterPropertyId(null);
  }, []);

  return {
    isRentalFormOpen,
    editingProperty,
    openAddRental,
    openEditRental,
    closeRentalForm,

    isRefinanceOpen,
    refinanceProperty,
    refinanceSuccessBanner,
    clearRefinanceBanner,
    setRefinanceSuccessBanner,
    openRefinance,
    closeRefinance,

    isAuditHistoryOpen,
    auditProperty,
    openAuditHistory,
    closeAuditHistory,

    isMaintenanceOpen,
    maintenanceProperty,
    openMaintenance,
    closeMaintenance,

    isExitOpen,
    exitProperty,
    openExit,
    closeExit,

    isPmtOpen,
    pmtProperty,
    openPmtCalculator,
    closePmtCalculator,

    statementPropertyId,
    openStatementModal,
    closeStatementModal,

    meterPropertyId,
    openMeterModal,
    closeMeterModal,
  };
}
