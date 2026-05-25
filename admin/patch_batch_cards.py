#!/usr/bin/env python3
"""
patch_batch_cards.py
────────────────────
Patches JOAF/admin/index.html to support:
  1. Multiple file drag-and-drop → thumbnail strip with ✓ select / deselect
  2. "✅ All" / "❌ Deselect" toggle buttons
  3. Generate → produces one card per selected image
  4. Batch results strip (thumbnail + download button per card)
  5. SA panel auto-fills with the first card

Usage:
    python3 patch_batch_cards.py            # patches in-place
    python3 patch_batch_cards.py --dry-run  # preview only
"""

import re, sys, pathlib

SRC = pathlib.Path("JOAF/admin/index.html")
if not SRC.exists():
    # Try relative to script location
    SRC = pathlib.Path(__file__).parent / "JOAF/admin/index.html"
if not SRC.exists():
    sys.exit(f"❌  Cannot find {SRC}")

DRY = "--dry-run" in sys.argv
html = SRC.read_text(encoding="utf-8")

PATCHES = []   # list of (old_snippet, new_snippet, label)

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 1 — Image upload zone: add ✅All / ❌Deselect buttons + richer strip
# ─────────────────────────────────────────────────────────────────────────────

OLD_UPLOAD_ZONE = '''\
              <div id="img-upload-zone" style="border:2px dashed var(--border2);border-radius:8px;padding:10px;text-align:center;cursor:pointer;transition:.15s;position:relative;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border2)\'">
                <input type="file" id="fb-img-input" accept="image/*,video/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;" onchange="fbAnalyzeImage(this)">
                <div id="img-upload-preview" style="display:none;margin-bottom:5px"><img id="img-preview-thumb" style="max-height:70px;border-radius:6px;border:1px solid var(--border)"></div>
                <div id="img-upload-label" style="font-size:11px;color:var(--text2)">📸 Click বা drag<br><span style="font-size:10px;color:var(--text3)">AI analyze করে text বানাবে</span></div>
                <div id="img-analyze-status" style="font-size:11px;color:var(--amber);margin-top:4px;display:none">⏳ Analyze হচ্ছে...</div>
                <div id="img-batch-count" style="display:none;font-size:10px;color:var(--accent);margin-top:3px;font-weight:700"></div>
                <div id="img-thumb-strip" style="display:none;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center;"></div>
              </div>'''

NEW_UPLOAD_ZONE = '''\
              <div id="img-upload-zone" style="border:2px dashed var(--border2);border-radius:8px;padding:10px;text-align:center;cursor:pointer;transition:.15s;position:relative;"
                   onmouseover="this.style.borderColor=\'var(--accent)\'"
                   onmouseout="this.style.borderColor=\'var(--border2)\'"
                   ondragover="event.preventDefault();this.style.borderColor=\'var(--accent)\'"
                   ondragleave="this.style.borderColor=\'var(--border2)\'"
                   ondrop="event.preventDefault();fbHandleDrop(event)">
                <input type="file" id="fb-img-input" accept="image/*,video/*" multiple
                       style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;"
                       onchange="fbAnalyzeImage(this)">
                <div id="img-upload-preview" style="display:none;margin-bottom:5px">
                  <img id="img-preview-thumb" style="max-height:70px;border-radius:6px;border:1px solid var(--border)">
                </div>
                <div id="img-upload-label" style="font-size:11px;color:var(--text2)">
                  📸 Click বা drag করুন<br><span style="font-size:10px;color:var(--text3)">সব image একসাথে drop করুন → সব কার্ড তৈরি হবে</span>
                </div>
                <div id="img-analyze-status" style="font-size:11px;color:var(--amber);margin-top:4px;display:none">⏳ Analyze হচ্ছে...</div>
                <div id="img-batch-count" style="display:none;font-size:10px;color:var(--accent);margin-top:3px;font-weight:700"></div>
                <!-- Select-all / Deselect row -->
                <div id="img-select-row" style="display:none;gap:5px;justify-content:center;margin-top:6px;flex-wrap:wrap;">
                  <button onclick="fbSelectAllImages(true)"  style="padding:3px 10px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">✅ All</button>
                  <button onclick="fbSelectAllImages(false)" style="padding:3px 10px;border-radius:12px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">❌ Deselect</button>
                </div>
                <!-- Thumbnail strip -->
                <div id="img-thumb-strip" style="display:none;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center;"></div>
              </div>'''

PATCHES.append((OLD_UPLOAD_ZONE, NEW_UPLOAD_ZONE, "Upload zone enhanced"))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 2 — Batch results strip (goes just below the existing preview card)
#           Add a new card div after the existing Preview card closer
# ─────────────────────────────────────────────────────────────────────────────

