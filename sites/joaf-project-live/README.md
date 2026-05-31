# JOAF Platform — Quick Deploy Guide

## 🚀 একবার করলেই চিরতরে অটো-ডিপ্লয়

### ধাপ ১ — GitHub Secrets সেট করুন

`SECRETS_SETUP.md` ফাইলটি দেখুন এবং সেখানে দেওয়া প্রতিটি Secret আপনার GitHub Repository-তে যোগ করুন:

**GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

### ধাপ ২ — Git Push করুন

```bash
git add .
git commit -m "deploy: JOAF production"
git push origin main
```

**ব্যস!** GitHub Actions অটোমেটিক:
1. সব Appwrite Functions ডিপ্লয় করবে (groq-proxy, fb-autopost, fb-scheduler, fb-insights সহ সব)
2. সব ENV variables সেট করবে
3. Static site ডিপ্লয় করবে

### ধাপ ৩ — প্রথমবার DB Schema তৈরি করুন

Deploy সফল হওয়ার পর, Admin Panel থেকে একবার **"Init Database"** বাটনে ক্লিক করুন।
এটি Appwrite-এ সব Collection ও Index তৈরি করে দেবে।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
joaf/
├── .github/workflows/deploy.yml   ← অটো-ডিপ্লয় পাইপলাইন
├── appwrite.json                   ← সব functions কনফিগ
├── SECRETS_SETUP.md                ← কোন Secrets লাগবে
├── admin/                          ← Admin panel
│   └── index.html
├── tools/
│   └── news-card-generator.html   ← সব-ইন-ওয়ান Studio (card+reel+batch+queue)
├── appwrite-functions/
│   ├── groq-proxy/                 ← AI Gateway (OpenRouter→Gemini→Groq)
│   ├── fb-autopost/                ← Facebook posting (scheduled fix করা)
│   ├── fb-scheduler/               ← Hourly queue processor (double-publish safe)
│   ├── fb-insights/                ← Engagement analytics (নতুন)
│   ├── discover-leaders/           ← RSS→AI→Leaders (dedup করা)
│   ├── generate-timeline/          ← Daily timeline generation
│   ├── update-leaders/             ← Leader profile refresh
│   ├── send-notification/          ← Push notifications
│   ├── save-subscription/          ← Push subscription save
│   ├── get-stats/                  ← Admin stats
│   ├── fetch-rss/                  ← RSS proxy
│   ├── fb-config/                  ← FB App ID serving
│   ├── github-upload/              ← Admin file upload
│   ├── hf-video-proxy/             ← Video generation proxy
│   ├── press-release-og/           ← OG meta tags
│   └── vote/                       ← Poll voting
├── js/
│   ├── ai/
│   │   ├── aimaster.js             ← Two-phase AI engine (fix করা)
│   │   └── ocrEngine.js            ← Tesseract.js Bangla OCR (নতুন)
│   ├── queue/
│   │   ├── queuesystem.js          ← Queue system (class bug fix করা)
│   │   └── fbpublisher.js          ← FB publisher
│   └── render/
│       ├── baserenderer.js
│       └── typography.js
└── ...
```

## 🔧 কী কী Fix হয়েছে

| # | সমস্যা | Status |
|---|--------|--------|
| 1 | `_persistToQueue` class-এর বাইরে ছিল → publish সবসময় crash করত | ✅ Fixed |
| 2 | Scheduled video/image post → Facebook 400 error | ✅ Fixed |
| 3 | `groq-proxy`-তে কোনো auth নেই → quota চুরি হওয়ার ঝুঁকি | ✅ Fixed |
| 4 | AI JSON truncation → silent content degradation | ✅ Fixed (2-phase + retry) |
| 5 | Batch publish-এ blob URL leak → memory exhaustion | ✅ Fixed |
| 6 | Double-publish race condition scheduler-এ | ✅ Fixed (lock token) |
| 7 | OpenRouter wrong model slug | ✅ Fixed |
| 8 | Duplicate studio tools (fb-smart-studio + fb-reel-studio + news-card-generator) | ✅ Consolidated |
| 9 | Headline duplication → inflated AI confidence | ✅ Fixed (trigram dedup) |
| 10 | `ocrEngine.js` missing | ✅ Added (Tesseract.js bn+en) |

## 🆕 নতুন যা যোগ হয়েছে

- **`fb-insights`** — প্রতিদিন real Facebook engagement data নিয়ে AI prediction calibrate করে
- **`ocrEngine.js`** — Bangla + English OCR (Tesseract.js, browser-native)
- **`extendWithReelFields()`** — Reel studio খুললে তখনই extended AI fields generate হয়, সবসময় নয়
