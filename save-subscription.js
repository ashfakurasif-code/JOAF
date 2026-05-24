// netlify/functions/save-subscription.js
// User এর push subscription Firestore এ save করে
// firebase-admin বাদ — Firestore REST API ব্যবহার করা হচ্ছে

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BASE = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents`;

function toField(v) {
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toField(vv)])) } };
  }
  return { nullValue: null };
}

async function firestoreSet(col, docId, data) {
  // PATCH (upsert) — Appwrite
  const awData = {};
  for (const [k,v] of Object.entries(data)) {
    awData[k] = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v ?? '');
  }
  const patchR = await fetch(`${AW_BASE}/${docId}`, {
    method:'PATCH', headers:AW_H, body:JSON.stringify({data:awData})
  });
  if (patchR.ok) return;
  // If not found, POST
  await fetch(AW_BASE, {
    method:'POST', headers:AW_H,
    body:JSON.stringify({documentId:docId, data:awData, permissions:['read(\"any\")']})
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { subscription, deviceInfo } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid subscription' }) };
    }

    // endpoint দিয়ে unique ID বানাও
    const id = Buffer.from(subscription.endpoint).toString('base64').slice(-20);

    await firestoreSet('push_subscriptions', id, {
      subscription,
      endpoint:   subscription.endpoint,
      deviceInfo: deviceInfo || {},
      district:   (body.district || ''),
      active:     true,
      updatedAt:  new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id }),
    };
  } catch (err) {
    console.error('save-subscription error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
