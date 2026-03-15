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
      if (item.dropdown) {
        const subs = item.dropdown.map(s =>
          `<li><a href="${s.href}">${s.label}</a></li>`
        ).join('');
        return `<li class="has-dropdown ${active}">
          <a href="${item.href}"${active?' aria-current="page"':''}>${item.label} <span class="nav-caret">▾</span></a>
          <ul class="nav-dropdown">${subs}</ul>
        </li>`;
      }
      return `<li class="${active}"><a href="${item.href}"${active?' aria-current="page"':''}>${item.label}</a></li>`;
    }).join('');

    let mnavIdx = 0;
    const mobileItems = JOAF.nav.map(item => {
      const isActive = item.id === activePage;
      const delay = mnavIdx * 0.055;
      mnavIdx++;
      const style = `transform:translateY(20px) scale(.96);opacity:0;transition:transform .38s cubic-bezier(.34,1.4,.64,1) ${delay}s,opacity .35s ease ${delay}s`;

      let subs = '';
      if (item.dropdown) {
        subs = item.dropdown.map(s => {
          const d2 = mnavIdx * 0.055; mnavIdx++;
          return `<li class="mnav-item mnav-sub" style="transform:translateY(20px) scale(.96);opacity:0;transition:transform .38s cubic-bezier(.34,1.4,.64,1) ${d2}s,opacity .35s ease ${d2}s">
            <a href="${s.href}" class="mnav-link mnav-link--sub" onclick="if(window._joafClose)window._joafClose()">
              <span class="mnav-label">${s.label}</span>
              <span class="mnav-arrow">›</span>
            </a>
          </li>`;
        }).join('');
      }

      return `<li class="mnav-item${item.dropdown?' mnav-has-sub':''}" style="${style}">
        <a href="${item.href}" class="mnav-link${isActive?' mnav-link--active':''}" onclick="if(window._joafClose)window._joafClose()">
          <span class="mnav-label">${item.label}</span>
          <span class="mnav-arrow">${item.dropdown ? '▾' : '›'}</span>
        </a>
      </li>${subs}`;
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

  renderMaze() {
    const bigContainer = document.getElementById('maze-big-tiles');
    if (!bigContainer || !JOAF.maze) return;
    bigContainer.innerHTML = JOAF.maze.layers[0].tiles.map(t => `
      <div class="jtile ${t.color}" onclick="joafMaze.goTo(${t.goTo})">
        <span class="jtile-icon">${t.icon}</span>
        <div class="jtile-name">${t.name}</div>
        <div class="jtile-sub">${t.sub}</div>
        <div class="jtile-arr">›</div>
      </div>`).join('');
    for (let i = 1; i <= 4; i++) {
      const sub = document.getElementById('maze-sub-tiles-'+i);
      if (!sub) continue;
      sub.innerHTML = JOAF.maze.layers[i].tiles.map(s => `
        <a href="${s.link}" class="jstile jbr-${i===1?'red':i===2?'blue':i===3?'green':'purple'}">
          <span class="jsi">${s.icon}</span>
          <span class="jsn">${s.name}</span>
        </a>`).join('');
    }
  },

  initMaze() {
    window.joafMaze = {
      currentLayer: 0,
      goTo(layer) {
        document.querySelectorAll('.jlayer').forEach(l => l.classList.remove('active'));
        const el = document.getElementById('layer-'+layer);
        if (el) el.classList.add('active');
        this.currentLayer = layer;
        this.renderBC();
      },
      renderBC() {
        const bc = document.getElementById('maze-bc');
        if (!bc) return;
        let h = '';
        if (this.currentLayer > 0) {
          const title = JOAF.maze.layers[this.currentLayer].title;
          h = `<button class="jbc-back" onclick="joafMaze.goTo(0)">‹ ফিরে যান</button>
               <button class="jbc-home" onclick="joafMaze.goTo(0)">🏠</button>
               <span class="jbc-sep">›</span>
               <span class="jbc-cur">${title}</span>`;
        }
        bc.innerHTML = h;
      }
    };
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
  initDropdowns() {
    document.querySelectorAll('.has-dropdown').forEach(li => {
      const link = li.querySelector(':scope > a');
      if (!link) return;
      link.addEventListener('click', e => {
        // If has dropdown, toggle on click (don't navigate)
        if (window.innerWidth >= 768) {
          e.preventDefault();
          li.classList.toggle('open');
          // Close others
          document.querySelectorAll('.has-dropdown').forEach(other => {
            if (other !== li) other.classList.remove('open');
          });
        }
      });
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.has-dropdown')) {
        document.querySelectorAll('.has-dropdown').forEach(li => li.classList.remove('open'));
      }
    });
  },

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

    // maze HTML is in index.html, rendered via renderMaze()

    // Global Alert FAB + Modal — all pages
    // Remove existing first to re-inject fresh
    ['joaf-global-alert-modal','joaf-alert-fab','joaf-blood-fab','joaf-blood-modal-wrap'].forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });
    if (!document.getElementById('joaf-global-alert-modal')) {
      const html = `
      <style>
      #joaf-alert-fab{position:fixed!important;bottom:80px!important;left:0px!important;transform:none!important;background:linear-gradient(135deg,#90161f,#c0392b);color:#fff;border:none;border-radius:50px;padding:12px 18px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(144,22,31,.4);z-index:9990!important;display:flex!important;align-items:center;gap:6px;white-space:nowrap;}
      #joaf-blood-fab{position:fixed!important;bottom:130px!important;left:0px!important;background:linear-gradient(135deg,#075e55,#0a7a6e);color:#fff;border:none;border-radius:50px;padding:12px 18px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(7,94,85,.4);z-index:9990!important;align-items:center;gap:6px;white-space:nowrap;display:none;}
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
            <div style="position:relative">
              <input type="text" id="joaf-f-location" placeholder="গ্রাম/মহল্লা, উপজেলা, জেলা" autocomplete="off">
              <div id="joaf-loc-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #90161f;border-top:none;border-radius:0 0 10px 10px;z-index:999999;max-height:180px;overflow-y:auto;"></div>
            </div>
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
      #joaf-blood-reg-modal{display:none;position:fixed!important;inset:0!important;background:rgba(0,0,0,.6);z-index:99999!important;align-items:flex-end;}
      #joaf-blood-reg-modal.open{display:flex!important;}
      .jbr-inner{background:#fff;border-radius:24px 24px 0 0;padding:20px;width:100%;max-height:90vh;overflow-y:auto;}
      .jbr-fg{margin-bottom:12px;}
      .jbr-fg label{font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;}
      .jbr-fg input,.jbr-fg select{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box;}
      .jbr-fg input:focus,.jbr-fg select:focus{border-color:#075e55;}
      .jbr-submit{width:100%;padding:13px;background:linear-gradient(135deg,#075e55,#0a7a6e);color:#fff;border:none;border-radius:50px;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer;margin-top:8px;}
      </style>
      <button id="joaf-blood-fab">🩸 নিবন্ধন করুন</button>
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
          <div class="jbr-fg">
            <button type="button" id="jbr-gps-btn" style="width:100%;padding:10px;background:#f3f4f6;border:2px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">📍 আপনার GPS লোকেশন যোগ করুন (ঐচ্ছিক)</button>
            <input type="hidden" id="jbr-lat">
            <input type="hidden" id="jbr-lng">
          </div>
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
          bfabEl.addEventListener('click', () => window.location.href = '/rokto.html');
        }
      }

      // GPS button handler
      const jbrGpsBtn = document.getElementById('jbr-gps-btn');
      if (jbrGpsBtn) {
        jbrGpsBtn.addEventListener('click', () => {
          jbrGpsBtn.textContent = '⏳ লোকেশন নেওয়া হচ্ছে...';
          navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById('jbr-lat').value = pos.coords.latitude;
            document.getElementById('jbr-lng').value = pos.coords.longitude;
            jbrGpsBtn.textContent = '✅ লোকেশন পাওয়া গেছে';
            jbrGpsBtn.style.background = '#dcfce7';
            jbrGpsBtn.style.borderColor = '#10b981';
            jbrGpsBtn.style.color = '#065f46';
          }, () => {
            jbrGpsBtn.textContent = '❌ লোকেশন পাওয়া যায়নি';
          });
        });
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
          const lat = document.getElementById('jbr-lat').value;
          const lng = document.getElementById('jbr-lng').value;
          await addDoc(collection(db,'donors'),{name,phone,blood,district,area,lastDonate,lat:lat?parseFloat(lat):null,lng:lng?parseFloat(lng):null,createdAt:serverTimestamp()});
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

      // Location suggestion for alert form
      const alertLocInput = document.getElementById('joaf-f-location');
      const alertLocSug = document.getElementById('joaf-loc-suggestions');
      if (alertLocInput && alertLocSug) {
        alertLocInput.addEventListener('input', function() {
          const q = this.value.trim().toLowerCase();
          if (!q || q.length < 2) { alertLocSug.style.display='none'; return; }
          const matches = [];
          if (window.bnSearch) {
            // Get all keys from ALL_MAP via bn-search
            const allMap = window._bnAllMap || {};
            Object.entries(allMap).forEach(([en, bn]) => {
              if (en.startsWith(q) || bn.includes(q)) matches.push(bn);
            });
          }
          // Also check common locations
          const LOCS = ['ঢাকা','চট্টগ্রাম','সিলেট','রাজশাহী','খুলনা','বরিশাল','রংপুর','ময়মনসিংহ','গাজীপুর','নারায়ণগঞ্জ','কুমিল্লা','মিরপুর','উত্তরা','মোহাম্মদপুর','ধানমন্ডি','গুলশান','বনানী','রামপুরা','মালিবাগ','যাত্রাবাড়ী','ভোলা','লালমোহন','ফরিদপুর','যশোর','বগুড়া','দিনাজপুর','পাবনা','সিরাজগঞ্জ','নাটোর','রাজশাহী সদর','খুলনা সদর','বরিশাল সদর'];
          LOCS.forEach(loc => { if (loc.includes(this.value.trim())) matches.push(loc); });
          const unique = [...new Set(matches)].slice(0, 8);
          if (!unique.length) { alertLocSug.style.display='none'; return; }
          alertLocSug.innerHTML = unique.map(m => 
            '<div style="padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f3f4f6;" ' +
            'onmousedown="document.getElementById(\'joaf-f-location\').value=\''+m+'\';document.getElementById(\'joaf-loc-suggestions\').style.display=\'none\'">'+m+'</div>'
          ).join('');
          alertLocSug.style.display='block';
        });
        alertLocInput.addEventListener('blur', () => setTimeout(() => alertLocSug.style.display='none', 200));
      }

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
    setTimeout(() => this.initDropdowns(), 100);
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

    // 8. PWA install prompt
    setTimeout(() => this.initPWAPrompt(), 2000);

    // 9. Push notification permission prompt
    setTimeout(() => this.initPushPrompt(), 3500);

    // 10. iOS Chrome install prompt
    setTimeout(() => this.initIOSPrompt(), 1000);
  },

  // ── PWA Install Prompt ─────────────────────────────────────
  initPWAPrompt() {
    // Handled by global _joafShowInstallPrompt below
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') joafSubscribePush();
  },
  // ── Push Notification Permission Prompt ───────────────────
  initPushPrompt() {
    // Handled by global _joafShowPushPrompt below
  },
  initIOSPrompt() {
    // Handled by global _joafShowIOSPrompt below
  },


  renderMazeNav() {
    return `
    <section class="joaf-maze-section section" id="joaf-maze-nav" aria-label="সেবা নেভিগেশন">
      <div class="container">
        <div class="joaf-maze-wrap">
          <div class="joaf-bc" id="joaf-bc"></div>
          <div class="joaf-screen" id="joaf-screen">

            <!-- L0 হোম -->
            <div class="jlayer active" id="jL-0">
              <div class="jgrid-2">
                <div class="jtile jc-red" onclick="joafMaze.go('andolon')">
                  <span class="jtile-icon">🔥</span>
                  <div class="jtile-name">আন্দোলন</div>
                  <div class="jtile-sub">৪টি সেবা</div>
                  <div class="jtile-arr">›</div>
                </div>
                <div class="jtile jc-blue" onclick="joafMaze.go('seva')">
                  <span class="jtile-icon">🆘</span>
                  <div class="jtile-name">সেবা</div>
                  <div class="jtile-sub">৬টি সেবা</div>
                  <div class="jtile-arr">›</div>
                </div>
                <div class="jtile jc-green" onclick="joafMaze.go('shujo')">
                  <span class="jtile-icon">🌱</span>
                  <div class="jtile-name">সুযোগ</div>
                  <div class="jtile-sub">৬টি সেবা</div>
                  <div class="jtile-arr">›</div>
                </div>
                <div class="jtile jc-purple" onclick="joafMaze.go('joaf')">
                  <span class="jtile-icon">🌐</span>
                  <div class="jtile-name">JOAF</div>
                  <div class="jtile-sub">৬টি সেবা</div>
                  <div class="jtile-arr">›</div>
                </div>
              </div>
            </div>

            <!-- L1 আন্দোলন -->
            <div class="jlayer" id="jL-andolon">
              <div class="jsec-head jc-red"><span>🔥</span><div><div class="jsec-name">আন্দোলন</div><div class="jsec-sub">জুলাই চেতনার কেন্দ্র</div></div></div>
              <div class="jgrid-3">
                <a href="/july-warriors.html" class="jstile jbr-red"><span class="jsi">✊</span><span class="jsn">জুলাই যোদ্ধা</span></a>
                <a href="/leader-tracker.html" class="jstile jbr-red"><span class="jsi">🏛️</span><span class="jsn">নেতা ট্র্যাকার</span></a>
                <a href="/legal.html" class="jstile jbr-red"><span class="jsi">🚫</span><span class="jsn">দুর্নীতি রিপোর্ট</span></a>
                <a href="/joaf-polls.html" class="jstile jbr-red"><span class="jsi">🗳️</span><span class="jsn">জনমত জরিপ</span></a>
                <a href="/july-family.html" class="jstile jbr-red"><span class="jsi">🩹</span><span class="jsn">পরিবার সহায়</span></a>
                <a href="/voter.html" class="jstile jbr-red"><span class="jsi">🗳️</span><span class="jsn">ভোটার তথ্য</span></a>
              </div>
            </div>

            <!-- L1 সেবা -->
            <div class="jlayer" id="jL-seva">
              <div class="jsec-head jc-blue"><span>🆘</span><div><div class="jsec-name">সেবা</div><div class="jsec-sub">জরুরি সহায়তা</div></div></div>
              <div class="jgrid-3">
                <a href="/rokto.html" class="jstile jbr-blue"><span class="jsi">🩸</span><span class="jsn">রক্তদাতা</span></a>
                <a href="/alert.html" class="jstile jbr-blue"><span class="jsi">🚨</span><span class="jsn">জরুরি সতর্কতা</span></a>
                <a href="/bajar.html" class="jstile jbr-blue"><span class="jsi">🛒</span><span class="jsn">বাজার দর</span></a>
                <a href="/weather.html" class="jstile jbr-blue"><span class="jsi">🌦️</span><span class="jsn">আবহাওয়া</span></a>
                <a href="/hospital.html" class="jstile jbr-teal"><span class="jsi">🏥</span><span class="jsn">হাসপাতাল</span></a>
                <a href="/doctor.html" class="jstile jbr-teal"><span class="jsi">👨‍⚕️</span><span class="jsn">ডাক্তার</span></a>
                <a href="/medicine.html" class="jstile jbr-blue"><span class="jsi">💊</span><span class="jsn">ওষুধের দাম</span></a>
                <a href="/legal.html" class="jstile jbr-amber"><span class="jsi">⚖️</span><span class="jsn">আইনি সহায়তা</span></a>
                <a href="/food-aid.html" class="jstile jbr-amber"><span class="jsi">🍱</span><span class="jsn">খাদ্য সহায়তা</span></a>
                <a href="/july-family.html" class="jstile jbr-red"><span class="jsi">🩹</span><span class="jsn">জুলাই পরিবার</span></a>
              </div>
            </div>

            <!-- L2 হাসপাতাল -->
            <div class="jlayer" id="jL-hospital">
              <div class="jsec-head jc-teal"><span>🏥</span><div><div class="jsec-name">হাসপাতাল ও স্বাস্থ্য</div><div class="jsec-sub">শীঘ্রই আসছে</div></div></div>
              <div class="jgrid-3">
                <a href="#" class="jstile jbr-teal"><span class="jsi">🏥</span><span class="jsn">হাসপাতাল খুঁজুন</span></a>
                <a href="#" class="jstile jbr-teal"><span class="jsi">👨‍⚕️</span><span class="jsn">ডাক্তার</span></a>
                <a href="#" class="jstile jbr-teal"><span class="jsi">💊</span><span class="jsn">ওষুধের দাম</span></a>
              </div>
            </div>

            <!-- L2 আইন -->
            <div class="jlayer" id="jL-legal">
              <div class="jsec-head jc-amber"><span>⚖️</span><div><div class="jsec-name">আইনি সহায়তা</div><div class="jsec-sub">শীঘ্রই আসছে</div></div></div>
              <div class="jgrid-3">
                <a href="#" class="jstile jbr-amber"><span class="jsi">⚖️</span><span class="jsn">আইনজীবী</span></a>
                <a href="#" class="jstile jbr-amber"><span class="jsi">🚔</span><span class="jsn">থানা নম্বর</span></a>
                <a href="#" class="jstile jbr-amber"><span class="jsi">📋</span><span class="jsn">আইনি তথ্য</span></a>
              </div>
            </div>

            <!-- L1 সুযোগ -->
            <div class="jlayer" id="jL-shujo">
              <div class="jsec-head jc-green"><span>🌱</span><div><div class="jsec-name">সুযোগ</div><div class="jsec-sub">আপনার ভবিষ্যৎ গড়ুন</div></div></div>
              <div class="jgrid-3">
                <a href="/jobs.html" class="jstile jbr-green"><span class="jsi">💼</span><span class="jsn">চাকরি</span></a>
                <a href="/jobs.html" class="jstile jbr-green"><span class="jsi">🎓</span><span class="jsn">বৃত্তি</span></a>
                <a href="/jobs.html" class="jstile jbr-green"><span class="jsi">🔧</span><span class="jsn">কারিগর</span></a>
                <a href="/agriculture.html" class="jstile jbr-green"><span class="jsi">🌾</span><span class="jsn">কৃষি তথ্য</span></a>
                <a href="/women-entrepreneur.html" class="jstile jbr-green"><span class="jsi">👩‍💼</span><span class="jsn">নারী উদ্যোক্তা</span></a>
                <a href="/youth-startup.html" class="jstile jbr-green"><span class="jsi">🚀</span><span class="jsn">যুব উদ্যোক্তা</span></a>
              </div>
            </div>

            <!-- L1 JOAF -->
            <div class="jlayer" id="jL-joaf">
              <div class="jsec-head jc-purple"><span>🌐</span><div><div class="jsec-name">JOAF</div><div class="jsec-sub">আমাদের প্ল্যাটফর্ম</div></div></div>
              <div class="jgrid-3">
                <a href="/community.html" class="jstile jbr-purple"><span class="jsi">👥</span><span class="jsn">কমিউনিটি</span></a>
                <a href="/news.html" class="jstile jbr-purple"><span class="jsi">📰</span><span class="jsn">সংবাদ</span></a>
                <a href="/events.html" class="jstile jbr-purple"><span class="jsi">📅</span><span class="jsn">অনুষ্ঠান</span></a>
                <a href="/joaf-polls.html" class="jstile jbr-purple"><span class="jsi">🗳️</span><span class="jsn">জনমত</span></a>
                <a href="/july-warriors.html" class="jstile jbr-purple"><span class="jsi">✊</span><span class="jsn">জুলাই যোদ্ধা</span></a>
                <a href="/leader-tracker.html" class="jstile jbr-purple"><span class="jsi">🏛️</span><span class="jsn">নেতা ট্র্যাকার</span></a>
                <a href="/live.html" class="jstile jbr-purple"><span class="jsi">📡</span><span class="jsn">লাইভ</span></a>
                <a href="/forum.html" class="jstile jbr-purple"><span class="jsi">💬</span><span class="jsn">ফোরাম</span></a>
                <a href="/membership.html" class="jstile jbr-purple"><span class="jsi">🤝</span><span class="jsn">যোগ দিন</span></a>
                <a href="/donate.html" class="jstile jbr-purple"><span class="jsi">💚</span><span class="jsn">সহযোগিতা</span></a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
`;
  },

  initMazeNav() {
    if (window.joafMaze) return;
    window.joafMaze = {
      stack: ['home'],
      tree: {
        home:     {label:'🏠 হোম',           color:'#6b7280', parent:null},
        andolon:  {label:'🔥 আন্দোলন',        color:'#dc2626', parent:'home'},
        seva:     {label:'🆘 সেবা',           color:'#2563eb', parent:'home'},
        shujo:    {label:'🌱 সুযোগ',          color:'#16a34a', parent:'home'},
        joaf:     {label:'🌐 JOAF',           color:'#9333ea', parent:'home'},
        hospital: {label:'🏥 হাসপাতাল',       color:'#0d9488', parent:'seva'},
        legal:    {label:'⚖️ আইনি সহায়তা',   color:'#d97706', parent:'seva'},
      },
      go(id, isBack=false) {
        document.querySelectorAll('.jlayer').forEach(l=>l.classList.remove('active','jback'));
        const el = document.getElementById('jL-'+(id==='home'?'0':id));
        if (!el) return;
        if (isBack) el.classList.add('jback');
        el.classList.add('active');
        if (isBack) { this.stack.pop(); }
        else { this.stack.push(id); }
        this.renderBC();
      },
      goBack() {
        if (this.stack.length<=1) return;
        const prev = this.stack[this.stack.length-2];
        this.go(prev, true);
      },
      goHome() {
        this.stack=['home'];
        document.querySelectorAll('.jlayer').forEach(l=>l.classList.remove('active','jback'));
        const h=document.getElementById('jL-0');
        if(h){h.classList.add('jback','active');}
        const bc=document.getElementById('joaf-bc');
        if(bc) bc.innerHTML='';
      },
      goTo(idx) {
        const target=this.stack[idx];
        this.stack=this.stack.slice(0,idx+1);
        document.querySelectorAll('.jlayer').forEach(l=>l.classList.remove('active','jback'));
        const el=document.getElementById('jL-'+(target==='home'?'0':target));
        if(el){el.classList.add('jback','active');}
        this.renderBC();
      },
      renderBC() {
        const bc=document.getElementById('joaf-bc');
        if (!bc) return;
        if (this.stack.length<=1){bc.innerHTML='';return;}
        let h=`<button class="jbc-back" onclick="joafMaze.goBack()">‹ ফিরে যান</button>`;
        h+=`<button class="jbc-home" onclick="joafMaze.goHome()">🏠</button>`;
        for(let i=1;i<this.stack.length;i++){
          const n=this.tree[this.stack[i]];if(!n)continue;
          h+=`<span class="jbc-sep">›</span>`;
          if(i<this.stack.length-1){
            h+=`<button class="jbc-item" style="background:${n.color}" onclick="joafMaze.goTo(${i})">${n.label}</button>`;
          } else {
            h+=`<span class="jbc-item jbc-cur" style="background:${n.color}">${n.label}</span>`;
          }
        }
        bc.innerHTML=h;
      }
    };
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
  JOAFComponents.renderMaze();
  JOAFComponents.initMaze();
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_joafInit);}else{_joafInit();}

// ── Push Notification Send ──────────────────────────
async function joafSendAlertNotification(data) {
  // Show local notification to current user
  if ('Notification' in window && Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(data.title, {
      body: data.body,
      icon: '/logoc7c3.png',
      image: data.image,
      data: { url: data.url },
      vibrate: [200,100,200],
      requireInteraction: true
    });
  }

  // Also save to Firebase so other users see it on next visit
  try {
    const {getApps, initializeApp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const {getFirestore, collection, addDoc, serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const fbApp = getApps().length ? getApps()[0] : initializeApp({apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',authDomain:'joaf-app-45753.firebaseapp.com',projectId:'joaf-app-45753'});
    const db = getFirestore(fbApp);
    await addDoc(collection(db, 'notifications'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch(e) {}
}

// ── Admin Email via EmailJS ──────────────────────────
async function joafSendAdminEmail(data) {
  try {
    // Load EmailJS
    if (!window.emailjs) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      emailjs.init('FmIBBVHHHu8qEL38O');
    }

    // Emergency services by type
    const emergencyEmails = {
      'আগুন': 'fire@julyforum.com',
      'বন্যা': 'disaster@julyforum.com',
      'অপরাধ': 'law@julyforum.com',
      'মেডিকেল': 'medical@julyforum.com',
      'দুর্ঘটনা': 'accident@julyforum.com',
    };

    await emailjs.send('service_1x9gz1r', 'template_qlcgmz6', {
      to_email: 'info@julyforum.com',
      alert_type: data.type || 'অন্যান্য',
      alert_title: data.title,
      alert_desc: data.desc,
      alert_location: data.location,
      alert_photo: data.photo || 'কোনো ছবি নেই',
      reporter: data.reporter || 'অজ্ঞাত',
      emergency_contact: emergencyEmails[data.type] || '',
      site_url: 'https://julyforum.com/alert.html'
    });
  } catch(e) { console.log('Email send failed:', e); }
}

// ── Push Notification Subscription ──────────────────
const JOAF_VAPID = 'BCSwlS-ZLtznZGUGaDil3TQzT5GMmqeIAVyDNmimf5Z7IokRwk1xWDtatjALnGNhufdgq9UVZNnHcbnzXq7JcXE';

// ── Emergency Services Database ──────────────────────
const JOAF_EMERGENCY_DB = {"ঢাকা": {"police": ["999", "02-9514444", "02-9514445"], "fire": ["102", "02-9553344", "02-9553355"], "ambulance": ["199", "02-9891915"], "hospital": ["DMCH: 02-55165001", "Shaheed Suhrawardy: 02-9115340"]}, "গাজীপুর": {"police": ["999", "02-9810100"], "fire": ["102", "02-9813733"], "ambulance": ["199", "02-9810012"]}, "নারায়ণগঞ্জ": {"police": ["999", "02-7641992"], "fire": ["102", "02-7641616"], "ambulance": ["199", "02-7641234"]}, "মানিকগঞ্জ": {"police": ["999", "0651-62199"], "fire": ["102", "0651-62102"], "ambulance": ["199"]}, "মুন্সীগঞ্জ": {"police": ["999", "0681-62199"], "fire": ["102", "0681-62102"], "ambulance": ["199"]}, "নরসিংদী": {"police": ["999", "0621-62199"], "fire": ["102", "0621-62102"], "ambulance": ["199"]}, "কিশোরগঞ্জ": {"police": ["999", "0941-62199"], "fire": ["102", "0941-62700"], "ambulance": ["199"]}, "টাঙ্গাইল": {"police": ["999", "0921-62199"], "fire": ["102", "0921-62102"], "ambulance": ["199"]}, "ফরিদপুর": {"police": ["999", "0631-62199"], "fire": ["102", "0631-62102"], "ambulance": ["199"]}, "গোপালগঞ্জ": {"police": ["999", "0668-62199"], "fire": ["102", "0668-62102"], "ambulance": ["199"]}, "মাদারীপুর": {"police": ["999", "0661-62199"], "fire": ["102", "0661-62102"], "ambulance": ["199"]}, "শরীয়তপুর": {"police": ["999", "0601-62199"], "fire": ["102", "0601-62102"], "ambulance": ["199"]}, "রাজবাড়ী": {"police": ["999", "0641-62199"], "fire": ["102", "0641-62102"], "ambulance": ["199"]}, "চট্টগ্রাম": {"police": ["999", "031-615730", "031-615731"], "fire": ["102", "031-612229", "031-630234"], "ambulance": ["199", "031-615460"], "hospital": ["CMCH: 031-630286", "General Hospital: 031-612269"]}, "কক্সবাজার": {"police": ["999", "0341-62199"], "fire": ["102", "0341-62102"], "ambulance": ["199", "0341-62000"]}, "কুমিল্লা": {"police": ["999", "081-62199", "081-72000"], "fire": ["102", "081-62102"], "ambulance": ["199", "081-62911"]}, "ব্রাহ্মণবাড়িয়া": {"police": ["999", "0851-62199"], "fire": ["102", "0851-62102"], "ambulance": ["199"]}, "চাঁদপুর": {"police": ["999", "0841-62199"], "fire": ["102", "0841-62102"], "ambulance": ["199"]}, "নোয়াখালী": {"police": ["999", "0321-62199"], "fire": ["102", "0321-62700"], "ambulance": ["199"]}, "ফেনী": {"police": ["999", "0331-62199"], "fire": ["102", "0331-62102"], "ambulance": ["199"]}, "লক্ষ্মীপুর": {"police": ["999", "0381-62199"], "fire": ["102", "0381-62102"], "ambulance": ["199"]}, "খাগড়াছড়ি": {"police": ["999", "0371-62199"], "fire": ["102", "0371-62102"], "ambulance": ["199"]}, "রাঙ্গামাটি": {"police": ["999", "0351-62199"], "fire": ["102", "0351-62102"], "ambulance": ["199"]}, "বান্দরবান": {"police": ["999", "0361-62199"], "fire": ["102", "0361-62102"], "ambulance": ["199"]}, "সিলেট": {"police": ["999", "0821-716575", "0821-716576"], "fire": ["102", "0821-715511", "0821-716516"], "ambulance": ["199", "0821-716577"], "hospital": ["Sylhet MAG Osmani: 0821-716476"]}, "মৌলভীবাজার": {"police": ["999", "0861-52199"], "fire": ["102", "0861-52102"], "ambulance": ["199"]}, "হবিগঞ্জ": {"police": ["999", "0831-52199"], "fire": ["102", "0831-52102"], "ambulance": ["199"]}, "সুনামগঞ্জ": {"police": ["999", "0871-62199"], "fire": ["102", "0871-62102"], "ambulance": ["199"]}, "রাজশাহী": {"police": ["999", "0721-772266", "0721-772267"], "fire": ["102", "0721-772229"], "ambulance": ["199", "0721-772500"], "hospital": ["RMCH: 0721-772150"]}, "নওগাঁ": {"police": ["999", "0741-62199"], "fire": ["102", "0741-62102"], "ambulance": ["199"]}, "নাটোর": {"police": ["999", "0771-62199"], "fire": ["102", "0771-62102"], "ambulance": ["199"]}, "চাঁপাইনবাবগঞ্জ": {"police": ["999", "0781-55199"], "fire": ["102", "0781-55102"], "ambulance": ["199"]}, "পাবনা": {"police": ["999", "0731-65199"], "fire": ["102", "0731-65102"], "ambulance": ["199"]}, "সিরাজগঞ্জ": {"police": ["999", "0751-62199"], "fire": ["102", "0751-62102"], "ambulance": ["199"]}, "বগুড়া": {"police": ["999", "051-62199", "051-67000"], "fire": ["102", "051-62102"], "ambulance": ["199", "051-62911"]}, "জয়পুরহাট": {"police": ["999", "0571-62199"], "fire": ["102", "0571-62102"], "ambulance": ["199"]}, "খুলনা": {"police": ["999", "041-731477", "041-731478"], "fire": ["102", "041-722100", "041-720222"], "ambulance": ["199", "041-731500"], "hospital": ["Khulna Medical: 041-723347"]}, "যশোর": {"police": ["999", "0421-68199"], "fire": ["102", "0421-68102"], "ambulance": ["199", "0421-68500"]}, "সাতক্ষীরা": {"police": ["999", "0471-62199"], "fire": ["102", "0471-62102"], "ambulance": ["199"]}, "ঝিনাইদহ": {"police": ["999", "0451-62199"], "fire": ["102", "0451-62102"], "ambulance": ["199"]}, "মাগুরা": {"police": ["999", "0488-62199"], "fire": ["102", "0488-62102"], "ambulance": ["199"]}, "নড়াইল": {"police": ["999", "0481-62199"], "fire": ["102", "0481-62102"], "ambulance": ["199"]}, "কুষ্টিয়া": {"police": ["999", "071-62199", "071-73000"], "fire": ["102", "071-62102"], "ambulance": ["199"]}, "চুয়াডাঙ্গা": {"police": ["999", "0761-62199"], "fire": ["102", "0761-62102"], "ambulance": ["199"]}, "মেহেরপুর": {"police": ["999", "0791-62199"], "fire": ["102", "0791-62102"], "ambulance": ["199"]}, "বাগেরহাট": {"police": ["999", "0468-62199"], "fire": ["102", "0468-62102"], "ambulance": ["199"]}, "বরিশাল": {"police": ["999", "0431-62199", "0431-2174199"], "fire": ["102", "0431-62102", "0431-2174102"], "ambulance": ["199", "0431-62500"], "hospital": ["Barishal Sher-e-Bangla: 0431-2173280"]}, "ভোলা": {"police": ["999", "0491-62199"], "fire": ["102", "0491-62102"], "ambulance": ["199"]}, "পটুয়াখালী": {"police": ["999", "0441-62199"], "fire": ["102", "0441-62102"], "ambulance": ["199"]}, "পিরোজপুর": {"police": ["999", "0461-62199"], "fire": ["102", "0461-62102"], "ambulance": ["199"]}, "বরগুনা": {"police": ["999", "0448-62199"], "fire": ["102", "0448-62102"], "ambulance": ["199"]}, "ঝালকাঠি": {"police": ["999", "0498-62199"], "fire": ["102", "0498-62102"], "ambulance": ["199"]}, "রংপুর": {"police": ["999", "0521-62199", "0521-62200"], "fire": ["102", "0521-62102"], "ambulance": ["199", "0521-62500"], "hospital": ["Rangpur Medical: 0521-62640"]}, "দিনাজপুর": {"police": ["999", "0531-64199"], "fire": ["102", "0531-64102"], "ambulance": ["199"]}, "গাইবান্ধা": {"police": ["999", "0541-62199"], "fire": ["102", "0541-62102"], "ambulance": ["199"]}, "কুড়িগ্রাম": {"police": ["999", "0581-62199"], "fire": ["102", "0581-62102"], "ambulance": ["199"]}, "লালমনিরহাট": {"police": ["999", "0591-62199"], "fire": ["102", "0591-62102"], "ambulance": ["199"]}, "নীলফামারী": {"police": ["999", "0551-62199"], "fire": ["102", "0551-62102"], "ambulance": ["199"]}, "পঞ্চগড়": {"police": ["999", "0564-62199"], "fire": ["102", "0564-62102"], "ambulance": ["199"]}, "ঠাকুরগাঁও": {"police": ["999", "0561-52199"], "fire": ["102", "0561-52102"], "ambulance": ["199"]}, "ময়মনসিংহ": {"police": ["999", "091-62199", "091-67000"], "fire": ["102", "091-62102"], "ambulance": ["199", "091-62500"], "hospital": ["Mymensingh Medical: 091-62524"]}, "জামালপুর": {"police": ["999", "0981-62199"], "fire": ["102", "0981-62102"], "ambulance": ["199"]}, "শেরপুর": {"police": ["999", "0931-62199"], "fire": ["102", "0931-62102"], "ambulance": ["199"]}, "নেত্রকোনা": {"police": ["999", "0951-62199"], "fire": ["102", "0951-62102"], "ambulance": ["199"]}};

// Type → relevant services
const JOAF_ALERT_SERVICES = {
  'আগুন': ['fire','police','ambulance'],
  'বন্যা': ['police','ambulance'],
  'অপরাধ': ['police'],
  'মেডিকেল': ['ambulance','hospital'],
  'দুর্ঘটনা': ['ambulance','police','fire'],
  'অন্যান্য': ['police','ambulance']
};

// National emergency numbers
const JOAF_NATIONAL = [
  {emoji:'🆘', name:'জাতীয় জরুরি', number:'999', desc:'Police/Fire/Ambulance'},
  {emoji:'🚑', name:'অ্যাম্বুলেন্স', number:'199', desc:'জাতীয় অ্যাম্বুলেন্স সেবা'},
  {emoji:'🚒', name:'ফায়ার সার্ভিস', number:'102', desc:'অগ্নিকাণ্ড ও উদ্ধার'},
  {emoji:'👮', name:'পুলিশ', number:'100', desc:'আইনশৃঙ্খলা'},
  {emoji:'🏥', name:'স্বাস্থ্য', number:'16430', desc:'স্বাস্থ্য বাতায়ন'},
  {emoji:'👩‍⚕️', name:'নারী সহায়তা', number:'10921', desc:'নারী ও শিশু নির্যাতন'},
  {emoji:'🧒', name:'শিশু সহায়তা', number:'1098', desc:'শিশু হেল্পলাইন'},
];

function joafShowEmergencyPopup(district, alertType) {
  const existing = document.getElementById('joaf-emergency-popup');
  if (existing) existing.remove();

  const services = JOAF_ALERT_SERVICES[alertType] || ['police','ambulance'];
  const distData = JOAF_EMERGENCY_DB[district] || {};

  let localHTML = '';
  if (Object.keys(distData).length) {
    localHTML = `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;margin-bottom:6px">📍 ${district} জেলা</div>`;
    services.forEach(svc => {
      if (!distData[svc]) return;
      const icons = {police:'👮',fire:'🚒',ambulance:'🚑',hospital:'🏥'};
      const names = {police:'পুলিশ',fire:'ফায়ার সার্ভিস',ambulance:'অ্যাম্বুলেন্স',hospital:'হাসপাতাল'};
      distData[svc].forEach(num => {
        localHTML += `<a href="tel:${num}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff5f5;border-radius:10px;margin-bottom:6px;text-decoration:none;border:1px solid #fecaca">
          <span style="font-size:20px">${icons[svc]}</span>
          <div><div style="font-size:12px;font-weight:700;color:#1a1a1a">${names[svc]}</div><div style="font-size:13px;font-weight:900;color:#90161f">${num}</div></div>
          <span style="margin-left:auto;background:#90161f;color:#fff;padding:4px 10px;border-radius:50px;font-size:11px;font-weight:800">📞 কল</span>
        </a>`;
      });
    });
    localHTML += '</div>';
  }

  let nationalHTML = '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;margin-bottom:6px">🇧🇩 জাতীয় নম্বর</div>';
  JOAF_NATIONAL.forEach(n => {
    nationalHTML += `<a href="tel:${n.number}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f0fdf4;border-radius:10px;margin-bottom:6px;text-decoration:none;border:1px solid #bbf7d0">
      <span style="font-size:18px">${n.emoji}</span>
      <div><div style="font-size:11px;font-weight:700;color:#1a1a1a">${n.name}</div><div style="font-size:13px;font-weight:900;color:#065f46">${n.number}</div></div>
      <span style="margin-left:auto;font-size:10px;color:#6b7280">${n.desc}</span>
    </a>`;
  });
  nationalHTML += '</div>';

  const popup = document.createElement('div');
  popup.id = 'joaf-emergency-popup';
  popup.innerHTML = `
    <style>
    #joaf-emergency-popup{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999999;display:flex;align-items:flex-end;}
    .jep-inner{background:#f9fafb;border-radius:24px 24px 0 0;padding:20px;width:100%;max-height:85vh;overflow-y:auto;}
    </style>
    <div class="jep-inner">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px;font-weight:900;color:#90161f">🚨 জরুরি সেবার নম্বর</h3>
        <button onclick="document.getElementById('joaf-emergency-popup').remove()" style="background:none;border:none;font-size:22px;cursor:pointer">✕</button>
      </div>
      ${localHTML}
      ${nationalHTML}
      <button onclick="document.getElementById('joaf-emergency-popup').remove()" style="width:100%;padding:12px;background:#1a1a1a;color:#fff;border:none;border-radius:50px;font-size:14px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:8px">বন্ধ করুন</button>
    </div>
  `;
  popup.addEventListener('click', e => { if(e.target===popup) popup.remove(); });
  document.body.appendChild(popup);
}

