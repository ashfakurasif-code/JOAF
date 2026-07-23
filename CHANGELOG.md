# JOAF Changelog
## Production Audit — July 16, 2026

### 🔒 Security Fixes (Critical)

**[SEC-01] Removed hardcoded Appwrite API key from joaf-viral-os/index.js**
- The full `standard_4b67...` API key was embedded as a fallback value in the `AW_KEY` constant.
- Removed. The function now fails gracefully if `APPWRITE_API_KEY` env var is unset.
- **Action required:** Ensure `APPWRITE_API_KEY` is set in Appwrite Console for `joaf-viral-os`.

**[SEC-02] Removed hardcoded Cloudinary credentials from joaf-viral-os/index.js**
- `CDN_API_KEY` and `CDN_API_SECRET` had production Cloudinary values hardcoded as fallbacks.
- Removed. Credentials must come from environment variables only.

**[SEC-03] Removed hardcoded credentials from daily-press-release/index.js**
- Same pattern: Appwrite API key and Cloudinary credentials were hardcoded.
- Removed.

**[SEC-04] Replaced hardcoded Appwrite API key in all admin tools**
- Files affected: tools/viral-os-dashboard.html, tools/publisher-dashboard.html, 
  tools/manual/fb-reel-studio.html, tools/manual/fb-smart-studio.html,
  tools/manual/news-card-generator.html
- Replaced with `REPLACE_WITH_APPWRITE_API_KEY` placeholder.
- **Action required:** Substitute at deploy time or configure via admin panel.

### 🐛 Bug Fixes

**[BUG-01] Fixed CRON schedule comment mismatch in joaf-viral-os/index.js**
- Comment said `*/5 * * * *` (every 5 min), but appwrite.json correctly has `*/15 * * * *`.
- Comment corrected to match actual schedule.

### 🧹 Housekeeping

**[CLEAN-01] Removed Mensa BTU project file from JOAF root**
- `Mensa_Survey_Audience_Firebase.html` was a leftover from a different project (BTU Cottbus).
- Moved to `docs-provided/` to preserve it without polluting the JOAF repo root.

**[CLEAN-02] Added README to audio placeholder directory**
- `appwrite-functions/joaf-video-gen/audio/` contained 3 placeholder MP3 files (36 bytes each).
- Added `README.md` explaining they are intentional placeholders and how to replace them.

### 📋 Issues Documented (Not Breaking, No Action Taken)

**[NOTE-01] Duplicate aw-utils.js files**
- 5 functions contain identical `aw-utils.js` (discover-leaders, generate-timeline,
  update-leaders, save-subscription, press-release-og).
- 2 functions have a slightly different version (send-notification, get-stats).
- Appwrite Functions are deployed as ZIP bundles without shared libraries, so
  duplication is a structural requirement, not a bug.
- Recommendation: Accept as-is; document that aw-utils is intentionally vendored per-function.

**[NOTE-02] Duplicate bd-rss-utils.js files**
- discover-leaders and generate-timeline both contain identical bd-rss-utils.js.
- Same rationale as NOTE-01 applies.

**[NOTE-03] Admin dashboard ADMIN_SECRET_KEY default**
- PRD documents default as `ashjoafhimu123` — this is fine for dev but must be changed in production.
- SECRETS_SETUP.md already warns to change this. No code change needed.

**[NOTE-04] tools/ Appwrite API key replacement**
- The admin tool HTML files now require `REPLACE_WITH_APPWRITE_API_KEY` to be 
  substituted at deploy time. A build step or admin-panel-based config is recommended.

**[NOTE-05] daily-press-release/index.js is 174KB**  
- The largest function file contains a large base64-encoded letterhead JPEG embedded inline.
- This is intentional: the function must be self-contained.
- Consider externalizing to Cloudinary CDN in Phase 7 for maintainability.

**[NOTE-06] Mensa Firebase key in moved file**
- `docs-provided/Mensa_Survey_Audience_Firebase.html` contains a Firebase API key
  (AIzaSyDBbm...) for the BTU Mensa survey project.
- This is a separate project's key unrelated to JOAF. Remove or secure separately.

### ✅ Verified Working (No Changes)
- joaf-viral-os CRON schedule: `*/15 * * * *` in appwrite.json ✅
- fb-autopost Reel upload flow: uses `initData.upload_url` directly ✅
- joaf-video-gen: 540×960 native, `-threads 1`, ~12.5s encode ✅
- Admin auth: localStorage-based, no default key in code ✅
- groq-proxy: OpenRouter → Gemini → Groq cascade ✅
- Service worker: v11, PWA-ready ✅
- Bengali fonts: bundled in joaf-image-gen/fonts/ and joaf-video-gen/fonts/ ✅
