// netlify/functions/migrate-subscriptions.js
// পুরনো subscriptions fix করার one-time script
// URL: /.netlify/functions/migrate-subscriptions
// একবার run করলেই হবে

const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Admin key check
  const adminKey = event.headers['x-admin-key'] || event.queryStringParameters?.key || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    initAdmin();
    const db = admin.firestore();

    const snapshot = await db.collection('push_subscriptions').get();

    if (snapshot.empty) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'No subscriptions found', fixed: 0 }) };
    }

    let fixed = 0, skipped = 0, deleted = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Case 1: subscription string হিসেবে আছে — parse করে fix করো
      if (typeof data.subscription === 'string') {
        try {
          const parsed = JSON.parse(data.subscription);
          if (parsed && parsed.endpoint) {
            batch.update(doc.ref, {
              subscription: parsed,
              endpoint: parsed.endpoint,
              active: true,
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            fixed++;
          } else {
            // Invalid — delete করো
            batch.delete(doc.ref);
            deleted++;
          }
        } catch(e) {
          batch.delete(doc.ref);
          deleted++;
        }
      }
      // Case 2: subscription object হিসেবে আছে কিন্তু endpoint নেই
      else if (typeof data.subscription === 'object' && data.subscription && !data.endpoint) {
        if (data.subscription.endpoint) {
          batch.update(doc.ref, {
            endpoint: data.subscription.endpoint,
            active: true,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          fixed++;
        } else {
          batch.delete(doc.ref);
          deleted++;
        }
      }
      // Case 3: ঠিক আছে
      else {
        skipped++;
      }
    }

    await batch.commit();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: snapshot.size,
        fixed,
        skipped,
        deleted,
        message: `Migration complete! ${fixed} fixed, ${skipped} already OK, ${deleted} deleted.`
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
