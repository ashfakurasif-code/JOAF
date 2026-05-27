/**
 * baseRenderer.js — Shared canvas rendering core
 * Used by: CardEngine and ReelEngine
 * Preserves existing JOAF branding, logo, template logic
 */

import { banglaWordWrap, fitText, drawTextLines, roundRect, drawGlowText, setOpticalFont } from './typography.js';

// JOAF brand logo (same base64 as existing admin panel)
let LOGO_IMG = null;
let LOGO_READY = false;

export function loadBrandLogo(src) {
  return new Promise((res) => {
    LOGO_IMG = new Image();
    LOGO_IMG.onload = () => { LOGO_READY = true; res(LOGO_IMG); };
    LOGO_IMG.onerror = () => res(null);
    LOGO_IMG.src = src;
  });
}

/** Color palettes per mood/tone */
export const PALETTES = {
  urgent:      { bg: '#0a0a0f', accent: '#ef4444', accent2: '#dc2626', text: '#ffffff', sub: '#fed7d7', border: '#7f1d1d' },
  sad:         { bg: '#0d1117', accent: '#3b82f6', accent2: '#2563eb', text: '#ffffff', sub: '#bfdbfe', border: '#1e3a5f' },
  positive:    { bg: '#052e16', accent: '#22c55e', accent2: '#16a34a', text: '#ffffff', sub: '#bbf7d0', border: '#14532d' },
  angry:       { bg: '#1a0000', accent: '#f97316', accent2: '#ea580c', text: '#ffffff', sub: '#fed7aa', border: '#7c2d12' },
  neutral:     { bg: '#0f0f14', accent: '#a78bfa', accent2: '#7c3aed', text: '#ffffff', sub: '#ede9fe', border: '#4c1d95' },
  breaking:    { bg: '#0a0a0f', accent: '#ef4444', accent2: '#b91c1c', text: '#ffffff', sub: '#fca5a5', border: '#991b1b' },
  informative: { bg: '#030712', accent: '#38bdf8', accent2: '#0284c7', text: '#ffffff', sub: '#bae6fd', border: '#0369a1' },
  motivational:{ bg: '#1c1917', accent: '#fbbf24', accent2: '#d97706', text: '#ffffff', sub: '#fde68a', border: '#92400e' }
};

/**
 * Clear canvas and apply gradient background
 */
export function applyBackground(ctx, W, H, palette) {
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, palette.bg);
  grad.addColorStop(0.6, palette.bg);
  grad.addColorStop(1, shadeColor(palette.bg, 15));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draw JOAF branding bar (logo + site URL + date)
 * Preserved from existing admin/index.html
 */
export function drawBrandBar(ctx, W, H, palette) {
  // Bottom bar background
  const barH = 90;
  const barY = H - barH;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, barY, W, barH);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(W, barY);
  ctx.stroke();

  // Logo
  if (LOGO_READY && LOGO_IMG) {
    ctx.globalAlpha = 0.95;
    ctx.drawImage(LOGO_IMG, 24, barY + 10, 60, 60);
    ctx.globalAlpha = 1;
  } else {
    // Fallback circle
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(54, barY + 40, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = "bold 22px 'Hind Siliguri', Arial";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✊', 54, barY + 40);
  }

  // Brand name
  ctx.font = "bold 32px 'Hind Siliguri', Arial";
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('JOAF ⚡', 100, barY + 48);
  ctx.shadowBlur = 0;

  // URL
  ctx.font = "20px 'Hind Siliguri', Arial";
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('www.julyforum.com', 100, barY + 72);

  // Date
  const d = new Date();
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  ctx.font = "bold 20px 'Hind Siliguri', Arial";
  ctx.fillStyle = palette.sub;
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 24, barY + 72);
}

/**
 * Draw corner decorations (existing admin pattern)
 */
export function drawCornerDecor(ctx, W, H, palette) {
  const cc = ['#', '○', '●', '|', '—', '◆', '▲', '◉', '⊕'];
  ctx.font = '14px monospace';
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = 'left';
  for (let r = 0; r < 12; r++) {
    ctx.fillText(cc[r % cc.length], 9, 70 + r * 17);
    ctx.fillText(cc[(r + 9) % cc.length], W - 20, 70 + r * 17);
  }
  ctx.globalAlpha = 1;
}

/**
 * Draw breaking badge / tone indicator
 */
export function drawBadge(ctx, W, palette, emotion = 'urgent') {
  const labels = { urgent: 'জরুরি', breaking: 'ব্রেকিং', sad: 'দুঃখজনক', positive: 'ইতিবাচক', angry: 'ক্ষুব্ধ', neutral: 'তথ্য' };
  const label = labels[emotion] || 'ব্রেকিং';

  // Badge pill
  const bW = 130;
  const bH = 36;
  const bX = W - bW - 24;
  const bY = 24;
  roundRect(ctx, bX, bY, bW, bH, 18);
  ctx.fillStyle = palette.accent;
  ctx.fill();

  // Blinking dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(bX + 18, bY + bH / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "bold 18px 'Hind Siliguri', Arial";
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bX + bW / 2 + 6, bY + bH / 2);
}

