// Appwrite Function: fb-scheduler
// Trigger: CRON — "0 * * * *" (every hour)
// Purpose: fetch pending fb_queue posts where scheduled_at <= now, then publish via Netlify proxy
//
// Appwrite Function Environment Variables needed:
//   NETLIFY_BASE_URL   — e.g. https://your-site.netlify.app
//   APPWRITE_ENDPOINT  — e.g. https://fra.cloud.appwrite.io/v1
//   APPWRITE_PROJECT   — your project ID
//   APPWRITE_API_KEY   — server API key (has db read/write permission)

import { Client, Databases, Query } from 'node-appwrite';

const AW_DB      = 'joaf';
const COL_QUEUE  = 'fb_queue';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_API_KEY);

  const db   = new Databases(client);
  const now  = new Date().toISOString();
  const base = process.env.NETLIFY_BASE_URL;

  log(`[fb-scheduler] running at ${now}`);

  // 1. Fetch all pending posts due now or earlier
  let docs;
  try {
    const result = await db.listDocuments(AW_DB, COL_QUEUE, [
      Query.equal('status', 'pending'),
      Query.lessThanEqual('scheduled_at', now),
      Query.limit(20),
    ]);
    docs = result.documents;
    log(`[fb-scheduler] found ${docs.length} pending post(s)`);
  } catch (e) {
    error(`[fb-scheduler] DB list failed: ${e.message}`);
    return res.json({ ok: false, error: e.message });
  }

  if (!docs.length) {
    return res.json({ ok: true, published: 0, message: 'No pending posts due' });
  }

  // 2. Mark as processing to avoid double-publish
  for (const doc of docs) {
    await db.updateDocument(AW_DB, COL_QUEUE, doc.$id, { status: 'processing' }).catch(() => {});
  }

  // 3. Publish each post via Netlify proxy
  const summary = [];

  for (const doc of docs) {
    log(`[fb-scheduler] publishing doc ${doc.$id} — "${doc.caption?.substring(0, 40)}..."`);

    let payload;
    let action = 'post';

    if (doc.carousel_urls && doc.carousel_urls.length >= 2) {
      action = 'carousel';
      payload = { action, caption: doc.caption, imageUrls: doc.carousel_urls };
    } else {
      payload = {
        action,
        caption:  doc.caption,
        imageUrl: doc.image_url || null,
        videoUrl: doc.video_url || null,
      };
    }

    let publishResult;
    try {
      const r = await fetch(`${base}/.netlify/functions/fb-autopost`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      publishResult = await r.json();
    } catch (e) {
      publishResult = { error: e.message };
    }

    const success = !publishResult.error && publishResult.ok > 0;
    const newStatus = success ? 'published' : 'failed';

    await db.updateDocument(AW_DB, COL_QUEUE, doc.$id, {
      status:    newStatus,
      posted_at: new Date().toISOString(),
      results:   JSON.stringify(publishResult),
    }).catch(e => error(`status update failed: ${e.message}`));

    summary.push({ id: doc.$id, status: newStatus, ok: publishResult.ok, fail: publishResult.fail });
    log(`[fb-scheduler] doc ${doc.$id} → ${newStatus}`);
  }

  const published = summary.filter(s => s.status === 'published').length;
  const failed    = summary.filter(s => s.status === 'failed').length;

  log(`[fb-scheduler] done — ${published} published, ${failed} failed`);
  return res.json({ ok: true, published, failed, summary });
};


<script>
document.addEventListener('DOMContentLoaded',()=>{
  const ids=['batchPostBtn','postSelectedBtn','qmPostBtn'];
  ids.forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.disabled=false;
      b.style.pointerEvents='auto';
      b.style.opacity='1';
      b.style.zIndex='99999';
    }
  });
});
</script>
