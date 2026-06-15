// Appwrite Function: joaf-image-gen
// Runtime: node-18.0
// Purpose: Professional image card generator for JOAF
// Uses @napi-rs/canvas for server-side Bengali font rendering
// Returns: Cloudinary CDN URL of generated JPG
//
// Input (POST body):
// {
//   headline: string,        (min 10, max 80 chars)
//   body: string,            (min 30, max 300 chars)
//   badge_type: string,      (42 badge types)
//   theme: string,           (optional, auto from badge_type)
//   photo_url: string,       (optional, RSS or upload)
//   ratio: "1:1"|"16:9"|"9:16"|"4:5",
//   watermark_mode: "overlay"|"detect"|"none",
//   source_name: string,     (optional)
//   format: string,          (optional, for theme auto-pick)
// }

import { createCanvas, loadImage, registerFont, GlobalFonts } from '@napi-rs/canvas';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const AW_KEY      = process.env.APPWRITE_API_KEY  || process.env.AW_KEY      || '';
const AW_PROJECT  = process.env.APPWRITE_PROJECT_ID || process.env.AW_PROJECT || '6a11b6cd000b59f318eb';
const AW_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.AW_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const CDN_CLOUD   = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD  || 'dou71pfe1';
const CDN_PRESET  = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_PRESET || 'kf483px5';
const BUCKET_ID   = 'fb_media';

// ── Register Bengali Fonts ─────────────────────────────────────────────────
// Fonts are bundled with the function in /fonts/ directory
// Download from: https://fonts.google.com/noto/specimen/Noto+Serif+Bengali
const FONT_DIR = path.join(__dirname, 'fonts');

function registerFonts() {
  const fonts = [
    { path: 'NotoSerifBengali-Bold.ttf',    family: 'NotoSerifBengali',   weight: 'bold' },
    { path: 'NotoSerifBengali-Regular.ttf', family: 'NotoSerifBengali',   weight: 'regular' },
    { path: 'HindSiliguri-Bold.ttf',        family: 'HindSiliguri',       weight: 'bold' },
    { path: 'HindSiliguri-Regular.ttf',     family: 'HindSiliguri',       weight: 'regular' },
    { path: 'HindSiliguri-SemiBold.ttf',    family: 'HindSiliguri',       weight: '600' },
  ];
  for (const f of fonts) {
    const fp = path.join(FONT_DIR, f.path);
    if (fs.existsSync(fp)) {
      GlobalFonts.registerFromPath(fp, f.family);
    }
  }
}