/**
 * Draw a static news card from MasterContentObject
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W — canvas width
 * @param {number} H — canvas height
 * @param {MasterContentObject} content
 * @param {HTMLImageElement|null} bgImage — optional background image
 */
export function drawNewsCard(ctx, W, H, content, bgImage = null) {
  const palette = PALETTES[content.emotion] || PALETTES.urgent;

  // Background
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, W, H);
    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);
  } else {
    applyBackground(ctx, W, H, palette);
  }

  // Corner decor
  drawCornerDecor(ctx, W, H, palette);

  // Top accent line
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, W, 6);

  // Badge
  drawBadge(ctx, W, palette, content.emotion);

  // Headline
  const pad = 56;
  const textW = W - pad * 2;
  const headlineFontBase = `900 72px 'Hind Siliguri', 'Noto Sans Bengali', Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;

  const { lines: hLines, fontSize: hSize } = fitText(ctx, content.headline, textW, 4, headlineFontBase, 36);
  setOpticalFont(ctx, hSize, '900');
  const lineH = hSize * 1.3;
  const hStartY = 130;

  // Highlight words in headline
  drawTextLines(ctx, hLines, W / 2, hStartY + lineH * 0.8, lineH, content.highlightWords, palette.accent, 'center');

  // Sub-headline
  if (content.subHeadline) {
    ctx.shadowBlur = 0;
    const subY = hStartY + hLines.length * lineH + 20;
    ctx.font = `400 32px 'Hind Siliguri', Arial`;
    ctx.fillStyle = palette.sub;
    const subLines = banglaWordWrap(ctx, content.subHeadline, textW, 2);
    drawTextLines(ctx, subLines, W / 2, subY, 38, [], '', 'center');
  }

  // Summary box
  if (content.summary) {
    const boxY = H - 280;
    const boxH = 160;
    roundRect(ctx, pad - 16, boxY, W - (pad - 16) * 2, boxH, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.strokeStyle = palette.accent + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = `400 26px 'Hind Siliguri', Arial`;
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    const sumLines = banglaWordWrap(ctx, content.summary, textW - 24, 4);
    drawTextLines(ctx, sumLines, W / 2, boxY + 36, 34, content.emphasisWords, palette.accent, 'center');
  }

  ctx.shadowBlur = 0;

  // Brand bar
  drawBrandBar(ctx, W, H, palette);
}

/**
 * Draw a single reel/video frame
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {object} scene — { title, text, mood }
 * @param {MasterContentObject} content
 * @param {number} t — animation time 0..1
 * @param {HTMLImageElement|null} bgImage
 */
export function drawReelFrame(ctx, W, H, scene, content, t = 0, bgImage = null) {
  const palette = PALETTES[scene.mood || content.emotion] || PALETTES.urgent;

  // Background
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${0.55 + 0.2 * (1 - t)})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    applyBackground(ctx, W, H, palette);
    drawCornerDecor(ctx, W, H, palette);
  }

  // Top line
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, W, 6);

  // Badge
  drawBadge(ctx, W, palette, scene.mood || content.emotion);

  // Slide text with entrance animation
  const slideIn = Math.min(1, t * 3);
  const textX = W / 2;
  const textY = H / 2 - 60;
  const pad = 60;
  const textW = W - pad * 2;

  ctx.globalAlpha = slideIn;
  ctx.save();
  ctx.translate(0, 30 * (1 - slideIn));

  const textFontBase = `900 64px 'Hind Siliguri', 'Noto Sans Bengali', Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 16;

  const { lines, fontSize } = fitText(ctx, scene.text || '', textW, 5, textFontBase, 28);
  setOpticalFont(ctx, fontSize, '900');
  const lh = fontSize * 1.35;
  const totalH = lines.length * lh;
  const startY = H / 2 - totalH / 2 + fontSize;

  drawTextLines(ctx, lines, textX, startY, lh, content.highlightWords, palette.accent, 'center');
  ctx.restore();

  // Subtitle line at bottom
  if (content.subtitleLines && content.subtitleLines.length > 0) {
    const subIdx = Math.floor(t * content.subtitleLines.length) % content.subtitleLines.length;
    const sub = content.subtitleLines[subIdx];
    if (sub) {
      ctx.globalAlpha = Math.min(1, t * 5);
      ctx.font = `500 28px 'Hind Siliguri', Arial`;
      ctx.fillStyle = '#ffffffcc';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.fillText(sub, W / 2, H - 120);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  drawBrandBar(ctx, W, H, palette);
}

// Utility
function shadeColor(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + pct);
  const g = Math.min(255, ((n >> 8) & 0xff) + pct);
  const b = Math.min(255, (n & 0xff) + pct);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export { banglaWordWrap, fitText, drawTextLines, roundRect, drawGlowText, setOpticalFont };
