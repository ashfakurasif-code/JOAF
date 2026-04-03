# 📘 JOAF Website v4.0 — সম্পাদনা নির্দেশিকা

## 🗂️ ফোল্ডার কাঠামো

```
joaf-v4/
├── index.html              — হোম পেজ
├── community.html          — কমিউনিটি গ্রুপ (data.js থেকে auto-render)
├── membership.html         — সদস্যতা ফর্ম
├── joaf-polls.html         — AI জনমত
├── media-news.html         — সংবাদ ও প্রেস রিলিজ
├── events.html             — অনুষ্ঠান
├── donate.html             — সহযোগিতা
│
├── press-releases/         — সব প্রেস রিলিজ এখানে
│   ├── template.html       — নতুন PR এর জন্য কপি করুন
│   ├── press-release-1.html...press-release-8.html
│   └── content/            — প্রতিটি PR এর .txt ফাইল রাখুন
│
├── js/
│   ├── data.js             ← ✅ এই একটা ফাইল বদলালেই সব আপডেট
│   ├── components.js       — Header, Footer, Ticker
│   └── main.js             — অন্যান্য JS
│
├── css/
│   └── joaf.css            — সব design এখানে
│
└── netlify.toml            — Hosting config
```

---

## ✏️ কীভাবে কী বদলাবেন

### নতুন প্রেস রিলিজ যোগ করতে:
1. `js/data.js` খুলুন → `pressReleases` array তে যোগ করুন:
   ```js
   { id: 9, slug: "press-release-9", title: "শিরোনাম", date: "2025-09-01",
     img: "/img/press-release-9.jpg", summary: "সারসংক্ষেপ" }
   ```
2. `press-releases/template.html` কপি করে `press-releases/press-release-9.html` বানান
3. `press-releases/content/press-release-9.txt` তৈরি করুন (বিস্তারিত লেখা)
4. ছবি `/img/press-release-9.jpg` ফোল্ডারে রাখুন

### নতুন WhatsApp group যোগ করতে:
`js/data.js` → `communityGroups` array তে যোগ করুন

### Nav menu বদলাতে:
`js/data.js` → `nav` array

### Ticker আইটেম বদলাতে:
`js/data.js` → `ticker` array

### AI Polls Groq key বসাতে:
`joaf-polls.html` → `const GROQ_KEY = 'আপনার_key_এখানে';`
পাওয়ার জন্য: https://console.groq.com → API Keys → Create (Free)

### সদস্যতা form endpoint বদলাতে:
`js/data.js` → `site.formAction`

---

## 🚀 Deployment (GitHub → Netlify)

```bash
git add .
git commit -m "আপডেট: নতুন প্রেস রিলিজ"
git push origin main
```
Netlify auto-deploy হবে।

---

## 📱 Mobile দেখতে সমস্যা?
সব CSS `css/joaf.css` এ। `@media(max-width:767px)` section দেখুন।

---

## 🔐 Netlify Environment Variables

নিচের env vars Netlify Dashboard → Site → Environment Variables-এ যোগ করুন:

### Appwrite (Backend Database)

| Variable | Description | Example / Notes |
|---|---|---|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Appwrite Project ID | e.g. `69ceec140033bccf5ea2` |
| `APPWRITE_DATABASE_ID` | Appwrite Database ID | e.g. `69cef52f0018a2a7b05a` |
| `APPWRITE_API_KEY` | Appwrite server API key (secret) | Appwrite Console → API Keys |

### Groq AI

| Variable | Description | Notes |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for AI features | https://console.groq.com → API Keys (Free tier available) |

> **Groq proxy enforcement**: সব Groq AI কল `/.netlify/functions/groq-proxy` এর মধ্য দিয়ে যায়। এই proxy allowlist (`llama-3.3-70b-versatile` only), `max_tokens` hard cap (1200), এবং temperature clamp (0-1) enforce করে। Client-side কোড সরাসরি Groq API call করতে পারে না।

### Salts (Privacy/Security)

| Variable | Description | Notes |
|---|---|---|
| `VOTE_SALT` | IP hash salt for poll vote deduplication | `openssl rand -hex 32` দিয়ে generate করুন |
| `ALERT_SALT` | IP hash salt for alert rate-limiting | আলাদাভাবে generate করুন, `VOTE_SALT` থেকে আলাদা হতে হবে |

### Other

| Variable | Description | Notes |
|---|---|---|
| `ADMIN_SECRET_KEY` | Admin panel secret key | — |
| `VAPID_PUBLIC_KEY` | Web push VAPID public key | — |
| `VAPID_PRIVATE_KEY` | Web push VAPID private key | — |
| `GITHUB_TOKEN` | GitHub token for poll-results.json commit | GitHub → Settings → Tokens |

### Salt generate করবেন যেভাবে:
```bash
openssl rand -hex 32
```
প্রতিটি salt আলাদাভাবে generate করুন। `VOTE_SALT` ও `ALERT_SALT` একই হওয়া উচিত নয়।

---

## 🗓️ Leader Discovery — 3-Day BD Date Gate

`discover-leaders` function প্রতিদিন রাত ২টায় (BD Time) trigger হয়, কিন্তু **৩ দিনে একবার** actual discovery চালায়।

**কীভাবে কাজ করে:**
- প্রতিবার run-এ Appwrite `leader_discovery_meta` collection-এ `state` document থেকে `lastRunBdDate` পড়ে
- আজকের BD date (UTC+6) থেকে `lastRunBdDate` বাদ দিলে যদি < 3 দিন হয় → skip করে
- ≥ 3 দিন হলে → RSS ফিড + Groq AI দিয়ে নেতা আবিষ্কার করে Appwrite `leaders` collection-এ সেভ করে
- সফল হলে `lastRunBdDate` আপডেট করে

**Appwrite collections (leader-related):**
- `leaders` — discover-leaders + update-leaders উভয়েই ব্যবহার করে
- `timeline` — generate-timeline ব্যবহার করে
- `leader_discovery_meta` — 3-day gate state (docId: `state`, field: `lastRunBdDate`)

---

## 🔧 প্রথমবার Setup (Appwrite bootstrap)

1. Netlify env vars সেট করুন (উপরের সব Appwrite + Groq + salt vars)
2. Admin panel → Settings → System Tools → **Bootstrap Appwrite** চাপুন
3. সফল হলে সব collections/indexes/permissions auto-create হবে (alerts, poll_results_daily, poll_dedupe_daily, push_subscriptions, notification_history, leaders, timeline, leader_discovery_meta)
