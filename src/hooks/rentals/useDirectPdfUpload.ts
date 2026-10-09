import { useState, useCallback } from 'react';
import { parseRentalPdfStatement, UnifiedParsedStatementResult } from '@/lib/utilities/pdfParser';
import { AiSettings } from '@/types';

export interface ParsingProgress {
  current: number;
  total: number;
  filename: string;
}

export interface UseDirectPdfUploadReturn {
  queue: (UnifiedParsedStatementResult & { fileName?: string })[];
  isProcessing: boolean;
  parsingProgress: ParsingProgress | null;
  enqueueFiles: (files: FileList | File[]) => Promise<void>;
  clearQueue: () => void;
  setQueue: React.Dispatch<React.SetStateAction<(UnifiedParsedStatementResult & { fileName?: string })[]>>;
}

export function useDirectPdfUpload(aiSettings?: AiSettings): UseDirectPdfUploadReturn {
  const [queue, setQueue] = useState<(UnifiedParsedStatementResult & { fileName?: string })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<ParsingProgress | null>(null);

  const enqueueFiles = useCallback(
    async (fileInput: FileList | File[]) => {
      const files = Array.from(fileInput);
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      const parsedResults: (UnifiedParsedStatementResult & { fileName?: string })[] = [];

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setParsingProgress({ current: i + 1, total: files.length, filename: file.name });
          const result = await parseRentalPdfStatement(file, aiSettings);

          if (!result.success) {
            setParsingProgress(null);
            setIsProcessing(false);
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
              window.alert(
                `Failed to parse "${file.name}":\n\n${result.error || 'Unrecognized document structure'}\n\nPlease check this file and re-upload.`
              );
            }
            return;
          }

          parsedResults.push({
            ...result,
            fileName: file.name,
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
