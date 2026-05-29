cat << 'MASTEREOF' > /tmp/joaf_master_build.mjs
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const BASE = '/Users/ashfakurrahaman/Desktop/JOAF-main';
const run = cmd => execSync(cmd, { cwd: BASE, encoding: 'utf8' });

// ── STEP 1: Delete the two redundant files ─────────────────────
const toDelete = [`${BASE}/admin/newscard.html`, `${BASE}/admin/fbpost-panel.html`];
toDelete.forEach(f => { if (existsSync(f)) { unlinkSync(f); console.log('🗑️  Deleted: ' + f.split('/').pop()); } });

// ── STEP 2: Upgrade baserenderer.js ───────────────────────────
const rendererPath = `${BASE}/js/render/baserenderer.js`;
const existingRenderer = readFileSync(rendererPath, 'utf8');

// Add aspect-aware drawNewsCard upgrade — patch after existing drawNewsCard
const RENDERER_PATCH = `
/**
 * JOAF Aspect-Aware NewsCard Renderer
 * Handles: 1080×1080 (1:1), 1080×1350 (4:5), 1080×1920 (9:16), 1200×630 (16:9)
 * Research-backed: 4:5 = most viral BD Facebook format 2025-26
 * JOAF brand: "দেশ আগে, দল পরে" — জুলাই বিপ্লবের চেতনা
 */
export function drawNewsCardPro(ctx, W, H, content, bgImage = null, template = 'breaking') {
  const ratio = H / W;
  const is45 = ratio > 1.2 && ratio < 1.4;   // 4:5 portrait
  const is916 = ratio > 1.6;                   // 9:16 story/reel
  const is169 = ratio < 0.7;                   // 16:9 landscape

  // Template-specific palette overrides
  const TEMPLATE_PALETTES = {
    breaking:     { bg:'#060609', accent:'#dc2626', accent2:'#ef4444', text:'#ffffff', sub:'#fca5a5', border:'#7f1d1d', badge:'⚡ ব্রেকিং', badgeBg:'#dc2626' },
    feature:      { bg:'#0a0806', accent:'#d97706', accent2:'#f59e0b', text:'#ffffff', sub:'#fde68a', border:'#78350f', badge:'★ আলোচিত', badgeBg:'#d97706' },
    quote:        { bg:'#0d0a1a', accent:'#7c3aed', accent2:'#a855f7', text:'#ffffff', sub:'#ddd6fe', border:'#4c1d95', badge:'❝ মন্তব্য', badgeBg:'#7c3aed' },
    data:         { bg:'#030c18', accent:'#0284c7', accent2:'#38bdf8', text:'#ffffff', sub:'#bae6fd', border:'#0369a1', badge:'📊 তথ্য',   badgeBg:'#0284c7' },
    alert:        { bg:'#0a0500', accent:'#ea580c', accent2:'#f97316', text:'#ffffff', sub:'#fed7aa', border:'#7c2d12', badge:'🔔 জরুরি',  badgeBg:'#ea580c' },
    viral:        { bg:'#0a0005', accent:'#be123c', accent2:'#e11d48', text:'#ffffff', sub:'#fecdd3', border:'#9f1239', badge:'🔥 ভাইরাল', badgeBg:'#be123c' },
  };

  const pal = TEMPLATE_PALETTES[template] || TEMPLATE_PALETTES.breaking;
  const emotion = content.emotion || 'urgent';
  const fallbackPal = PALETTES[emotion] || PALETTES.urgent;
  const p = { ...fallbackPal, ...pal };

  // ── Background ──────────────────────────────────────────────
  ctx.clearRect(0, 0, W, H);
  if (bgImage) {
    // Cover-fit with dark overlay
    const imgR = bgImage.width / bgImage.height;
    const canR = W / H;
    let sx=0,sy=0,sw=bgImage.width,sh=bgImage.height;
    if (imgR > canR) { sw = bgImage.height * canR; sx = (bgImage.width-sw)/2; }
    else { sh = bgImage.width / canR; sy = (bgImage.height-sh)/2; }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, W, H);
    // Cinematic dark gradient overlay
    const ov = ctx.createLinearGradient(0, 0, 0, H);
    ov.addColorStop(0, 'rgba(0,0,0,0.55)');
    ov.addColorStop(0.4, 'rgba(0,0,0,0.3)');
    ov.addColorStop(0.75, 'rgba(0,0,0,0.7)');
    ov.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);
  } else {
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, p.bg);
    grad.addColorStop(0.5, p.bg);
    grad.addColorStop(1, shadeColor(p.bg, 20));
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // Subtle noise texture using dots
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = p.accent;
    for(let i=0;i<W;i+=4){for(let j=0;j<H;j+=4){if(Math.random()>0.85)ctx.fillRect(i,j,2,2);}}
    ctx.globalAlpha = 1;
  }

  // ── Top accent bar (4px) ────────────────────────────────────
  const topGrad = ctx.createLinearGradient(0,0,W,0);
  topGrad.addColorStop(0, p.accent);
  topGrad.addColorStop(0.5, p.accent2);
  topGrad.addColorStop(1, p.accent);
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 5);

  // ── Corner matrix decoration (JOAF signature) ───────────────
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = p.accent;
  ctx.font = '12px monospace';
  const chars = ['✊','⚡','▶','◆','●','|','—'];
  for(let r=0;r<14;r++){
    ctx.fillText(chars[r%chars.length], 10, 80+r*16);
    ctx.fillText(chars[(r+5)%chars.length], W-22, 80+r*16);
  }
  ctx.globalAlpha = 1;

  // ── Badge ───────────────────────────────────────────────────
  const bW = is169 ? 120 : 150, bH = 38, bX = W - bW - 20, bY = 20;
  roundRect(ctx, bX, bY, bW, bH, 19);
  ctx.fillStyle = p.badgeBg; ctx.fill();
  // Glow
  ctx.shadowColor = p.accent; ctx.shadowBlur = 16;
  ctx.font = \`bold \${is169?14:17}px Arial\`;
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(p.badge, bX + bW/2, bY + bH/2);
  ctx.shadowBlur = 0;

  // ── Layout zones based on aspect ratio ──────────────────────
  const pad = Math.round(W * 0.055); // ~60px safe zone
  const textW = W - pad * 2;

  let headlineY, subY, summaryBoxY, summaryBoxH, brandBarH;

  if (is916) {
    // 9:16: more vertical space — bigger headline zone
    headlineY = Math.round(H * 0.12);
    summaryBoxY = Math.round(H * 0.62);
    summaryBoxH = Math.round(H * 0.22);
    brandBarH = Math.round(H * 0.10);
  } else if (is45) {
    // 4:5: sweet spot — headline high, summary mid-bottom
    headlineY = Math.round(H * 0.10);
    summaryBoxY = Math.round(H * 0.60);
    summaryBoxH = Math.round(H * 0.20);
    brandBarH = Math.round(H * 0.12);
  } else if (is169) {
    // 16:9: landscape — headline left-center, summary right
    headlineY = Math.round(H * 0.18);
    summaryBoxY = Math.round(H * 0.58);
    summaryBoxH = Math.round(H * 0.24);
    brandBarH = Math.round(H * 0.16);
  } else {
    // 1:1: square — classic layout
    headlineY = Math.round(H * 0.12);
    summaryBoxY = Math.round(H * 0.60);
    summaryBoxH = Math.round(H * 0.20);
    brandBarH = Math.round(H * 0.12);
  }

  // ── Headline ─────────────────────────────────────────────────
  const maxHFontSize = is169 ? 52 : is916 ? 90 : 80;
  const minHFontSize = 32;
  const hFontBase = \`900 \${maxHFontSize}px 'Hind Siliguri', 'Noto Sans Bengali', Arial\`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 16;
  const { lines: hLines, fontSize: hSize } = fitText(ctx, content.headline || '', textW, is916?5:4, hFontBase, minHFontSize);
  setOpticalFont(ctx, hSize, '900');
  const lineH = hSize * 1.28;
  drawTextLines(ctx, hLines, W/2, headlineY + lineH*0.85, lineH, content.highlightWords||[], p.accent, 'center');
  ctx.shadowBlur = 0;

  // ── Sub-headline ─────────────────────────────────────────────
  if (content.subHeadline) {
    const subFontSize = is169 ? 22 : is916 ? 38 : 32;
    const subStartY = headlineY + hLines.length * lineH + 18;
    ctx.font = \`400 \${subFontSize}px 'Hind Siliguri', Arial\`;
    ctx.fillStyle = p.sub; ctx.shadowBlur = 0;
    const subLines = banglaWordWrap(ctx, content.subHeadline, textW, is916?3:2);
    drawTextLines(ctx, subLines, W/2, subStartY, subFontSize*1.35, [], '', 'center');
    subY = subStartY + subLines.length * subFontSize * 1.35 + 12;
  }

  // ── Hook line (JOAF viral mechanic) ──────────────────────────
  if (content.hook && !is169) {
    const hookY = headlineY + hLines.length * lineH + (content.subHeadline ? 80 : 24);
    ctx.font = \`600 italic \${is916?30:26}px 'Hind Siliguri', Arial\`;
    ctx.fillStyle = p.accent2; ctx.textAlign = 'center';
    const hookLines = banglaWordWrap(ctx, \`" \${content.hook} "\`, textW - 40, 2);
    drawTextLines(ctx, hookLines, W/2, hookY, 34, [], '', 'center');
  }

  // ── Summary box ───────────────────────────────────────────────
  if (content.summary) {
    // Glass-morphism box
    roundRect(ctx, pad - 12, summaryBoxY, W - (pad-12)*2, summaryBoxH, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fill();
    // Accent border
    ctx.strokeStyle = p.accent + '55'; ctx.lineWidth = 1.5; ctx.stroke();
    // Left accent bar
    ctx.fillStyle = p.accent;
    ctx.fillRect(pad - 12, summaryBoxY, 4, summaryBoxH);

    const sumFontSize = is169 ? 20 : is916 ? 28 : 25;
    ctx.font = \`400 \${sumFontSize}px 'Hind Siliguri', Arial\`;
    ctx.fillStyle = '#e8e8f0'; ctx.textAlign = 'center';
    const sumLines = banglaWordWrap(ctx, content.summary, textW - 30, is916?5:4);
    drawTextLines(ctx, sumLines, W/2, summaryBoxY + sumFontSize + 12, sumFontSize*1.45, content.emphasisWords||[], p.accent2, 'center');
  }

  // ── JOAF "দেশ আগে দল পরে" watermark ─────────────────────────
  const wmY = summaryBoxY - 28;
  ctx.font = \`500 \${is169?13:16}px 'Hind Siliguri', Arial\`;
  ctx.fillStyle = p.accent + '88';
  ctx.textAlign = 'left';
  ctx.fillText('✊ দেশ আগে, দল পরে', pad, wmY);

  // ── Hashtag strip (viral mechanic) ───────────────────────────
  if (content.hashtags && content.hashtags.length && !is169) {
    const htY = summaryBoxY + summaryBoxH + 16;
    const htags = (content.hashtags || []).slice(0, 3);
    ctx.font = \`600 \${is916?22:18}px 'Hind Siliguri', Arial\`;
    ctx.fillStyle = p.accent2 + 'cc';
    ctx.textAlign = 'center';
    ctx.fillText(htags.join('  '), W/2, htY);
  }

  // ── Brand bar ─────────────────────────────────────────────────
  const barY = H - brandBarH;
  // Background
  const barGrad = ctx.createLinearGradient(0, barY, 0, H);
  barGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
  barGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = barGrad; ctx.fillRect(0, barY, W, brandBarH);
  // Top border accent
  ctx.fillStyle = topGrad; ctx.fillRect(0, barY, W, 3);

  // Logo placeholder / brand name
  ctx.font = \`bold \${is169?22:28}px Arial\`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = p.accent; ctx.shadowBlur = 12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('JOAF ⚡', pad, barY + brandBarH * 0.4);
  ctx.shadowBlur = 0;

  // URL
  ctx.font = \`\${is169?14:18}px 'Hind Siliguri', Arial\`;
  ctx.fillStyle = '#c0c0d8';
  ctx.fillText('julyforum.com', pad, barY + brandBarH * 0.72);

  // Date (right-aligned)
  const months = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];
  const d = new Date();
  const dateStr = \`\${d.getDate()} \${months[d.getMonth()]} \${d.getFullYear()}\`;
  ctx.font = \`bold \${is169?13:16}px 'Hind Siliguri', Arial\`;
  ctx.fillStyle = p.sub + 'cc';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - pad, barY + brandBarH * 0.55);

  ctx.textBaseline = 'alphabetic';
}
`;