// ── 42 Badge Types ───────────────────────────────────────────────────────────
const BADGE_MAP = {
  // NEWS
  breaking_news:        { emoji: '🔴', text: 'ব্রেকিং নিউজ',       theme: 'breaking_red' },
  latest_news:          { emoji: '📰', text: 'সর্বশেষ সংবাদ',      theme: 'news_blue' },
  urgent_news:          { emoji: '⚡', text: 'জরুরি সংবাদ',        theme: 'breaking_red' },
  alert:                { emoji: '🚨', text: 'সতর্কতা',             theme: 'breaking_red' },
  live_update:          { emoji: '📡', text: 'লাইভ আপডেট',        theme: 'news_blue' },
  special_notice:       { emoji: '🔔', text: 'বিশেষ বিজ্ঞপ্তি',   theme: 'civic_gold' },
  announcement:         { emoji: '📢', text: 'ঘোষণা',              theme: 'civic_gold' },
  // CIVIC & RIGHTS
  civic_rights:         { emoji: '⚖️', text: 'নাগরিক অধিকার',     theme: 'civic_purple' },
  democracy:            { emoji: '🏛️', text: 'গণতন্ত্র',            theme: 'civic_purple' },
  constitution:         { emoji: '📜', text: 'সংবিধান',            theme: 'civic_purple' },
  election:             { emoji: '🗳️', text: 'নির্বাচন',           theme: 'civic_gold' },
  public_interest:      { emoji: '🤝', text: 'জনস্বার্থ',          theme: 'civic_purple' },
  legal_protection:     { emoji: '🛡️', text: 'আইনি সুরক্ষা',     theme: 'civic_purple' },
  resistance:           { emoji: '✊', text: 'প্রতিরোধ',           theme: 'breaking_red' },
  // HISTORY & EDUCATION
  history:              { emoji: '📜', text: 'ইতিহাস',             theme: 'history_orange' },
  education:            { emoji: '🎓', text: 'শিক্ষা',             theme: 'education_green' },
  did_you_know:         { emoji: '💡', text: 'আপনি কি জানেন',      theme: 'news_blue' },
  fact_check:           { emoji: '🔍', text: 'তথ্য যাচাই',         theme: 'civic_gold' },
  statistics:           { emoji: '📊', text: 'তথ্য ও পরিসংখ্যান', theme: 'news_blue' },
  today_in_history:     { emoji: '🗓️', text: 'আজকের ইতিহাস',     theme: 'history_orange' },
  knowledge:            { emoji: '🧠', text: 'জ্ঞান',              theme: 'education_green' },
  // AWARENESS & COMMUNITY
  awareness:            { emoji: '📢', text: 'সচেতনতা',           theme: 'awareness_teal' },
  environment:          { emoji: '🌱', text: 'পরিবেশ',            theme: 'education_green' },
  humanity:             { emoji: '❤️', text: 'মানবতা',             theme: 'quote_pink' },
  health:               { emoji: '🩺', text: 'স্বাস্থ্য',          theme: 'awareness_teal' },
  family:               { emoji: '👨‍👩‍👧', text: 'পরিবার',            theme: 'quote_pink' },
  society:              { emoji: '🏘️', text: 'সমাজ',              theme: 'education_green' },
  economy:              { emoji: '💰', text: 'অর্থনীতি',          theme: 'civic_gold' },
  // ENGAGEMENT & VIRAL
  your_opinion:         { emoji: '🗣️', text: 'আপনার মতামত',      theme: 'engagement_green' },
  discussion:           { emoji: '💬', text: 'আলোচনা করুন',       theme: 'engagement_green' },
  trending:             { emoji: '🔥', text: 'ট্রেন্ডিং',          theme: 'breaking_red' },
  amazing_fact:         { emoji: '😲', text: 'অবাক করা তথ্য',    theme: 'news_blue' },
  myth_vs_fact:         { emoji: '⚠️', text: 'সত্য নাকি মিথ্যা', theme: 'civic_gold' },
  international:        { emoji: '🌍', text: 'আন্তর্জাতিক',       theme: 'news_blue' },
  bangladesh:           { emoji: '🇧🇩', text: 'বাংলাদেশ',         theme: 'breaking_red' },
  // JOAF SPECIFIC
  joaf_report:          { emoji: '📋', text: 'JOAF রিপোর্ট',      theme: 'news_blue' },
  joaf_press:           { emoji: '🗞️', text: 'JOAF প্রেস বিজ্ঞপ্তি', theme: 'civic_gold' },
  joaf_analysis:        { emoji: '🔬', text: 'JOAF বিশ্লেষণ',    theme: 'civic_purple' },
  joaf_opinion:         { emoji: '💭', text: 'JOAF মতামত',        theme: 'quote_pink' },
  joaf_exclusive:       { emoji: '⭐', text: 'JOAF এক্সক্লুসিভ',  theme: 'breaking_red' },
  youth_voice:          { emoji: '👊', text: 'তরুণ প্রজন্ম',      theme: 'engagement_green' },
  reel_script:          { emoji: '🎬', text: 'রিল স্ক্রিপ্ট',    theme: 'civic_purple' },
};

// ── 8 Professional Themes ─────────────────────────────────────────────────────
const THEMES = {
  breaking_red: {
    bg: [{ pos: 0, color: '#0a0000' }, { pos: 1, color: '#1a0000' }],
    accent: '#ef4444', accent2: '#dc2626',
    text: '#ffffff', sub: '#fecaca', dim: 'rgba(239,68,68,0.12)',
  },
  news_blue: {
    bg: [{ pos: 0, color: '#030712' }, { pos: 1, color: '#0f172a' }],
    accent: '#38bdf8', accent2: '#0284c7',
    text: '#ffffff', sub: '#bae6fd', dim: 'rgba(56,189,248,0.10)',
  },
  civic_gold: {
    bg: [{ pos: 0, color: '#070710' }, { pos: 1, color: '#1a1500' }],
    accent: '#f5c518', accent2: '#d97706',
    text: '#ffffff', sub: '#fde68a', dim: 'rgba(245,197,24,0.10)',
  },
  civic_purple: {
    bg: [{ pos: 0, color: '#0f0a1e' }, { pos: 1, color: '#1a1035' }],
    accent: '#a78bfa', accent2: '#7c3aed',
    text: '#ffffff', sub: '#ede9fe', dim: 'rgba(167,139,250,0.10)',
  },
  history_orange: {
    bg: [{ pos: 0, color: '#1a0a00' }, { pos: 1, color: '#2d1500' }],
    accent: '#f97316', accent2: '#ea580c',
    text: '#ffffff', sub: '#fed7aa', dim: 'rgba(249,115,22,0.10)',
  },
  education_green: {
    bg: [{ pos: 0, color: '#052e16' }, { pos: 1, color: '#064e24' }],
    accent: '#22c55e', accent2: '#16a34a',
    text: '#ffffff', sub: '#bbf7d0', dim: 'rgba(34,197,94,0.10)',
  },
  awareness_teal: {
    bg: [{ pos: 0, color: '#001a1a' }, { pos: 1, color: '#002020' }],
    accent: '#00d4aa', accent2: '#00b894',
    text: '#ffffff', sub: '#ccfbf1', dim: 'rgba(0,212,170,0.10)',
  },
  engagement_green: {
    bg: [{ pos: 0, color: '#0f172a' }, { pos: 1, color: '#1e293b' }],
    accent: '#34d399', accent2: '#059669',
    text: '#ffffff', sub: '#a7f3d0', dim: 'rgba(52,211,153,0.10)',
  },
  quote_pink: {
    bg: [{ pos: 0, color: '#0d0118' }, { pos: 1, color: '#1a0030' }],
    accent: '#e879f9', accent2: '#a21caf',
    text: '#ffffff', sub: '#f5d0fe', dim: 'rgba(232,121,249,0.10)',
  },
};

