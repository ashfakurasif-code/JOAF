const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT  = '6a11b6cd000b59f318eb';
const AW_KEY      = process.env.APPWRITE_API_KEY;
const AW_DB       = 'joaf';
const AW_H        = { 'Content-Type': 'application/json', 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY };

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function buildHtml(pr, id) {
  const title = escapeHtml(pr.title || 'প্রেস রিলিজ');
  const summary = escapeHtml(pr.summary || '');
  const imgRaw = pr.img ? (pr.img.startsWith('http') ? pr.img : 'https://julyforum.com' + pr.img) : 'https://julyforum.com/logoc7c3.png';
const img = imgRaw.split('/').map((seg, i) => i < 3 ? seg : encodeURIComponent(seg)).join('/');
  const pageUrl = `https://julyforum.com/press-releases/view.html?id=${id}`;
  const content = pr.content ? `<p>${escapeHtml(pr.content).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p>` : `<p>${summary}</p>`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
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
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/site.webmanifest">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/css/material-design-iconic-font.min.css">
  <link rel="stylesheet" href="/css/pluginsc7c3.css">
  <link rel="stylesheet" href="/css/stylec7c3.css">
  <link rel="stylesheet" href="/css/joaf.css?v=6.6">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QV3CFV7R98"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QV3CFV7R98');</script>
  <script src="/js/modernizr-2.8.3.min.js"></script>
  <style>
    .pr-hero{background:linear-gradient(135deg,#1a1a2e,#90161f);padding:50px 0 36px;color:#fff;}
    .pr-hero h1{font-size:clamp(1.5rem,4vw,2.2rem);font-weight:900;line-height:1.3;}
    .pr-date-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px;}
    .pr-img-wrap{border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.25);margin-bottom:28px;position:relative;}
    .pr-img-wrap img{width:100%;display:block;}
    .pr-date-on-img-top{position:absolute;top:14px;left:14px;background:var(--brand);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;}
    .pr-body{font-size:16px;line-height:2;color:#374151;}
    .pr-body p{margin-bottom:16px;}
    .pr-share{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:2px solid #f0f0f0;}
    .pr-share a{padding:8px 18px;border-radius:20px;color:#fff;text-decoration:none;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;transition:.2s;}
    .pr-share a:hover{opacity:.85;transform:translateY(-1px);color:#fff;}
    .sidebar-card{background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.09);overflow:hidden;margin-bottom:20px;}
    .sidebar-card .sc-head{background:linear-gradient(135deg,var(--brand),var(--accent));color:#fff;padding:12px 16px;font-weight:700;font-size:14px;}
    .sc-pr-item{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f5f5f5;text-decoration:none;color:var(--text);transition:.2s;}
    .sc-pr-item:hover{background:#fafafa;}
    .sc-pr-item img{width:56px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;}
    .sc-pr-info h4{font-size:13px;font-weight:700;margin:0 0 3px;color:var(--brand);}
    .sc-pr-info span{font-size:11px;color:#9ca3af;}
  </style>
</head>
<body data-page="media">
<div id="joaf-preloader">
  <img src="/logoc7c3.png" alt="JOAF" class="preloader-logo">
  <p class="preloader-text">লোড হচ্ছে...</p>
  <div class="preloader-bar"></div>
</div>
<div class="wrapper fix">
  <div id="joaf-header"></div>
  <div id="joaf-ticker"></div>
  <section class="pr-hero">
    <div class="container">
      <div>
        <div class="pr-date-badge"><i class="zmdi zmdi-calendar"></i> ${escapeHtml(pr.date || '')}</div>
        <h1>${title}</h1>
        <p style="opacity:.82;font-size:15px;max-width:640px;margin-top:10px">${summary}</p>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="pr-img-wrap">
            <img src="${img}" alt="${title}" loading="eager" onerror="this.src='/logoc7c3.png'">
            <div class="pr-date-on-img-top"><i class="zmdi zmdi-calendar"></i> ${escapeHtml(pr.date || '')}</div>
          </div>
          <div class="pr-body">${content}</div>
          <div class="pr-share">
            <strong style="font-size:14px;align-self:center">শেয়ার করুন:</strong>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" style="background:#3b5998"><i class="zmdi zmdi-facebook"></i> Facebook</a>
            <a href="https://wa.me/?text=${encodeURIComponent((pr.title||'') + '\n' + pageUrl)}" target="_blank" style="background:#25d366"><i class="zmdi zmdi-whatsapp"></i> WhatsApp</a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(pr.title||'')}&url=${encodeURIComponent(pageUrl)}" target="_blank" style="background:#1da1f2"><i class="zmdi zmdi-twitter"></i> Twitter</a>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="sidebar-card">
            <div class="sc-head">📰 আরও প্রেস রিলিজ</div>
            <div id="sidebarPR"></div>
          </div>
          <a href="/media-news.html" class="btn btn-outline-danger w-100 mt-2">← সব প্রেস রিলিজ</a>
        </div>
      </div>
    </div>
  </section>
  <div id="joaf-footer"></div>
  <div id="joaf-maze"></div>
</div>
<script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous" defer></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous" defer></script>
<script src="/js/plugins.js" defer></script>
<script src="/js/data.js"></script>
<script src="/js/components.js"></script>
<script src="/js/rainbow-swirl-cursor.js" defer></script>
<script>
(async () => {
  try {
    const currentId = new URLSearchParams(location.search).get('id');
    const r = await fetch('https://fra.cloud.appwrite.io/v1/databases/joaf/collections/press_releases/documents?limit=5&orderType=DESC', {
      headers: { 'X-Appwrite-Project': '6a11b6cd000b59f318eb' }
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const others = (data.documents || []).filter(d => d.$id !== currentId).slice(0,4);
    document.getElementById('sidebarPR').innerHTML = others.map(d => {
      const oImg = d.img || '/logoc7c3.png';
      return \`<a href="/press-releases/view.html?id=\${d.$id}" class="sc-pr-item">
        <img src="\${oImg}" alt="\${d.title||''}" loading="lazy" onerror="this.src='/logoc7c3.png'">
        <div class="sc-pr-info"><h4>\${d.title||''}</h4><span>\${d.date||''}</span></div>
      </a>\`;
    }).join('');
  } catch(e) { console.warn('Sidebar error', e); }
  window.addEventListener('load', () => { const pl = document.getElementById('joaf-preloader'); if(pl) setTimeout(()=>pl.classList.add('hidden'),300); });
})();
</script>
<script>document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll(".joaf-reveal,.joaf-reveal-zoom,.joaf-reveal-flip,.joaf-reveal-left,.joaf-reveal-right,.joaf-reveal-scale").forEach(function(e){e.classList.add("visible");});});</script>
</body>
</html>`;
}

exports.handler = async (event) => {
  const id = event.queryStringParameters?.id;
  if (!id) return { statusCode: 302, headers: { Location: '/media-news.html' }, body: '' };
  try {
    const r = await fetch(`${AW_ENDPOINT}/databases/${AW_DB}/collections/press_releases/documents/${id}`, { headers: AW_H });
    if (!r.ok) return { statusCode: 302, headers: { Location: '/media-news.html' }, body: '' };
    const doc = await r.json();
    const html = buildHtml(doc, id);
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }, body: html };
  } catch (err) {
    console.error('press-release-og error:', err);
    return { statusCode: 302, headers: { Location: '/media-news.html' }, body: '' };
  }
};
