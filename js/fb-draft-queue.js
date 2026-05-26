// fb-draft-queue.js — JOAF FB Post Draft + Queue system
// Uses Appwrite SDK (same client as aw-firestore.js)
// Collections needed in Appwrite console:
//   fb_drafts  — attributes: caption(string), tags(string), tone(string), hook(string), updated_at(string)
//   fb_queue   — attributes: caption(string), tags(string), image_url(string), video_url(string),
//                            carousel_urls(string[]), status(string), scheduled_at(string),
//                            posted_at(string), page_ids(string[]), results(string)

const FB_DRAFT_KEY = 'joaf_fb_draft_id';
const AW_ENDPOINT  = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT   = '6a11b6cd000b59f318eb';
const AW_DB        = 'joaf';
const COL_DRAFTS   = 'fb_drafts';
const COL_QUEUE    = 'fb_queue';

let _awClient = null, _awDb = null, _awID = null, _awQuery = null;

async function _getAW() {
  if (_awDb) return { db: _awDb, ID: _awID, Query: _awQuery };
  const { Client, Databases, ID, Query } = await import('https://cdn.jsdelivr.net/npm/appwrite@13.0.1/+esm');
  _awClient = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT);
  _awDb  = new Databases(_awClient);
  _awID  = ID;
  _awQuery = Query;
  return { db: _awDb, ID: _awID, Query: _awQuery };
}

// ── Draft auto-save (called every 30s) ────────────────────────
window.fbDraftSave = async function() {
  try {
    const caption = document.getElementById('fb-caption')?.value || '';
    const tags    = document.getElementById('fb-tags-display')?.value || '';
    const hook    = document.getElementById('fb-hook-line')?.textContent || '';
    const tone    = window._fbCurrentTone || 'urgent';
    if (!caption.trim()) return; // nothing to save

    const { db, ID } = await _getAW();
    const payload = { caption, tags, hook, tone, updated_at: new Date().toISOString() };
    const existingId = localStorage.getItem(FB_DRAFT_KEY);

    if (existingId) {
      try {
        await db.updateDocument(AW_DB, COL_DRAFTS, existingId, payload);
      } catch {
        // doc deleted externally — create fresh
        const doc = await db.createDocument(AW_DB, COL_DRAFTS, ID.unique(), payload);
        localStorage.setItem(FB_DRAFT_KEY, doc.$id);
      }
    } else {
      const doc = await db.createDocument(AW_DB, COL_DRAFTS, ID.unique(), payload);
      localStorage.setItem(FB_DRAFT_KEY, doc.$id);
    }
    // subtle indicator
    const ind = document.getElementById('fb-draft-indicator');
    if (ind) { ind.textContent = 'Draft saved ✓'; ind.style.opacity = '1'; setTimeout(() => ind.style.opacity = '0', 2000); }
  } catch (e) {
    console.warn('[FB Draft] save failed:', e.message);
  }
};

// ── Restore draft on page load ─────────────────────────────────
window.fbDraftRestore = async function() {
  const id = localStorage.getItem(FB_DRAFT_KEY);
  if (!id) return;
  try {
    const { db } = await _getAW();
    const doc = await db.getDocument(AW_DB, COL_DRAFTS, id);
    const capEl  = document.getElementById('fb-caption');
    const tagsEl = document.getElementById('fb-tags-display');
    const hookEl = document.getElementById('fb-hook-line');
    if (capEl  && doc.caption) { capEl.value = doc.caption; }
    if (tagsEl && doc.tags)    { tagsEl.value = doc.tags;   }
    if (hookEl && doc.hook)    { hookEl.textContent = doc.hook; }
    if (doc.tone && typeof _fbSetTone === 'function') _fbSetTone(doc.tone);
    const capCard = document.getElementById('fb-caption-card');
    if (capCard && doc.caption) capCard.style.display = 'block';
    console.log('[FB Draft] restored from Appwrite');
  } catch (e) {
    console.warn('[FB Draft] restore failed (may not exist yet):', e.message);
  }
};

// ── Add post to queue (scheduled) ─────────────────────────────
window.fbQueueAdd = async function({ caption, tags, imageUrl, videoUrl, carouselUrls, scheduledAt }) {
  try {
    const { db, ID } = await _getAW();
    const doc = await db.createDocument(AW_DB, COL_QUEUE, ID.unique(), {
      caption:       caption || '',
      tags:          tags    || '',
      image_url:     imageUrl     || '',
      video_url:     videoUrl     || '',
      carousel_urls: carouselUrls || [],
      status:        'pending',
      scheduled_at:  scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      posted_at:     '',
      results:       '',
    });
    console.log('[FB Queue] added:', doc.$id);
    return doc.$id;
  } catch (e) {
    console.error('[FB Queue] add failed:', e.message);
    throw e;
  }
};

// ── Load queue list for display ────────────────────────────────
window.fbQueueList = async function(status = 'pending') {
  try {
    const { db, Query } = await _getAW();
    const res = await db.listDocuments(AW_DB, COL_QUEUE, [
      Query.equal('status', status),
      Query.orderAsc('scheduled_at'),
      Query.limit(50),
    ]);
    return res.documents;
  } catch (e) {
    console.error('[FB Queue] list failed:', e.message);
    return [];
  }
};

// ── Start 30s auto-save loop ───────────────────────────────────
window.fbDraftStartAutoSave = function() {
  fbDraftRestore(); // restore on init
  setInterval(fbDraftSave, 30000);
  console.log('[FB Draft] auto-save started (30s interval)');
};
