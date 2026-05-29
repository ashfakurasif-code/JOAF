/**
 * fbpublisher.js — Facebook Graph API client
 * Routes all calls through Appwrite Function: fb-autopost
 * Token never touches the browser.
 */

// Appwrite configuration (mirrors window.AW_EXEC_BASE / window.AW_PROJECT in admin-init)
const AW_EXEC_BASE = 'https://fra.cloud.appwrite.io/v1/functions';
const AW_PROJECT   = '6a11b6cd000b59f318eb';
const FB_FUNCTION  = 'fb-autopost';

/**
 * Internal helper: execute an Appwrite Function and return a Response-like object.
 */
async function callAwFunction(payload) {
  const res = await fetch(`${AW_EXEC_BASE}/${FB_FUNCTION}/executions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': AW_PROJECT
    },
    body: JSON.stringify({
      async: false,
      path: '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Appwrite execution error ${res.status}: ${err}`);
  }

  const exec = await res.json();
  const bodyStr    = exec.responseBody     != null ? exec.responseBody     : '{}';
  const statusCode = exec.responseStatusCode != null ? exec.responseStatusCode : 200;

  return new Response(bodyStr, {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Post to all managed FB pages
 * @param {{ caption, imageUrl, videoUrl, carouselUrls, excludeIds, scheduledAt }} opts
 * @returns {Promise<{ total, ok, fail, results }>}
 */
export async function publishToFacebook({ caption, imageUrl, videoUrl, carouselUrls, excludeIds, scheduledAt } = {}) {
  if (!caption) throw new Error('caption required');

  let action = 'post';
  if (carouselUrls?.length >= 2) action = 'carousel';

  const body = { action, caption, excludeIds: excludeIds || [] };
  if (imageUrl)     body.imageUrl  = imageUrl;
  if (videoUrl)     body.videoUrl  = videoUrl;
  if (carouselUrls) body.imageUrls = carouselUrls;
  if (scheduledAt)  body.scheduled_at = scheduledAt;

  const res = await callAwFunction(body);
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`FB Proxy ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * Fetch all managed pages
 */
export async function getFacebookPages() {
  const res = await callAwFunction({ action: 'get-pages' });
  if (!res.ok) throw new Error('Could not fetch pages');
  const data = await res.json();
  return data.pages || [];
}

/**
 * Check token validity
 */
export async function checkFBToken() {
  const res = await callAwFunction({ action: 'check-token' });
  if (!res.ok) return { is_valid: false };
  return res.json();
}
