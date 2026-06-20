// Appwrite Function: joaf-video-gen
// Runtime: node-18.0
// Purpose: Automated MP4 reel generator for JOAF Facebook pages
// Stack: @napi-rs/canvas (frames) + ffmpeg-static (encode) + fluent-ffmpeg
//
// Input (POST body):
// {
//   hook_text:       string  (0-3s text, min 10 chars)
//   body_text:       string  (3-22s text, min 20 chars)
//   cta_text:        string  (22-30s text, min 10 chars)
//   badge_type:      string  (42 badge types)
//   theme:           string  (optional, auto from badge)
//   photo_url:       string  (optional background)
//   animation_style: "slide"|"typewriter"|"ken_burns"
//   audio_style:     "emotional"|"upbeat"|"dramatic"|"none"
//   duration:        15|30|60
//   caption:         string  (FB post caption)
//   format:          string  (optional, for badge auto-pick)
// }
// Output: { ok, video_file_id, caption, duration }

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { createRequire }                          from 'module';
import path                                       from 'path';
import { fileURLToPath }                          from 'url';
import fs                                         from 'fs';
import os                                         from 'os';

const require    = createRequire(import.meta.url);
const __dirname  = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const AW_KEY      = process.env.APPWRITE_API_KEY     || process.env.AW_KEY      || '';
const AW_PROJECT  = process.env.APPWRITE_PROJECT_ID  || process.env.AW_PROJECT  || '6a11b6cd000b59f318eb';
const AW_ENDPOINT = process.env.APPWRITE_ENDPOINT    || process.env.AW_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const BUCKET_ID   = 'fb_media';

// ── Fonts ──────────────────────────────────────────────────────────────────
const FONT_DIR = path.join(__dirname, 'fonts');
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const fonts = [
    { path: 'NotoSerifBengali-Bold.ttf',    family: 'NotoSerifBengali' },
    { path: 'NotoSerifBengali-Regular.ttf', family: 'NotoSerifBengali' },
    { path: 'HindSiliguri-Bold.ttf',        family: 'HindSiliguri' },
    { path: 'HindSiliguri-Regular.ttf',     family: 'HindSiliguri' },
    { path: 'HindSiliguri-SemiBold.ttf',    family: 'HindSiliguri' },
  ];
  for (const f of fonts) {
    try {
      const fp = path.join(FONT_DIR, f.path);
      if (fs.existsSync(fp)) GlobalFonts.registerFromPath(fp, f.family);
    } catch (e) {
      console.error(`font registration failed for ${f.path}: ${e.message}`);
    }
  }
  fontsRegistered = true;
}