// Format → badge_type auto mapping
const FORMAT_BADGE_MAP = {
  breaking_news: 'breaking_news', news_summary: 'latest_news', fact_check: 'fact_check',
  civic_rights: 'civic_rights', constitution_fact: 'constitution', bangladesh_history: 'history',
  this_day_history: 'today_in_history', quote_card: 'joaf_opinion', poll_post: 'your_opinion',
  question_post: 'discussion', did_you_know: 'did_you_know', myth_vs_fact: 'myth_vs_fact',
  timeline: 'history', educational: 'education', learning_engine: 'knowledge',
  press_release_summary: 'joaf_press', data_insight: 'statistics', statistic_post: 'statistics',
  awareness_post: 'awareness', international_news: 'international', local_district: 'bangladesh',
  youth_engagement: 'youth_voice', comment_debate: 'discussion', community_question: 'your_opinion',
  image_quote: 'joaf_opinion', carousel_post: 'joaf_report', infographic: 'statistics',
  reel_script: 'reel_script', ai_opinion: 'joaf_analysis', civic_knowledge: 'civic_rights',
};

// ── Canvas helpers ────────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    const { width } = ctx.measureText(test);
    if (width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
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

// ── Main canvas renderer ──────────────────────────────────────────────────────
async function renderCard({ headline, body, badge_type, theme_key, photo_url, ratio, source_name, watermark_mode }) {
  // Canvas dimensions
  const DIMS = {
    '1:1':  { w: 1080, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
    '9:16': { w: 1080, h: 1920 },
    '4:5':  { w: 1080, h: 1350 },
  };
  const { w: W, h: H } = DIMS[ratio] || DIMS['1:1'];

  const badge  = BADGE_MAP[badge_type] || BADGE_MAP['joaf_report'];
  const theme  = THEMES[theme_key || badge.theme] || THEMES['news_blue'];
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── LAYER 1: Background ──────────────────────────────────────────────────
  if (photo_url) {
    try {
      const img = await loadImage(photo_url);
      // Smart fill: cover the canvas
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);

      // Watermark handling
      if (watermark_mode === 'detect') {
        // Blur corner regions where logos typically appear
        const corners = [
          { x: 0, y: 0, w: W * 0.25, h: H * 0.15 },          // top-left
          { x: W * 0.75, y: 0, w: W * 0.25, h: H * 0.15 },   // top-right
          { x: 0, y: H * 0.85, w: W * 0.25, h: H * 0.15 },   // bottom-left
          { x: W * 0.75, y: H * 0.85, w: W * 0.25, h: H * 0.15 }, // bottom-right
        ];
        for (const c of corners) {
          ctx.save();
          ctx.filter = 'blur(18px)';
          ctx.drawImage(canvas, c.x, c.y, c.w, c.h, c.x, c.y, c.w, c.h);
          ctx.restore();
        }
      }

      // Dark gradient overlay — hides any remaining watermarks
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,    'rgba(0,0,0,0.55)');
      grad.addColorStop(0.35, 'rgba(0,0,0,0.20)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1,    'rgba(0,0,0,0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } catch {
      // Photo failed — use gradient theme
      drawGradientBg(ctx, W, H, theme);
    }
  } else {
    drawGradientBg(ctx, W, H, theme);
  }

  // ── LAYER 2: Decorative orbs (on gradient only) ───────────────────────
  if (!photo_url) {
    ctx.globalAlpha = 0.07;
    const orbGrad1 = ctx.createRadialGradient(W * 0.85, H * 0.2, 0, W * 0.85, H * 0.2, W * 0.35);
    orbGrad1.addColorStop(0, theme.accent);
    orbGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad1;
    ctx.fillRect(0, 0, W, H);

    const orbGrad2 = ctx.createRadialGradient(W * 0.15, H * 0.8, 0, W * 0.15, H * 0.8, W * 0.28);
    orbGrad2.addColorStop(0, theme.accent2);
    orbGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = orbGrad2;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ── LAYER 3: Top accent bar ───────────────────────────────────────────
  const topBarH = Math.round(H * 0.006);
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, theme.accent);
  topGrad.addColorStop(1, theme.accent2);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, topBarH);

  // ── LAYER 4: JOAF header bar ──────────────────────────────────────────
  const headerH = Math.round(H * 0.10);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, topBarH, W, headerH);

  const headerFontSize = Math.round(H * 0.040);
  ctx.font         = `bold ${headerFontSize}px HindSiliguri, NotoSerifBengali, sans-serif`;
  ctx.fillStyle    = theme.accent;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText('JOAF ⚡', W * 0.044, topBarH + headerH * 0.5);

  ctx.font      = `${Math.round(headerFontSize * 0.52)}px HindSiliguri, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('julyforum.com', W * 0.956, topBarH + headerH * 0.5);

  // ── LAYER 5: Badge ────────────────────────────────────────────────────
  const badgeFontSize = Math.round(H * 0.022);
  ctx.font = `bold ${badgeFontSize}px HindSiliguri, NotoSerifBengali, sans-serif`;
  const badgeText = `${badge.emoji}  ${badge.text}`;
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadX = W * 0.022;
  const badgePadY = H * 0.012;
  const badgeX = W * 0.044;
  const badgeY = topBarH + headerH + H * 0.025;
  const badgeW = badgeMetrics.width + badgePadX * 2;
  const badgeH = badgeFontSize + badgePadY * 2;

  ctx.fillStyle = theme.accent + 'dd';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH * 0.35);
  ctx.fill();

  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH * 0.5);

  // ── LAYER 6: Divider line ─────────────────────────────────────────────
  const divY = badgeY + badgeH + H * 0.025;
  const divGrad = ctx.createLinearGradient(W * 0.044, 0, W * 0.75, 0);
  divGrad.addColorStop(0, theme.accent);
  divGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = divGrad;
  ctx.fillRect(W * 0.044, divY, W * 0.7, 2);

  // ── LAYER 7: Headline ─────────────────────────────────────────────────
  const headlineY = divY + H * 0.035;
  const headlineFontSize = ratio === '9:16' ? Math.round(H * 0.046) : Math.round(H * 0.052);
  const headlineMaxW = W * 0.912;

  ctx.font         = `900 ${headlineFontSize}px NotoSerifBengali, HindSiliguri, sans-serif`;
  ctx.fillStyle    = theme.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor  = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur   = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  const headlineLines = wrapText(ctx, headline, headlineMaxW).slice(0, 3);
  const headlineLH    = headlineFontSize * 1.28;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, W * 0.044, headlineY + i * headlineLH);
  });
  ctx.shadowBlur = 0;

  // ── LAYER 8: Body text ────────────────────────────────────────────────
  const bodyStartY = headlineY + headlineLines.length * headlineLH + H * 0.022;
  const bodyFontSize = ratio === '9:16' ? Math.round(H * 0.026) : Math.round(H * 0.028);
  const bodyMaxW = W * 0.912;

  ctx.font      = `${bodyFontSize}px HindSiliguri, NotoSerifBengali, sans-serif`;
  ctx.fillStyle = theme.sub;
  const bodyLines = wrapText(ctx, body, bodyMaxW).slice(0, 4);
  const bodyLH = bodyFontSize * 1.55;
  bodyLines.forEach((line, i) => {
    ctx.fillText(line, W * 0.044, bodyStartY + i * bodyLH);
  });

  // ── LAYER 9: Bottom bar ───────────────────────────────────────────────
  const bottomBarH = Math.round(H * 0.115);
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, H - bottomBarH, W, bottomBarH);

  const bottomAccentH = 3;
  const btGrad = ctx.createLinearGradient(0, 0, W, 0);
  btGrad.addColorStop(0, theme.accent);
  btGrad.addColorStop(1, theme.accent2);
  ctx.fillStyle = btGrad;
  ctx.fillRect(0, H - bottomBarH, W, bottomAccentH);

  const btFontSize = Math.round(H * 0.022);
  ctx.font      = `bold ${btFontSize}px HindSiliguri, sans-serif`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const btHashtags = '#JOAF  #জুলাইফোরাম  #বাংলাদেশ';
  ctx.fillText(btHashtags, W * 0.5, H - bottomBarH + bottomAccentH + bottomBarH * 0.33);

  const btSubFont = Math.round(H * 0.018);
  ctx.font      = `${btSubFont}px HindSiliguri, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  const sourceStr = source_name ? `${source_name}  ·  julyforum.com` : 'julyforum.com  ·  জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম';
  ctx.fillText(sourceStr, W * 0.5, H - bottomBarH + bottomAccentH + bottomBarH * 0.70);

  return canvas.toBuffer('image/jpeg', { quality: 93 });
}

