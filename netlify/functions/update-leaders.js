// update-leaders.js — Groq AI দিয়ে নেতাদের data update করে
// Firebase Admin SDK optional — client SDK fallback আছে

const GROQ_KEY    = process.env.GROQ_API_KEY;
const ADMIN_KEY   = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6*3600000).toISOString().slice(0,10);

// ── Firestore REST API (no SDK needed) ──
async function firestoreGet(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}?key=${FB_CONFIG.apiKey}&pageSize=200`;
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
  });
}

async function firestoreSet(collection, docId, data) {
  // Build Firestore field map
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(i => {
      if (typeof i === 'object' && i !== null) return { mapValue: { fields: Object.fromEntries(Object.entries(i).map(([k,vv]) => [k, toField(vv)])) } };
      return toField(i);
    })}};
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k,v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}/${docId}?key=${FB_CONFIG.apiKey}`;
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

// ── Groq AI analysis ──
async function groqAnalyze(leader, today) {
  const prompt = `তুমি বাংলাদেশের নিরপেক্ষ রাজনৈতিক বিশ্লেষক। আজকের তারিখ ${today}।

নেতা: ${leader.name} (${leader.party}, ${leader.role})

শুধু নিচের JSON object return করো, আর কিছু না, কোনো markdown নেই:
{"approval":70,"viral":false,"isDeceased":false,"promises":[{"text":"উদাহরণ প্রতিশ্রুতি","status":"progress"}],"statements":[{"text":"সাম্প্রতিক উক্তি","date":"এপ্রিল ২০২৬"}],"controversies":[{"text":"বিতর্ক","date":"এপ্রিল ২০২৬"}],"virals":[{"text":"ভাইরাল মুহূর্ত","icon":"🔥","date":"এপ্রিল ২০২৬"}]}

নিয়ম:
- approval: ১-১০০ (বর্তমান আনুমানিক জনসমর্থন)
- isDeceased: এই ব্যক্তি মৃত হলে true, জীবিত হলে false
- promises: ৪-৬টি (বাংলাদেশের বর্তমান প্রেক্ষাপটে)
- statements: ২-৩টি সাম্প্রতিক
- controversies: ১-৩টি (না থাকলে খালি array)
- virals: ১-৩টি (না থাকলে খালি array)
- সব বাংলায়, নিরপেক্ষ`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role:'user', content:prompt }], temperature:0.3, max_tokens:1200 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch(e) { continue; }
  }
  return null;
}

