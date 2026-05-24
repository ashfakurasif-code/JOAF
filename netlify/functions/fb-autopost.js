exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const TOKEN = process.env.FB_USER_TOKEN;
  if (!TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'FB_USER_TOKEN not set' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { imageUrl, videoUrl, caption, excludeIds } = body;
  if (!caption) return { statusCode: 400, body: JSON.stringify({ error: 'caption required' }) };

  const excluded = Array.isArray(excludeIds) ? excludeIds.map(x => String(x).trim()) : [];

  let pages = [];
  let url = `https://graph.facebook.com/v19.0/me/accounts?limit=50&access_token=${TOKEN}`;
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };
    pages = pages.concat(data.data || []);
    url = data.paging?.next || null;
  }

  pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name.trim()));
  if (!pages.length) return { statusCode: 400, body: JSON.stringify({ error: 'No pages to post to' }) };

  const results = await Promise.all(pages.map(async (page) => {
    try {
      let postRes, postData;
      if (videoUrl) {
        postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: videoUrl, description: caption, access_token: page.access_token })
        });
      } else if (imageUrl) {
        postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: imageUrl, message: caption, access_token: page.access_token })
        });
      } else {
        postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: caption, access_token: page.access_token })
        });
      }
      postData = await postRes.json();
      if (postData.error) return { id: page.id, name: page.name, ok: false, error: postData.error.message };
      return { id: page.id, name: page.name, ok: true, postId: postData.id || postData.post_id };
    } catch(e) {
      return { id: page.id, name: page.name, ok: false, error: e.message };
    }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total: pages.length,
      ok: results.filter(r => r.ok).length,
      fail: results.filter(r => !r.ok).length,
      results
    })
  };
};
