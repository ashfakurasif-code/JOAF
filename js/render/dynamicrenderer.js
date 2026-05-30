/**
 * dynamicRenderer.js — Platform-Aware Dynamic Canvas Engine v2.0
 * Replaces hardcoded 1080x1920 with config-driven multi-platform rendering.
 *
 * Platforms:
 *   reel     → 9:16   (1080×1920) — cinematic animated hook
 *   feed_4_5 → 4:5    (1080×1350) — homepage/feed portrait
 *   square   → 1:1    (1080×1080) — square feed post
 *
 * Dimensions stored in system_config['canvas_dimensions'] on Appwrite.
 * Falls back to built-in defaults if config unavailable.
 */

import { applyBackground, drawBrandBar, drawCornerDecor, drawBadge, drawNewsCard, drawReelFrame, PALETTES, loadBrandLogo } from './baserenderer.js';
import { banglaWordWrap, fitText, drawTextLines, roundRect, drawGlowText, setOpticalFont } from './typography.js';

// ── Default canvas dimensions (overridden by system_config) ─────────────
export const DEFAULT_DIMS = {
  reel:     { w: 1080, h: 1920, ratio: '9:16' },
  feed_4_5: { w: 1080, h: 1350, ratio: '4:5' },
  square:   { w: 1080, h: 1080, ratio: '1:1' },
};

let _cachedDims = null;
let _fetchPromise = null;

/** Load canvas dimensions from Appwrite system_config (with cache) */
export async function loadCanvasDimensions(fbConfigUrl) {
  if (_cachedDims) return _cachedDims;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const url = fbConfigUrl || '/api/fb-config';
      const r   = await fetch(url);
      if (!r.ok) throw new Error('config fetch failed');
      const data = await r.json();
      if (data.canvasDimensions) {
        _cachedDims = { ...DEFAULT_DIMS, ...data.canvasDimensions };
        return _cachedDims;
      }
    } catch { /* ignore, use defaults */ }
    _cachedDims = { ...DEFAULT_DIMS };
    return _cachedDims;
  })();
  return _fetchPromise;
}

/** Invalidate cache (call after admin saves new dims) */
export function invalidateDimsCache() {
  _cachedDims = null;
  _fetchPromise = null;
}

// ── Cinematic gradient presets ──────────────────────────────────────────
const CINEMATIC_GRADIENTS = {
  urgent: (ctx, w, h) => {
    const g = ctx.createRadialGradient(w/2, h*0.35, h*0.05, w/2, h*0.5, h*0.75);
    g.addColorStop(0, '#1a0005');
    g.addColorStop(0.5, '#0a0010');
    g.addColorStop(1, '#000005');
    return g;
  },
  breaking: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0d0000');
    g.addColorStop(0.4, '#150505');
    g.addColorStop(1, '#000000');
    return g;
  },
  sad: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#00050f');
    g.addColorStop(0.6, '#020810');
    g.addColorStop(1, '#000408');
    return g;
  },
  positive: (ctx, w, h) => {
    const g = ctx.createRadialGradient(w*0.3, h*0.2, 0, w/2, h/2, h*0.8);
    g.addColorStop(0, '#001a05');
    g.addColorStop(0.6, '#00100a');
    g.addColorStop(1, '#000800');
    return g;
  },
  neutral: (ctx, w, h) => {
    const g = ctx.createLinearGradient(w, 0, 0, h);
    g.addColorStop(0, '#0a0515');
    g.addColorStop(0.5, '#05020f');
    g.addColorStop(1, '#000005');
    return g;
  },
  motivational: (ctx, w, h) => {
    const g = ctx.createRadialGradient(w/2, h*0.3, 0, w/2, h/2, h*0.9);
    g.addColorStop(0, '#1a0f00');
    g.addColorStop(0.5, '#0f0800');
    g.addColorStop(1, '#050300');
    return g;
  },
};

