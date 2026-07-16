# JOAF — Product Requirements Document (PRD)
**জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম**
Version: 2.0 | Platform: Appwrite Cloud (Frankfurt) | Last Updated: July 2026

---

## 1. Product Overview

JOAF (julyforum.com) is a fully autonomous Bengali-first civic publishing platform that distributes democracy, human rights, and public-interest content across **17 Facebook pages** simultaneously. The platform was born from the July 2024 uprising movement in Bangladesh and targets youth, activists, and the diaspora.

**Core Mission:** Deliver reliable civic information to Bangladeshi audiences — domestically and internationally — through an autonomous, zero-touch publishing pipeline that requires no daily human intervention.

**Current State (July 2026):**
- Autonomous publishing pipeline: ✅ working
- Video Reel generation: ✅ fixed (fb-autopost Meta upload URL bug resolved)
- Image card generation: ✅ working (SVG → @napi-rs/canvas → PNG)
- Facebook distribution: ✅ working (JOAF Main confirmed: video_id `1504975061432967`)
- Admin dashboard: ✅ at `/admin/index.html`
- Studio control center: ✅ at `/admin/studio.html`

---

## 2. Target Users

| Segment | Description | Primary Need |
|---|---|---|
| Bangladeshi youth (18–35) | Urban + rural, mobile-first | Reliable civic news in Bangla |
| July movement activists | Politically engaged, social-media heavy | Fast, shareable content |
| Diaspora (17 countries) | Bangladesh-origin, living abroad | Homeland connection + news |
| JOAF operators (Ash + team) | 1–3 admins | Zero-touch autonomous system |

---

## 3. Key Problems Solved

1. **Manual publishing bottleneck** → Eliminated via joaf-viral-os CRON automation (every 15 min)
2. **Bengali font rendering in server-side images** → Solved via @napi-rs/canvas + bundled NotoSerifBengali TTF fonts
3. **17-page simultaneous distribution** → Solved via fb-autopost with per-page token management
4. **Video Reel publishing** → Solved via Meta resumable upload API with Meta-provided `upload_url`
5. **Content freshness** → Solved via RSS aggregation from 10 Bengali/English sources + Wikipedia OnThisDay
6. **Content deduplication** → Solved via SHA256 fingerprint of normalized title (30-day rolling window)
7. **AI over-reliance failure** → Solved via circuit breaker + 3-provider cascade (OpenRouter → Gemini → Groq)

---

## 4. Functional Requirements

### 4.1 Autonomous Publishing Pipeline (joaf-viral-os)
- **FR-1:** Run every 15 minutes via Appwrite CRON (`*/15 * * * *`)
- **FR-2:** Collect RSS from 10 sources (Prothom Alo, BBC Bangla, DW Bangla, Jugantor, Samakal, Kaler Kantho, Bangla Tribune, Dhaka Tribune, Daily Star, Ittefaq)
- **FR-3:** Maintain a viral content pool (`viral_content_pool`) with minimum 20 pending items
- **FR-4:** Deduplicate via SHA256 fingerprint; reject if seen in last 30 days
- **FR-5:** Publish exactly 1 item per 15-min CRON cycle (anti-spam)
- **FR-6:** Every 6th post (`VIDEO_EVERY_N = 6`) trigger a video Reel instead of image
- **FR-7:** Support 30 content formats with weighted random selection
- **FR-8:** Route content to the most relevant pages using location scoring (`PAGE_LOCATION_MAP`)
- **FR-9:** AI cascade: OpenRouter (primary) → Gemini (fallback) → Groq (last resort)
- **FR-10:** Circuit breaker: block provider after 3 failures for 30 minutes

### 4.2 Image Card Generation (joaf-image-gen)
- **FR-11:** Generate 1080×1350 PNG cards with Bengali text
- **FR-12:** Support 42 badge types (breaking_news, democracy, civic_rights, etc.)
- **FR-13:** Support multiple color themes (breaking_red, news_blue, civic_purple, civic_gold, etc.)
- **FR-14:** Upload to Appwrite Storage bucket `fb_media`; return Appwrite file ID
- **FR-15:** No native binary packages; use SVG + @napi-rs/canvas only

