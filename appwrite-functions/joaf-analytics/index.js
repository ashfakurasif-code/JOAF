// Appwrite Function: joaf-analytics v2 — Revolution Edition
// Runtime: node-18.0
// CRON: 0 */6 * * * (every 6 hours)
//
// What this does:
// 1. Pulls FB post insights (reach, comments, shares, saves, reactions)
// 2. Calculates Viral Score v2 per post
// 3. Tracks format, time, and location performance
// 4. Feeds self-learning data back to publisher_config
// 5. Builds "best_formats_by_hour" and "best_formats_by_location" maps

const AW_KEY      = process.env.APPWRITE_API_KEY    || process.env.AW_KEY      || '';
const AW_PROJECT  = process.env.APPWRITE_PROJECT_ID || process.env.AW_PROJECT  || '6a11b6cd000b59f318eb';
const AW_ENDPOINT = process.env.APPWRITE_ENDPOINT   || process.env.AW_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const DB          = 'joaf';

const AW_H = {
  'X-Appwrite-Project': AW_PROJECT,
  'X-Appwrite-Key': AW_KEY,
  'Content-Type': 'application/json',
};

// ── 17-page location map (mirrors viral-os) ───────────────────────────────
const PAGE_REGION = {
  '901104276426275': 'national',
  '747955745072916': 'mymensingh',
  '698945426644829': 'dhaka_div',
  '774087689120805': 'diaspora_me',
  '800066663185559': 'chittagong_div',
  '767070709830635': 'diaspora_eu',
  '819591557896069': 'diaspora_au',
  '771297736066387': 'rangpur_div',
  '811857228669187': 'diaspora_as',
  '821514351035673': 'diaspora_ca',
  '742860382250359': 'dhaka_metro',
  '819346937917703': 'khulna_div',
  '668493799674686': 'diaspora_us',
  '547243828481347': 'chittagong_div',
  '586562744547226': 'rajshahi_div',
  '607102832487121': 'barishal_div',
  '599649799896567': 'mymensingh_div',
};

