import { useState, useCallback } from 'react';

export type FlipModalType =
  | 'addFlip'
  | 'editFlip'
  | 'addBOQ'
  | 'exit'
  | 'convert'
  | 'funding'
  | 'supplier'
  | 'delayMatrix'
  | null;

export interface UseFlipModalManagerReturn {
  activeModal: FlipModalType;
  isOpen: (modal: FlipModalType) => boolean;
  openModal: (modal: Exclude<FlipModalType, null>) => void;
  closeModal: () => void;
}

export function useFlipModalManager(): UseFlipModalManagerReturn {
  const [activeModal, setActiveModal] = useState<FlipModalType>(null);

  const isOpen = useCallback(
    (modal: FlipModalType): boolean => {
      return activeModal === modal;
    },
    [activeModal]
  );

  const openModal = useCallback((modal: Exclude<FlipModalType, null>) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return {
    activeModal,
    isOpen,
    openModal,
    closeModal,
  };
}
