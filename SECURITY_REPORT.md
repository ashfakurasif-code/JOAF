# JOAF Security Report
## Audit Date: July 16, 2026

---

## Executive Summary

JOAF is an admin-gated, internally-used civic publishing platform. The attack surface is
moderate: no public user accounts, no payment processing, no PII collection beyond
push notification endpoints. The primary risks are:
1. Exposed API keys allowing unauthorized publishing to 17 Facebook pages
2. Admin panel bypass
3. Appwrite database manipulation

---

## Issues Found & Resolved

### CRITICAL (Fixed in this release)

| ID | File | Issue | Status |
|----|------|-------|--------|
| SEC-01 | appwrite-functions/joaf-viral-os/index.js | Full Appwrite API key hardcoded as fallback | ✅ Fixed |
| SEC-02 | appwrite-functions/joaf-viral-os/index.js | Cloudinary API key + secret hardcoded | ✅ Fixed |
| SEC-03 | appwrite-functions/daily-press-release/index.js | Appwrite + Cloudinary creds hardcoded | ✅ Fixed |
| SEC-04 | tools/*.html (5 files) | Full Appwrite API key in browser-delivered HTML | ✅ Fixed |

### MEDIUM (Documented, action required by operator)

| ID | File | Issue | Recommendation |
|----|------|-------|----------------|
| SEC-05 | MEMORY.md (docs-provided) | Full Appwrite API key in documentation file | Rotate the key after reading this; remove from docs |
| SEC-06 | MEMORY.md (docs-provided) | Multiple production secrets documented in plaintext | Keep only locally; do NOT commit MEMORY.md to public repos |
| SEC-07 | docs-provided/Mensa file | Unrelated Firebase API key in moved file | Delete or secure separately |
| SEC-08 | appwrite.json | FB_PAGE_ACCESS_TOKENS listed as empty (correct) but format exposed | Ensure FB tokens are only in Appwrite Console env vars |

### LOW (Informational)

| ID | Issue | Notes |
|----|-------|-------|
| SEC-09 | Admin auth is localStorage-based | Acceptable for internal admin panel; no server-side session |
| SEC-10 | CORS on groq-proxy is `*` | Acceptable since auth is via x-joaf-key header |
| SEC-11 | FB page tokens expire ~60 days | Need monitoring/alerting (Phase 7 item) |
| SEC-12 | No CSP headers | Static HTML served via Netlify/GH Pages; add _headers file |

---

## Recommended Immediate Actions

1. **Rotate the Appwrite API key** — it was hardcoded in source. Even though removed now,
   anyone with the old git history can extract it.
   ```
   Appwrite Console → Project → API Keys → Delete old → Create new
   Update: APPWRITE_API_KEY in all Appwrite Function env vars
   ```

2. **Rotate Cloudinary credentials** — same reason.
   ```
   Cloudinary Console → Settings → API Keys → Generate new
   Update: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in function env vars
   ```

3. **Don't commit MEMORY.md to public repos** — it contains full production secrets.

4. **Add Netlify _headers for CSP** — create `/public/_headers`:
   ```
   /*
     Content-Security-Policy: default-src 'self' https:; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fra.cloud.appwrite.io; ...
     X-Frame-Options: SAMEORIGIN
     X-Content-Type-Options: nosniff
   ```

5. **Create a restricted Appwrite key for admin tools** — separate from the server-side key:
   - Scopes: databases.read, databases.write, functions.read, functions.write
   - Do NOT grant storage or full admin scopes

---

## What Is Properly Secured

- ✅ Admin panel requires ADMIN_SECRET_KEY verified server-side by Appwrite functions
- ✅ groq-proxy requires x-joaf-key header (INTERNAL_API_KEY)
- ✅ fb-autopost requires INTERNAL_API_KEY header (when configured)
- ✅ No user passwords stored
- ✅ No credit card / payment data
- ✅ Push subscription keys stored server-side in Appwrite DB (not exposed to frontend)
- ✅ Appwrite function execution requires project-level authentication
