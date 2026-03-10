// ============================================================
// JOAF Component System — Header & Footer একবার লিখলেই সব page এ আসবে
// ============================================================

const JOAFComponents = {

  // কোন page এ আছি detect করা
  getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '') || 'index';
  },

  // Header render
  renderHeader(activePage = '') {
    const s = JOAF.site;
    const navItems = JOAF.nav.map(item => {
      const isActive = item.id === activePage ? 'active' : '';
      return `<li class="${isActive}"><a href="${item.href}" ${isActive ? 'aria-current="page"' : ''}>${item.label}</a></li>`;
    }).join('');

    return `
    <header class="header-area" role="banner">
      <div class="header-top">
        <div class="container">
          <div class="row align-items-center">
            <div class="header-meta text-center col-12" id="header-meta-info">
              <span id="hm-location"><i class="zmdi zmdi-pin"></i> ...</span>
              <span id="hm-date"><i class="zmdi zmdi-calendar"></i> ...</span>
              <span id="hm-time"><i class="zmdi zmdi-time"></i> ...</span>
            </div>
            <div class="header-social text-left col-sm-5 col-xs-12">
              <a href="${s.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="zmdi zmdi-facebook"></i></a>
              <a href="${s.social.twitter}" target="_blank" rel="noopener" aria-label="Twitter"><i class="zmdi zmdi-twitter"></i></a>
              <a href="${s.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="zmdi zmdi-instagram"></i></a>
            </div>
            <div class="header-info text-right col-sm-7 col-xs-12">
              <p>Email: <a href="mailto:${s.email}">${s.email}</a></p>
            </div>
          </div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="container">
          <div class="row justify-content-between flex-column flex-lg-row position-relative">
            <div class="col-auto">
              <div class="navbar-header d-flex justify-content-between">
                <a href="/index.html" class="logo navbar-brand">
                  <img style="max-width:140px" src="${s.logo}?v=${s.version}" alt="${s.abbr} Logo" width="140" height="auto">
                </a>
                <button class="navbar-toggle collapsed d-block d-md-none" data-bs-toggle="collapse" data-bs-target="#main-menu" aria-label="Toggle navigation" aria-expanded="false">
                  <i class="zmdi zmdi-menu menu-open"></i>
                  <i class="zmdi zmdi-close menu-close"></i>
                </button>
              </div>
            </div>
            <div class="col-auto d-flex flex-md-row flex-lg-row-reverse">
              <nav class="main-menu collapse" id="main-menu" aria-label="Main Navigation">
                <ul>${navItems}</ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>`;
  },

  // Footer render
  renderFooter() {
    const s = JOAF.site;
    const quickLinks = JOAF.nav.slice(0, 6).map(item =>
      `<li><a href="${item.href}">${item.labelBn || item.label}</a></li>`
    ).join('');

    return `
    <footer id="footer-area" class="footer-area section" role="contentinfo">
      <div class="container">
        <div class="row">
          <div class="col-md-4 col-12 mb-40">
            <img src="${s.logo}" alt="${s.abbr}" style="max-width:100px;margin-bottom:12px;filter:brightness(10)">
            <h4>${s.name}</h4>
            <p>${s.tagline2}</p>
            <p style="margin-top:10px;font-size:13px;opacity:.7">© ${new Date().getFullYear()} ${s.name}। সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>দ্রুত লিঙ্ক</h4>
            <ul>${quickLinks}</ul>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>যোগাযোগ</h4>
            <p><i class="zmdi zmdi-email"></i> <a href="mailto:${s.email}">${s.email}</a></p>
            <p><i class="zmdi zmdi-map-pin"></i> ${s.address}</p>
            <div class="footer-social" style="margin-top:16px">
              <a href="${s.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="zmdi zmdi-facebook"></i></a>
              <a href="${s.social.twitter}" target="_blank" rel="noopener" aria-label="Twitter"><i class="zmdi zmdi-twitter"></i></a>
              <a href="${s.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="zmdi zmdi-instagram"></i></a>
            </div>
            <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
              <a href="/financial-report.html" class="btn btn-sm" style="background:#90161f;color:#fff;font-size:12px">আর্থিক বিবরণী</a>
              <a href="/financial-policy.html" class="btn btn-sm" style="background:#075e55;color:#fff;font-size:12px">আর্থিক নীতিমালা</a>
              <a href="/privacy.html" class="btn btn-sm" style="background:#333;color:#fff;font-size:12px">Privacy</a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>দেশ আগে, দল পরে — ${s.abbr} | <a href="/membership.html">সদস্য হোন</a> | <a href="/donate.html">অনুদান</a></p>
      </div>
    </footer>`;
  },

  // Live datetime — header এ
  startClock() {
    const locEl = document.getElementById('hm-location');
    const dateEl = document.getElementById('hm-date');
    const timeEl = document.getElementById('hm-time');
    if (!dateEl || !timeEl) return;

    // Location
    if (locEl) {
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { locEl.innerHTML = `<i class="zmdi zmdi-pin"></i> ${BanglaUtil.toCity(d.city || 'Dhaka')}`; })
        .catch(() => { locEl.innerHTML = `<i class="zmdi zmdi-pin"></i> ঢাকা`; });
    }

    const tick = () => {
      const now = new Date();
      dateEl.innerHTML = `<i class="zmdi zmdi-calendar"></i> ${BanglaUtil.formatDate(now)}`;
      timeEl.innerHTML = `<i class="zmdi zmdi-time"></i> ${BanglaUtil.formatTime(now)}`;
    };
    tick();
    setInterval(tick, 1000);
  },

  // Scroll-to-top button
  addScrollTop() {
    const btn = document.createElement('button');
    btn.id = 'scroll-top-btn';
    btn.innerHTML = '<i class="zmdi zmdi-chevron-up"></i>';
    btn.setAttribute('aria-label', 'উপরে যান');
    btn.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      background:#90161f;color:#fff;border:none;border-radius:50%;
      width:44px;height:44px;font-size:20px;cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,.3);
      opacity:0;transition:opacity .3s,transform .3s;transform:translateY(10px);
      display:flex;align-items:center;justify-content:center;
    `;
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        btn.style.opacity = '1'; btn.style.transform = 'translateY(0)';
      } else {
        btn.style.opacity = '0'; btn.style.transform = 'translateY(10px)';
      }
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  // WhatsApp share button
  addWhatsAppShare() {
    const btn = document.createElement('a');
    btn.href = `https://wa.me/?text=${encodeURIComponent(JOAF.site.name + ' — ' + JOAF.site.tagline + ' ' + window.location.href)}`;
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.setAttribute('aria-label', 'WhatsApp এ শেয়ার করুন');
    btn.style.cssText = `
      position:fixed;bottom:80px;right:24px;z-index:9998;
      background:#25d366;color:#fff;border-radius:50%;
      width:44px;height:44px;font-size:22px;
      box-shadow:0 4px 12px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;
      text-decoration:none;transition:transform .2s;
    `;
    btn.innerHTML = '<i class="zmdi zmdi-whatsapp"></i>';
    btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);
  },

  // Lazy load images
  lazyLoadImages() {
    if ('IntersectionObserver' in window) {
      const imgs = document.querySelectorAll('img[data-src]');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const img = e.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '100px' });
      imgs.forEach(img => obs.observe(img));
    }
  },

  // Scroll-triggered animations
  initAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      .joaf-reveal { opacity:0; transform:translateY(30px); transition:opacity .6s ease, transform .6s ease; }
      .joaf-reveal.visible { opacity:1; transform:none; }
      .joaf-reveal-left { opacity:0; transform:translateX(-30px); transition:opacity .6s ease, transform .6s ease; }
      .joaf-reveal-left.visible { opacity:1; transform:none; }
      .joaf-reveal-scale { opacity:0; transform:scale(.95); transition:opacity .5s ease, transform .5s ease; }
      .joaf-reveal-scale.visible { opacity:1; transform:none; }
    `;
    document.head.appendChild(style);

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), i * 80);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.joaf-reveal, .joaf-reveal-left, .joaf-reveal-scale').forEach(el => obs.observe(el));
    } else {
      document.querySelectorAll('.joaf-reveal, .joaf-reveal-left, .joaf-reveal-scale').forEach(el => el.classList.add('visible'));
    }
  },

  // Init — page load এ সব setup করা
  init(pageId) {
    const wrapper = document.querySelector('.wrapper');
    if (!wrapper) return;

    // Header inject
    const headerPlaceholder = document.getElementById('joaf-header');
    if (headerPlaceholder) {
      headerPlaceholder.outerHTML = this.renderHeader(pageId);
    }

    // Footer inject
    const footerPlaceholder = document.getElementById('joaf-footer');
    if (footerPlaceholder) {
      footerPlaceholder.outerHTML = this.renderFooter();
    }

    this.startClock();
    this.addScrollTop();
    this.addWhatsAppShare();
    this.lazyLoadImages();

    // Init animations after DOM ready
    setTimeout(() => this.initAnimations(), 100);
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || JOAFComponents.getCurrentPage();
  JOAFComponents.init(page);
});