OLD_AFTER_PREVIEW = '''\
            <div id="fb-post-log" style="margin-top:10px;font-size:11px;max-height:180px;overflow-y:auto;"></div>
          </div>
          <!-- STANDALONE FB POST CARD -->'''

NEW_AFTER_PREVIEW = '''\
            <div id="fb-post-log" style="margin-top:10px;font-size:11px;max-height:180px;overflow-y:auto;"></div>
          </div>
          <!-- BATCH CARDS RESULT STRIP -->
          <div class="card" id="fb-batch-results-card" style="margin:0;display:none;">
            <div class="card-header" style="padding-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
              <div class="card-title" style="font-size:13px;">🗂️ Batch Cards</div>
              <button onclick="fbDownloadAllCards()" style="padding:4px 10px;background:#25d366;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">⬇️ সব Download</button>
            </div>
            <div id="fb-batch-strip" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
          </div>
          <!-- STANDALONE FB POST CARD -->'''

PATCHES.append((OLD_AFTER_PREVIEW, NEW_AFTER_PREVIEW, "Batch results strip added"))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 3 — JS: replace fbAnalyzeImage + fbGenerateReel preamble
#           with batch-aware versions + new helpers
# ─────────────────────────────────────────────────────────────────────────────

OLD_ANALYZE_FN = '''async function fbAnalyzeImage(input) {
  const allFiles = Array.from(input.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
  if (!allFiles.length) return;
  window._fbFiles = allFiles;
  input.value = '';
  const file = allFiles[0];
  const preview = document.getElementById('img-upload-preview');
  const thumb = document.getElementById('img-preview-thumb');
  const label = document.getElementById('img-upload-label');
  const status = document.getElementById('img-analyze-status');
  const cnt = document.getElementById('img-batch-count');
  if (cnt) { cnt.textContent = allFiles.length > 1 ? allFiles.length + 'টা file selected' : ''; cnt.style.display = allFiles.length > 1 ? 'block' : 'none'; }
  const strip = document.getElementById('img-thumb-strip');
  if (strip) {
    strip.innerHTML = '';
    if (allFiles.length > 1) {
      strip.style.display = 'flex';
      allFiles.forEach(function(f) {
        const url = URL.createObjectURL(f);
        const img = document.createElement('img');
        img.src = url; img.style.cssText = 'height:40px;width:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border);';
        img.onload = function() { URL.revokeObjectURL(url); };
        strip.appendChild(img);
      });
    } else { strip.style.display = 'none'; }
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    thumb.src = e.target.result;
    preview.style.display = 'block';
    label.style.display = 'none';
    status.style.display = 'block';
    status.textContent = 'Image analyze হচ্ছে...';
    try {
      const base64 = e.target.result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      const res = await fetch('/.netlify/functions/groq-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } },
              { type: 'text', text: 'এই image টি analyze করো। বাংলাদেশী সংবাদ বা ঘটনার ছবি হতে পারে। Image থেকে বাংলায় ৩-৫ বাক্যে news summary লেখো। কোনো hashtag বা formatting ছাড়া।' }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        document.getElementById('fb-news-input').value = text.trim();
        status.textContent = '✅ Analyze সম্পন্ন';
        status.style.color = 'var(--green)';
      } else throw new Error('AI response নেই');
    } catch(err) {
      status.textContent = '❌ ' + err.message;
      status.style.color = 'var(--red)';
    }
  };
  reader.readAsDataURL(file);
}'''

