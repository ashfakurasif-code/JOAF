# JOAF v3.0 — Developer Guide

## ফাইল স্ট্রাকচার

```
joaf-v3/
├── index.html              ← Home page
├── events.html             ← Events
├── media-news.html         ← Media & Press Releases  
├── membership.html         ← Membership form
├── donate.html             ← Donation page
├── joaf-polls.html         ← Polls
├── community.html          ← Community
├── financial-report.html   ← Financial report
├── financial-policy.html   ← Financial policy
├── press-release-1..8.html ← Press releases
├── privacy.html            ← Privacy policy
├── css/
│   ├── joaf.css            ← 🔴 MAIN CSS — এখানে সব design
│   ├── stylec7c3.css       ← Base theme (original)
│   └── pluginsc7c3.css     ← Plugin styles (original)
├── js/
│   ├── data.js             ← 🔴 CENTRAL DATA — member info, nav, stats সব এখানে
│   ├── components.js       ← 🔴 Header/Footer auto-inject
│   ├── plugins.js          ← jQuery plugins
│   └── rainbow-swirl-cursor.js
└── netlify/
    └── functions/
        └── vote.js         ← Poll votes (upgrade path documented)
```

## কোথায় কী বদলাবেন

### নতুন member যোগ করতে:
`js/data.js` → `JOAF.nucleus` array তে নতুন object যোগ করুন

### Nav বদলাতে:
`js/data.js` → `JOAF.nav` array

### Header/Footer বদলাতে:
`js/components.js` → `renderHeader()` বা `renderFooter()` function

### Design বদলাতে:
`css/joaf.css` → CSS variables at top: `--brand`, `--accent` etc.

### নতুন Press Release যোগ করতে:
1. `js/data.js` → `JOAF.pressReleases` array তে যোগ করুন
2. নতুন HTML file বানান: `press-release-9.html`
3. Automatically সব page এ দেখাবে

## Social links আপডেট করুন
`js/data.js` → `JOAF.site.social` object

## Google Analytics
`js/data.js` → `JOAF.site.gaId` (একটাই জায়গায়)

## Deploy (Netlify)
```bash
git add .
git commit -m "JOAF v3.0"
git push
```
Netlify auto-deploy করবে।

## Polls Persistent বানাতে:
`netlify/functions/vote.js` এর comment এ upgrade path দেওয়া আছে।
Free option: Netlify Blobs বা Supabase free tier।
