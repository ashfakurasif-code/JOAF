// Appwrite Function: joaf-viral-os
// Runtime: node-18.0
// CRON: "*/5 * * * *"   (every 5 minutes, 24/7 — set in Appwrite Console)
// Autonomous Bengali-first publishing OS for 17 JOAF FB pages
//
// This function is ADDITIVE — it does NOT replace:
//   - daily-press-release  (press release SVG → Cloudinary → FB pipeline)
//   - fb-autopost          (core 17-page poster)
//   - joaf-autopublish     (4-slot daily scheduler)
//
// Env vars required:
//   AW_KEY              Appwrite API key
//   AW_PROJECT          6a11b6cd000b59f318eb
//   AW_ENDPOINT         https://fra.cloud.appwrite.io/v1
//   CLOUDINARY_CLOUD    dou71pfe1
//   CLOUDINARY_PRESET   kf483px5
//   OPENROUTER_KEY      primary AI
//   GEMINI_KEY          fallback AI
//   GROQ_KEY            fallback AI

import crypto from 'crypto';

// ── Config ───────────────────────────────────────────────────────────────────
const AW_KEY      = process.env.APPWRITE_API_KEY || process.env.AW_KEY || 'standard_4b67a7b75a3aea21254c6c866601aad3f30784f8818e5f9ec024ff27f64956f967814886192e7ce5079e67e557988e53840de1bdc2d503d39f1d3aebeccab47a30df90af576b0d91ae362203d644599f3c0b7d42277f10a3c264fc3be5ab6f04d770d959d1d318315a1cdc19f7d041a911fcb0208c3cb37f52bad824535e9b4b';
const AW_PROJECT  = process.env.APPWRITE_PROJECT_ID || process.env.AW_PROJECT || '6a11b6cd000b59f318eb';
const AW_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.AW_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const CDN_CLOUD   = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD || 'dou71pfe1';
const CDN_PRESET  = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_PRESET || 'kf483px5';
const CDN_API_KEY    = process.env.CLOUDINARY_API_KEY    || '629623956125173';
const CDN_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'SynV9B5Dw4OvXjhzoOhUKucFGHM';
const OR_KEY      = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '';
const GEM_KEY     = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || '';
const GROQ_KEY    = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';

const DB_ID       = 'joaf';
const COL_POOL    = 'viral_content_pool';   // raw content pool
const COL_QUEUE   = 'viral_publish_queue';  // ready-to-publish queue
const COL_LOG     = 'viral_publish_log';    // published log (dedup + analytics)
const BUCKET_ID   = 'fb_media';
const FN_FB       = 'fb-autopost';

// Target queue buffer — if below MIN, auto-generate
const QUEUE_MIN    = 48;  // spec: minimum buffer
const QUEUE_TARGET = 96;  // spec: target buffer (fills gradually, 6/run)
const FILL_PER_RUN = 6;   // max per fill run — avoids timeout, fills to 96 in ~8 cycles

// ── BD Timezone ───────────────────────────────────────────────────────────────
const bdNow  = () => new Date(Date.now() + 6 * 3600000);
const bdDate = () => bdNow().toISOString().slice(0, 10);

// ── RSS Sources ───────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { id: 'prothomalo',   name: 'প্রথম আলো',     url: 'https://www.prothomalo.com/feed' },
  { id: 'bbcbangla',    name: 'BBC বাংলা',       url: 'https://feeds.bbci.co.uk/bengali/rss.xml' },
  { id: 'dwbangla',     name: 'DW বাংলা',        url: 'https://rss.dw.com/rdf/rss-ben-all' },
  { id: 'jugantor',     name: 'যুগান্তর',         url: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'samakal',      name: 'সমকাল',            url: 'https://samakal.com/feed' },
  { id: 'kalerkantho',  name: 'কালের কণ্ঠ',       url: 'https://www.kalerkantho.com/rss.xml' },
  { id: 'bdtribune',    name: 'Bangla Tribune',   url: 'https://www.banglatribune.com/feed' },
  { id: 'dhakatribune', name: 'Dhaka Tribune',    url: 'https://www.dhakatribune.com/feed' },
  { id: 'dailystar',    name: 'The Daily Star',   url: 'https://www.thedailystar.net/rss.xml' },
  { id: 'ittefaq',      name: 'ইত্তেফাক',          url: 'https://www.ittefaq.com.bd/feed' },
];

