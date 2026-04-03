// netlify/functions/migrate-subscriptions.js
// পুরনো subscriptions fix করার one-time script
// firebase-admin বাদ দিয়ে Firestore REST API দিয়ে করা হয়েছে

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BASE = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents`;

async function fsGet(collection) {
  const r = await fetch(`${BASE}/${collection}?key=${FB_CONFIG.apiKey}&pageSize=200`);
  if (!r.ok) throw new Error('GET failed: ' + r.status);
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const obj = { id, _name: doc.name };
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined)  obj[k] = v.stringValue;
      else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
      else if (v.mapValue) {
        const m = {};
        for (const [mk, mv] of Object.entries(v.mapValue.fields || {})) {
          m[mk] = mv.stringValue ?? mv.booleanValue ?? '';
        }
        obj[k] = m;
      }
    }
    return obj;
  });
}

async function fsPatch(docName, fields) {
  const toField = v => {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'object' && v !== null) return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k,vv])=>[k,toField(vv)])) } };
    return { nullValue: null };
  };
  const fieldMap = Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,toField(v)]));
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fieldMap }),
  });
  if (!r.ok) throw new Error('PATCH failed: ' + r.status);
}

async function fsDelete(docName) {
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) throw new Error('DELETE failed: ' + r.status);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const adminKey = event.headers['x-admin-key'] || event.queryStringParameters?.key || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const docs = await fsGet('push_subscriptions');

    if (!docs.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No subscriptions found', fixed: 0 }) };
    }

    let fixed = 0, skipped = 0, deleted = 0;

    for (const doc of docs) {
      try {
        // Case 1: subscription string হিসেবে আছে — parse করে fix করো
        if (typeof doc.subscription === 'string') {
          try {
            const parsed = JSON.parse(doc.subscription);
            if (parsed && parsed.endpoint) {
              await fsPatch(doc._name, {
                subscription: parsed,
                endpoint: parsed.endpoint,
                active: true,
              });
              fixed++;
            } else {
              await fsDelete(doc._name);
              deleted++;
            }
          } catch (e) {
            await fsDelete(doc._name);
            deleted++;
          }
        }
        // Case 2: subscription object আছে কিন্তু endpoint নেই
        else if (typeof doc.subscription === 'object' && doc.subscription && !doc.endpoint) {
          if (doc.subscription.endpoint) {
            await fsPatch(doc._name, {
              endpoint: doc.subscription.endpoint,
              active: true,
            });
            fixed++;
          } else {
            await fsDelete(doc._name);
            deleted++;
          }
        }
        // Case 3: ঠিক আছে
        else {
          skipped++;
        }
      } catch (e) {
        // individual doc error — skip করো
        skipped++;
      }

      // Rate limit এড়াতে ছোট delay
      await new Promise(r => setTimeout(r, 100));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total:   docs.length,
        fixed,
        skipped,
        deleted,
        message: `Migration complete! ${fixed} fixed, ${skipped} already OK, ${deleted} deleted.`,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
