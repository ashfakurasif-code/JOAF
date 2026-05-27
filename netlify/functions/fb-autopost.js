const API_VER = process.env.FB_API_VER || 'v22.0';
const BASE = `https://graph.facebook.com/${API_VER}`;

function json(statusCode, body = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const TOKEN = process.env.FB_USER_TOKEN;
  if (!TOKEN) return json(500, { error: 'FB_USER_TOKEN missing' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const action = body.action || 'post';

  try {
    if (action === 'get-pages') {
      return json(200, { pages: await fetchAllPages(TOKEN) });
    }

    if (action === 'check-token') {
      const res = await fetch(`${BASE}/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`);
      const data = await res.json();
      return json(200, data);
    }

    const caption = (body.caption || '').trim();
    if (!caption) {
      return json(400, { error: 'caption required' });
    }

    let pages = await fetchAllPages(TOKEN);
    const excluded = Array.isArray(body.excludeIds)
      ? body.excludeIds.map(v => String(v).trim())
      : [];

    pages = pages.filter(page => !excluded.includes(page.id) && !excluded.includes(page.name));

    if (!pages.length) {
      return json(400, { error: 'No eligible Facebook pages found' });
    }

    let publishTime = null;

    if (body.scheduled_at) {
      const scheduledDate = new Date(body.scheduled_at);

      if (Number.isNaN(scheduledDate.getTime())) {
        return json(400, { error: 'Invalid scheduled_at datetime' });
      }

      publishTime = Math.floor(scheduledDate.getTime() / 1000);
    }

    const results = await Promise.allSettled(
      pages.map(page => postToPage({
        page,
        caption,
        imageUrl: body.imageUrl,
        videoUrl: body.videoUrl,
        publishTime,
      }))
    );

    const normalized = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          pageId: pages[index].id,
          pageName: pages[index].name,
          ok: true,
          result: result.value,
        };
      }

      return {
        pageId: pages[index].id,
        pageName: pages[index].name,
        ok: false,
        error: result.reason?.message || 'Unknown Facebook publish failure',
      };
    });

    return json(200, {
      success: true,
      total: normalized.length,
      ok: normalized.filter(r => r.ok).length,
      failed: normalized.filter(r => !r.ok).length,
      results: normalized,
    });
  } catch (err) {
    console.error('fb-autopost fatal:', err);
    return json(500, { error: err.message });
  }
};

async function fetchAllPages(token) {
  const pages = [];
  let next = `${BASE}/me/accounts?limit=100&access_token=${token}`;

  while (next) {
    const response = await fetch(next);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to fetch Facebook pages');
    }

    pages.push(...(data.data || []));
    next = data.paging?.next || null;
  }

  return pages;
}

async function postToPage({ page, caption, imageUrl, videoUrl, publishTime }) {
  let endpoint = 'feed';
  const payload = { access_token: page.access_token };

  if (videoUrl) {
    endpoint = 'videos';
    payload.file_url = videoUrl;
    payload.description = caption;
  } else if (imageUrl) {
    endpoint = 'photos';
    payload.url = imageUrl;
    payload.message = caption;
  } else {
    payload.message = caption;
  }

  if (publishTime) {
    payload.published = false;
    payload.scheduled_publish_time = publishTime;
  }

  const response = await fetch(`${BASE}/${page.id}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Facebook publish failed');
  }

  return data;
}