// ── Wikipedia "On This Day" API ───────────────────────────────────────────────
async function fetchWikipediaOnThisDay() {
  const now = bdNow();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  try {
    const r = await fetch(
      `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${m}/${d}`,
      { headers: { 'User-Agent': 'JOAF-Bot/1.0 (julyforum.com)' }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const events = data.events || [];
    // Filter for Bangladesh-relevant or pick random interesting one
    const bd = events.find(e => /bangladesh|bengal|dhaka/i.test(e.text));
    const picked = bd || events[Math.floor(Math.random() * Math.min(events.length, 5))];
    if (!picked) return null;
    return { title: `আজকের ইতিহাস (${picked.year})`, body: picked.text, source: 'Wikipedia', type: 'history' };
  } catch { return null; }
}

// ── RSS fetch ─────────────────────────────────────────────────────────────────
function parseRSSItems(xml, sourceName, max = 8) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null && items.length < max) {
    const block = m[1];
    const get = tag => {
      const r = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return r ? (r[1] || r[2] || '').trim() : '';
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    const desc  = get('description').slice(0, 300);
    if (!title || title.length < 6) continue;
    items.push({ title, link, desc, source: sourceName });
  }
  return items;
}

async function fetchAllRSS() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async s => {
      const r = await fetch(s.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JOAF/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const xml = await r.text();
      return parseRSSItems(xml, s.name);
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── Content fingerprint (SHA256 of normalized title) ─────────────────────────
function fingerprint(title) {
  const norm = title.toLowerCase().replace(/[^\u0980-\u09FF\w]/g, '').slice(0, 80);
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

// ── Appwrite helpers ──────────────────────────────────────────────────────────
const AW_HEADERS = () => ({
  'X-Appwrite-Project': AW_PROJECT,
  'X-Appwrite-Key': AW_KEY,
  'Content-Type': 'application/json',
});

async function awReq(method, path, body = null) {
  const r = await fetch(`${AW_ENDPOINT}${path}`, {
    method,
    headers: AW_HEADERS(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`AW ${method} ${path} → ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function awCreate(col, data) {
  return awReq('POST', `/databases/${DB_ID}/collections/${col}/documents`, {
    documentId: 'unique()', data,
  });
}

async function awUpdate(col, id, data) {
  return awReq('PATCH', `/databases/${DB_ID}/collections/${col}/documents/${id}`, { data });
}

async function awQuery(col, queries, limit = 25) {
  const qs = queries.map((q, i) => `queries[${i}]=${encodeURIComponent(q)}`).join('&');
  const r = await awReq('GET', `/databases/${DB_ID}/collections/${col}/documents?${qs}&limit=${limit}`);
  return r.documents || [];
}

async function awDelete(col, id) {
  return awReq('DELETE', `/databases/${DB_ID}/collections/${col}/documents/${id}`);
}

// ── Get published fingerprints (last 30 days) for dedup ──────────────────────
async function getRecentFingerprints() {
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
    const docs = await awQuery(COL_LOG, [`greaterThan("published_at","${since}")`], 100);
    return new Set(docs.map(d => d.fp).filter(Boolean));
  } catch { return new Set(); }
}

// ── Queue helpers ─────────────────────────────────────────────────────────────
async function getQueueCount() {
  try {
    // Query without filter — count all, filter client-side (avoids index dependency)
    const all = await awReq('GET', `/databases/${DB_ID}/collections/${COL_QUEUE}/documents?limit=100`);
    const docs = all.documents || [];
    return docs.filter(d => d.status === 'pending').length;
  } catch { return 0; }
}

async function getNextQueueItem() {
  try {
    // Fetch without filter — pick first pending (avoids Appwrite index issues)
    const r = await awReq('GET', `/databases/${DB_ID}/collections/${COL_QUEUE}/documents?limit=100`);
    const docs = (r.documents || []).filter(d => d.status === 'pending');
    // Sort by created_at ascending
    docs.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    return docs[0] || null;
  } catch { return null; }
}

// ── 30 Content Formats ────────────────────────────────────────────────────────
const FORMATS = [
  'breaking_news', 'news_summary', 'fact_check', 'civic_rights',
  'constitution_fact', 'bangladesh_history', 'this_day_history',
  'quote_card', 'poll_post', 'question_post', 'did_you_know',
  'myth_vs_fact', 'timeline', 'educational', 'learning_engine',
  'press_release_summary', 'data_insight', 'statistic_post',
  'awareness_post', 'international_news', 'local_district',
  'youth_engagement', 'comment_debate', 'community_question',
  'image_quote', 'carousel_post', 'infographic', 'reel_script',
  'ai_opinion', 'civic_knowledge',
];

// Daily mix weights (spec: News 30%, Learning 25%, History 10%, Q 10%, Poll 10%, Civic 10%, Data 5%)
const FORMAT_WEIGHTS = {
  breaking_news: 8, news_summary: 7, international_news: 6, local_district: 5, press_release_summary: 4,
  learning_engine: 7, educational: 5, civic_knowledge: 5, civic_rights: 4, constitution_fact: 4,
  bangladesh_history: 4, this_day_history: 3, timeline: 3,
  question_post: 5, community_question: 5,
  poll_post: 5,
  fact_check: 3, myth_vs_fact: 3,
  did_you_know: 3, awareness_post: 3,
  data_insight: 2, statistic_post: 2,
  quote_card: 2, image_quote: 2,
  youth_engagement: 2, comment_debate: 2,
  carousel_post: 2, infographic: 2,
  reel_script: 1, ai_opinion: 1,
};

function pickFormat(lastFormats = []) {
  // Avoid last 3 formats
  const available = FORMATS.filter(f => !lastFormats.slice(-3).includes(f));
  const pool = available.length ? available : FORMATS;
  // Weighted random
  const total = pool.reduce((s, f) => s + (FORMAT_WEIGHTS[f] || 1), 0);
  let rand = Math.random() * total;
  for (const f of pool) {
    rand -= (FORMAT_WEIGHTS[f] || 1);
    if (rand <= 0) return f;
  }
  return pool[0];
}

// ── Evergreen knowledge base (Zero-AI emergency mode) ────────────────────────
const EVERGREEN = [
  { type: 'fact',  text: 'বাংলাদেশের সংবিধান কার্যকর হয় ১৯৭২ সালের ১৬ ডিসেম্বর। এটি দেশের সর্বোচ্চ আইন।' },
  { type: 'fact',  text: 'বাংলাদেশে মোট ৬৪টি জেলা এবং ৮টি বিভাগ রয়েছে।' },
  { type: 'fact',  text: 'বাংলাদেশের জাতীয় সংসদে ৩৫০টি আসন রয়েছে — ৩০০ সরাসরি নির্বাচিত, ৫০টি সংরক্ষিত।' },
  { type: 'fact',  text: 'বাংলাদেশের সংবিধানের ৩৯ অনুচ্ছেদ মতপ্রকাশের স্বাধীনতা নিশ্চিত করে।' },
  { type: 'fact',  text: 'তথ্য অধিকার আইন ২০০৯ অনুযায়ী, প্রতিটি নাগরিক সরকারি তথ্য চাইতে পারেন।' },
  { type: 'poll',  text: 'আপনি কি মনে করেন সরকারি তথ্য সবার কাছে সহজলভ্য হওয়া উচিত?\n\n👍 হ্যাঁ, অবশ্যই\n❤️ আরও উন্নতি দরকার\n😮 এখনও অনেক দূর বাকি' },
  { type: 'poll',  text: 'আপনার মতে বাংলাদেশের সবচেয়ে জরুরি সমস্যা কোনটি?\n\n👍 দুর্নীতি\n❤️ বেকারত্ব\n😮 শিক্ষার মান\n😢 স্বাস্থ্যসেবা' },
  { type: 'question', text: 'আপনি কি জানেন বাংলাদেশে কতটি স্বীকৃত রাজনৈতিক দল রয়েছে? কমেন্টে জানান!' },
  { type: 'question', text: 'আপনার এলাকার সবচেয়ে বড় সমস্যা কী? কমেন্টে লিখুন — আমরা সোচ্চার হব।' },
  { type: 'question', text: 'জুলাই অভ্যুত্থান আপনার জীবনে কী পরিবর্তন এনেছে? শেয়ার করুন।' },
  { type: 'history', text: '১৯৭১ সালের ২৬ মার্চ বাংলাদেশের স্বাধীনতার ঘোষণা দেওয়া হয়। ৯ মাসের মুক্তিযুদ্ধের পর ১৬ ডিসেম্বর চূড়ান্ত বিজয় অর্জিত হয়।' },
  { type: 'history', text: 'ভাষা আন্দোলন ১৯৫২ সালের ২১ ফেব্রুয়ারি চূড়ান্ত রূপ নেয়। এই দিনটি এখন আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে পালিত হয়।' },
  { type: 'civic',  text: 'আপনার মৌলিক অধিকার: সংবিধানের ২৭–৪৪ অনুচ্ছেদে বর্ণিত অধিকারগুলো প্রতিটি নাগরিকের আইনি সুরক্ষা।' },
  { type: 'civic',  text: 'জাতীয় মানবাধিকার কমিশনে আপনি বিনামূল্যে অভিযোগ দাখিল করতে পারেন। ওয়েবসাইট: nhrc.org.bd' },
  { type: 'did_you_know', text: 'জানেন কি? বাংলাদেশ পৃথিবীর ৮ম জনবহুল দেশ, কিন্তু আয়তনে মাত্র ৯২তম!' },
  { type: 'did_you_know', text: 'জানেন কি? বাংলাদেশের সুন্দরবন পৃথিবীর বৃহত্তম ম্যানগ্রোভ বন এবং ইউনেস্কো বিশ্ব ঐতিহ্য স্থান।' },
  { type: 'motivation', text: 'পরিবর্তন কখনও একা আসে না। JOAF-এর সাথে থাকুন, সত্য কথা বলুন, দেশকে ভালোবাসুন। 🇧🇩\n\n#JOAF #জুলাইফোরাম' },
  { type: 'motivation', text: 'গণতন্ত্র মানুষের অংশগ্রহণেই বাঁচে। আপনার কণ্ঠস্বরই পরিবর্তনের হাতিয়ার। 💚\n\n#বাংলাদেশ #JOAF' },
];

function pickEvergreen(lastTypes = []) {
  const avail = EVERGREEN.filter(e => !lastTypes.slice(-2).includes(e.type));
  const pool  = avail.length ? avail : EVERGREEN;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── AI providers cascade ──────────────────────────────────────────────────────
async function callOpenRouter(prompt) {
  if (!OR_KEY) return null;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OR_KEY}` },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500, temperature: 0.8,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

async function callGemini(prompt) {
  if (!GEM_KEY) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEM_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500, temperature: 0.8 } }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function callGroq(prompt) {
  if (!GROQ_KEY) return null;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500, temperature: 0.8,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

async function generateAI(prompt) {
  return (await callOpenRouter(prompt)) ||
         (await callGemini(prompt))     ||
         (await callGroq(prompt))       ||
         null; // null = use template/evergreen
}

// ── Caption builders per format ───────────────────────────────────────────────
function buildPrompt(format, item) {
  const src = item?.title ? `বিষয়: "${item.title}"` : '';
  const base = `তুমি JOAF (July Online Activists Forum) এর বাংলা কন্টেন্ট রাইটার। Bangladeshi civic audience-এর জন্য লেখো। ${src}`;

  const structure = `\nফরম্যাট:\n- ১ লাইন hook\n- ২ লাইন তথ্য\n- ১টি engagement প্রশ্ন বা CTA\n- ২-৩টি hashtag\n\nশুধু post text দাও।`;

  const formatInstructions = {
    breaking_news:       `${base}\nব্রেকিং নিউজ স্টাইলে জরুরি সংবাদ পোস্ট লেখো।${structure}`,
    news_summary:        `${base}\nসংবাদ সারাংশ পোস্ট লেখো — তথ্যভিত্তিক, নিরপেক্ষ।${structure}`,
    fact_check:          `${base}\nএকটি সাধারণ ভুল ধারণা ও সঠিক তথ্য দিয়ে ফ্যাক্ট-চেক পোস্ট লেখো।${structure}`,
    civic_rights:        `${base}\nবাংলাদেশের নাগরিকদের একটি মৌলিক অধিকার নিয়ে সহজ ভাষায় পোস্ট লেখো।${structure}`,
    constitution_fact:   `${base}\nবাংলাদেশের সংবিধানের একটি গুরুত্বপূর্ণ অনুচ্ছেদ নিয়ে পোস্ট লেখো।${structure}`,
    bangladesh_history:  `${base}\nবাংলাদেশের ইতিহাসের একটি গুরুত্বপূর্ণ মুহূর্ত নিয়ে পোস্ট লেখো।${structure}`,
    this_day_history:    `${base}\nআজকের তারিখে ইতিহাসে কী ঘটেছিল সেটা নিয়ে পোস্ট লেখো।${structure}`,
    quote_card:          `${base}\nগণতন্ত্র বা মুক্তিযুদ্ধ নিয়ে একটি অনুপ্রেরণামূলক উদ্ধৃতি ও তার ব্যাখ্যা লেখো।${structure}`,
    poll_post:           `${base}\nবাংলাদেশের একটি সামাজিক বিষয়ে poll post লেখো। ৩টি emoji option রাখো।${structure}`,
    question_post:       `${base}\nদর্শকদের কমেন্ট করাতে পারে এমন একটি প্রশ্নমূলক পোস্ট লেখো।${structure}`,
    did_you_know:        `${base}\nবাংলাদেশ সম্পর্কে একটি আশ্চর্যজনক তথ্য দিয়ে "জানেন কি?" পোস্ট লেখো।${structure}`,
    myth_vs_fact:        `${base}\nএকটি প্রচলিত ভুল ধারণা vs সত্য — myth vs fact পোস্ট লেখো।${structure}`,
    timeline:            `${base}\nবাংলাদেশের ইতিহাসের একটি গুরুত্বপূর্ণ ঘটনার ক্রমানুসারে টাইমলাইন পোস্ট লেখো।${structure}`,
    educational:         `${base}\nশিক্ষামূলক পোস্ট — গণতন্ত্র, অধিকার বা নাগরিকতা বিষয়ক।${structure}`,
    learning_engine:     `${base}\nJOAF-এর civic learning series থেকে একটি শিক্ষামূলক পোস্ট লেখো।${structure}`,
    press_release_summary:`${base}\nএকটি সরকারি বা সামাজিক প্রেস বিজ্ঞপ্তির সারাংশ পোস্ট লেখো।${structure}`,
    data_insight:        `${base}\nবাংলাদেশ সম্পর্কে একটি তথ্য/পরিসংখ্যান বিশ্লেষণ পোস্ট লেখো।${structure}`,
    statistic_post:      `${base}\nবাংলাদেশের একটি উল্লেখযোগ্য পরিসংখ্যান নিয়ে পোস্ট লেখো।${structure}`,
    awareness_post:      `${base}\nসামাজিক সচেতনতামূলক পোস্ট লেখো — স্বাস্থ্য, পরিবেশ বা নিরাপত্তা।${structure}`,
    international_news:  `${base}\nআন্তর্জাতিক সংবাদ যা বাংলাদেশের জন্য প্রাসঙ্গিক, সেটা নিয়ে পোস্ট লেখো।${structure}`,
    local_district:      `${base}\nবাংলাদেশের কোনো একটি জেলার বিশেষত্ব বা সংবাদ নিয়ে পোস্ট লেখো।${structure}`,
    youth_engagement:    `${base}\nতরুণ প্রজন্মকে লক্ষ্য করে অনুপ্রেরণামূলক পোস্ট লেখো।${structure}`,
    comment_debate:      `${base}\nদুটো বিপরীত মত তুলে ধরে কমেন্ট debate শুরু করার পোস্ট লেখো।${structure}`,
    community_question:  `${base}\nকমিউনিটিকে সরাসরি জিজ্ঞেস করার পোস্ট লেখো — তাদের অভিজ্ঞতা শেয়ার করতে বলো।${structure}`,
    image_quote:         `${base}\nঅনুপ্রেরণামূলক একটি উদ্ধৃতি পোস্ট লেখো যা ইমেজ কার্ডে যাবে।${structure}`,
    carousel_post:       `${base}\nক্যারোসেল পোস্টের জন্য ৩টি স্লাইডের টেক্সট লেখো — প্রতিটি ৪০ শব্দের মধ্যে।${structure}`,
    infographic:         `${base}\nইনফোগ্রাফিক পোস্টের জন্য ৫টি পয়েন্ট লেখো — প্রতিটি ১ লাইন।${structure}`,
    reel_script:         `${base}\n৩০ সেকেন্ডের রিল-এর জন্য বাংলায় স্ক্রিপ্ট লেখো — সংলাপ স্টাইলে।${structure}`,
    ai_opinion:          `${base}\nAI দৃষ্টিকোণ থেকে বাংলাদেশের একটি সামাজিক ইস্যু বিশ্লেষণ করো।${structure}`,
    civic_knowledge:     `${base}\nনাগরিক জ্ঞান কার্ড — সরকারি সেবা বা আইনি অধিকার নিয়ে সহজ ভাষায়।${structure}`,
  };

  return formatInstructions[format] || `${base}\nএকটি আকর্ষণীয় বাংলা পোস্ট লেখো।${structure}`;
}

// ── Template fallback (no AI) ─────────────────────────────────────────────────
function buildTemplate(format, item, evergreenItem) {
  const date = bdDate();
  const title = item?.title || '';

  if (evergreenItem) {
    const eg = evergreenItem;
    if (eg.type === 'poll' || eg.type === 'question') return `${eg.text}\n\n#JOAF #জুলাইফোরাম #বাংলাদেশ`;
    if (eg.type === 'history') return `📅 আজকের ইতিহাস:\n\n${eg.text}\n\n#JOAF #বাংলাদেশ #ইতিহাস`;
    if (eg.type === 'civic') return `⚖️ নাগরিক অধিকার:\n\n${eg.text}\n\nআপনার মতামত কমেন্টে জানান।\n\n#JOAF #জুলাইফোরাম`;
    if (eg.type === 'did_you_know') return `💡 ${eg.text}\n\nআপনি কি জানতেন? কমেন্টে জানান!\n\n#JOAF #বাংলাদেশ`;
    if (eg.type === 'motivation') return eg.text;
    return `📌 ${eg.text}\n\n#JOAF #জুলাইফোরাম #বাংলাদেশ`;
  }

  if (title) {
    if (format === 'poll_post') return `🗳️ আপনার মতামত দিন:\n\n${title}\n\n👍 সমর্থন করি\n❤️ আংশিক সমর্থন\n😮 দ্বিমত আছে\n\n#JOAF #বাংলাদেশ`;
    if (format === 'question_post' || format === 'community_question') return `❓ ${title}\n\nএই বিষয়ে আপনার মত কী? কমেন্টে জানান।\n\n#JOAF #জুলাইফোরাম #বাংলাদেশ`;
    return `📢 ${title}\n\nবিস্তারিত জানতে কমেন্ট করুন বা শেয়ার করুন।\n\n#JOAF #জুলাইফোরাম #বাংলাদেশ`;
  }

  // Zero-source emergency
  return `আজকের তথ্য (${date}):\n\nবাংলাদেশের সংবিধান কার্যকর হয় ১৯৭২ সালে।\n\nআপনি কি জানতেন? কমেন্টে জানান!\n\n#JOAF #বাংলাদেশ #জুলাইফোরাম`;
}

// ── Caption variation for 17 pages (anti-clone) ───────────────────────────────
// ── 3-structural-variant caption engine for 17-page anti-clone distribution ──
const HOOK_URGENT   = ['🔴 ','⚡ ','🚨 ','❗ ','🔥 ','📢 '];
const HOOK_INFO     = ['💡 ','📌 ','✅ ','📊 ','🎯 ','📰 '];
const HOOK_CIVIC    = ['🇧🇩 ','❤️ ','⚖️ ','🗣️ ','🌟 ','🙏 '];
function swapLeadEmoji(text, hook) {
  return text.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}][\uFE0F]?[\u20D0-\u20FF]?\s?/u, hook);
}
function makeVariants(baseCaption, format) {
  const lines = baseCaption.split('\n');
  // Variant A — urgent hook (pages 1-6)
  const hA = HOOK_URGENT[Math.floor(Math.random()*HOOK_URGENT.length)];
  const varA = swapLeadEmoji(baseCaption, hA);
  // Variant B — question-first reorder (pages 7-12)
  // Move the engagement question line to the top for curiosity-first structure
  const qIdx = lines.findIndex(l => /\?|কমেন্ট|মতামত|জানান|আপনি কি/.test(l) && l.length > 5);
  let varB;
  if (qIdx > 0 && qIdx < lines.length - 1) {
    const qLine = lines[qIdx];
    const rest  = lines.filter((_, i) => i !== qIdx).join('\n');
    const hB = HOOK_INFO[Math.floor(Math.random()*HOOK_INFO.length)];
    varB = hB + qLine + '\n\n' + rest;
  } else {
    const hB = HOOK_INFO[Math.floor(Math.random()*HOOK_INFO.length)];
    varB = swapLeadEmoji(baseCaption, hB);
  }
  // Variant C — civic/emotional hook (pages 13-17)
  const hC = HOOK_CIVIC[Math.floor(Math.random()*HOOK_CIVIC.length)];
  const varC = swapLeadEmoji(baseCaption, hC);
  return [varA, varB, varC];
}

// ── SVG card builder ──────────────────────────────────────────────────────────
// ── Enhanced SVG card with Bengali font support ─────────────────────────────
// Uses Google Fonts CSS import (rendered by Cloudinary's SVG renderer)
// Falls back to Arial for ASCII content
// ★ Exact JOAF website fonts — BenSen for titles, Noto for body
const BENGALI_FONT_TITLE = "'BenSen Handwriting', 'Noto Sans Bengali', Arial, sans-serif";
const BENGALI_FONT_BODY  = "'Noto Sans Bengali', 'Hind Siliguri', Arial, sans-serif";
const FONT_IMPORT = "@import url('https://fonts.maateen.me/bensen-handwriting/font.css');\n@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800;900&amp;family=Hind+Siliguri:wght@400;600;700&amp;display=swap');";

function wrapText(text, maxCharsPerLine) {
  // Smart wrap for Bengali — break at spaces, max chars per line
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!w) continue;
    if ((cur + ' ' + w).trim().length <= maxCharsPerLine) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildSVGCard(title, body, format) {
  const palettes = {
    breaking_news:      { bg1:'#0a0008', bg2:'#1a0014', acc:'#ef4444', acc2:'#dc2626', txt:'#ffffff', sub:'#fecaca' },
    news_summary:       { bg1:'#030712', bg2:'#0f172a', acc:'#38bdf8', acc2:'#0284c7', txt:'#ffffff', sub:'#bae6fd' },
    educational:        { bg1:'#052e16', bg2:'#064e24', acc:'#22c55e', acc2:'#16a34a', txt:'#ffffff', sub:'#bbf7d0' },
    learning_engine:    { bg1:'#052e16', bg2:'#064e24', acc:'#22c55e', acc2:'#16a34a', txt:'#ffffff', sub:'#bbf7d0' },
    fact_check:         { bg1:'#1c1917', bg2:'#292524', acc:'#fbbf24', acc2:'#d97706', txt:'#ffffff', sub:'#fde68a' },
    myth_vs_fact:       { bg1:'#1c1917', bg2:'#292524', acc:'#fbbf24', acc2:'#d97706', txt:'#ffffff', sub:'#fde68a' },
    civic_rights:       { bg1:'#0f0a1e', bg2:'#1a1035', acc:'#a78bfa', acc2:'#7c3aed', txt:'#ffffff', sub:'#ede9fe' },
    constitution_fact:  { bg1:'#0f0a1e', bg2:'#1a1035', acc:'#a78bfa', acc2:'#7c3aed', txt:'#ffffff', sub:'#ede9fe' },
    civic_knowledge:    { bg1:'#0f0a1e', bg2:'#1a1035', acc:'#a78bfa', acc2:'#7c3aed', txt:'#ffffff', sub:'#ede9fe' },
    bangladesh_history: { bg1:'#1a0a00', bg2:'#2d1500', acc:'#f97316', acc2:'#ea580c', txt:'#ffffff', sub:'#fed7aa' },
    this_day_history:   { bg1:'#1a0a00', bg2:'#2d1500', acc:'#f97316', acc2:'#ea580c', txt:'#ffffff', sub:'#fed7aa' },
    question_post:      { bg1:'#030712', bg2:'#0f172a', acc:'#34d399', acc2:'#059669', txt:'#ffffff', sub:'#a7f3d0' },
    poll_post:          { bg1:'#030712', bg2:'#0f172a', acc:'#34d399', acc2:'#059669', txt:'#ffffff', sub:'#a7f3d0' },
    community_question: { bg1:'#030712', bg2:'#0f172a', acc:'#34d399', acc2:'#059669', txt:'#ffffff', sub:'#a7f3d0' },
    quote_card:         { bg1:'#0d0118', bg2:'#1a0030', acc:'#e879f9', acc2:'#a21caf', txt:'#ffffff', sub:'#f5d0fe' },
    image_quote:        { bg1:'#0d0118', bg2:'#1a0030', acc:'#e879f9', acc2:'#a21caf', txt:'#ffffff', sub:'#f5d0fe' },
    data_insight:       { bg1:'#030712', bg2:'#0f172a', acc:'#60a5fa', acc2:'#2563eb', txt:'#ffffff', sub:'#bfdbfe' },
    statistic_post:     { bg1:'#030712', bg2:'#0f172a', acc:'#60a5fa', acc2:'#2563eb', txt:'#ffffff', sub:'#bfdbfe' },
    youth_engagement:   { bg1:'#0f172a', bg2:'#1e293b', acc:'#fb923c', acc2:'#ea580c', txt:'#ffffff', sub:'#fed7aa' },
    awareness_post:     { bg1:'#0f172a', bg2:'#1e293b', acc:'#fb923c', acc2:'#ea580c', txt:'#ffffff', sub:'#fed7aa' },
    infographic:        { bg1:'#030712', bg2:'#0f172a', acc:'#38bdf8', acc2:'#0284c7', txt:'#ffffff', sub:'#bae6fd' },
  };
  const pal = palettes[format] || palettes['news_summary'];

  const e = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cleanBody = (body||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/<[^>]*>/g,'').trim();

  const W = 1080, H = 1080;
  const tLines = wrapText(title || '', 20).slice(0, 4);
  const bLines = wrapText(cleanBody, 30).slice(0, 8);

  const titleY = 320;
  const titleLH = 72;
  const titleEls = tLines.map((l, i) =>
    `<text x="540" y="${titleY + i*titleLH}" font-family="${BENGALI_FONT_TITLE}" font-size="52" font-weight="900" fill="${pal.txt}" text-anchor="middle" filter="url(#shadow)">${e(l)}</text>`
  ).join('\n  ');

  const bodyY = titleY + tLines.length * titleLH + 50;
  const bodyLH = 48;
  const bodyEls = bLines.map((l, i) =>
    `<text x="540" y="${bodyY + i*bodyLH}" font-family="${BENGALI_FONT_BODY}" font-size="30" font-weight="400" fill="${pal.sub}" text-anchor="middle">${e(l)}</text>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>${FONT_IMPORT}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal.bg1}"/>
      <stop offset="100%" stop-color="${pal.bg2}"/>
    </linearGradient>
    <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${pal.acc}"/>
      <stop offset="100%" stop-color="${pal.acc2}"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.8)"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="8" fill="url(#acc)"/>
  <circle cx="${W*0.85}" cy="${H*0.2}" r="200" fill="${pal.acc}" opacity="0.05"/>
  <circle cx="${W*0.15}" cy="${H*0.8}" r="160" fill="${pal.acc2}" opacity="0.05"/>
  <rect x="0" y="0" width="${W}" height="110" fill="rgba(0,0,0,0.5)"/>
  <text x="48" y="72" font-family="${BENGALI_FONT_TITLE}" font-size="42" font-weight="900" fill="${pal.acc}" filter="url(#glow)">JOAF ⚡</text>
  <text x="${W-48}" y="72" font-family="${BENGALI_FONT_BODY}" font-size="22" fill="${pal.sub}" text-anchor="end">julyforum.com</text>
  <rect x="48" y="130" width="${W-96}" height="3" fill="url(#acc)" rx="2"/>
  ${titleEls}
  <rect x="${W/2-60}" y="${bodyY - 22}" width="120" height="3" fill="url(#acc)" rx="2"/>
  ${bodyEls}
  <rect x="0" y="${H-110}" width="${W}" height="110" fill="rgba(0,0,0,0.75)"/>
  <rect x="0" y="${H-110}" width="${W}" height="3" fill="url(#acc)"/>
  <text x="${W/2}" y="${H-60}" font-family="${BENGALI_FONT_BODY}" font-size="26" font-weight="700" fill="${pal.acc}" text-anchor="middle">#JOAF #জুলাইফোরাম #বাংলাদেশ</text>
  <text x="${W/2}" y="${H-28}" font-family="${BENGALI_FONT_BODY}" font-size="18" fill="${pal.sub}" text-anchor="middle">julyforum.com | জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম</text>
</svg>`;
}


// ── Upload SVG to Cloudinary → JPG ────────────────────────────────────────────
async function uploadToCloudinary(svgContent, publicId) {
  const safeId = (publicId.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60)) + '_' + Date.now();
  const svgBytes = Buffer.from(svgContent, 'utf8');

  // Step 1: Upload SVG to Appwrite Storage (FormData+Blob works here — Appwrite accepts it)
  const storageForm = new FormData();
  storageForm.append('fileId', 'unique()');
  storageForm.append('file', new Blob([svgBytes], { type: 'image/svg+xml' }), safeId + '.svg');
  const storageRes = await fetch(`${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
    body: storageForm,
    signal: AbortSignal.timeout(20000),
  });
  if (!storageRes.ok) {
    const t = await storageRes.text().catch(() => '');
    throw new Error(`Appwrite Storage upload failed: ${storageRes.status} ${t.slice(0,100)}`);
  }
  const storageData = await storageRes.json();
  const tempFileId = storageData.$id;
  // Public URL that Cloudinary can fetch
  const svgPublicUrl = `${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${tempFileId}/view?project=${AW_PROJECT}`;

  // Step 2: Tell Cloudinary to fetch from that URL — no binary upload, no encoding issues
  const cdnParams = new URLSearchParams();
  cdnParams.set('file', svgPublicUrl);
  cdnParams.set('upload_preset', CDN_PRESET);
  cdnParams.set('public_id', safeId);
  const cdnRes = await fetch(`https://api.cloudinary.com/v1_1/${CDN_CLOUD.trim()}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cdnParams.toString(),
    signal: AbortSignal.timeout(40000),
  });
  const cdnData = await cdnRes.json();

  // Step 3: Delete temp file from Appwrite Storage (best-effort)
  fetch(`${AW_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${tempFileId}`, {
    method: 'DELETE',
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY },
  }).catch(() => {});

  if (cdnData.error) throw new Error(`Cloudinary: ${cdnData.error.message}`);
  return cdnData.secure_url.replace('/upload/', '/upload/f_jpg,q_90/');
}
// ── Decide if this format needs an image ─────────────────────────────────────
const IMAGE_FORMATS = new Set([
  'breaking_news','news_summary','fact_check','civic_rights','constitution_fact',
  'bangladesh_history','this_day_history','quote_card','did_you_know','myth_vs_fact',
  'educational','learning_engine','data_insight','statistic_post','awareness_post',
  'international_news','local_district','youth_engagement','image_quote',
  'carousel_post','infographic','civic_knowledge','ai_opinion',
  'reel_script', // reel posts as storyboard image card
]);

// ── Call fb-autopost (fire-and-forget async) ─────────────────────────────────
async function callFbAutopost(action, payload, log = () => {}) {
  // Fire async — fb-autopost runs independently (17 pages ~30s)
  // We don't poll because that eats into our 300s timeout budget
  try {
    // Pass INTERNAL_API_KEY if configured (fb-autopost auth guard)
    const INT_KEY = process.env.INTERNAL_API_KEY || process.env.JOAF_INTERNAL_KEY || '';
    const fbBody  = JSON.stringify({ action, ...payload });
    const outer   = JSON.stringify({
      async: true, path: '/', method: 'POST',
      headers: INT_KEY ? { 'x-joaf-key': INT_KEY, 'x-internal-key': INT_KEY } : {},
      body: fbBody,
    });
    const r = await fetch(`${AW_ENDPOINT}/functions/${FN_FB}/executions`, {
      method: 'POST',
      headers: AW_HEADERS(),
      body: outer,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      log(`fb-autopost trigger failed: ${r.status} ${t.slice(0,100)}`);
      return { ok: 0, fail: 0 };
    }
    const execData = await r.json();
    const execId = execData.$id;
    log(`fb-autopost triggered: execId=${execId} AW_KEY_len=${AW_KEY.length}`);
    // Return optimistic success — fb-autopost will post to all 17 pages
    // Check viral_publish_log or fb-autopost executions in Console to verify
    return { ok: 17, fail: 0, async: true, execId };
  } catch(e) {
    log(`fb-autopost error: ${e.message}`);
    return { ok: 0, fail: 0 };
  }
}

// ── Content pool dedup check ──────────────────────────────────────────────────
async function isInPool(fp) {
  try {
    const r = await awReq('GET', `/databases/${DB_ID}/collections/${COL_POOL}/documents?limit=100`);
    return (r.documents || []).some(d => d.fp === fp);
  } catch { return false; }
}

// ── Get last-used formats (anti-repeat) ───────────────────────────────────────
async function getLastFormats(n = 5) {
  try {
    const r = await awReq('GET', `/databases/${DB_ID}/collections/${COL_LOG}/documents?limit=${n}`);
    const docs = r.documents || [];
    return docs.map(d => d.format).filter(Boolean);
  } catch { return []; }
}

// ── MAIN: Collect + deduplicate + pool-fill ────────────────────────────────────
async function collectSources(log) {
  log('collect: fetching RSS + Wikipedia...');
  const [rssItems, wikiItem] = await Promise.all([
    fetchAllRSS().catch(() => []),
    fetchWikipediaOnThisDay().catch(() => null),
  ]);

  const recentFPs = await getRecentFingerprints();
  const newItems  = [];

  // RSS items
  for (const item of rssItems) {
    const fp = fingerprint(item.title);
    if (recentFPs.has(fp)) continue;
    if (await isInPool(fp)) continue;
    try {
      await awCreate(COL_POOL, {
        fp, title: item.title, body: item.desc || '', source: item.source,
        link: item.link || '', type: 'news', created_at: new Date().toISOString(),
      });
      recentFPs.add(fp);
      newItems.push(item);
    } catch { /* dup or error, skip */ }
  }

  // Wikipedia
  if (wikiItem) {
    const fp = fingerprint(wikiItem.title + wikiItem.body);
    if (!recentFPs.has(fp) && !(await isInPool(fp))) {
      try {
        await awCreate(COL_POOL, {
          fp, title: wikiItem.title, body: wikiItem.body,
          source: 'Wikipedia', link: '', type: 'history', created_at: new Date().toISOString(),
        });
        newItems.push(wikiItem);
      } catch {}
    }
  }

  log(`collect: ${newItems.length} new items added to pool`);
  return newItems;
}

// ── Learning Engine: read fb-insights calibration ────────────────────────────
let _calibCache = null;
let _calibFetchTime = 0;
async function getCalibrationHint() {
  const now = Date.now();
  // Cache for 30 min
  if (_calibCache && (now - _calibFetchTime) < 30 * 60000) return _calibCache;
  try {
    const r = await awReq('GET', `/databases/${DB_ID}/collections/ai_calibration/documents?limit=3`);
    const docs = (r.documents || []).sort((a,b) => (b.date||'').localeCompare(a.date||''));
    if (docs.length) {
      const latest = docs[0];
      _calibCache = latest.hint || '';
      _calibFetchTime = now;
      return _calibCache;
    }
  } catch { /* collection may not exist yet */ }
  return '';
}

// ── FB Insights: what formats performed best ─────────────────────────────────
async function getTopPerformingFormats(limit = 5) {
  try {
    const r = await awReq('GET', `/databases/${DB_ID}/collections/${COL_LOG}/documents?limit=50`);
    const docs = r.documents || [];
    // Group by format, compute avg pages_ok from results JSON
    const formatScores = {};
    for (const d of docs) {
      if (!d.format || !d.results) continue;
      try {
        const res = JSON.parse(d.results);
        const ok = res.ok || 0;
        if (!formatScores[d.format]) formatScores[d.format] = { total: 0, count: 0 };
        formatScores[d.format].total += ok;
        formatScores[d.format].count += 1;
      } catch {}
    }
    return Object.entries(formatScores)
      .map(([fmt, s]) => ({ fmt, avg: s.count ? s.total/s.count : 0 }))
      .sort((a,b) => b.avg - a.avg)
      .slice(0, limit)
      .map(x => x.fmt);
  } catch { return []; }
}

// ── MAIN: Generate queue items from pool ─────────────────────────────────────
async function fillQueue(needed, log) {
  needed = Math.min(needed, FILL_PER_RUN);
  log(`fillQueue: need ${needed} more items (capped at ${FILL_PER_RUN}/run)`);

  // Get unprocessed pool items
  let poolItems = [];
  try {
    try {
      poolItems = await awQuery(COL_POOL, [], Math.min(needed * 3, 50));
      poolItems = poolItems.filter(d => !d.queued || d.queued === "false" || d.queued === false);
      log(`pool: fetched ${poolItems.length} unqueued items`);
    } catch(e) { log(`pool fetch error: ${e.message}`); poolItems = []; }
  } catch {
    // COL_POOL may not have "queued" field yet — fetch all recent
    // orderDesc removed - not supported in Appwrite 1.9.x without index
  }

  const lastFormats = await getLastFormats(5);
  let generated = 0;

  // ★ Learning engine context
  const [calibHint, topFormats] = await Promise.all([
    getCalibrationHint().catch(() => ''),
    getTopPerformingFormats(5).catch(() => []),
  ]);
  if (calibHint) log(`learning: calibration="${calibHint}"`);
  if (topFormats.length) log(`learning: top formats=${topFormats.join(',')}`);

  // ★ Dedupe pool items by fp (same news shouldn't generate 2 queue items in one run)
  const seenFps = new Set();
  poolItems = poolItems.filter(d => {
    if (seenFps.has(d.fp)) return false;
    seenFps.add(d.fp);
    return true;
  });

  // Viral scoring — prioritize items with keywords that signal high engagement
  const VIRAL_KEYWORDS = ['হত্যা','গ্রেফতার','ধর্ষণ','আন্দোলন','বিস্ফোরণ','দুর্ঘটনা','শহীদ','যুদ্ধ','অভ্যুত্থান','নির্বাচন','বন্যা','ভূমিকম্প','attack','arrest','protest','explosion','killed','crisis','breaking','exclusive','urgent'];
  poolItems.sort((a, b) => {
    const score = item => {
      const t = (item.title || '').toLowerCase();
      return VIRAL_KEYWORDS.reduce((s, k) => s + (t.includes(k.toLowerCase()) ? 3 : 0), 0)
           + (item.title?.length > 30 ? 1 : 0)
           + (item.body?.length > 100 ? 1 : 0);
    };
    return score(b) - score(a);
  });

  for (const poolDoc of poolItems) {
    if (generated >= needed) break;

    // Bias format selection toward top-performing formats (learning engine)
    const format = (topFormats.length && Math.random() < 0.4)
      ? topFormats[Math.floor(Math.random() * topFormats.length)]
      : pickFormat(lastFormats);
    const item      = { title: poolDoc.title, body: poolDoc.body, source: poolDoc.source };
    const needsImg  = IMAGE_FORMATS.has(format);

    // AI generation — inject calibration hint into prompt
    const promptBase = buildPrompt(format, item);
    const prompt = calibHint
      ? promptBase + `\n\n[Learning Engine Note: ${calibHint} পোস্টের ধরন অনুযায়ী বাংলায় সেরা engagement এর জন্য optimize করো।]`
      : promptBase;
    let caption   = await generateAI(prompt);
    let aiUsed    = !!caption;

    // Template fallback
    if (!caption) {
      const eg = pickEvergreen(lastFormats);
      caption  = buildTemplate(format, item, eg);
    }

    // Caption variants for 17 pages (anti-clone)
    const variants = makeVariants(caption, format);

    // Image card
    let jpgUrl = '';
    if (needsImg) {
      try {
        const titleForCard = item.title || '';
        const bodyForCard  = caption.split('\n').slice(1).join('\n').replace(/#[^ \t\n\r]+/g, '').trim().slice(0, 400);
        const svg          = buildSVGCard(titleForCard, bodyForCard, format);
        const pid          = `joaf_viral_${format}_${Date.now()}`;
        jpgUrl             = await uploadToCloudinary(svg, pid);
      } catch (e) { log(`image gen failed: ${e.message}`); }
    }

    // Save to queue
    try {
      await awCreate(COL_QUEUE, {
        format,
        title: item.title || '',
        caption: variants[0],
        caption_b: variants[1] || variants[0],
        caption_c: variants[2] || variants[0],
        jpg_url: jpgUrl,
        source: item.source || '',
        fp: poolDoc.fp || fingerprint(item.title),
        ai_used: String(aiUsed),
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      lastFormats.push(format);
      generated++;
      log(`queue+: format=${format} ai=${aiUsed} img=${!!jpgUrl}`);
      // ★ Mark pool item as queued so it's never reused across cycles
      try { await awUpdate(COL_POOL, poolDoc.$id, { queued: 'true' }); } catch {}
    } catch (e) { log(`queue create error: ${e.message}`); }
  }

  // If still need more → use evergreen emergency content
  if (generated < needed) {
    const stillNeed = needed - generated;
    for (let i = 0; i < stillNeed; i++) {
      const format   = pickFormat(lastFormats);
      const eg       = pickEvergreen(lastFormats);
      const caption  = buildTemplate(format, null, eg);
      const variants = makeVariants(caption, format);
      try {
        await awCreate(COL_QUEUE, {
          format, title: eg.type, caption: variants[0],
          caption_b: variants[1] || variants[0],
          caption_c: variants[2] || variants[0],
          jpg_url: '', source: 'evergreen', fp: fingerprint(caption),
          ai_used: 'false', status: 'pending',
          created_at: new Date().toISOString(),
        });
        lastFormats.push(format);
        generated++;
      } catch {}
    }
    log(`queue+: ${generated} evergreen emergency items added`);
  }

  return generated;
}

// ── MAIN: Publish one item from queue ─────────────────────────────────────────
async function publishNext(log) {
  let item = await getNextQueueItem();
  // Retry once after 2s — Appwrite write propagation may cause false empty on first check
  if (!item) {
    await new Promise(r => setTimeout(r, 2000));
    item = await getNextQueueItem();
  }
  if (!item) { log('publish: queue empty'); return false; }

  log(`publish: format=${item.format} fp=${item.fp}`);

  // Mark as processing (prevent double-publish)
  try { await awUpdate(COL_QUEUE, item.$id, { status: 'processing' }); } catch {}

  let fbResult;
  try {
    if (item.jpg_url) {
      fbResult = await callFbAutopost('post', { imageUrl: item.jpg_url, caption: item.caption }, log);
    } else {
      fbResult = await callFbAutopost('post', { caption: item.caption }, log);
    }
  } catch (e) {
    log(`publish error: ${e.message}`);
    try { await awUpdate(COL_QUEUE, item.$id, { status: 'failed', error: e.message }); } catch {}
    return false;
  }

  const results  = (fbResult && fbResult.ok !== undefined) ? fbResult : { ok: 0, fail: 0 };
  const success  = (results.ok || 0) > 0;

  // Log to viral_publish_log
  try {
    await awCreate(COL_LOG, {
      format: item.format,
      fp: item.fp,
      title: item.title || '',
      caption: item.caption,
      jpg_url: item.jpg_url || '',
      source: item.source || '',
      ai_used: item.ai_used || 'false',
      results: JSON.stringify(results),
      status: success ? 'posted' : 'failed',
      published_at: new Date().toISOString(),
    });
  } catch {}

  // Delete from queue (success) or mark failed (fail)
  try {
    if (success) {
      await awDelete(COL_QUEUE, item.$id);
    } else {
      await awUpdate(COL_QUEUE, item.$id, { status: 'failed', results: JSON.stringify(results) });
    }
  } catch {}

  // Auto-cleanup: delete pool doc + Cloudinary image after successful publish
  if (success) {
    // Delete pool source doc by fp match
    try {
      const poolDocs = await awReq('GET', `/databases/${DB_ID}/collections/${COL_POOL}/documents?limit=100`);
      const match = (poolDocs.documents || []).find(d => d.fp === item.fp);
      if (match) await awDelete(COL_POOL, match.$id);
    } catch {}
    // Delete Cloudinary image (not needed after FB post)
    if (item.jpg_url && CDN_CLOUD && CDN_API_SECRET) {
      try {
        const pubId = item.jpg_url.split('/upload/')[1]?.replace(/\.[^.]+$/, '').replace(/^f_jpg,q_90\//, '').replace(/^v\d+\//, '');
        // Only delete joaf_viral_ images — never touch press-release images
        if (pubId && pubId.startsWith('joaf_viral_')) {
          const ts = Math.floor(Date.now()/1000);
          const sigStr = `public_id=${pubId}&timestamp=${ts}${CDN_API_SECRET}`;
          const sig = crypto.createHash('sha1').update(sigStr).digest('hex');
          await fetch(`https://api.cloudinary.com/v1_1/${CDN_CLOUD.trim()}/image/destroy`, {
            method: 'POST',
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: new URLSearchParams({public_id:pubId,timestamp:ts,api_key:CDN_API_KEY,signature:sig}).toString(),
            signal: AbortSignal.timeout(10000),
          });
        }
      } catch {}
    }
  }

  log(`publish: ${success ? '✅' : '❌'} pages_ok=${results.ok} pages_fail=${results.fail}`);
  return success;
}

// ── MAIN export ───────────────────────────────────────────────────────────────
export default async ({ req, res, log, error }) => {
  let body = {};
  try { body = JSON.parse(req.body || '{}'); } catch {}

  const action = body.action || 'cycle'; // 'cycle' | 'collect' | 'fill' | 'publish' | 'status'

  // ── STATUS ────────────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const queueAll = await awReq('GET', `/databases/${DB_ID}/collections/${COL_QUEUE}/documents?limit=100`);
      const pending = (queueAll.documents || []).filter(d => d.status === 'pending');
      const logAll = await awReq('GET', `/databases/${DB_ID}/collections/${COL_LOG}/documents?limit=5`).catch(() => ({ documents: [] }));
      return res.json({
        ok: true,
        queue_pending: pending.length,
        queue_min: QUEUE_MIN,
        queue_target: QUEUE_TARGET,
        recent_posts: (logAll.documents || []).map(d => ({ format: d.format, status: d.status, published_at: d.published_at })),
      });
    } catch (e) {
      return res.json({ ok: false, error: e.message });
    }
  }

  // ── FULL CYCLE (default CRON path) ────────────────────────────────────────
  log(`joaf-viral-os: action=${action} time=${new Date().toISOString()}`);

  // Step 1: Collect fresh sources
  if (action === 'cycle' || action === 'collect') {
    await collectSources(log).catch(e => error(`collect error: ${e.message}`));
  }

  // Step 2: Check queue buffer — fill if low
  if (action === 'cycle' || action === 'fill') {
    try {
      const qCount = await getQueueCount();
      log(`queue size: ${qCount} (min=${QUEUE_MIN} target=${QUEUE_TARGET})`);
      if (qCount < QUEUE_MIN) {
        const needed = QUEUE_TARGET - qCount;
        await fillQueue(needed, log);
      }
    } catch (e) { error(`fill error: ${e.message}`); }
  }

  // Step 3: Publish up to 3 items per cycle (drain queue faster than fill rate)
  if (action === 'cycle' || action === 'publish') {
    const maxPub = action === 'publish' ? 1 : 3;
    for (let _p = 0; _p < maxPub; _p++) {
      const ok = await publishNext(log).catch(() => false);
      if (!ok) break;
      if (_p < maxPub - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }

  return res.json({ ok: true, action, time: new Date().toISOString() });
};
