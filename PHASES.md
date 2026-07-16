# JOAF — Development Phases & Roadmap
**জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম**
Version: 2.0 | July 2026

---

## Phase Status Summary

| Phase | Name | Status | Period |
|---|---|---|---|
| Phase 0 | Foundation (Netlify + Firebase) | ✅ Complete | Early 2025 |
| Phase 1 | Appwrite Migration | ✅ Complete | May 2026 |
| Phase 2 | Autonomous Publishing OS | ✅ Complete | June 2026 |
| Phase 3 | Media Generation (Image + Video) | ✅ Complete | June–July 2026 |
| Phase 4 | Video Reel Publishing Fix | ✅ Complete | July 14, 2026 |
| Phase 5 | Analytics & Self-Learning | 🔄 In Progress | July 2026 |
| Phase 6 | Admin UX Polish | ⏳ Planned | Aug 2026 |
| Phase 7 | Scale & Reliability | ⏳ Planned | Sep 2026 |

---

## Phase 0 — Foundation (Netlify + Firebase) ✅

**Period:** Early–Mid 2025  
**Goal:** Launch JOAF as a static civic platform

**Delivered:**
- julyforum.com deployed on Netlify + Cloudflare CDN
- Firebase Firestore as database (10 collections)
- Static pages: blood donor tracker, marketplace, jobs, polls, leader tracker
- News card generator (client-side SVG)
- Push notifications via VAPID (Firebase-free)
- Facebook Graph API integration (basic posting)
- PWA service worker (offline cache, push)
- AI cascade: Gemini primary, Groq fallback (via `aimaster.js`)

**Tech Stack:**
- Netlify static hosting
- Firebase Firestore
- Cloudinary CDN
- GitHub Actions CI/CD

---

## Phase 1 — Appwrite Migration ✅

**Period:** May–June 2026  
**Goal:** Migrate all compute from Netlify serverless → Appwrite Functions; DB from Firebase → Appwrite

**Delivered:**
- Migrated 10 Firestore collections → Appwrite DB (`joaf` database)
- Rewrote 14 Netlify functions → Appwrite Functions (ESM format)
- Fixed push notification system (VAPID-only, Firebase-free)
- Resolved service worker cross-origin interference
- Built JOAF Studio admin panel (`/admin/studio.html`)
- FB auto-posting pipeline (17 pages, Graph API v22 token management)
- Long-lived page token derivation via FB_USER_TOKEN

**Key Technical Decisions:**
- Appwrite Frankfurt region (`fra.cloud.appwrite.io`) for EU data residency
- node-22 for most functions (node-18 for native binary functions)
- `FB_PAGE_ACCESS_TOKENS` JSON array env var for token storage
- `ADMIN_SECRET_KEY` = `ashjoafhimu123` for admin gate

---

## Phase 2 — Autonomous Publishing OS ✅

**Period:** June 2026  
**Goal:** Zero-touch 24/7 publishing without human intervention

**Delivered:**
- `joaf-viral-os`: 80KB orchestrator function (CRON */15 * * * *)
- RSS aggregation from 10 Bengali + English news sources
- Wikipedia OnThisDay API integration
- SHA256 fingerprint deduplication (30-day rolling window)
- 30 content formats with weighted random selection
- AI cascade with circuit breaker (OpenRouter → Gemini → Groq)
- Location-aware page routing (17 pages × district keywords)
- Queue buffer system (min 20 pending, target 20)
- Publish exactly 1 item per 15-min cycle (anti-spam)
- `viral_content_pool` + `viral_publish_queue` + `viral_publish_log` collections
- `publisher_config` collection for self-learning format weights

**Key Numbers:**
- 4 posts/hour maximum
- 96 posts/day maximum (in practice ~48/day with content diversity checks)
- 30 content formats, 7 category weights
- AI rate limit: 2 calls/min, 5 calls/15min

---

## Phase 3 — Media Generation (Image + Video) ✅

**Period:** June–July 2026  
**Goal:** Auto-generate visual assets (PNG cards + MP4 reels) for each post

### Phase 3A — Image Generation ✅

**Delivered:**
- `joaf-image-gen`: 25KB function, node-18 runtime
- @napi-rs/canvas for server-side Canvas API (no headless browser)
- NotoSerifBengali + HindSiliguri TTF bundled in `fonts/` directory
- 42 badge types × multiple color themes
- 1080×1350 PNG output (Facebook square-ish format)
- Upload to Appwrite Storage `fb_media` bucket
- Cloudinary fallback for press-release SVGs

**Key Fix:** Bengali font rendering required bundled TTF files; system fonts do not work in Appwrite's Alpine Linux runtime.

### Phase 3B — Video Reel Generation ✅

