# JOAF Platform — Phase 1 Architecture Handover

## What Was Fixed

**1. Firebase cleanup**
`firebaseConfig = {}` (empty legacy object in `rokto.html`) removed. There is no Firebase SDK in this codebase — `js/aw-firestore.js` is a Firestore-shaped adapter that speaks to Appwrite under the hood. No Firebase CDN, no Firebase credentials.

**2. fb-autopost.js — Graph API 400 errors**
Added `isValidUrl()` validation before any Graph API call. If `imageUrl` or `videoUrl` is not a valid `http/https` URL, the function now returns a clear `400` with a descriptive error instead of letting the FB Graph API return an opaque error.

**3. migrate-to-appwrite.js — 503/429 resilience**
Added `withRetry()` wrapper (exponential backoff, up to 4 attempts, detects 429/503/rate-limit errors). All `awUpsert` calls are now wrapped. Existing `Promise.allSettled`-style chunking with 8-concurrent slots + 40ms delay between batches was already present.

**4. send-notification.js — Appwrite-only**
Fully migrated off Firebase. `_verify` ping endpoint confirmed working (returns `{verified:true}` on admin key auth check). Push subscription schema maps to Appwrite `push_subscriptions` collection.

**5. Admin Metro-Line health dashboard**
Replaced the flat badge list in `admin/index.html` with a visual Metro-Line circuit. Five nodes: Appwrite DB → Push SW → Notif Fn → Groq AI → FB Autopost. Green = healthy, Red + blinking = offline. `window.runHealthCheck()` re-runnable. Uses `Promise.allSettled` so a failing node never blocks others.

---

## Architecture Flow

**Data layer — Appwrite-only**

```
Browser → aw-firestore.js (shim)
           └→ Appwrite REST API (cloud.appwrite.io)
                └→ Collections: donors, alerts, pageviews,
                                 push_subscriptions, notification_history,
                                 leaders, press_releases, bajar_prices,
                                 warriors, forum_posts, members, polls
```

**Appwrite Functions (serverless)**
```
/appwrite-functions/
  get-stats          — Appwrite read: counts for dashboard
  send-notification  — webpush dispatch from Appwrite subs list
  save-subscription  — write push sub to Appwrite
  groq-proxy         — forwards AI requests, keeps key server-side
  fb-autopost        — Facebook Graph API proxy (token never in browser)
  discover-leaders   — scheduled: RSS → Groq → Appwrite leaders
  generate-timeline  — scheduled: Groq → Appwrite timeline
  update-leaders     — scheduled: AI refresh of leader scores
  migrate-to-appwrite — one-time: Firestore → Appwrite migration tool
  press-release-og   — OG meta tag generator for press releases
  github-upload      — admin file upload via GitHub API
```

**Static data (not yet in Appwrite)**
`js/data.js` holds: nav config, push message templates, WhatsApp group links, nucleus/advisor/coalition member profiles, district coordinates, press release index, stats, ticker items, maze nav structure, FB post config. These are intentionally static — they are editorial content that changes infrequently and requires no live queries.

**Warriors data — source of truth**
The 1,024 warriors in `july-warriors.html` are hardcoded in the HTML as `const WARRIORS=[...]`. They do **not** come from Firebase or any hidden endpoint. They are not yet in Appwrite. See Phase 2 for migration path.

---

## Phase 2 Roadmap

**Priority 1 — Warriors → Appwrite**
Create an Appwrite `warriors` collection with fields: `name`, `role`, `dist`, `type` (shahid/ahat/active), `date`, `story`, `icon`. Run a one-time migration script (extend `migrate-to-appwrite.js` or use the admin panel). Wire `july-warriors.html` to fetch from Appwrite via `aw-firestore.js` instead of the inline array. This enables live additions from the admin panel without a code deploy.

**Priority 2 — Hyperlocal Discovery**
Map-based real-time alerts layer. Leaflet.js map with Appwrite `onSnapshot` on the `alerts` collection, filtered by district. Each alert is a map pin. Color-coded by type (blood, food, emergency). Admin panel already has alert submission.

**Priority 3 — Namaz-time Retention Engine**
Scheduled Appwrite function triggered at BD prayer times (Fajr, Zuhr, Asr, Maghrib, Isha — computed server-side using sun-calc). Sends targeted push notifications via `send-notification`. Payload type maps to existing `NOTIFICATION_TYPES` in `send-notification.js`.

**Priority 4 — Verified Contributor Badges**
Extend the `members` Appwrite collection with `trust_level` (0–3), `contributions`, `verified_by`. Admin panel badge grant UI. Badge displayed on warrior cards and forum posts. Trust level gates what content a user can submit without manual review.

**Priority 5 — AI Provider Failover**
`js/ai/aimaster.js` already has provider list. Add cascading fallback: Groq (primary) → OpenRouter → Gemini (via a new `gemini-proxy` Appwrite function). The Metro-Line health check already pings Groq; wire the fallback order to the dashboard status.

**Infrastructure note**
All free-tier: Appwrite (functions + hosting), Appwrite Cloud (Frankfurt), Cloudinary (media), Groq (AI), EmailJS (alerts), Cloudflare (DNS + email routing), GitHub (file storage + scheduled trigger source). No paid services required for Phase 2 features.