NEW_ANALYZE_FN = '''// ── Drag-and-drop handler ─────────────────────────────────────
window.fbHandleDrop = function(event) {
  const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
  if (!files.length) return;
  // Merge with existing files
  const existing = window._fbFiles || [];
  const merged = [...existing];
  files.forEach(f => { if (!merged.find(e => e.name === f.name && e.size === f.size)) merged.push(f); });
  window._fbFiles = merged;
  window._fbSelected = merged.map((_, i) => i);  // all selected by default
  fbRenderThumbStrip();
  // Analyze first image
  fbAnalyzeOneFile(merged[0]);
};

// ── Select-all / deselect ─────────────────────────────────────
window.fbSelectAllImages = function(selectAll) {
  if (!window._fbFiles) return;
  window._fbSelected = selectAll ? window._fbFiles.map((_, i) => i) : [];
  fbRenderThumbStrip();
};

// ── Render interactive thumbnail strip ───────────────────────
function fbRenderThumbStrip() {
  const files = window._fbFiles || [];
  const selected = window._fbSelected || [];
  const strip = document.getElementById('img-thumb-strip');
  const selRow = document.getElementById('img-select-row');
  const cnt = document.getElementById('img-batch-count');
  if (!strip) return;
  strip.innerHTML = '';
  if (!files.length) { strip.style.display = 'none'; if (selRow) selRow.style.display = 'none'; if (cnt) cnt.style.display = 'none'; return; }
  strip.style.display = 'flex';
  if (selRow) selRow.style.display = files.length > 1 ? 'flex' : 'none';
  if (cnt) { cnt.textContent = selected.length + '/' + files.length + 'টা selected'; cnt.style.display = 'block'; }
  files.forEach(function(f, idx) {
    const isSel = selected.includes(idx);
    const url = URL.createObjectURL(f);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;cursor:pointer;';
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'height:56px;width:56px;object-fit:cover;border-radius:6px;border:2px solid ' + (isSel ? 'var(--accent)' : 'var(--border)') + ';opacity:' + (isSel ? '1' : '0.45') + ';transition:.15s;';
    img.onload = function() { URL.revokeObjectURL(url); };
    // checkmark badge
    if (isSel) {
      const badge = document.createElement('div');
      badge.textContent = '✓';
      badge.style.cssText = 'position:absolute;top:2px;right:2px;background:var(--accent);color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;';
      wrap.appendChild(badge);
    }
    wrap.onclick = function() {
      const sel = window._fbSelected || [];
      if (sel.includes(idx)) window._fbSelected = sel.filter(i => i !== idx);
      else window._fbSelected = [...sel, idx];
      fbRenderThumbStrip();
    };
    wrap.appendChild(img);
    strip.appendChild(wrap);
  });
}

// ── Analyze a single File object ─────────────────────────────
async function fbAnalyzeOneFile(file) {
  const preview = document.getElementById('img-upload-preview');
  const thumb = document.getElementById('img-preview-thumb');
  const label = document.getElementById('img-upload-label');
  const status = document.getElementById('img-analyze-status');
  const reader = new FileReader();
  reader.onload = async function(e) {
    thumb.src = e.target.result;
    preview.style.display = 'block';
    label.style.display = 'none';
    status.style.display = 'block';
    status.textContent = 'Image analyze হচ্ছে...';
    status.style.color = 'var(--amber)';
    try {
      const base64 = e.target.result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      const res = await fetch('/.netlify/functions/groq-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 1000,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } },
            { type: 'text', text: 'এই image টি analyze করো। বাংলাদেশী সংবাদ বা ঘটনার ছবি হতে পারে। Image থেকে বাংলায় ৩-৫ বাক্যে news summary লেখো। কোনো hashtag বা formatting ছাড়া।' }
          ]}]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        document.getElementById('fb-news-input').value = text.trim();
        status.textContent = '✅ Analyze সম্পন্ন';
        status.style.color = 'var(--green)';
      } else throw new Error('AI response নেই');
    } catch(err) {
      status.textContent = '❌ ' + err.message;
      status.style.color = 'var(--red)';
    }
  };
  reader.readAsDataURL(file);
}

async function fbAnalyzeImage(input) {
  const allFiles = Array.from(input.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
  if (!allFiles.length) return;
  // Merge with existing files
  const existing = window._fbFiles || [];
  const merged = [...existing];
  allFiles.forEach(f => { if (!merged.find(e => e.name === f.name && e.size === f.size)) merged.push(f); });
  window._fbFiles = merged;
  window._fbSelected = merged.map((_, i) => i);  // all selected by default
  input.value = '';
  fbRenderThumbStrip();
  fbAnalyzeOneFile(allFiles[0]);
}'''

PATCHES.append((OLD_ANALYZE_FN, NEW_ANALYZE_FN, "fbAnalyzeImage → batch-aware + helpers"))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 4 — fbGenerateReel: wrap card mode to loop over all selected files
# ─────────────────────────────────────────────────────────────────────────────