**Delivered:**
- `joaf-video-gen`: 29KB function, node-18 runtime
- @napi-rs/canvas for frame rendering
- ffmpeg-static + fluent-ffmpeg for MP4 encoding
- 3-section structure: Hook / Body / CTA
- 540×960 native Facebook vertical resolution
- Single-threaded encoding (`-threads 1`) for 512MB RAM constraint
- 15s / 30s / 60s duration support
- Upload to Appwrite Storage; return `video_file_id`
- Average encode time: ~12.5s for 15s video

**Key Fix:** Removed 1080×1920 upscale that caused OOM in 512MB runtime. Using ffmpeg single-thread to prevent frame-buffer overflow.

---

## Phase 4 — Video Reel Publishing Fix ✅

**Period:** July 14, 2026  
**Goal:** Fix broken Reel publishing (video_id was generated but never reaching Facebook)

**Root Cause Analysis:**

Two separate bugs:

**Bug 1 (joaf-video-gen):** Function timing out at 30–33s before MP4 was fully encoded.
- Fix: Switched to 540×960 native (no upscale), single-threaded ffmpeg
- Result: Encode completes in ~12.5s ✅

**Bug 2 (fb-autopost):** Upload URL constructed incorrectly.
- Old code: `https://rupload.facebook.com/video-upload/v21.0/{upload_session_id}` (field doesn't exist)
- Correct flow: Meta's `/video_reels?upload_phase=start` returns `{ video_id, upload_url }` — must use the returned `upload_url` directly
- Fix: Use `initData.upload_url` from start response
- Result: Binary upload succeeds ✅

**Additional Bug (Appwrite platform):** Deployment stuck in "building/processing" queue.
- Fix: Delete stuck deployment, create fresh deployment
- Result: Deployment activates in ~30s ✅

**Verified End-to-End Test:**
```
✅ joaf-video-gen: 103KB MP4 generated in 12.5s, stored as vid_1784004705288
✅ fb-autopost: Reel published to JOAF Main page as video_id 1504975061432967
✅ Duration: 15.2s total for single-page publish
```

**Commits:**
- `41fb810` — 540×960 encode, single-thread ffmpeg, encoder logs
- `fix: use Meta-provided Reel upload URL` — use initData.upload_url

---

## Phase 5 — Analytics & Self-Learning 🔄

**Period:** July 2026 (ongoing)  
**Goal:** Close the feedback loop; optimize content format by performance data

**In Progress:**
- `joaf-analytics` runs every 6 hours ✅
- Pulls FB post insights (reach, reactions, comments, shares, saves) ✅
- Calculates Viral Score v2 per post ✅
- `best_formats_by_hour` map ✅
- `best_formats_by_location` map ✅

**Pending:**
- `publisher_config` self-learning: adjust FORMAT_WEIGHTS based on analytics data
- A/B testing between content formats
- Dashboard visualization of analytics in admin panel
- Alert when viral score drops below threshold

---

## Phase 6 — Admin UX Polish ⏳

**Period:** August 2026  
**Goal:** Admin panel improvements for easier daily operations

**Planned:**
- Real-time queue monitor (WebSocket or polling)
- Manual content injection UI (add item to queue)
- Per-page analytics dashboard in admin
- FB token expiry alerts (long-lived tokens expire every ~60 days)
- Deployment health check automation
- Error notification to admin (Telegram/email)
- Studio tool: manual Reel composer with preview

---

## Phase 7 — Scale & Reliability ⏳

**Period:** September 2026  
**Goal:** Production-hardening for sustained 24/7 operation

**Planned:**
- Appwrite Pro upgrade for higher concurrency + DB quota
- Multi-region CDN for media assets
- Automatic FB token refresh before expiry
- Rate limit handling: spread 17-page upload over multiple function executions
- Dead letter queue for failed posts
- Monitoring: Appwrite webhook → Telegram alerts on function failures
- Content moderation pre-publish filter
- Backup publishing path (Cloudinary-hosted video for fallback)

---

## Current Known Issues (July 16, 2026)

| Issue | Severity | Status |
|---|---|---|
| Some pages still fail with `UploadRateLimitedError` when all 17 upload simultaneously | Medium | Partially fixed (3× retry); needs staggered uploads |
| `ProcessingFailedError: invalid video id` for some pages in rapid succession | Medium | Fixed (correct upload_url); may recur if session times out |
| `.venv` visible in VS Code terminal — Python virtualenv from a separate project | Low | Not related to JOAF; safe to ignore or deactivate |
| FB_PAGE_ACCESS_TOKENS need refresh every ~60 days | Medium | Manual process; no auto-refresh yet |
| joaf-analytics DB read quota can be hit on free tier | Low | Batch reads implemented; monitor |