function drawGradientBg(ctx, W, H, theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  theme.bg.forEach(s => grad.addColorStop(s.pos, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ── Upload buffer to Cloudinary via Appwrite Storage temp ────────────────────
async function uploadImage(buffer, publicId) {
  const safeId = publicId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) + '_' + Date.now();

  // Step 1: Upload to Appwrite Storage
  const form = new FormData();
  form.append('fileId', 'unique()');
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), safeId + '.jpg');
  const upRes = await fetch(`${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!upRes.ok) throw new Error(`Storage upload: ${upRes.status}`);
  const upData = await upRes.json();
  const fileId = upData.$id;
  const fileUrl = `${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${AW_PROJECT}`;

  // Step 2: Cloudinary fetch from Appwrite URL
  const cdnParams = new URLSearchParams();
  cdnParams.set('file', fileUrl);
  cdnParams.set('upload_preset', CDN_PRESET);
  cdnParams.set('public_id', safeId);
  const cdnRes = await fetch(`https://api.cloudinary.com/v1_1/${CDN_CLOUD}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cdnParams.toString(),
    signal: AbortSignal.timeout(40000),
  });
  const cdnData = await cdnRes.json();

  // Step 3: Cleanup Appwrite temp file
  fetch(`${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}`, {
    method: 'DELETE',
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
  }).catch(() => {});

  if (cdnData.error) throw new Error(`Cloudinary: ${cdnData.error.message}`);
  return cdnData.secure_url.replace('/upload/', '/upload/f_jpg,q_92,w_1080/');
}

