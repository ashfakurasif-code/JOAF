// ============================================================
// JOAF Components v4.0
// ✅ Header, Footer, Ticker, OG meta — সব এখানে
// ============================================================

const JOAFComponents = {

  // ── Header ──────────────────────────────────────────────
  renderHeader(activePage = '') {
    const s = JOAF.site;
    const navItems = JOAF.nav.map(item => {
      const active = item.id === activePage ? 'active' : '';
      return `<li class="${active}"><a href="${item.href}" ${active ? 'aria-current="page"' : ''}>${item.label}</a></li>`;
    }).join('');

    return `<header class="header-area" role="banner">
      <div class="header-top">
        <div class="container">
          <div class="row align-items-center" style="min-height:30px">
            <div class="col-12 text-center" id="header-meta-info">
              <span id="hm-loc"><i class="zmdi zmdi-pin"></i> ঢাকা</span>
              <span id="hm-date"><i class="zmdi zmdi-calendar"></i></span>
              <span id="hm-time"><i class="zmdi zmdi-time"></i></span>
            </div>
          </div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="container">
          <div class="row align-items-center" style="padding:4px 0">
            <div class="col-auto">
              <div class="navbar-header d-flex align-items-center" style="gap:0">
                <a href="/" class="logo navbar-brand">
                  <img src="${s.logo}?v=${s.version}" alt="${s.abbr}" style="max-width:105px">
                </a>
                <button class="navbar-toggle collapsed d-block d-md-none"
                  data-bs-toggle="collapse" data-bs-target="#main-menu"
                  aria-label="মেনু" aria-expanded="false"
                  style="margin-left:12px;background:var(--brand);border:none;border-radius:8px;padding:6px 10px;color:#fff;font-size:20px;">
                  <i class="zmdi zmdi-menu menu-open"></i>
                  <i class="zmdi zmdi-close menu-close" style="display:none"></i>
                </button>
              </div>
            </div>
            <div class="col">
              <nav class="main-menu collapse" id="main-menu" aria-label="প্রধান নেভিগেশন">
                <ul style="justify-content:flex-end">${navItems}</ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>`;
  },

  // ── Ticker ──────────────────────────────────────────────
  renderTicker() {
    // Duplicate items for seamless CSS loop
    const items = [...JOAF.ticker, ...JOAF.ticker]
      .map(t => `<span class="ticker-item"><a href="${t.href}">${t.text}</a><span class="ticker-sep">•</span></span>`)
      .join('');
    return `<div class="announcement-ticker" role="marquee" aria-label="সর্বশেষ ঘোষণা">
      <span class="ticker-label">🔴 সর্বশেষ</span>
      <div class="ticker-track">${items}</div>
    </div>`;
  },

  // ── Footer ──────────────────────────────────────────────
  renderFooter() {
    const s = JOAF.site;
    const links = JOAF.nav.slice(0, 7).map(item =>
      `<li><a href="${item.href}">${item.label}</a></li>`
    ).join('');
    return `<footer id="footer-area" class="footer-area section" role="contentinfo">
      <div class="container">
        <div class="row">
          <div class="col-md-4 col-12 mb-40">
            <img src="${s.logo}" alt="${s.abbr}" style="max-width:85px;margin-bottom:12px;filter:brightness(10)">
            <h4>${s.name}</h4>
            <p>${s.tagline2}</p>
            <p style="margin-top:10px;font-size:12px;opacity:.55">© ${new Date().getFullYear()} ${s.name}</p>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>⚡ দ্রুত লিঙ্ক</h4>
            <ul>${links}</ul>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>📬 যোগাযোগ</h4>
            <p><i class="zmdi zmdi-email"></i> <a href="mailto:${s.email}">${s.email}</a></p>
            <p><i class="zmdi zmdi-map-pin"></i> ${s.address}</p>
            <div class="footer-social" style="margin-top:14px">
              <a href="${s.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="zmdi zmdi-facebook"></i></a>
              <a href="${s.social.twitter}" target="_blank" rel="noopener" aria-label="Twitter"><i class="zmdi zmdi-twitter"></i></a>
              <a href="${s.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="zmdi zmdi-instagram"></i></a>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="/financial-report.html" style="background:var(--brand);color:#fff;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none">আর্থিক বিবরণী</a>
              <a href="/privacy.html" style="background:#333;color:#fff;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none">গোপনীয়তা</a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>দেশ আগে, দল পরে — ${s.abbr} |
          <a href="/membership.html">✊ যোগ দিন</a> |
          <a href="/donate.html">💚 সহযোগিতা</a>
        </p>
      </div>
    </footer>`;
  },

  // ── Clock ────────────────────────────────────────────────
  startClock() {
    const loc = document.getElementById('hm-loc');
    const dateEl = document.getElementById('hm-date');
    const timeEl = document.getElementById('hm-time');
    if (!dateEl) return;
    // IP location
    if (loc) {
      fetch('https://ipapi.co/json/').then(r => r.json())
        .then(d => { loc.innerHTML = `<i class="zmdi zmdi-pin"></i> ${BanglaUtil.toCity(d.city || 'Dhaka')}`; })
        .catch(() => {});
    }
    const tick = () => {
      const now = new Date();
      if (dateEl) dateEl.innerHTML = `<i class="zmdi zmdi-calendar"></i> ${BanglaUtil.formatDate(now)}`;
      if (timeEl) timeEl.innerHTML = `<i class="zmdi zmdi-time"></i> ${BanglaUtil.formatTime(now)}`;
    };
    tick(); setInterval(tick, 1000);
  },

  // ── Scroll Top Button ───────────────────────────────────
  addScrollTop() {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'উপরে যান');
    btn.style.cssText = 'position:fixed;bottom:76px;right:18px;z-index:9999;background:var(--brand);color:#fff;border:none;border-radius:50%;width:42px;height:42px;font-size:19px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25);opacity:0;transition:opacity .3s,transform .3s;transform:translateY(10px);display:flex;align-items:center;justify-content:center;';
    btn.innerHTML = '<i class="zmdi zmdi-chevron-up"></i>';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      const show = window.scrollY > 400;
      btn.style.opacity = show ? '1' : '0';
      btn.style.transform = show ? 'translateY(0)' : 'translateY(10px)';
    });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ── WhatsApp Float ──────────────────────────────────────
  addWhatsApp() {
    const a = document.createElement('a');
    a.href = `https://wa.me/?text=${encodeURIComponent(JOAF.site.name + '\n' + window.location.href)}`;
    a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', 'WhatsApp শেয়ার');
    a.style.cssText = 'position:fixed;bottom:126px;right:18px;z-index:9998;background:#25d366;color:#fff;border-radius:50%;width:42px;height:42px;font-size:21px;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s;';
    a.innerHTML = '<i class="zmdi zmdi-whatsapp"></i>';
    a.onmouseenter = () => a.style.transform = 'scale(1.1)';
    a.onmouseleave = () => a.style.transform = 'scale(1)';
    document.body.appendChild(a);
  },

  // ── Scroll Animations ───────────────────────────────────
  initAnimations() {
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), i * 70);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.07 });
      document.querySelectorAll('.joaf-reveal,.joaf-reveal-left,.joaf-reveal-scale')
        .forEach(el => obs.observe(el));
    } else {
      document.querySelectorAll('.joaf-reveal,.joaf-reveal-left,.joaf-reveal-scale')
        .forEach(el => el.classList.add('visible'));
    }
  },

  // ── Lazy Images ─────────────────────────────────────────
  lazyImages() {
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const img = e.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '100px' });
      document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
    }
  },

  // ── OG / Social Meta ────────────────────────────────────
  injectOGMeta(config = {}) {
    const s = JOAF.site;
    const title = config.title || document.title;
    const desc = config.desc || document.querySelector('meta[name="description"]')?.content || s.tagline2;
    const img = config.img || (s.baseUrl + s.logo);
    const url = config.url || (typeof window !== 'undefined' ? window.location.href : s.baseUrl);
    const set = (prop, val, isName = false) => {
      let el = document.querySelector(`meta[${isName ? 'name' : 'property'}="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(isName ? 'name' : 'property', prop); document.head.appendChild(el); }
      el.setAttribute('content', val);
    };
    set('og:title', title); set('og:description', desc);
    set('og:image', img); set('og:image:width', '1600'); set('og:image:height', '900');
    set('og:url', url); set('og:type', 'website'); set('og:site_name', s.name);
    set('fb:app_id', s.fbAppId);
    set('twitter:card', 'summary_large_image', true);
    set('twitter:title', title, true); set('twitter:description', desc, true);
    set('twitter:image', img, true);
  },

  // ── Preloader hide ──────────────────────────────────────
  hidePreloader() {
    const el = document.getElementById('joaf-preloader');
    if (el) setTimeout(() => el.classList.add('hidden'), 300);
  },

  // ── Main Init ───────────────────────────────────────────
  init(pageId) {
    // Header
    const hp = document.getElementById('joaf-header');
    if (hp) hp.outerHTML = this.renderHeader(pageId);

    // Ticker (inject after header if exists)
    const ta = document.getElementById('joaf-ticker');
    if (ta) ta.outerHTML = this.renderTicker();

    // Footer
    const fp = document.getElementById('joaf-footer');
    if (fp) fp.outerHTML = this.renderFooter();

    this.startClock();
    this.addScrollTop();
    this.addWhatsApp();
    this.lazyImages();
    this.injectOGMeta();
    setTimeout(() => this.initAnimations(), 120);
    this.hidePreloader();

    // Mobile nav toggle icon swap
    document.addEventListener('click', e => {
      const btn = e.target.closest('.navbar-toggle');
      if (!btn) return;
      const open = btn.querySelector('.menu-open');
      const close = btn.querySelector('.menu-close');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (open) open.style.display = expanded ? 'none' : 'inline';
      if (close) close.style.display = expanded ? 'inline' : 'none';
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page ||
    window.location.pathname.split('/').pop().replace('.html', '') || 'home';
  JOAFComponents.init(page);
});