// ── Badge + Theme (same as image-gen) ─────────────────────────────────────
const BADGE_MAP = {
  breaking_news:    { emoji: '🔴', text: 'ব্রেকিং নিউজ',       theme: 'breaking_red' },
  latest_news:      { emoji: '📰', text: 'সর্বশেষ সংবাদ',      theme: 'news_blue' },
  urgent_news:      { emoji: '⚡', text: 'জরুরি সংবাদ',        theme: 'breaking_red' },
  alert:            { emoji: '🚨', text: 'সতর্কতা',             theme: 'breaking_red' },
  live_update:      { emoji: '📡', text: 'লাইভ আপডেট',        theme: 'news_blue' },
  announcement:     { emoji: '📢', text: 'ঘোষণা',              theme: 'civic_gold' },
  civic_rights:     { emoji: '⚖️', text: 'নাগরিক অধিকার',     theme: 'civic_purple' },
  democracy:        { emoji: '🏛️', text: 'গণতন্ত্র',            theme: 'civic_purple' },
  constitution:     { emoji: '📜', text: 'সংবিধান',            theme: 'civic_purple' },
  election:         { emoji: '🗳️', text: 'নির্বাচন',           theme: 'civic_gold' },
  history:          { emoji: '📜', text: 'ইতিহাস',             theme: 'history_orange' },
  education:        { emoji: '🎓', text: 'শিক্ষা',             theme: 'education_green' },
  did_you_know:     { emoji: '💡', text: 'আপনি কি জানেন',      theme: 'news_blue' },
  fact_check:       { emoji: '🔍', text: 'তথ্য যাচাই',         theme: 'civic_gold' },
  statistics:       { emoji: '📊', text: 'তথ্য ও পরিসংখ্যান', theme: 'news_blue' },
  today_in_history: { emoji: '🗓️', text: 'আজকের ইতিহাস',     theme: 'history_orange' },
  awareness:        { emoji: '📢', text: 'সচেতনতা',           theme: 'awareness_teal' },
  humanity:         { emoji: '❤️', text: 'মানবতা',             theme: 'quote_pink' },
  health:           { emoji: '🩺', text: 'স্বাস্থ্য',          theme: 'awareness_teal' },
  your_opinion:     { emoji: '🗣️', text: 'আপনার মতামত',      theme: 'engagement_green' },
  discussion:       { emoji: '💬', text: 'আলোচনা করুন',       theme: 'engagement_green' },
  trending:         { emoji: '🔥', text: 'ট্রেন্ডিং',          theme: 'breaking_red' },
  myth_vs_fact:     { emoji: '⚠️', text: 'সত্য নাকি মিথ্যা', theme: 'civic_gold' },
  international:    { emoji: '🌍', text: 'আন্তর্জাতিক',       theme: 'news_blue' },
  bangladesh:       { emoji: '🇧🇩', text: 'বাংলাদেশ',         theme: 'breaking_red' },
  joaf_report:      { emoji: '📋', text: 'JOAF রিপোর্ট',      theme: 'news_blue' },
  joaf_press:       { emoji: '🗞️', text: 'JOAF প্রেস বিজ্ঞপ্তি', theme: 'civic_gold' },
  joaf_analysis:    { emoji: '🔬', text: 'JOAF বিশ্লেষণ',    theme: 'civic_purple' },
  joaf_opinion:     { emoji: '💭', text: 'JOAF মতামত',        theme: 'quote_pink' },
  joaf_exclusive:   { emoji: '⭐', text: 'JOAF এক্সক্লুসিভ',  theme: 'breaking_red' },
  youth_voice:      { emoji: '👊', text: 'তরুণ প্রজন্ম',      theme: 'engagement_green' },
  reel_script:      { emoji: '🎬', text: 'রিল',               theme: 'civic_purple' },
  knowledge:        { emoji: '🧠', text: 'জ্ঞান',              theme: 'education_green' },
  environment:      { emoji: '🌱', text: 'পরিবেশ',            theme: 'education_green' },
  economy:          { emoji: '💰', text: 'অর্থনীতি',          theme: 'civic_gold' },
  society:          { emoji: '🏘️', text: 'সমাজ',              theme: 'education_green' },
  public_interest:  { emoji: '🤝', text: 'জনস্বার্থ',          theme: 'civic_purple' },
  resistance:       { emoji: '✊', text: 'প্রতিরোধ',           theme: 'breaking_red' },
  special_notice:   { emoji: '🔔', text: 'বিশেষ বিজ্ঞপ্তি',   theme: 'civic_gold' },
  amazing_fact:     { emoji: '😲', text: 'অবাক করা তথ্য',    theme: 'news_blue' },
  legal_protection: { emoji: '🛡️', text: 'আইনি সুরক্ষা',     theme: 'civic_purple' },
  live_feed:        { emoji: '🔴', text: 'লাইভ',              theme: 'breaking_red' },
};