// ── Main export ───────────────────────────────────────────────────────────────
export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method === 'GET')
    return res.json({ ok: true, service: 'joaf-image-gen', badges: Object.keys(BADGE_MAP).length });

  try {
    registerFonts();

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return res.json({ ok: false, error: 'Invalid JSON body' }, 400); }

    const {
      headline = '',
      body: bodyText = '',
      badge_type = 'joaf_report',
      theme,
      photo_url = '',
      ratio = '1:1',
      watermark_mode = 'overlay',
      source_name = '',
      format = '',
      public_id_prefix = 'joaf_img',
    } = body;

    // ── Validation Gate ──────────────────────────────────────────────────
    const errors = [];
    if (!headline || headline.trim().length < 10)
      errors.push('headline minimum 10 characters');
    if (!bodyText || bodyText.trim().length < 30)
      errors.push('body minimum 30 characters');
    if (errors.length)
      return res.json({ ok: false, error: errors.join('; ') }, 422);

    // Auto badge from format if not provided
    const resolvedBadge = badge_type || FORMAT_BADGE_MAP[format] || 'joaf_report';
    const badge = BADGE_MAP[resolvedBadge] || BADGE_MAP['joaf_report'];
    const resolvedTheme = theme || badge.theme;

    log(`image-gen: badge=${resolvedBadge} theme=${resolvedTheme} ratio=${ratio}`);

    // ── Render ───────────────────────────────────────────────────────────
    const buffer = await renderCard({
      headline: headline.trim(),
      body: bodyText.trim(),
      badge_type: resolvedBadge,
      theme_key: resolvedTheme,
      photo_url: photo_url || '',
      ratio,
      source_name,
      watermark_mode,
    });

    log(`image-gen: rendered ${buffer.length} bytes`);

    // ── Upload ───────────────────────────────────────────────────────────
    const publicId = `${public_id_prefix}_${resolvedBadge}`;
    const cdnUrl = await uploadImage(buffer, publicId);

    log(`image-gen: uploaded → ${cdnUrl.slice(0, 60)}...`);

    return res.json({
      ok: true,
      url: cdnUrl,
      badge: resolvedBadge,
      theme: resolvedTheme,
      ratio,
      bytes: buffer.length,
    });

  } catch (e) {
    error(`image-gen error: ${e.message}`);
    return res.json({ ok: false, error: e.message }, 500);
  }
};
