// JOAF Components v8.0
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
            <div class="joaf-header-brand">
              <a href="/" class="joaf-logo" aria-label="JOAF হোম">
                <img src="${s.logo}?v=${s.version}" alt="${s.abbr}">
              </a>
              <button class="joaf-hamburger d-md-none" id="joafHamBtn"
                aria-label="মেনু" aria-expanded="false" aria-controls="joafMobileNav">
                <span class="joaf-hamburger-bar"></span>
                <span class="joaf-hamburger-bar"></span>
                <span class="joaf-hamburger-bar"></span>
              </button>
            </div>
            <nav class="joaf-desktop-nav d-none d-md-flex" id="main-menu" role="navigation" aria-label="প্রধান নেভিগেশন">
              <ul>${navItems}</ul>
            </nav>
          </div>
        </div>
      </div>
    </header>

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
    if(loc){fetch('https://ipapi.co/json/').then(r=>r.json()).then(d=>{loc.innerHTML=`<i class="zmdi zmdi-pin"></i> ${BanglaUtil.toCity(d.city||'Dhaka')}`;}).catch(()=>{});}
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
    const w = window.innerWidth;
    track.style.animationDuration = w < 480 ? '8s' : w < 768 ? '10s' : w < 1200 ? '12s' : '15s';
  },

  // ── Mobile nav ───────────────────────────────────────────
  initMobileNav() {
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
      ham.setAttribute('aria-expanded','true');ham.classList.add('joaf-hamburger--open');
      document.body.style.overflow='hidden';document.body.style.touchAction='none';
      setTimeout(()=>{items.forEach(el=>{el.style.transform='translateY(0) scale(1)';el.style.opacity='1';});},60);
      window._joafClose=doClose;
    };
    const doClose=()=>{
      if(!open)return;open=false;
      items.forEach(el=>{el.style.transform='translateY(20px) scale(.96)';el.style.opacity='0';});
      ham.classList.remove('joaf-hamburger--open');ham.setAttribute('aria-expanded','false');
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