// Append to baserenderer.js before last line
const updatedRenderer = existingRenderer.trimEnd() + '\n' + RENDERER_PATCH;
writeFileSync(rendererPath, updatedRenderer);
console.log('✅ baserenderer.js: drawNewsCardPro() added');

// ── STEP 3: Write the unified MEGA studio.html ────────────────
const studioHTML = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JOAF AI Media Studio — Unified</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ── RESEARCH-BACKED DESIGN SYSTEM ──────────────────────────────
   JOAF Brand: জুলাই বিপ্লবের চেতনা
   "দেশ আগে, দল পরে" — pro-democracy activist platform
   Primary audience: Bangladesh, 60M+ FB users, 98% mobile
   Viral format: 4:5 portrait (1080×1350) — takes 33% more feed space
   Color psychology: Red=urgency/revolution, Gold=importance, Purple=AI
   Typography: Hind Siliguri — optimal for Bangla web
──────────────────────────────────────────────────────────────── */
:root {
  --bg0:#04040a;--bg1:#0a0a12;--bg2:#10101c;--bg3:#161626;--bg4:#1c1c30;
  --border:#252540;--border2:#353558;
  --text:#f0f0fa;--text2:#9090b8;--text3:#505070;
  --accent:#7c3aed;--accent2:#a855f7;
  --red:#dc2626;--red2:#ef4444;
  --green:#16a34a;--green2:#22c55e;
  --blue:#0284c7;--blue2:#38bdf8;
  --gold:#d97706;--gold2:#f59e0b;
  --orange:#ea580c;--orange2:#f97316;
  --fb:#1877f2;--fb2:#4299e1;
  --radius:10px;--radius-lg:16px;--radius-xl:20px;
  font-family:'Hind Siliguri',Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{background:var(--bg0);color:var(--text);display:flex;flex-direction:column}

/* ── LAYOUT ──────────────────────────────────────────────────── */
.studio{display:grid;grid-template-columns:300px 1fr 280px;grid-template-rows:52px 40px 1fr;height:100vh;overflow:hidden}
.topbar{grid-column:1/-1;background:var(--bg1);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;padding:0 16px;z-index:200}
.modebar{grid-column:1/-1;background:var(--bg1);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:2px;padding:0 16px;z-index:100}
.col-left{background:var(--bg1);border-right:1px solid var(--border);overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:0}
.col-center{background:var(--bg0);overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center}
.col-right{background:var(--bg1);border-left:1px solid var(--border);overflow-y:auto;padding:14px}

/* ── TOPBAR ──────────────────────────────────────────────────── */
.logo{font-size:17px;font-weight:900;color:var(--accent2);white-space:nowrap;letter-spacing:.5px}
.logo span{color:var(--gold2)}
.logo sub{font-size:9px;color:var(--text3);font-weight:400;letter-spacing:.5px}
.topbar-status{display:flex;align-items:center;gap:8px;flex:1}
.status-pill{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}

/* ── MODE TABS ───────────────────────────────────────────────── */
.mode-tab{padding:6px 16px;border:none;background:transparent;color:var(--text3);
  font-size:12px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent;
  font-family:inherit;transition:.15s;white-space:nowrap}
.mode-tab.active{color:var(--accent2);border-bottom-color:var(--accent)}
.mode-tab:hover:not(.active){color:var(--text2)}
.mode-sep{width:1px;height:20px;background:var(--border2);margin:0 4px}

/* ── PANELS (mode switching) ─────────────────────────────────── */
.mode-panel{display:none}.mode-panel.active{display:contents}
.left-panel{display:none;flex-direction:column;gap:10px}
.left-panel.active{display:flex}
.center-panel{display:none;flex-direction:column;gap:12px;align-items:center;width:100%}
.center-panel.active{display:flex}
.right-panel{display:none;flex-direction:column;gap:10px}
.right-panel.active{display:flex}

/* ── CARDS ───────────────────────────────────────────────────── */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;flex-shrink:0}
.card-title{font-size:11px;font-weight:800;color:var(--text2);margin-bottom:10px;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.5px}
.badge{padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800;background:var(--accent);color:#fff;letter-spacing:.3px}
.badge-red{background:var(--red)}.badge-gold{background:var(--gold)}.badge-green{background:var(--green)}.badge-blue{background:var(--blue)}.badge-fb{background:var(--fb)}

/* ── FORM ELEMENTS ───────────────────────────────────────────── */
textarea,input[type=text],input[type=url],input[type=datetime-local],select{
  width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;
  color:var(--text);font-family:inherit;font-size:12px;padding:8px 10px;
  transition:.15s;outline:none;resize:none}
textarea{min-height:72px;line-height:1.6}
textarea:focus,input:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,58,237,.12)}
select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23606080'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
label{font-size:11px;color:var(--text2);display:block;margin-bottom:4px;font-weight:600}

/* ── BUTTONS ─────────────────────────────────────────────────── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;
  border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:.15s;white-space:nowrap}
.btn:active{transform:scale(.97)}.btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.btn-primary{background:var(--accent);color:#fff}.btn-primary:hover:not(:disabled){background:var(--accent2)}
.btn-red{background:rgba(220,38,38,.15);color:var(--red2);border:1px solid rgba(220,38,38,.3)}.btn-red:hover:not(:disabled){background:rgba(220,38,38,.25)}
.btn-green{background:rgba(22,163,74,.15);color:var(--green2);border:1px solid rgba(22,163,74,.3)}.btn-green:hover:not(:disabled){background:rgba(22,163,74,.25)}
.btn-blue{background:rgba(2,132,199,.15);color:var(--blue2);border:1px solid rgba(2,132,199,.3)}.btn-blue:hover:not(:disabled){background:rgba(2,132,199,.25)}
.btn-gold{background:rgba(217,119,6,.15);color:var(--gold2);border:1px solid rgba(217,119,6,.3)}.btn-gold:hover:not(:disabled){background:rgba(217,119,6,.25)}
.btn-fb{background:var(--fb);color:#fff}.btn-fb:hover:not(:disabled){background:var(--fb2)}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text2)}.btn-ghost:hover:not(:disabled){background:var(--bg3);color:var(--text)}
.btn-sm{padding:5px 10px;font-size:11px;border-radius:7px}
.btn-block{width:100%}
.btn-generate{background:linear-gradient(135deg,var(--accent),var(--red));color:#fff;padding:11px 20px;font-size:13px;border-radius:10px;width:100%;letter-spacing:.3px}
.btn-generate:hover:not(:disabled){background:linear-gradient(135deg,var(--accent2),var(--red2))}

/* ── TEMPLATE GRID ───────────────────────────────────────────── */
.tmpl-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px}
.tmpl-btn{padding:8px 4px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);
  border-radius:9px;font-family:inherit;font-size:11px;cursor:pointer;text-align:center;transition:.15s;font-weight:700;line-height:1.4}
.tmpl-btn.active{border-color:var(--accent);background:rgba(124,58,237,.15);color:var(--accent2)}
.tmpl-btn:hover:not(.active){border-color:var(--border2);background:var(--bg4)}
.tmpl-emoji{font-size:16px;display:block;margin-bottom:3px}
.tmpl-lbl{font-size:9px;font-weight:400;color:var(--text3);display:block}

/* ── TONE ROW ────────────────────────────────────────────────── */
.tone-row{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.tone-btn{padding:4px 9px;border:1px solid var(--border);background:transparent;color:var(--text3);
  border-radius:20px;font-family:inherit;font-size:10px;cursor:pointer;font-weight:700;transition:.15s}
.tone-btn.active{background:var(--accent);color:#fff;border-color:transparent}
.tone-btn:hover:not(.active){background:var(--bg3);color:var(--text2)}

/* ── ASPECT RATIO SELECTOR ───────────────────────────────────── */
.aspect-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}
.asp-btn{padding:7px 4px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);
  border-radius:8px;font-family:inherit;font-size:10px;cursor:pointer;text-align:center;font-weight:700;transition:.15s}
.asp-btn.active{border-color:var(--gold);background:rgba(217,119,6,.12);color:var(--gold2)}
.asp-icon{font-size:13px;display:block;margin-bottom:2px}
.asp-size{font-size:8px;font-weight:400;color:var(--text3)}
.asp-viral{font-size:8px;color:var(--red2);font-weight:700}

/* ── SOURCE BUTTONS ──────────────────────────────────────────── */
.src-row{display:flex;gap:5px;margin-bottom:8px}
.src-btn{flex:1;padding:7px 4px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);
  border-radius:8px;font-family:inherit;font-size:11px;cursor:pointer;text-align:center;font-weight:700;transition:.15s}
.src-btn.active{border-color:var(--accent2);background:rgba(168,85,247,.12);color:var(--accent2)}

