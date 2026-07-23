# JOAF Deployment Guide
## Updated: July 16, 2026

---

## Prerequisites

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login
appwrite login

# Set project
appwrite client --endpoint https://fra.cloud.appwrite.io/v1 --project-id 6a11b6cd000b59f318eb
```

---

## First-Time Setup

### 1. Initialize database

```bash
# Set environment variables first
export APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
export APPWRITE_PROJECT_ID="6a11b6cd000b59f318eb"
export APPWRITE_API_KEY="your_api_key_here"

# Run bootstrap (idempotent)
node scripts/bootstrap.js
```

### 2. Configure secrets

Set these in **Appwrite Console → Functions → [function] → Variables**:

| Variable | Functions | Value Source |
|----------|-----------|--------------|
| APPWRITE_ENDPOINT | all | https://fra.cloud.appwrite.io/v1 |
| APPWRITE_PROJECT_ID / APPWRITE_PROJECT | all | 6a11b6cd000b59f318eb |
| APPWRITE_API_KEY / AW_KEY | all | Appwrite Console → API Keys |
| APPWRITE_DATABASE_ID | all | joaf |
| CLOUDINARY_CLOUD_NAME / CLOUDINARY_CLOUD | viral-os, daily-press | dou71pfe1 |
| CLOUDINARY_UPLOAD_PRESET / CLOUDINARY_PRESET | viral-os | from Cloudinary Dashboard |
| CLOUDINARY_API_KEY | viral-os, daily-press | from Cloudinary Dashboard |
| CLOUDINARY_API_SECRET | viral-os, daily-press | from Cloudinary Dashboard |
| OPENROUTER_API_KEY / OPENROUTER_KEY | viral-os, groq-proxy, daily-press | openrouter.ai |
| GEMINI_API_KEY / GEMINI_KEY | viral-os, groq-proxy, daily-press | aistudio.google.com |
| GROQ_API_KEY / GROQ_KEY | viral-os, groq-proxy, daily-press | console.groq.com |
| FB_PAGE_ACCESS_TOKENS | fb-autopost | JSON array from fb-config setup-token action |
| FB_APP_ID | fb-config | Facebook Developer Console |
| FB_APP_SECRET | fb-config | Facebook Developer Console |
| FB_USER_TOKEN | fb-config | Graph API Explorer |
| ADMIN_SECRET_KEY | vote, send-notification, get-stats | Custom secure string |
| INTERNAL_API_KEY | groq-proxy, fb-autopost | Custom secure string |
| VAPID_PUBLIC_KEY | send-notification, save-subscription | Generated (see below) |
| VAPID_PRIVATE_KEY | send-notification, save-subscription | Generated (see below) |
| HF_TOKEN | hf-video-proxy | huggingface.co/settings/tokens |
| GITHUB_TOKEN | github-upload | github.com/settings/tokens |
| VOTE_SALT | vote | Any random 32-char string |

**Generate VAPID keys:**
```bash
node -e "const {generateVAPIDKeys} = require('web-push'); console.log(JSON.stringify(generateVAPIDKeys(), null, 2))"
```

### 3. Setup Facebook tokens

```bash
# Call fb-config with your user token to auto-populate all 17 page tokens
appwrite functions create-execution \
  --function-id fb-config \
  --async false \
  --path / --method POST \
  --body '{"action":"setup-token","userToken":"EAAj..."}'
```

---

## Deploying Functions

### Deploy all functions

```bash
npm run deploy
# This runs: clean → build:studio → appwrite deploy → bootstrap → verify
```

### Deploy a single function

```bash
appwrite functions create-deployment \
  --function-id joaf-viral-os \
  --entrypoint index.js \
  --code appwrite-functions/joaf-viral-os \
  --activate true
```

### Fix stuck deployment (building/processing > 5 min)

```bash
# Get stuck deployment ID
appwrite functions get --function-id joaf-viral-os | grep deploymentId

# Delete it
appwrite functions delete-deployment \
  --function-id joaf-viral-os \
  --deployment-id STUCK_DEPLOYMENT_ID

# Redeploy
appwrite functions create-deployment \
  --function-id joaf-viral-os \
  --entrypoint index.js \
  --code appwrite-functions/joaf-viral-os \
  --activate true

# Verify in 30s
sleep 30
appwrite functions get --function-id joaf-viral-os | grep -E "deploymentId|Status"
```

---

## Operational Commands

### Check pipeline status

```bash
appwrite functions create-execution \
  --function-id joaf-viral-os \
  --async false \
  --path / --method POST \
  --body '{"action":"status"}'
```

### Manually trigger one publish cycle

```bash
appwrite functions create-execution \
  --function-id joaf-viral-os \
  --async false \
  --path / --method POST \
  --body '{"action":"cycle"}'
```

### Emergency fill queue (if AI is down)

```bash
appwrite functions create-execution \
  --function-id joaf-viral-os \
  --async false \
  --path / --method POST \
  --body '{"action":"fill"}'
```

### Test Reel publish to one page

```bash
appwrite functions create-execution \
  --function-id fb-autopost \
  --async true \
  --path / --method POST \
  --body '{"action":"video","videoStorageFileId":"VIDEO_FILE_ID","pageIds":["901104276426275"],"caption":"Test reel\n\n#JOAF"}'
```

### Check Facebook token health

```bash
appwrite functions create-execution \
  --function-id fb-autopost \
  --async false \
  --path / --method POST \
  --body '{"action":"check-token"}'
```

### View recent viral-os executions

```bash
appwrite functions list-executions --function-id joaf-viral-os --limit 5
```

---

## Environment: Public Website

The public site (julyforum.com) is static HTML served by Netlify/GitHub Pages.
It reads `appwrite.json` at runtime to discover the Appwrite endpoint and project ID.

No build step is required for public pages. Just commit and push.

For the admin panel (`/admin/index.html`): same — it's static HTML that reads
`appwrite.json` and stores the admin key in localStorage after login.

---

## Monitoring

### What to watch
- joaf-viral-os: Should execute every 15 min. If 3+ consecutive failures → check AI providers
- fb-autopost: Watch for UploadRateLimitedError in video posts
- viral_publish_queue: Should have 15-25 pending items at all times
- FB_PAGE_ACCESS_TOKENS: Expire every ~60 days — set a calendar reminder

### Logs
- Appwrite Console → Functions → [function] → Executions
- Look for: "publish: ✅" (success) or "publish: ❌" (failure)
- Circuit breaker messages: "circuit open — skipping openrouter"
