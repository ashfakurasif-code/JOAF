# JOAF — Operational Memory & Session Reference
**জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম**
For: Claude (and operators) — carry this forward to every new session
Last Updated: July 16, 2026

---

## 🔴 CRITICAL: Read This First

This document is the **source of truth** for JOAF operations. Before making any change, verify current state by checking Appwrite. Never assume memory from a previous session is current — deployment IDs, file IDs, and execution states change constantly.

**Owner:** Ashfakur Rahaman (Ash)  
**Appwrite Project:** `6a11b6cd000b59f318eb` (Frankfurt)  
**API Base:** `https://fra.cloud.appwrite.io/v1`  
**API Key:** `standard_4b67a7b75a3aea21254c6c866601aad3f30784f8818e5f9ec024ff27f64956f967814886192e7ce5079e67e557988e53840de1bdc2d503d39f1d3aebeccab47a30df90af576b0d91ae362203d644599f3c0b7d42277f10a3c264fc3be5ab6f04d770d959d1d318315a1cdc19f7d041a911fcb0208c3cb37f52bad824535e9b4b`

---

## ✅ What Works As Of July 14, 2026

| Component | Status | Last Verified |
|---|---|---|
| joaf-viral-os | ✅ Running (CRON */15) | July 14, 2026 |
| joaf-image-gen | ✅ Working | June 2026 |
| joaf-video-gen | ✅ Fixed (540×960, single-thread) | July 14, 2026 |
| fb-autopost (image) | ✅ Working | June 2026 |
| fb-autopost (video/Reel) | ✅ Fixed (Meta upload_url bug) | July 14, 2026 |
| JOAF Main page Reel | ✅ Confirmed video_id 1504975061432967 | July 14, 2026 |
| Admin dashboard | ✅ Running | June 2026 |
| Analytics (joaf-analytics) | ✅ Running (6-hourly) | June 2026 |

---

## 🐛 Bugs Fixed This Session (July 14, 2026)

### Bug 1: joaf-video-gen OOM timeout
**Symptom:** Function terminated at 30–33s before MP4 finished  
**Root cause:** 1080×1920 upscale + multi-threaded ffmpeg exceeded 512MB RAM  
**Fix:** Use 540×960 native resolution, `-threads 1`  
**Commit:** `41fb810`

### Bug 2: fb-autopost invalid upload URL
**Symptom:** All pages: `invalid video id was provided` / `UploadRateLimitedError`  
**Root cause:** Code built URL as `https://rupload.facebook.com/video-upload/v21.0/{upload_session_id}` — field `upload_session_id` doesn't exist in Meta's response  
**Fix:** Meta's `POST /PAGE_ID/video_reels?upload_phase=start` returns `{ video_id, upload_url }`. Use `initData.upload_url` directly  
**Commit:** `fix: use Meta-provided Reel upload URL`

### Bug 3: Appwrite deployment stuck in "building/processing"
**Symptom:** Build log showed "Build finished" but `latestDeploymentStatus` stayed `building`/`processing` for 60+ minutes  
**Root cause:** Appwrite platform queue issue (not code)  
**Fix:** Delete stuck deployment, create new one with `appwrite functions create-deployment ... --activate true`

---

## 📦 Key File Locations (in repo)

```
JOAF-main/
├── appwrite-functions/
│   ├── joaf-viral-os/index.js     ← 80KB, main orchestrator
│   ├── joaf-image-gen/index.js    ← 25KB, PNG card generator
│   │   └── fonts/                  ← NotoSerifBengali, HindSiliguri TTFs
│   ├── joaf-video-gen/index.js    ← 29KB, MP4 reel generator
│   │   └── fonts/                  ← same Bengali fonts
│   ├── fb-autopost/index.js       ← 16KB, 17-page FB publisher
│   ├── joaf-analytics/index.js    ← 14KB, FB insights
│   └── [15 other functions]
├── admin/
│   ├── index.html                  ← Master admin (dark, Bengali)
│   ├── studio.html                 ← Studio control center
│   └── js/
│       ├── joaf-init.js            ← Admin init + Groq rate limiter
│       ├── admin-init.js
│       └── studio-init.js
├── js/
│   ├── joaf-config.js              ← Reads appwrite.json, exposes JOAF_CONFIG
│   ├── appwrite-db.js
│   ├── ai/aimaster.js
│   └── queue/fbpublisher.js
├── tools/                          ← Studio iframed tools
│   ├── news-card-generator.html
│   ├── fb-smart-studio.html
│   ├── fb-reel-studio.html
│   └── viral-os-dashboard.html
├── appwrite.json                   ← Project config (21 functions + vars)
└── sw.js                           ← Service worker (PWA)
```

---

## 🔧 Common Operations (Copy-Paste Commands)

