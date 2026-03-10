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
