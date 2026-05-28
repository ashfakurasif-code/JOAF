// Appwrite Function: fb-autopost
// HTTP trigger — POST only
// Facebook Graph API proxy — token never exposed to browser

const API_VER = process.env.FB_API_VER || 'v22.0';
const BASE    = `https://graph.facebook.com/${API_VER}`;

function isValidUrl(str) {
  try { const u = new URL(str); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

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
    if (publishTime) { body.scheduled_publish_time = publishTime; body.published = false; }
    res = await fetch(`${BASE}/${page.id}/videos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else if (imageUrl && publishTime) {
    const photoRes = await fetch(`${BASE}/${page.id}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl, published: false, access_token: page.access_token }) });
    const photoData = await photoRes.json();
    if (photoData.error) throw new Error(`Photo upload: ${photoData.error.message}`);
    body = { message: caption, attached_media: [{ media_fbid: photoData.id }], scheduled_publish_time: publishTime, published: false, access_token: page.access_token };
    res = await fetch(`${BASE}/${page.id}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else if (imageUrl) {
    body = { url: imageUrl, message: caption, access_token: page.access_token };
    res = await fetch(`${BASE}/${page.id}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } else {
    body = { message: caption, access_token: page.access_token };
    if (publishTime) { body.scheduled_publish_time = publishTime; body.published = false; }
    res = await fetch(`${BASE}/${page.id}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  const d = await res.json();
  if (d.error) throw new Error(`${d.error.message} (type: ${d.error.type}, code: ${d.error.code})`);
  return d;
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method Not Allowed' }, 405);

  const TOKEN = process.env.FB_USER_TOKEN;
  if (!TOKEN) return res.json({ error: 'FB_USER_TOKEN not set' }, 500);

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.json({ error: 'Invalid JSON body' }, 400); }

  const { action } = body;

  if (action === 'get-pages') {
    try { return res.json({ pages: await fetchAllPages(TOKEN) }); }
    catch (e) { return res.json({ error: e.message }, 400); }
  }

  if (action === 'post') {
    const { caption, imageUrl, videoUrl, excludeIds, scheduled_at } = body;
    if (!caption) return res.json({ error: 'caption required' }, 400);
    if (imageUrl && !isValidUrl(imageUrl)) return res.json({ error: 'imageUrl must be valid http/https URL' }, 400);
    if (videoUrl && !isValidUrl(videoUrl)) return res.json({ error: 'videoUrl must be valid http/https URL' }, 400);
    try {
      let pages = await fetchAllPages(TOKEN);
      const excluded = Array.isArray(excludeIds) ? excludeIds.map(x => String(x).trim()) : [];
      pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name.trim()));
      if (!pages.length) return res.json({ error: 'No pages to post to' }, 400);
      const publishTime = scheduled_at ? Math.floor(new Date(scheduled_at).getTime() / 1000) : null;
      const results = await Promise.all(pages.map(async (page) => {
        try { const r = await postToPage({ page, caption, imageUrl, videoUrl, publishTime }); return { id: page.id, name: page.name, ok: true, postId: r.id || r.post_id }; }
        catch (e) { return { id: page.id, name: page.name, ok: false, error: e.message }; }
      }));
      return res.json({ total: pages.length, ok: results.filter(r => r.ok).length, fail: results.filter(r => !r.ok).length, results });
    } catch (e) { return res.json({ error: e.message }, 400); }
  }

  if (action === 'carousel') {
    const { caption, imageUrls, excludeIds } = body;
    if (!caption || !Array.isArray(imageUrls) || imageUrls.length < 2) return res.json({ error: 'caption + imageUrls[] (min 2) required' }, 400);
    try {
      let pages = await fetchAllPages(TOKEN);
      const excluded = Array.isArray(excludeIds) ? excludeIds.map(x => String(x).trim()) : [];
      pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name.trim()));
      if (!pages.length) return res.json({ error: 'No pages to post to' }, 400);
      const results = await Promise.all(pages.map(async (page) => {
        try {
          const mediaIds = await Promise.all(imageUrls.map(async (url) => {
            const r = await fetch(`${BASE}/${page.id}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, published: false, access_token: page.access_token }) });
            const d = await r.json();
            if (d.error) throw new Error(d.error.message);
            return { media_fbid: d.id };
          }));
          const feedRes = await fetch(`${BASE}/${page.id}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: caption, attached_media: mediaIds, access_token: page.access_token }) });
          const feedData = await feedRes.json();
          if (feedData.error) throw new Error(feedData.error.message);
          return { id: page.id, name: page.name, ok: true, postId: feedData.id };
        } catch (e) { return { id: page.id, name: page.name, ok: false, error: e.message }; }
      }));
      return res.json({ total: pages.length, ok: results.filter(r => r.ok).length, fail: results.filter(r => !r.ok).length, results });
    } catch (e) { return res.json({ error: e.message }, 400); }
  }

  if (action === 'check-token') {
    try {
      const tokenRes = await fetch(`${BASE}/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`);
      const data = await tokenRes.json();
      if (data.error) return res.json({ error: data.error.message });
      return res.json({ expires_at: data.data?.expires_at || null, is_valid: data.data?.is_valid || false, scopes: data.data?.scopes || [] });
    } catch (e) { return res.json({ error: e.message }); }
  }

  if (action === 'post-log') return res.json({ ok: true });

  return res.json({ error: 'Unknown action. Use: post | carousel | get-pages | check-token' }, 400);
};
