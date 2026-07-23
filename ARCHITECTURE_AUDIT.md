# JOAF Architecture Audit
## Audit Date: July 16, 2026

---

## Repository Structure (Cleaned)

```
JOAF/
├── appwrite.json              ← Appwrite project config (21 functions, collections)
├── appwrite-functions/        ← Serverless functions (deployed to Appwrite Cloud)
│   ├── joaf-viral-os/         ← Main orchestrator (CRON */15 * * * *)
│   ├── joaf-image-gen/        ← PNG card generator (HTTP, node-18)
│   ├── joaf-video-gen/        ← MP4 reel generator (HTTP, node-18)
│   ├── fb-autopost/           ← 17-page Facebook publisher (HTTP, node-22)
│   ├── fb-autopost/           ← 17-page Facebook publisher (HTTP, node-22)
│   ├── joaf-analytics/        ← FB insights + Viral Score (CRON 0 */6)
│   ├── groq-proxy/            ← AI gateway OpenRouter→Gemini→Groq (HTTP, node-22)
│   ├── daily-press-release/   ← SVG press release → Cloudinary → FB (CRON 0 17)
│   ├── fb-scheduler/          ← Scheduled post dispatch (CRON 0 *)
│   ├── fb-config/             ← Token management (HTTP, node-22)
│   ├── fb-insights/           ← Engagement metrics (CRON 0 10)
│   ├── discover-leaders/      ← BD leader scrape (CRON 0 6)
│   ├── generate-timeline/     ← Timeline generation (CRON 0 8)
│   ├── update-leaders/        ← Leader profile updates (CRON 0 12)
│   ├── send-notification/     ← Push notifications (HTTP, node-22)
│   ├── save-subscription/     ← Push subscription storage (HTTP, node-22)
│   ├── groq-proxy/            ← AI proxy (HTTP, node-22)
│   ├── fetch-rss/             ← RSS proxy (HTTP, node-22)
│   ├── get-stats/             ← Platform stats (HTTP, node-22)
│   ├── github-upload/         ← GitHub file upload (HTTP, node-22)
│   ├── hf-video-proxy/        ← HuggingFace proxy (HTTP, node-22)
│   ├── press-release-og/      ← OG meta generator (HTTP, node-22)
│   └── vote/                  ← Civic poll votes (HTTP, node-22)
├── admin/                     ← Admin panel (auth-gated, not public)
│   ├── index.html             ← Master admin dashboard (648KB)
│   ├── studio.html            ← Studio control center
│   └── js/                    ← Admin JS: joaf-init.js, admin-init.js, studio-init.js
├── tools/                     ← Manually-invoked admin tools
│   ├── viral-os-dashboard.html ← Pipeline monitor
│   ├── publisher-dashboard.html ← Publisher control
│   ├── news-card-generator.html ← Card preview generator
│   ├── fb-smart-studio.html   ← FB post composer
│   ├── fb-reel-studio.html    ← Reel composer
│   └── manual/                ← Same tools but with inline API key (deprecated)
├── js/                        ← Public-facing JS modules
│   ├── joaf-config.js         ← Reads appwrite.json, sets JOAF_CONFIG global
│   ├── appwrite-db.js         ← Appwrite DB client helpers
│   ├── components.js          ← UI components (106KB)
│   ├── data.js                ← Data layer (39KB)
│   ├── bn-search.js           ← Bengali full-text search (46KB)
│   ├── ai/aimaster.js         ← Client-side AI orchestration
│   ├── queue/fbpublisher.js   ← FB publish queue (client-side)
│   └── queue/queuesystem.js   ← Queue management
├── css/                       ← Global stylesheets
│   ├── joaf.css               ← Main styles (55KB)
│   ├── stylec7c3.css          ← Generated styles (59KB)
│   └── pluginsc7c3.css        ← Plugin styles (48KB)
├── press-releases/            ← Static press release pages
├── scripts/                   ← Deployment scripts
│   ├── bootstrap.js           ← Appwrite DB init (idempotent)
│   ├── clean.js               ← Clean build artifacts
│   └── verify.js              ← Health check
├── sw.js                      ← Service worker (PWA, cache v11)
├── site.webmanifest           ← PWA manifest
├── package.json               ← Root scripts (deploy, bootstrap, verify)
├── SECRETS_SETUP.md           ← Credential setup guide
├── CHANGELOG.md               ← This release changes
├── SECURITY_REPORT.md         ← Security audit findings
├── PERFORMANCE_REPORT.md      ← Performance analysis
└── ARCHITECTURE_AUDIT.md      ← This file
```

---

## Key Architectural Decisions (Validated)