OLD_GEN_CARD_BLOCK = '''    if (_fbCurrentMode === 'card') {
      // ── INSTANT CARD MODE ──────────────────────────────
      const panels = slideTexts.slice(0, 3).map(function(t) { return { type: 'text', title: '', content: t }; });
      if (logEl) logEl.innerHTML = '<div style="color:var(--green);font-size:11px;font-weight:700">🖼️ Card তৈরি হচ্ছে...</div>';
      await drawInstantCard(panels, mood, parsed.hook || '', text);
      const downloadCardBtn = document.getElementById('fb-download-card-btn');
      if (downloadCardBtn) downloadCardBtn.style.display = 'inline-block';
      if (logEl) logEl.innerHTML = '<div style="color:var(--green);font-size:11px;font-weight:700">✅ Card ready! ⬇️ Download করুন।</div>';
      // Auto-fill SA panel
      const cardCanvas2 = document.getElementById('fb-card-canvas');
      if (cardCanvas2) {
        cardCanvas2.toBlob(blob => {
          if (!blob) return;
          const cardFile = new File([blob], 'joaf-card-' + Date.now() + '.jpg', { type: 'image/jpeg' });
          const _cap = (document.getElementById('fb-caption')?.value||'') + (window._joafTags ? '\\n\\n' + window._joafTags : ''); pushToSAPanel(cardFile, URL.createObjectURL(blob), false, _cap);
        }, 'image/jpeg', 0.95);
      }
    } else {'''

NEW_GEN_CARD_BLOCK = '''    if (_fbCurrentMode === 'card') {
      // ── INSTANT CARD MODE — batch-aware ──────────────────
      const selectedIdxs = (window._fbSelected && window._fbSelected.length)
        ? window._fbSelected
        : (window._fbFiles && window._fbFiles.length ? window._fbFiles.map((_,i)=>i) : [null]);
      const batchFiles = (window._fbFiles && window._fbFiles.length)
        ? selectedIdxs.map(i => window._fbFiles[i]).filter(Boolean)
        : [null];  // null = no image, text-only card

      const panels = slideTexts.slice(0, 3).map(function(t) { return { type: 'text', title: '', content: t }; });

      // Clear previous batch results
      const batchCard = document.getElementById('fb-batch-results-card');
      const batchStrip = document.getElementById('fb-batch-strip');
      if (batchCard) batchCard.style.display = 'none';
      if (batchStrip) batchStrip.innerHTML = '';
      window._fbBatchBlobs = [];

      for (let bi = 0; bi < batchFiles.length; bi++) {
        const bFile = batchFiles[bi];
        if (logEl) logEl.innerHTML = '<div style="color:var(--green);font-size:11px;font-weight:700">🖼️ Card ' + (bi+1) + '/' + batchFiles.length + ' তৈরি হচ্ছে...</div>';

        // Override _fbFiles[0] so drawInstantCard uses this image
        if (bFile) window._fbCurrentBatchFile = bFile;
        else window._fbCurrentBatchFile = null;

        await drawInstantCard(panels, mood, parsed.hook || '', text);

        // Capture this card as blob
        const cardCanvas2 = document.getElementById('fb-card-canvas');
        if (cardCanvas2) {
          const blob = await new Promise(res => cardCanvas2.toBlob(res, 'image/jpeg', 0.95));
          if (blob) {
            window._fbBatchBlobs.push({ blob, name: 'joaf-card-' + Date.now() + '-' + (bi+1) + '.jpg' });
            // Add to batch strip
            if (batchStrip) {
              const thumbUrl = URL.createObjectURL(blob);
              const item = document.createElement('div');
              item.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
              const tImg = document.createElement('img');
              tImg.src = thumbUrl;
              tImg.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:7px;border:1px solid var(--border);cursor:pointer;';
              tImg.title = 'Click to download';
              tImg.onclick = (function(b, n) { return function() {
                const a = document.createElement('a'); a.download = n;
                a.href = URL.createObjectURL(b); a.click();
              }; })(blob, window._fbBatchBlobs[window._fbBatchBlobs.length-1].name);
              const dlBtn = document.createElement('button');
              dlBtn.textContent = '⬇️';
              dlBtn.style.cssText = 'padding:2px 8px;border-radius:6px;border:none;background:#25d366;color:#fff;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;';
              dlBtn.onclick = tImg.onclick;
              // Preview in main canvas on click
              const prevBtn = document.createElement('button');
              prevBtn.textContent = '👁️';
              prevBtn.style.cssText = 'padding:2px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;';
              prevBtn.title = 'Preview';
              prevBtn.onclick = (function(b) { return function() {
                const img = new Image(); img.onload = function() {
                  const c = document.getElementById('fb-card-canvas');
                  const ctx2 = c.getContext('2d');
                  c.width = img.width; c.height = img.height;
                  ctx2.drawImage(img, 0, 0);
                };
                img.src = URL.createObjectURL(b);
              }; })(blob);
              const btnRow = document.createElement('div');
              btnRow.style.cssText = 'display:flex;gap:3px;';
              btnRow.appendChild(prevBtn); btnRow.appendChild(dlBtn);
              item.appendChild(tImg); item.appendChild(btnRow);
              batchStrip.appendChild(item);
            }
            // First card → auto-fill SA panel
            if (bi === 0) {
              const capText = (document.getElementById('fb-caption')?.value||'') + (window._joafTags ? '\\n\\n' + window._joafTags : '');
              const cardFile = new File([blob], 'joaf-card-' + Date.now() + '.jpg', { type: 'image/jpeg' });
              pushToSAPanel(cardFile, URL.createObjectURL(blob), false, capText);
            }
          }
        }
      }

      // Show batch strip if >1
      if (batchCard && window._fbBatchBlobs.length > 1) batchCard.style.display = 'block';
      const downloadCardBtn = document.getElementById('fb-download-card-btn');
      if (downloadCardBtn) downloadCardBtn.style.display = 'inline-block';
      if (logEl) logEl.innerHTML = '<div style="color:var(--green);font-size:11px;font-weight:700">✅ ' + window._fbBatchBlobs.length + 'টা Card ready!</div>';
    } else {'''