const THEMES = {
  breaking_red:     { bg: ['#0a0000','#1a0000'], accent: '#ef4444', accent2: '#dc2626', text: '#fff', sub: '#fecaca' },
  news_blue:        { bg: ['#030712','#0f172a'], accent: '#38bdf8', accent2: '#0284c7', text: '#fff', sub: '#bae6fd' },
  civic_gold:       { bg: ['#070710','#1a1500'], accent: '#f5c518', accent2: '#d97706', text: '#fff', sub: '#fde68a' },
  civic_purple:     { bg: ['#0f0a1e','#1a1035'], accent: '#a78bfa', accent2: '#7c3aed', text: '#fff', sub: '#ede9fe' },
  history_orange:   { bg: ['#1a0a00','#2d1500'], accent: '#f97316', accent2: '#ea580c', text: '#fff', sub: '#fed7aa' },
  education_green:  { bg: ['#052e16','#064e24'], accent: '#22c55e', accent2: '#16a34a', text: '#fff', sub: '#bbf7d0' },
  awareness_teal:   { bg: ['#001a1a','#002020'], accent: '#00d4aa', accent2: '#00b894', text: '#fff', sub: '#ccfbf1' },
  engagement_green: { bg: ['#0f172a','#1e293b'], accent: '#34d399', accent2: '#059669', text: '#fff', sub: '#a7f3d0' },
  quote_pink:       { bg: ['#0d0118','#1a0030'], accent: '#e879f9', accent2: '#a21caf', text: '#fff', sub: '#f5d0fe' },
};

// ── Easing ─────────────────────────────────────────────────────────────────
const ease = {
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  outQuad:   t => 1 - (1 - t) * (1 - t),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  linear:    t => t,
};