async function joafSubscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: JOAF_VAPID
    });

    // Save subscription to Firebase
    const {initializeApp, getApps} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const {getFirestore, collection, addDoc, serverTimestamp} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const fbApp = getApps().length ? getApps()[0] : initializeApp({apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',authDomain:'joaf-app-45753.firebaseapp.com',projectId:'joaf-app-45753'});
    const db = getFirestore(fbApp);
    await addDoc(collection(db, 'push_subscriptions'), {
      subscription: JSON.stringify(sub),
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent.substring(0, 100)
    });
    return sub;
  } catch(e) { console.log('Push subscription failed:', e); }
}


// ══════════════════════════════════════════════════════════════
// JOAF PROMPT SYSTEM v2.0
// Install + Push + Location — সব device, সব page
// ══════════════════════════════════════════════════════════════

// ── Device Detection ──────────────────────────────────────────
const _D = {
  isIOS:       /iphone|ipad|ipod/i.test(navigator.userAgent),
  isIOSSafari: /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|chrome/i.test(navigator.userAgent),
  isIOSChrome: /iphone|ipad|ipod/i.test(navigator.userAgent) && /crios|fxios|edgios/i.test(navigator.userAgent),
  isSafari:    /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isFirefox:   /firefox|fxios/i.test(navigator.userAgent),
  isChromium:  /chrome|chromium|crios|edg|samsung|samsungbrowser|opr|brave/i.test(navigator.userAgent) && !/edgios/i.test(navigator.userAgent),
  isStandalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
};

