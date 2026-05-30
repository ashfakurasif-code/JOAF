/**
 * ocrEngine.js — Browser-side OCR for JOAF
 * Uses Tesseract.js with Bengali + English language packs.
 * Lazy-loads Tesseract on first call so it doesn't bloat initial page load.
 *
 * Usage:
 *   import { extractTextFromImage } from './ocrEngine.js';
 *   const { text, confidence, language } = await extractTextFromImage(imageFile);
 */

let workerInstance = null;

/** Lazy-initialize Tesseract worker (cached across calls in the same session) */
async function getWorker() {
  if (workerInstance) return workerInstance;

  const { createWorker } = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');

  const worker = await createWorker(
    ['ben', 'eng'], // Bengali first — preferred for BD content
    1,              // OEM_LSTM_ONLY — faster and more accurate than legacy
    {
      // Use CDN-hosted training data — no local files needed
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-lstm.wasm.js',
      logger: () => {}, // suppress progress logs in production
    }
  );

  workerInstance = worker;
  return worker;
}

/**
 * Extract text from an image file using OCR.
 * @param {File|Blob|string} imageInput — File object, Blob, or image URL
 * @returns {Promise<{ text: string, confidence: number, language: 'bn'|'en'|'mixed', words: Array }>}
 */
export async function extractTextFromImage(imageInput) {
  const worker = await getWorker();

  const { data } = await worker.recognize(imageInput);

  const text = data.text?.trim() || '';
  const confidence = Math.round(data.confidence || 0);

  // Detect primary language from character distribution
  const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const latinChars  = (text.match(/[a-zA-Z]/g) || []).length;
  let language = 'mixed';
  if (banglaChars > latinChars * 2) language = 'bn';
  else if (latinChars > banglaChars * 2) language = 'en';

  // Words with individual confidence scores — useful for highlighting uncertain regions
  const words = (data.words || []).map(w => ({
    text: w.text,
    confidence: Math.round(w.confidence),
    bbox: w.bbox,
  }));

  return { text, confidence, language, words };
}

/**
 * Terminate the Tesseract worker to free memory.
 * Call this when the user navigates away from the OCR feature.
 */
export async function terminateOCR() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * Check if OCR is available (Tesseract.js CDN reachable).
 * @returns {Promise<boolean>}
 */
export async function isOCRAvailable() {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js', { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
