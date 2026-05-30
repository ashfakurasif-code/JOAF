/**
 * queueSystem.js — Centralized Queue System
 * No window.* globals — all state in QueueStore singleton
 * Supports: single, selected, batch, scheduled publish
 */

import { publishToFacebook } from './fbpublisher.js';

/** Queue item status */
export const STATUS = {
  PENDING:    'pending',
  PUBLISHING: 'publishing',
  DONE:       'done',
  FAILED:     'failed',
  SCHEDULED:  'scheduled'
};

/** Single queue store — import and use across modules */
class QueueStore {
  constructor() {
    this._items = [];
    this._listeners = [];
    this._running = false;
  }

  /** Add item to queue */
  add({ blob, name, caption, isVideo = false, scheduledAt = null, contentObj = null, pageIds = null }) {
    const item = {
      id: `q-${crypto.randomUUID()}`,
      blob,
      blobUrl: blob ? URL.createObjectURL(blob) : null,
      name: name || `joaf-${Date.now()}`,
      caption: caption || '',
      isVideo,
      scheduledAt,
      contentObj,
      pageIds,
      status: scheduledAt ? STATUS.SCHEDULED : STATUS.PENDING,
      selected: true,
      result: null,
      error: null,
      addedAt: new Date().toISOString(),
      postedAt: null,
      postId: null,
      permalink: null
    };
    this._items.push(item);
    this._emit();
    return item.id;
  }

  /** Update item by id */
  update(id, patch) {
    const idx = this._items.findIndex(i => i.id === id);
    if (idx === -1) return;
    this._items[idx] = { ...this._items[idx], ...patch };
    this._emit();
  }

  /** Toggle selection */
  toggleSelect(id) {
    const item = this._items.find(i => i.id === id);
    if (item) this.update(id, { selected: !item.selected });
  }

  /** Select all / none */
  selectAll(val = true) {
    this._items.forEach(item => this.update(item.id, { selected: val }));
  }

  /** Remove item — revoke blob URL to free memory */
  remove(id) {
    const item = this._items.find(i => i.id === id);
    if (item?.blobUrl) URL.revokeObjectURL(item.blobUrl);
    this._items = this._items.filter(i => i.id !== id);
    this._emit();
  }

  /** Clear ALL items and release memory */
  clear() {
    this._items.forEach(item => {
      if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
    });
    this._items = [];
    this._emit();
  }

  /** Auto-cleanup after successful publish */
  cleanup(id) {
    const item = this._items.find(i => i.id === id);
    if (!item || item.status !== STATUS.DONE) return;
    // Revoke blob URL
    if (item.blobUrl) { URL.revokeObjectURL(item.blobUrl); }
    // Keep only metadata
    this.update(id, {
      blob: null,
      blobUrl: null,
      contentObj: null
    });
  }

  get items() { return [...this._items]; }
  get pending() { return this._items.filter(i => i.status === STATUS.PENDING && i.selected); }
  get selectedItems() { return this._items.filter(i => i.selected); }
  get isRunning() { return this._running; }
  get count() { return this._items.length; }

  /** Subscribe to changes */
  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _emit() {
    this._listeners.forEach(fn => fn([...this._items]));
  }

  // ─── Publish Operations ───────────────────────────────────────────

  /** Publish single item by id */
  async publishOne(id) {
    const item = this._items.find(i => i.id === id);
    if (!item) throw new Error('Item not found: ' + id);
    return this._publishItem(item);
  }

  /** Publish all selected items sequentially */
  async publishSelected(onProgress) {
    if (this._running) throw new Error('Publish already running');
    this._running = true;
    this._emit();

    const items = this.selectedItems.filter(i => i.status === STATUS.PENDING || i.status === STATUS.FAILED);
    let done = 0;

    for (const item of items) {
      try {
        await this._publishItem(item);
      } catch (e) {
        console.error('[Queue] item failed:', item.id, e);
      }
      done++;
      onProgress?.(done, items.length, item);
    }

    this._running = false;
    this._emit();
    return { total: items.length, done };
  }

  /** Publish all pending (batch) */
  async publishAll(onProgress) {
    this.selectAll(true);
    return this.publishSelected(onProgress);
  }

  /** Publish scheduled items whose time has passed */
  async publishDue() {
    const now = Date.now();
    const due = this._items.filter(i =>
      i.status === STATUS.SCHEDULED &&
      i.scheduledAt &&
      new Date(i.scheduledAt).getTime() <= now
    );
    for (const item of due) {
      this.update(item.id, { status: STATUS.PENDING });
      await this._publishItem(item).catch(console.error);
    }
  }

  async _publishItem(item) {
    await this._persistToQueue(item);
    this.update(item.id, { status: STATUS.PUBLISHING });

    try {
      let mediaUrl = null;

      // Upload blob if needed
      if (item.blob && window.uploadToAppwriteStorage) {
        mediaUrl = await window.uploadToAppwriteStorage(item.blob);
      }

      const result = await publishToFacebook({
        caption: item.caption,
        imageUrl: (!item.isVideo && mediaUrl) ? mediaUrl : null,
        videoUrl: (item.isVideo && mediaUrl) ? mediaUrl : null,
        excludeIds: item.pageIds ? null : undefined,
        scheduledAt: item.scheduledAt
      });

      const postId = result.results?.[0]?.postId || null;
      this.update(item.id, {
        status: STATUS.DONE,
        result,
        postId,
        postedAt: new Date().toISOString()
      });
      // Auto-cleanup media after publish
      setTimeout(() => this.cleanup(item.id), 5000);
      return result;

    } catch (err) {
      this.update(item.id, { status: STATUS.FAILED, error: err.message });
      // Revoke blob URL to free memory, but retain blob reference so caller can retry
      const current = this._items.find(i => i.id === item.id);
      if (current?.blobUrl) {
        URL.revokeObjectURL(current.blobUrl);
        this.update(item.id, { blobUrl: null });
      }
      throw err;
    }
  }

  // ── Appwrite persistence bridge ──────────────────────────────────────────
  async _persistToQueue(item) {
    if (typeof window !== 'undefined' && typeof window.fbQueueAdd === 'function') {
      try {
        const qId = await window.fbQueueAdd({
          caption: item.caption,
          imageUrl: item.blobUrl || null,
          scheduledAt: item.scheduledAt || new Date().toISOString(),
        });
        this.update(item.id, { appwriteQueueId: qId });
      } catch (e) {
        console.warn('[QueueStore] Appwrite persist failed (non-blocking):', e.message);
      }
    }
  }
}

// Singleton export
export const queueStore = new QueueStore();

// Start scheduled publish checker (every 60s)
setInterval(() => queueStore.publishDue().catch(console.error), 60_000);
