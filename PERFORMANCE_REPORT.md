# JOAF Performance Report
## Audit Date: July 16, 2026

---

## Function Performance

| Function | Runtime | RAM Limit | Actual Usage | Encode Time | Status |
|----------|---------|-----------|--------------|-------------|--------|
| joaf-viral-os | node-18 | 512MB | ~180MB (est) | N/A | ✅ |
| joaf-image-gen | node-18 | 512MB | ~300MB | <30s | ✅ |
| joaf-video-gen | node-18 | 512MB | ~480MB | ~12.5s | ✅ (tight) |
| fb-autopost | node-22 | 512MB | <50MB | 90s (17 pages) | ✅ |
| joaf-analytics | node-18 | 512MB | <100MB | <30s | ✅ |
| groq-proxy | node-22 | 512MB | <20MB | <25s | ✅ |

### Critical Constraint: joaf-video-gen RAM
- Uses single-threaded ffmpeg (`-threads 1`) — this is intentional
- 540×960 resolution (no upscale) — critical for fitting 512MB
- **Do NOT change resolution to 1080×1920** without upgrading to Appwrite Pro

---

## Frontend Performance

### Largest Files (root public assets)

| File | Size | Notes |
|------|------|-------|
| july-warriors.html | 589KB | Large community member directory page |
| admin/index.html | 648KB | Monolithic admin panel — consider splitting in Phase 6 |
| july-family.html | 238KB | |
| leader-tracker.html | 138KB | |
| daily-press-release/index.js | 174KB | Contains embedded base64 JPEG (~150KB letterhead) |
| joaf_master_build.mjs | 93KB | Build script, not served to users |

### Optimization Opportunities

**High Priority:**
1. `admin/index.html` (648KB inline HTML) — monolithic structure means full repaint on tab switch.
   Phase 6 plan: split into separate HTML files loaded via iframe (already done for studio.html).

2. `daily-press-release/index.js` (174KB) — the base64 JPEG adds ~150KB to every cold start.
   Phase 7 plan: Store letterhead in Appwrite Storage, fetch at runtime with caching.

**Low Priority:**
3. `july-warriors.html` (589KB) — large community page. Consider pagination or lazy load.
4. `logoc7c3.png` (161KB) — could be compressed further or converted to WebP.

---

## Caching Strategy

### Service Worker (sw.js v11)
- Precaches 30 static pages on install
- Stale-while-revalidate for navigation
- No Appwrite API calls are cached (correct — they should always be fresh)
- Cache busting: update `CACHE = 'joaf-v12'` string when deploying

### Appwrite Functions
- `fb-autopost`: lazy-loads page tokens on first invocation (warm instance speedup) ✅
- `joaf-viral-os`: in-memory circuit breaker resets per cold start (acceptable for 15-min CRON)
- No Redis/external cache — correct for Appwrite free tier

---

## Network Performance

### Facebook Publishing (17 pages)
- Image posts: 1.5s gap between pages → 17 × 1.5s = ~25.5s
- Video Reels: 4s gap between pages → 17 × 4s = ~68s + upload time
- Total video publish time (single page): ~15s
- Total video publish time (all 17 pages): ~115s worst case
- **Risk**: 300s timeout. With 17 pages at 4s gap + upload + retry, may hit timeout for video.
- **Phase 7 recommendation**: Batch into 2 separate executions of 8-9 pages each.

### RSS Aggregation
- 10 sources fetched in parallel via `Promise.allSettled` ✅
- 10s timeout per source ✅
- Failed sources don't block the pipeline ✅

---

## Core Web Vitals (Public Pages)

Not measured (no analytics tooling in scope). Recommendations:
- Run Lighthouse on index.html, joaf-polls.html (highest traffic pages)
- Target: LCP < 2.5s, CLS < 0.1, FID < 100ms
- Main risk: Large inline JS in HTML pages (components.js 106KB, plugins.js 113KB)
