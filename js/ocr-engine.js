// OCR Engine — Tesseract.js based
// OCR-First AI Newsroom Pipeline
// Usage: import { extractTextFromImage } from './ocr-engine.js';

import Tesseract from 'tesseract.js';

/**
 * Extract text from an image file using Tesseract OCR
 * Supports English + Bengali (eng+ben)
 * @param {File|Blob|string} file - Image file or URL
 * @returns {{ text: string, confidence: number }}
 */
export async function extractTextFromImage(file) {
  const result = await Tesseract.recognize(
    file,
    'eng+ben',
    {
      logger: m => console.log('[OCR]', m)
    }
  );

  return {
    text: result.data.text,
    confidence: result.data.confidence
  };
}

/**
 * Smart image router:
 * - High confidence OCR text → send text to AI
 * - Low confidence (complex/meme image) → send image to Vision AI
 * @param {File} file
 * @param {Function} sendTextToAI
 * @param {Function} sendImageToVisionAI
 * @param {number} threshold - confidence threshold (default 70)
 */
export async function smartImageRoute(file, sendTextToAI, sendImageToVisionAI, threshold = 70) {
  try {
    const ocr = await extractTextFromImage(file);

    if (ocr.confidence > threshold && ocr.text.trim().length > 10) {
      console.log(`[OCR] High confidence (${ocr.confidence.toFixed(1)}%) — sending text to AI`);
      return await sendTextToAI(ocr.text);
    } else {
      console.log(`[OCR] Low confidence (${ocr.confidence.toFixed(1)}%) — sending image to Vision AI`);
      return await sendImageToVisionAI(file);
    }
  } catch (err) {
    console.error('[OCR] Error, falling back to Vision AI:', err);
    return await sendImageToVisionAI(file);
  }
}

/**
 * Build AI prompt from OCR text for news enhancement
 * @param {string} ocrText - Extracted text from OCR
 * @returns {string} - Prompt for AI
 */
export function buildNewsPrompt(ocrText) {
  return `
You are a professional Bengali news editor.

The following text was extracted from a news image via OCR:

"""
${ocrText}
"""

Your task:
1. Expand this news using latest realtime information.
2. Correct any OCR errors or outdated facts.
3. Add latest updates if available.
4. Generate engaging Bengali news-style content.
5. Keep it factual and professional.

Respond in Bengali.
`.trim();
}


<script>
document.addEventListener('DOMContentLoaded',()=>{
  const ids=['batchPostBtn','postSelectedBtn','qmPostBtn'];
  ids.forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.disabled=false;
      b.style.pointerEvents='auto';
      b.style.opacity='1';
      b.style.zIndex='99999';
    }
  });
});
</script>
