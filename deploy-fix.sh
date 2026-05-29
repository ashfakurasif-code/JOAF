#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  JOAF Push Notification — 3 Bug Fixes + Deploy + Test
#  Run from your project root (JOAF-main):  bash deploy-fix.sh
# ═══════════════════════════════════════════════════════════════
set -e

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${B}  JOAF Push Fix  →  patch  →  commit  →  deploy  →  test  ${NC}"
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Sanity check ─────────────────────────────────────────────
if [ ! -f "appwrite.json" ]; then
  echo -e "${R}❌  Run this from your JOAF-main directory (where appwrite.json is)${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# STEP 1 — PATCH FILES
# ═══════════════════════════════════════════════════════════════
echo -e "${Y}[1/4] Patching source files...${NC}"

python3 - << 'PYEOF'
import sys, os

ok = 0; skip = 0; err = 0

def patch(label, path, old, new):
    global ok, skip, err
    if not os.path.exists(path):
        print(f"  ❌  {label}: file not found → {path}"); err += 1; return
    with open(path, encoding='utf-8') as f: c = f.read()
    if old in c:
        with open(path, 'w', encoding='utf-8') as f: f.write(c.replace(old, new))
        print(f"  ✅  {label}"); ok += 1
    elif new.split('\n')[0].strip() in c or new.strip() in c:
        print(f"  ✓   {label}: already applied"); skip += 1
    else:
        print(f"  ❌  {label}: pattern not found — check file manually"); err += 1

# ── Fix 1: send-notification/index.js — FCM filter kills all Chrome subs ──
patch(
    "Fix 1  send-notification/index.js  (FCM filter bug)",
    "appwrite-functions/send-notification/index.js",
    "      return sub && sub.endpoint && !sub.endpoint.includes('fcm.googleapis.com');",
    "      return sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth;"
)

# ── Fix 2: sw.js — syncSubscription missing X-Appwrite-Project header ─────
patch(
    "Fix 2  sw.js  (missing X-Appwrite-Project header)",
    "sw.js",
    "      headers: { 'Content-Type': 'application/json' },",
    ("      headers: {\n"
     "        'Content-Type': 'application/json',\n"
     "        'X-Appwrite-Project': '6a11b6cd000b59f318eb',\n"
     "      },")
)

# ── Fix 3: aw-utils.js — limit as URL param ignored in Appwrite 1.4+ ──────
OLD_AW = (
    "  safeQueries.forEach(query => { params.append('queries[]', query); });\n"
    "  params.set('limit', String(safeLimit));"
)
NEW_AW = (
    "  // Appwrite 1.4+: limit must live in queries[], not as a bare URL param\n"
    "  const allQueries = [...safeQueries, `limit(${safeLimit})`];\n"
    "  allQueries.forEach(query => { params.append('queries[]', query); });"
)
for f in [
    "appwrite-functions/send-notification/aw-utils.js",
    "appwrite-functions/get-stats/aw-utils.js",
]:
    patch(f"Fix 3  {f.split('/')[-2]}/aw-utils.js  (pagination limit bug)", f, OLD_AW, NEW_AW)

# ── Also fix comment inside send-notification/index.js for clarity ─────────
patch(
    "Fix 1b send-notification/index.js  (update comment)",
    "appwrite-functions/send-notification/index.js",
    "    // FCM endpoint গুলো skip করো — VAPID only",
    "    // VAPID check — keys থাকলেই valid (Chrome uses fcm endpoint for VAPID too)"
)

print(f"\n  → {ok} patched  |  {skip} already done  |  {err} error(s)")
if err:
    print("  Fix errors above before continuing.")
    sys.exit(1)
PYEOF

# ═══════════════════════════════════════════════════════════════
# STEP 2 — GIT COMMIT
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${Y}[2/4] Committing...${NC}"

git add \
  appwrite-functions/send-notification/index.js \
  appwrite-functions/send-notification/aw-utils.js \
  appwrite-functions/get-stats/aw-utils.js \
  sw.js

if git diff --cached --quiet; then
  echo "  ✓   Nothing new to commit (already committed)"
else
  git commit -m "fix(push): 3 notification bugs

Bug 1 — send-notification/index.js
  Chrome Web Push subscriptions use fcm.googleapis.com endpoints but ARE
  valid VAPID (they have keys.p256dh + keys.auth). Filtering by endpoint
  domain was silently dropping all Chrome subscribers → 0 sent.
  Fix: filter by presence of keys, not endpoint domain.

Bug 2 — sw.js syncSubscription
  Background sync fetch was missing X-Appwrite-Project header → 401
  Fix: added header so background sync actually saves subscriptions.

Bug 3 — aw-utils.js (send-notification + get-stats)
  Appwrite 1.4+ requires limit inside queries[] as limit(n), not as a
  bare URL param. Was fetching only 25 docs (default) instead of 500.
  Fix: pass limit(500) in queries array."
  echo "  ✅  Committed"
fi

# ═══════════════════════════════════════════════════════════════
# STEP 3 — DEPLOY (all functions, auto-confirm)
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${Y}[3/4] Deploying to Appwrite (building + activating all functions)...${NC}"
echo "      This takes ~20-30 seconds..."
echo ""

printf 'YES\nYes\nYes\n' | appwrite push function --all

# ═══════════════════════════════════════════════════════════════
# STEP 4 — TEST
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${Y}[4/4] Running live test on send-notification...${NC}"
echo ""

TEST_OUTPUT=$(appwrite functions create-execution \
  --function-id send-notification \
  --body '{"title":"🔥 Test Notification","body":"Bug fix verified — push working!","url":"/"}' \
  --method POST 2>&1)

echo "$TEST_OUTPUT"

# ── Parse result ─────────────────────────────────────────────
SENT=$(echo "$TEST_OUTPUT" | grep -oE '"sent":[0-9]+' | grep -oE '[0-9]+' || true)
TOTAL=$(echo "$TEST_OUTPUT" | grep -oE '"total":[0-9]+' | grep -oE '[0-9]+' || true)
MSG=$(echo "$TEST_OUTPUT" | grep -oE '"message":"[^"]*"' || true)

echo ""
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "${SENT}" = "0" ] || [ -z "$SENT" ]; then
  echo -e "${R}⚠️   Result: sent=0${NC}"
  echo -e "    Log says: $MSG"
  echo ""
  echo -e "    Possible reasons:"
  echo -e "    • All 189 docs still have old subscriptions without keys → re-subscribe"
  echo -e "    • Check logs in Appwrite console for detailed error"
  echo -e "    ${B}https://cloud.appwrite.io/console/project-6a11b6cd000b59f318eb/functions/function-send-notification${NC}"
else
  echo -e "${G}✅  SUCCESS!  sent=${SENT}  total=${TOTAL}${NC}"
  echo -e "${G}    Push notifications are working!${NC}"
fi

echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
