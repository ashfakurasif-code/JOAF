// netlify/functions/save-subscription.js
// Appwrite REST API — push_subscriptions collection
const AW_EP  = 'https://fra.cloud.appwrite.io/v1';
const AW_P   = '6a11b6cd000b59f318eb';
const AW_KEY = process.env.APPWRITE_API_KEY;
const AW_DB  = 'joaf';
const AW_COL = 'push_subscriptions';
const AW_H   = { 'Content-Type':'application/json', 'X-Appwrite-Project':AW_P, 'X-Appwrite-Key':AW_KEY };

async function awUpsert(docId, data) {
  const awData = {};
  for (const [k,v] of Object.entries(data)) {
    awData[k] = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v ?? '');
  }
  const p = await fetch(`${AW_EP}/databases/${AW_DB}/collections/${AW_COL}/documents/${docId}`, {
    method:'PATCH', headers:AW_H, body:JSON.stringify({data:awData})
  });
  if (p.ok) return await p.json();
  await fetch(`${AW_EP}/databases/${AW_DB}/collections/${AW_COL}/documents`, {
    method:'POST', headers:AW_H,
    body:JSON.stringify({documentId:docId, data:awData, permissions:['read("any")']})
  });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Content-Type':'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };
  if (event.httpMethod !== 'POST') return { statusCode:405, headers, body:JSON.stringify({error:'Method not allowed'}) };
  try {
    const body = JSON.parse(event.body);
    const { subscription, deviceInfo } = body;
    if (!subscription || !subscription.endpoint) return { statusCode:400, headers, body:JSON.stringify({error:'Invalid subscription'}) };
    const id = Buffer.from(subscription.endpoint).toString('base64').slice(-20).replace(/[^a-zA-Z0-9]/g,'_');
    await awUpsert(id, {
      subscription: JSON.stringify(subscription),
      endpoint:     subscription.endpoint,
      deviceInfo:   JSON.stringify(deviceInfo || {}),
      district:     String(body.district || ''),
      active:       'true',
      updatedAt:    new Date().toISOString(),
    });
    return { statusCode:200, headers, body:JSON.stringify({success:true, id}) };
  } catch (err) {
    console.error('save-subscription error:', err);
    return { statusCode:500, headers, body:JSON.stringify({error:err.message}) };
  }
};
