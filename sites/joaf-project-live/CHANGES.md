# JOAF v5 → v6 Architecture Fixes
## Build: joaf_fixed — $(date -u +%Y-%m-%d)

---

## Bug 1: Push Notifications "Quick Send" showing 0 users ✅ FIXED

**Root cause:** `aw-utils.js` `initDatabase()` defined only 4 attributes for `push_subscriptions`
(active, subscriptionJson, district, updatedAt) — missing the **`endpoint`** field.
`save-subscription.js` writes `endpoint` as its primary field and `findByEndpoint()` queries on it.
Without the attribute in Appwrite's schema, documents were rejected and queries returned 0 results.

**Files changed:**
- `appwrite-functions/aw-utils.js` — added `endpoint: string(65535)` to `initDatabase()`
- `appwrite-functions/migrate-to-appwrite.js` — added `push_subscriptions` to `validate-schema` SCHEMAS + INDEX_DEFS

---

## Bug 2: `notification_history` Schema Mismatch ✅ FIXED

**Root cause:** `send-notification.js` writes `{ sent, failed, total }` to `notification_history`,
but `validate-schema` SCHEMAS only defined `totalSent`. Appwrite rejects writes to undeclared attributes.

**Files changed:**
- `appwrite-functions/migrate-to-appwrite.js` — added `sent`, `failed`, `total` integer attrs to notification_history schema

---

## Bug 3: FB-Autopost 400 Bad Request ✅ FIXED

**Root cause:** Two Facebook Graph API payload errors in `postToPage()`:
1. Scheduled video posts require `published: false` alongside `scheduled_publish_time` — it was missing
2. Scheduled image posts used `/photos` endpoint which doesn't support scheduling;
   correct flow: upload as unpublished photo → post to `/feed` with `attached_media`

**Files changed:**
- `appwrite-functions/fb-autopost.js` — rewrote `postToPage()` with correct payload for all 4 post types;
  added `(type: ..., code: ...)` to error messages for easier debugging

---

## Bug 4: CSP / Inline Scripts ✅ FIXED

**Root cause:** No `Content-Security-Policy` header in `deployment scripts`, plus blocking inline scripts
in `admin/index.html` (login check, district selector).

**Files changed:**
- `admin/js/admin-init.js` — NEW: external file for login screen CSS var + district dropdown population
- `admin/index.html` — replaced 2 inline `<script>` blocks with external file references
- `deployment scripts` — added CSP header for `/admin/*.html` covering all required origins

---

## Bug 5: Firebase Config Credential Leaks ✅ FIXED

**Root cause:** Despite `js/aw-firestore.js` being a pure Appwrite shim, 35+ HTML files were
still passing live Firebase API key (`AIzaSyDBbm1e...`) + project credentials to `initializeApp()`.
The shim ignores them, but they leaked credentials in client-side source.

**Files changed:** 35+ `.html` files — replaced Firebase config objects with `{}` stubs.
`aw-firestore.js` and `firebase-messaging-sw.js` unchanged (they're already clean).
`migrate-to-appwrite.js` retains the Firestore REST key intentionally (server-side migration tool only).

---

## Bug 6: 503 Timeouts on Schema Validation ✅ FIXED

**Root cause A:** Sequential attribute creation with `await ... 250ms` per attribute.
18 attrs × 250ms = 4.5s + indexes = easily > 10s runtime limit.

**Fix:** Batch attribute creation in groups of 3 with a single 200ms gap between batches.
Worst case: ceil(18/3) × 200ms = 1.2s. 4× faster.

**Root cause B:** `migrate-collection` called `fsGetAllDocs()` on every chunk call — fetching
ALL documents from Firestore to apply a JavaScript `.slice(offset, offset+limit)`.
For 1000+ doc collections, 4+ HTTP round-trips per chunk = guaranteed timeout.

**Fix:** Added `fsGetPage(collection, pageSize, pageToken)` that fetches exactly ONE PAGE
from Firestore using native cursor pagination. Frontend now passes `pageToken` (returned from
previous call) instead of `offset`. O(1) fetch per chunk regardless of collection size.

**Root cause C:** `initDatabase()` had a hardcoded 3-second `setTimeout` between attr creation
and index creation — ran on every `init-database` call.

**Fix:** Adaptive wait — only waits 800ms if new attributes were actually just created.
If all attrs already exist (idempotent re-run), skips the wait entirely.

**Files changed:**
- `appwrite-functions/migrate-to-appwrite.js` — parallelized attr creation, new `fsGetPage()`, pageToken protocol
- `appwrite-functions/aw-utils.js` — adaptive wait in `initDatabase()`, fixed `awUpsert()` return value
- `admin/index.html` — updated migration loop to use `pageToken` instead of `offset`

---

## Bug 7: awUpsert Return Value ✅ FIXED

**Root cause:** `awUpsert()` returned the raw Appwrite response object, but the migration loop
checked `if (upsertResult === 'created')` — always false, so `created` count was always 0.

**Fix:** `awUpsert()` now returns the string `'created'` or `'updated'`.

---

## Bug 8: Dashboard Hard-Refresh UX ✅ ENHANCED

**Added:**
- **Page Visibility API** — refreshes stale data when the tab regains focus after being hidden
- **BroadcastChannel** (`joaf_admin_sync`) — cross-tab state sync; other admin tabs
  get notified when a notification is sent or data changes
- Auto-refresh interval reduced from 90s → 60s
- `window.__joafBroadcast(event, payload)` exposed for use anywhere in the app

**Files changed:**
- `admin/index.html` — enhanced state management block