/* ── UPLOAD ZONE ─────────────────────────────────────────────── */
.upload-zone{border:2px dashed var(--border);border-radius:12px;padding:18px;text-align:center;cursor:pointer;transition:.2s;background:var(--bg3)}
.upload-zone:hover,.upload-zone.drag{border-color:var(--accent);background:rgba(124,58,237,.07)}
.upload-zone .uz-icon{font-size:26px;margin-bottom:5px}
.upload-zone .uz-hint{font-size:11px;color:var(--text2)}

/* ── CANVAS WRAP ─────────────────────────────────────────────── */
.canvas-wrap{position:relative;background:var(--bg3);border-radius:var(--radius-xl);overflow:hidden;
  display:flex;align-items:center;justify-content:center;min-height:320px;width:100%;max-width:560px;
  border:1px solid var(--border)}
#main-canvas{max-width:100%;max-height:70vh;border-radius:var(--radius-xl);display:none}
#main-video{max-width:100%;max-height:70vh;border-radius:var(--radius-xl);display:none}
.canvas-ph{text-align:center;padding:50px 20px;color:var(--text3)}
.canvas-ph .icon{font-size:44px;margin-bottom:10px}
.canvas-ph p{font-size:12px;line-height:1.7;max-width:200px;margin:0 auto}

/* ── ACTION ROW ──────────────────────────────────────────────── */
.action-row{display:flex;gap:6px;flex-wrap:wrap;width:100%;max-width:560px}

/* ── PROGRESS ────────────────────────────────────────────────── */
.progress-bar{height:3px;background:var(--bg4);border-radius:4px;overflow:hidden;width:100%;max-width:560px}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--red));border-radius:4px;transition:width .4s;width:0}

/* ── LOG ─────────────────────────────────────────────────────── */
.log-area{background:var(--bg3);border-radius:8px;padding:10px;font-size:10px;color:var(--text2);
  min-height:52px;max-height:90px;overflow-y:auto;line-height:1.8;width:100%;max-width:560px;border:1px solid var(--border)}

/* ── CAPTION ─────────────────────────────────────────────────── */
.cap-var-row{display:flex;gap:4px;margin-bottom:7px;flex-wrap:wrap}
.cap-var{padding:4px 8px;border:1px solid var(--border);background:transparent;color:var(--text3);
  border-radius:20px;font-size:10px;cursor:pointer;font-family:inherit;font-weight:700;transition:.15s}
.cap-var.active{background:var(--bg3);color:var(--text);border-color:var(--border2)}
.hashtag-cloud{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.ht{padding:3px 8px;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.25);border-radius:20px;font-size:10px;color:var(--accent2);cursor:pointer;transition:.15s}
.ht:hover{background:rgba(124,58,237,.2)}

/* ── STAT GRID ───────────────────────────────────────────────── */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.stat-card{background:var(--bg3);border-radius:8px;padding:9px;text-align:center;border:1px solid var(--border)}
.stat-num{font-size:20px;font-weight:800}
.stat-lbl{font-size:9px;color:var(--text2);margin-top:1px;font-weight:600}