### 4.3 Video Reel Generation (joaf-video-gen)
- **FR-16:** Generate 540×960 MP4 (Facebook-native vertical format, no upscale)
- **FR-17:** Supports 15s / 30s / 60s durations
- **FR-18:** 3-section structure: Hook text (0–3s), Body text (3–22s), CTA text (22–30s)
- **FR-19:** Bengali font support via NotoSerifBengali / HindSiliguri TTF in `fonts/` directory
- **FR-20:** Single-threaded ffmpeg (`-threads 1`) to fit 512MB RAM runtime
- **FR-21:** Upload MP4 to Appwrite Storage; return `video_file_id`

### 4.4 Facebook Auto-Publishing (fb-autopost)
- **FR-22:** Support actions: `post` (text/image), `video` (Reel), `carousel`, `check-token`, `get-pages`, `setup-token`
- **FR-23:** Distribute to all 17 pages simultaneously, with 1.5s gap between pages (anti-rate-limit)
- **FR-24:** For Reels: use Meta Graph API v22 resumable upload (start → upload binary via Meta-provided URL → finish)
- **FR-25:** Retry up to 3 times per page on `UploadRateLimitedError` with backoff
- **FR-26:** Support `pageIds` filter for targeted single-page posts
- **FR-27:** Store page tokens in `FB_PAGE_ACCESS_TOKENS` env var as JSON array

### 4.5 Analytics (joaf-analytics)
- **FR-28:** Run every 6 hours via CRON (`0 */6 * * *`)
- **FR-29:** Pull FB post insights (reach, reactions, comments, shares, saves) per page
- **FR-30:** Calculate Viral Score v2 per post
- **FR-31:** Track format/time/location performance and write to `publisher_config` collection for self-learning

### 4.6 Admin Dashboard (`/admin/index.html`)
- **FR-32:** Login-gated admin panel (ADMIN_SECRET_KEY = `ashjoafhimu123`)
- **FR-33:** Dark-mode UI in Bengali (Noto Sans Bengali)
- **FR-34:** Sections: Queue Monitor, Recent Posts, Analytics, Page Health, FB Config
- **FR-35:** Groq-proxy rate limiter interceptor to prevent 429 overruns

### 4.7 Studio Control Center (`/admin/studio.html`)
- **FR-36:** 4 iframed tool panels: News Card Generator, FB Smart Studio, FB Reel Studio, Viral OS Dashboard
- **FR-37:** System health indicator (green/red dot)
- **FR-38:** Reads Appwrite endpoint + project ID from `/appwrite.json` via `joaf-config.js`

### 4.8 Supporting Functions
- **FR-39:** `discover-leaders` — Daily (6 AM UTC) scrape + store Bangladeshi political leaders
- **FR-40:** `generate-timeline` — Daily (8 AM UTC) generate political event timelines
- **FR-41:** `update-leaders` — Daily (12 PM UTC) update leader profiles
- **FR-42:** `fb-scheduler` — Hourly scheduled post dispatch
- **FR-43:** `fb-insights` — Daily (10 AM UTC) engagement metrics pull
- **FR-44:** `daily-press-release` — Daily (5 PM UTC) press release SVG → Cloudinary → FB
- **FR-45:** `send-notification` — Push notification via VAPID (Firebase-free)
- **FR-46:** `groq-proxy` — AI gateway with rate limiting
- **FR-47:** `save-subscription` — PWA push subscription storage

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Uptime | 99%+ (Appwrite Cloud SLA) |
| Video generation time | < 60s (achieved: ~12.5s) |
| Image generation time | < 30s |
| Post distribution (17 pages) | < 90s (1.5s/page gap) |
| Memory per function | ≤ 512MB (Appwrite free tier) |
| Runtime per function | ≤ 300s timeout |
| Content freshness | New posts every 15 min |
| Dedup window | 30 days |
| AI fallback | < 3s to switch provider |

---

## 6. Out of Scope (Current Phase)
- Native mobile app (iOS/Android)
- Real-time live streaming
- User-generated content submission
- Paid/subscription tier
- Comment management / moderation
- Multi-language (non-Bengali) content