### Check all functions status
```python
python3 << 'EOF'
import json, urllib.request, urllib.parse, time
AW_KEY = "standard_4b67a7b75a3aea21254c6c866601aad3f30784f8818e5f9ec024ff27f64956f967814886192e7ce5079e67e557988e53840de1bdc2d503d39f1d3aebeccab47a30df90af576b0d91ae362203d644599f3c0b7d42277f10a3c264fc3be5ab6f04d770d959d1d318315a1cdc19f7d041a911fcb0208c3cb37f52bad824535e9b4b"
AW_PJ = "6a11b6cd000b59f318eb"
BASE = "https://fra.cloud.appwrite.io/v1"
H = {"X-Appwrite-Project": AW_PJ, "X-Appwrite-Key": AW_KEY}
r = urllib.request.Request(f"{BASE}/functions?limit=25", headers=H)
with urllib.request.urlopen(r) as x: fns = json.loads(x.read())["functions"]
for f in fns:
    match = "✓" if f.get("deploymentId") == f.get("latestDeploymentId") else "✗"
    print(f"{match} {f['$id']:28s} {f.get('latestDeploymentStatus','?'):10s} {f.get('schedule','—')}")
EOF
```

### Trigger joaf-viral-os manually (publish one item)
```bash
appwrite functions create-execution \
  --function-id joaf-viral-os \
  --async false \
  --path / --method POST \
  --body '{"action":"publish"}'
```

### Test video generation
```bash
appwrite functions create-execution \
  --function-id joaf-video-gen \
  --async false \
  --path / --method POST \
  --body '{"hook_text":"টেস্ট শিরোনাম","body_text":"এটি একটি পরীক্ষামূলক ভিডিও যা JOAF সিস্টেম দ্বারা তৈরি।","cta_text":"মতামত দিন","audio_style":"none","duration":15}'
```

### Test video publish to JOAF Main page only
```bash
appwrite functions create-execution \
  --function-id fb-autopost \
  --async true \
  --path / --method POST \
  --body '{"action":"video","videoStorageFileId":"VIDEO_FILE_ID_HERE","pageIds":["901104276426275"],"caption":"টেস্ট রিল\n\n#JOAF #বাংলাদেশ"}'
```

### Fix stuck deployment (delete + redeploy)
```bash
# Delete stuck one
appwrite functions delete-deployment \
  --function-id FUNCTION_ID \
  --deployment-id STUCK_DEPLOYMENT_ID

# Redeploy
appwrite functions create-deployment \
  --function-id FUNCTION_ID \
  --entrypoint index.js \
  --code appwrite-functions/FUNCTION_ID \
  --activate true

# Wait 30s then check
sleep 30
appwrite functions get --function-id FUNCTION_ID | grep -E "deploymentId|latestDeployment"
```

### Check viral-os last 3 executions
```bash
appwrite functions list-executions \
  --function-id joaf-viral-os \
  --limit 3
```

### Check queue status
```bash
appwrite functions create-execution \
  --function-id joaf-viral-os \
  --async false \
  --path / --method POST \
  --body '{"action":"status"}'
```

---

## 🔑 Environment Variables Reference

### All functions share these:
| Key | Value |
|---|---|
| APPWRITE_ENDPOINT | https://fra.cloud.appwrite.io/v1 |
| APPWRITE_PROJECT_ID | 6a11b6cd000b59f318eb |
| APPWRITE_DATABASE_ID | joaf |
| APPWRITE_API_KEY | standard_4b67a7... (see above) |
| CLOUDINARY_CLOUD_NAME | dou71pfe1 |
| CLOUDINARY_UPLOAD_PRESET | kf483px5 |
| CLOUDINARY_API_KEY | 629623956125173 |
| CLOUDINARY_API_SECRET | SynV9B5Dw4OvXjhzoOhUKucFGHM |
| GEMINI_API_KEY | AIzaSyB60LRIuUhBDaE2Cc3T88iwi9wsX9-Xbr8 |
| GROQ_API_KEY | gsk_ydeaWUoJB3qAHq... |
| OPENROUTER_API_KEY | sk-or-v1-d3ace506... |
| FB_APP_ID | 2475935639514218 |
| FB_APP_SECRET | 67901d24bdfb60dfa7dd83926d1af4b5 |
| FB_USER_TOKEN | EAAjL2bBHrGoB... (long-lived user token) |
| FB_PAGE_ACCESS_TOKENS | [{id,name,token},...] 17 pages JSON |
| ADMIN_SECRET_KEY | ashjoafhimu123 |
| FIREBASE_PROJECT_ID | joaf-app-45753 |
| GITHUB_TOKEN | ghp_v4YdCnigXXjr... |
| HF_TOKEN | hf_oPMdCelQxnOAGUr... |
| VAPID_PUBLIC_KEY | BDt2WuNPaZ4ma4po... |
| VAPID_PRIVATE_KEY | 5Az4ywJ0sZrFNZ0a... |
| VOTE_SALT | 44555798167447... |
| ALERT_SALT | 6d13ad57a038... |

