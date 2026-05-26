// fb-autopost.js — JOAF Facebook posting proxy
// All Graph API calls live here. Token never touches the browser.
// FB_API_VER pulled from env or default v22.0

const API_VER = process.env.FB_API_VER || 'v22.0';
const BASE    = `https://graph.facebook.com/${API_VER}`;

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const TOKEN = process.env.FB_USER_TOKEN;
  if (!TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ error: 'FB_USER_TOKEN not set in environment' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { action } = body;

  // ── Action: get-pages ──────────────────────────────────────
  if (action === 'get-pages') {
    try {
      const pages = await fetchAllPages(TOKEN);
      return { statusCode: 200, headers, body: JSON.stringify({ pages }) };
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── Action: post ───────────────────────────────────────────
  if (action === 'post') {
    const { caption, imageUrl, videoUrl, excludeIds, scheduled_at } = body;
    if (!caption) return { statusCode: 400, headers, body: JSON.stringify({ error: 'caption required' }) };

    try {
      let pages = await fetchAllPages(TOKEN);
      const excluded = Array.isArray(excludeIds) ? excludeIds.map(x => String(x).trim()) : [];
      pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name.trim()));
      if (!pages.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No pages to post to' }) };

      const publishTime = scheduled_at ? Math.floor(new Date(scheduled_at).getTime() / 1000) : null;

      const results = await Promise.all(pages.map(async (page) => {
        try {
          const result = await postToPage({ page, caption, imageUrl, videoUrl, publishTime });
          return { id: page.id, name: page.name, ok: true, postId: result.id || result.post_id };
        } catch (e) {
          return { id: page.id, name: page.name, ok: false, error: e.message };
        }
      }));

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          total: pages.length,
          ok:    results.filter(r => r.ok).length,
          fail:  results.filter(r => !r.ok).length,
          results,
        }),
      };
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── Action: carousel ──────────────────────────────────────
  // FB Carousel: upload each image as unpublished photo, then post feed with attached_media
  if (action === 'carousel') {
    const { caption, imageUrls, excludeIds } = body;
    if (!caption || !Array.isArray(imageUrls) || imageUrls.length < 2) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'caption + imageUrls[] (min 2) required' }) };
    }

    try {
      let pages = await fetchAllPages(TOKEN);
      const excluded = Array.isArray(excludeIds) ? excludeIds.map(x => String(x).trim()) : [];
      pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name.trim()));
      if (!pages.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No pages to post to' }) };

      const results = await Promise.all(pages.map(async (page) => {
        try {
          // 1. Upload each image as unpublished
          const mediaIds = await Promise.all(imageUrls.map(async (url) => {
            const res = await fetch(`${BASE}/${page.id}/photos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, published: false, access_token: page.access_token }),
            });
            const d = await res.json();
            if (d.error) throw new Error(d.error.message);
            return { media_fbid: d.id };
          }));

          // 2. Post feed with attached_media array
          const feedRes = await fetch(`${BASE}/${page.id}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: caption,
              attached_media: mediaIds,
              access_token: page.access_token,
            }),
          });
          const feedData = await feedRes.json();
          if (feedData.error) throw new Error(feedData.error.message);
          return { id: page.id, name: page.name, ok: true, postId: feedData.id };
        } catch (e) {
          return { id: page.id, name: page.name, ok: false, error: e.message };
        }
      }));

      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          total: pages.length,
          ok:    results.filter(r => r.ok).length,
          fail:  results.filter(r => !r.ok).length,
          results,
        }),
      };
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action. Use: post | carousel | get-pages' }) };
};

// ── Helpers ────────────────────────────────────────────────

async function fetchAllPages(token) {
  let pages = [];
  let url = `${BASE}/me/accounts?limit=50&access_token=${token}`;
  while (url) {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    pages = pages.concat(data.data || []);
    url   = data.paging?.next || null;
  }
  return pages;
}

async function postToPage({ page, caption, imageUrl, videoUrl, publishTime }) {
  let res, body;

  if (videoUrl) {
    body = { file_url: videoUrl, description: caption, access_token: page.access_token };
    if (publishTime) body.scheduled_publish_time = publishTime;
    res = await fetch(`${BASE}/${page.id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } else if (imageUrl) {
    body = { url: imageUrl, message: caption, access_token: page.access_token };
    res = await fetch(`${BASE}/${page.id}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } else {
    body = { message: caption, access_token: page.access_token };
    if (publishTime) body.scheduled_publish_time = publishTime;
    res = await fetch(`${BASE}/${page.id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}
