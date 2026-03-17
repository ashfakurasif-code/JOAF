// netlify/functions/update-leaders.js
// Groq AI দিয়ে নেতাদের latest info analyze করে Firestore update করে
// Runs: daily via Netlify scheduled function + manual from admin panel

const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const GROQ_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'];

const LEADERS_LIST = [
  { id: 'yunus',      name: 'ড. মুহাম্মদ ইউনূস',              party: 'অন্তর্বর্তীকালীন সরকার', role: 'প্রধান উপদেষ্টা',    cat: 'সরকার',          icon: '👴' },
  { id: 'nahid',      name: 'নাহিদ ইসলাম',                    party: 'জাতীয় নাগরিক পার্টি (NCP)', role: 'আহ্বায়ক',         cat: 'যুব রাজনীতি',    icon: '🧑' },
  { id: 'asif',       name: 'আসিফ মাহমুদ',                    party: 'জাতীয় নাগরিক পার্টি (NCP)', role: 'যুগ্ম আহ্বায়ক',   cat: 'যুব রাজনীতি',    icon: '👦' },
  { id: 'fakhrul',    name: 'মির্জা ফখরুল ইসলাম আলমগীর',      party: 'বিএনপি',                  role: 'মহাসচিব',           cat: 'বিরোধী দল',      icon: '👤' },
  { id: 'shafiqur',   name: 'শফিকুর রহমান',                   party: 'জামায়াতে ইসলামী',          role: 'আমির',             cat: 'বিরোধী দল',      icon: '🧔' },
  { id: 'ali_riaz',   name: 'ড. আলী রীয়াজ',                  party: 'সংবিধান সংস্কার কমিশন',   role: 'প্রধান',            cat: 'সুশীল সমাজ',     icon: '📚' },
  { id: 'tarique',    name: 'তারেক রহমান',                    party: 'বিএনপি',                  role: 'ভারপ্রাপ্ত চেয়ারম্যান', cat: 'বিরোধী দল',   icon: '👤' },
  { id: 'hafizuddin', name: 'মেজর জেনারেল (অব.) সৈয়দ মুহাম্মদ ইব্রাহিম', party: 'কল্যাণ পার্টি', role: 'চেয়ারম্যান',      cat: 'বিরোধী দল',      icon: '🎖️' },
];

async function groqAnalyze(leader, today) {
  const prompt = `তুমি বাংলাদেশের রাজনৈতিক বিশ্লেষক। আজকের তারিখ ${today}।

নেতা: ${leader.name} (${leader.party}, ${leader.role})

নিচের JSON format-এ এই নেতার সর্বশেষ (${today} পর্যন্ত) তথ্য দাও। শুধু JSON, আর কিছু না:

{
  "approval": <১০ থেকে ১০০ এর মধ্যে সংখ্যা — বর্তমান আনুমানিক জনসমর্থন>,
  "viral": <true/false — গত ৩০ দিনে viral/trending ছিলেন কিনা>,
  "promises": [
    {"text": "প্রতিশ্রুতির সংক্ষিপ্ত বাংলা বিবরণ", "status": "done|progress|pending|broken"}
  ],
  "statements": [
    {"text": "সাম্প্রতিক উল্লেখযোগ্য উক্তি বাংলায়", "date": "মাস ও বছর বাংলায়"}
  ],
  "controversies": [
    {"text": "বিতর্ক বা সমালোচনার বিবরণ বাংলায়", "date": "মাস ও বছর বাংলায়"}
  ],
  "virals": [
    {"text": "ভাইরাল মুহূর্তের বিবরণ বাংলায়", "icon": "একটি emoji", "date": "মাস ও বছর বাংলায়"}
  ]
}

নিয়ম:
- promises: সর্বোচ্চ ৬টি, সবচেয়ে গুরুত্বপূর্ণ
- statements: সর্বোচ্চ ৩টি, সাম্প্রতিক
- controversies: সর্বোচ্চ ৩টি
- virals: সর্বোচ্চ ৩টি
- সব বাংলায়, নিরপেক্ষ তথ্যভিত্তিক`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed;
      }
    } catch(e) { continue; }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://julyforum.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  // Auth check — scheduled or admin
  const adminKey = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    initAdmin();
    const db = admin.firestore();
    const today = new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10); // BD time

    const results = [];
    for (const leader of LEADERS_LIST) {
      try {
        const aiData = await groqAnalyze(leader, today);
        if (!aiData) { results.push({ id: leader.id, status: 'ai_failed' }); continue; }

        await db.collection('leaders').doc(leader.id).set({
          name:          leader.name,
          party:         leader.party,
          role:          leader.role,
          cat:           leader.cat,
          icon:          leader.icon,
          approval:      aiData.approval   || 50,
          viral:         aiData.viral      || false,
          promises:      aiData.promises   || [],
          statements:    aiData.statements || [],
          controversies: aiData.controversies || [],
          virals:        aiData.virals     || [],
          lastAiUpdate:  today,
          createdAt:     admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false }); // full replace for AI updates

        results.push({ id: leader.id, name: leader.name, status: 'updated', approval: aiData.approval });
        // Small delay to avoid Groq rate limit
        await new Promise(r => setTimeout(r, 800));
      } catch(e) {
        results.push({ id: leader.id, status: 'error', error: e.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        date: today,
        updated: results.filter(r => r.status === 'updated').length,
        failed: results.filter(r => r.status !== 'updated').length,
        results,
      }),
    };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