// ── State ─────────────────────────────────────────────────────
const _S = {
  pwaInstalled:  localStorage.getItem('joaf-pwa-installed') === '1' || _D.isStandalone,
  pushGranted:   typeof Notification !== 'undefined' && Notification.permission === 'granted',
  pushDenied:    typeof Notification !== 'undefined' && Notification.permission === 'denied',
  locationGranted: false, // will be checked async
};

// Check location permission async
if (navigator.permissions) {
  navigator.permissions.query({name:'geolocation'}).then(r => {
    _S.locationGranted = r.state === 'granted';
  }).catch(() => {});
}

// ── beforeinstallprompt — capture immediately ─────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window._deferredPWA = e;
  if (!_D.isIOS && !_D.isStandalone && !_S.pwaInstalled) {
    setTimeout(() => _joafShowInstallPrompt(), 1000);
  }
});

window.addEventListener('appinstalled', () => {
  _S.pwaInstalled = true;
  localStorage.setItem('joaf-pwa-installed', '1');
  const el = document.getElementById('joaf-install-wrap');
  if (el) el.remove();
});

// ══════════════════════════════════════════════════════════════
// 1. INSTALL PROMPT
// ══════════════════════════════════════════════════════════════
function _joafShowInstallPrompt() {
  if (_D.isIOS) return; // iOS has its own full-screen prompt
  if (_D.isStandalone) return;
  if (_S.pwaInstalled) return;
  if (localStorage.getItem('joaf-pwa-installed')) return;
  if (document.getElementById('joaf-install-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'joaf-install-wrap';
  wrap.innerHTML = `
    <style>
    #joaf-install-wrap {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99997;
      width: calc(100% - 32px);
      max-width: 400px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,.25);
      padding: 24px 20px 20px;
      font-family: inherit;
      animation: _joaf-popin .25s ease;
    }
    @keyframes _joaf-popin {
      from { opacity:0; transform:translate(-50%,-48%) scale(.96); }
      to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
    }
    #joaf-install-wrap .ji-close {
      position: absolute; top: 12px; right: 12px;
      width: 28px; height: 28px; border-radius: 50%;
      background: #f3f4f6; border: none; font-size: 14px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #6b7280;
    }
    #joaf-install-wrap .ji-logo {
      width: 52px; height: 52px; border-radius: 14px; margin-bottom: 10px;
    }
    #joaf-install-wrap .ji-title {
      font-size: 17px; font-weight: 900; color: #1a1a2e; margin-bottom: 4px;
    }
    #joaf-install-wrap .ji-domain {
      font-size: 13px; color: #90161f; font-weight: 800; margin-bottom: 14px;
      text-decoration: none; display: block;
    }
    #joaf-install-wrap .ji-features {
      font-size: 12px; color: #374151; line-height: 1.9;
      margin-bottom: 16px; text-align: left;
    }
    #joaf-install-wrap .ji-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg,#90161f,#c0392b);
      color: #fff; border: none; border-radius: 50px;
      font-size: 14px; font-weight: 900; font-family: inherit;
      cursor: pointer;
    }
    </style>
    <button class="ji-close" id="ji-close">✕</button>
    <div style="text-align:center">
      <img src="/logoc7c3.png" class="ji-logo">
      <div class="ji-title">📲 JOAF App Install করুন</div>
      <a href="https://www.julyforum.com" class="ji-domain">🌐 www.julyforum.com</a>
    </div>
    <div class="ji-features">
      🚨 জরুরি সতর্কতা — বন্যা, আগুন, দুর্ঘটনা<br>
      🩸 রক্তের প্রয়োজনে তাৎক্ষণিক Alert<br>
      📺 লাইভ সম্প্রচার ও Breaking News<br>
      🏛️ নেতা ট্র্যাকার — প্রতিশ্রুতি vs বাস্তবতা<br>
      🚫 দুর্নীতি রিপোর্ট করুন<br>
      ✊ জুলাই যোদ্ধা ও পরিবার সহায়<br>
      🛒 বাজার দর · 💊 ওষুধের দাম · 🌦️ আবহাওয়া<br>
      🏥 হাসপাতাল · ⚖️ আইনি সহায়তা · 🗳️ জনমত<br>
      💼 চাকরি · 💻 ফ্রিল্যান্স · 🚀 উদ্যোক্তা<br>
      🌍 বিশ্বজুড়ে JOAF নেটওয়ার্ক
    </div>
    <button class="ji-btn" id="ji-install">✅ Install করুন</button>`;

  document.body.appendChild(wrap);

  // Install button
  document.getElementById('ji-install').addEventListener('click', async () => {
    if (window._deferredPWA) {
      // Chromium (Chrome/Edge/Samsung) — direct install
      try {
        window._deferredPWA.prompt();
        const { outcome } = await window._deferredPWA.userChoice;
        if (outcome === 'accepted') {
          _S.pwaInstalled = true;
          localStorage.setItem('joaf-pwa-installed', '1');
          wrap.remove();
        }
      } catch(e) {}
    } else if (_D.isIOSSafari) {
      // iOS Safari — share sheet → Add to Home Screen
      try { await navigator.share({ title: 'JOAF', url: 'https://www.julyforum.com' }); } catch(e) {}
    } else if (_D.isSafari || _D.isFirefox) {
      // MacOS Safari / Firefox — share sheet
      try { await navigator.share({ title: 'JOAF', url: 'https://www.julyforum.com' }); } catch(e) {}
    }
    // else: _deferredPWA not fired yet — do nothing, wait for it
  });

  // Close
  document.getElementById('ji-close').addEventListener('click', () => {
    wrap.remove();
    setTimeout(_joafShowInstallPrompt, 5000);
  });
}

// ══════════════════════════════════════════════════════════════
// 2. PUSH + LOCATION PROMPT
// ══════════════════════════════════════════════════════════════
function _joafShowPushPrompt() {
  if (_D.isIOS && !_D.isStandalone) return; // iOS non-standalone: install prompt handles everything
  if (!('Notification' in window)) return;
  if (_S.pushDenied) return;
  if (_S.pushGranted) return; // push already granted, no need to ask again
  if (document.getElementById('joaf-push-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'joaf-push-wrap';
  wrap.innerHTML = `
    <style>
    #joaf-push-wrap {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99998;
      width: calc(100% - 32px);
      max-width: 400px;
      background: #0d0d1a;
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,.3);
      padding: 20px;
      font-family: inherit;
      color: #fff;
      animation: _joaf-slideup .25s ease;
    }
    @keyframes _joaf-slideup {
      from { opacity:0; transform:translateX(-50%) translateY(20px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
    #joaf-push-wrap .jp-close {
      position: absolute; top: 12px; right: 12px;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,.1); border: none; font-size: 14px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: rgba(255,255,255,.7);
    }
    #joaf-push-wrap .jp-title {
      font-size: 15px; font-weight: 900; margin-bottom: 10px;
    }
    #joaf-push-wrap .jp-features {
      font-size: 12px; color: rgba(255,255,255,.75);
      line-height: 1.8; margin-bottom: 14px;
    }
    #joaf-push-wrap .jp-btn {
      width: 100%; padding: 12px;
      background: linear-gradient(135deg,#90161f,#c0392b);
      color: #fff; border: none; border-radius: 50px;
      font-size: 13px; font-weight: 900;
      font-family: inherit; cursor: pointer;
    }
    </style>
    <button class="jp-close" id="jp-close">✕</button>
    <div class="jp-title">🔔 Notification চালু করুন</div>
    <div class="jp-features">
      🚨 আগুন · বন্যা · দুর্ঘটনায় সাথে সাথে জানুন<br>
      🩸 জরুরি রক্তের প্রয়োজনে Alert পাবেন<br>
      📺 Breaking News সবার আগে<br>
      ✊ জুলাই আন্দোলনের গুরুত্বপূর্ণ আপডেট<br>
      🛒 প্রতিদিন সকালে বাজার দর<br>
      🌦️ আপনার এলাকার আবহাওয়া সতর্কতা<br>
      🚨 জরুরি সতর্কতা · 🩸 রক্তদান · 🏥 স্বাস্থ্য
    </div>
    <button class="jp-btn" id="jp-allow">🔔 চালু করুন</button>`;

  document.body.appendChild(wrap);

  document.getElementById('jp-allow').addEventListener('click', async () => {
    wrap.remove();
    try {
      // Step 1: Push permission
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        _S.pushGranted = true;
        joafSubscribePush();
        try {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('✅ Notification চালু হয়েছে!', {
            body: 'JOAF এর সতর্কতা ও খবর এখন থেকে পাবেন।',
            icon: '/logoc7c3.png', badge: '/logoc7c3.png', vibrate: [200,100,200]
          });
        } catch(e) {}

        // Step 2: Location permission
        if (navigator.geolocation && !_S.locationGranted) {
          navigator.geolocation.getCurrentPosition(
            () => { _S.locationGranted = true; },
            () => {}
          );
        }
      }
    } catch(e) {}
  });

  document.getElementById('jp-close').addEventListener('click', () => {
    wrap.remove();
    setTimeout(_joafShowPushPrompt, 5000);
  });
}

// ══════════════════════════════════════════════════════════════
// 3. LOCATION PROMPT — সব page এ যদি location not granted
// ══════════════════════════════════════════════════════════════
function _joafShowLocationPrompt() {
  if (_S.locationGranted) return;
  if (!navigator.geolocation) return;
  if (document.getElementById('joaf-loc-wrap')) return;

  // Check current permission state
  if (navigator.permissions) {
    navigator.permissions.query({name:'geolocation'}).then(r => {
      if (r.state === 'granted') { _S.locationGranted = true; return; }
      if (r.state === 'denied') return; // user already denied, don't ask
      _joafRenderLocationPrompt();
    }).catch(() => _joafRenderLocationPrompt());
  } else {
    _joafRenderLocationPrompt();
  }
}

function _joafRenderLocationPrompt() {
  if (document.getElementById('joaf-loc-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'joaf-loc-wrap';
  wrap.innerHTML = `
    <style>
    #joaf-loc-wrap {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99994;
      width: calc(100% - 32px);
      max-width: 400px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.15);
      padding: 16px 18px;
      font-family: inherit;
      border: 1.5px solid #e5e7eb;
      animation: _joaf-slideup .3s ease;
    }
    #joaf-loc-wrap .jl-close {
      position: absolute; top: 10px; right: 10px;
      width: 26px; height: 26px; border-radius: 50%;
      background: #f3f4f6; border: none; font-size: 13px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #6b7280;
    }
    #joaf-loc-wrap .jl-title {
      font-size: 14px; font-weight: 900; color: #1a1a2e; margin-bottom: 6px;
    }
    #joaf-loc-wrap .jl-sub {
      font-size: 12px; color: #6b7280; margin-bottom: 12px; line-height: 1.5;
    }
    #joaf-loc-wrap .jl-btn {
      width: 100%; padding: 11px;
      background: linear-gradient(135deg,#16a34a,#15803d);
      color: #fff; border: none; border-radius: 50px;
      font-size: 13px; font-weight: 900;
      font-family: inherit; cursor: pointer;
    }
    </style>
    <button class="jl-close" id="jl-close">✕</button>
    <div class="jl-title">📍 Location Allow করুন</div>
    <div class="jl-sub">
      আপনার এলাকার সতর্কতা, আবহাওয়া, বাজার দর,
      রক্তদাতা ও হাসপাতাল সঠিকভাবে দেখাতে
    </div>
    <button class="jl-btn" id="jl-allow">📍 Allow করুন</button>`;

  document.body.appendChild(wrap);

  document.getElementById('jl-allow').addEventListener('click', () => {
    wrap.remove();
    navigator.geolocation.getCurrentPosition(
      () => { _S.locationGranted = true; },
      () => {}
    );
  });

  document.getElementById('jl-close').addEventListener('click', () => {
    wrap.remove();
    // পরের page এ আবার দেখাবে (no localStorage — refresh করলে আবার আসবে)
  });
}

// ══════════════════════════════════════════════════════════════
// 4. iOS Chrome/Edge/Firefox — Full Screen Prompt
// ══════════════════════════════════════════════════════════════
function _joafShowIOSPrompt() {
  if (!_D.isIOS) return; // Show for ALL iOS (Chrome, Safari, Firefox)
  if (_D.isStandalone) return;
  if (document.getElementById('joaf-ios-wrap')) return;

  const PAGES = [
    {icon:'🚨', label:'জরুরি সতর্কতা', href:'/alert.html'},
    {icon:'🩸', label:'রক্তদাতা নেটওয়ার্ক', href:'/rokto.html'},
    {icon:'📺', label:'লাইভ সম্প্রচার', href:'/live.html'},
    {icon:'🏛️', label:'নেতা ট্র্যাকার', href:'/leader-tracker.html'},
    {icon:'🚫', label:'দুর্নীতি রিপোর্ট', href:'/legal.html'},
    {icon:'✊', label:'জুলাই যোদ্ধা', href:'/july-warriors.html'},
    {icon:'🩹', label:'জুলাই পরিবার সহায়', href:'/july-family.html'},
    {icon:'🛒', label:'বাজার দর', href:'/bajar.html'},
    {icon:'💊', label:'ওষুধের দাম', href:'/medicine.html'},
    {icon:'🌦️', label:'আবহাওয়া', href:'/weather.html'},
    {icon:'🏥', label:'হাসপাতাল', href:'/hospital.html'},
    {icon:'⚖️', label:'আইনি সহায়তা', href:'/legal.html'},
    {icon:'🗳️', label:'জনমত জরিপ', href:'/joaf-polls.html'},
    {icon:'💼', label:'চাকরি ও বৃত্তি', href:'/jobs.html'},
    {icon:'💻', label:'ফ্রিল্যান্সিং গাইড', href:'/freelance.html'},
    {icon:'👩‍💼', label:'নারী উদ্যোক্তা', href:'/women-entrepreneur.html'},
    {icon:'🚀', label:'যুব উদ্যোক্তা', href:'/youth-startup.html'},
    {icon:'🌾', label:'কৃষি তথ্যসেবা', href:'/agriculture.html'},
    {icon:'💬', label:'আলোচনা ফোরাম', href:'/forum.html'},
    {icon:'📰', label:'সংবাদ', href:'/news.html'},
    {icon:'🌍', label:'কমিউনিটি নেটওয়ার্ক', href:'/community.html'},
  ];

  const pills = PAGES.map(p =>
    `<a href="${p.href}" style="display:inline-flex;align-items:center;gap:5px;padding:6px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:50px;font-size:12px;font-weight:700;color:#374151;text-decoration:none;margin:3px;">${p.icon} ${p.label}</a>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.id = 'joaf-ios-wrap';
  wrap.innerHTML = `
    <style>
    #joaf-ios-wrap {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.72);
      z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: _joaf-fadein .3s ease;
      overflow-y: auto;
    }
    @keyframes _joaf-fadein { from{opacity:0} to{opacity:1} }
    #joaf-ios-wrap .ii-box {
      background: #fff; border-radius: 24px;
      padding: 24px 18px 20px;
      width: 100%; max-width: 380px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,.4);
      max-height: 88vh; overflow-y: auto;
    }
    #joaf-ios-wrap .ii-close {
      position: absolute; top: 14px; right: 14px;
      width: 30px; height: 30px; border-radius: 50%;
      background: #f3f4f6; border: none; font-size: 15px;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #6b7280;
    }
    #joaf-ios-wrap .ii-logo { width: 56px; height: 56px; border-radius: 14px; margin-bottom: 10px; }
    #joaf-ios-wrap .ii-title { font-size: 18px; font-weight: 900; color: #1a1a2e; margin-bottom: 4px; }
    #joaf-ios-wrap .ii-domain { font-size: 13px; color: #90161f; font-weight: 800; text-decoration: none; display: block; margin-bottom: 14px; }
    #joaf-ios-wrap .ii-pills { margin-bottom: 16px; text-align: left; }
    #joaf-ios-wrap .ii-btn {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg,#90161f,#c0392b);
      color: #fff; border: none; border-radius: 50px;
      font-size: 14px; font-weight: 900; font-family: inherit;
      cursor: pointer;
    }
    </style>
    <div class="ii-box">
      <button class="ii-close" id="ii-close">✕</button>
      <div style="text-align:center">
        <img src="/logoc7c3.png" class="ii-logo">
        <div class="ii-title">📲 JOAF App Install করুন</div>
        <a href="https://www.julyforum.com" class="ii-domain">🌐 www.julyforum.com</a>
      </div>
      <div class="ii-pills">${pills}</div>
      <button class="ii-btn" id="ii-safari-btn">🧭 Safari এ খুলুন</button>
    </div>`;

  document.body.appendChild(wrap);

  // Update button label based on browser
  const safariBtn = document.getElementById('ii-safari-btn');
  if (safariBtn) safariBtn.textContent = _D.isIOSChrome ? '🧭 Safari এ খুলুন' : '📲 Install করুন';

  document.getElementById('ii-safari-btn').addEventListener('click', async () => {
    if (_D.isIOSChrome) {
      // iOS Chrome → open in Safari
      window.location.href = 'x-safari-https://www.julyforum.com';
    } else {
      // iOS Safari → share sheet → Add to Home Screen
      try { await navigator.share({ title: 'JOAF — জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম', url: 'https://www.julyforum.com' }); } catch(e) {}
    }
  });

  document.getElementById('ii-close').addEventListener('click', () => {
    wrap.remove();
    setTimeout(_joafShowIOSPrompt, 5000);
  });

  wrap.addEventListener('click', e => {
    if (e.target === wrap) {
      wrap.remove();
      setTimeout(_joafShowIOSPrompt, 5000);
    }
  });
}

// ══════════════════════════════════════════════════════════════
// 5. START — page load এ সব prompt চালু করো
// ══════════════════════════════════════════════════════════════
setTimeout(() => {
  if (_D.isIOS) {
    // All iOS browsers → iOS prompt (full screen)
    _joafShowIOSPrompt();
    return;
  }

  if (_D.isStandalone) {
    // PWA installed → push + location only
    if (!_S.pushGranted && !_S.pushDenied) _joafShowPushPrompt();
    // Location — always check independently
    setTimeout(_joafShowLocationPrompt, 500);
    return;
  }

  // Normal browser (Android/Desktop)
  if (!_S.pwaInstalled) {
    _joafShowInstallPrompt();
  }
  // Push prompt — 600ms পরে
  if (!_S.pushGranted && !_S.pushDenied) {
    setTimeout(_joafShowPushPrompt, 600);
  }
  // Location prompt — push granted কিন্তু location না, OR push already granted আগে
  // সবসময় check করো — push এর উপর depend না
  setTimeout(_joafShowLocationPrompt, 1200);
}, 1000);

// Fallback: beforeinstallprompt never fired
setTimeout(() => {
  if (_D.isIOS || _D.isStandalone || _S.pwaInstalled) return;
  if (localStorage.getItem('joaf-pwa-installed')) return;
  if (!window._deferredPWA) _joafShowInstallPrompt();
}, 1500);



// Auto cache-bust for dynamic JS files
(function() {
  const bust = Date.now();
  const files = ['/js/bn-search.js', '/js/data.js'];
  files.forEach(src => {
    // Check if already loaded with bust
    if (document.querySelector(`script[src^="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src + '?cb=' + bust;
    document.head.appendChild(s);
  });
})();