// ── Helpers ────────────────────────────────────────────────────────────────
async function aw(method, path, body) {
  const r = await fetch(`${AW_ENDPOINT}${path}`, {
    method,
    headers: AW_H,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 || r.status === 409) return null;
  if (!r.ok) return null;
  if (method === 'DELETE') return {};
  return r.json();
}

async function awList(col, limit = 100) {
  const r = await aw('GET', `/databases/${DB}/collections/${col}/documents?limit=${limit}`);
  return r?.documents || [];
}

async function awPatch(col, id, data) {
  return aw('PATCH', `/databases/${DB}/collections/${col}/documents/${id}`, { data });
}

async function awCreate(col, data) {
  return aw('POST', `/databases/${DB}/collections/${col}/documents`, {
    documentId: 'unique()',
    data,
  });
}

async function awUpsertConfig(key, value) {
  const existing = await aw('GET', `/databases/${DB}/collections/publisher_config/documents/${key}`);
  const data = { key, value: JSON.stringify(value), updated_at: new Date().toISOString() };
  if (existing?.$id) {
    return aw('PATCH', `/databases/${DB}/collections/publisher_config/documents/${key}`, { data });
  }
  return aw('POST', `/databases/${DB}/collections/publisher_config/documents`, {
    documentId: key, data,
  });
}

// ── Viral Score v2 ─────────────────────────────────────────────────────────
// Weights based on Facebook 2025-26 algorithm signal importance:
// Shares > Saves > Comments > Reactions > Reach
function viralScoreV2({ reach = 0, shares = 0, comments = 0, saves = 0, reactions = 0, content_type = 'image' }) {
  if (reach < 10) return 0;

  // Engagement signals (weighted by FB algorithm priority)
  const engagementScore =
    shares   * 40 +   // shares = most valuable signal
    saves    * 30 +   // saves = high retention signal
    comments * 25 +   // comments = conversation signal
    reactions * 5;    // reactions = light signal

  // Engagement rate (engagement per reach)
  const engRate = engagementScore / Math.max(reach, 1);

  // Content type multiplier
  const typeMultiplier = content_type === 'video' ? 1.4 :
                          content_type === 'image' ? 1.0 : 0.85;

  // Raw score 0-100
  const raw = Math.min(engRate * 500 * typeMultiplier, 100);

  return Math.round(raw);
}

// ── Retention decay scoring (newer = better) ──────────────────────────────
function recencyBonus(publishedAt) {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3600000;
  if (ageHours < 6)   return 20;
  if (ageHours < 24)  return 10;
  if (ageHours < 48)  return 5;
  return 0;
}

// ── FB Graph API insights ─────────────────────────────────────────────────
async function getFBInsights(postId, pageToken) {
  const fields = [
    'insights.metric(post_impressions_unique)',      // reach
    'insights.metric(post_impressions)',              // impressions
    'insights.metric(post_reactions_by_type_total)', // reactions
    'insights.metric(post_activity_by_action_type)', // shares + comments
    'insights.metric(post_saved)',                   // saves
  ].join(',');

  const url = `https://graph.facebook.com/v21.0/${postId}?fields=${encodeURIComponent(fields)}&access_token=${pageToken}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function parseInsights(insights) {
  let reach = 0, impressions = 0, reactions = 0, shares = 0, comments = 0, saves = 0;
  for (const m of insights?.insights?.data || []) {
    const v = m.values?.[0]?.value;
    if (!v && v !== 0) continue;
    switch (m.name) {
      case 'post_impressions_unique': reach = +v || 0; break;
      case 'post_impressions':        impressions = +v || 0; break;
      case 'post_saved':              saves = +v || 0; break;
      case 'post_reactions_by_type_total':
        reactions = Object.values(v || {}).reduce((a, b) => a + (+b || 0), 0); break;
      case 'post_activity_by_action_type':
        shares   = +(v?.share   || 0);
        comments = +(v?.comment || 0);
        break;
    }
  }
  return { reach, impressions, reactions, shares, comments, saves };
}

// ── Load FB page tokens from fb-autopost variables ────────────────────────
async function loadPageTokens() {
  try {
    const r = await fetch(`${AW_ENDPOINT}/functions/fb-autopost/variables`, {
      headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json();
    const v = (d.variables || []).find(x => x.key === 'FB_PAGE_ACCESS_TOKENS');
    return v?.value ? JSON.parse(v.value) : {};
  } catch { return {}; }
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch {}
  const action = body.action || 'collect';

  // ── Status ──────────────────────────────────────────────────────────────
  if (action === 'status') {
    const logs = await aw('GET', `/databases/${DB}/collections/publisher_log/documents?limit=1`);
    return res.json({ ok: true, total_posts: logs?.total || 0 });
  }

  // ── Collect & Score Insights ─────────────────────────────────────────────
  log('analytics v2: starting collection');
  const pageTokens = await loadPageTokens();
  const pageIds = Object.keys(pageTokens);

  if (!pageIds.length) {
    error('analytics: no page tokens found');
    return res.json({ ok: false, error: 'no page tokens' });
  }

  // Get logs from last 72 hours
  const logs = await awList('publisher_log', 100);
  const cutoff = Date.now() - 72 * 3600 * 1000;
  const recentLogs = logs.filter(d => new Date(d.published_at || d.$createdAt).getTime() > cutoff);

  log(`analytics: ${recentLogs.length} posts to analyze`);

  // Accumulators for self-learning
  const formatStats  = {};  // format → { score_sum, count, shares, comments }
  const hourStats    = {};  // hour (0-23) → { score_sum, count }
  const locationStats = {}; // region → { score_sum, count }
  const typeStats    = {};  // image|video|text → { score_sum, count }

  let processed = 0;
  let totalReach = 0;

  for (const doc of recentLogs) {
    try {
      const pageResults = JSON.parse(doc.page_results || '{}');
      const pageId = Object.keys(pageResults)[0];
      const fbPostId = pageResults[pageId];
      if (!fbPostId || fbPostId.startsWith('error') || !fbPostId.includes('_')) continue;

      const token = pageTokens[pageId]?.token;
      if (!token) continue;

      const insights = await getFBInsights(fbPostId, token);
      if (!insights) continue;

      const { reach, impressions, reactions, shares, comments, saves } = parseInsights(insights);
      const contentType = doc.video_file_id ? 'video' : doc.jpg_url ? 'image' : 'text';
      const score = viralScoreV2({ reach, shares, comments, saves, reactions, content_type: contentType });
      const bonus = recencyBonus(doc.published_at);
      const finalScore = Math.min(100, score + bonus);

      totalReach += reach;

      // Save analytics record
      await awCreate('publisher_analytics', {
        log_id: doc.$id,
        post_id: fbPostId,
        page_id: pageId,
        page_name: pageTokens[pageId]?.name || '',
        reach, impressions, comments, shares, reactions, saves,
        engagement_rate: reach > 0 ? +((shares * 3 + comments * 2 + reactions) / reach).toFixed(4) : 0,
        fetched_at: new Date().toISOString(),
      }).catch(() => {});

      // Update log with viral score
      await awPatch('publisher_log', doc.$id, {
        viral_score: finalScore,
        reach_estimate: reach,
      }).catch(() => {});

      // Accumulate for self-learning
      const fmt = doc.format || 'unknown';
      formatStats[fmt] = formatStats[fmt] || { score_sum: 0, count: 0, shares: 0, comments: 0 };
      formatStats[fmt].score_sum += finalScore;
      formatStats[fmt].count++;
      formatStats[fmt].shares   += shares;
      formatStats[fmt].comments += comments;

      const hour = new Date(doc.published_at || doc.$createdAt).getUTCHours();
      const bdHour = (hour + 6) % 24; // convert to BD time
      hourStats[bdHour] = hourStats[bdHour] || { score_sum: 0, count: 0 };
      hourStats[bdHour].score_sum += finalScore;
      hourStats[bdHour].count++;

      const region = PAGE_REGION[pageId] || 'unknown';
      locationStats[region] = locationStats[region] || {};
      locationStats[region][fmt] = locationStats[region][fmt] || { score_sum: 0, count: 0 };
      locationStats[region][fmt].score_sum += finalScore;
      locationStats[region][fmt].count++;

      typeStats[contentType] = typeStats[contentType] || { score_sum: 0, count: 0 };
      typeStats[contentType].score_sum += finalScore;
      typeStats[contentType].count++;

      processed++;
      log(`✓ ${fmt} score=${finalScore} reach=${reach} shares=${shares} comments=${comments}`);

    } catch (e) { log(`skip ${doc.$id}: ${e.message}`); }
  }

  // ── Self-Learning: update publisher_config ────────────────────────────────
  if (processed > 0) {
    // Top formats by viral score
    const topFormats = Object.entries(formatStats)
      .filter(([, s]) => s.count >= 1)
      .map(([fmt, s]) => ({ fmt, avg: s.score_sum / s.count, shares: s.shares, comments: s.comments }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
      .map(x => x.fmt);

    // Best posting hours (BD time)
    const bestHours = Object.entries(hourStats)
      .map(([h, s]) => ({ hour: +h, avg: s.score_sum / s.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(x => x.hour);

    // Best content type
    const bestType = Object.entries(typeStats)
      .map(([t, s]) => ({ type: t, avg: s.score_sum / s.count }))
      .sort((a, b) => b.avg - a.avg)[0]?.type || 'image';

    // Location format preferences
    const locationPrefs = {};
    for (const [region, fmtMap] of Object.entries(locationStats)) {
      locationPrefs[region] = Object.entries(fmtMap)
        .map(([fmt, s]) => ({ fmt, avg: s.score_sum / s.count }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map(x => x.fmt);
    }

    // Save self-learning data
    await awUpsertConfig('best_formats',          topFormats);
    await awUpsertConfig('best_posting_hours_bd', bestHours);
    await awUpsertConfig('best_content_type',     bestType);
    await awUpsertConfig('location_format_prefs', locationPrefs);
    await awUpsertConfig('last_analytics_run',    new Date().toISOString());
    await awUpsertConfig('total_reach_72h',       totalReach);

    log(`self-learning saved: top formats=${topFormats.join(',')} best hours=${bestHours.join(',')}`);

    // System health report
    const healthReport = {
      processed,
      total_reach_72h: totalReach,
      top_formats: topFormats,
      best_hours_bd: bestHours,
      best_content_type: bestType,
      format_detail: Object.entries(formatStats).map(([fmt, s]) => ({
        fmt,
        avg_score: Math.round(s.score_sum / s.count),
        posts: s.count,
        total_shares: s.shares,
        total_comments: s.comments,
      })).sort((a, b) => b.avg_score - a.avg_score),
    };

    await awUpsertConfig('system_health_report', healthReport);
  }

  return res.json({
    ok: true,
    processed,
    total_reach_72h: totalReach,
    top_formats: Object.entries(formatStats)
      .sort(([, a], [, b]) => (b.score_sum / b.count) - (a.score_sum / a.count))
      .slice(0, 5)
      .map(([fmt, s]) => ({
        fmt,
        avg_viral_score: Math.round(s.score_sum / s.count),
        posts: s.count,
      })),
  });
};
