# JOAF — System Architecture
**জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম**
Version: 2.0 | July 2026

---

## 1. Architecture Overview

JOAF is a **serverless event-driven publishing system** built entirely on Appwrite Cloud. There is no traditional web server — all compute runs as Appwrite Functions triggered by CRON or HTTP. The frontend (admin panel + public site) is static HTML/JS served by Netlify/GitHub Pages, communicating with Appwrite over the public API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC INTERNET                          │
│                                                                 │
│  julyforum.com (Netlify/GH Pages)          Facebook (17 pages)  │
│  ┌──────────────────────┐                 ┌──────────────────┐  │
│  │ Static Frontend       │                 │ Graph API v22    │  │
│  │ /admin/index.html     │                 │ Posts + Reels    │  │
│  │ /admin/studio.html    │                 └────────┬─────────┘  │
│  │ /tools/*.html         │                          │            │
│  └──────────┬───────────┘                          │            │
└─────────────┼────────────────────────────────────────────────────┘
              │ HTTPS REST
              ▼
┌─────────────────────────────────────────────────────────────────┐
│             APPWRITE CLOUD (Frankfurt fra.cloud.appwrite.io)    │
│             Project: 6a11b6cd000b59f318eb                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    APPWRITE FUNCTIONS                     │   │
│  │                                                           │   │
│  │  ┌─────────────────────┐  CRON */15 * * * *              │   │
│  │  │  joaf-viral-os      │──────────────────────────────┐  │   │
│  │  │  (node-18, 512MB)   │  Orchestrator / Brain        │  │   │
│  │  │  80KB index.js      │                              │  │   │
│  │  └──────┬──────────────┘                              │  │   │
│  │         │ calls                                        │  │   │
│  │    ┌────┴────────┬──────────────┐                     │  │   │
│  │    ▼             ▼              ▼                     │  │   │
│  │  joaf-image-gen  joaf-video-gen  fb-autopost          │  │   │
│  │  (node-18)       (node-18)       (node-22)            │  │   │
│  │  25KB            29KB            16KB                  │  │   │
│  │  @napi-rs/canvas @napi-rs/canvas Graph API v22        │  │   │
│  │  PNG → Storage   ffmpeg → Storage 17 pages            │  │   │
│  │                                                        │  │   │
│  │  ── Scheduled ─────────────────────────────────────── │  │   │
│  │  discover-leaders  (0 6 * * *)   node-22  300s        │  │   │
│  │  generate-timeline (0 8 * * *)   node-22  300s        │  │   │
│  │  update-leaders    (0 12 * * *)  node-22  300s        │  │   │
│  │  fb-scheduler      (0 * * * *)   node-22   60s        │  │   │
│  │  fb-insights       (0 10 * * *)  node-22  120s        │  │   │
│  │  daily-press-release(0 17 * * *) node-22   60s        │  │   │
│  │  joaf-analytics    (0 */6 * * *) node-18  120s        │  │   │
│  │                                                        │  │   │
│  │  ── HTTP-only ─────────────────────────────────────── │  │   │
│  │  vote, send-notification, fb-config, fetch-rss        │  │   │
│  │  get-stats, groq-proxy, hf-video-proxy                │  │   │
│  │  github-upload, save-subscription, press-release-og   │  │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                                                                 │
│  ┌────────────────────┐   ┌──────────────────────────────┐     │
│  │   DATABASE (joaf)  │   │    STORAGE                   │     │
│  │                    │   │    Bucket: fb_media           │     │
│  │  viral_content_pool│   │    - PNG cards (joaf-image)  │     │
│  │  viral_publish_queue   │    - MP4 reels (joaf-video)  │     │
│  │  viral_publish_log │   │    vid_XXXXXXXXXX file IDs   │     │
│  │  publisher_config  │   └──────────────────────────────┘     │
│  │  leaders           │                                        │
│  │  timelines         │                                        │
│  │  analytics_posts   │                                        │
│  │  push_subscriptions│                                        │
│  └────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
│                                                                 │
│  Cloudinary (dou71pfe1)   OpenRouter     Gemini API            │
│  CDN for press-release    Primary AI     Fallback AI           │
│  images + video SVGs      (OR_KEY)       (GEM_KEY)             │
│                                                                 │
│  Groq API                 Wikipedia API  RSS Feeds (10 sources) │
│  Last-resort AI           OnThisDay      Prothom Alo, BBC etc. │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Flow: Autonomous Publishing Cycle

