import { useState, useCallback, useRef } from 'react';
import { searchByISBN, fetchImageAsBase64 } from '../services/vtexApi';
import { buildOutputRow } from '../services/csvProcessor';
import type { InputRow, OutputRow } from '../services/csvProcessor';
import { storeImage, getImage } from '../services/imageStorage';

export type ScrapeStatus = 'idle' | 'running' | 'paused' | 'done';

export interface ScrapeProgress {
  total: number;
  done: number;
  current: string;
  errors: number;
}

export function useScraper() {
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [rows, setRows] = useState<OutputRow[]>([]);
  const [progress, setProgress] = useState<ScrapeProgress>({ total: 0, done: 0, current: '', errors: 0 });
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const run = useCallback(async (inputs: InputRow[]) => {
    setStatus('running');
    setRows([]);
    pauseRef.current = false;
    abortRef.current = false;

    const results: OutputRow[] = [];
    let errors = 0;

    for (let i = 0; i < inputs.length; i++) {
      if (abortRef.current) break;

      // Pause loop
      while (pauseRef.current) {
        await sleep(300);
      }

      const input = inputs[i];
      setProgress({ total: inputs.length, done: i, current: input.isbn, errors });

      try {
        // Search VTEX
        const product = await searchByISBN(input.isbn);

        // Build output row
        const row = buildOutputRow(input, product);

        // Fetch and store image
        if (row._imageUrl) {
          // Check cache first
          let cached = getImage(input.isbn);
          if (!cached) {
            cached = await fetchImageAsBase64(row._imageUrl);
            if (cached) storeImage(input.isbn, cached);
          }
        }

        results.push(row);
        if (row._status === 'error') errors++;
      } catch (e) {
        const errRow = buildOutputRow(input, null);
        errRow._error = String(e);
        results.push(errRow);
        errors++;
      }

      // Update grid live
      setRows([...results]);

      // Small delay to avoid rate limiting
      await sleep(300);
    }

    setProgress({ total: inputs.length, done: inputs.length, current: '', errors });
    setStatus('done');
  }, []);

  const pause = useCallback(() => {
    pauseRef.current = true;
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    pauseRef.current = false;
    setStatus('running');
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setRows([]);
    setProgress({ total: 0, done: 0, current: '', errors: 0 });
    setStatus('idle');
  }, []);

  return { status, rows, progress, run, pause, resume, stop, reset };
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
