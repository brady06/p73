import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AnalysisStatus } from '../analysisStatus';

/**
 * Shared analysis UI + results so route changes do not reset the Text Analysis flow.
 */
export type BiasAnalysisContextValue = {
  analysisText: string;
  setAnalysisText: (value: string) => void;
  analysisStatus: AnalysisStatus;
  setAnalysisStatus: (status: AnalysisStatus) => void;
  analysisError: string | null;
  setAnalysisError: (message: string | null) => void;
  biasScore: number | null;
  setBiasScore: (score: number | null) => void;
  biasNotes: string[];
  setBiasNotes: (notes: string[]) => void;
  neutralPosition: string | null;
  setNeutralPosition: (text: string | null) => void;
  clearAnalysisResults: () => void;
};

const BiasAnalysisContext = createContext<BiasAnalysisContextValue | null>(null);

export function BiasAnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisText, setAnalysisText] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [biasScore, setBiasScore] = useState<number | null>(null);
  const [biasNotes, setBiasNotes] = useState<string[]>([]);
  const [neutralPosition, setNeutralPosition] = useState<string | null>(null);

  const clearAnalysisResults = useCallback(() => {
    setBiasScore(null);
    setBiasNotes([]);
    setNeutralPosition(null);
  }, []);

  const value = useMemo(
    () => ({
      analysisText,
      setAnalysisText,
      analysisStatus,
      setAnalysisStatus,
      analysisError,
      setAnalysisError,
      biasScore,
      setBiasScore,
      biasNotes,
      setBiasNotes,
      neutralPosition,
      setNeutralPosition,
      clearAnalysisResults,
    }),
    [
      analysisText,
      analysisStatus,
      analysisError,
      biasScore,
      biasNotes,
      neutralPosition,
      clearAnalysisResults,
    ],
  );

  return <BiasAnalysisContext.Provider value={value}>{children}</BiasAnalysisContext.Provider>;
}

export function useBiasAnalysis() {
  const ctx = useContext(BiasAnalysisContext);
  if (!ctx) {
    throw new Error('useBiasAnalysis must be used within BiasAnalysisProvider');
  }
  return ctx;
}