Every 15 minutes, joaf-viral-os executes a 3-step cycle:

```
CRON trigger (*/15 * * * *)
        │
        ▼
[STEP 1: RECONCILE]
  Check dispatched items in viral_publish_queue
  → Poll fb-autopost execution status
  → Finalize (log success) or mark failed
        │
        ▼
[STEP 2: COLLECT]
  Fetch RSS from 10 sources simultaneously
  + Wikipedia OnThisDay API
  → Parse titles, descriptions, links
  → SHA256 fingerprint dedup (30-day window)
  → Write new items to viral_content_pool
        │
        ▼
[STEP 3: FILL QUEUE]
  Count pending items in viral_publish_queue
  If count < 20 (QUEUE_MIN):
    → Pick content from pool
    → Call AI (OpenRouter→Gemini→Groq) to generate Bengali post
    → Pick format by weighted random (30 formats)
    → For VIDEO_EVERY_N=6 items: call joaf-video-gen
    → For others: call joaf-image-gen (PNG card)
    → Write to viral_publish_queue (status: pending)
        │
        ▼
[STEP 4: PUBLISH ONE]
  Get oldest pending item from queue
  → Mark as processing (prevent double-publish)
  → If video: call fb-autopost action=video
  → If image: call fb-autopost action=post (imageUrl)
  → If text: call fb-autopost action=post (text-only)
  → fb-autopost runs ASYNC → returns execId
  → Mark queue item as dispatched (reconcile next cycle)
        │
        ▼
[STEP 5: LOG]
  On completion: write to viral_publish_log
  → fp, format, page_count, status, published_at
```

---

## 3. Video Reel Publishing Flow (Fixed)

This was the critical bug fixed in this session:

```
joaf-viral-os detects VIDEO_EVERY_N slot
        │
        ▼
Calls joaf-video-gen (async HTTP)
        │
        ▼
joaf-video-gen:
  1. registerFonts() — NotoSerifBengali, HindSiliguri from /fonts/
  2. @napi-rs/canvas: draw 540×960 frames (Hook, Body, CTA sections)
  3. ffmpeg-static: encode frames → MP4
     - Resolution: 540×960 (Facebook native, no upscale!)
     - Threads: 1 (fits 512MB RAM)
     - Duration: 15s (default)
  4. Upload MP4 to Appwrite Storage (bucket: fb_media)
  5. Return { ok: true, video_file_id: "vid_XXXXXXXXX" }
        │
        ▼
joaf-viral-os stores video_file_id in viral_publish_queue
        │
        ▼
(Next cycle or immediate) fb-autopost action=video
        │
        ▼
fb-autopost (for each of 17 pages):
  Step 1: Download MP4 from Appwrite Storage (~103KB)
  Step 2: For each page:
    a. POST /PAGE_ID/video_reels { upload_phase: start }
       → Receive: { video_id, upload_url }  ← KEY: use Meta's upload_url!
    b. POST upload_url (binary, Content-Type: application/octet-stream)
       Headers: Authorization: OAuth TOKEN, offset: 0, file_size: N
       → Receive: { success: true }
    c. POST /PAGE_ID/video_reels { upload_phase: finish, video_id,
       video_state: PUBLISHED, description: caption }
  Step 3: 4s gap between pages (REEL_PAGE_GAP_MS)
  Step 4: Retry up to 3x on UploadRateLimitedError
```

