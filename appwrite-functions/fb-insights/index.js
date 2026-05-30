// Appwrite Function: fb-insights
// Trigger: CRON — "0 10 * * *" (daily at 10am)
// Purpose: Fetch real engagement data for posts published 24-72h ago.
//          Compare predicted viralScore/engagementPotential vs actual.
//          Store delta in analytics collection to calibrate future AI prompts.
//
// Required env vars:
//   APPWRITE_ENDPOINT, APPWRITE_PROJECT, APPWRITE_API_KEY
//   FB_PAGE_ACCESS_TOKENS — same format as fb-autopost

import { Client, Databases, Query } from 'node-appwrite';

const AW_DB         = 'joaf';
const COL_QUEUE     = 'fb_queue';
const COL_ANALYTICS = 'fb_analytics';
const FB_BASE       = 'https://graph.facebook.com';

function getApiVersion() {
  return (process.env.FB_API_VERSION || 'v22.0').trim();
}

function getPages() {
  try {
    return JSON.parse(process.env.FB_PAGE_ACCESS_TOKENS || '[]');
  } catch {
    return [];
  }
}

/** Fetch post insights from Graph API */
async function fetchInsights(postId, pageToken) {
  const ver = getApiVersion();
  const metrics = 'post_impressions,post_engaged_users,post_reactions_by_type_total,post_clicks';
  const url = `${FB_BASE}/${ver}/${postId}/insights?metric=${metrics}&access_token=${pageToken}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.data) return null;

  const result = {};
  for (const metric of data.data) {
    const val = metric.values?.[metric.values.length - 1]?.value;
    result[metric.name] = typeof val === 'object' ? Object.values(val).reduce((a, b) => a + b, 0) : (val || 0);
  }

  return result;
}

/** Normalize raw metrics into a 0-100 engagement score */
function computeActualScore(insights, impressions) {
  if (!impressions || impressions < 10) return null;
  const engagedRate = (insights.post_engaged_users || 0) / impressions;
  const reactionRate = (insights.post_reactions_by_type_total || 0) / impressions;
  const clickRate = (insights.post_clicks || 0) / impressions;

  // Weighted engagement score: reactions count most, then clicks, then general engagement
  const score = Math.min(100, Math.round(
    (reactionRate * 60 + clickRate * 25 + engagedRate * 15) * 1000
  ));

  return score;
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const pages = getPages();

  if (!pages.length) {
    return res.json({ ok: false, error: 'No pages configured' });
  }

  // Build a map of pageId → token for quick lookup
  const tokenMap = Object.fromEntries(pages.map(p => [p.id, p.token]));

  // Find posts published 24-72h ago with a real postId but no insights yet
  const windowStart = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  let docs;
  try {
    const result = await db.listDocuments(AW_DB, COL_QUEUE, [
      Query.equal('status', 'published'),
      Query.greaterThanEqual('posted_at', windowStart),
      Query.lessThanEqual('posted_at', windowEnd),
      Query.isNotNull('results'),
      Query.limit(50),
    ]);
    docs = result.documents;
  } catch (e) {
    error('[fb-insights] DB list failed: ' + e.message);
    return res.json({ ok: false, error: e.message });
  }

  log(`[fb-insights] found ${docs.length} posts in analysis window`);

  const analysisResults = [];

  for (const doc of docs) {
    let publishResults;
    try {
      publishResults = JSON.parse(doc.results || '{}');
    } catch {
      continue;
    }

    // Process each page's post result
    const pageResults = publishResults.results || [];
    for (const pageResult of pageResults) {
      if (!pageResult.ok || !pageResult.postId) continue;

      const pageToken = tokenMap[pageResult.id];
      if (!pageToken) continue;

      try {
        const insights = await fetchInsights(pageResult.postId, pageToken);
        if (!insights) continue;

        const impressions = insights.post_impressions || 0;
        const actualScore = computeActualScore(insights, impressions);

        // Extract predicted scores from stored content object
        let predictedEngagement = null;
        let predictedViral = null;
        let contentEmotion = null;
        let contentTone = null;
        if (doc.content_obj) {
          try {
            const contentObj = JSON.parse(doc.content_obj);
            predictedEngagement = contentObj.analyticsHints?.engagementPotential ?? null;
            predictedViral = contentObj.analyticsHints?.viralScore ?? null;
            contentEmotion = contentObj.emotion || null;
            contentTone = contentObj.tone || null;
          } catch {}
        }

        // Store in analytics collection
        const analyticsDoc = {
          post_id: pageResult.postId,
          queue_doc_id: doc.$id,
          page_id: pageResult.id,
          posted_at: doc.posted_at,
          analyzed_at: new Date().toISOString(),
          impressions,
          engaged_users: insights.post_engaged_users || 0,
          reactions: insights.post_reactions_by_type_total || 0,
          clicks: insights.post_clicks || 0,
          actual_score: actualScore,
          predicted_engagement: predictedEngagement,
          predicted_viral: predictedViral,
          score_delta: (actualScore !== null && predictedEngagement !== null)
            ? actualScore - predictedEngagement
            : null,
          content_emotion: contentEmotion,
          content_tone: contentTone,
        };

        try {
          await db.createDocument(AW_DB, COL_ANALYTICS, 'unique()', analyticsDoc);
          analysisResults.push({ postId: pageResult.postId, actualScore, predictedEngagement, delta: analyticsDoc.score_delta });
          log(`[fb-insights] ${pageResult.postId}: actual=${actualScore}, predicted=${predictedEngagement}, delta=${analyticsDoc.score_delta}`);
        } catch (e) {
          error(`[fb-insights] failed to save analytics for ${pageResult.postId}: ${e.message}`);
        }

      } catch (e) {
        error(`[fb-insights] insights fetch failed for ${pageResult.postId}: ${e.message}`);
      }
    }
  }

  // Compute aggregate calibration hints for the AI prompt system
  const scored = analysisResults.filter(r => r.delta !== null);
  if (scored.length >= 5) {
    const avgDelta = Math.round(scored.reduce((s, r) => s + r.delta, 0) / scored.length);
    const calibrationHint = avgDelta > 10
      ? `AI is under-predicting engagement by ~${avgDelta} points on average.`
      : avgDelta < -10
      ? `AI is over-predicting engagement by ~${Math.abs(avgDelta)} points on average.`
      : 'AI predictions are well-calibrated.';

    log(`[fb-insights] Calibration: avgDelta=${avgDelta}, hint="${calibrationHint}"`);

    // Store calibration summary for groq-proxy to read into system prompt
    try {
      await db.createDocument(AW_DB, 'ai_calibration', 'unique()', {
        date: new Date().toISOString().slice(0, 10),
        avg_delta: avgDelta,
        sample_size: scored.length,
        hint: calibrationHint,
      });
    } catch {}
  }

  return res.json({
    ok: true,
    analyzed: docs.length,
    scored: scored.length,
    results: analysisResults,
  });
};
