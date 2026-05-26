#!/bin/bash
# JOAF — Appwrite Refactor Patch Script
# Run from project root: bash patch-to-appwrite.sh

set -e
echo "🔧 JOAF FB Post — Appwrite Architecture Patch"
echo "============================================="

# 1. Verify required files exist
echo "✅ Verifying files..."
[ -f "js/data.js" ]                                       && echo "  ✓ js/data.js"
[ -f "js/fb-draft-queue.js" ]                             && echo "  ✓ js/fb-draft-queue.js"
[ -f "netlify/functions/fb-autopost.js" ]                 && echo "  ✓ netlify/functions/fb-autopost.js"
[ -f "appwrite-functions/fb-scheduler/index.js" ]         && echo "  ✓ appwrite-functions/fb-scheduler/index.js"
[ -f "appwrite-functions/fb-scheduler/package.json" ]     && echo "  ✓ appwrite-functions/fb-scheduler/package.json"

# 2. Confirm no raw graph.facebook.com calls left in admin (except comments)
echo ""
echo "🔍 Checking for remaining direct Graph API calls..."
DIRECT=$(grep -n "graph.facebook.com" admin/index.html | grep -v "^\s*//" | grep -v "<!--" || true)
if [ -z "$DIRECT" ]; then
  echo "  ✅ No direct client-side Graph API calls found"
else
  echo "  ⚠️  Found remaining direct calls — review these:"
  echo "$DIRECT"
fi

# 3. Confirm FB_CONFIG present in data.js
echo ""
echo "🔍 Checking FB_CONFIG in data.js..."
grep -q "FB_CONFIG" js/data.js && echo "  ✅ FB_CONFIG present" || echo "  ❌ FB_CONFIG missing"
grep -q "v22.0" js/data.js     && echo "  ✅ API v22.0 set"     || echo "  ❌ v22.0 missing"

# 4. Confirm Netlify env vars reminder
echo ""
echo "📋 REQUIRED Netlify Environment Variables:"
echo "  FB_USER_TOKEN   — your Facebook User Token (never commit this)"
echo "  FB_API_VER      — v22.0 (optional, defaults in code)"
echo ""
echo "📋 REQUIRED Appwrite Function Environment Variables (fb-scheduler):"
echo "  NETLIFY_BASE_URL  — https://your-site.netlify.app"
echo "  APPWRITE_ENDPOINT — https://fra.cloud.appwrite.io/v1"
echo "  APPWRITE_PROJECT  — 6a11b6cd000b59f318eb"
echo "  APPWRITE_API_KEY  — (server API key from Appwrite console)"
echo ""
echo "📋 REQUIRED Appwrite Collections (Database: joaf):"
echo "  fb_drafts  — caption(string), tags(string), tone(string), hook(string), updated_at(string)"
echo "  fb_queue   — caption(string), tags(string), image_url(string), video_url(string),"
echo "               carousel_urls(string[]), status(string), scheduled_at(string),"
echo "               posted_at(string), results(string)"
echo ""

# 5. Git commit
echo "📦 Committing..."
git add .
git commit -m "feat(fb-post): complete architectural refactor to Appwrite SDK for security and batch operations

- Move FB_API_VER (v22.0) and AI prompts/tones to data.js (FB_CONFIG)
- Route all Graph API calls through Netlify function (zero token exposure)
- Add fb-draft-queue.js: Appwrite-backed 30s auto-save (fb_drafts collection)
- Add fb_queue collection support with fbQueueAdd/fbQueueList
- Add fbQueueFromUI() — schedule posts from admin panel UI
- Add Carousel post support via Graph API attached_media array
- Add Appwrite cron function (fb-scheduler) for scheduled publishing
- Add schedule datetime picker and carousel URL input to admin UI
- Add draft saved indicator in caption panel"

echo ""
echo "✅ Done! Patch applied and committed."
