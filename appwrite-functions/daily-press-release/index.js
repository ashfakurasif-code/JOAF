// Appwrite Function: daily-press-release
// Schedule: 17:00 UTC (11pm BD) every day
// Cascade: OpenRouter → Gemini → Groq (same pattern as groq-proxy)

const TIMEOUT_MS = 25000;
function abortSignal(ms) {
  return AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
}

const TODAY_BD = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  return {
    iso: d.toISOString().slice(0, 10),
    bn: d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }),
    slug: `auto-press-release-${d.toISOString().slice(0, 10)}`,
  };
};

const JOAF_SYSTEM = `তুমি JOAF (জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম) এর মুখপাত্র। 
JOAF বাংলাদেশের জুলাই ২০২৪ গণঅভ্যুত্থান থেকে জন্ম নেওয়া একটি নাগরিক আন্দোলন সংগঠন।
JOAF এর দাবি: নেতাদের জবাবদিহিতা, শহিদদের ন্যায়বিচার, গণতান্ত্রিক সংস্কার, দুর্নীতিমুক্ত বাংলাদেশ, সাধারণ মানুষের অধিকার।
তুমি সর্বদা আনুষ্ঠানিক বাংলায় লিখবে। সুর দৃঢ়, নাগরিক, দলনিরপেক্ষ।`;

const PRESS_PROMPT = (date) => `আজ ${date} তারিখে বাংলাদেশের বর্তমান পরিস্থিতি বিশ্লেষণ করে JOAF এর পক্ষে একটি দৈনিক প্রেস ব্রিফিং লেখো।

ফরম্যাট হবে ঠিক এইরকম (JSON হিসেবে রিটার্ন করো, অন্য কিছু না):
{
  "title": "প্রেস ব্রিফিং — [তারিখ]",
  "summary": "এক বাক্যে মূল বার্তা (৩০ শব্দের মধ্যে)",
  "content": "পূর্ণ প্রেস ব্রিফিং HTML (৩-৪ প্যারাগ্রাফ, <p> ট্যাগ ব্যবহার করো, শেষে JOAF এর স্বাক্ষর বাক্য)"
}

content এ অবশ্যই থাকবে:
- বর্তমান পরিস্থিতির বিবরণ (রাজনৈতিক/সামাজিক/অর্থনৈতিক যেকোনো গুরুত্বপূর্ণ বিষয়)
- JOAF এর দাবি ও অবস্থান
- জনগণের প্রতি আহ্বান
- সমাপ্তি বাক্য: "জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম (JOAF)"

শুধু JSON রিটার্ন করো, markdown backtick বা অন্য কিছু না।`;

async function callAI(providers, date) {
  const messages = [
    { role: 'system', content: JOAF_SYSTEM },
    { role: 'user', content: PRESS_PROMPT(date) },
  ];

  for (const { name, fn } of providers) {
    try {
      const text = await fn(messages);
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.title && parsed.summary && parsed.content) {
        console.log(`daily-press-release: ${name} OK`);
        return parsed;
      }
      throw new Error('invalid structure');
    } catch (e) {
      console.log(`daily-press-release: ${name} failed — ${e.message}`);
    }
  }
  throw new Error('All AI providers failed');
}

async function openRouter(key, messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://julyforum.com', 'X-Title': 'JOAF' },
    body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', max_tokens: 1200, temperature: 0.7, messages }),
    signal: abortSignal(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('OR:' + res.status);
  const d = await res.json();
  return d.choices[0].message.content;
}

async function gemini(key, messages) {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const sys = messages.find(m => m.role === 'system');
  if (sys && contents[0]) contents[0].parts.unshift({ text: '[SYSTEM]\n' + sys.content + '\n\n' });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1200, temperature: 0.7 } }),
    signal: abortSignal(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('Gemini:' + res.status);
  const d = await res.json();
  return d.candidates?.flatMap(c => c.content?.parts || []).map(p => p.text || '').join('');
}

async function groq(key, messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1200, temperature: 0.7, messages }),
    signal: abortSignal(TIMEOUT_MS),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d.error || res.status));
  return d.choices[0].message.content;
}

async function saveToAppwrite(doc) {
  const EP = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const PJ = process.env.APPWRITE_PROJECT_ID || '6a11b6cd000b59f318eb';
  const DB = process.env.APPWRITE_DATABASE_ID || 'joaf';
  const KEY = process.env.APPWRITE_API_KEY;

  // Check if today's auto release already exists
  const checkRes = await fetch(
    `${EP}/databases/${DB}/collections/press_releases/documents?queries[]=${encodeURIComponent(`equal("slug","${doc.slug}")`)}`,
    { headers: { 'X-Appwrite-Project': PJ, 'X-Appwrite-Key': KEY, 'Content-Type': 'application/json' } }
  );
  const checkData = await checkRes.json();
  if (checkData.total > 0) {
    console.log('daily-press-release: already exists for today, skipping');
    return { skipped: true };
  }

  const res = await fetch(`${EP}/databases/${DB}/collections/press_releases/documents`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': PJ, 'X-Appwrite-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId: 'unique()',
      data: {
        title: doc.title,
        summary: doc.summary,
        content: doc.content,
        body: doc.content,
        date: doc.date,
        slug: doc.slug,
        img: '/img/press-release-bg.jpg',
        imageUrl: '',
        published: true,
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Appwrite save failed: ' + err);
  }
  return res.json();
}

export default async ({ req, res, log, error }) => {
  const { iso, bn, slug } = TODAY_BD();
  log('daily-press-release: running for ' + iso);

  const OR_KEY     = process.env.OPENROUTER_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY   = process.env.GROQ_API_KEY;

  const providers = [
    OR_KEY     && { name: 'OpenRouter', fn: (m) => openRouter(OR_KEY, m) },
    GEMINI_KEY && { name: 'Gemini',     fn: (m) => gemini(GEMINI_KEY, m) },
    GROQ_KEY   && { name: 'Groq',       fn: (m) => groq(GROQ_KEY, m) },
  ].filter(Boolean);

  if (!providers.length) {
    error('No AI provider configured');
    return res.json({ error: 'No AI provider configured' }, 500);
  }

  try {
    const generated = await callAI(providers, bn);
    const saved = await saveToAppwrite({ ...generated, date: iso, slug });
    log('daily-press-release: saved ' + (saved.skipped ? '(skipped, exists)' : saved.$id));
    return res.json({ ok: true, date: iso, skipped: saved.skipped || false, id: saved.$id });
  } catch (e) {
    error('daily-press-release: ' + e.message);
    return res.json({ error: e.message }, 500);
  }
};
