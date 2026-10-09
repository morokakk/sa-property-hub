import { useState, useCallback, useEffect } from 'react';
import { FlipProject } from '@/types';

export interface UseFundingFormReturn {
  fundingRequired: number;
  setFundingRequired: (v: number) => void;
  capitalRaised: number;
  setCapitalRaised: (v: number) => void;
  primaryFunderName: string;
  setPrimaryFunderName: (v: string) => void;
  primaryFunderContact: string;
  setPrimaryFunderContact: (v: string) => void;
  primaryFunderType: FlipProject['primaryFunderType'];
  setPrimaryFunderType: (v: FlipProject['primaryFunderType']) => void;
  coFundersNotes: string;
  setCoFundersNotes: (v: string) => void;
  promisedReturnType: FlipProject['promisedReturnType'];
  setPromisedReturnType: (v: FlipProject['promisedReturnType']) => void;
  promisedReturnRatePercent: number;
  setPromisedReturnRatePercent: (v: number) => void;
  promisedPayoutSchedule: FlipProject['promisedPayoutSchedule'];
  setPromisedPayoutSchedule: (v: FlipProject['promisedPayoutSchedule']) => void;
  securityOffered: string;
  setSecurityOffered: (v: string) => void;
  resetForm: (flip?: FlipProject | null, defaultRequired?: number, defaultRaised?: number) => void;
}

export function useFundingForm(flip?: FlipProject | null): UseFundingFormReturn {
  const [fundingRequired, setFundingRequired] = useState<number>(flip?.fundingRequiredZAR || 0);
  const [capitalRaised, setCapitalRaised] = useState<number>(flip?.capitalRaisedZAR || 0);
  const [primaryFunderName, setPrimaryFunderName] = useState<string>(flip?.primaryFunderName || '');
  const [primaryFunderContact, setPrimaryFunderContact] = useState<string>(flip?.primaryFunderContact || '');
  const [primaryFunderType, setPrimaryFunderType] = useState<FlipProject['primaryFunderType']>(
    flip?.primaryFunderType || 'Private Lender'
  );
  const [coFundersNotes, setCoFundersNotes] = useState<string>(flip?.coFundersNotes || '');
  const [promisedReturnType, setPromisedReturnType] = useState<FlipProject['promisedReturnType']>(
    flip?.promisedReturnType || 'Fixed Interest'
  );
  const [promisedReturnRatePercent, setPromisedReturnRatePercent] = useState<number>(
    flip?.promisedReturnRatePercent ?? 14
  );
  const [promisedPayoutSchedule, setPromisedPayoutSchedule] = useState<FlipProject['promisedPayoutSchedule']>(
    flip?.promisedPayoutSchedule || 'Monthly Interest'
  );
  const [securityOffered, setSecurityOffered] = useState<string>(
    flip?.securityOffered || '2nd Mortgage Bond registered over title deed'
  );

  const resetForm = useCallback((targetFlip?: FlipProject | null, defaultRequired?: number, defaultRaised?: number) => {
    const f = targetFlip ?? flip;
    setFundingRequired(defaultRequired !== undefined ? defaultRequired : (f?.fundingRequiredZAR || 0));
    setCapitalRaised(defaultRaised !== undefined ? defaultRaised : (f?.capitalRaisedZAR || 0));
    setPrimaryFunderName(f?.primaryFunderName || '');
    setPrimaryFunderContact(f?.primaryFunderContact || '');
    setPrimaryFunderType(f?.primaryFunderType || 'Private Lender');
    setCoFundersNotes(f?.coFundersNotes || '');
    setPromisedReturnType(f?.promisedReturnType || 'Fixed Interest');
    setPromisedReturnRatePercent(f?.promisedReturnRatePercent ?? 14);
    setPromisedPayoutSchedule(f?.promisedPayoutSchedule || 'Monthly Interest');
    setSecurityOffered(f?.securityOffered || '2nd Mortgage Bond registered over title deed');
  }, [flip]);

  useEffect(() => {
    if (flip) {
      resetForm(flip);
    }
  }, [flip, resetForm]);

  return {
    fundingRequired,
    setFundingRequired,
    capitalRaised,
    setCapitalRaised,
    primaryFunderName,
    setPrimaryFunderName,
    primaryFunderContact,
    setPrimaryFunderContact,
    primaryFunderType,
    setPrimaryFunderType,
    coFundersNotes,
    setCoFundersNotes,
    promisedReturnType,
    setPromisedReturnType,
    promisedReturnRatePercent,
    setPromisedReturnRatePercent,
    promisedPayoutSchedule,
    setPromisedPayoutSchedule,
    securityOffered,
    setSecurityOffered,
    resetForm,
  };
}
