/**
 * offline-sync.js — Offline-first sync manager
 * Queues writes during offline periods and syncs when back online
 * Coordinates across tabs via BroadcastChannel
 */

class OfflineSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.broadcastChannel = null;
    this.syncInProgress = false;
    this.pendingSyncs = [];

    try {
      this.broadcastChannel = new BroadcastChannel('joaf_offline_sync');
      this.broadcastChannel.onmessage = (e) => this.handleSyncMessage(e);
    } catch (err) {
      console.warn('BroadcastChannel not available:', err.message);
    }

    this.init();
  }

  /**
   * Initialize offline sync manager
   */
  async init() {
    // Initialize IndexedDB
    if (window.indexedDBStore) {
      try {
        await window.indexedDBStore.init();
        console.log('✅ Offline sync manager ready');
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      }
    }

    // Set up online/offline listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Sync immediately if online
    if (this.isOnline) {
      await this.syncAllCollections();
    }
  }

  /**
   * Handle going online
   */
  async handleOnline() {
    console.log('🟢 Back online!');
    this.isOnline = true;
    this.broadcastEvent('sync_status', { online: true });
    await this.syncAllCollections();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('🔴 Going offline');
    this.isOnline = false;
    this.broadcastEvent('sync_status', { online: false });
  }

  /**
   * Queue a write to local storage
   */
  async queueWrite(collection, doc) {
    if (!window.indexedDBStore) return false;

    try {
      await window.indexedDBStore.put(collection, {
        ...doc,
        syncPending: true,
        action: 'upsert',
      });

      console.log(`📝 Queued write to ${collection}: ${doc.$id || doc.id}`);
      this.broadcastEvent('write_queued', { collection, docId: doc.$id || doc.id });

      // Try to sync immediately if online
      if (this.isOnline && !this.syncInProgress) {
        await this.syncCollection(collection);
      }

      return true;
    } catch (err) {
      console.error('Failed to queue write:', err);
      return false;
    }
  }

  /**
   * Queue a delete operation
   */
  async queueDelete(collection, docId) {
    if (!window.indexedDBStore) return false;

    try {
      await window.indexedDBStore.put(collection, {
        $id: docId,
        syncPending: true,
        action: 'delete',
      });

      console.log(`🗑️ Queued delete from ${collection}: ${docId}`);
      this.broadcastEvent('delete_queued', { collection, docId });

      // Try to sync immediately if online
      if (this.isOnline && !this.syncInProgress) {
        await this.syncCollection(collection);
      }

      return true;
    } catch (err) {
      console.error('Failed to queue delete:', err);
      return false;
    }
  }

  /**
   * Sync a single collection
   */
  async syncCollection(collection) {
    if (!window.indexedDBStore || !this.isOnline) return;

    try {
      const pendingDocs = await window.indexedDBStore.getPendingSyncs(collection);
      if (pendingDocs.length === 0) return;

      console.log(`🔄 Syncing ${collection}: ${pendingDocs.length} items`);

      if (!window.JOAF_CONFIG?.APPWRITE) {
        throw new Error('JOAF_CONFIG not initialized. Ensure constants.js is loaded before offline-sync.js');
      }
      const config = window.JOAF_CONFIG.APPWRITE;

      for (const doc of pendingDocs) {
        try {
          if (doc.action === 'delete') {
            // Delete from Appwrite
            await fetch(
              `${config.ENDPOINT}/databases/${config.DB_ID}/collections/${collection}/documents/${doc.$id}`,
              {
                method: 'DELETE',
                headers: {
                  'X-Appwrite-Project': config.PROJECT_ID,
                  'X-Appwrite-Key': localStorage.getItem('aw_api_key'),
                },
              }
            );
            console.log(`✅ Synced delete: ${collection}/${doc.$id}`);
          } else {
            // Upsert to Appwrite
            const { action, syncPending, storedAt, ...docData } = doc;
            try {
              // Try PUT first (update)
              const response = await fetch(
                `${config.ENDPOINT}/databases/${config.DB_ID}/collections/${collection}/documents/${doc.$id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Appwrite-Project': config.PROJECT_ID,
                    'X-Appwrite-Key': localStorage.getItem('aw_api_key'),
                  },
                  body: JSON.stringify(docData),
                }
              );

              if (response.ok) {
                console.log(`✅ Synced upsert: ${collection}/${doc.$id}`);
                // Mark as synced and remove from local store
                await window.indexedDBStore.delete(collection, doc.$id);
              } else if (response.status === 404) {
                // Document doesn't exist, try POST (create)
                const createResponse = await fetch(
                  `${config.ENDPOINT}/databases/${config.DB_ID}/collections/${collection}/documents/${doc.$id}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Appwrite-Project': config.PROJECT_ID,
                      'X-Appwrite-Key': localStorage.getItem('aw_api_key'),
                    },
                    body: JSON.stringify(docData),
                  }
                );
                
                if (createResponse.ok) {
                  console.log(`✅ Synced create: ${collection}/${doc.$id}`);
                  await window.indexedDBStore.delete(collection, doc.$id);
                } else {
                  console.error(`Failed to create: ${createResponse.status}`);
                }
              } else {
                console.error(`Failed to sync: ${response.status}`);
              }
            } catch (err) {
              console.error(`Sync error for ${collection}/${doc.$id}:`, err.message);
            }
          }
        } catch (err) {
          console.error(`Sync error for ${collection}/${doc.$id}:`, err.message);
        }
      }

      this.broadcastEvent('collection_synced', { collection, count: pendingDocs.length });
    } catch (err) {
      console.error(`Failed to sync collection ${collection}:`, err);
    }
  }

  /**
   * Sync all collections
   */
  async syncAllCollections() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    const collections = [
      'push_subscriptions',
      'notification_history',
      'leaders',
      'donors',
      'members',
      'alerts',
      'press_releases',
      'warriors',
    ];

    try {
      for (const collection of collections) {
        await this.syncCollection(collection);
      }
      console.log('✅ All collections synced');
      this.broadcastEvent('all_synced', {});
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount() {
    if (!window.indexedDBStore) return 0;

    const collections = [
      'push_subscriptions',
      'notification_history',
      'leaders',
      'donors',
      'members',
      'alerts',
      'press_releases',
      'warriors',
    ];

    let total = 0;
    for (const collection of collections) {
      const pending = await window.indexedDBStore.getPendingSyncs(collection);
      total += pending.length;
    }

    return total;
  }

  /**
   * Broadcast sync event to other tabs
   */
  broadcastEvent(type, data) {
    if (!this.broadcastChannel) return;
    try {
      this.broadcastChannel.postMessage({
        type,
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (err) {
      console.error('Broadcast failed:', err);
    }
  }

  /**
   * Handle messages from other tabs
   */
  handleSyncMessage(event) {
    const { data } = event;
    window.dispatchEvent(
      new CustomEvent('joaf_sync_update', { detail: data })
    );
  }

  /**
   * Get sync status
   */
  async getStatus() {
    return {
      online: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingCount: await this.getPendingCount(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
const offlineSyncManager = new OfflineSyncManager();
window.offlineSyncManager = offlineSyncManager;
