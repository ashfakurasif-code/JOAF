// netlify/functions/save-subscription.js
// Appwrite Database এ push subscription save করে (Firestore বাদ)

const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT  = '6a11b6cd000b59f318eb';
const AW_KEY      = process.env.APPWRITE_API_KEY;
const DB_ID       = 'joaf';
const COL_ID      = 'push_subscriptions';

const BASE = `${AW_ENDPOINT}/databases/${DB_ID}/collections/${COL_ID}/documents`;

async function awGet(docId) {
  const r = await fetch(`${BASE}/${docId}`, {
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('AW GET failed: ' + r.status);
  return await r.json();
}

async function awUpsert(docId, data) {
  // Try update first, then create
  const existing = await awGet(docId);
  if (existing) {
    // PATCH (update)
    const r = await fetch(`${BASE}/${docId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AW_PROJECT,
        'X-Appwrite-Key': AW_KEY
      },
      body: JSON.stringify({ data })
    });
    if (!r.ok) throw new Error('AW PATCH failed: ' + r.status);
    return await r.json();
  } else {
    // POST (create)
    const r = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AW_PROJECT,
        'X-Appwrite-Key': AW_KEY
      },
      body: JSON.stringify({ documentId: docId, data, permissions: [] })
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error('AW POST failed: ' + r.status + ' ' + err);
    }
    return await r.json();
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body);
    const { subscription, deviceInfo, district } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid subscription' }) };
    }

    // endpoint দিয়ে unique ID বানাও (safe characters only)
    const id = Buffer.from(subscription.endpoint).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '').slice(-20);

    await awUpsert(id, {
      endpoint:         subscription.endpoint,
      subscriptionJson: JSON.stringify(subscription),
      district:         district || '',
      active:           true,
      updatedAt:        new Date().toISOString(),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id }) };
  } catch (err) {
    console.error('save-subscription error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
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
