exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const TOKEN = process.env.FB_USER_TOKEN;
  if (!TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'FB_USER_TOKEN not set' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { imageBase64, imageType, caption, excludeIds } = body;
  if (!caption) return { statusCode: 400, body: JSON.stringify({ error: 'caption required' }) };

  const excluded = Array.isArray(excludeIds) ? excludeIds : [];

  // 1. Fetch all pages
  let pages = [];
  let url = `https://graph.facebook.com/v19.0/me/accounts?limit=50&access_token=${TOKEN}`;
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };
    pages = pages.concat(data.data || []);
    url = data.paging?.next || null;
  }

  // 2. Filter excluded
  pages = pages.filter(p => !excluded.includes(p.id) && !excluded.includes(p.name));

  if (!pages.length) return { statusCode: 400, body: JSON.stringify({ error: 'No pages to post to' }) };

  // 3. Post to each page
  const results = [];
  for (const page of pages) {
    try {
      let postRes, postData;

      if (imageBase64) {
        // Upload image as buffer
        const imgBuffer = Buffer.from(imageBase64, 'base64');
        const formData = new FormData();
        const blob = new Blob([imgBuffer], { type: imageType || 'image/jpeg' });
        formData.append('source', blob, 'post.jpg');
        formData.append('message', caption);
        formData.append('access_token', page.access_token);

        postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/photos`, {
          method: 'POST',
          body: formData
        });
      } else {
        // Text only post
        postRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: caption, access_token: page.access_token })
        });
      }

      postData = await postRes.json();
      if (postData.error) {
        results.push({ id: page.id, name: page.name, ok: false, error: postData.error.message });
      } else {
        results.push({ id: page.id, name: page.name, ok: true, postId: postData.id });
      }
    } catch(e) {
      results.push({ id: page.id, name: page.name, ok: false, error: e.message });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total: pages.length, ok, fail, results })
  };
};
