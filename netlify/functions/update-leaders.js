// update-leaders.js — Firebase থেকে active leaders পড়ে Groq AI দিয়ে update করে
// Static LEADERS_LIST বাদ দেওয়া হয়েছে — এখন discover-leaders.js দিয়ে নেতারা add/remove হয়

const GROQ_KEY    = process.env.GROQ_API_KEY;
const ADMIN_KEY   = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = [
  'llama-3.1-8b-instant',                       // 8B — fastest, lowest token cost, 1M TPD free
  'meta-llama/llama-4-scout-17b-16e-instruct',  // 17B MoE — separate quota
  'llama-3.3-70b-versatile',                    // 70B — last resort, 100k TPD
];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

// ── Firestore REST API ──
async function firestoreGetActiveLeaders() {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders?key=${FB_CONFIG.apiKey}&pageSize=200`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Firestore GET failed: ' + r.status);
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const obj = { id };
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined) obj[k] = v.stringValue;
      else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
      else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
      else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
      else if (v.arrayValue) obj[k] = (v.arrayValue.values || []).map(i => {
        if (i.mapValue) {
          const m = {};
          for (const [mk, mv] of Object.entries(i.mapValue.fields || {})) {
            m[mk] = mv.stringValue ?? mv.integerValue ?? mv.booleanValue ?? '';
          }
          return m;
        }
        return i.stringValue ?? i.integerValue ?? '';
      });
    }
    return obj;
  }).filter(l => l.active !== false && l.isDeceased !== true);
}

async function firestoreGetOne(docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  const fields = d.fields || {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
  }
  return obj;
}

async function firestoreSet(docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(i => {
      if (typeof i === 'object' && i !== null) return { mapValue: { fields: Object.fromEntries(Object.entries(i).map(([k, vv]) => [k, toField(vv)])) } };
      return toField(i);
    })}};
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error('Firestore PATCH failed: ' + err);
  }
  return await r.json();
}

// ── Groq AI analysis — isDeceased check সহ ──
async function groqAnalyze(leader, today) {
  const prompt = `তুমি বাংলাদেশের নিরপেক্ষ রাজনৈতিক বিশ্লেষক। আজকের তারিখ ${today}।

নেতা: ${leader.name} (${leader.party}, ${leader.role})

প্রথমে check করো: এই ব্যক্তি কি মৃত? যদি মৃত হন তাহলে isDeceased: true দাও এবং বাকি fields খালি রাখো।

শুধু নিচের JSON object return করো, আর কিছু না, কোনো markdown নেই:
{"isDeceased":false,"approval":70,"viral":false,"promises":[{"text":"উদাহরণ প্রতিশ্রুতি","status":"progress"}],"statements":[{"text":"সাম্প্রতিক উক্তি","date":"এপ্রিল ২০২৬"}],"controversies":[{"text":"বিতর্ক","date":"এপ্রিল ২০২৬"}],"virals":[{"text":"ভাইরাল মুহূর্ত","icon":"🔥","date":"এপ্রিল ২০২৬"}]}

নিয়ম:
- isDeceased: true হলে শুধু {"isDeceased":true} দাও
- approval: ১-১০০ (বর্তমান আনুমানিক জনসমর্থন)
- promises: ৪-৬টি
- statements: ২-৩টি সাম্প্রতিক
- controversies: ১-৩টি (না থাকলে [])
- virals: ১-৩টি (না থাকলে [])
- সব বাংলায়, নিরপেক্ষ`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 600 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) { continue; }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const adminKey    = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const today = BD_TODAY();
  const results = [];
  let updated = 0;

  try {
    // Firebase থেকে active leaders পড়ো (static list নয়)
    const activeLeaders = await firestoreGetActiveLeaders();
    console.log(`[update-leaders] ${activeLeaders.length} active leaders found in Firebase`);

    const body = JSON.parse(event.body || '{}');
    const batchStart = body.batchStart || 0;
    const batchSize  = 10;
    const batch      = activeLeaders.slice(batchStart, batchStart + batchSize);

    for (const leader of batch) {
      try {
        // আজকে already update হয়েছে কিনা
        const existing = await firestoreGetOne(leader.id);
        if (existing?.lastAiUpdate === today) {
          results.push({ id: leader.id, name: leader.name, status: 'skipped' });
          continue;
        }

        const aiData = await groqAnalyze(leader, today);
        if (!aiData) {
          results.push({ id: leader.id, name: leader.name, status: 'ai_failed' });
          continue;
        }

        // AI বললে মৃত — mark করো
        if (aiData.isDeceased === true) {
          await firestoreSet(leader.id, {
            ...leader,
            isDeceased:   true,
            active:        false,
            lastAiUpdate:  today,
          });
          results.push({ id: leader.id, name: leader.name, status: 'marked_deceased' });
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        const docData = {
          name:          leader.name,
          party:         leader.party || '',
          role:          leader.role || '',
          cat:           leader.cat || '',
          icon:          leader.icon || '👤',
          active:        true,
          isDeceased:    false,
          viral:         aiData.viral ?? leader.viral ?? false,
          approval:      typeof aiData.approval === 'number' ? aiData.approval : 50,
          promises:      Array.isArray(aiData.promises)      ? aiData.promises      : [],
          statements:    Array.isArray(aiData.statements)    ? aiData.statements    : [],
          controversies: Array.isArray(aiData.controversies) ? aiData.controversies : [],
          virals:        Array.isArray(aiData.virals)        ? aiData.virals        : [],
          lastAiUpdate:  today,
        };

        await firestoreSet(leader.id, docData);
        updated++;
        results.push({ id: leader.id, name: leader.name, status: 'updated', approval: aiData.approval });
        await new Promise(r => setTimeout(r, 600));

      } catch (e) {
        results.push({ id: leader.id, name: leader.name, status: 'error', error: e.message });
      }
    }

    const hasMore = (batchStart + batchSize) < activeLeaders.length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:   true,
        date:      today,
        updated,
        total:     activeLeaders.length,
        batchStart,
        batchEnd:  batchStart + batch.length,
        hasMore,
        nextBatch: hasMore ? batchStart + batchSize : null,
        results,
      }),
    };

  } catch (e) {
    console.error('[update-leaders] Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};
