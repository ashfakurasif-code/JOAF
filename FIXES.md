# JOAF Optimized Build — Fix Log

## Critical Bug Fixes

### [FIX-1] 404 on `/functions/save-subscription/executions` (PRIMARY BUG)
**Root cause:** `joaf-config.js` was not loaded in `index.html` (and 27 other pages).
Without it, `JOAF_FUNCTIONS_BASE` was `undefined`, so the URL fell back to a
relative path `/functions/save-subscription/executions` on julyforum.com instead
of the full Appwrite URL `https://fra.cloud.appwrite.io/v1/functions/...`.

**Fix:** `joaf-config.js` injected into all 28 HTML pages that were missing it,
before `plugins.js` and `components.js`.

### [FIX-2] Missing `push_subscriptions` collection in `appwrite.json`
The `save-subscription` function writes to `push_subscriptions`, but the
collection was never declared in `appwrite.json` → `appwrite push collection`
would never create it → Appwrite returns 404 on every write attempt.

**Fix:** Added `push_subscriptions`, `notification_history`, and `fb_queue`
collection schemas to `appwrite.json`.

### [FIX-3] Missing `endpoint`/`projectId` in `appwrite.json`
`joaf-config.js` reads `spec.endpoint` and `spec.projectId` from `appwrite.json`,
but those top-level keys were absent. The config loader silently fell back to empty
strings, so all Appwrite calls used wrong base URLs.

**Fix:** Added `"endpoint"`, `"projectId"`, `"databaseId"` top-level fields.

### [FIX-4] `fb-autopost` missing APPWRITE_ENDPOINT/PROJECT env vars
**Fix:** Added missing vars in `appwrite.json` function definition.

### [FIX-5] `save-subscription` upsert race condition
Old code did a query to find existing doc, then update — non-atomic and prone to
duplicate creation errors. New code uses direct update-by-ID, falls back to create,
handles 409 conflict (race condition).

## Performance Optimizations

- **Lazy singletons**: `_db` and `_vapidSet` are module-level, surviving warm invocations → cold-start only on first call
- **fb-autopost**: Removed `node-appwrite` dependency entirely → faster `npm install`, smaller bundle
- **groq-proxy**: Removed `node-appwrite` dependency → zero deps, instant cold-start
- **send-notification**: Concurrent batch sending (20 subs at a time with `Promise.allSettled`)
- **get-stats**: Uses `Query.limit(1)` with `total` count field instead of full table scan
- **fetch-rss**: 6s timeout (was 8s), 10 items/source (was 15), no redirect handling loop
- **All functions**: Added `AbortSignal.timeout()` guards to prevent hanging fetch calls

## Free Tier Compliance
- All functions have explicit method guards returning early on non-POST/GET
- No unnecessary Appwrite API calls (batched queries, lazy client init)
- `notification_history` writes are non-blocking (fire-and-forget)
- Expired subscription cleanup is non-blocking

## Deployment Steps
1. Copy all files from this archive to your project root
2. Run: `appwrite push collection` (creates push_subscriptions, notification_history, fb_queue)
3. Set all env vars marked `""` in appwrite.json (API keys, VAPID keys, FB tokens)
4. Run: `appwrite push function --all`
5. Deploy frontend HTML/JS files to julyforum.com

---

## Round 2 Fixes (from live deployment review)

### [FIX-6] `save-subscription` 400 — Appwrite execution body not unwrapped
When the frontend posts to `/executions`, Appwrite wraps the payload as:
`{ body: "JSON_STRING", async: false, path: "/", method: "POST", headers: {} }`
The function must unwrap `req.body.body` to get the actual payload.
Both `save-subscription` and `send-notification` now handle this format plus
direct body (for backwards compatibility).

### [FIX-7] `aw-firestore.js` 401 spam — anonymous session removed
`aw-firestore.js` tried to create an anonymous Appwrite session for every
database read. Since all collections use `read("any")` permissions, no
session is needed. Removed `ensureSession()` and `Account` import → eliminates
the 401 error and one unnecessary network round-trip on every page load.

### [FIX-8] `send-notification` body field renamed to `bodyText`
The `body` field name clashed with the execution envelope's `body` key.
Renamed to `bodyText` in both components.js and the function handler.

### [FIX-9] Deployment command: `appwrite deploy` → `appwrite push`
The Appwrite CLI v6+ removed `appwrite deploy`. Use `appwrite push` instead.

## Correct Deployment Commands
```bash
appwrite push collection
appwrite push function --all
```