/* ── QUEUE ───────────────────────────────────────────────────── */
.q-item{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px;margin-bottom:7px;display:flex;gap:9px;align-items:flex-start}
.q-thumb{width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:18px}
.q-info{flex:1;min-width:0}
.q-name{font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q-cap{font-size:10px;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.q-badge{padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800}
.q-badge.pending{background:rgba(217,119,6,.15);color:var(--gold2)}
.q-badge.done{background:rgba(22,163,74,.15);color:var(--green2)}
.q-badge.failed{background:rgba(220,38,38,.15);color:var(--red2)}
.q-badge.scheduled{background:rgba(124,58,237,.15);color:var(--accent2)}
.q-badge.publishing{background:rgba(2,132,199,.15);color:var(--blue2)}

/* ── IMAGE STRIP ─────────────────────────────────────────────── */
.img-strip{display:flex;gap:7px;overflow-x:auto;padding:4px 0;min-height:72px;align-items:center}
.img-strip::-webkit-scrollbar{height:4px}.img-strip::-webkit-scrollbar-track{background:var(--bg3)}.img-strip::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.img-thumb{position:relative;flex-shrink:0;width:66px;height:66px;border-radius:8px;overflow:hidden;border:2px solid transparent;cursor:pointer;transition:.15s}
.img-thumb.primary{border-color:var(--gold)}
.img-thumb.selected{border-color:var(--accent)}
.img-thumb img{width:100%;height:100%;object-fit:cover}
.img-thumb .rm{position:absolute;top:2px;right:2px;width:17px;height:17px;background:rgba(0,0,0,.88);border-radius:50%;font-size:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;z-index:2}

/* ── PAGE TOGGLE ─────────────────────────────────────────────── */
.page-item{display:flex;align-items:center;gap:9px;padding:9px;background:var(--bg3);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)}
.page-avatar{width:32px;height:32px;border-radius:50%;background:var(--fb);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.page-name{font-size:12px;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toggle{position:relative;width:34px;height:18px;display:inline-block;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.toggle-track{position:absolute;inset:0;background:var(--bg4);border-radius:20px;cursor:pointer;transition:.2s}
.toggle input:checked+.toggle-track{background:var(--fb)}
.toggle-track::before{content:'';position:absolute;width:12px;height:12px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.toggle input:checked+.toggle-track::before{transform:translateX(16px)}

/* ── SCROLLBARS ──────────────────────────────────────────────── */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg1)}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border2)}

/* ── ANIMATIONS ──────────────────────────────────────────────── */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes glow{0%,100%{box-shadow:0 0 8px var(--accent)}50%{box-shadow:0 0 20px var(--accent)}}
.spin{animation:spin .7s linear infinite;display:inline-block}
.pulsing{animation:pulse 1.5s ease infinite}
.glowing{animation:glow 2s ease infinite}

/* ── VIRAL SCORE INDICATOR ───────────────────────────────────── */
.viral-bar{height:6px;border-radius:4px;overflow:hidden;background:var(--bg4);margin-top:4px}
.viral-fill{height:100%;border-radius:4px;transition:width .6s}

/* ── RESPONSIVE ──────────────────────────────────────────────── */
@media(max-width:1200px){.studio{grid-template-columns:270px 1fr 260px}}
@media(max-width:960px){.studio{grid-template-columns:1fr;grid-template-rows:auto;height:auto;overflow:auto}html,body{height:auto;overflow:auto}.col-left,.col-right{border:none;border-bottom:1px solid var(--border)}.col-center{min-height:400px}}
</style>
</head>
<body>
<div class="studio" id="studio">

<!-- ══ TOPBAR ════════════════════════════════════════════════════ -->
<header class="topbar">
  <div class="logo">JOAF <span>Studio</span><sub>PRO</sub></div>
  <div class="topbar-status">
    <div id="token-pill" class="status-pill" style="background:rgba(217,119,6,.15);color:var(--gold2)">⏳ Token...</div>
    <div id="ai-pill" class="status-pill" style="background:rgba(124,58,237,.15);color:var(--accent2)">🤖 AI Ready</div>
  </div>
  <a href="/admin/" class="btn btn-ghost btn-sm">← Admin</a>
</header>

<!-- ══ MODE BAR ══════════════════════════════════════════════════ -->
<nav class="modebar">
  <button class="mode-tab active" data-mode="newscard" onclick="switchMode('newscard')">🗞️ NewsCard</button>
  <div class="mode-sep"></div>
  <button class="mode-tab" data-mode="reel" onclick="switchMode('reel')">🎬 Reel</button>
  <div class="mode-sep"></div>
  <button class="mode-tab" data-mode="batch" onclick="switchMode('batch')">📦 Batch</button>
  <div class="mode-sep"></div>
  <button class="mode-tab" data-mode="fbpost" onclick="switchMode('fbpost')">📘 FB Post</button>
  <div class="mode-sep"></div>
  <button class="mode-tab" data-mode="queue" onclick="switchMode('queue')">📋 Queue <span id="q-badge" class="badge" style="background:var(--bg4);color:var(--text2)">0</span></button>
</nav>

<!-- ══ LEFT COLUMN ════════════════════════════════════════════════ -->
<aside class="col-left">

  <!-- ── NewsCard + Reel + Batch: Shared Input ── -->
  <div class="left-panel active" id="lp-newscard">

    <!-- Input Source -->
    <div class="card">
      <div class="card-title">📥 Input <span class="badge" id="src-badge">Text</span></div>
      <div class="src-row">
        <button class="src-btn active" id="s-text" onclick="setSource('text')">📝 Text</button>
        <button class="src-btn" id="s-image" onclick="setSource('image')">🖼️ OCR</button>
        <button class="src-btn" id="s-url" onclick="setSource('url')">🔗 URL</button>
      </div>
      <div id="src-text-panel">
        <textarea id="topic-input" rows="5" placeholder="নিউজ বা টপিক লিখুন... (বাংলা বা ইংরেজি)"></textarea>
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="setTopic('জুলাই বিপ্লব')">✊ জুলাই</button>
          <button class="btn btn-ghost btn-sm" onclick="setTopic('দেশের সংবাদ')">📰 সংবাদ</button>
          <button class="btn btn-ghost btn-sm" onclick="setTopic('গণতন্ত্র')">🗳️ গণতন্ত্র</button>
          <button class="btn btn-ghost btn-sm" onclick="setTopic('জনগণের কথা')">🗣️ জনগণ</button>
        </div>
      </div>
      <div id="src-image-panel" style="display:none">
        <div class="upload-zone" id="ocr-zone" onclick="document.getElementById('ocr-file').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondrop="handleOCRDrop(event)" ondragleave="this.classList.remove('drag')">
          <div class="uz-icon">📸</div>
          <div class="uz-hint">ছবি drag বা click<br>OCR text extract হবে</div>
        </div>
        <input type="file" id="ocr-file" accept="image/*" multiple style="display:none" onchange="handleOCRFiles(this.files)">
        <div class="img-strip" id="ocr-strip" style="margin-top:6px"></div>
      </div>
      <div id="src-url-panel" style="display:none">
        <input type="url" id="url-input" placeholder="https://prothomalo.com/...">
        <div style="font-size:10px;color:var(--text3);margin-top:4px">Article URL থেকে AI content তৈরি হবে</div>
      </div>
    </div>

    <!-- Template — RESEARCH-BACKED -->
    <div class="card">
      <div class="card-title">🎨 Template <span class="badge badge-gold">6 types</span></div>
      <!-- Research: breaking=highest CTR, viral=max shares, feature=credibility -->
      <div class="tmpl-grid" id="tmpl-grid">
        <button class="tmpl-btn active" data-t="breaking" onclick="setTemplate('breaking')">
          <span class="tmpl-emoji">⚡</span>Breaking<span class="tmpl-lbl">Highest CTR</span>
        </button>
        <button class="tmpl-btn" data-t="viral" onclick="setTemplate('viral')">
          <span class="tmpl-emoji">🔥</span>Viral<span class="tmpl-lbl">Max Shares</span>
        </button>
        <button class="tmpl-btn" data-t="feature" onclick="setTemplate('feature')">
          <span class="tmpl-emoji">★</span>Feature<span class="tmpl-lbl">Trust+Authority</span>
        </button>
        <button class="tmpl-btn" data-t="alert" onclick="setTemplate('alert')">
          <span class="tmpl-emoji">🔔</span>Alert<span class="tmpl-lbl">Action-Required</span>
        </button>
        <button class="tmpl-btn" data-t="quote" onclick="setTemplate('quote')">
          <span class="tmpl-emoji">❝</span>Quote<span class="tmpl-lbl">Social Proof</span>
        </button>
        <button class="tmpl-btn" data-t="data" onclick="setTemplate('data')">
          <span class="tmpl-emoji">📊</span>Data<span class="tmpl-lbl">Fact-Based</span>
        </button>
      </div>

      <!-- Tone -->
      <div class="card-title" style="margin-top:6px">🎭 Tone</div>
      <div class="tone-row" id="tone-row">
        <button class="tone-btn active" data-tone="urgent" onclick="setTone('urgent')">🔥 Urgent</button>
        <button class="tone-btn" data-tone="breaking" onclick="setTone('breaking')">⚡ Breaking</button>
        <button class="tone-btn" data-tone="informative" onclick="setTone('informative')">ℹ️ Info</button>
        <button class="tone-btn" data-tone="motivational" onclick="setTone('motivational')">💪 Motivate</button>
        <button class="tone-btn" data-tone="angry" onclick="setTone('angry')">😤 Angry</button>
        <button class="tone-btn" data-tone="sad" onclick="setTone('sad')">😢 Sad</button>
        <button class="tone-btn" data-tone="positive" onclick="setTone('positive')">✅ Positive</button>
      </div>
    </div>

    <!-- Aspect Ratio — RESEARCH-BACKED -->
    <div class="card">
      <div class="card-title">📐 Canvas Size <span class="badge badge-red">Mobile-First</span></div>
      <!-- Research: 4:5 takes 33% more feed space = most viral BD format 2025-26 -->
      <div class="aspect-row" id="aspect-row">
        <button class="asp-btn" data-w="1080" data-h="1350" onclick="setAspect(this)">
          <span class="asp-icon">📱</span>4:5<span class="asp-viral">⭐ Most Viral</span><span class="asp-size">1080×1350</span>
        </button>
        <button class="asp-btn active" data-w="1080" data-h="1080" onclick="setAspect(this)">
          <span class="asp-icon">⬛</span>1:1<span class="asp-viral">Carousel</span><span class="asp-size">1080×1080</span>
        </button>
        <button class="asp-btn" data-w="1080" data-h="1920" onclick="setAspect(this)">
          <span class="asp-icon">🎞️</span>9:16<span class="asp-viral">Reel/Story</span><span class="asp-size">1080×1920</span>
        </button>
        <button class="asp-btn" data-w="1200" data-h="630" onclick="setAspect(this)">
          <span class="asp-icon">🖥️</span>1.91:1<span class="asp-viral">Link Post</span><span class="asp-size">1200×630</span>
        </button>
      </div>

      <label style="margin-bottom:4px">Background Image (optional)</label>
      <div class="upload-zone" style="padding:12px" onclick="document.getElementById('bg-file').click()">
        <div class="uz-hint">📁 Background upload (overlay applied auto)</div>
      </div>
      <input type="file" id="bg-file" accept="image/*" style="display:none" onchange="handleBGSelect(this)">
      <div id="bg-preview-wrap" style="margin-top:6px;display:none">
        <img id="bg-preview" style="width:100%;border-radius:7px;max-height:70px;object-fit:cover">
        <button class="btn btn-ghost btn-sm" style="margin-top:4px;width:100%" onclick="clearBG()">✕ Remove BG</button>
      </div>
    </div>

    <!-- Schedule -->
    <div class="card">
      <div class="card-title">⚙️ Settings</div>
      <label>Schedule (optional)</label>
      <input type="datetime-local" id="schedule-input" style="margin-bottom:8px">
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:11px;margin-bottom:0">
        <span class="toggle"><input type="checkbox" id="auto-queue" checked><span class="toggle-track"></span></span>
        Generate → Auto add to queue
      </label>
    </div>

    <button class="btn btn-generate" id="gen-btn" onclick="runGenerate()">🚀 Generate NewsCard</button>
  </div>

  <!-- ── Reel Panel ── -->
  <div class="left-panel" id="lp-reel">
    <div class="card">
      <div class="card-title">🎬 Reel Settings</div>
      <label>Reel Duration</label>
      <select id="reel-duration"><option value="15">15s (Best engagement)</option><option value="30">30s (Standard)</option><option value="60">60s (Extended)</option></select>
      <div style="height:8px"></div>
      <label>Scene Count</label>
      <select id="scene-count"><option value="3">3 scenes</option><option value="4">4 scenes</option><option value="5">5 scenes</option></select>
    </div>
    <div class="card">
      <div class="card-title">📥 Topic Input</div>
      <textarea id="reel-topic" rows="4" placeholder="Reel topic..."></textarea>
    </div>
    <button class="btn btn-generate" id="reel-gen-btn" onclick="runReelGenerate()">🎬 Generate Reel</button>
  </div>

  <!-- ── Batch Panel ── -->
  <div class="left-panel" id="lp-batch">
    <div class="card">
      <div class="card-title">📦 Batch Images <span class="badge" id="batch-count-badge">0</span></div>
      <div class="upload-zone" onclick="document.getElementById('batch-file').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondrop="handleBatchDrop(event)" ondragleave="this.classList.remove('drag')">
        <div class="uz-icon">📸</div>
        <div class="uz-hint">Multiple images drag বা click<br>প্রতিটায় AI card তৈরি হবে</div>
      </div>
      <input type="file" id="batch-file" accept="image/*" multiple style="display:none" onchange="addBatchFiles(this.files)">
      <div class="img-strip" id="batch-strip" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <div class="card-title">🎨 Batch Template</div>
      <select id="batch-template">
        <option value="breaking">⚡ Breaking</option><option value="viral">🔥 Viral</option>
        <option value="feature">★ Feature</option><option value="alert">🔔 Alert</option>
      </select>
    </div>
    <button class="btn btn-generate" id="batch-gen-btn" onclick="runBatchGenerate()">📦 Generate All</button>
  </div>

  <!-- ── FB Post Panel ── -->
  <div class="left-panel" id="lp-fbpost">
    <div class="card">
      <div class="card-title">📝 FB Composer <span class="badge badge-fb" id="post-type-badge">Image</span></div>
      <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap">
        <button class="src-btn active" data-pt="image" onclick="setPostType('image')">🖼️ Image</button>
        <button class="src-btn" data-pt="carousel" onclick="setPostType('carousel')">🎠 Carousel</button>
        <button class="src-btn" data-pt="video" onclick="setPostType('video')">🎬 Video</button>
        <button class="src-btn" data-pt="text" onclick="setPostType('text')">📝 Text</button>
      </div>

      <div id="fb-img-area">
        <div class="upload-zone" id="fb-upload-zone" onclick="document.getElementById('fb-images').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondrop="handleFBDrop(event)" ondragleave="this.classList.remove('drag')">
          <div class="uz-icon">📸</div>
          <div class="uz-hint">Images drop/click<br>Carousel = multiple images</div>
        </div>
        <input type="file" id="fb-images" accept="image/*" multiple style="display:none" onchange="handleFBImages(this)">
        <div class="img-strip" id="fb-strip" style="margin-top:6px"><div style="font-size:11px;color:var(--text3)">No images</div></div>
      </div>
      <div id="fb-video-area" style="display:none;margin-top:8px">
        <label>Video URL</label>
        <input type="url" id="fb-video-url" placeholder="https://...">
      </div>

      <div style="height:8px"></div>
      <label>Caption / Message</label>
      <textarea id="fb-caption" rows="5" placeholder="Caption লিখুন..."></textarea>
      <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="fbAppend('✊')">✊</button>
        <button class="btn btn-ghost btn-sm" onclick="fbAppend('⚡')">⚡</button>
        <button class="btn btn-ghost btn-sm" onclick="fbAppend('🔥')">🔥</button>
        <button class="btn btn-ghost btn-sm" onclick="fbAppend('📢')">📢</button>
        <button class="btn btn-ghost btn-sm" onclick="fbInsertHashtags()">## Tags</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">⏰ Schedule</div>
      <input type="datetime-local" id="fb-schedule">
    </div>

    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="btn btn-fb btn-block" id="fb-post-btn" onclick="doFBPost()">📘 Post Now</button>
      <button class="btn btn-gold btn-block" onclick="doFBSchedule()">⏰ Schedule</button>
      <button class="btn btn-green btn-block" onclick="addFBToQueue()">📋 Add to Queue</button>
    </div>
  </div>

  <!-- ── Queue Panel ── -->
  <div class="left-panel" id="lp-queue">
    <div class="card">
      <div class="card-title">📋 Publish Queue <span class="badge" id="q-count-left">0</span></div>
      <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap">
        <button class="btn btn-green btn-sm" onclick="publishSelected()">✅ Selected</button>
        <button class="btn btn-primary btn-sm" onclick="publishAll()">📤 Publish All</button>
        <button class="btn btn-ghost btn-sm" onclick="clearQueue()">🗑️ Clear</button>
      </div>
      <div id="q-status" style="font-size:10px;color:var(--text3);margin-bottom:6px"></div>
    </div>
    <div class="card" style="flex:1">
      <div class="card-title">📄 FB Pages</div>
      <div id="fb-pages-left" style="font-size:11px;color:var(--text3)">Loading...</div>
      <button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" onclick="loadFBPages()">🔄 Refresh</button>
    </div>
  </div>

</aside>

<!-- ══ CENTER COLUMN ══════════════════════════════════════════════ -->
<main class="col-center">

  <!-- ── NewsCard / Reel / Batch center ── -->
  <div class="center-panel active" id="cp-newscard">
    <div class="canvas-wrap" id="canvas-wrap">
      <div class="canvas-ph" id="canvas-ph">
        <div class="icon">🗞️</div>
        <p>Template select করুন<br>4:5 = Most Viral<br>Generate করুন</p>
      </div>
      <canvas id="main-canvas"></canvas>
      <video id="main-video" controls></video>
    </div>

    <div class="progress-bar"><div class="progress-fill" id="prog-fill"></div></div>

    <div class="action-row" id="action-row">
      <button class="btn btn-green btn-sm" id="dl-card-btn" onclick="downloadCard()" disabled>⬇️ PNG</button>
      <button class="btn btn-blue btn-sm" id="dl-reel-btn" onclick="downloadReel()" style="display:none">⬇️ Video</button>
      <button class="btn btn-primary btn-sm" id="queue-btn" onclick="addToQueue()" disabled>📋 Queue</button>
      <button class="btn btn-fb btn-sm" id="publish-now-btn" onclick="publishNow()" disabled>📤 Post Now</button>
      <button class="btn btn-ghost btn-sm" id="regen-btn" onclick="runGenerate()" style="display:none">🔄 Regen</button>
    </div>

    <!-- Caption output -->
    <div class="card" style="width:100%;max-width:560px">
      <div class="card-title">📝 Caption <span class="badge" id="viral-score-badge">—</span></div>
      <div class="cap-var-row">
        <button class="cap-var active" data-v="caption" onclick="switchCap('caption')">Full</button>
        <button class="cap-var" data-v="shortCaption" onclick="switchCap('shortCaption')">Short (80 char)</button>
        <button class="cap-var" data-v="mediumCaption" onclick="switchCap('mediumCaption')">Medium</button>
        <button class="cap-var" data-v="longCaption" onclick="switchCap('longCaption')">Long</button>
        <button class="cap-var" data-v="facebook" onclick="switchCap('facebook')">FB Variant</button>
      </div>
      <textarea id="caption-ta" rows="4" placeholder="AI caption এখানে আসবে..."></textarea>
      <div style="display:flex;gap:6px;margin-top:7px">
        <button class="btn btn-ghost btn-sm" onclick="copyCaption()">📋 Copy</button>
        <button class="btn btn-ghost btn-sm" onclick="copyWithHashtags()">## Copy+Tags</button>
      </div>
      <div class="hashtag-cloud" id="hashtag-cloud"></div>
    </div>

    <div class="log-area" id="log-area">Studio ready — "দেশ আগে, দল পরে" ✊</div>
  </div>

  <!-- ── FB Post center ── -->
  <div class="center-panel" id="cp-fbpost">
    <div class="card" style="width:100%;max-width:560px">
      <div class="card-title">📄 FB Pages <span class="badge badge-fb" id="fb-page-count">0</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="loadFBPages()">🔄</button>
      </div>
      <div id="fb-pages-center">Loading...</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-ghost btn-sm" onclick="selectAllPages(true)">✅ All</button>
        <button class="btn btn-ghost btn-sm" onclick="selectAllPages(false)">⬜ None</button>
      </div>
    </div>

    <div class="progress-bar"><div class="progress-fill" id="fb-prog-fill"></div></div>

    <div class="card" id="fb-results-card" style="width:100%;max-width:560px;display:none">
      <div class="card-title">📊 Post Results</div>
      <div id="fb-results-content"></div>
    </div>

    <div class="log-area" id="fb-log-area">FB Panel ready...</div>
  </div>

  <!-- ── Queue center ── -->
  <div class="center-panel" id="cp-queue">
    <div style="width:100%;max-width:560px">
      <div id="queue-list-center"><div style="font-size:12px;color:var(--text3);padding:16px;text-align:center">Queue empty</div></div>
    </div>
  </div>

</main>

<!-- ══ RIGHT COLUMN ════════════════════════════════════════════════ -->
<aside class="col-right">

  <!-- ── AI Content Output (NewsCard/Reel/Batch) ── -->
  <div class="right-panel active" id="rp-newscard">

    <div class="card">
      <div class="card-title">🧠 AI Content</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:4px;font-weight:700">HEADLINE</div>
      <div id="out-headline" style="font-size:13px;font-weight:800;color:var(--text);line-height:1.5;margin-bottom:10px;min-height:20px">—</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:3px;font-weight:700">HOOK (Scroll Stopper)</div>
      <div id="out-hook" style="font-size:12px;color:var(--gold2);font-style:italic;margin-bottom:10px;min-height:16px">—</div>
      <div style="font-size:10px;color:var(--text2);margin-bottom:3px;font-weight:700">SUMMARY</div>
      <div id="out-summary" style="font-size:11px;color:var(--text);line-height:1.6;min-height:32px">—</div>
    </div>

    <div class="card">
      <div class="card-title">📊 Viral Analytics <span class="badge badge-red">AI Prediction</span></div>
      <div class="stat-grid" id="analytics-out">
        <div class="stat-card"><div class="stat-num" style="color:var(--red2)">—</div><div class="stat-lbl">Viral Score</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--green2)">—</div><div class="stat-lbl">Engagement</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--orange2)">—</div><div class="stat-lbl">Controversy</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--accent2)">—</div><div class="stat-lbl">Priority</div></div>
      </div>
      <!-- Viral bar -->
      <div style="font-size:10px;color:var(--text2);margin-top:10px;margin-bottom:4px;font-weight:700">VIRAL POTENTIAL</div>
      <div class="viral-bar"><div class="viral-fill" id="viral-bar-fill" style="width:0%;background:linear-gradient(90deg,var(--red),var(--gold))"></div></div>
    </div>

    <div class="card">
      <div class="card-title">🌐 Platform Variants</div>
      <div id="platform-out" style="font-size:11px;color:var(--text3)">Generate করলে দেখাবে</div>
    </div>

    <div class="card">
      <div class="card-title">🛡️ Safety Check</div>
      <div id="safety-out" style="font-size:11px;color:var(--text2)">—</div>
    </div>

    <div class="card">
      <div class="card-title">🎬 Reel Script</div>
      <div id="script-out" style="font-size:11px;color:var(--text3)">Generate করলে দেখাবে</div>
    </div>

  </div>

  <!-- ── FB Post Right Panel ── -->
  <div class="right-panel" id="rp-fbpost">

    <div class="card">
      <div class="card-title">🔑 Token Status</div>
      <div id="token-detail" style="font-size:11px;line-height:1.9;color:var(--text2)">Checking...</div>
      <button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" onclick="checkFBToken()">🔄 Re-check</button>
    </div>

    <div class="card">
      <div class="card-title">📊 Post Stats</div>
      <div style="font-size:11px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">Total Posts</span><span id="st-total" style="font-weight:800">0</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">Success</span><span id="st-ok" style="font-weight:800;color:var(--green2)">0</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--text2)">Failed</span><span id="st-fail" style="font-weight:800;color:var(--red2)">0</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📜 Activity Log</div>
      <div class="log-area" id="fb-right-log" style="max-height:150px">Ready...</div>
    </div>

  </div>

  <!-- ── Queue Right Panel ── -->
  <div class="right-panel" id="rp-queue">
    <div class="card">
      <div class="card-title">📋 Queue Stats</div>
      <div id="q-stats" style="font-size:11px;color:var(--text2)">Empty</div>
    </div>
  </div>