**The bug that was fixed:** Old code constructed upload URL as
`https://rupload.facebook.com/video-upload/v21.0/{upload_session_id}` 
using a non-existent field. Meta's API returns the complete `upload_url` 
in the start response — must use that directly.

---

## 4. Component Inventory

### 4.1 Appwrite Functions (21 total)

| Function ID | Runtime | Schedule | Timeout | Purpose |
|---|---|---|---|---|
| `joaf-viral-os` | node-18 | `*/15 * * * *` | 300s | Main orchestrator |
| `joaf-image-gen` | node-18 | HTTP only | 120s | PNG card generator |
| `joaf-video-gen` | node-18 | HTTP only | 300s | MP4 reel generator |
| `joaf-analytics` | node-18 | `0 */6 * * *` | 120s | FB insights analytics |
| `fb-autopost` | node-22 | HTTP only | 300s | 17-page FB publisher |
| `fb-scheduler` | node-22 | `0 * * * *` | 60s | Scheduled post dispatch |
| `fb-insights` | node-22 | `0 10 * * *` | 120s | Engagement metrics |
| `fb-config` | node-22 | HTTP only | 15s | Token management |
| `discover-leaders` | node-22 | `0 6 * * *` | 300s | Leader discovery |
| `generate-timeline` | node-22 | `0 8 * * *` | 300s | Timeline generation |
| `update-leaders` | node-22 | `0 12 * * *` | 300s | Leader profile updates |
| `daily-press-release` | node-22 | `0 17 * * *` | 60s | Press release SVG pipeline |
| `send-notification` | node-22 | HTTP only | 30s | Push notifications |
| `groq-proxy` | node-22 | HTTP only | 30s | AI gateway |
| `fetch-rss` | node-22 | HTTP only | 15s | RSS proxy |
| `get-stats` | node-22 | HTTP only | 15s | Platform stats |
| `vote` | node-22 | HTTP only | 15s | Civic poll votes |
| `hf-video-proxy` | node-22 | HTTP only | 60s | HuggingFace proxy |
| `github-upload` | node-22 | HTTP only | 30s | GitHub file upload |
| `save-subscription` | node-22 | HTTP only | 15s | Push subscription save |
| `press-release-og` | node-22 | HTTP only | 15s | OG meta generator |

### 4.2 Frontend Files

| Path | Purpose |
|---|---|
| `/admin/index.html` | Master admin dashboard (dark mode, Bengali) |
| `/admin/studio.html` | Studio control center (4-panel iframe layout) |
| `/admin/js/joaf-init.js` | Admin init + Groq rate limit interceptor |
| `/admin/js/admin-init.js` | Admin panel initialization |
| `/admin/js/studio-init.js` | Studio health check |
| `/js/joaf-config.js` | Reads appwrite.json, exposes JOAF_CONFIG global |
| `/js/appwrite-db.js` | Appwrite DB client helpers |
| `/js/components.js` | UI component library |
| `/js/data.js` | Data fetching layer |
| `/js/bn-search.js` | Bengali full-text search |
| `/js/ai/aimaster.js` | Client-side AI orchestration |
| `/js/queue/fbpublisher.js` | Client-side FB publish queue |
| `/js/queue/queuesystem.js` | Queue management |
| `/tools/news-card-generator.html` | Manual card generation tool |
| `/tools/fb-smart-studio.html` | FB post composition |
| `/tools/fb-reel-studio.html` | Reel generation studio |
| `/tools/viral-os-dashboard.html` | Viral OS pipeline monitor |
| `/appwrite.json` | Appwrite project config (functions, vars) |
| `/sw.js` | Service worker (PWA + push notifications) |

### 4.3 Appwrite Database Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `viral_content_pool` | Raw harvested content | fp, title, body, source, format, queued |
| `viral_publish_queue` | Ready-to-publish items | fp, format, caption, jpg_url, video_file_id, status, created_at |
| `viral_publish_log` | Published post history | fp, format, page_count, status, published_at |
| `publisher_config` | Self-learning config + format weights | key, value, updated_at |
| `leaders` | BD political leaders | name, party, role, photo, updated_at |
| `timelines` | Political event timelines | title, events, date |
| `analytics_posts` | Per-post FB metrics | post_id, page_id, reach, reactions, viral_score |
| `push_subscriptions` | PWA push endpoints | endpoint, auth, p256dh |

