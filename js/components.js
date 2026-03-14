// JOAF Components v9.0
// ✅ Mute: never pause, just flip .muted — works on all mobile browsers
// ✅ Header: scroll-aware glass effect
// ✅ Member cards: mouse-tracking 3D tilt on desktop
// ✅ Hero: spinning decorative ring + floating dots
// ✅ Ticker: responsive speed
// ✅ Mobile nav: slide-in panel, guaranteed

const JOAFComponents = {

  renderHeader(activePage) {
    const s = JOAF.site;
    const navItems = JOAF.nav.map(item => {
      const active = item.id === activePage ? 'active' : '';
      return `<li class="${active}"><a href="${item.href}"${active?' aria-current="page"':''}>${item.label}</a></li>`;
    }).join('');

    const mobileItems = JOAF.nav.map((item, idx) => {
      const isActive = item.id === activePage;
      return `<li class="mnav-item" style="transform:translateY(20px) scale(.96);opacity:0;transition:transform .38s cubic-bezier(.34,1.4,.64,1) ${idx*.055}s,opacity .35s ease ${idx*.055}s">
        <a href="${item.href}" class="mnav-link${isActive?' mnav-link--active':''}" onclick="if(window._joafClose)window._joafClose()">
          <span class="mnav-label">${item.label}</span>
          <span class="mnav-arrow">›</span>
        </a>
      </li>`;
    }).join('');

    return `
    <header class="joaf-header" id="joaf-header-el" role="banner">
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
            <!-- LEFT: Logo only -->
            <a href="/" class="joaf-logo" aria-label="JOAF হোম">
              <img src="${s.logo}?v=${s.version}" alt="${s.abbr}">
            </a>

            <!-- CENTER (mobile only): pill tag + tagline — replaces hamburger -->
            <div class="joaf-mob-center d-md-none">
              <div class="joaf-mob-pill"><span class="joaf-mob-pill-dot"></span>জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম</div>
              <div class="joaf-mob-tagline">দেশ আগে, দল পরে — আমরা ফিরে এসেছি।</div>
            </div>

            <!-- RIGHT: Desktop nav | Mobile: CTA pill buttons -->
            <div class="joaf-header-right">
              <nav class="joaf-desktop-nav d-none d-md-flex" id="main-menu" role="navigation" aria-label="প্রধান নেভিগেশন">
                <ul>${navItems}</ul>
              </nav>
              <div class="joaf-mob-cta d-flex d-md-none">
                <a href="/membership.html" class="joaf-cta-pill joaf-cta-join">
                  <i class="zmdi zmdi-account-add"></i><span>সদস্য হোন</span>
                </a>
                <a href="/#about-area" class="joaf-cta-pill joaf-cta-about">
                  <i class="zmdi zmdi-info"></i><span>আমাদের সম্পর্কে</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- FLOATING HAMBURGER — fixed bottom-left, always visible on mobile -->
    <button class="joaf-fab-ham d-md-none" id="joafHamBtn"
      aria-label="মেনু খুলুন" aria-expanded="false" aria-controls="joafMobileNav">
      <span class="joaf-fab-bar"></span>
      <span class="joaf-fab-bar"></span>
      <span class="joaf-fab-bar"></span>
    </button>

    <div class="joaf-mobile-nav" id="joafMobileNav" aria-hidden="true" role="dialog" aria-label="মোবাইল নেভিগেশন">
      <div class="joaf-mnav-backdrop" id="joafMNavBackdrop"></div>
      <div class="joaf-mnav-panel" id="joafMNavPanel">
        <div class="joaf-mnav-head">
          <div class="joaf-mnav-brand">
            <img src="${s.logo}" alt="JOAF" class="joaf-mnav-logo">
            <div>
              <div class="joaf-mnav-name">${s.abbr}</div>
              <div class="joaf-mnav-tagline">${s.tagline}</div>
            </div>
          </div>
          <button class="joaf-mnav-close" id="joafMNavClose" aria-label="বন্ধ">
            <i class="zmdi zmdi-close"></i>
          </button>
        </div>
        <nav class="joaf-mnav-nav">
          <ul id="joafMNavList">${mobileItems}</ul>
        </nav>
        <div class="joaf-mnav-footer">
          <a href="${s.social.facebook}" target="_blank" rel="noopener" class="joaf-mnav-social"><i class="zmdi zmdi-facebook"></i></a>
          <a href="${s.social.whatsapp}" target="_blank" rel="noopener" class="joaf-mnav-social"><i class="zmdi zmdi-whatsapp"></i></a>
          <a href="${s.social.twitter}" target="_blank" rel="noopener" class="joaf-mnav-social"><i class="zmdi zmdi-twitter"></i></a>
          <a href="/membership.html" class="joaf-mnav-cta">✊ যোগ দিন</a>
        </div>
      </div>
    </div>`;
  },

  renderTicker() {
    const items = [...JOAF.ticker, ...JOAF.ticker]
      .map(t => `<span class="ticker-item"><a href="${t.href}">${t.text}</a><span class="ticker-sep">◆</span></span>`)
      .join('');
    return `<div class="announcement-ticker" role="marquee" aria-label="সর্বশেষ ঘোষণা">
      <span class="ticker-label">🔴 সর্বশেষ</span>
      <div class="ticker-track" id="joafTickerTrack">${items}</div>
    </div>`;
  },

  renderFooter() {
    const s = JOAF.site;
    const links = JOAF.nav.slice(0,8).map(i=>`<li><a href="${i.href}">${i.label}</a></li>`).join('');
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
            <h4>⚡ দ্রুত লিঙ্ক</h4><ul>${links}</ul>
          </div>
          <div class="col-md-4 col-12 mb-40">
            <h4>📬 যোগাযোগ</h4>
            <p><i class="zmdi zmdi-email"></i> <a href="mailto:${s.email}">${s.email}</a></p>
            <p><i class="zmdi zmdi-map-pin"></i> ${s.address}</p>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="${s.social.facebook}" target="_blank" rel="noopener" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-facebook"></i></a>
              <a href="${s.social.twitter}" target="_blank" rel="noopener" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-twitter"></i></a>
              <a href="${s.social.instagram}" target="_blank" rel="noopener" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.7);transition:.2s;text-decoration:none"><i class="zmdi zmdi-instagram"></i></a>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="/financial-report.html" style="background:var(--brand);color:#fff;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none">আর্থিক বিবরণী</a>
              <a href="/privacy.html" style="background:#333;color:#fff;padding:5px 12px;border-radius:20px;font-size:12px;text-decoration:none">গোপনীয়তা</a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>দেশ আগে, দল পরে — ${s.abbr} | <a href="/membership.html">✊ শামিল হোন</a> | <a href="/donate.html">💚 পাশে থাকুন</a></p>
      </div>
    </footer>`;
  },

  startClock() {
    const loc=document.getElementById('hm-loc'),date=document.getElementById('hm-date'),time=document.getElementById('hm-time');
    if(!date&&!time)return;
    if(loc){
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const tzCity = {
          'Asia/Dhaka':'ঢাকা','Asia/Chittagong':'চট্টগ্রাম',
          'Asia/Kolkata':'কলকাতা','Europe/Berlin':'বার্লিন',
          'Europe/London':'লন্ডন','America/New_York':'নিউ ইয়র্ক',
          'America/Toronto':'টরন্টো','Australia/Sydney':'সিডনি',
          'Asia/Dubai':'দুবাই','Asia/Riyadh':'রিয়াদ',
          'America/Los_Angeles':'লস অ্যাঞ্জেলেস',
          'Europe/Paris':'প্যারিস','Asia/Singapore':'সিঙ্গাপুর',
          'Asia/Tokyo':'টোকিও','Asia/Karachi':'করাচি',
          'Europe/Amsterdam':'আমস্টারডাম','Europe/Stockholm':'স্টকহোম',
          'America/Chicago':'শিকাগো','Asia/Kuala_Lumpur':'কুয়ালালামপুর'
        };
        const city = tzCity[tz] || tz.split('/').pop().replace(/_/g,' ');
        loc.innerHTML = `<i class="zmdi zmdi-pin"></i> ${city}`;
      } catch(e) {
        loc.innerHTML = `<i class="zmdi zmdi-pin"></i> ঢাকা`;
      }
    }
    const tick=()=>{const n=new Date();if(date)date.innerHTML=`<i class="zmdi zmdi-calendar"></i> ${BanglaUtil.formatDate(n)}`;if(time)time.innerHTML=`<i class="zmdi zmdi-time"></i> ${BanglaUtil.formatTime(n)}`;};
    tick();setInterval(tick,1000);
  },

  // ── Scroll-aware header ──────────────────────────────────
  initScrollHeader() {
    const hdr = document.querySelector('.joaf-header');
    if (!hdr) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          hdr.classList.toggle('scrolled', window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  // ── Ticker speed ─────────────────────────────────────────
  initTicker() {
    const track = document.getElementById('joafTickerTrack');
    if (!track) return;

    // Remove CSS animation — use JS pixel scroll for perfect seamless loop
    track.style.animation = 'none';
    track.style.transform = 'translateZ(0)';

    // Speed: pixels per frame (lower = slower)
    const speed = window.innerWidth < 768 ? 0.6 : 1.0;
    let x = 0;
    let paused = false;

    // We only need the first half (6 items) — track is 12 items (2x)
    // Scroll until x reaches half of total width, then reset to 0
    const ticker = track.parentElement;
    if (ticker) {
      ticker.addEventListener('mouseenter', () => { paused = true; });
      ticker.addEventListener('mouseleave', () => { paused = false; });
      ticker.addEventListener('touchstart', () => { paused = true; }, {passive:true});
      ticker.addEventListener('touchend', () => { setTimeout(() => { paused = false; }, 1200); }, {passive:true});
    }

    const step = () => {
      if (!paused) {
        x += speed;
        // Reset when scrolled exactly half the track width (the 2nd copy starts)
        const halfWidth = track.scrollWidth / 2;
        if (x >= halfWidth) x = 0;
        track.style.transform = `translate3d(-${x}px, 0, 0)`;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  // ── Mobile nav ───────────────────────────────────────────
  initMobileNav() { window._joafNavInited = true;
    const ham=document.getElementById('joafHamBtn');
    const panel=document.getElementById('joafMNavPanel');
    const backdrop=document.getElementById('joafMNavBackdrop');
    const closeBtn=document.getElementById('joafMNavClose');
    const navEl=document.getElementById('joafMobileNav');
    const items=document.querySelectorAll('.mnav-item');
    if(!ham||!panel||!navEl)return;
    let open=false;
    const doOpen=()=>{
      if(open)return;open=true;
      navEl.classList.add('joaf-mnav--open');navEl.setAttribute('aria-hidden','false');
      ham.setAttribute('aria-expanded','true');ham.classList.add('joaf-fab--open');
      document.body.style.overflow='hidden';document.body.style.touchAction='none';
      setTimeout(()=>{items.forEach(el=>{el.style.transform='translateY(0) scale(1)';el.style.opacity='1';});},60);
      window._joafClose=doClose;
    };
    const doClose=()=>{
      if(!open)return;open=false;
      items.forEach(el=>{el.style.transform='translateY(20px) scale(.96)';el.style.opacity='0';});
      ham.classList.remove('joaf-fab--open');ham.setAttribute('aria-expanded','false');
      setTimeout(()=>{navEl.classList.remove('joaf-mnav--open');navEl.setAttribute('aria-hidden','true');document.body.style.overflow='';document.body.style.touchAction='';},180);
      window._joafClose=null;
    };
    ham.addEventListener('click',e=>{e.stopPropagation();open?doClose():doOpen();});
    if(closeBtn)closeBtn.addEventListener('click',doClose);
    if(backdrop)backdrop.addEventListener('click',doClose);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)doClose();});
  },

  // ── MUTE BUTTON — THE CORRECT WAY ────────────────────────
  // KEY: Never call pause() + muted=false + play()
  // That sequence triggers autoplay block on ALL mobile browsers.
  // Instead: keep video playing, just toggle .muted property.
  initMuteButton() {
    const video = document.getElementById('heroVideo');
    const btn   = document.getElementById('muteToggle');
    if (!video || !btn) return;

    // Start muted, play
    video.muted  = true;
    video.volume = 1.0;

    // Force play
    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    // Ensure button always visible
    btn.style.cssText += ';display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;';

    const updateIcon = () => {
      btn.textContent = video.muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(!video.muted));
      btn.title = video.muted ? 'শব্দ চালু করুন' : 'নিঃশব্দ করুন';
    };
    updateIcon();

    btn.addEventListener('click', () => {
      // ONLY toggle .muted — never pause/play
      video.muted = !video.muted;
      updateIcon();
      // If currently playing and we just unmuted but video stalled, try play
      if (!video.muted && video.paused) {
        video.play().catch(() => { video.muted = true; updateIcon(); });
      }
    });

    // iOS: first touch anywhere starts video
    document.addEventListener('touchstart', () => {
      if (video.paused) tryPlay();
    }, { once: true, passive: true });

    // Pause when hero scrolled offscreen (battery saving)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) tryPlay();
          else video.pause();
        });
      }, { threshold: 0.1 }).observe(video);
    }
  },

  // ── 3D card tilt on desktop ──────────────────────────────
  initCardTilt() {
    if (window.innerWidth < 768) return;
    document.querySelectorAll('.member-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5 to 0.5
        const y = (e.clientY - r.top)  / r.height - 0.5;
        const rotY = x * 12;   // max 12deg
        const rotX = -y * 8;   // max 8deg
        card.style.transform = `translateY(-14px) scale(1.025) perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        card.style.boxShadow = `${-rotY*2}px 30px 60px rgba(144,22,31,.28)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  },

  // ── Hero desktop particles ───────────────────────────────
  initHeroParticles() {
    if (window.innerWidth < 768) return;
    const hero = document.querySelector('.cinematic-hero');
    if (!hero) return;
    const colors = ['var(--gold)','var(--brand2)','rgba(255,255,255,.7)','var(--accent)'];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      const size = 2 + Math.random() * 4;
      p.style.cssText = `
        position:absolute;border-radius:50%;pointer-events:none;z-index:1;
        width:${size}px;height:${size}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        left:${5 + Math.random() * 55}%;
        bottom:${10 + Math.random() * 50}%;
        animation:particle-drift ${3 + Math.random()*4}s ease-in-out infinite ${Math.random()*4}s;
        opacity:.7;
      `;
      hero.appendChild(p);
    }
  },

  // ── Scroll to top ────────────────────────────────────────
  addScrollTop() {
    const btn=document.createElement('button');btn.setAttribute('aria-label','উপরে যান');
    btn.style.cssText='position:fixed;bottom:76px;right:18px;z-index:9990;background:var(--brand);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:19px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.28);opacity:0;transition:opacity .3s,transform .3s;transform:translateY(10px);display:flex;align-items:center;justify-content:center;';
    btn.innerHTML='<i class="zmdi zmdi-chevron-up"></i>';
    document.body.appendChild(btn);
    window.addEventListener('scroll',()=>{const s=window.scrollY>380;btn.style.opacity=s?'1':'0';btn.style.transform=s?'translateY(0)':'translateY(10px)';},{passive:true});
    btn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  },

  addWhatsApp() {
    const a=document.createElement('a');a.href=`https://wa.me/?text=${encodeURIComponent(JOAF.site.name+'\n'+window.location.href)}`;
    a.target='_blank';a.rel='noopener';a.setAttribute('aria-label','WhatsApp');
    a.style.cssText='position:fixed;bottom:128px;right:18px;z-index:9990;background:#25d366;color:#fff;border-radius:50%;width:44px;height:44px;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,.26);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:transform .2s;';
    a.innerHTML='<i class="zmdi zmdi-whatsapp"></i>';
    a.onmouseenter=()=>a.style.transform='scale(1.12)';a.onmouseleave=()=>a.style.transform='';
    document.body.appendChild(a);
  },

  initAnimations() {
    const SEL='.joaf-reveal,.joaf-reveal-left,.joaf-reveal-right,.joaf-reveal-scale,.joaf-reveal-flip,.joaf-reveal-zoom';
    if(!('IntersectionObserver' in window)){document.querySelectorAll(SEL).forEach(el=>el.classList.add('visible'));return;}
    const obs=new IntersectionObserver(entries=>{entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('visible'),i*55);obs.unobserve(e.target);}});},{threshold:.05,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll(SEL).forEach(el=>{if(!el.classList.contains('visible'))obs.observe(el);});
  },

  lazyImages() {
    if(!('IntersectionObserver' in window))return;
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const img=e.target;if(img.dataset.src){img.src=img.dataset.src;img.removeAttribute('data-src');}obs.unobserve(img);}});},{rootMargin:'100px'});
    document.querySelectorAll('img[data-src]').forEach(img=>obs.observe(img));
  },

  injectOGMeta(config) {
    config=config||{};const s=JOAF.site;
    const title=config.title||document.title;
    const desc=config.desc||(document.querySelector('meta[name="description"]')||{}).content||s.tagline2;
    const img=config.img||(s.baseUrl+s.logo);const url=config.url||(typeof window!=='undefined'?window.location.href:s.baseUrl);
    const set=(prop,val,isName)=>{const attr=isName?'name':'property';let el=document.querySelector(`meta[${attr}="${prop}"]`);if(!el){el=document.createElement('meta');el.setAttribute(attr,prop);document.head.appendChild(el);}el.setAttribute('content',val);};
    set('og:title',title);set('og:description',desc);set('og:image',img);set('og:url',url);set('og:type','website');set('og:site_name',s.name);set('fb:app_id',s.fbAppId);
    set('twitter:card','summary_large_image',true);set('twitter:title',title,true);set('twitter:description',desc,true);set('twitter:image',img,true);
  },

  hidePreloader() {
    const el=document.getElementById('joaf-preloader');if(el)setTimeout(()=>el.classList.add('hidden'),260);
  },

  init(pageId) {
    pageId = pageId || 'home';

    // 1. Inject header
    const hp = document.getElementById('joaf-header');
    if (hp) hp.outerHTML = this.renderHeader(pageId);

    // 2. Ticker already hardcoded in HTML — just ensure it exists
    // If somehow missing, inject it
    if (!document.querySelector('.announcement-ticker')) {
      const ta = document.getElementById('joaf-ticker');
      if (ta) { ta.outerHTML = this.renderTicker(); }
      else {
        const hdr = document.querySelector('.joaf-header');
        if (hdr) { const d = document.createElement('div'); d.innerHTML = this.renderTicker(); hdr.insertAdjacentElement('afterend', d.firstElementChild); }
      }
    }

    // 3. Inject footer
    const fp = document.getElementById('joaf-footer');
    if (fp) fp.outerHTML = this.renderFooter();

    // Global Alert FAB + Modal — all pages
    // Remove existing first to re-inject fresh
    ['joaf-global-alert-modal','joaf-alert-fab','joaf-blood-fab','joaf-blood-modal-wrap'].forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });
    if (!document.getElementById('joaf-global-alert-modal')) {
      const html = `
      <style>
      #joaf-alert-fab{position:fixed!important;bottom:80px!important;left:16px!important;transform:none!important;background:linear-gradient(135deg,#90161f,#c0392b);color:#fff;border:none;border-radius:50px;padding:12px 18px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(144,22,31,.4);z-index:9990!important;display:flex!important;align-items:center;gap:6px;white-space:nowrap;}
      #joaf-global-alert-modal{display:none;position:fixed!important;inset:0!important;background:rgba(0,0,0,.6);z-index:99999!important;align-items:flex-end;}
      #joaf-global-alert-modal.open{display:flex;}
      .joaf-alert-modal-inner{background:#fff;border-radius:24px 24px 0 0;padding:20px;width:100%;max-height:90vh;overflow-y:auto;}
      .joaf-alert-modal-inner h3{font-size:17px;font-weight:900;margin:0;}
      .joaf-alert-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;}
      .joaf-at-btn{padding:10px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;text-align:center;transition:.2s;}
      .joaf-at-btn.sel{border-color:#90161f;background:#fff5f5;color:#90161f;}
      .joaf-alert-fg{margin-bottom:12px;}
      .joaf-alert-fg label{font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;}
      .joaf-alert-fg input,.joaf-alert-fg textarea{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;}
      .joaf-alert-fg input:focus,.joaf-alert-fg textarea:focus{border-color:#90161f;}
      .joaf-photo-up{border:2px dashed #e5e7eb;border-radius:10px;padding:16px;text-align:center;cursor:pointer;color:#6b7280;font-size:12px;}
      .joaf-gps-btn{width:100%;padding:10px;background:#f3f4f6;border:2px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}
      .joaf-gps-btn.got{background:#dcfce7;border-color:#10b981;color:#065f46;}
      .joaf-submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,#90161f,#c0392b);color:#fff;border:none;border-radius:50px;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer;margin-top:8px;}
      </style>

      <button id="joaf-alert-fab">🚨 সতর্কতা দিন</button>

      <div id="joaf-global-alert-modal">
        <div class="joaf-alert-modal-inner">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3>🚨 জরুরি সতর্কতা পাঠান</h3>
            <button onclick="document.getElementById('joaf-global-alert-modal').classList.remove('open')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280">✕</button>
          </div>
          <div class="joaf-alert-type-grid" id="joaf-at-grid">
            <button class="joaf-at-btn" data-type="fire">🔥 আগুন</button>
            <button class="joaf-at-btn" data-type="flood">🌊 বন্যা</button>
            <button class="joaf-at-btn" data-type="crime">⚠️ অপরাধ</button>
            <button class="joaf-at-btn" data-type="medical">🏥 মেডিকেল</button>
            <button class="joaf-at-btn" data-type="accident">🚗 দুর্ঘটনা</button>
            <button class="joaf-at-btn sel" data-type="other">📢 অন্যান্য</button>
          </div>
          <div class="joaf-alert-fg">
            <label>শিরোনাম *</label>
            <input type="text" id="joaf-f-title" placeholder="সংক্ষেপে বলুন কী হয়েছে">
          </div>
          <div class="joaf-alert-fg">
            <label>বিস্তারিত *</label>
            <textarea id="joaf-f-desc" rows="3" placeholder="কী হয়েছে বিস্তারিত লিখুন..."></textarea>
          </div>
          <div class="joaf-alert-fg">
            <label>এলাকা *</label>
            <input type="text" id="joaf-f-location" placeholder="গ্রাম/মহল্লা, উপজেলা, জেলা">
          </div>
          <div class="joaf-alert-fg">
            <label>আপনার নাম (ঐচ্ছিক)</label>
            <input type="text" id="joaf-f-reporter" placeholder="নাম না দিলেও চলবে">
          </div>
          <div class="joaf-alert-fg">
            <div class="joaf-photo-up" onclick="document.getElementById('joaf-photo-input').click()">📷 ছবি যোগ করুন (ঐচ্ছিক)</div>
            <input type="file" id="joaf-photo-input" accept="image/*" style="display:none">
            <img id="joaf-photo-preview" style="display:none;width:100%;border-radius:10px;margin-top:8px">
          </div>
          <div class="joaf-alert-fg">
            <button class="joaf-gps-btn" id="joaf-gps-btn">📍 GPS লোকেশন যোগ করুন</button>
          </div>
          <button class="joaf-submit-btn" id="joaf-alert-submit">🚨 সতর্কতা পাঠান</button>
          <button style="width:100%;padding:10px;background:none;border:none;font-family:inherit;font-size:13px;color:#6b7280;margin-top:6px;cursor:pointer" onclick="document.getElementById('joaf-global-alert-modal').classList.remove('open')">বাতিল করুন</button>
        </div>
      </div>`;

      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);

      // Blood FAB + Modal
      const isRoktoPage = window.location.pathname.includes('rokto');
      const bloodWrap = document.createElement('div');
      bloodWrap.id = 'joaf-blood-modal-wrap';
      bloodWrap.innerHTML = `
      <style>
      #joaf-blood-fab{position:fixed!important;bottom:140px!important;left:16px!important;background:linear-gradient(135deg,#075e55,#0a7a6e)!important;color:#fff;border:none;border-radius:50px;padding:12px 18px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(7,94,85,.4);z-index:9990!important;align-items:center;gap:6px;white-space:nowrap;}
      #joaf-blood-reg-modal{display:none;position:fixed!important;inset:0!important;background:rgba(0,0,0,.6);z-index:99999!important;align-items:flex-end;}
      #joaf-blood-reg-modal.open{display:flex!important;}
      .jbr-inner{background:#fff;border-radius:24px 24px 0 0;padding:20px;width:100%;max-height:90vh;overflow-y:auto;}
      .jbr-fg{margin-bottom:12px;}
      .jbr-fg label{font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;}
      .jbr-fg input,.jbr-fg select{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;}
      .jbr-fg input:focus,.jbr-fg select:focus{border-color:#075e55;}
      .jbr-submit{width:100%;padding:13px;background:linear-gradient(135deg,#075e55,#0a7a6e);color:#fff;border:none;border-radius:50px;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer;margin-top:8px;}
      </style>
      <button id="joaf-blood-fab" style="display:none">+🩸 রক্ত দিন</button>
      <div id="joaf-blood-reg-modal">
        <div class="jbr-inner">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="margin:0;font-size:17px;font-weight:900">🩸 রক্তদাতা নিবন্ধন</h3>
            <button onclick="document.getElementById('joaf-blood-reg-modal').classList.remove('open')" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280">✕</button>
          </div>
          <div class="jbr-fg"><label>আপনার নাম *</label><input type="text" id="jbr-name" placeholder="পূর্ণ নাম লিখুন"></div>
          <div class="jbr-fg"><label>মোবাইল নম্বর *</label><input type="tel" id="jbr-phone" placeholder="01XXXXXXXXX"></div>
          <div class="jbr-fg"><label>রক্তের গ্রুপ *</label>
            <select id="jbr-blood"><option value="">বেছে নিন</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select>
          </div>
          <div class="jbr-fg"><label>জেলা *</label>
            <select id="jbr-district"><option value="">জেলা বেছে নিন</option></select>
          </div>
          <div class="jbr-fg"><label>উপজেলা / এলাকা</label><input type="text" id="jbr-area" placeholder="আপনার উপজেলা বা এলাকা"></div>
          <div class="jbr-fg"><label>শেষ রক্তদানের তারিখ (যদি থাকে)</label><input type="date" id="jbr-lastdonate"></div>
          <button class="jbr-submit" id="jbr-submit">✅ নিবন্ধন করুন</button>
          <button style="width:100%;padding:10px;background:none;border:none;font-family:inherit;font-size:13px;color:#6b7280;margin-top:6px;cursor:pointer" onclick="document.getElementById('joaf-blood-reg-modal').classList.remove('open')">বাতিল করুন</button>
        </div>
      </div>`;
      document.body.appendChild(bloodWrap);

      // Populate districts
      const JBR_DISTS = ['ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','বরিশাল','সিলেট','রংপুর','ময়মনসিংহ','কুমিল্লা','নারায়ণগঞ্জ','গাজীপুর','টাঙ্গাইল','ফরিদপুর','যশোর','নোয়াখালী','বগুড়া','দিনাজপুর','পাবনা','নরসিংদী','মানিকগঞ্জ','মুন্সীগঞ্জ','শরীয়তপুর','মাদারীপুর','গোপালগঞ্জ','কিশোরগঞ্জ','নেত্রকোনা','জামালপুর','শেরপুর','ব্রাহ্মণবাড়িয়া','চাঁদপুর','ফেনী','লক্ষ্মীপুর','কক্সবাজার','বান্দরবান','রাঙ্গামাটি','খাগড়াছড়ি','হবিগঞ্জ','মৌলভীবাজার','সুনামগঞ্জ','নওগাঁ','চাঁপাইনবাবগঞ্জ','নাটোর','সিরাজগঞ্জ','জয়পুরহাট','সাতক্ষীরা','ঝিনাইদহ','মাগুরা','নড়াইল','বাগেরহাট','মেহেরপুর','চুয়াডাঙ্গা','কুষ্টিয়া','ঝালকাঠি','পটুয়াখালী','পিরোজপুর','ভোলা','বরগুনা','লালমনিরহাট','নীলফামারী','গাইবান্ধা','কুড়িগ্রাম','পঞ্চগড়','ঠাকুরগাঁও'];
      const jbrDSel = document.getElementById('jbr-district');
      if (jbrDSel) JBR_DISTS.sort().forEach(d => { const o=document.createElement('option'); o.value=d; o.textContent=d; jbrDSel.appendChild(o); });

      // rokto page এ: ডানে +🩸 বাটন (registration form খুলবে)
      // অন্য page এ: বামে 🩸 নিবন্ধন popup বাটন

      const bfabEl = document.getElementById('joaf-blood-fab');

      if (isRoktoPage) {
        // rokto page এ — FAB hide করো, ডানে আলাদা বাটন দাও
        if (bfabEl) bfabEl.style.display = 'none';
        const rkBtn = document.createElement('button');
        rkBtn.id = 'rokto-reg-btn';
        rkBtn.innerHTML = '+🩸 রক্ত দিন';
        rkBtn.style.cssText = 'position:fixed!important;bottom:80px!important;right:16px!important;background:linear-gradient(135deg,#075e55,#0a7a6e)!important;color:#fff;border:none;border-radius:50px;padding:12px 18px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(7,94,85,.4);z-index:9991!important;display:flex!important;align-items:center;gap:6px;white-space:nowrap;';
        rkBtn.addEventListener('click', () => document.getElementById('joaf-blood-reg-modal').classList.add('open'));
        document.body.appendChild(rkBtn);
      } else {
        // অন্য page এ — বামে FAB দেখাও
        if (bfabEl) {
          bfabEl.style.display = 'flex';
          bfabEl.addEventListener('click', () => document.getElementById('joaf-blood-reg-modal').classList.add('open'));
        }
      }

      document.getElementById('joaf-blood-reg-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('joaf-blood-reg-modal'))
          document.getElementById('joaf-blood-reg-modal').classList.remove('open');
      });

      document.getElementById('jbr-submit').addEventListener('click', async () => {
        const name = document.getElementById('jbr-name').value.trim();
        const phone = document.getElementById('jbr-phone').value.trim();
        const blood = document.getElementById('jbr-blood').value;
        const district = document.getElementById('jbr-district').value;
        const area = document.getElementById('jbr-area').value.trim();
        const lastDonate = document.getElementById('jbr-lastdonate').value;
        if (!name||!phone||!blood||!district) { alert('নাম, মোবাইল, রক্তের গ্রুপ ও জেলা আবশ্যক।'); return; }
        if (!/^01[3-9]\d{8}$/.test(phone)) { alert('সঠিক মোবাইল নম্বর দিন।'); return; }
        const btn = document.getElementById('jbr-submit');
        btn.textContent='নিবন্ধন হচ্ছে...'; btn.disabled=true;
        try {
          const {initializeApp,getApps} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
          const {getFirestore,collection,addDoc,serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
          const fbApp = getApps().length ? getApps()[0] : initializeApp({apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',authDomain:'joaf-app-45753.firebaseapp.com',projectId:'joaf-app-45753',storageBucket:'joaf-app-45753.firebasestorage.app',messagingSenderId:'472362223214',appId:'1:472362223214:web:9186a4f90dc608bae4487f'});
          const db = getFirestore(fbApp);
          await addDoc(collection(db,'donors'),{name,phone,blood,district,area,lastDonate,createdAt:serverTimestamp()});
          alert('✅ সফলভাবে নিবন্ধন হয়েছে! আপনাকে ধন্যবাদ।');
          document.getElementById('joaf-blood-reg-modal').classList.remove('open');
          ['jbr-name','jbr-phone','jbr-area'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
        } catch(e) { alert('সমস্যা হয়েছে, আবার চেষ্টা করুন।'); console.error(e); }
        btn.textContent='✅ নিবন্ধন করুন'; btn.disabled=false;
      });
      let _selType = 'other', _gps = null, _photo = null;

      const alertFabEl = document.getElementById('joaf-alert-fab'); if(alertFabEl) alertFabEl.addEventListener('click', () => {
        document.getElementById('joaf-global-alert-modal').classList.add('open');
      });

      document.getElementById('joaf-global-alert-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('joaf-global-alert-modal'))
          document.getElementById('joaf-global-alert-modal').classList.remove('open');
      });

      document.getElementById('joaf-at-grid').addEventListener('click', e => {
        const btn = e.target.closest('.joaf-at-btn');
        if (!btn) return;
        document.querySelectorAll('.joaf-at-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        _selType = btn.dataset.type;
      });

      document.getElementById('joaf-photo-input').addEventListener('change', e => {
        _photo = e.target.files[0];
        if (_photo) {
          const r = new FileReader();
          r.onload = ev => {
            const p = document.getElementById('joaf-photo-preview');
            p.src = ev.target.result; p.style.display = 'block';
          };
          r.readAsDataURL(_photo);
        }
      });

      document.getElementById('joaf-gps-btn').addEventListener('click', () => {
        const btn = document.getElementById('joaf-gps-btn');
        btn.textContent = '⏳ লোকেশন নেওয়া হচ্ছে...';
        navigator.geolocation.getCurrentPosition(pos => {
          _gps = {lat: pos.coords.latitude, lng: pos.coords.longitude};
          btn.textContent = '✅ লোকেশন পাওয়া গেছে';
          btn.classList.add('got');
        }, () => { btn.textContent = '❌ পাওয়া যায়নি'; });
      });

      document.getElementById('joaf-alert-submit').addEventListener('click', async () => {
        const title = document.getElementById('joaf-f-title').value.trim();
        const desc = document.getElementById('joaf-f-desc').value.trim();
        const location = document.getElementById('joaf-f-location').value.trim();
        const reporter = document.getElementById('joaf-f-reporter').value.trim();

        if (!title || !desc || !location) { alert('শিরোনাম, বিবরণ ও এলাকা আবশ্যক।'); return; }

        const btn = document.getElementById('joaf-alert-submit');
        btn.textContent = 'পাঠানো হচ্ছে...'; btn.disabled = true;

        try {
          let imageUrl = null;
          if (_photo) {
            const fd = new FormData();
            fd.append('file', _photo);
            fd.append('upload_preset', 'kf483px5');
            const res = await fetch('https://api.cloudinary.com/v1_1/dou71pfe1/image/upload', {method:'POST', body:fd});
            const d = await res.json();
            imageUrl = d.secure_url;
          }

          const {initializeApp, getApps} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
          const {getFirestore, collection, addDoc, serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
          const fbApp = getApps().length ? getApps()[0] : initializeApp({
            apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
            authDomain:'joaf-app-45753.firebaseapp.com',
            projectId:'joaf-app-45753',
            storageBucket:'joaf-app-45753.firebasestorage.app',
            messagingSenderId:'472362223214',
            appId:'1:472362223214:web:9186a4f90dc608bae4487f'
          });
          const db = getFirestore(fbApp);
          await addDoc(collection(db,'alerts'), {title, description:desc, location, reporter, type:_selType, imageUrl, lat:_gps?.lat||null, lng:_gps?.lng||null, createdAt:serverTimestamp()});

          alert('✅ সতর্কতা পাঠানো হয়েছে!');
          document.getElementById('joaf-global-alert-modal').classList.remove('open');
          ['joaf-f-title','joaf-f-desc','joaf-f-location','joaf-f-reporter'].forEach(id => document.getElementById(id).value='');
          document.getElementById('joaf-photo-preview').style.display='none';
          _gps=null; _photo=null;
        } catch(e) {
          alert('সমস্যা হয়েছে, আবার চেষ্টা করুন।');
          console.error(e);
        }
        btn.textContent='🚨 সতর্কতা পাঠান'; btn.disabled=false;
      });
    }

    // 4. Init UI — after DOM injections complete
    this.startClock();
    this.initScrollHeader();
    this.initMobileNav();
    this.initMuteButton();
    this.addScrollTop();
    this.addWhatsApp();
    this.lazyImages();
    this.injectOGMeta();
    this.initAnimations();
    this.hidePreloader();

    // 5. initTicker AFTER ticker HTML is in DOM
    setTimeout(() => this.initTicker(), 0);

    // 6. Stats AFTER full DOM ready
    setTimeout(() => this.renderStats(), 0);

    // 7. Desktop extras
    setTimeout(() => {
      this.initCardTilt();
      this.initHeroParticles();
      this.initAnimations();
    }, 400);
  },

  renderStats() {
    const row = document.getElementById('stats-row');
    if (!row) { setTimeout(()=>this.renderStats(), 80); return; }
    if (row.children.length > 0) return; // already rendered
    let memberCount = 5724;
    row.innerHTML = (typeof JOAF !== 'undefined' ? JOAF.stats : []).map(s => {
      const isMember = s.label.includes('সদস্য');
      const numDisplay = isMember
        ? `<span id="live-member-count">${BanglaUtil.toNum(memberCount)}+</span>`
        : s.number;
      return `<div class="col-6 col-md-3 stat-item">
        <div class="stat-number">${numDisplay}</div>
        <div class="stat-label">${s.label}</div>
      </div>`;
    }).join('');
    const el = document.getElementById('live-member-count');
    if (el) {
      setInterval(() => { memberCount++; el.textContent = BanglaUtil.toNum(memberCount) + '+'; }, 1000);
    }
  }
};

function _joafInit(){
  const page=(document.body&&document.body.dataset.page)||window.location.pathname.split('/').pop().replace('.html','').replace('/','')|| 'home';
  JOAFComponents.init(page);
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_joafInit);}else{_joafInit();}
