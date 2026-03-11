// ============================================================
// JOAF Components v4.1 — Header, Footer, Ticker, OG meta
// Fix: init timing, ticker inject, Bangla nav
// ============================================================

const JOAFComponents = {

  // ── Header ──────────────────────────────────────────────
  renderHeader(activePage) {
    const s = JOAF.site;
    const navItems = JOAF.nav.map(item => {
      const active = item.id === activePage ? 'active' : '';
      return `<li class="${active}"><a href="${item.href}"${active ? ' aria-current="page"' : ''}>${item.label}</a></li>`;
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
              <div class="d-flex align-items-center" style="gap:0">
                <a href="/" class="logo navbar-brand">
                  <img src="${s.logo}?v=${s.version}" alt="${s.abbr}" style="max-width:105px">
                </a>
                <button class="navbar-toggle d-block d-md-none" id="navToggleBtn"
                  aria-label="মেনু" aria-expanded="false"
                  style="margin-left:12px;background:var(--brand);border:none;border-radius:8px;padding:7px 11px;color:#fff;font-size:20px;cursor:pointer;z-index:10001;position:relative">
                  <i class="zmdi zmdi-menu" id="menuOpenIcon"></i>
                </button>
              </div>
            </div>
            <div class="col">
              <nav class="main-menu" id="main-menu" aria-label="প্রধান নেভিগেশন" style="display:none">
                <ul style="justify-content:flex-end">${navItems}</ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile nav overlay -->
    <div id="mobile-nav-overlay" style="
      display:none;position:fixed;inset:0;z-index:10000;
      background:rgba(13,13,26,.97);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      flex-direction:column;align-items:center;justify-content:center;
      transition:opacity .3s ease,visibility .3s ease;opacity:0;visibility:hidden;
    ">
      <button id="mobileNavClose" aria-label="বন্ধ করুন" style="
        position:absolute;top:18px;right:18px;
        width:44px;height:44px;border-radius:50%;
        background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);
        color:#fff;font-size:22px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
      "><i class="zmdi zmdi-close"></i></button>

      <div style="text-align:center;margin-bottom:28px">
        <img src="${s.logo}" alt="${s.abbr}" style="width:52px;filter:brightness(10);margin-bottom:10px">
        <div style="color:rgba(255,255,255,.5);font-size:11px;letter-spacing:2px;text-transform:uppercase">${s.tagline}</div>
      </div>

      <nav style="width:100%;max-width:320px;padding:0 24px">
        <ul style="list-style:none;padding:0;margin:0">
          ${JOAF.nav.map((item, idx) => {
            const active = item.id === activePage ? 'style="color:var(--gold)!important"' : '';
            return `<li style="transform:translateX(-30px);opacity:0;transition:transform .4s ease ${idx*.06}s, opacity .4s ease ${idx*.06}s" class="mnav-item">
              <a href="${item.href}" ${active} style="
                display:flex;align-items:center;gap:12px;
                padding:13px 16px;border-radius:12px;
                color:#fff;text-decoration:none;font-size:15px;font-weight:700;
                border:1px solid rgba(255,255,255,0);
                transition:background .2s,border-color .2s;
              "
              onmouseover="this.style.background='rgba(255,255,255,.08)';this.style.borderColor='rgba(255,255,255,.12)'"
              onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,255,255,0)'"
              >${item.label}</a>
            </li>`;
          }).join('')}
        </ul>
      </nav>

      <div style="margin-top:28px;display:flex;gap:12px">
        <a href="${s.social.facebook}" target="_blank" rel="noopener" style="width:40px;height:40px;border-radius:50%;background:#3b5998;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none"><i class="zmdi zmdi-facebook"></i></a>
        <a href="${s.social.whatsapp}" target="_blank" rel="noopener" style="width:40px;height:40px;border-radius:50%;background:#25d366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none"><i class="zmdi zmdi-whatsapp"></i></a>
        <a href="${s.social.twitter}" target="_blank" rel="noopener" style="width:40px;height:40px;border-radius:50%;background:#1da1f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none"><i class="zmdi zmdi-twitter"></i></a>
      </div>
    </div>`;
  },
  },

  // ── Ticker ──────────────────────────────────────────────
  renderTicker() {
    const items = [...JOAF.ticker, ...JOAF.ticker]
      .map(t => `<span class="ticker-item"><a href="${t.href}">${t.text}</a><span class="ticker-sep">•</span></span>`)
      .join('');
    return `<div class="announcement-ticker" role="marquee" aria-label="সর্বশেষ ঘোষণা">
      <span class="ticker-label">🔴 সর্বশেষ</span>
      <div class="ticker-track" style="animation-duration:14s">${items}</div>
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
          <a href="/membership.html">✊ শামিল হোন</a> |
          <a href="/donate.html">💚 পাশে থাকুন</a>
        </p>
      </div>
    </footer>`;
  },

  // ── Clock / Date / Location ──────────────────────────────
  startClock() {
    const locEl  = document.getElementById('hm-loc');
    const dateEl = document.getElementById('hm-date');
    const timeEl = document.getElementById('hm-time');
    if (!dateEl && !timeEl) return;

    if (locEl) {
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { locEl.innerHTML = `<i class="zmdi zmdi-pin"></i> ${BanglaUtil.toCity(d.city || 'Dhaka')}`; })
        .catch(() => {});
    }

    const tick = () => {
      const now = new Date();
      if (dateEl) dateEl.innerHTML = `<i class="zmdi zmdi-calendar"></i> ${BanglaUtil.formatDate(now)}`;
      if (timeEl) timeEl.innerHTML = `<i class="zmdi zmdi-time"></i> ${BanglaUtil.formatTime(now)}`;
    };
    tick();
    setInterval(tick, 1000);
  },

  // ── Scroll-to-top button ─────────────────────────────────
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

  // ── WhatsApp float ───────────────────────────────────────
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

  // ── Scroll animations ────────────────────────────────────
  initAnimations() {
    const SEL = '.joaf-reveal,.joaf-reveal-left,.joaf-reveal-right,.joaf-reveal-scale,.joaf-reveal-flip,.joaf-reveal-zoom';
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll(SEL).forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });
    document.querySelectorAll(SEL).forEach(el => obs.observe(el));
  },

  // ── Lazy images ──────────────────────────────────────────
  lazyImages() {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '120px' });
    document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
  },

  // ── OG / Social meta ────────────────────────────────────
  injectOGMeta(config) {
    config = config || {};
    const s = JOAF.site;
    const title = config.title || document.title;
    const desc  = config.desc  || (document.querySelector('meta[name="description"]') || {}).content || s.tagline2;
    const img   = config.img   || (s.baseUrl + s.logo);
    const url   = config.url   || (typeof window !== 'undefined' ? window.location.href : s.baseUrl);
    const set = (prop, val, isName) => {
      const attr = isName ? 'name' : 'property';
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute('content', val);
    };
    set('og:title', title); set('og:description', desc);
    set('og:image', img);   set('og:image:width', '1600'); set('og:image:height', '900');
    set('og:url', url);     set('og:type', 'website');     set('og:site_name', s.name);
    set('fb:app_id', s.fbAppId);
    set('twitter:card', 'summary_large_image', true);
    set('twitter:title', title, true); set('twitter:description', desc, true);
    set('twitter:image', img, true);
  },

  // ── Preloader hide ───────────────────────────────────────
  hidePreloader() {
    const el = document.getElementById('joaf-preloader');
    if (el) setTimeout(() => el.classList.add('hidden'), 250);
  },

  // ── Mobile nav toggle ────────────────────────────────────
  initMobileNav() {
    const btn     = document.getElementById('navToggleBtn');
    const menu    = document.getElementById('main-menu');
    const overlay = document.getElementById('mobile-nav-overlay');
    const closeBtn= document.getElementById('mobileNavClose');

    // Desktop: show standard menu
    if (menu) {
      if (window.innerWidth >= 768) {
        menu.style.display = '';
      }
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
          menu.style.display = '';
          if (overlay) closeOverlay();
        } else {
          menu.style.display = 'none';
        }
      });
    }

    if (!overlay) return;

    const openOverlay = () => {
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
      });
      document.body.style.overflow = 'hidden';
      if (btn) btn.setAttribute('aria-expanded', 'true');
      // Animate nav items in
      setTimeout(() => {
        overlay.querySelectorAll('.mnav-item').forEach(el => {
          el.style.transform = 'translateX(0)';
          el.style.opacity = '1';
        });
      }, 50);
    };

    const closeOverlay = () => {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      document.body.style.overflow = '';
      if (btn) btn.setAttribute('aria-expanded', 'false');
      // Reset item positions
      overlay.querySelectorAll('.mnav-item').forEach(el => {
        el.style.transform = 'translateX(-30px)';
        el.style.opacity = '0';
      });
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    };

    if (btn) {
      btn.addEventListener('click', () => {
        if (overlay.style.opacity === '1') closeOverlay();
        else openOverlay();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

    // Close on link click
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeOverlay);
    });

    // Close on backdrop click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeOverlay();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeOverlay();
    });
  },

  // ── Main Init ────────────────────────────────────────────
  init(pageId) {
    pageId = pageId || 'home';

    // Inject header
    const hp = document.getElementById('joaf-header');
    if (hp) hp.outerHTML = this.renderHeader(pageId);

    // Inject ticker
    const ta = document.getElementById('joaf-ticker');
    if (ta) ta.outerHTML = this.renderTicker();
    // Fallback: if ticker still not in DOM, insert after header
    setTimeout(() => {
      if (!document.querySelector('.announcement-ticker')) {
        const hdr = document.querySelector('header.header-area');
        if (hdr) {
          const div = document.createElement('div');
          div.innerHTML = this.renderTicker();
          hdr.insertAdjacentElement('afterend', div.firstElementChild);
        }
      }
    }, 100);

    // Inject footer
    const fp = document.getElementById('joaf-footer');
    if (fp) fp.outerHTML = this.renderFooter();

    this.startClock();
    this.addScrollTop();
    this.addWhatsApp();
    this.lazyImages();
    this.injectOGMeta();
    this.initMobileNav();

    // Run immediately for above-fold elements, then again for late-rendered ones
    this.initAnimations();
    setTimeout(() => this.initAnimations(), 300);
    this.hidePreloader();
  }
};

// ── Safe init: works whether DOM is ready or not ─────────────
// This is the KEY fix — handles both sync and async script loading
function _joafInit() {
  const page = (document.body && document.body.dataset.page) ||
    window.location.pathname.split('/').pop().replace('.html', '').replace('/', '') || 'home';
  JOAFComponents.init(page);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _joafInit);
} else {
  // DOM already ready (scripts loaded at bottom of body)
  _joafInit();
}
