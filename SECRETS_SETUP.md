# JOAF — One-Time GitHub Secrets Setup Guide
# =============================================
# এই ফাইলটি `.env` হিসেবে সেভ করবেন না।
# শুধু গাইড হিসেবে ব্যবহার করুন।
#
# GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret
# নিচের প্রতিটি নাম ও value সেখানে যোগ করুন।
# একবার সেট করলেই হবে — পরে কমিট/পুশ করলে অটো-ডিপ্লয় হয়ে যাবে।
# =============================================

# ── APPWRITE (সবচেয়ে জরুরি) ─────────────────────────────────
# Appwrite Console → Project Settings → API Keys → Create API Key
# Scopes: databases.read, databases.write, functions.read, functions.write, documents.*
APPWRITE_API_KEY=your_appwrite_server_api_key_here

# ── AI PROVIDERS (ফ্রি, যেকোনো একটা হলেই চলবে) ───────────────
# https://console.groq.com → API Keys
GROQ_API_KEY=gsk_...

# https://aistudio.google.com → Get API Key
GEMINI_API_KEY=AIza...

# https://openrouter.ai → Keys
OPENROUTER_API_KEY=sk-or-...

# ── FACEBOOK ────────────────────────────────────────────────────
# Facebook Developer → App → Page Access Token
# JSON array format: [{"id":"PAGE_ID","name":"Page Name","token":"EAAj..."}]
FB_PAGE_ACCESS_TOKENS=[{"id":"123456789","name":"আপনার পেজ","token":"EAAj..."}]

# Facebook App ID (fb-config function-এর জন্য)
FB_APP_ID=your_facebook_app_id

# ── SECURITY KEYS ───────────────────────────────────────────────
# Admin panel-এর জন্য secret key (নিজে বানান, যেকোনো random string)
ADMIN_SECRET_KEY=joaf_admin_secret_change_this_now

# AI proxy auth key (groq-proxy-এর জন্য, admin-init.js এ এই value টা দিন)
INTERNAL_API_KEY=joaf_internal_key_change_this_now

# ── PUSH NOTIFICATIONS (VAPID) ──────────────────────────────────
# Generate করুন: node -e "const {generateVAPIDKeys}=require('web-push');console.log(generateVAPIDKeys())"
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...

# ── OPTIONAL ────────────────────────────────────────────────────
# HuggingFace (video generation): https://huggingface.co/settings/tokens
HF_TOKEN=hf_...

# GitHub (admin file upload): https://github.com/settings/tokens
# Scope: repo (full)
GH_UPLOAD_TOKEN=ghp_...

# ── ADMIN TOOLS (tools/ directory) ──────────────────────────────────────────
# The admin tools in tools/ previously had the Appwrite API key hardcoded.
# They now require: REPLACE_WITH_APPWRITE_API_KEY to be substituted at deploy time.
# 
# For production, either:
# Option A: Add it as a meta tag injected by your build/deploy process
# Option B: Add to window.JOAF_CONFIG before the tool scripts load
# Option C: Use the admin panel (/admin/index.html) which loads config from appwrite.json
#
# The Appwrite key for tools MUST have ONLY these scopes:
#   - databases.read, databases.write (for queue/pool display)
#   - functions.read, functions.write (for triggering functions)
# Do NOT use the full admin key from GitHub Secrets in browser tools.
# Create a restricted key specifically for admin dashboard use.
