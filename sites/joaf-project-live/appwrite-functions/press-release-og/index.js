// Appwrite Function: press-release-og
// HTTP trigger — GET ?id=<docId>
// Generates OG-tag-rich HTML page for a press release

import { awGet } from './aw-utils.js';

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function buildHtml(pr, id) {
  const title   = escapeHtml(pr.title || 'প্রেস রিলিজ');
  const summary = escapeHtml(pr.summary || '');
  const imgRaw  = pr.img ? (pr.img.startsWith('http') ? pr.img : 'https://www.julyforum.com' + pr.img) : 'https://www.julyforum.com/logoc7c3.png';
  const img     = imgRaw.split('/').map((seg, i) => i < 3 ? seg : encodeURIComponent(seg)).join('/');
  const pageUrl = `https://www.julyforum.com/press-releases/view.html?id=${id}`;
  const content = pr.content
    ? `<p>${escapeHtml(pr.content).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p>`
    : `<p>${summary}</p>`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — জোয়াফ</title>
  <meta name="description" content="${summary}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${summary}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম">
  <meta property="fb:app_id" content="1114707634145642">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${summary}">
  <meta name="twitter:image" content="${img}">
  <link rel="canonical" href="${pageUrl}">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <link rel="stylesheet" href="/css/stylec7c3.css">
  <link rel="stylesheet" href="/css/joaf.css?v=6.6">
  <style>
    .pr-hero{background:linear-gradient(135deg,#1a1a2e,#90161f);padding:50px 0 36px;color:#fff;}
    .pr-hero h1{font-size:clamp(1.5rem,4vw,2.2rem);font-weight:900;line-height:1.3;}
    .pr-body{font-size:16px;line-height:2;color:#374151;}
    .pr-body p{margin-bottom:16px;}
    .pr-share{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:2px solid #f0f0f0;}
    .pr-share a{padding:8px 18px;border-radius:20px;color:#fff;text-decoration:none;font-weight:700;font-size:13px;}
  </style>
</head>
<body>
<section class="pr-hero">
  <div class="container">
    <h1>${title}</h1>
    <p style="opacity:.82;font-size:15px;max-width:640px;margin-top:10px">${summary}</p>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="row g-4">
      <div class="col-lg-8">
        <img src="${img}" alt="${title}" style="width:100%;border-radius:12px;margin-bottom:20px" onerror="this.src='/logoc7c3.png'">
        <div class="pr-body">${content}</div>
        <div class="pr-share">
          <strong style="font-size:14px;align-self:center">শেয়ার করুন:</strong>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" style="background:#3b5998">Facebook</a>
          <a href="https://wa.me/?text=${encodeURIComponent((pr.title||'') + '\n' + pageUrl)}" target="_blank" style="background:#25d366">WhatsApp</a>
        </div>
      </div>
      <div class="col-lg-4">
        <a href="/media-news.html" class="btn btn-outline-danger w-100">← সব প্রেস রিলিজ</a>
      </div>
    </div>
  </div>
</section>
</body>
</html>`;
}

export default async ({ req, res, log, error }) => {
  const id = req.query?.id;
  if (!id) return res.redirect('/media-news.html');

  try {
    const docSnap = await awGet('press_releases', id);
    if (!docSnap) return res.redirect('/media-news.html');
    const html = buildHtml(docSnap.data, id);
    log(`press-release-og: served ${id}`);
    return res.send(html, 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
  } catch (err) {
    error('press-release-og error: ' + err.message);
    return res.redirect('/media-news.html');
  }
};
