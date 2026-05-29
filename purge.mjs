import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6a11b6cd000b59f318eb')
  .setKey(process.env.APPWRITE_KEY);

const db = new Databases(client);

async function purge() {
  let deleted = 0;

  while (true) {
    const res = await db.listDocuments('joaf', 'push_subscriptions', [Query.limit(25)]);
    if (!res.documents.length) break;

    for (const doc of res.documents) {
      await db.deleteDocument('joaf', 'push_subscriptions', doc.$id);
      deleted++;
      process.stdout.write('\rDeleted: ' + deleted);
    }
  }

  console.log('\nDone! Total deleted: ' + deleted);
}

purge().catch(console.error);