// ── Full 60+ leaders list ──
const LEADERS_LIST = [
  // সরকার / উপদেষ্টা
  { id:'yunus',        name:'ড. মুহাম্মদ ইউনূস',                    party:'অন্তর্বর্তীকালীন সরকার',      role:'প্রধান উপদেষ্টা',         cat:'সরকার',        icon:'👴' },
  { id:'salehuddin',   name:'ড. সালেহউদ্দিন আহমেদ',                  party:'অন্তর্বর্তীকালীন সরকার',      role:'অর্থ উপদেষ্টা',           cat:'সরকার',        icon:'💰' },
  { id:'touhid',       name:'মো. তৌহিদ হোসেন',                       party:'অন্তর্বর্তীকালীন সরকার',      role:'পররাষ্ট্র উপদেষ্টা',      cat:'সরকার',        icon:'🌐' },
  { id:'sakhawat',     name:'ব্রিগেডিয়ার (অব.) সাখাওয়াত হোসেন',     party:'অন্তর্বর্তীকালীন সরকার',      role:'স্বরাষ্ট্র উপদেষ্টা',     cat:'সরকার',        icon:'🛡️' },
  { id:'ali_riaz',     name:'ড. আলী রীয়াজ',                         party:'সংবিধান সংস্কার কমিশন',       role:'প্রধান',                   cat:'সরকার',        icon:'📚' },
  { id:'syeda_rizwana',name:'সৈয়দা রিজওয়ানা হাসান',                  party:'অন্তর্বর্তীকালীন সরকার',      role:'পরিবেশ উপদেষ্টা',         cat:'সরকার',        icon:'🌿' },
  { id:'debapriya',    name:'ড. দেবপ্রিয় ভট্টাচার্য',                party:'অর্থনীতি সংস্কার কমিশন',      role:'প্রধান',                   cat:'সরকার',        icon:'📊' },
  { id:'badruddoza',   name:'বদিউল আলম মজুমদার',                     party:'নির্বাচন সংস্কার কমিশন',       role:'প্রধান',                   cat:'সরকার',        icon:'🗳️' },

  // বিরোধী দল — বিএনপি
  { id:'fakhrul',      name:'মির্জা ফখরুল ইসলাম আলমগীর',             party:'বিএনপি',                      role:'মহাসচিব',                  cat:'বিরোধী দল',   icon:'👤' },
  { id:'tarique',      name:'তারেক রহমান',                            party:'বিএনপি',                      role:'ভারপ্রাপ্ত চেয়ারম্যান',   cat:'বিরোধী দল',   icon:'👤' },
  { id:'khaleda',      name:'বেগম খালেদা জিয়া',                       party:'বিএনপি',                      role:'চেয়ারপারসন',              cat:'বিরোধী দল',   icon:'👩' },
  { id:'amir_khasru',  name:'আমির খসরু মাহমুদ চৌধুরী',                party:'বিএনপি',                      role:'স্থায়ী কমিটির সদস্য',    cat:'বিরোধী দল',   icon:'👤' },
  { id:'ruhul_kabir',  name:'রুহুল কবির রিজভী',                       party:'বিএনপি',                      role:'সিনিয়র যুগ্ম মহাসচিব',   cat:'বিরোধী দল',   icon:'👤' },
  { id:'gayeshwar',    name:'গয়েশ্বর চন্দ্র রায়',                    party:'বিএনপি',                      role:'স্থায়ী কমিটির সদস্য',    cat:'বিরোধী দল',   icon:'👤' },
  { id:'nazrul_bnp',   name:'নজরুল ইসলাম খান',                        party:'বিএনপি',                      role:'স্থায়ী কমিটির সদস্য',    cat:'বিরোধী দল',   icon:'👤' },

  // বিরোধী দল — জামায়াত
  { id:'shafiqur',     name:'শফিকুর রহমান',                           party:'জামায়াতে ইসলামী',             role:'আমির',                     cat:'বিরোধী দল',   icon:'🧔' },
  { id:'etim',         name:'ড. শফিকুল ইসলাম মাসুদ',                  party:'জামায়াতে ইসলামী',             role:'সেক্রেটারি জেনারেল',      cat:'বিরোধী দল',   icon:'👤' },
  { id:'kamruzzaman',  name:'মো. কামরুজ্জামান',                        party:'জামায়াতে ইসলামী',             role:'নায়েবে আমির',              cat:'বিরোধী দল',   icon:'👤' },

  // বিরোধী দল — অন্যান্য
  { id:'ibrahim',      name:'মেজর জেনারেল (অব.) সৈয়দ মুহাম্মদ ইব্রাহিম', party:'বাংলাদেশ কল্যাণ পার্টি', role:'চেয়ারম্যান',              cat:'বিরোধী দল',   icon:'🎖️' },
  { id:'mosharraf',    name:'কর্নেল (অব.) অলি আহমদ',                  party:'এলডিপি',                      role:'চেয়ারম্যান',              cat:'বিরোধী দল',   icon:'🎖️' },
  { id:'razzak',       name:'আ স ম আব্দুর রব',                         party:'জাসদ',                        role:'সভাপতি',                   cat:'বিরোধী দল',   icon:'✊' },
  { id:'hasanul',      name:'হাসানুল হক ইনু',                          party:'জাসদ',                        role:'সাধারণ সম্পাদক',          cat:'বিরোধী দল',   icon:'👤' },
  { id:'badruddoza_b', name:'ড. বদরুদ্দোজা চৌধুরী',                   party:'বিকল্পধারা বাংলাদেশ',         role:'প্রেসিডেন্ট',              cat:'বিরোধী দল',   icon:'👴' },
  { id:'ershad_jp',    name:'জিএম কাদের',                              party:'জাতীয় পার্টি',               role:'চেয়ারম্যান',              cat:'বিরোধী দল',   icon:'👤' },

  // যুব / নতুন দল — NCP
  { id:'nahid',        name:'নাহিদ ইসলাম',                            party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'আহ্বায়ক',                 cat:'যুব রাজনীতি', icon:'🧑', viral:true },
  { id:'asif',         name:'আসিফ মাহমুদ',                            party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'যুগ্ম আহ্বায়ক',           cat:'যুব রাজনীতি', icon:'👦', viral:true },
  { id:'hasnat',       name:'হাসনাত আবদুল্লাহ',                       party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'সদস্য সচিব',               cat:'যুব রাজনীতি', icon:'👦' },
  { id:'sarjis',       name:'সারজিস আলম',                             party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'যুগ্ম সদস্য সচিব',         cat:'যুব রাজনীতি', icon:'👦', viral:true },
  { id:'akhtar',       name:'আখতার হোনেন',                            party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'কেন্দ্রীয় নেতা',          cat:'যুব রাজনীতি', icon:'👦' },
  { id:'nusrat',       name:'নুসরাত তাবাস্সুম',                        party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'কেন্দ্রীয় নেত্রী',        cat:'যুব রাজনীতি', icon:'👩', viral:true },
  { id:'ritu',         name:'উম্মে হাবিবা রিতু',                       party:'জাতীয় নাগরিক পার্টি (NCP)',  role:'কেন্দ্রীয় নেত্রী',        cat:'যুব রাজনীতি', icon:'👩' },

  // যুব — ছাত্র আন্দোলন
  { id:'abu_bakar',    name:'আবু বাকর মজুমদার',                        party:'বৈষম্যবিরোধী ছাত্র আন্দোলন', role:'সমন্বয়ক',                  cat:'যুব রাজনীতি', icon:'🎓' },
  { id:'tanvir',       name:'তানভীর হাসান সিফাত',                      party:'বৈষম্যবিরোধী ছাত্র আন্দোলন', role:'সমন্বয়ক',                  cat:'যুব রাজনীতি', icon:'🎓' },
  { id:'rifat',        name:'রিফাত রশিদ',                              party:'বৈষম্যবিরোধী ছাত্র আন্দোলন', role:'সমন্বয়ক',                  cat:'যুব রাজনীতি', icon:'🎓' },
  { id:'mahfuz',       name:'মাহফুজ আলম',                              party:'বৈষম্যবিরোধী ছাত্র আন্দোলন', role:'সমন্বয়ক',                  cat:'যুব রাজনীতি', icon:'🎓' },

  // সুশীল সমাজ / বিশেষজ্ঞ
  { id:'farhaan',      name:'ড. ফরহান হোসাইন',                         party:'নির্বাচন সংস্কার কমিশন',       role:'সদস্য',                    cat:'সুশীল সমাজ',  icon:'⚖️' },
  { id:'iftekhar',     name:'ড. ইফতেখারুজ্জামান',                       party:'ট্রান্সপারেন্সি ইন্টারন্যাশনাল', role:'নির্বাহী পরিচালক',      cat:'সুশীল সমাজ',  icon:'🔍' },
  { id:'hossain_zillur',name:'ড. হোসেন জিল্লুর রহমান',                party:'পিপিআরসি',                     role:'নির্বাহী চেয়ারম্যান',    cat:'সুশীল সমাজ',  icon:'📊' },
  { id:'khushi_kabir', name:'খুশী কবির',                               party:'নিজেরা করি',                   role:'সমন্বয়কারী',              cat:'সুশীল সমাজ',  icon:'🤝' },
  { id:'sultana',      name:'রোকেয়া কবির',                             party:'বাংলাদেশ নারী প্রগতি সংঘ',   role:'সম্পাদক',                  cat:'সুশীল সমাজ',  icon:'👩' },
  { id:'mainul',       name:'মাইনুল ইসলাম',                            party:'সিপিবি',                       role:'সভাপতি',                   cat:'সুশীল সমাজ',  icon:'✊' },
  { id:'dilip',        name:'দিলীপ বড়ুয়া',                            party:'সিপিবি',                       role:'সাধারণ সম্পাদক',          cat:'সুশীল সমাজ',  icon:'✊' },

  // আওয়ামী লীগ (সাবেক সরকার)
  { id:'hasina',       name:'শেখ হাসিনা',                              party:'আওয়ামী লীগ',                  role:'সাবেক প্রধানমন্ত্রী',     cat:'আওয়ামী লীগ',  icon:'👩' },
  { id:'obaidul',      name:'ওবায়দুল কাদের',                           party:'আওয়ামী লীগ',                  role:'সাধারণ সম্পাদক',          cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'polan',        name:'জুনাইদ আহমেদ পলক',                        party:'আওয়ামী লীগ',                  role:'সাবেক প্রতিমন্ত্রী',      cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'hasan_mahmud', name:'হাসান মাহমুদ',                            party:'আওয়ামী লীগ',                  role:'সাবেক তথ্যমন্ত্রী',       cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'asaduzzaman',  name:'আসাদুজ্জামান খান কামাল',                  party:'আওয়ামী লীগ',                  role:'সাবেক স্বরাষ্ট্রমন্ত্রী', cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'faruk_khan',   name:'ফারুক খান',                               party:'আওয়ামী লীগ',                  role:'সাবেক মন্ত্রী',            cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'anisul',       name:'আনিসুল হক',                               party:'আওয়ামী লীগ',                  role:'সাবেক আইনমন্ত্রী',        cat:'আওয়ামী লীগ',  icon:'⚖️' },
  { id:'dipu_moni',    name:'দীপু মনি',                                party:'আওয়ামী লীগ',                  role:'সাবেক শিক্ষামন্ত্রী',     cat:'আওয়ামী লীগ',  icon:'👩' },
  { id:'sheikh_selim', name:'শেখ ফজলুল করিম সেলিম',                   party:'আওয়ামী লীগ',                  role:'প্রেসিডিয়াম সদস্য',       cat:'আওয়ামী লীগ',  icon:'👤' },
  { id:'tofail',       name:'তোফায়েল আহমেদ',                           party:'আওয়ামী লীগ',                  role:'প্রেসিডিয়াম সদস্য',       cat:'আওয়ামী লীগ',  icon:'👴' },

  // ব্যবসায়ী
  { id:'fazle_hasan',  name:'ফজলে হাসান আবেদ (স্মরণীয়)',              party:'BRAC',                          role:'প্রতিষ্ঠাতা',              cat:'ব্যবসায়ী',    icon:'🏗️' },
  { id:'rubana',       name:'রুবানা হক',                               party:'বিজিএমইএ',                     role:'সাবেক সভাপতি',             cat:'ব্যবসায়ী',    icon:'👩' },
  { id:'mahbubul',     name:'মাহবুবুল আলম',                           party:'এফবিসিসিআই',                   role:'সভাপতি',                   cat:'ব্যবসায়ী',    icon:'💼' },
  { id:'salman',       name:'সালমান এফ রহমান',                         party:'বেক্সিমকো গ্রুপ',              role:'চেয়ারম্যান (সাবেক উপদেষ্টা)', cat:'ব্যবসায়ী', icon:'💰' },
  { id:'aziz_khan',    name:'আজিজ খান',                                party:'সামিট গ্রুপ',                  role:'চেয়ারম্যান',              cat:'ব্যবসায়ী',    icon:'⚡' },

  // নতুন উদীয়মান
  { id:'minhaz',       name:'মিনহাজ মান্নান ইমন',                      party:'ঢাকা চেম্বার',                 role:'সভাপতি',                   cat:'ব্যবসায়ী',    icon:'🏢' },
  { id:'parvez',       name:'পারভেজ আলম',                              party:'রাজনৈতিক বিশ্লেষক',           role:'গবেষক',                    cat:'সুশীল সমাজ',  icon:'🎙️' },
  { id:'zulkarnine',   name:'ড. জুলকারনাইন',                           party:'রাজনৈতিক বিশ্লেষক',           role:'অধ্যাপক',                  cat:'সুশীল সমাজ',  icon:'🎓' },
  { id:'pinaki',       name:'পিনাকী ভট্টাচার্য',                        party:'স্বাধীন বিশ্লেষক',            role:'লেখক ও ইউটিউবার',          cat:'সুশীল সমাজ',  icon:'✍️', viral:true },
  { id:'ilias',        name:'ইলিয়াস হোসেন',                            party:'স্বাধীন সাংবাদিক',            role:'ইউটিউবার',                 cat:'সুশীল সমাজ',  icon:'🎙️', viral:true },
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  // Auth
  const adminKey  = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const today = BD_TODAY();
  const results = [];
  let updated = 0;

  // Process in batches of 10 to avoid timeout
  const body = JSON.parse(event.body || '{}');
  const batchStart = body.batchStart || 0;
  const batchSize  = 10;
  const batch = LEADERS_LIST.slice(batchStart, batchStart + batchSize);

  for (const leader of batch) {
    try {
      // Check last update via Firestore REST
      let existingDoc = null;
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${leader.id}?key=${FB_CONFIG.apiKey}`;
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          const fields = d.fields || {};
          existingDoc = { lastAiUpdate: fields.lastAiUpdate?.stringValue };
        }
      } catch(e) {}

      if (existingDoc?.lastAiUpdate === today) {
        results.push({ id: leader.id, name: leader.name, status: 'skipped' });
        continue;
      }

      const aiData = await groqAnalyze(leader, today);
      if (!aiData) {
        results.push({ id: leader.id, name: leader.name, status: 'ai_failed' });
        continue;
      }

      const docData = {
        name:          leader.name,
        party:         leader.party,
        role:          leader.role,
        cat:           leader.cat,
        icon:          leader.icon || '👤',
        viral:         aiData.viral      ?? leader.viral ?? false,
        // isDeceased: AI-এর মতামত (মৃত হলে true, জীবিত হলে false)
        isDeceased:    aiData.isDeceased === true,
        approval:      typeof aiData.approval === 'number' ? aiData.approval : 50,
        promises:      Array.isArray(aiData.promises)      ? aiData.promises      : [],
        statements:    Array.isArray(aiData.statements)    ? aiData.statements    : [],
        controversies: Array.isArray(aiData.controversies) ? aiData.controversies : [],
        virals:        Array.isArray(aiData.virals)        ? aiData.virals        : [],
        lastAiUpdate:  today,
      };

      await firestoreSet('leaders', leader.id, docData);
      updated++;
      results.push({ id: leader.id, name: leader.name, status: 'updated', approval: aiData.approval });
      await new Promise(r => setTimeout(r, 600));
    } catch(e) {
      results.push({ id: leader.id, name: leader.name, status: 'error', error: e.message });
    }
  }

  const hasMore = (batchStart + batchSize) < LEADERS_LIST.length;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      date: today,
      updated,
      total: LEADERS_LIST.length,
      batchStart,
      batchEnd: batchStart + batch.length,
      hasMore,
      nextBatch: hasMore ? batchStart + batchSize : null,
      results,
    }),
  };
};