---

## 📊 Database Collections Reference

### viral_content_pool
```json
{
  "fp": "sha256_16chars",
  "title": "Bengali headline",
  "body": "Bengali body text",
  "source": "প্রথম আলো",
  "link": "https://...",
  "format": "breaking_news",
  "queued": "false",
  "created_at": "ISO8601"
}
```

### viral_publish_queue
```json
{
  "fp": "sha256_16chars",
  "format": "breaking_news",
  "caption": "Bengali FB caption",
  "jpg_url": "https://res.cloudinary.com/...",
  "video_file_id": "vid_XXXXXXXXX",
  "status": "pending|processing|dispatched|completed|failed",
  "created_at": "ISO8601",
  "results": "{json}"
}
```

### viral_publish_log
```json
{
  "fp": "sha256_16chars",
  "format": "breaking_news",
  "page_count": 17,
  "status": "published",
  "published_at": "ISO8601",
  "execution_id": "appwrite_exec_id"
}
```

---

## ⚠️ Common Failure Modes & Fixes

### 1. fb-autopost: UploadRateLimitedError
**What:** Facebook rate limit when uploading same video to 17 pages simultaneously  
**Fix:** Already has 3× retry with backoff. For persistent failures, add 30s delay between pages or stagger into 2 batches.

### 2. joaf-video-gen: timeout
**What:** Function stops before MP4 is ready  
**Diagnosis:** Check if encode is > 240s. Should be ~12.5s for 15s video.  
**Fix:** Ensure `-threads 1`, 540×960 resolution, no upscale filter

### 3. Appwrite deployment stuck
**What:** `latestDeploymentStatus: processing/building` for > 5 minutes  
**Fix:** Delete deployment, redeploy. See command above.

### 4. AI circuit breaker open
**What:** All AI providers blocked → content generation fails → queue empties  
**Diagnosis:** Check viral-os logs for "circuit open" messages  
**Fix:** Wait 30 minutes (circuit auto-resets), or force `action=fill`

### 5. Queue empty (emergency)
**What:** Queue < 8 items triggers emergency fill but AI blocked  
**Fix:** Trigger manual fill: `{"action":"fill"}` + check AI provider status

### 6. FB_PAGE_ACCESS_TOKENS expired
**What:** Posts fail with "OAuth token has expired"  
**Diagnosis:** Check fb-config function or fb-autopost logs  
**Fix:** Generate new long-lived token via `{"action":"setup-token"}` in fb-config

### 7. Bengali fonts missing in generated images
**What:** Images show boxes/tofu instead of Bengali characters  
**Diagnosis:** Check if `fonts/` directory is in the function's deployment  
**Fix:** Ensure TTF files are included in the zip deployment. Files: NotoSerifBengali-Bold.ttf, NotoSerifBengali-Regular.ttf, HindSiliguri-Bold.ttf, HindSiliguri-Regular.ttf, HindSiliguri-SemiBold.ttf

---

## 🧑‍💻 Working Style (Ash's Preferences)

- Always give complete, immediately runnable terminal commands
- Make logical assumptions from existing code — don't ask clarifying questions
- Communicate with Ash in Bangla-English mix
- Work with ZIP uploads as source of truth
- Always include `git add . && git commit -m "message" && git push` with code changes
- Avoid partial work, lengthy explanations, or confirming obvious next steps
- When debugging, check actual logs first — don't guess

---

## 📅 Session History Summary

| Date | Key Work |
|---|---|
| July 14, 2026 | Fixed video gen (OOM), fixed fb-autopost Reel upload URL, confirmed end-to-end Reel publish to JOAF Main page |
| July 2026 | BTU Mensa research paper (symposium July 15) |
| June–July 2026 | Appwrite migration, viral-os development, analytics |
| May–June 2026 | Initial Appwrite setup, FB pipeline, admin panel |
| Early 2025 | Netlify+Firebase foundation, JOAF v1 |

---

## 🚀 Next Steps (Priority Order)

1. **Verify Reel publishing to all 17 pages** — wait 24h and check viral-os logs for next scheduled video post
2. **Monitor queue** — ensure viral-os keeps filling queue successfully
3. **Analytics visualization** — add charts in admin panel for viral score trends
4. **FB token refresh** — implement alert 7 days before token expiry
5. **Stagger Reel uploads** — split 17-page upload into 2 batches to avoid rate limits
6. **Phase 6 admin UX** — see PHASES.md