// ── Text wrap ──────────────────────────────────────────────────────────────
function wrapText(ctx, text, maxW) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Draw one frame ─────────────────────────────────────────────────────────
function drawFrame(ctx, W, H, frameNum, totalFrames, data, photoImg) {
  const { hook_text, body_text, cta_text, badge, theme, animation_style, duration } = data;

  const FPS          = 30;
  const hookEnd      = 3 * FPS;
  const bodyEnd      = Math.round((duration - 8) * FPS);
  const ctaStart     = bodyEnd;
  const ctaEnd       = totalFrames;
  const progress     = frameNum / totalFrames;

  // ── Background ─────────────────────────────────────────────────────────
  if (photoImg) {
    // Ken Burns: slow zoom from 100% to 108%
    const zoom = 1 + progress * 0.08;
    const sw = W * zoom;
    const sh = H * zoom;
    const scale = Math.max(sw / photoImg.width, sh / photoImg.height);
    const iw = photoImg.width * scale;
    const ih = photoImg.height * scale;
    const ox = (W - iw) / 2 - (sw - W) / 2;
    const oy = (H - ih) / 2 - (sh - H) / 2;
    ctx.drawImage(photoImg, ox, oy, iw, ih);

    // Overlay darkens progressively
    const overlayAlpha = frameNum < hookEnd
      ? 0.45 + (frameNum / hookEnd) * 0.10
      : 0.55;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    `rgba(0,0,0,${overlayAlpha})`);
    grad.addColorStop(0.5,  `rgba(0,0,0,${overlayAlpha * 0.7})`);
    grad.addColorStop(1,    `rgba(0,0,0,${overlayAlpha + 0.25})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Gradient background with subtle pulse
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const pulse = Math.sin(frameNum * 0.04) * 0.015;
    grad.addColorStop(0, theme.bg[0]);
    grad.addColorStop(1, theme.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Orb glow
    ctx.globalAlpha = 0.06 + pulse;
    const orb = ctx.createRadialGradient(W * 0.8, H * 0.25, 0, W * 0.8, H * 0.25, W * 0.4);
    orb.addColorStop(0, theme.accent);
    orb.addColorStop(1, 'transparent');
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ── CTA transition overlay ─────────────────────────────────────────────
  if (frameNum >= ctaStart) {
    const t = Math.min((frameNum - ctaStart) / (15 * 30 / duration), 1);
    const alpha = ease.inOutSine(t) * 0.6;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Top accent bar ─────────────────────────────────────────────────────
  const barH = 6;
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, theme.accent);
  barGrad.addColorStop(1, theme.accent2);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, W, barH);

  // ── JOAF header ────────────────────────────────────────────────────────
  const headerH = 90;
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(0, barH, W, headerH);

  ctx.font         = `bold 44px HindSiliguri, NotoSerifBengali, sans-serif`;
  ctx.fillStyle    = theme.accent;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';
  ctx.fillText('JOAF ⚡', 48, barH + headerH * 0.5);

  ctx.font      = `24px HindSiliguri, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.textAlign = 'right';
  ctx.fillText('julyforum.com', W - 48, barH + headerH * 0.5);

  // ── Badge ──────────────────────────────────────────────────────────────
  const badgeFadeIn = Math.min(frameNum / 20, 1);
  ctx.globalAlpha  = badgeFadeIn;
  const badgeText  = `${badge.emoji}  ${badge.text}`;
  ctx.font         = `bold 32px HindSiliguri, NotoSerifBengali, sans-serif`;
  const bm         = ctx.measureText(badgeText);
  const bPadX      = 28; const bPadY = 16;
  const bX         = 48; const bY = barH + headerH + 30;
  const bW         = bm.width + bPadX * 2;
  const bH         = 32 + bPadY * 2;

  ctx.fillStyle = theme.accent + 'cc';
  ctx.beginPath();
  ctx.roundRect(bX, bY, bW, bH, bH * 0.4);
  ctx.fill();
  ctx.fillStyle    = '#fff';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, bX + bPadX, bY + bH * 0.5);
  ctx.globalAlpha  = 1;

  // ── Main content area ──────────────────────────────────────────────────
  const contentY = bY + bH + 40;
  const maxW     = W - 96;

  // HOOK segment
  if (frameNum < bodyEnd) {
    let hookAlpha = 1;
    let hookOffsetY = 0;

    if (animation_style === 'slide') {
      if (frameNum < hookEnd) {
        const t = Math.min(frameNum / 25, 1);
        hookOffsetY = (1 - ease.outCubic(t)) * 80;
      } else {
        // fade out as body takes over
        const t = Math.min((frameNum - hookEnd) / 20, 1);
        hookAlpha = 1 - t * 0.5;
      }
    } else if (animation_style === 'typewriter') {
      hookOffsetY = 0;
    } else {
      // ken_burns
      const t = Math.min(frameNum / 30, 1);
      hookAlpha = ease.outQuad(t);
    }

    ctx.globalAlpha = hookAlpha;
    ctx.font         = `900 ${frameNum < hookEnd ? 72 : 60}px NotoSerifBengali, HindSiliguri, sans-serif`;
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 12;

    const hookLines = wrapText(ctx, hook_text, maxW).slice(0, 3);
    const hookLH    = (frameNum < hookEnd ? 72 : 60) * 1.3;
    hookLines.forEach((line, i) => {
      let charsToDraw = line;
      if (animation_style === 'typewriter' && frameNum < hookEnd) {
        const totalChars = hookLines.join('').length;
        const charsShown = Math.floor((frameNum / hookEnd) * totalChars * 1.2);
        const charsBefore = hookLines.slice(0, i).join('').length;
        charsToDraw = line.slice(0, Math.max(0, charsShown - charsBefore));
      }
      ctx.fillText(charsToDraw, 48, contentY + hookOffsetY + i * hookLH);
    });
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  // BODY segment
  if (frameNum >= hookEnd && frameNum < ctaStart) {
    const bodyProgress = (frameNum - hookEnd) / (bodyEnd - hookEnd);

    let bodyAlpha = 1;
    if (animation_style === 'slide') {
      const tIn = Math.min((frameNum - hookEnd) / 20, 1);
      bodyAlpha  = ease.outQuad(tIn);
    }

    ctx.globalAlpha  = bodyAlpha;
    ctx.font         = `${bodyProgress < 0.1 ? Math.round(48 + (1 - bodyProgress / 0.1) * 10) : 48}px HindSiliguri, NotoSerifBengali, sans-serif`;
    ctx.fillStyle    = '#f0f0f0';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur   = 8;

    const bodyLines = wrapText(ctx, body_text, maxW).slice(0, 6);
    const bodyLH    = 52 * 1.5;

    if (animation_style === 'typewriter') {
      const totalChars = body_text.length;
      const charsShown = Math.floor(bodyProgress * totalChars * 1.1);
      let shown = 0;
      bodyLines.forEach((line, i) => {
        const lineCut = line.slice(0, Math.max(0, charsShown - shown));
        ctx.fillText(lineCut, 48, contentY + i * bodyLH);
        shown += line.length;
      });
    } else {
      bodyLines.forEach((line, i) => ctx.fillText(line, 48, contentY + i * bodyLH));
    }
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  // CTA segment
  if (frameNum >= ctaStart) {
    const t = Math.min((frameNum - ctaStart) / 20, 1);

    // JOAF logo scale-up effect
    const logoScale = 0.85 + ease.outCubic(t) * 0.15;
    const logoSize  = 120 * logoScale;
    const logoCX    = W / 2 - logoSize / 2;
    const logoCY    = H * 0.32;

    // Logo placeholder circle
    ctx.globalAlpha = ease.outQuad(t);
    ctx.fillStyle   = theme.accent;
    ctx.beginPath();
    ctx.arc(W / 2, logoCY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle    = '#000';
    ctx.font         = `bold ${Math.round(logoSize * 0.35)}px HindSiliguri, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JOAF', W / 2, logoCY + logoSize / 2);
    ctx.globalAlpha  = 1;

    // CTA text
    const ctaAlpha = ease.outCubic(Math.min((frameNum - ctaStart) / 25, 1));
    ctx.globalAlpha  = ctaAlpha;
    ctx.font         = `bold 52px NotoSerifBengali, HindSiliguri, sans-serif`;
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 10;

    const ctaLines = wrapText(ctx, cta_text, maxW).slice(0, 2);
    const ctaStartY = logoCY + logoSize + 40;
    ctaLines.forEach((line, i) => ctx.fillText(line, W / 2, ctaStartY + i * 64));

    ctx.font      = `30px HindSiliguri, sans-serif`;
    ctx.fillStyle = theme.accent;
    ctx.shadowBlur = 0;
    ctx.fillText('julyforum.com', W / 2, ctaStartY + ctaLines.length * 64 + 30);
    ctx.globalAlpha = 1;
  }

  // ── Progress bar (bottom) ──────────────────────────────────────────────
  const pbH  = 6;
  const pbY  = H - 100;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(48, pbY, W - 96, pbH);

  const pbFill = ctx.createLinearGradient(48, 0, W - 48, 0);
  pbFill.addColorStop(0, theme.accent);
  pbFill.addColorStop(1, theme.accent2);
  ctx.fillStyle = pbFill;
  ctx.beginPath();
  ctx.roundRect(48, pbY, (W - 96) * progress, pbH, 3);
  ctx.fill();

  // ── Bottom bar ─────────────────────────────────────────────────────────
  const bbH = 80;
  ctx.fillStyle = 'rgba(0,0,0,0.70)';
  ctx.fillRect(0, H - bbH, W, bbH);

  ctx.font      = `bold 26px HindSiliguri, sans-serif`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('#JOAF  #জুলাইফোরাম  #বাংলাদেশ', W / 2, H - bbH * 0.5);
}

// ── ffmpeg encode ──────────────────────────────────────────────────────────
async function encodeVideo(framesDir, outputPath, FPS, audioPath, log) {
  const ffmpegPath = require('ffmpeg-static');
  const { default: ffmpeg } = await import('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegPath);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg()
      .input(path.join(framesDir, 'frame_%04d.jpg'))
      .inputFPS(FPS)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-crf 22',
        '-preset fast',
        '-movflags +faststart',
        '-vf scale=1080:1920',
      ]);

    if (audioPath && fs.existsSync(audioPath)) {
      cmd = cmd.input(audioPath)
               .outputOptions(['-c:a aac', '-b:a 128k', '-shortest']);
    }

    cmd.output(outputPath)
       .on('end', () => { log('encode: done'); resolve(); })
       .on('error', (err) => { log('encode err: ' + err.message); reject(err); })
       .run();
  });
}

// ── Upload MP4 to Appwrite Storage ─────────────────────────────────────────
async function uploadVideo(filePath, log) {
  const buffer  = fs.readFileSync(filePath);
  const fileId  = 'vid_' + Date.now();
  const form    = new FormData();
  form.append('fileId', fileId);
  form.append('file', new Blob([buffer], { type: 'video/mp4' }), fileId + '.mp4');

  const res = await fetch(`${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage video upload failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  log(`upload: fileId=${data.$id} size=${buffer.length}`);
  return data.$id;
}

// ── Cleanup temp dir ───────────────────────────────────────────────────────
function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// ── Main export ────────────────────────────────────────────────────────────
export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method === 'GET')
    return res.json({ ok: true, service: 'joaf-video-gen', badges: Object.keys(BADGE_MAP).length });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joaf_vid_'));
  log(`tmpDir: ${tmpDir}`);

  try {
    registerFonts();

    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return res.json({ ok: false, error: 'Invalid JSON' }, 400); }

    const {
      hook_text        = '',
      body_text        = '',
      cta_text         = '',
      badge_type       = 'reel_script',
      theme: themeKey,
      photo_url        = '',
      animation_style  = 'slide',
      audio_style      = 'emotional',
      duration         = 30,
      format           = '',
    } = body;

    // ── Validation ─────────────────────────────────────────────────────
    const errs = [];
    if (!hook_text  || hook_text.trim().length  < 10) errs.push('hook_text min 10 chars');
    if (!body_text  || body_text.trim().length  < 20) errs.push('body_text min 20 chars');
    if (!cta_text   || cta_text.trim().length   < 10) errs.push('cta_text min 10 chars');
    if (errs.length) return res.json({ ok: false, error: errs.join('; ') }, 422);

    const FPS         = 30;
    const totalFrames = duration * FPS;
    const badge       = BADGE_MAP[badge_type] || BADGE_MAP['reel_script'];
    const theme       = THEMES[themeKey || badge.theme] || THEMES['news_blue'];

    // Load background photo if provided
    let photoImg = null;
    if (photo_url) {
      try { photoImg = await loadImage(photo_url); }
      catch { log('photo load failed, using gradient'); }
    }

    const frameData = {
      hook_text: hook_text.trim(),
      body_text: body_text.trim(),
      cta_text:  cta_text.trim(),
      badge, theme, animation_style, duration,
    };

    // ── Frame generation ───────────────────────────────────────────────
    log(`generating ${totalFrames} frames @ ${FPS}fps ...`);
    const t0 = Date.now();

    for (let f = 0; f < totalFrames; f++) {
      const canvas = createCanvas(1080, 1920);
      const ctx    = canvas.getContext('2d');
      drawFrame(ctx, 1080, 1920, f, totalFrames, frameData, photoImg);
      const jpgBuf = canvas.toBuffer('image/jpeg', { quality: 88 });
      const fname  = path.join(tmpDir, `frame_${String(f).padStart(4, '0')}.jpg`);
      fs.writeFileSync(fname, jpgBuf);
    }

    log(`frames done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    // ── Audio ──────────────────────────────────────────────────────────
    // Guard against placeholder/invalid audio files (must be real MP3, >10KB)
    const audioDir  = path.join(__dirname, 'audio');
    let audioFile = null;
    if (audio_style !== 'none') {
      const candidate = path.join(audioDir, `${audio_style}.mp3`);
      try {
        const stat = fs.statSync(candidate);
        if (stat.size > 10000) {
          audioFile = candidate;
        } else {
          log(`audio file too small (${stat.size} bytes) — placeholder detected, skipping audio`);
        }
      } catch {
        log('audio file not found — skipping audio');
      }
    }

    // ── Encode ─────────────────────────────────────────────────────────
    const outputPath = path.join(tmpDir, 'output.mp4');
    const t1 = Date.now();
    await encodeVideo(tmpDir, outputPath, FPS, audioFile, log);
    log(`encode done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

    // ── Upload ─────────────────────────────────────────────────────────
    const videoFileId = await uploadVideo(outputPath, log);

    cleanupDir(tmpDir);

    return res.json({
      ok: true,
      video_file_id: videoFileId,
      video_url: `${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${videoFileId}/download?project=${AW_PROJECT}`,
      duration,
      frames: totalFrames,
      badge: badge_type,
      animation: animation_style,
      audio: audio_style,
    });

  } catch (e) {
    error(`video-gen error: ${e.message}`);
    cleanupDir(tmpDir);
    return res.json({ ok: false, error: e.message }, 500);
  }
};
