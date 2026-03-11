// ============================================================
// JOAF Components v7.0
// ✅ Mobile nav overlay — guaranteed working
// ✅ Ticker — ultra fast on mobile (3s), smooth on desktop (12s)
// ✅ Mute button — always visible, always works
// ✅ 2026 modern design system
// ============================================================

const JOAFComponents = {

  // ── Header ──────────────────────────────────────────────
  renderHeader(activePage) {
    const s = JOAF.site;
    const navItems = JOAF.nav.map(item => {
      const active = item.id === activePage ? 'active' : '';
      return `<li class="${active}"><a href="${item.href}"${active ? ' aria-current="page"' : ''}>${item.label}</a></li>`;
    }).join('');

    const mobileNavItems = JOAF.nav.map((item, idx) => {
      const isActive = item.id === activePage;
      return `<li class="mnav-item" style="
        transform:translateY(20px) scale(.96);
        opacity:0;
        transition:transform .38s cubic-bezier(.34,1.4,.64,1) ${idx * .055}s, opacity .35s ease ${idx * .055}s;
      ">
        <a href="${item.href}" class="mnav-link ${isActive ? 'mnav-link--active' : ''}"
           ontouchstart="" 
           onclick="if(window._joafNavClose)window._joafNavClose()">
          <span class="mnav-label">${item.label}</span>
          <span class="mnav-arrow">›</span>
        </a>
      </li>`;
    }).join('');

    return `
    <!-- ══ HEADER ══════════════════════════════════════════ -->
    <header class="joaf-header" role="banner" id="joaf-header-el">
      <div class="joaf-header-top">
        <div class="container">
          <div class="joaf-header-meta" id="header-meta-info">
            <span id="hm-loc"><i class="zmdi zmdi-pin"></i> ঢাকা</span>
            <span id="hm-date"><i class="zmdi zmdi-calendar"></i></span>
            <span id="hm-time"><i class="zmdi zmdi-time"></i></span>
          </div>
        </div>
      </div>

      <div class="joaf-header-main">
        <div class="container">
          <div class="joaf-header-row">

            <!-- Logo + hamburger -->
            <div class="joaf-header-brand">
              <a href="/" class="joaf-logo" aria-label="JOAF হোম">
                <img src="${s.logo}?v=${s.version}" alt="${s.abbr}">
              </a>

              <!-- Hamburger — mobile only -->
              <button class="joaf-hamburger d-md-none" id="joafHamBtn"
                aria-label="মেনু খুলুন" aria-expanded="false" aria-controls="joafMobileNav">
                <span class="joaf-hamburger-bar"></span>
                <span class="joaf-hamburger-bar"></span>
                <span class="joaf-hamburger-bar"></span>
              </button>
            </div>

            <!-- Desktop nav -->
            <nav class="joaf-desktop-nav d-none d-md-flex" id="main-menu" role="navigation" aria-label="প্রধান নেভিগেশন">
              <ul>${navItems}</ul>
            </nav>

          </div>
        </div>
      </div>
    </header>

    <!-- ══ MOBILE NAV OVERLAY ════════════════════════════════ -->
    <div class="joaf-mobile-nav" id="joafMobileNav" aria-hidden="true" role="dialog" aria-label="মোবাইল নেভিগেশন">

      <!-- Backdrop -->
      <div class="joaf-mnav-backdrop" id="joafMNavBackdrop"></div>

      <!-- Panel -->
      <div class="joaf-mnav-panel" id="joafMNavPanel">

        <!-- Panel header -->
        <div class="joaf-mnav-head">
          <div class="joaf-mnav-brand">
            <img src="${s.logo}" alt="JOAF" class="joaf-mnav-logo">
            <div>
              <div class="joaf-mnav-name">${s.abbr}</div>
              <div class="joaf-mnav-tagline">${s.tagline}</div>
            </div>
          </div>
          <button class="joaf-mnav-close" id="joafMNavClose" aria-label="মেনু বন্ধ করুন">
            <i class="zmdi zmdi-close"></i>
          </button>
        </div>

        <!-- Nav links -->
        <nav class="joaf-mnav-nav">
          <ul id="joafMNavList">${mobileNavItems}</ul>
        </nav>

        <!-- Panel footer socials -->
        <div class="joaf-mnav-footer">
          <a href="${s.social.facebook}" target="_blank" rel="noopener" class="joaf-mnav-social" aria-label="Facebook">
            <i class="zmdi zmdi-facebook"></i>
          </a>
          <a href="${s.social.whatsapp}" target="_blank" rel="noopener" class="joaf-mnav-social" aria-label="WhatsApp">
            <i class="zmdi zmdi-whatsapp"></i>
          </a>
          <a href="${s.social.twitter}" target="_blank" rel="noopener" class="joaf-mnav-social" aria-label="Twitter">
            <i class="zmdi zmdi-twitter"></i>
          </a>
          <a href="/membership.html" class="joaf-mnav-cta">
            ✊ যোগ দিন
          </a>
        </div>

      </div>
    </div>
    `;
  },

  // ── Ticker ──────────────────────────────────────────────
  renderTicker() {
    // Duplicate 3x so seamless loop works at high speed
    const items = [...JOAF.ticker, ...JOAF.ticker, ...JOAF.ticker]
      .map(t => `<span class="ticker-item"><a href="${t.href}">${t.text}</a><span class="ticker-sep">◆</span></span>`)
      .join('');

    return `<div class="announcement-ticker" role="marquee" aria-label="সর্বশেষ ঘোষণা">
      <span class="ticker-label">🔴 সর্বশেষ</span>
      <div class="ticker-track" id="joafTickerTrack">${items}</div>
    </div>`;
  },

  // ── Footer ──────────────────────────────────────────────
  renderFooter() {
    const s = JOAF.site;
    const links = JOAF.nav.slice(0, 8).map(item =>
      `<li><a href="${item.href}">${item.label}</a></li>`
    ).join('');
    return `<footer id="footer-area" class="footer-area section" role="contentinfo">
      <div class="container">
        <div class="row">
          <div class="col-md-4 col-12 mb-40">
            <img src="${s.logo}" alt="${s.abbr}" style="max-width:85px;margin-bottom:12px;filter:brightness(10)">
            <h4>${s.name}</h4>
            <p style="color:rgba(255,255,255,.82)">${s.tagline2}</p>
            <p style="margin-top:10px;font-size:12px;opacity:.75">© ${new Date().getFullYear()} ${s.name}</p>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>⚡ দ্রুত লিঙ্ক</h4>
            <ul>${links}</ul>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>📬 যোগাযোগ</h4>
            <p><i class="zmdi zmdi-email"></i> <a href="mailto:${s.email}">${s.email}</a></p>
            <p><i class="zmdi zmdi-map-pin"></i> ${s.address}</p>
            <div class="footer-social" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="${s.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-facebook"></i></a>
              <a href="${s.social.twitter}" target="_blank" rel="noopener" aria-label="Twitter" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-twitter"></i></a>
              <a href="${s.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-instagram"></i></a>
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

  // ── Ticker speed ─────────────────────────────────────────
  initTicker() {
    const track = document.getElementById('joafTickerTrack');
    if (!track) return;
    // Mobile: 4s, Tablet: 7s, Desktop: 13s
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    const dur = isMobile ? '4s' : isTablet ? '7s' : '13s';
    track.style.animationDuration = dur;
  },

  // ── Mobile nav ───────────────────────────────────────────
  initMobileNav() {
    const hamBtn   = document.getElementById('joafHamBtn');
    const panel    = document.getElementById('joafMNavPanel');
    const backdrop = document.getElementById('joafMNavBackdrop');
    const closeBtn = document.getElementById('joafMNavClose');
    const navEl    = document.getElementById('joafMobileNav');
    const items    = document.querySelectorAll('.mnav-item');

    if (!hamBtn || !panel || !navEl) return;

    let isOpen = false;

    const open = () => {
      if (isOpen) return;
      isOpen = true;
      navEl.classList.add('joaf-mnav--open');
      navEl.setAttribute('aria-hidden', 'false');
      hamBtn.setAttribute('aria-expanded', 'true');
      hamBtn.classList.add('joaf-hamburger--open');
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      // Stagger items in
      setTimeout(() => {
        items.forEach(el => {
          el.style.transform = 'translateY(0) scale(1)';
          el.style.opacity   = '1';
        });
      }, 60);

      // Global close function for onclick in links
      window._joafNavClose = close;
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;

      // Reset items
      items.forEach(el => {
        el.style.transform = 'translateY(20px) scale(.96)';
        el.style.opacity   = '0';
      });

      hamBtn.classList.remove('joaf-hamburger--open');
      hamBtn.setAttribute('aria-expanded', 'false');

      // Wait for item animation then close panel
      setTimeout(() => {
        navEl.classList.remove('joaf-mnav--open');
        navEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }, 180);

      window._joafNavClose = null;
    };

    hamBtn.addEventListener('click', e => {
      e.stopPropagation();
      isOpen ? close() : open();
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });
  },

  // ── Mute button ──────────────────────────────────────────
  initMuteButton() {
    const video   = document.getElementById('heroVideo');
    const muteBtn = document.getElementById('muteToggle');
    if (!video || !muteBtn) return;

    // Ensure muted + playing from start
    video.muted  = true;
    video.volume = 0.8;
    video.play().catch(() => {});

    // Ensure button is always visible regardless of parent
    muteBtn.style.display = 'flex';
    muteBtn.style.visibility = 'visible';
    muteBtn.style.opacity = '1';
    muteBtn.style.pointerEvents = 'auto';

    const update = () => {
      const muted = video.muted || video.volume === 0;
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(!muted));
      muteBtn.title = muted ? 'শব্দ চালু করুন' : 'নিঃশব্দ করুন';
    };
    update();

    muteBtn.addEventListener('click', () => {
      if (video.muted) {
        video.muted  = false;
        video.volume = 0.8;
        // iOS/Android: need user-gesture play
        video.play().catch(() => {
          video.muted = true;
        });
      } else {
        video.muted = true;
      }
      update();
    });

    // Also handle touchstart for iOS
    muteBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      muteBtn.click();
    }, { passive: false });

    // Trigger play on first user touch anywhere (iOS autoplay restriction)
    document.addEventListener('touchstart', () => {
      if (video.paused) video.play().catch(() => {});
    }, { once: true, passive: true });

    // Pause/resume on visibility
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      }, { threshold: 0.2 }).observe(video);
    }
  },

  // ── Scroll-to-top ─────────────────────────────────────────
  addScrollTop() {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'উপরে যান');
    btn.style.cssText = 'position:fixed;bottom:76px;right:18px;z-index:9990;background:var(--brand);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:19px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.28);opacity:0;transition:opacity .3s,transform .3s;transform:translateY(10px);display:flex;align-items:center;justify-content:center;';
    btn.innerHTML = '<i class="zmdi zmdi-chevron-up"></i>';
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      const show = window.scrollY > 380;
      btn.style.opacity   = show ? '1' : '0';
      btn.style.transform = show ? 'translateY(0)' : 'translateY(10px)';
    }, { passive: true });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ── WhatsApp float ────────────────────────────────────────
  addWhatsApp() {
    const a = document.createElement('a');
    a.href      = `https://wa.me/?text=${encodeURIComponent(JOAF.site.name + '\n' + window.location.href)}`;
    a.target    = '_blank';
    a.rel       = 'noopener';
    a.setAttribute('aria-label', 'WhatsApp');
    a.style.cssText = 'position:fixed;bottom:128px;right:18px;z-index:9990;background:#25d366;color:#fff;border-radius:50%;width:44px;height:44px;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,.26);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s;';
    a.innerHTML = '<i class="zmdi zmdi-whatsapp"></i>';
    a.onmouseenter = () => a.style.transform = 'scale(1.12)';
    a.onmouseleave = () => a.style.transform = '';
    document.body.appendChild(a);
  },

  // ── Scroll animations ─────────────────────────────────────
  initAnimations() {
    const SEL = '.joaf-reveal,.joaf-reveal-left,.joaf-reveal-right,.joaf-reveal-scale,.joaf-reveal-flip,.joaf-reveal-zoom';
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll(SEL).forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 55);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll(SEL).forEach(el => {
      if (!el.classList.contains('visible')) obs.observe(el);
    });
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
    }, { rootMargin: '100px' });
    document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
  },

  // ── OG meta ──────────────────────────────────────────────
  injectOGMeta(config) {
    config = config || {};
    const s    = JOAF.site;
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
    set('og:image', img);   set('og:url', url);
    set('og:type', 'website'); set('og:site_name', s.name);
    set('fb:app_id', s.fbAppId);
    set('twitter:card', 'summary_large_image', true);
    set('twitter:title', title, true);
    set('twitter:description', desc, true);
    set('twitter:image', img, true);
  },

  // ── Preloader ────────────────────────────────────────────
  hidePreloader() {
    const el = document.getElementById('joaf-preloader');
    if (el) setTimeout(() => el.classList.add('hidden'), 260);
  },

  // ── Main Init ─────────────────────────────────────────────
  init(pageId) {
    pageId = pageId || 'home';

    // Inject header
    const hp = document.getElementById('joaf-header');
    if (hp) hp.outerHTML = this.renderHeader(pageId);

    // Inject ticker
    const ta = document.getElementById('joaf-ticker');
    if (ta) ta.outerHTML = this.renderTicker();
    // Fallback
    setTimeout(() => {
      if (!document.querySelector('.announcement-ticker')) {
        const hdr = document.querySelector('.joaf-header');
        if (hdr) {
          const d = document.createElement('div');
          d.innerHTML = this.renderTicker();
          hdr.insertAdjacentElement('afterend', d.firstElementChild);
        }
      }
    }, 80);

    // Inject footer
    const fp = document.getElementById('joaf-footer');
    if (fp) fp.outerHTML = this.renderFooter();

    // Init everything
    this.startClock();
    this.initTicker();
    this.initMobileNav();
    this.initMuteButton();
    this.addScrollTop();
    this.addWhatsApp();
    this.lazyImages();
    this.injectOGMeta();
    this.initAnimations();
    setTimeout(() => this.initAnimations(), 500);
    this.hidePreloader();
  }
};

// ── Safe init ──────────────────────────────────────────────
function _joafInit() {
  const page = (document.body && document.body.dataset.page) ||
    window.location.pathname.split('/').pop().replace('.html','').replace('/','') || 'home';
  JOAFComponents.init(page);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _joafInit);
} else {
  _joafInit();
}