function getCinematicGrad(ctx, w, h, emotion) {
  const fn = CINEMATIC_GRADIENTS[emotion] || CINEMATIC_GRADIENTS.neutral;
  return fn(ctx, w, h);
}

// ── Animated Reel hook text (slide + fade) ──────────────────────────────
function drawReelHookText(ctx, W, H, content, t, palette) {
  const hooks = content.hookLines || (content.headline ? [content.headline] : []);
  if (!hooks.length) return;

  const hook  = hooks[Math.floor(t * 0.5) % hooks.length] || hooks[0];
  const enter = Math.min(1, t * 4);  // 0→1 in first 0.25 of t
  const fade  = t > 0.8 ? Math.max(0, 1 - (t - 0.8) * 5) : 1;

  ctx.save();
  ctx.globalAlpha = enter * fade;
  ctx.translate(0, 40 * (1 - enter));

  // Hook pill background
  const pillW = W * 0.85;
  const pillH = 80;
  const pillX = (W - pillW) / 2;
  const pillY = H * 0.12;
  roundRect(ctx, pillX, pillY, pillW, pillH, 16);
  ctx.fillStyle = palette.accent + '33';
  ctx.fill();
  ctx.strokeStyle = palette.accent + '88';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hook label
  ctx.font = `bold 22px Arial`;
  ctx.fillStyle = palette.accent;
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur  = 12;
  ctx.fillText('🔥 ' + (content.hookLabel || 'ব্রেকিং'), W / 2, pillY + pillH / 2);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── Audience-aware caption hook variants ────────────────────────────────
export function generateCaptionHooks(content) {
  const headline = content.headline || '';
  const emotion  = content.emotion  || 'neutral';
  const palette  = PALETTES[emotion] || PALETTES.neutral;

  const emotionEmoji = {
    urgent:       '🚨', breaking: '📢', sad: '💔',
    positive:     '✅', angry: '😡', neutral: '📌',
    informative:  '📊', motivational: '💪',
  };
  const emo = emotionEmoji[emotion] || '📢';

  // Hook 1: Curiosity-driven (first-comment engagement)
  const hook1 = [
    `${emo} ${headline}`,
    ``,
    `👇 আপনার মতামত কমেন্টে জানান — এটি কি সত্যিই সম্ভব?`,
    ``,
    `#JOAF #জুলাইফোরাম #বাংলাদেশ`,
  ].join('\n');

  // Hook 2: Community challenge
  const hook2 = [
    `💬 কথা বলুন, পরিবর্তন আনুন`,
    ``,
    headline,
    ``,
    `এই বিষয়ে আপনি কী মনে করেন? প্রথম কমেন্ট করুন 👇`,
    ``,
    `#JOAF #সক্রিয়নাগরিক`,
  ].join('\n');

  // Hook 3: Poll-style engagement
  const hook3 = [
    `🗳️ আপনার ভোট দিন!`,
    ``,
    headline,
    ``,
    `✅ সহমত হলে 👍  |  ❌ দ্বিমত হলে 👎`,
    `👇 কমেন্টে কারণ বলুন`,
    ``,
    `#JOAF #জনমত`,
  ].join('\n');

  return [
    { label: 'কৌতূহল-চালিত (Curiosity)', text: hook1 },
    { label: 'কমিউনিটি চ্যালেঞ্জ', text: hook2 },
    { label: 'পোল-স্টাইল এনগেজমেন্ট', text: hook3 },
  ];
}

// ── Viral Prediction with fb_analytics momentum scoring ─────────────────
export async function computeViralScore(content, appwriteEndpoint, appwriteProject) {
  // Heuristic base score
  const baseScore = (() => {
    const emotionScore = { breaking: 85, urgent: 80, angry: 75, sad: 65, motivational: 70, positive: 60, informative: 55, neutral: 50 };
    let s = emotionScore[content.emotion] || 50;
    if (content.headline && content.headline.length > 40)  s += 5;
    if (content.imageUrl)  s += 10;
    if (content.highlightWords && content.highlightWords.length > 0) s += 5;
    return Math.min(100, s);
  })();

  // Try to pull momentum from fb_analytics
  try {
    const { Client, Databases, Query } = await import('https://cdn.jsdelivr.net/npm/appwrite@13.0.1/+esm');
    const client = new Client().setEndpoint(appwriteEndpoint).setProject(appwriteProject);
    const db     = new Databases(client);

    const dbId = globalThis.JOAF_CONFIG?.databaseId || 'joaf';
    const result = await db.listDocuments(dbId, 'fb_analytics', [
      Query.equal('content_emotion', content.emotion || 'neutral'),
      Query.orderDesc('posted_at'),
      Query.limit(10),
    ]);

    if (result.documents.length >= 3) {
      const avgActual = result.documents.reduce((sum, d) => sum + (d.actual_score || 0), 0) / result.documents.length;
      const avgDelta  = result.documents.reduce((sum, d) => sum + (d.score_delta || 0), 0) / result.documents.length;

      // Momentum: blend heuristic with DB-calibrated score
      const momentum   = avgActual * 0.6 + baseScore * 0.4 + avgDelta * 0.2;
      const engagement = Math.min(100, Math.max(0, Math.round(momentum)));

      return {
        viralScore:        engagement,
        engagementPotential: engagement,
        momentum:          Math.round(avgActual),
        calibrationDelta:  Math.round(avgDelta),
        source:            'fb_analytics',
        sampleSize:        result.documents.length,
      };
    }
  } catch { /* fallback to heuristic */ }

  return {
    viralScore:        baseScore,
    engagementPotential: baseScore,
    source:            'heuristic',
    sampleSize:        0,
  };
}

// ── Main render API ──────────────────────────────────────────────────────

/**
 * Render a news card to canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} content — MasterContentObject
 * @param {string} platform — 'reel' | 'feed_4_5' | 'square'
 * @param {HTMLImageElement|null} bgImage
 * @param {object|null} dims — optional custom dimensions override
 */
export async function renderCard(canvas, content, platform = 'feed_4_5', bgImage = null, dims = null) {
  const allDims  = dims || _cachedDims || DEFAULT_DIMS;
  const platDims = allDims[platform] || allDims.feed_4_5;
  const W = platDims.w;
  const H = platDims.h;

  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  drawNewsCard(ctx, W, H, content, bgImage);
}

/**
 * Render a Reel frame with cinematic gradient + animated hook.
 * @param {HTMLCanvasElement} canvas
 * @param {object} scene
 * @param {object} content
 * @param {number} t — animation progress 0..1
 * @param {HTMLImageElement|null} bgImage
 * @param {object|null} dims
 */
export async function renderReel(canvas, scene, content, t = 0, bgImage = null, dims = null) {
  const allDims  = dims || _cachedDims || DEFAULT_DIMS;
  const W = allDims.reel.w;
  const H = allDims.reel.h;

  canvas.width  = W;
  canvas.height = H;

  const ctx     = canvas.getContext('2d');
  const palette = PALETTES[scene.mood || content.emotion] || PALETTES.urgent;

  // Cinematic gradient background
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${0.55 + 0.2 * (1 - t)})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = getCinematicGrad(ctx, W, H, content.emotion || 'urgent');
    ctx.fillRect(0, 0, W, H);
    drawCornerDecor(ctx, W, H, palette);
  }

  // Top accent bar
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, W, 6);

  // Animated hook
  drawReelHookText(ctx, W, H, content, t, palette);

  // Main reel frame content
  drawReelFrame(ctx, W, H, scene, content, t, null); // pass null bgImage to avoid double-draw

  // Bottom brand bar
  drawBrandBar(ctx, W, H, palette);
}

export { DEFAULT_DIMS as CANVAS_DIMS };
