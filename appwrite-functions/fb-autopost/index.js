// Appwrite Function: fb-autopost
// HTTP trigger — POST only
// Posts to Facebook Pages via Graph API (token stored server-side as env var)
//
// Required env vars:
//   FB_PAGE_ACCESS_TOKENS  — JSON array: [{"id":"PAGE_ID","name":"Page Name","token":"EAAj..."},...]
//   FB_API_VERSION         — e.g. "v22.0" (default if omitted)
//
// Accepted actions (req.body.action):
//   "post"        — single image/video/text post to all pages
//   "carousel"    — multi-image carousel post
//   "check-token" — verify token validity, return expiry
//   "get-pages"   — return list of configured pages (no tokens exposed)

import { Client, Databases, Query } from 'node-appwrite';

const FB_BASE = 'https://graph.facebook.com';
const AW_DB = process.env.APPWRITE_DATABASE_ID || process.env.APPWRITE_FUNCTION_DATABASE_ID || 'joaf';
const COL_CFG = 'admin_config';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

function getApiVersion() {
  return (process.env.FB_API_VERSION || 'v22.0').trim();
}

function getPages() {
  const raw = (process.env.FB_PAGE_ACCESS_TOKENS || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Fetch a key from admin_config; returns null on failure */
async function getSysConfig(key, apiKey = '') {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) return null;
  try {
    const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);
    const db = new Databases(client);
    const res = await db.listDocuments(AW_DB, COL_CFG, [Query.equal('key', key), Query.limit(1)]);
    return res.documents[0]?.value ?? null;
  } catch { return null; }
}

async function fbPost(pageId, token, endpoint, body) {
  const ver = getApiVersion();
  const url = `${FB_BASE}/${ver}/${pageId}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

async function checkToken(token) {
  const ver = getApiVersion();
  const res = await fetch(`${FB_BASE}/${ver}/me?fields=id,name&access_token=${token}`);
  return res.json();
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {}

  const { action = 'post', caption = '', imageUrl, videoUrl, imageUrls = [], excludeIds = [], scheduledAt } = body;

  const pages = getPages();

  // ── action: get-pages ──────────────────────────────────────
  if (action === 'get-pages') {
    if (!pages.length) return res.json({ error: 'No pages configured (FB_PAGE_ACCESS_TOKENS not set)' }, 500);
    return res.json({ pages: pages.map(p => ({ id: p.id, name: p.name })) });
  }

  // ── action: check-token ────────────────────────────────────
  if (action === 'check-token') {
    if (!pages.length) return res.json({ error: 'No token configured', expires_at: null }, 401);
    // Check first page token via debug_token
    const firstPage = pages[0];
    try {
      const ver = getApiVersion();
      const debugUrl = `${FB_BASE}/${ver}/debug_token?input_token=${firstPage.token}&access_token=${firstPage.token}`;
      const debugRes = await fetch(debugUrl);
      const debug = await debugRes.json();
      const exp = debug?.data?.expires_at ?? null;
      const isValid = debug?.data?.is_valid ?? false;
      log(`check-token: valid=${isValid} expires=${exp}`);
      return res.json({ ok: isValid, expires_at: exp, pages: pages.length });
    } catch (e) {
      error('check-token error: ' + e.message);
      return res.json({ error: e.message }, 500);
    }
  }

  // ── Require pages for post/carousel ───────────────────────
  if (!pages.length) {
    return res.json({ error: 'No pages configured — set FB_PAGE_ACCESS_TOKENS env var' }, 500);
  }

  const activePages = pages.filter(p => !excludeIds.includes(p.id) && !excludeIds.includes(p.name));
  if (!activePages.length) return res.json({ error: 'All pages excluded' }, 400);

  const results = [];

  // ── action: carousel ──────────────────────────────────────
  if (action === 'carousel') {
    if (!imageUrls || imageUrls.length < 2) {
      return res.json({ error: 'carousel requires at least 2 imageUrls' }, 400);
    }
    for (const page of activePages) {
      try {
        // Upload each photo as unpublished
        const mediaIds = [];
        for (const url of imageUrls) {
          const r = await fbPost(page.id, page.token, 'photos', { url, published: false });
          mediaIds.push({ media_fbid: r.id });
        }
        // Publish carousel
        const post = await fbPost(page.id, page.token, 'feed', {
          message: caption,
          attached_media: mediaIds,
        });
        results.push({ id: page.id, name: page.name, ok: true, postId: post.id });
        log(`carousel posted to ${page.name}: ${post.id}`);
      } catch (e) {
        results.push({ id: page.id, name: page.name, ok: false, error: e.message });
        error(`carousel failed for ${page.name}: ${e.message}`);
      }
    }
    const ok   = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    return res.json({ ok, fail, total: results.length, results });
  }

  // ── action: post (text / image / video) ───────────────────
  for (const page of activePages) {
    try {
      let post;
      const unixScheduledAt = scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : null;

      if (videoUrl) {
        // Video: supports scheduling natively via /videos
        const payload = { description: caption, file_url: videoUrl };
        if (unixScheduledAt) {
          payload.published = false;
          payload.scheduled_publish_time = unixScheduledAt;
        }
        post = await fbPost(page.id, page.token, 'videos', payload);

      } else if (imageUrl) {
        if (unixScheduledAt) {
          // Scheduled image: must upload as unpublished photo first, then post to /feed
          const uploaded = await fbPost(page.id, page.token, 'photos', {
            url: imageUrl,
            published: false,
          });
          post = await fbPost(page.id, page.token, 'feed', {
            message: caption,
            attached_media: [{ media_fbid: uploaded.id }],
            published: false,
            scheduled_publish_time: unixScheduledAt,
          });
        } else {
          // Immediate image post
          post = await fbPost(page.id, page.token, 'photos', { caption, url: imageUrl });
        }

      } else {
        // Text-only post
        const payload = { message: caption };
        if (unixScheduledAt) {
          payload.published = false;
          payload.scheduled_publish_time = unixScheduledAt;
        }
        post = await fbPost(page.id, page.token, 'feed', payload);
      }
      results.push({ id: page.id, name: page.name, ok: true, postId: post.id || post.post_id });
      log(`posted to ${page.name}: ${post.id || post.post_id}`);
    } catch (e) {
      results.push({ id: page.id, name: page.name, ok: false, error: e.message });
      error(`post failed for ${page.name}: ${e.message}`);
    }
  }

  const ok   = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  return res.json({ ok, fail, total: results.length, results });
};