PATCHES.append((OLD_GEN_CARD_BLOCK, NEW_GEN_CARD_BLOCK, "fbGenerateReel card mode → batch loop"))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 5 — drawInstantCard: use _fbCurrentBatchFile when available for
#           background image compositing (if the card uses the upload image)
#           We patch where it reads the first file from window._fbFiles
# ─────────────────────────────────────────────────────────────────────────────

# Find the place in drawInstantCard that reads imgFile
OLD_DRAWCARD_IMGFILE = '''    window._fbImgBase64 = '';
    if (imgFile) {
      window._fbImgBase64 = await new Promise(function(res) {
        const rd = new FileReader();
        rd.onload = e => res(e.target.result.split(',')[1]);
        rd.onerror = () => res('');
        rd.readAsDataURL(imgFile);
      });
    }'''

NEW_DRAWCARD_IMGFILE = '''    window._fbImgBase64 = '';
    // In batch mode, _fbCurrentBatchFile overrides the first file
    const _batchOverride = window._fbCurrentBatchFile || null;
    const imgFileForCard = _batchOverride || imgFile;
    if (imgFileForCard) {
      window._fbImgBase64 = await new Promise(function(res) {
        const rd = new FileReader();
        rd.onload = e => res(e.target.result.split(',')[1]);
        rd.onerror = () => res('');
        rd.readAsDataURL(imgFileForCard);
      });
    }'''

PATCHES.append((OLD_DRAWCARD_IMGFILE, NEW_DRAWCARD_IMGFILE, "drawInstantCard batch file override"))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH 6 — "Download All" helper function (insert just after fbDownloadCard)
# ─────────────────────────────────────────────────────────────────────────────

OLD_AFTER_DOWNLOADCARD = '''window.fbDownloadCard = function() {
  const canvas = document.getElementById('fb-card-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'joaf-card-' + Date.now() + '.jpg';
  a.href = canvas.toDataURL('image/jpeg', 0.95);
  a.click();
};'''

NEW_AFTER_DOWNLOADCARD = '''window.fbDownloadCard = function() {
  const canvas = document.getElementById('fb-card-canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'joaf-card-' + Date.now() + '.jpg';
  a.href = canvas.toDataURL('image/jpeg', 0.95);
  a.click();
};

window.fbDownloadAllCards = function() {
  const blobs = window._fbBatchBlobs || [];
  if (!blobs.length) { fbDownloadCard(); return; }
  blobs.forEach(function(entry, i) {
    setTimeout(function() {
      const a = document.createElement('a');
      a.download = entry.name;
      a.href = URL.createObjectURL(entry.blob);
      a.click();
    }, i * 400);  // stagger downloads
  });
};'''

PATCHES.append((OLD_AFTER_DOWNLOADCARD, NEW_AFTER_DOWNLOADCARD, "fbDownloadAllCards helper added"))

# ─────────────────────────────────────────────────────────────────────────────
# Apply all patches
# ─────────────────────────────────────────────────────────────────────────────

applied = 0
skipped = 0
for old, new, label in PATCHES:
    if old in html:
        if not DRY:
            html = html.replace(old, new, 1)
        print(f"  ✅  [{label}]" + (" (DRY)" if DRY else ""))
        applied += 1
    else:
        print(f"  ⚠️   [{label}] — snippet not found, skipped")
        skipped += 1

print(f"\n{'DRY RUN — ' if DRY else ''}Applied {applied}/{applied+skipped} patches.")

if not DRY and applied:
    SRC.write_text(html, encoding="utf-8")
    print(f"✅  Saved → {SRC}")
elif skipped == len(PATCHES):
    print("❌  No patches applied — check if the file is already patched or has changed.")
