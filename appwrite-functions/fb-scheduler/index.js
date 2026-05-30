// Appwrite Function: fb-scheduler
// Trigger: CRON — "0 * * * *" (every hour)
// Purpose: fetch pending fb_queue posts where scheduled_at <= now, then trigger fb-autopost via Appwrite SDK
//
// Appwrite Function Environment Variables needed:
//   APPWRITE_ENDPOINT  — e.g. https://fra.cloud.appwrite.io/v1
//   APPWRITE_PROJECT   — your project ID
//   APPWRITE_API_KEY   — server API key (has db read/write permission)
//
// Runtime fallbacks also support Appwrite-injected variables:
//   APPWRITE_FUNCTION_API_ENDPOINT, APPWRITE_FUNCTION_PROJECT_ID, APPWRITE_FUNCTION_API_KEY

import { Client, Databases, Functions, Query, ID } from 'node-appwrite';

const AW_DB      = 'joaf';
const COL_QUEUE  = 'fb_queue';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID || '6a11b6cd000b59f318eb';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

/** Exponential backoff retry for transient errors */
async function withRetry(fn, maxAttempts = 3, label = 'op') {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isTransient = e.message?.includes('429') || e.message?.includes('503') || e.message?.includes('rate');
      if (attempt === maxAttempts || !isTransient) throw e;
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[fb-scheduler] ${label} attempt ${attempt} failed (${e.message}), retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export default async ({ req, res, log, error }) => {
  const runtimeApiKey = req.headers['x-appwrite-key'] || req.headers['X-Appwrite-Key'] || APPWRITE_API_KEY;
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(runtimeApiKey || APPWRITE_API_KEY);

  const db   = new Databases(client);
  const now  = new Date().toISOString();
  const lockToken = ID.unique(); // Unique per scheduler invocation
  log(`[fb-scheduler] running at ${now}, lock=${lockToken}`);

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

  // 2. Atomically claim each doc with our lock token — skip any already claimed
  const claimedDocs = [];
  for (const doc of docs) {
    try {
      // Only update if status is still 'pending' (another invocation may have grabbed it)
      await db.updateDocument(AW_DB, COL_QUEUE, doc.$id, {
        status: 'processing',
        lock_token: lockToken,
      });
      claimedDocs.push(doc);
    } catch (e) {
      // Document was updated between our list and this update — another invocation has it
      log(`[fb-scheduler] doc ${doc.$id} already claimed by another invocation, skipping`);
    }
  }

  if (!claimedDocs.length) {
    return res.json({ ok: true, published: 0, message: 'All docs claimed by concurrent invocation' });
  }

  log(`[fb-scheduler] claimed ${claimedDocs.length} of ${docs.length} pending posts`);

  // 3. Publish each claimed post via Appwrite Functions SDK with retry
  const summary = [];

  for (const doc of claimedDocs) {
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
      const functions = new Functions(client);
      publishResult = await withRetry(async () => {
        const execution = await functions.createExecution(
          'fb-autopost',
          JSON.stringify(payload),
          false,
          '/',
          'POST',
          { 'Content-Type': 'application/json' }
        );
        return JSON.parse(execution.responseBody || '{}');
      }, 3, `publish-${doc.$id}`);
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
