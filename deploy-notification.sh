#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  JOAF — send-notification  ONE-COMMAND DEPLOY + AUDIT
#  Usage: bash deploy-notification.sh
#  Run from: JOAF-main/ (project root, where appwrite.json lives)
# ═══════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $*${NC}"; }

PROJECT_ID="6a11b6cd000b59f318eb"
FUNCTION_ID="send-notification"
FUNCTION_PATH="appwrite-functions/send-notification"
AW_ENDPOINT="https://fra.cloud.appwrite.io/v1"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  JOAF send-notification Deploy Script    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Preflight checks ─────────────────────────────────
info "Step 1/6: Preflight checks..."

command -v appwrite >/dev/null 2>&1 || fail "Appwrite CLI not found. Run: npm install -g appwrite-cli"
command -v git      >/dev/null 2>&1 || fail "git not found."
command -v node     >/dev/null 2>&1 || fail "node not found."
[[ -f "appwrite.json" ]]            || fail "appwrite.json not found. Run from JOAF-main/ root."
[[ -f "${FUNCTION_PATH}/index.js" ]] || fail "${FUNCTION_PATH}/index.js not found."

ok "Preflight passed."

# ── Step 2: Read VAPID keys from environment or appwrite.json ─
info "Step 2/6: VAPID key audit..."

# Try to read from env first, then prompt
if [[ -z "$VAPID_PUBLIC_KEY" ]] || [[ -z "$VAPID_PRIVATE_KEY" ]]; then
    warn "VAPID keys not found in shell environment."
    echo ""
    echo "  আপনার VAPID keys দরকার। দুটো উপায়:"
    echo ""
    echo "  [A] Appwrite Console → send-notification → Settings → Variables"
    echo "      থেকে VAPID_PUBLIC_KEY ও VAPID_PRIVATE_KEY কপি করুন।"
    echo ""
    echo "  [B] নতুন key generate করতে চাইলে এখানে enter চাপুন"
    echo "      (web-push generate-vapid-keys দিয়ে generate হবে)"
    echo ""
    read -rp "  VAPID_PUBLIC_KEY  (blank = generate new): " INPUT_PUB
    read -rp "  VAPID_PRIVATE_KEY (blank = generate new): " INPUT_PRIV

    if [[ -z "$INPUT_PUB" ]] || [[ -z "$INPUT_PRIV" ]]; then
        info "Generating new VAPID key pair..."
        cd "$FUNCTION_PATH" && npm install --silent 2>/dev/null
        VAPID_JSON=$(node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k));")
        VAPID_PUBLIC_KEY=$(echo "$VAPID_JSON"  | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).publicKey));")
        VAPID_PRIVATE_KEY=$(echo "$VAPID_JSON" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).privateKey));")
        cd - >/dev/null
        warn "NEW keys generated — আপনার frontend-এ VAPID_PUBLIC_KEY আপডেট করতে হবে!"
        warn "নতুন key generate করলে সব existing subscribers আবার subscribe করতে হবে।"
    else
        VAPID_PUBLIC_KEY="$INPUT_PUB"
        VAPID_PRIVATE_KEY="$INPUT_PRIV"
    fi
fi

[[ -z "$VAPID_PUBLIC_KEY"  ]] && fail "VAPID_PUBLIC_KEY empty — abort."
[[ -z "$VAPID_PRIVATE_KEY" ]] && fail "VAPID_PRIVATE_KEY empty — abort."

ok "VAPID keys ready."
info "  PUBLIC : ${VAPID_PUBLIC_KEY:0:20}...${VAPID_PUBLIC_KEY: -8}"
info "  PRIVATE: ${VAPID_PRIVATE_KEY:0:8}...[hidden]"

# ── Step 3: Update appwrite.json VAPID vars in-place ─────────
info "Step 3/6: Syncing VAPID keys into appwrite.json..."

