/**
 * typography.js — Bangla-aware canvas typography engine
 * Handles: smart line-break, dynamic scaling, overflow prevention,
 *          emphasis rendering, highlight words
 */

/** Bangla line-break characters */
const BN_BREAK_CHARS = /[\s।,;:\u0964\u0965\u09BC]/;
const BN_VOWEL_SIGNS = /[\u09BE-\u09CC\u09D7\u09BC]/;

/**
 * Smart Bangla word-wrap
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} maxLines
 * @returns {string[]} wrapped lines
 */
export function banglaWordWrap(ctx, text, maxWidth, maxLines = 99) {
  if (!text) return [];
  const words = text.split(/(\s+)/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!word.trim() && current) { current += ' '; continue; }
    const test = current ? current.trimEnd() + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current.trim());
      if (lines.length >= maxLines) break;
      // If single word is wider than maxWidth, force-break it
      if (ctx.measureText(word).width > maxWidth) {
        const broken = forceBreakWord(ctx, word, maxWidth, maxLines - lines.length);
        lines.push(...broken.slice(0, -1));
        current = broken[broken.length - 1] || '';
      } else {
        current = word;
      }
    }
  }
  if (current.trim() && lines.length < maxLines) lines.push(current.trim());
  return lines.slice(0, maxLines);
}

/** Force-break a word that's too wide */
function forceBreakWord(ctx, word, maxWidth, maxLines) {
  const lines = [];
  let cur = '';
  for (const ch of word) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      if (lines.length >= maxLines) return lines;
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Dynamic font scaling: reduce font size until text fits in maxLines
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} maxLines
 * @param {string} baseFont  — e.g. "bold 48px 'Hind Siliguri', Arial"
 * @param {number} minSize   — minimum font size in px
 * @returns {{ lines: string[], fontSize: number }}
 */
export function fitText(ctx, text, maxWidth, maxLines, baseFont, minSize = 18) {
  // Parse base font to extract size
  const match = baseFont.match(/(\d+)px/);
  if (!match) return { lines: [text], fontSize: 24 };
  let size = parseInt(match[1]);

  while (size >= minSize) {
    ctx.font = baseFont.replace(`${match[1]}px`, `${size}px`);
    const lines = banglaWordWrap(ctx, text, maxWidth, maxLines);
    // Check overflow: last line check
    const totalLines = banglaWordWrap(ctx, text, maxWidth, 999).length;
    if (totalLines <= maxLines) return { lines, fontSize: size };
    size -= 2;
  }
  ctx.font = baseFont.replace(`${match[1]}px`, `${minSize}px`);
  return { lines: banglaWordWrap(ctx, text, maxWidth, maxLines), fontSize: minSize };
}

/**
 * Draw text with optional word highlighting
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} lines
 * @param {number} x  — center x
 * @param {number} startY — first line baseline y
 * @param {number} lineHeight
 * @param {string[]} highlightWords
 * @param {string} highlightColor
 * @param {string} textAlign — 'center' | 'left' | 'right'
 */
export function drawTextLines(ctx, lines, x, startY, lineHeight, highlightWords = [], highlightColor = '#fbbf24', textAlign = 'center') {
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'alphabetic';

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (!highlightWords.length) {
      ctx.fillText(line, x, y);
      return;
    }
    // Word-by-word highlight
    drawLineWithHighlights(ctx, line, x, y, highlightWords, highlightColor, textAlign);
  });
}

function drawLineWithHighlights(ctx, line, x, y, highlights, highlightColor, align) {
  const words = line.split(' ');
  const totalWidth = ctx.measureText(line).width;
  let curX;
  if (align === 'center') curX = x - totalWidth / 2;
  else if (align === 'right') curX = x - totalWidth;
  else curX = x;

  const origFill = ctx.fillStyle;
  words.forEach((word, i) => {
    const isHighlight = highlights.some(h => word.includes(h));
    const wordWidth = ctx.measureText(word).width;
    ctx.fillStyle = isHighlight ? highlightColor : origFill;
    ctx.fillText(word, curX, y);
    curX += wordWidth + (i < words.length - 1 ? ctx.measureText(' ').width : 0);
  });
  ctx.fillStyle = origFill;
}

/**
 * Draw a rounded rectangle (path only — caller sets fill/stroke)
 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw glowing text (shadow layers)
 */
export function drawGlowText(ctx, text, x, y, color, blur = 20, layers = 3) {
  const orig = ctx.shadowColor;
  const origBlur = ctx.shadowBlur;
  ctx.shadowColor = color;
  for (let l = 0; l < layers; l++) {
    ctx.shadowBlur = blur * (l + 1);
    ctx.fillText(text, x, y);
  }
  ctx.shadowColor = orig;
  ctx.shadowBlur = origBlur;
}

/**
 * Optical letter-spacing adjustment for Bangla
 * Adds very slight tracking at larger sizes
 */
export function setOpticalFont(ctx, size, weight = '900', family = "'Hind Siliguri', 'Noto Sans Bengali', Arial") {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = size > 48 ? '0.5px' : '0px';
}

/**
 * Measure text block height given constraints
 * Useful for vertical centering
 */
export function measureTextBlock(ctx, text, maxWidth, lineHeight, baseFont, maxLines = 20, minSize = 18) {
  const { lines, fontSize } = fitText(ctx, text, maxWidth, maxLines, baseFont, minSize);
  return { height: lines.length * lineHeight, lines, fontSize };
}
