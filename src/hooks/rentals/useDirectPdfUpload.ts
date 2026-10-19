import { useState, useCallback } from 'react';
import type { UnifiedParsedStatementResult } from '@/lib/utilities/pdfParser';
import { AiSettings } from '@/types';

export interface ParsingProgress {
  current: number;
  total: number;
  filename: string;
}

export type DirectPdfQueueItem = UnifiedParsedStatementResult & {
  fileName?: string;
  file?: File;
};

export interface UseDirectPdfUploadReturn {
  queue: DirectPdfQueueItem[];
  isProcessing: boolean;
  parsingProgress: ParsingProgress | null;
  enqueueFiles: (files: FileList | File[]) => Promise<void>;
  clearQueue: () => void;
  setQueue: React.Dispatch<React.SetStateAction<DirectPdfQueueItem[]>>;
}

export function useDirectPdfUpload(aiSettings?: AiSettings): UseDirectPdfUploadReturn {
  const [queue, setQueue] = useState<DirectPdfQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<ParsingProgress | null>(null);

  const enqueueFiles = useCallback(
    async (fileInput: FileList | File[]) => {
      const files = Array.from(fileInput);
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      const parsedResults: DirectPdfQueueItem[] = [];

      try {
        const { parseRentalPdfStatement } = await import('@/lib/utilities/pdfParser');
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setParsingProgress({ current: i + 1, total: files.length, filename: file.name });
          const result = await parseRentalPdfStatement(file, aiSettings);

          // Retain cached file reference for zero-friction re-parse
          parsedResults.push({
            ...result,
            fileName: file.name,
            file,
          });
        }

        setQueue(parsedResults);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(`Error processing PDF upload:\n\n${errorMessage}`);
        }
      } finally {
        setIsProcessing(false);
        setParsingProgress(null);
      }
    },
    [aiSettings]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    isProcessing,
    parsingProgress,
    enqueueFiles,
    clearQueue,
    setQueue,
  };
}