### 1. Appwrite-first serverless
All compute runs as Appwrite Functions. No traditional web server. ✅
- **Pro**: Appwrite handles auth, scaling, CRON, storage
- **Con**: No shared code between functions (vendored copies of aw-utils.js)
- **Verdict**: Correct architecture for free tier + zero-ops requirement

### 2. In-memory circuit breaker in joaf-viral-os
The AI circuit breaker (`_aiState`) lives in memory. This means it resets on cold starts.
- **Impact**: Each CRON invocation (every 15 min) gets a fresh circuit state
- **Verdict**: Acceptable for 15-min CRON. Would matter more for HTTP functions.
- **Phase 5 improvement**: Store circuit state in `publisher_config` Appwrite collection

### 3. joaf-viral-os is both orchestrator AND content generator
The 80KB function handles: RSS collection, AI generation, image/video coordination,
Facebook publishing dispatch. This is a deliberate mono-function design.
- **Pro**: One deployment, one CRON, one log stream to watch
- **Con**: Large file, hard to unit test sections in isolation
- **Verdict**: Acceptable at this scale. Phase 6 could split into microservices.

### 4. Async fb-autopost with reconciliation pattern
Publishing is decoupled: viral-os dispatches → fb-autopost executes async → 
next CRON reconciles results. This prevents 300s timeout on 17-page Reel uploads.
- **Verdict**: Correct pattern ✅

### 5. Queue-first publishing
Content goes: pool → queue → publish. The queue acts as a buffer against:
- AI provider outages (fall back to evergreen content)
- Rate limit bursts (drain queue at controlled 15-min pace)
- **Verdict**: Correct architecture ✅

---

## Code Quality Assessment

### Strengths
- Consistent ESM format across all functions (`type: "module"`)
- Good error handling in fb-autopost (retry with backoff)
- joaf-viral-os has evergreen fallback content for zero-AI operation
- admin-init.js properly stores ADMIN_KEY in memory, not hardcoded
- groq-proxy handles all 3 AI providers with consistent response format

### Areas for Improvement (Phase 6)
1. **admin/index.html (648KB)**: Monolithic — all tabs rendered on initial load.
   Target: Split into separate tool pages loaded on demand.
   
2. **aw-utils.js duplication**: 7 copies across functions. Acceptable for Appwrite's 
   deployment model but creates maintenance burden when API changes.
   
3. **joaf-viral-os buildPrompt()**: 30 format strings defined inline. Extract to a 
   separate `formats.js` module for easier content strategy updates.

4. **No structured logging**: Functions use Appwrite's `log()` and `error()` which 
   write to Appwrite's execution log. A centralized log format would help debugging.

---

## Dependency Map

```
joaf-viral-os (CRON)
    │
    ├── calls joaf-image-gen (HTTP) → Appwrite Storage (fb_media bucket)
    ├── calls joaf-video-gen (HTTP) → Appwrite Storage (fb_media bucket)  
    ├── calls fb-autopost (HTTP async) → Facebook Graph API v22
    └── reads/writes → Appwrite DB (joaf database)
                         ├── viral_content_pool
                         ├── viral_publish_queue
                         ├── viral_publish_log
                         └── publisher_config

joaf-analytics (CRON 0 */6)
    ├── reads → Appwrite DB (analytics_posts, viral_publish_log)
    ├── reads → Facebook Insights API
    └── writes → publisher_config (self-learning weights)

daily-press-release (CRON 0 17)
    ├── calls AI cascade (OpenRouter→Gemini→Groq)
    ├── uploads SVG → Cloudinary
    └── calls fb-autopost → Facebook

Admin frontend (browser)
    ├── reads appwrite.json → sets JOAF_CONFIG
    ├── calls groq-proxy (via join_aw_exec) for AI
    └── calls all HTTP functions via Appwrite executions API

Public frontend (browser)
    ├── reads appwrite.json → sets JOAF_CONFIG
    ├── calls vote, fetch-rss, get-stats, send-notification
    └── registers push → save-subscription
```

---

## Collections Schema Summary

| Collection | Documents | Key Indexes | Notes |
|-----------|-----------|-------------|-------|
| viral_content_pool | RSS items | fp, queued, created_at | 30-day dedup window |
| viral_publish_queue | Publish jobs | status, created_at | Drain at 1/15min |
| viral_publish_log | History | fp, published_at | Analytics source |
| publisher_config | Config/weights | key | Self-learning |
| leaders | BD politicians | name | Daily scraped |
| timelines | Event timelines | date | Daily generated |
| analytics_posts | FB metrics | post_id, page_id | 6-hourly |
| push_subscriptions | Push endpoints | endpoint | PWA push |