### 4.4 Appwrite Storage

| Bucket | Contents | Used by |
|---|---|---|
| `fb_media` | PNG cards (1080×1350) + MP4 reels (540×960) | joaf-image-gen, joaf-video-gen, fb-autopost |

### 4.5 External Services

| Service | Usage | Credentials |
|---|---|---|
| Cloudinary (`dou71pfe1`) | Press-release SVG hosting | CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET |
| OpenRouter | Primary AI (Bengali text generation) | OPENROUTER_API_KEY |
| Google Gemini | Fallback AI | GEMINI_API_KEY |
| Groq | Last-resort AI | GROQ_API_KEY |
| Facebook Graph API v22 | Post + Reel publishing | FB_PAGE_ACCESS_TOKENS (17 pages) |
| Wikipedia API | OnThisDay events | Public (no key) |
| HuggingFace | Video generation proxy | HF_TOKEN |

---

## 5. 17 Facebook Pages (Location Map)

| Page ID | Name | Region | Weight |
|---|---|---|---|
| 901104276426275 | JOAF Main | national | 1.0 |
| 747955745072916 | Jamalpur | mymensingh | 1.2 |
| 698945426644829 | Madaripur | dhaka_div | 1.2 |
| 774087689120805 | Middle East | diaspora | 1.1 |
| 800066663185559 | Cumilla | chittagong_div | 1.2 |
| 767070709830635 | Europe | diaspora | 1.1 |
| 819591557896069 | Australia | diaspora | 1.1 |
| 771297736066387 | Rangpur | rangpur_div | 1.2 |
| 811857228669187 | Asia | diaspora | 1.1 |
| 821514351035673 | Canada | diaspora | 1.1 |
| 742860382250359 | Gazipur | dhaka_metro | 1.3 |
| 819346937917703 | Khulna | khulna_div | 1.2 |
| 668493799674686 | USA | diaspora | 1.1 |
| 547243828481347 | Chattogram | chittagong_div | 1.3 |
| 586562744547226 | Rajshahi | rajshahi_div | 1.2 |
| 607102832487121 | Barishal | barishal_div | 1.2 |
| 599649799896567 | Mymensingh | mymensingh_div | 1.2 |

---

## 6. Security Architecture

- **Admin auth:** `ADMIN_SECRET_KEY` env var (`ashjoafhimu123`) — change in production
- **Function auth:** Appwrite API key (`standard_4b67a7b75a3aea21254c6c866601aad3f30784f8818e5f9ec024ff27f64956f9...`)
- **FB tokens:** Stored in `FB_PAGE_ACCESS_TOKENS` env var (long-lived page tokens)
- **Push notifications:** VAPID keys (Firebase-free), stored in `VAPID_PRIVATE_KEY`/`VAPID_PUBLIC_KEY`
- **Rate limiting:** Client-side Groq cooldown (60s after 429), server-side circuit breaker

---

## 7. Known Limitations & Constraints

| Issue | Impact | Mitigation |
|---|---|---|
| 512MB RAM per function | Can't do 1080p video encode | Use 540×960 native + single-threaded ffmpeg |
| node-18 runtime for video/image | No newer Canvas APIs | Locked to @napi-rs/canvas 0.1.53 |
| FB Upload Rate Limit (10 rps) | Reel upload can fail for some pages | Retry 3× with backoff |
| Appwrite free tier DB read quota | Analytics can hit limits | Batch reads, avoid per-doc loops |
| CRON minimum 15min on free tier | Can't post more than 4×/hour | Acceptable for anti-spam reasons |
| Appwrite deployment queue | Deployments can get stuck in "building" | Delete + redeploy to unstick |
