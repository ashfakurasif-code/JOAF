const admin = require('firebase-admin');
const { Client, Databases, Query, ID } = require('node-appwrite');

const {
  FIREBASE_SERVICE_ACCOUNT_JSON,
  FIREBASE_COLLECTION = 'push_subscriptions',
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID = 'push_subscriptions',
  REPAIR_MIGRATION_SECRET
} = process.env;

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) {
    return admin.firestore();
  }

  if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
  }

  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  firebaseInitialized = true;

  console.log('🔥 Firebase Admin initialized');

  return admin.firestore();
}

function initializeAppwrite() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  console.log('🚀 Appwrite initialized');

  return new Databases(client);
}

function normalizeSubscription(data) {
  let subscription =
    data.subscription ||
    data.pushSubscription ||
    data.subscriptionJson ||
    data.subscription_data;

  if (typeof subscription === 'string') {
    subscription = JSON.parse(subscription);
  }

  if (!subscription || typeof subscription !== 'object') {
    throw new Error('Invalid subscription payload');
  }

  return subscription;
}

async function upsertSubscription(databases, payload) {
  const existing = await databases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_ID,
    [
      Query.equal('endpoint', payload.endpoint),
      Query.limit(1)
    ]
  );

  if (existing.documents.length > 0) {
    const document = existing.documents[0];

    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      document.$id,
      payload
    );

    return {
      action: 'updated',
      id: document.$id
    };
  }

  const created = await databases.createDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_ID,
    ID.unique(),
    payload
  );

  return {
    action: 'created',
    id: created.$id
  };
}

exports.handler = async (event) => {
  try {
    if (
      !REPAIR_MIGRATION_SECRET ||
      event.headers['x-repair-secret'] !== REPAIR_MIGRATION_SECRET
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized'
        })
      };
    }

    const firestore = initializeFirebase();
    const databases = initializeAppwrite();

    console.log(`📦 Fetching Firebase collection: ${FIREBASE_COLLECTION}`);

    const snapshot = await firestore
      .collection(FIREBASE_COLLECTION)
      .get();

    console.log(`📄 Found ${snapshot.size} Firebase subscription records`);

    let repaired = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();

        const subscription = normalizeSubscription(data);

        const endpoint =
          subscription.endpoint ||
          data.endpoint;

        if (!endpoint) {
          console.error(`⚠️ Missing endpoint for ${doc.id}`);
          skipped++;
          continue;
        }

        const payload = {
          active: true,
          endpoint,
          subscriptionJson: JSON.stringify(subscription),
          district: data.district || 'unknown',
          updatedAt: new Date().toISOString()
        };

        const result = await upsertSubscription(databases, payload);

        repaired++;

        console.log(
          `✅ Successfully ${result.action} subscriber: ${result.id}`
        );
      } catch (error) {
        failed++;

        console.error(
          `❌ Failed repairing subscriber ${doc.id}:`,
          error.message
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        repaired,
        skipped,
        failed
      })
    };
  } catch (error) {
    console.error('💥 Repair migration crashed:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};