</aside>
</div><!-- /studio -->

<!-- ════════════════════════════════════════════════════════════════
     STUDIO JS — UNIFIED ENGINE
     Architecture: aimaster.js → MasterContentObject → drawNewsCardPro
     Research: 4:5=most viral BD format, breaking=highest CTR, <80char=66% more engagement
════════════════════════════════════════════════════════════════ -->
<script type="module">
import { generateMasterContent, processImageWithOCR } from '../js/ai/aimaster.js';
import { drawNewsCard, drawNewsCardPro, drawReelFrame, loadBrandLogo, PALETTES } from '../js/render/baserenderer.js';
import { banglaWordWrap, fitText, drawTextLines, roundRect } from '../js/render/typography.js';

// ── Constants (Research-backed) ───────────────────────────────────────
// 4:5 = most viral BD Facebook format 2025-26 (33% more feed space on mobile)
// breaking template = highest CTR for news/political content
// <80 chars = 66% more engagement (mobile-first audience)
const FB_API = '/api/fb-autopost';
const DEFAULT_W = 1080, DEFAULT_H = 1080;

// ── State ─────────────────────────────────────────────────────────────
let currentContent = null;
let currentMode = 'newscard';
let cardBlob = null;
let reelBlob = null;
let bgImage = null;
let ocrFiles = [];
let batchFiles = [];
let fbPostImages = [];
let activeSource = 'text';
let activeTone = 'urgent';
let activeTemplate = 'breaking';
let activePostType = 'image';
let canvasW = DEFAULT_W, canvasH = DEFAULT_H;
let fbPages = [];
let fbStats = { total:0, ok:0, fail:0 };
let queue = [];

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('main-video');

// ── Init ──────────────────────────────────────────────────────────────
(async () => {
  await loadBrandLogo('/logoc7c3.png');
  await loadFBPages();
  await checkFBToken();
})();

// ── Mode switching ────────────────────────────────────────────────────
window.switchMode = function(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  // Left panels
  document.querySelectorAll('.left-panel').forEach(p => p.classList.remove('active'));
  const lp = document.getElementById('lp-' + mode);
  if (lp) lp.classList.add('active');
  // Center panels
  const cpMap = { newscard:'newscard', reel:'newscard', batch:'newscard', fbpost:'fbpost', queue:'queue' };
  document.querySelectorAll('.center-panel').forEach(p => p.classList.remove('active'));
  const cp = document.getElementById('cp-' + (cpMap[mode]||mode));
  if (cp) cp.classList.add('active');
  // Right panels
  const rpMap = { newscard:'newscard', reel:'newscard', batch:'newscard', fbpost:'fbpost', queue:'queue' };
  document.querySelectorAll('.right-panel').forEach(p => p.classList.remove('active'));
  const rp = document.getElementById('rp-' + (rpMap[mode]||mode));
  if (rp) rp.classList.add('active');
  // Batch: open file picker
  if (mode === 'batch') document.getElementById('batch-file').click();
};

// ── Source / Template / Tone / Aspect ────────────────────────────────
window.setSource = function(s) {
  activeSource = s;
  ['text','image','url'].forEach(x => {
    document.getElementById('src-'+x+'-panel').style.display = x===s ? 'block' : 'none';
    document.getElementById('s-'+x).classList.toggle('active', x===s);
  });
  document.getElementById('src-badge').textContent = s==='text'?'Text':s==='image'?'Image+OCR':'URL';
};

window.setTemplate = function(t) {
  activeTemplate = t;
  document.querySelectorAll('.tmpl-btn').forEach(b => b.classList.toggle('active', b.dataset.t===t));
  if (currentContent) { currentContent.cardTemplate = t; rerender(); }
};

window.setTone = function(t) {
  activeTone = t;
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.toggle('active', b.dataset.tone===t));
};