# Use node to safely patch JSON without breaking structure
node -e "
const fs = require('fs');
const path = 'appwrite.json';
const cfg = JSON.parse(fs.readFileSync(path,'utf8'));
const fn = cfg.functions.find(f => f['\$id'] === 'send-notification');
if (!fn) { console.error('send-notification not found in appwrite.json'); process.exit(1); }
fn.vars = fn.vars || [];
const set = (name, value) => {
  const v = fn.vars.find(x => x.name === name);
  if (v) v.value = value; else fn.vars.push({ name, value });
};
set('VAPID_PUBLIC_KEY',  process.env.VAPID_PUBLIC_KEY);
set('VAPID_PRIVATE_KEY', process.env.VAPID_PRIVATE_KEY);
set('VAPID_SUBJECT',     'mailto:admin@julyforum.com');
fs.writeFileSync(path, JSON.stringify(cfg, null, 4));
console.log('appwrite.json patched.');
" 2>&1

ok "appwrite.json updated with VAPID keys."

# ── Step 4: Git commit ────────────────────────────────────────
info "Step 4/6: Git commit..."

git add "${FUNCTION_PATH}/index.js" appwrite.json

if git diff --cached --quiet; then
    warn "Nothing new to commit (already up to date)."
else
    git commit -m "fix(send-notification): resolve VAPID data-shape & TTL bugs

- FIX: doc.data field access (awListAll wrapper shape)
- FIX: doc.id instead of doc.\$id for awUpdate
- FIX: TTL:86400 header for Chrome FCM-VAPID compatibility
- FIX: VAPID_SUBJECT env consistency with save-subscription
- FIX: subscriptionJson dual-shape parse (object + string)
- ADD: VAPID_SUBJECT var in appwrite.json"
    ok "Git committed."
fi

git push origin main 2>/dev/null || git push origin master 2>/dev/null || warn "git push failed — check remote."
ok "Git pushed."

# ── Step 5: Appwrite CLI deploy ───────────────────────────────
info "Step 5/6: Deploying to Appwrite..."

appwrite functions createDeployment \
    --function-id="$FUNCTION_ID" \
    --entrypoint="index.js" \
    --commands="npm install" \
    --path="$FUNCTION_PATH" \
    --activate=true \
    --async=false \
    2>&1 | tail -20

ok "Deployment submitted."

# ── Step 6: Live verification ─────────────────────────────────
info "Step 6/6: Live verification (connectivity test)..."

sleep 4   # give Appwrite a moment to activate

AW_API_KEY=$(node -e "
const cfg=require('./appwrite.json');
const fn=cfg.functions.find(f=>f['\$id']==='send-notification');
const v=fn.vars.find(v=>v.name==='APPWRITE_API_KEY');
console.log(v?v.value:'');
" 2>/dev/null)

VERIFY_RESPONSE=$(curl -s -X POST \
    "${AW_ENDPOINT}/functions/${FUNCTION_ID}/executions" \
    -H "Content-Type: application/json" \
    -H "X-Appwrite-Project: ${PROJECT_ID}" \
    -H "X-Appwrite-Key: ${AW_API_KEY}" \
    -d '{"body":"{\"_verify\":true}","async":false}' 2>/dev/null)

EXEC_OUTPUT=$(echo "$VERIFY_RESPONSE" | node -e "
process.stdin.resume();let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try { const r=JSON.parse(d); console.log(r.responseBody||r.response||JSON.stringify(r)); }
  catch(_){ console.log(d.slice(0,300)); }
});
" 2>/dev/null)

if echo "$EXEC_OUTPUT" | grep -q '"verified":true'; then
    ok "Function is LIVE and responding correctly!"
    ok "  Response: $EXEC_OUTPUT"
else
    warn "Verify response: $EXEC_OUTPUT"
    warn "Function deployed but verification response unexpected."
    warn "Check Appwrite Console → Functions → send-notification → Logs"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         DEPLOY COMPLETE ✅               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Function ID : ${CYAN}${FUNCTION_ID}${NC}"
echo -e "  Project     : ${CYAN}${PROJECT_ID}${NC}"
echo -e "  Endpoint    : ${CYAN}${AW_ENDPOINT}/functions/${FUNCTION_ID}/executions${NC}"
echo -e "  VAPID Pub   : ${CYAN}${VAPID_PUBLIC_KEY:0:20}...${NC}"
echo ""
echo -e "  Console → Functions → ${FUNCTION_ID} → Logs এ check করুন।"
echo ""
