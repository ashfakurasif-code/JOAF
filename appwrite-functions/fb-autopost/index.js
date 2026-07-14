// Appwrite Function: fb-autopost
// OPTIMIZED BUILD — Free Tier Safe
// Auth: INTERNAL_API_KEY header (x-joaf-key)
// Actions: post | carousel | check-token | get-pages | setup-token

const FB_BASE = 'https://graph.facebook.com';
const FB_VER  = () => (process.env.FB_API_VERSION || 'v22.0').trim();
const TIMEOUT = 25000;

const AW_EP  = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const AW_PJ  = process.env.APPWRITE_PROJECT  || '6a11b6cd000b59f318eb';
const AW_KEY = process.env.APPWRITE_API_KEY  || '';
const FN_ID  = 'fb-autopost';

function abortSig() { return AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT) : undefined; }

// ── Lazy page list (warm invocation speedup) ─────────────────────────────────
let _pages = null;
function getPages() {
  if (_pages) return _pages;
  const raw = (process.env.FB_PAGE_ACCESS_TOKENS || '').trim();
  if (!raw) return (_pages = []);
  try { _pages = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []; }
  catch { _pages = []; }
  return _pages;
}

async function fbPost(pageId, token, endpoint, body) {
  const url = `${FB_BASE}/${FB_VER()}/${pageId}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
    signal: abortSig(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

// ── Update FB_PAGE_ACCESS_TOKENS variable via Appwrite API ───────────────────
async function updateAppwriteVariable(key, value) {
  // List existing variables to find the variable ID
  const listRes = await fetch(`${AW_EP}/functions/${FN_ID}/variables`, {
    headers: { 'X-Appwrite-Project': AW_PJ, 'X-Appwrite-Key': AW_KEY },
  });
  const listData = await listRes.json();
  const vars = listData.variables || [];
  const existing = vars.find(v => v.key === key);

  if (existing) {
    // Update existing variable
    const r = await fetch(`${AW_EP}/functions/${FN_ID}/variables/${existing.$id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AW_PJ,
        'X-Appwrite-Key': AW_KEY,
      },
      body: JSON.stringify({ key, value }),
    });
    return r.json();
  } else {
    // Create new variable
    const r = await fetch(`${AW_EP}/functions/${FN_ID}/variables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AW_PJ,
        'X-Appwrite-Key': AW_KEY,
      },
      body: JSON.stringify({ key, value }),
    });
    return r.json();
  }
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method === 'GET') return res.json({ ok: true, status: 'fb-autopost running', pages: getPages().length });
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const INT_KEY = process.env.INTERNAL_API_KEY;
  if (INT_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-internal-key'];
    if (!provided || provided !== INT_KEY) {
      error('fb-autopost: unauthorized');
      return res.json({ error: 'Unauthorized' }, 401);
    }
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { /* allow empty body for get-pages */ }

  const {
    action = 'post', caption = '', imageUrl, videoUrl, imageUrls = [],
    excludeIds = [], pageIds = [], scheduledAt,
  } = body;
  const pages = getPages();

  // ── get-pages ────────────────────────────────────────────────────────────
  if (action === 'get-pages') {
    return res.json({ pages: pages.map(p => ({ id: p.id, name: p.name })) });
  }

  // ── setup-token: user token → fetch all pages → save to env var ──────────
  if (action === 'setup-token') {
    const userToken = body.userToken || body.token || '';
    if (!userToken || !userToken.startsWith('EAAj')) {
      return res.json({ error: 'Valid FB user token required (starts with EAAj)' }, 400);
    }
    if (!AW_KEY) {
      return res.json({ error: 'APPWRITE_API_KEY not set in function env' }, 500);
    }
    try {
      // Fetch all pages this user manages
      const r = await fetch(`${FB_BASE}/${FB_VER()}/me/accounts?access_token=${userToken}&limit=100`, {
        signal: abortSig(),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      const fetchedPages = (d.data || []).map(p => ({
        id: p.id,
        name: p.name.trim(),
        token: p.access_token,
      }));
      if (!fetchedPages.length) return res.json({ error: 'No pages found for this token' }, 400);

      // Save to Appwrite function variable
      const tokensJson = JSON.stringify(fetchedPages);
      const updateResult = await updateAppwriteVariable('FB_PAGE_ACCESS_TOKENS', tokensJson);
      if (updateResult.error) throw new Error(updateResult.error.message || JSON.stringify(updateResult.error));

      // Reset cached pages so next invocation picks up new tokens
      _pages = fetchedPages;

      log(`setup-token: saved ${fetchedPages.length} pages`);
      return res.json({
        ok: true,
        pages: fetchedPages.length,
        pageNames: fetchedPages.map(p => p.name),
        note: 'Tokens saved. Redeploy function to apply (or wait for next cold start).',
      });
    } catch (e) {
      error('setup-token error: ' + e.message);
      return res.json({ error: e.message }, 500);
    }
  }

  // ── check-token ──────────────────────────────────────────────────────────
  if (action === 'check-token') {
    if (!pages.length) return res.json({ error: 'No token configured', pages: 0 }, 500);
    try {
      const p   = pages[0];
      const url = `${FB_BASE}/${FB_VER()}/debug_token?input_token=${p.token}&access_token=${p.token}`;
      const r   = await fetch(url, { signal: abortSig() });
      const d   = await r.json();
      return res.json({ ok: d?.data?.is_valid ?? false, expires_at: d?.data?.expires_at ?? null, pages: pages.length });
    } catch (e) { return res.json({ error: e.message }, 500); }
  }

  if (!pages.length) return res.json({ error: 'FB_PAGE_ACCESS_TOKENS not configured' }, 500);

  // pageIds is used by the viral publisher to preserve location priority and
  // also lets a failed Reel be retried on only the failed page(s).
  const requestedPageIds = Array.isArray(pageIds) ? pageIds.map(String) : [];
  const activePages = pages.filter(p =>
    !excludeIds.includes(p.id) &&
    !excludeIds.includes(p.name) &&
    (!requestedPageIds.length || requestedPageIds.includes(String(p.id)))
  );
  if (!activePages.length) return res.json({ error: 'All pages excluded' }, 400);

  const results = [];

  // ── carousel ─────────────────────────────────────────────────────────────
  if (action === 'carousel') {
    if (!imageUrls?.length || imageUrls.length < 2) {
      return res.json({ error: 'carousel requires ≥ 2 imageUrls' }, 400);
    }
    for (const page of activePages) {
      try {
        const mediaIds = await Promise.all(
          imageUrls.map(url => fbPost(page.id, page.token, 'photos', { url, published: false }).then(r => ({ media_fbid: r.id })))
        );
        const post = await fbPost(page.id, page.token, 'feed', { message: caption, attached_media: mediaIds });
        results.push({ id: page.id, name: page.name, ok: true, postId: post.id });
        log(`carousel → ${page.name}: ${post.id}`);
      } catch (e) {
        results.push({ id: page.id, name: page.name, ok: false, error: e.message });
        error(`carousel ✗ ${page.name}: ${e.message}`);
      }
    }
    const ok = results.filter(r => r.ok).length;
    return res.json({ ok, fail: results.length - ok, total: results.length, results });
  }

  // ── video (Appwrite Storage file → FB Reels) ────────────────────────────
  if (action === 'video') {
    const { videoStorageFileId, caption: vidCaption = '' } = body;
    if (!videoStorageFileId) return res.json({ error: 'videoStorageFileId required' }, 400);
    if (!AW_KEY) return res.json({ error: 'APPWRITE_API_KEY not set' }, 500);

    // Download video buffer from Appwrite Storage
    let videoBuffer;
    try {
      const dlRes = await fetch(
        `${AW_EP}/storage/buckets/fb_media/files/${videoStorageFileId}/download?project=${AW_PJ}`,
        { headers: { 'X-Appwrite-Project': AW_PJ, 'X-Appwrite-Key': AW_KEY }, signal: AbortSignal.timeout(60000) }
      );
      if (!dlRes.ok) throw new Error(`Storage download failed: ${dlRes.status}`);
      videoBuffer = Buffer.from(await dlRes.arrayBuffer());
      log(`video: downloaded ${videoBuffer.length} bytes from Storage`);
    } catch (e) {
      return res.json({ error: `Video download failed: ${e.message}` }, 500);
    }

    const vidResults = [];
    for (const page of activePages) {
      try {
        // FB resumable video upload
        // Step 1: Initialize upload session
        const initRes = await fetch(`https://graph.facebook.com/${page.id}/video_reels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_phase: 'start',
            access_token: page.token,
          }),
          signal: AbortSignal.timeout(15000),
        });
        const initData = await initRes.json();
        if (initData.error) throw new Error(initData.error.message);
        const uploadSessionId = initData.upload_session_id;
        const videoId = initData.video_id;

        // Step 2: Upload video binary
        const uploadRes = await fetch(
          // The upload endpoint must use the same Graph API version that
          // created the Reel session. A hard-coded v21 URL with a v22 session
          // yields Meta's misleading "invalid video id" error.
          `https://rupload.facebook.com/video-upload/${FB_VER()}/${uploadSessionId}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `OAuth ${page.token}`,
              'offset': '0',
              'file_size': String(videoBuffer.length),
              'Content-Type': 'video/mp4',
            },
            body: videoBuffer,
            signal: AbortSignal.timeout(120000),
          }
        );
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error('Upload failed: ' + JSON.stringify(uploadData));

        // Step 3: Publish reel
        const pubRes = await fetch(`https://graph.facebook.com/${page.id}/video_reels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upload_phase: 'finish',
            video_id: videoId,
            access_token: page.token,
            description: vidCaption,
            video_state: 'PUBLISHED',
          }),
          signal: AbortSignal.timeout(30000),
        });
        const pubData = await pubRes.json();
        if (pubData.error) throw new Error(pubData.error.message);

        vidResults.push({ id: page.id, name: page.name, ok: true, videoId });
        log(`video reel → ${page.name}: ${videoId}`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        vidResults.push({ id: page.id, name: page.name, ok: false, error: e.message });
        error(`video ✗ ${page.name}: ${e.message}`);
      }
    }

    const okCount = vidResults.filter(r => r.ok).length;
    return res.json({ ok: okCount, fail: vidResults.length - okCount, total: vidResults.length, results: vidResults });
  }

  // ── post (text | image) ──────────────────────────────────────────────────
  const unixTs = scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : null;

  for (const page of activePages) {
    try {
      let post;
      if (videoUrl) {
        const pl = { description: caption, file_url: videoUrl };
        if (unixTs) { pl.published = false; pl.scheduled_publish_time = unixTs; }
        post = await fbPost(page.id, page.token, 'videos', pl);
      } else if (imageUrl) {
        if (unixTs) {
          const up = await fbPost(page.id, page.token, 'photos', { url: imageUrl, published: false });
          post = await fbPost(page.id, page.token, 'feed', {
            message: caption, attached_media: [{ media_fbid: up.id }],
            published: false, scheduled_publish_time: unixTs,
          });
        } else {
          post = await fbPost(page.id, page.token, 'photos', { caption, url: imageUrl });
        }
      } else {
        const pl = { message: caption };
        if (unixTs) { pl.published = false; pl.scheduled_publish_time = unixTs; }
        post = await fbPost(page.id, page.token, 'feed', pl);
      }
      results.push({ id: page.id, name: page.name, ok: true, postId: post.id || post.post_id });
      log(`post → ${page.name}: ${post.id || post.post_id}`);
      await new Promise(r => setTimeout(r, 1500)); // 1.5s gap — avoid FB rate limit
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'timeout after 15s' : e.message;
      results.push({ id: page.id, name: page.name, ok: false, error: msg });
      error(`post ✗ ${page.name}: ${msg}`);
    }
  }

  const ok = results.filter(r => r.ok).length;
  return res.json({ ok, fail: results.length - ok, total: results.length, results });
};