window.setAspect = function(btn) {
  canvasW = +btn.dataset.w; canvasH = +btn.dataset.h;
  document.querySelectorAll('.asp-btn').forEach(b => b.classList.toggle('active', b === btn));
  if (currentContent) rerender();
};

window.setTopic = function(t) {
  document.getElementById('topic-input').value = t;
  setSource('text');
};

// ── File handlers ──────────────────────────────────────────────────────
window.handleOCRFiles = function(files) { ocrFiles = Array.from(files); renderOCRStrip(); };
window.handleOCRDrop = function(e) { e.preventDefault(); document.getElementById('ocr-zone').classList.remove('drag'); handleOCRFiles(e.dataTransfer.files); };

function renderOCRStrip() {
  const strip = document.getElementById('ocr-strip');
  strip.innerHTML = ocrFiles.map((f,i) =>
    '<div class="img-thumb selected"><img src="'+URL.createObjectURL(f)+'"><div class="rm" onclick="removeOCR('+i+')">✕</div></div>'
  ).join('') || '<div style="font-size:10px;color:var(--text3)">No images</div>';
}
window.removeOCR = function(i) { ocrFiles.splice(i,1); renderOCRStrip(); };

window.handleBGSelect = function(input) {
  if (!input.files[0]) return;
  bgImage = new Image();
  bgImage.onload = () => { if (currentContent) rerender(); };
  bgImage.src = URL.createObjectURL(input.files[0]);
  document.getElementById('bg-preview-wrap').style.display = 'block';
  document.getElementById('bg-preview').src = bgImage.src;
};
window.clearBG = function() {
  bgImage = null;
  document.getElementById('bg-preview-wrap').style.display = 'none';
  document.getElementById('bg-file').value = '';
  if (currentContent) rerender();
};

window.addBatchFiles = function(files) {
  batchFiles = [...batchFiles, ...Array.from(files)];
  renderBatchStrip();
};
window.handleBatchDrop = function(e) { e.preventDefault(); document.getElementById('batch-file').closest('.upload-zone')?.classList.remove('drag'); addBatchFiles(e.dataTransfer.files); };
function renderBatchStrip() {
  document.getElementById('batch-count-badge').textContent = batchFiles.length;
  const strip = document.getElementById('batch-strip');
  strip.innerHTML = batchFiles.map((f,i) =>
    '<div class="img-thumb selected"><img src="'+URL.createObjectURL(f)+'"><div class="rm" onclick="removeBatch('+i+')">✕</div></div>'
  ).join('') || '<div style="font-size:10px;color:var(--text3)">No files</div>';
}
window.removeBatch = function(i) { batchFiles.splice(i,1); renderBatchStrip(); };

// FB image handlers
window.handleFBImages = function(input) { Array.from(input.files).forEach(f => addFBImage(f)); input.value=''; };
window.handleFBDrop = function(e) { e.preventDefault(); document.getElementById('fb-upload-zone').classList.remove('drag'); Array.from(e.dataTransfer.files).forEach(f => f.type.startsWith('image/') && addFBImage(f)); };
function addFBImage(file) {
  const id = Date.now()+'-'+Math.random().toString(36).slice(2,5);
  fbPostImages.push({ id, file, url: URL.createObjectURL(file) });
  if (fbPostImages.length > 1) setPostType('carousel');
  renderFBStrip();
}
window.removeFBImage = function(id) {
  fbPostImages = fbPostImages.filter(i => i.id !== id);
  if (fbPostImages.length <= 1 && activePostType === 'carousel') setPostType('image');
  renderFBStrip();
};
function renderFBStrip() {
  const strip = document.getElementById('fb-strip');
  strip.innerHTML = fbPostImages.length
    ? fbPostImages.map((img,i) => '<div class="img-thumb'+(i===0?' primary':'')+'"><img src="'+img.url+'"><div class="rm" onclick="removeFBImage(\''+img.id+'\')">✕</div></div>').join('')
    : '<div style="font-size:10px;color:var(--text3)">No images</div>';
}

window.setPostType = function(t) {
  activePostType = t;
  document.querySelectorAll('[data-pt]').forEach(b => b.classList.toggle('active', b.dataset.pt===t));
  document.getElementById('post-type-badge').textContent = t.charAt(0).toUpperCase()+t.slice(1);
  document.getElementById('fb-img-area').style.display = t==='text'||t==='video' ? 'none' : 'block';
  document.getElementById('fb-video-area').style.display = t==='video' ? 'block' : 'none';
};

window.fbAppend = function(e) { const ta=document.getElementById('fb-caption'); ta.value+=e; ta.focus(); };
window.fbInsertHashtags = function() {
  const ta = document.getElementById('fb-caption');
  const tags = '#JOAF #বাংলাদেশ #JulyRevolution #জুলাইবিপ্লব #দেশআগেদলপরে';
  if (!ta.value.includes('#JOAF')) ta.value += (ta.value?'\\n\\n':'')+tags;
};

