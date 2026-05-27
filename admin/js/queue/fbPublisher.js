/**
 * fbPublisher.js — Facebook Graph API client
 * Wraps the existing netlify/functions/fb-autopost.js proxy
 * Token never touches the browser.
 */

const FB_PROXY = '/.netlify/functions/fb-autopost';

/**
 * Post to all managed FB pages
 * @param {{ caption, imageUrl, videoUrl, carouselUrls, excludeIds, scheduledAt }} opts
 * @returns {Promise<{ total, ok, fail, results }>}
 */
export async function publishToFacebook({ caption, imageUrl, videoUrl, carouselUrls, excludeIds, scheduledAt } = {}) {
  if (!caption) throw new Error('caption required');

  // Determine action
  let action = 'post';
  if (carouselUrls?.length >= 2) action = 'carousel';

  const body = { action, caption, excludeIds: excludeIds || [] };
  if (imageUrl)      body.imageUrl = imageUrl;
  if (videoUrl)      body.videoUrl = videoUrl;
  if (carouselUrls)  body.imageUrls = carouselUrls;
  if (scheduledAt)   body.scheduled_at = scheduledAt;

  const res = await fetch(FB_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

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
  const res = await fetch(FB_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-pages' })
  });
  if (!res.ok) throw new Error('Could not fetch pages');
  const data = await res.json();
  return data.pages || [];
}

/**
 * Check token validity
 */
export async function checkFBToken() {
  const res = await fetch(FB_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-token' })
  });
  if (!res.ok) return { is_valid: false };
  return res.json();
}
