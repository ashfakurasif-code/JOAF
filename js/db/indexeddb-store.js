/**
 * indexeddb-store.js — Local IndexedDB storage for offline-first sync
 * Stores documents locally and syncs when back online
 */

class IndexedDBStore {
  constructor(dbName = 'joaf_offline', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.isReady = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB open failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ IndexedDB initialized:', this.dbName);
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Create object stores for each collection
        const collections = [
          'push_subscriptions',
          'notification_history',
          'leaders',
          'donors',
          'members',
          'alerts',
          'press_releases',
          'warriors',
          'sync_queue',
        ];

        for (const colName of collections) {
          if (!db.objectStoreNames.contains(colName)) {
            const store = db.createObjectStore(colName, { keyPath: '$id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
            store.createIndex('syncPending', 'syncPending', { unique: false });
          }
        }

        // Special store for tracking sync state
        if (!db.objectStoreNames.contains('_sync_meta')) {
          db.createObjectStore('_sync_meta', { keyPath: 'key' });
        }

        console.log('✅ IndexedDB schema upgraded');
      };
    });
  }

  /**
   * Store a document locally
   */
  async put(storeName, doc) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      // Mark as pending sync if not yet synced
      const docWithSync = {
        ...doc,
        $id: doc.$id || doc.id || `local_${Date.now()}`,
        syncPending: doc.syncPending !== false,
        storedAt: new Date().toISOString(),
      };

      const request = store.put(docWithSync);

      request.onsuccess = () => resolve(docWithSync);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a document from local storage
   */
  async get(storeName, docId) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(docId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all documents from a store
   */
  async getAll(storeName) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query documents by index
   */
  async query(storeName, indexName, value) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncs(storeName) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('syncPending');
      const request = index.getAll(true);  // Only get docs where syncPending === true

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a document
   */
  async delete(storeName, docId) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(docId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear entire store
   */
  async clearStore(storeName) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync metadata
   */
  async getSyncMeta(key) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['_sync_meta'], 'readonly');
      const store = tx.objectStore('_sync_meta');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set sync metadata
   */
  async setSyncMeta(key, value) {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['_sync_meta'], 'readwrite');
      const store = tx.objectStore('_sync_meta');
      const request = store.put({ key, value, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if store is accessible
   */
  async isAccessible() {
    try {
      await this.get('_sync_meta', 'test');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
const indexedDBStore = new IndexedDBStore();