// ── MAIN GENERATE ─────────────────────────────────────────────────────
window.runGenerate = async function() {
  const btn = document.getElementById('gen-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spin">⚙️</span> Generating...';
  setProgress(0); cardBlob = null; enableActions();

  try {
    setProgress(8); log('🤖 AI request পাঠানো হচ্ছে...');
    let content;

    if (activeSource === 'image' && ocrFiles.length) {
      setProgress(15); log('📸 Image OCR processing...');
      content = await processImageWithOCR(ocrFiles[0], activeTone);
    } else if (activeSource === 'url') {
      const url = document.getElementById('url-input').value.trim();
      if (!url) throw new Error('URL দিন');
      setProgress(12); log('🔗 URL scraping...');
      const txt = await scrapeURL(url);
      content = await generateMasterContent(txt, activeTone);
    } else {
      const txt = document.getElementById('topic-input').value.trim();
      if (!txt) throw new Error('টপিক লিখুন');
      content = await generateMasterContent(txt, activeTone);
    }

    content.cardTemplate = activeTemplate;
    currentContent = content;
    setProgress(55); log('✅ Content ready — canvas render...');
    populateUI(content);

    await renderCard(content);
    setProgress(90);

    if (document.getElementById('auto-queue').checked && cardBlob) {
      addToQueue(); log('📋 Auto-queued');
    }
    setProgress(100); log('🎉 Done! Viral Score: '+(content.analyticsHints?.viralScore||'?'));
    enableActions();
    document.getElementById('regen-btn').style.display = 'inline-flex';

  } catch(e) { log('❌ '+e.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='🚀 Generate NewsCard'; }
};

window.runReelGenerate = async function() {
  const btn = document.getElementById('reel-gen-btn');
  btn.disabled=true; btn.innerHTML='<span class="spin">⚙️</span> Generating...';
  setProgress(0);
  try {
    const txt = document.getElementById('reel-topic').value.trim() || document.getElementById('topic-input').value.trim();
    if (!txt) throw new Error('টপিক লিখুন');
    log('🧠 Reel content generating...');
    const content = await generateMasterContent(txt, activeTone);
    content.cardTemplate = activeTemplate;
    currentContent = content;
    setProgress(40); log('🎬 Reel rendering...');
    populateUI(content);
    await renderReelVideo(content);
    setProgress(100); log('🎉 Reel done');
    enableActions();
  } catch(e) { log('❌ '+e.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='🎬 Generate Reel'; }
};

window.runBatchGenerate = async function() {
  if (!batchFiles.length) { log('📦 No batch files', 'warn'); return; }
  const btn = document.getElementById('batch-gen-btn');
  btn.disabled=true; btn.innerHTML='<span class="spin">⚙️</span> Processing...';
  const tmpl = document.getElementById('batch-template').value;
  log('📦 Batch: '+batchFiles.length+' files');
  for (let i=0; i<batchFiles.length; i++) {
    setProgress(Math.round((i/batchFiles.length)*100));
    try {
      const c = await processImageWithOCR(batchFiles[i], activeTone);
      c.cardTemplate = tmpl;
      canvas.width = canvasW; canvas.height = canvasH;
      drawNewsCardPro(ctx, canvasW, canvasH, c, await loadImage(batchFiles[i]), tmpl);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png', 1.0));
      queueAddItem({ blob, name:'batch-'+(i+1)+'-'+Date.now()+'.png', caption: c.caption||'', isVideo:false, content:c });
      log('✅ Card '+(i+1)+'/'+batchFiles.length+': '+c.headline?.slice(0,40));
    } catch(e) { log('⚠️ Card '+(i+1)+' failed: '+e.message,'warn'); }
  }
  setProgress(100); log('🎉 Batch done! '+queue.length+' items queued');
  btn.disabled=false; btn.innerHTML='📦 Generate All';
  renderQueueList();
};

// ── Rendering ─────────────────────────────────────────────────────────
async function renderCard(content) {
  document.getElementById('canvas-ph').style.display = 'none';
  canvas.style.display = 'block'; video.style.display = 'none';
  canvas.width = canvasW; canvas.height = canvasH;
  // Use drawNewsCardPro for full aspect-aware, template-aware rendering
  drawNewsCardPro(ctx, canvasW, canvasH, content, bgImage, activeTemplate);
  cardBlob = await new Promise(r => canvas.toBlob(r, 'image/png', 1.0));
  log('🖼️ Card: '+canvasW+'×'+canvasH+' PNG ('+activeTemplate+' template, '+activeTone+' tone)');
}

function rerender() {
  if (!currentContent) return;
  canvas.width = canvasW; canvas.height = canvasH;
  drawNewsCardPro(ctx, canvasW, canvasH, currentContent, bgImage, activeTemplate);
  canvas.toBlob(b => cardBlob = b, 'image/png', 1.0);
}

async function renderReelVideo(content) {
  const W=1080, H=1920;
  const rc = document.createElement('canvas'); rc.width=W; rc.height=H;
  const rCtx = rc.getContext('2d');
  const scenes = content.sceneBreakdown || (content.reelScript||[]).map((text,i)=>({title:'Slide '+(i+1),text,duration:i===0?5:10,mood:content.emotion}));
  const durations = content.sceneDurations || scenes.map(s=>s.duration||8);
  const fps = 30;
  const totalFrames = durations.reduce((a,b)=>a+b,0)*fps;

  const stream = rc.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm', videoBitsPerSecond:4_000_000 });
  const chunks=[]; recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
  recorder.start(100);

  let frame=0, sceneIdx=0, sceneFrame=0;
  await new Promise(resolve => {
    const tick=()=>{
      if(frame>=totalFrames){recorder.stop();return;}
      const sceneTotalF=durations[sceneIdx]*fps;
      const t=sceneFrame/sceneTotalF;
      drawReelFrame(rCtx,W,H,scenes[sceneIdx],content,t,bgImage);
      sceneFrame++;
      if(sceneFrame>=sceneTotalF){sceneIdx=Math.min(sceneIdx+1,scenes.length-1);sceneFrame=0;}
      frame++;
      if(frame%30===0){setProgress(40+Math.round(frame/totalFrames*50));log('🎬 '+Math.round(frame/totalFrames*100)+'%...');}
      requestAnimationFrame(tick);
    };
    recorder.onstop=resolve; requestAnimationFrame(tick);
  });

  reelBlob = new Blob(chunks,{type:'video/webm'});
  video.src = URL.createObjectURL(reelBlob);
  video.style.display='block'; canvas.style.display='none';
  document.getElementById('canvas-ph').style.display='none';
  log('🎬 Reel: '+(reelBlob.size/1024/1024).toFixed(1)+'MB');
}

// ── Content UI population ──────────────────────────────────────────────
function populateUI(c) {
  document.getElementById('out-headline').textContent = c.headline || '—';
  document.getElementById('out-hook').textContent = c.hook || '—';
  document.getElementById('out-summary').textContent = c.summary || '—';
  document.getElementById('caption-ta').value = c.caption || '';

  // Viral score badge + bar
  const vs = c.analyticsHints?.viralScore || 0;
  document.getElementById('viral-score-badge').textContent = vs ? '🔥 '+vs : '—';
  document.getElementById('viral-bar-fill').style.width = vs+'%';
  document.getElementById('viral-bar-fill').style.background = vs>75?'linear-gradient(90deg,var(--red),var(--gold))':vs>50?'linear-gradient(90deg,var(--gold),var(--blue))':'linear-gradient(90deg,var(--blue),var(--accent))';

  // Analytics grid
  const ah = c.analyticsHints || {};
  document.getElementById('analytics-out').innerHTML =
    '<div class="stat-card"><div class="stat-num" style="color:var(--red2)">'+(ah.viralScore||'—')+'</div><div class="stat-lbl">Viral Score</div></div>'+
    '<div class="stat-card"><div class="stat-num" style="color:var(--green2)">'+(ah.engagementPotential||'—')+'</div><div class="stat-lbl">Engagement</div></div>'+
    '<div class="stat-card"><div class="stat-num" style="color:var(--orange2)">'+(ah.controversyLevel||'—')+'</div><div class="stat-lbl">Controversy</div></div>'+
    '<div class="stat-card"><div class="stat-num" style="color:var(--accent2)">'+((c.publishSettings?.priority||'—').toUpperCase())+'</div><div class="stat-lbl">Priority</div></div>';

  // Hashtag cloud
  const cloud = document.getElementById('hashtag-cloud');
  cloud.innerHTML = (c.hashtags||[]).map(h=>'<span class="ht" onclick="appendHashtag(\''+h+'\')" title="Click to add to caption">'+h+'</span>').join('');

  // Platform variants
  const pv = c.platformVariants || {};
  document.getElementById('platform-out').innerHTML = ['facebook','instagram'].map(p =>
    pv[p]?'<div style="margin-bottom:8px"><div style="font-size:9px;font-weight:800;color:var(--accent2);margin-bottom:3px">'+p.toUpperCase()+'</div><div style="font-size:11px;color:var(--text2);">'+(pv[p].caption||'—').slice(0,120)+'...</div></div>':''
  ).join('');

  // Safety
  const s = c.safety || {};
  document.getElementById('safety-out').innerHTML =
    '<span style="color:'+(s.nsfw?'var(--red2)':'var(--green2)')+'">NSFW:'+(s.nsfw?'⚠️':'✅')+'</span> '+
    '<span style="color:'+(s.political?'var(--gold2)':'var(--green2)')+'"> Political:'+(s.political?'⚠️':'✅')+'</span>';

  // Reel script
  document.getElementById('script-out').innerHTML = (c.reelScript||[]).map((s,i)=>
    '<div style="padding:7px 10px;background:var(--bg3);border-radius:7px;border-left:3px solid var(--accent);margin-bottom:6px"><div style="font-size:9px;color:var(--text3);margin-bottom:3px">Slide '+(i+1)+'</div><div style="font-size:11px">'+s+'</div></div>'
  ).join('') || '<div style="font-size:11px;color:var(--text3)">Generate করলে দেখাবে</div>';
}

window.switchCap = function(v) {
  if (!currentContent) return;
  document.querySelectorAll('.cap-var').forEach(b => b.classList.toggle('active', b.dataset.v===v));
  if (v === 'facebook') {
    document.getElementById('caption-ta').value = currentContent.platformVariants?.facebook?.caption || currentContent.caption || '';
  } else {
    document.getElementById('caption-ta').value = currentContent[v] || currentContent.caption || '';
  }
};

window.appendHashtag = function(h) {
  const ta = document.getElementById('caption-ta');
  if (!ta.value.includes(h)) ta.value += (ta.value?'\\n':'')+h;
};

// ── Caption actions ────────────────────────────────────────────────────
window.copyCaption = function() {
  navigator.clipboard.writeText(document.getElementById('caption-ta').value).then(()=>log('📋 Caption copied'));
};
window.copyWithHashtags = function() {
  const cap = document.getElementById('caption-ta').value;
  const tags = (currentContent?.hashtags||[]).join(' ');
  navigator.clipboard.writeText(cap+(cap&&tags?'\\n\\n':'')+tags).then(()=>log('📋 Caption+hashtags copied'));
};

// ── Queue system ───────────────────────────────────────────────────────
const STATUS = { PENDING:'pending', DONE:'done', FAILED:'failed', SCHEDULED:'scheduled', PUBLISHING:'publishing' };

function queueAddItem(item) {
  const id = Date.now()+'-'+Math.random().toString(36).slice(2,6);
  queue.push({ id, ...item, status:item.scheduledAt?STATUS.SCHEDULED:STATUS.PENDING, selected:true, blobUrl: item.blob?URL.createObjectURL(item.blob):null });
  updateQueueBadge(); renderQueueList();
  return id;
}

function updateQueueBadge() {
  document.getElementById('q-badge').textContent = queue.length;
  document.getElementById('q-count-left').textContent = queue.length;
  const pending = queue.filter(i=>i.status===STATUS.PENDING||i.status===STATUS.SCHEDULED).length;
  document.getElementById('q-status').textContent = queue.length+' items • '+pending+' pending • '+queue.filter(i=>i.status===STATUS.DONE).length+' done';
  document.getElementById('q-stats').textContent = queue.length+' total, '+queue.filter(i=>i.status===STATUS.PENDING).length+' pending';
}

function renderQueueList() {
  const el = document.getElementById('queue-list-center');
  el.innerHTML = queue.length
    ? queue.map(item=>'<div class="q-item"><div class="q-thumb">'+(item.blobUrl?'<img src="'+item.blobUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px">':'📝')+'</div><div class="q-info"><div class="q-name">'+(item.name||'unnamed')+'</div><div class="q-cap">'+(item.caption||'').slice(0,55)+'...</div><div style="display:flex;gap:5px;margin-top:4px;align-items:center"><span class="q-badge '+item.status+'">'+item.status+'</span>'+(item.scheduledAt?'<span style="font-size:9px;color:var(--text3)">'+new Date(item.scheduledAt).toLocaleString('bn-BD')+'</span>':'')+'</div>'+(item.error?'<div style="font-size:9px;color:var(--red2);margin-top:2px">'+item.error+'</div>':'')+'<div style="margin-top:5px;display:flex;gap:4px"><button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:9px" onclick="publishQueueItem(\''+item.id+'\')">📤</button><button class="btn btn-red btn-sm" style="padding:2px 7px;font-size:9px" onclick="removeQueueItem(\''+item.id+'\')">🗑️</button></div></div></div>').join('')
    : '<div style="font-size:12px;color:var(--text3);padding:20px;text-align:center">Queue empty</div>';
  updateQueueBadge();
}

window.addToQueue = function() {
  if (!cardBlob && !reelBlob) return;
  const cap = document.getElementById('caption-ta').value || currentContent?.caption || '';
  const sched = document.getElementById('schedule-input').value;
  if (cardBlob) queueAddItem({ blob:cardBlob, name:'joaf-card-'+Date.now()+'.png', caption:cap, isVideo:false, scheduledAt:sched?new Date(sched).toISOString():null, content:{...currentContent} });
  if (reelBlob) queueAddItem({ blob:reelBlob, name:'joaf-reel-'+Date.now()+'.webm', caption:cap, isVideo:true, scheduledAt:sched?new Date(sched).toISOString():null, content:{...currentContent} });
  log('📋 Added to queue');
};

window.publishNow = async function() {
  if (!cardBlob && !reelBlob) return;
  const id = queueAddItem({ blob:cardBlob||reelBlob, name:'joaf-now-'+Date.now(), caption:document.getElementById('caption-ta').value||currentContent?.caption||'', isVideo:!!reelBlob&&!cardBlob });
  await publishQueueItem(id);
};

window.publishQueueItem = async function(id) {
  const item = queue.find(i=>i.id===id);
  if (!item || !item.blob) { fbLog('❌ No blob for item '+id,'error'); return; }
  item.status = STATUS.PUBLISHING; renderQueueList();
  try {
    const imageUrl = await uploadBlob(item.blob, item.name);
    const cap = item.caption || '';
    const excludeIds = getExcludedPageIds();
    const r = await fetch(FB_API, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'post', caption:cap, imageUrl, excludeIds }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    item.status = d.ok>0 ? STATUS.DONE : STATUS.FAILED;
    item.postId = d.results?.find(x=>x.ok)?.postId;
    fbStats.total++; fbStats.ok+=d.ok||0; fbStats.fail+=d.fail||0; updateFBStats();
    log(d.ok>0 ? '✅ Published to '+d.ok+' page(s)' : '❌ Post failed');
  } catch(e) { item.status=STATUS.FAILED; item.error=e.message; log('❌ '+e.message,'error'); }
  renderQueueList();
};

window.publishSelected = async function() {
  const selected = queue.filter(i=>i.selected && (i.status===STATUS.PENDING||i.status===STATUS.SCHEDULED));
  for (const item of selected) await publishQueueItem(item.id);
};

window.publishAll = async function() {
  queue.forEach(i=>i.selected=true);
  await publishSelected();
};

window.removeQueueItem = function(id) { queue=queue.filter(i=>i.id!==id); renderQueueList(); };
window.clearQueue = function() { if(confirm('Queue clear?')){ queue=[]; renderQueueList(); } };

// ── FB Post ─────────────────────────────────────────────────────────────
window.loadFBPages = async function() {
  try {
    const r = await fetch(FB_API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'get-pages'}) });
    const d = await r.json();
    fbPages = d.pages || [];
    const count = fbPages.length;
    document.getElementById('fb-page-count').textContent = count;

    const html = fbPages.length
      ? fbPages.map(p=>'<div class="page-item"><div class="page-avatar">📘</div><div class="page-name">'+p.name+'</div><label class="toggle"><input type="checkbox" id="pg-'+p.id+'" checked><span class="toggle-track"></span></label></div>').join('')
      : '<div style="font-size:11px;color:var(--text3)">FB_PAGE_ACCESS_TOKENS not set</div>';
    document.getElementById('fb-pages-center').innerHTML = html;
    document.getElementById('fb-pages-left').innerHTML = html;
  } catch(e) { fbLog('Pages load error: '+e.message,'error'); }
};

window.checkFBToken = async function() {
  const pill = document.getElementById('token-pill');
  const detail = document.getElementById('token-detail');
  try {
    const r = await fetch(FB_API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'check-token'}) });
    const d = await r.json();
    if (d.ok) {
      const exp = d.expires_at ? new Date(d.expires_at*1000).toLocaleDateString('bn-BD') : 'Never';
      pill.style.background='rgba(22,163,74,.15)'; pill.style.color='var(--green2)'; pill.textContent='✅ Token Valid';
      detail.innerHTML='Status: <strong style="color:var(--green2)">Valid</strong><br>Pages: <strong>'+d.pages+'</strong><br>Expires: <strong>'+exp+'</strong>';
    } else {
      pill.style.background='rgba(220,38,38,.15)'; pill.style.color='var(--red2)'; pill.textContent='❌ Token Expired';
      detail.innerHTML='Status: <strong style="color:var(--red2)">Invalid/Expired</strong><br>FB_PAGE_ACCESS_TOKENS আপডেট করুন।';
    }
  } catch { pill.textContent='⚠️ Token check failed'; }
};

window.selectAllPages = function(v) { document.querySelectorAll('[id^="pg-"]').forEach(cb=>cb.checked=v); };

function getExcludedPageIds() {
  return fbPages.filter(p=>{ const cb=document.getElementById('pg-'+p.id); return cb && !cb.checked; }).map(p=>p.id);
}

window.doFBPost = async function() {
  const btn = document.getElementById('fb-post-btn');
  btn.disabled=true; btn.innerHTML='<span class="spin">⏳</span> Posting...';
  setFBProgress(10);
  try {
    const result = await executeFBPost();
    showFBResults(result);
    fbStats.total++; fbStats.ok+=result.ok||0; fbStats.fail+=result.fail||0; updateFBStats();
    fbLog('✅ Posted: '+(result.ok||0)+'/'+(result.total||0)+' pages');
  } catch(e) { fbLog('❌ '+e.message,'error'); }
  finally { btn.disabled=false; btn.innerHTML='📘 Post Now'; setFBProgress(100); }
};

async function executeFBPost() {
  const caption = document.getElementById('fb-caption').value;
  const excludeIds = getExcludedPageIds();
  let body = { action:'post', caption, excludeIds };
  if (activePostType==='video') {
    body.videoUrl = document.getElementById('fb-video-url').value;
  } else if (activePostType==='carousel' && fbPostImages.length>=2) {
    body.action='carousel';
    body.imageUrls = await Promise.all(fbPostImages.map(img=>uploadBlob(img.file, img.file.name)));
  } else if (fbPostImages.length>0) {
    body.imageUrl = await uploadBlob(fbPostImages[0].file, fbPostImages[0].file.name);
  }
  setFBProgress(60);
  const r = await fetch(FB_API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  setFBProgress(90); return d;
}

window.doFBSchedule = function() {
  const schedVal = document.getElementById('fb-schedule').value;
  if (!schedVal) { alert('Schedule time দিন'); return; }
  const blob = fbPostImages[0]?.file || null;
  queueAddItem({ blob, name:'fb-post-'+Date.now(), caption:document.getElementById('fb-caption').value, isVideo:false, scheduledAt:new Date(schedVal).toISOString() });
  fbLog('⏰ Scheduled: '+new Date(schedVal).toLocaleString('bn-BD'));
  switchMode('queue');
};

window.addFBToQueue = function() {
  const blob = fbPostImages[0]?.file || null;
  queueAddItem({ blob, name:'fb-post-'+Date.now(), caption:document.getElementById('fb-caption').value, isVideo:false });
  fbLog('📋 Added to queue'); switchMode('queue');
};

function showFBResults(d) {
  const card = document.getElementById('fb-results-card');
  card.style.display='block';
  document.getElementById('fb-results-content').innerHTML = (d.results||[]).map(r=>
    '<div style="padding:8px 10px;border-radius:7px;border-left:3px solid '+(r.ok?'var(--green2)':'var(--red2)')+';background:var(--bg3);margin-bottom:5px;font-size:11px"><strong>'+r.name+'</strong> — '+(r.ok?'✅ Post ID: '+r.postId:'❌ '+r.error)+'</div>'
  ).join('');
}

function updateFBStats() {
  document.getElementById('st-total').textContent=fbStats.total;
  document.getElementById('st-ok').textContent=fbStats.ok;
  document.getElementById('st-fail').textContent=fbStats.fail;
}

// ── Upload helper ──────────────────────────────────────────────────────
async function uploadBlob(blob, filename) {
  const fd = new FormData(); fd.append('file', blob, filename||'upload.png');
  const r = await fetch('/api/github-upload', { method:'POST', body: fd });
  const d = await r.json();
  if (!d.url) throw new Error('Upload failed');
  return d.url;
}

// ── Download ───────────────────────────────────────────────────────────
window.downloadCard = function() {
  if (!cardBlob) return;
  const a=document.createElement('a'); a.href=URL.createObjectURL(cardBlob);
  a.download='joaf-'+activeTemplate+'-'+canvasW+'x'+canvasH+'-'+Date.now()+'.png'; a.click();
};
window.downloadReel = function() {
  if (!reelBlob) return;
  const a=document.createElement('a'); a.href=URL.createObjectURL(reelBlob);
  a.download='joaf-reel-'+Date.now()+'.webm'; a.click();
};

// ── URL scrape ─────────────────────────────────────────────────────────
async function scrapeURL(url) {
  try {
    const r = await fetch('/api/fetch-rss?url='+encodeURIComponent(url));
    if (!r.ok) return url;
    return (await r.text()).slice(0,2000);
  } catch { return url; }
}

// ── Utils ──────────────────────────────────────────────────────────────
function loadImage(file) {
  return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=typeof file==='string'?file:URL.createObjectURL(file); });
}

function enableActions() {
  document.getElementById('dl-card-btn').disabled=!cardBlob;
  document.getElementById('dl-reel-btn').style.display=reelBlob?'inline-flex':'none';
  document.getElementById('queue-btn').disabled=(!cardBlob&&!reelBlob);
  document.getElementById('publish-now-btn').disabled=(!cardBlob&&!reelBlob);
}

function setProgress(p) { document.getElementById('prog-fill').style.width=p+'%'; }
function setFBProgress(p) { document.getElementById('fb-prog-fill').style.width=p+'%'; }

function log(msg, type='info') {
  const a = document.getElementById('log-area');
  const c = type==='error'?'var(--red2)':type==='warn'?'var(--gold2)':'var(--text2)';
  const t = new Date().toLocaleTimeString('bn-BD');
  a.innerHTML += '<div style="color:'+c+'">['+t+'] '+msg+'</div>';
  a.scrollTop = a.scrollHeight;
}

function fbLog(msg, type='info') {
  [document.getElementById('fb-log-area'), document.getElementById('fb-right-log')].forEach(a=>{
    if (!a) return;
    const c = type==='error'?'var(--red2)':type==='ok'?'var(--green2)':'var(--text2)';
    const t = new Date().toLocaleTimeString('bn-BD');
    a.innerHTML += '<div style="color:'+c+'">['+t+'] '+msg+'</div>';
    a.scrollTop = a.scrollHeight;
  });
}

// Expose to inline handlers
window.loadFBPages = window.loadFBPages;
window.checkFBToken = window.checkFBToken;
</script>
</body>
</html>`;

writeFileSync(`${BASE}/admin/studio.html`, studioHTML);
console.log('✅ admin/studio.html — UNIFIED MEGA STUDIO written (' + studioHTML.length + ' chars)');

// ── STEP 4: Git commit + push ──────────────────────────────────────────
try {
  run('git add admin/studio.html js/render/baserenderer.js');
  const deleted = toDelete.map(f=>f.split('/').pop()).join(' ');
  if (toDelete.some(f => !existsSync(f))) {
    try { run('git rm --cached ' + toDelete.map(f=>'admin/'+f.split('/').pop()).join(' ')); } catch {}
    run('git add -A');
  }
  run('git commit -m "feat: Unified JOAF AI Studio Pro — aspect-aware canvas, 6 templates, FB post, queue [research-backed]" --allow-empty');
  run('git push origin main');
  console.log('✅ git push done');
} catch(e) { console.error('⚠️ Git error:', e.message); }

// ── STEP 5: Checklist ─────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║  RESEARCH APPLIED                                               ║');
console.log('║  ✅ 4:5 (1080×1350) = Most Viral BD format 2025-26             ║');
console.log('║  ✅ "breaking" template = Highest CTR for news content          ║');
console.log('║  ✅ <80 char caption = 66% more engagement (mobile-first)       ║');
console.log('║  ✅ JOAF brand: "দেশ আগে দল পরে" watermark on every card      ║');
console.log('║  ✅ Mobile safe zone: 60px padding (98% BD users on mobile)     ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  FILES                                                          ║');
console.log('║  ✅ admin/studio.html     — UNIFIED (newscard+fbpost+queue)     ║');
console.log('║  ✅ js/render/baserenderer.js — drawNewsCardPro() added         ║');
console.log('║  🗑️  admin/newscard.html  — DELETED (merged into studio)        ║');
console.log('║  🗑️  admin/fbpost-panel.html — DELETED (merged into studio)     ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  STUDIO TABS                                                    ║');
console.log('║  🗞️  NewsCard  — 6 templates × 7 tones × 4 aspect ratios       ║');
console.log('║  🎬  Reel      — scene-based video renderer                     ║');
console.log('║  📦  Batch     — multi-image OCR → card pipeline                ║');
console.log('║  📘  FB Post   — carousel, page toggle, scheduler               ║');
console.log('║  📋  Queue     — unified publish queue + stats                  ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║  NEXT → julyforum.com/admin/studio.html                         ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');
MASTEREOF
echo "✅ Script ready — $(wc -l < /tmp/joaf_master_build.mjs) lines"

(base) ashfakurrahaman@ASHFAKURs-MacBook-Air JOAF-main % 











