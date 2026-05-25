
function seededRand(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
const JOAF_LOGO_IMG = new Image();
let _logoLoaded = false;
JOAF_LOGO_IMG.onload = () => { _logoLoaded = true; };
JOAF_LOGO_IMG.src = '/logoc7c3.png';


if(localStorage.getItem('joaf_admin_key')){document.documentElement.style.setProperty('--ls-display','none');}else{document.documentElement.style.setProperty('--ls-display','flex');}

(function(){if(document.getElementById('nm-district').options.length>1)return;const D=['ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','বরিশাল','সিলেট','রংপুর','ময়মনসিংহ','কুমিল্লা','নারায়ণগঞ্জ','গাজীপুর','টাঙ্গাইল','ফরিদপুর','যশোর','নোয়াখালী','বগুড়া','দিনাজপুর','পাবনা','নরসিংদী','মানিকগঞ্জ','মুন্সীগঞ্জ','শরীয়তপুর','মাদারীপুর','গোপালগঞ্জ','কিশোরগঞ্জ','নেত্রকোনা','জামালপুর','শেরপুর','ব্রাহ্মণবাড়িয়া','চাঁদপুর','ফেনী','লক্ষ্মীপুর','কক্সবাজার','বান্দরবান','রাঙ্গামাটি','খাগড়াছড়ি','হবিগঞ্জ','মৌলভীবাজার','সুনামগঞ্জ','নওগাঁ','চাঁপাইনবাবগঞ্জ','নাটোর','সিরাজগঞ্জ','জয়পুরহাট','সাতক্ষীরা','ঝিনাইদহ','মাগুরা','নড়াইল','বাগেরহাট','মেহেরপুর','চুয়াডাঙ্গা','কুষ্টিয়া','ঝালকাঠি','পটুয়াখালী','পিরোজপুর','ভোলা','বরগুনা','লালমনিরহাট','নীলফামারী','গাইবান্ধা','কুড়িগ্রাম','পঞ্চগড়','ঠাকুরগাঁও'].sort();const s=document.getElementById('nm-district');D.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;s.appendChild(o);});})();


import { initializeApp, getApps } from '/js/aw-firestore.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, serverTimestamp, getDoc, setDoc, onSnapshot } from '/js/aw-firestore.js';

const FB = { apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk', authDomain:'joaf-app-45753.firebaseapp.com', projectId:'joaf-app-45753', storageBucket:'joaf-app-45753.firebasestorage.app', messagingSenderId:'472362223214', appId:'1:472362223214:web:9186a4f90dc608bae4487f' };
const app = getApps().length ? getApps()[0] : initializeApp(FB);
const db  = getFirestore(app);

// ── Auth ────────────────────────────────────────────────
let ADMIN_KEY = '';
const ADMIN_USER = 'joaf_admin'; // Change this

window.doLogin = async function() {
  const user = document.getElementById('lusr').value.trim();
  const pass = document.getElementById('lpass').value.trim();
  if (!user || !pass) return setErr('Username ও Password দিন');
  const btn = document.getElementById('lbtn');
  btn.disabled = true; btn.textContent = '⏳ Checking...';

  try {
    const res = await fetch('/.netlify/functions/send-notification', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Admin-Key':pass},
      body: JSON.stringify({_verify:true})
    });
    if (res.status === 401) { setErr('❌ ভুল username বা password'); btn.disabled=false; btn.textContent='প্রবেশ করুন →'; return; }
    ADMIN_KEY = pass;
    localStorage.setItem('joaf_admin_key', pass);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initDashboard();
  } catch(e) {
    setErr('❌ Connection error'); btn.disabled=false; btn.textContent='প্রবেশ করুন →';
  }
};

window.doLogout = function() {
  ADMIN_KEY = '';
  localStorage.removeItem('joaf_admin_key');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
};


// ── Auto-login from localStorage ──
(async function autoLogin(){
  const saved = localStorage.getItem('joaf_admin_key');
  if(!saved) return;
  try {
    const res = await fetch('/.netlify/functions/send-notification',{
      method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':saved},
      body:JSON.stringify({_verify:true})
    });
    if(res.status !== 401){
      ADMIN_KEY = saved;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      const savedTab=localStorage.getItem('adminTab');
      if(savedTab&&savedTab!=='dashboard'){const ni=document.querySelector(`.ni[onclick*="'${savedTab}'"]`);goPage(savedTab,ni);}else{initDashboard();}
    } else {
      localStorage.removeItem('joaf_admin_key');
    }
  } catch(e){ /* network error, show login */ }
})();

function setErr(msg) { document.getElementById('lerr').textContent = msg; }

// ── Sidebar mobile toggle ────────────────────────────────
window.toggleSidebar = function() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebarOverlay');
  s.classList.toggle('open');
  o.classList.toggle('open');
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
};

// ── Navigation ──────────────────────────────────────────
window.addEventListener('message',function(e){if(e.data==='goAdmin')goPage('dashboard',document.querySelector('.ni:first-child'));});
window.goPage = function(id, el) {
  localStorage.setItem('adminTab', id);
  localStorage.setItem('adminTab', id);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-'+id);
  if (page) page.classList.add('active');
  if (el) el.classList.add('active');
  const titles = {dashboard:'📊 Dashboard',notification:'🔔 Notification',
    'alert-page':'🚨 সতর্কতা',blood:'🩸 রক্তদাতা',press:'📰 Press Release',
    leader:'🏛️ নেতা ট্র্যাকার',warrior:'✊ জুলাই যোদ্ধা',bajar:'🛒 বাজার দর',
    medicine:'💊 ওষুধের দাম',members:'👥 Members',polls:'🗳️ Polls',
    forum:'💬 Forum',analytics:'📈 Analytics',settings:'⚙️ Settings',fbpost:'📢 FB Auto Post',newscard:'🎨 News Card Generator'};
  document.getElementById('pageTitle').textContent = titles[id] || id;
  // Lazy load page data
  const loaders = {
    notification: loadNotifPage, 'alert-page': loadAlerts,
    blood: loadDonors, press: loadPress, leader: loadLeaders,
    warrior: loadWarriors, bajar: loadBajar, medicine: loadMedicines,
    members: loadMembers, polls: loadPolls, forum: loadForum, analytics: loadAnalytics
  };
  if (loaders[id]) loaders[id]();
  if(window.innerWidth <= 768) closeSidebar();
  // Stop analytics real-time listener when leaving that page
  if(id !== 'analytics' && typeof stopAnalyticsListener === 'function') stopAnalyticsListener();
};

// ── Dashboard init ──────────────────────────────────────
async function initDashboard() {
  let dsSparkInst = null;

  // ── Health indicators (array-driven) ──
  const HEALTH_ITEMS = [
    { label: 'Appwrite',        check: async () => { const s=await getDocs(collection(db,'push_subscriptions')); return {ok:true,val:'Connected'}; } },
    { label: 'Push SW',         check: async () => { try{const r=await fetch('/firebase-messaging-sw.js');return {ok:r.ok,val:r.ok?'Deployed':'404'};}catch{return{ok:false,val:'Error'};} } },
    { label: 'Notifications Fn',check: async () => { try{const r=await fetch('/.netlify/functions/send-notification',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':ADMIN_KEY},body:JSON.stringify({_verify:true})});return {ok:r.status!==500,val:r.status===401?'Auth OK':r.status===200?'OK':'Err '+r.status};}catch{return{ok:false,val:'Offline'};} } },
  ];
  const healthEl = document.getElementById('ds-health');
  if(healthEl){
    healthEl.innerHTML = HEALTH_ITEMS.map(i=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text2)">${i.label}</span><span class="badge badge-loading" id="dsh-${i.label.replace(/[^a-z]/gi,'')}" style="font-size:10px;padding:2px 8px;border-radius:50px;background:var(--bg3)">...</span></div>`).join('');
    HEALTH_ITEMS.forEach(async item => {
      const el = document.getElementById('dsh-'+item.label.replace(/[^a-z]/gi,''));
      try {
        const {ok, val} = await item.check();
        if(el) { el.textContent=val; el.style.background=ok?'rgba(52,211,153,.12)':'rgba(248,113,113,.12)'; el.style.color=ok?'var(--green)':'var(--red)'; }
      } catch(e) { if(el){el.textContent='Error';el.style.color='var(--red)';} }
    });
  }

  try {
    // Parallel load: subscribers + donors + alerts + notifications
    const [subSnap, donorSnap, alertSnap, histSnap] = await Promise.all([
      getDocs(collection(db,'push_subscriptions')),
      getDocs(collection(db,'donors')),
      getDocs(collection(db,'alerts')),
      getDocs(collection(db,'notification_history'))
    ]);

    const activeCount = subSnap.docs.filter(d=>d.data().active!==false).length;
    const donors = donorSnap.size, alerts = alertSnap.size, notifs = histSnap.size;

    // Set KPIs
    setEl('ds-sub', activeCount); setEl('b-notif', activeCount); setEl('n-sub', activeCount); setEl('an-subs', activeCount); setEl('an-kpi-subs', activeCount); anCachedSubs = activeCount;
    setEl('ds-donors', donors); setEl('ds-alerts', alerts); setEl('ds-notifs', notifs);
    setEl('b-blood', donors); setEl('n-total', notifs); setEl('an-notifs', notifs); setEl('an-kpi-notif', notifs); anCachedNotifs = notifs;

    const subSubEl = document.getElementById('ds-sub-sub');
    if(subSubEl){ subSubEl.textContent = `${subSnap.size-activeCount} inactive`; }

    // Today notifications
    const today = new Date(); today.setHours(0,0,0,0);
    let todayNotifs = 0;
    histSnap.forEach(d=>{const t=d.data().sentAt?.toDate?.();if(t&&t>=today)todayNotifs++;});
    setEl('n-today', todayNotifs);
    const todaySubEl = document.getElementById('ds-notif-today');
    if(todaySubEl) todaySubEl.textContent = `আজ ${todayNotifs}টি পাঠানো`;

    // Recent history
    const hDocs = histSnap.docs.map(d=>({...d.data(),id:d.id}))
      .sort((a,b)=>((b.sentAt?.seconds||0)-(a.sentAt?.seconds||0))).slice(0,5);
    renderHistory('dash-history', hDocs);

    // Blood preview
    const bDocs = donorSnap.docs.slice(0,5).map(d=>({...d.data(),id:d.id}));
    renderBloodPreview(bDocs);
  } catch(e) { console.log('dashboard error', e); }

  // Pageview sparkline (today hourly)
  try {
    const pvSnap = await getDocs(collection(db,'pageviews'));
    const now = new Date(); const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const yesterdayStart = new Date(todayStart.getTime()-86400000);
    const pvDocs = pvSnap.docs.map(d=>({...d.data(), tsMs: d.data().ts?.toMillis?.()||0}));
    const todayPv = pvDocs.filter(d=>d.tsMs>=todayStart.getTime()).length;
    const yestPv  = pvDocs.filter(d=>d.tsMs>=yesterdayStart.getTime()&&d.tsMs<todayStart.getTime()).length;
    setEl('ds-today-pv', todayPv);

    const pvChangeEl = document.getElementById('ds-pv-change');
    if(pvChangeEl){ const diff=todayPv-yestPv; pvChangeEl.textContent=(diff>=0?'▲ +':'▼ ')+diff+' গতকাল'; pvChangeEl.style.color=diff>=0?'var(--green)':'var(--red)'; }

    // Build hourly sparkline for today
    const hours=24, labels=[], data=[];
    for(let i=0;i<hours;i++){
      const hS=new Date(todayStart.getTime()+i*3600000), hE=new Date(hS.getTime()+3600000);
      labels.push(i+':00');
      data.push(pvDocs.filter(d=>d.tsMs>=hS.getTime()&&d.tsMs<hE.getTime()).length);
    }
    const sparkCtx = document.getElementById('ds-spark');
    if(sparkCtx && typeof Chart!=='undefined'){
      const gridC='rgba(255,255,255,0.04)', textC='#7878a0';
      if(dsSparkInst){dsSparkInst.data.labels=labels;dsSparkInst.data.datasets[0].data=data;dsSparkInst.update('none');}
      else dsSparkInst=new Chart(sparkCtx,{type:'bar',data:{labels,datasets:[{label:'Visits',data,backgroundColor:'rgba(96,165,250,0.25)',hoverBackgroundColor:'rgba(96,165,250,0.6)',borderRadius:3,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f1019',titleColor:'#eeeef5',bodyColor:'#7878a0',callbacks:{title:l=>'Hour '+l[0].label,label:l=>`${l.raw} visit`}}},scales:{x:{display:false,grid:{display:false}},y:{display:false,beginAtZero:true,grid:{display:false}}}}});
    }
    const labelEl = document.getElementById('ds-pv-label');
    if(labelEl) labelEl.textContent = `আজ মোট ${todayPv}টি visit`;
  } catch(e) { console.log('sparkline error',e); }
}
// ── Notification ────────────────────────────────────────
const NOTIF_DEFAULTS = {
  bajar:{title:'🛒 আজকের বাজার দর',body:'চাল, ডাল, সবজির দাম আপডেট হয়েছে।',url:'/bajar.html'},
  poll:{title:'🗳️ আজকের জনমত',body:'৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন!',url:'/joaf-polls.html'},
  streak:{title:'🔥 Streak মিস করবেন না!',body:'আজকের ভোট এখনো বাকি। এখনই দিন।',url:'/joaf-polls.html'},
  weather:{title:'🌦️ আবহাওয়া সতর্কতা',body:'আজ বিশেষ আবহাওয়া পূর্বাভাস।',url:'/weather.html'},
  blood:{title:'🩸 জরুরি রক্ত দরকার!',body:'আপনার এলাকায় রক্তের অনুরোধ।',url:'/rokto.html'},
  alert:{title:'🚨 জরুরি সতর্কতা!',body:'একটি জরুরি পরিস্থিতি জানানো হয়েছে।',url:'/alert.html'},
  live:{title:'📡 JOAF Live শুরু!',body:'সরাসরি সম্প্রচার চলছে।',url:'/live.html'},
  warrior:{title:'🏆 নতুন জুলাই যোদ্ধা!',body:'একজন নতুন বীর যোগ দিয়েছেন।',url:'/july-warriors.html'},
  corruption:{title:'🚫 দুর্নীতির রিপোর্ট',body:'নতুন অভিযোগ দাখিল হয়েছে।',url:'/leader-tracker.html'},
  leader:{title:'🏛️ নেতা ট্র্যাকার আপডেট',body:'সাপ্তাহিক আপডেট এসেছে।',url:'/leader-tracker.html'},
  medicine:{title:'💊 ওষুধের দাম আপডেট',body:'এই সপ্তাহের দামের তালিকা।',url:'/medicine.html'},
  agriculture:{title:'🌾 কৃষি আপডেট',body:'মৌসুমী পরামর্শ আপডেট হয়েছে।',url:'/agriculture.html'},
  jobs:{title:'💼 নতুন চাকরির সুযোগ',body:'নতুন চাকরি এসেছে।',url:'/jobs.html'},
  news:{title:'📢 JOAF বিবৃতি',body:'গুরুত্বপূর্ণ বিবৃতি প্রকাশিত।',url:'/news.html'},
  breaking:{title:'🚨 ব্রেকিং নিউজ',body:'এইমাত্র গুরুত্বপূর্ণ খবর।',url:'/news.html'},
  welcome:{title:'🔥 JOAF-এ স্বাগতম!',body:'বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চে যোগ দিন।',url:'/'},
};
let currentNotifType = '';

window.openNotifModal = function(type) {
  currentNotifType = type;
  const d = NOTIF_DEFAULTS[type] || {title:'',body:'',url:'/'};
  document.getElementById('nm-label').textContent = d.title;
  document.getElementById('nm-title').value = d.title;
  document.getElementById('nm-body').value = d.body;
  document.getElementById('nm-url').value = d.url;
  // district filter row — blood/alert/weather type এ দেখাও
  const distRow = document.getElementById('nm-district-row');
  if (distRow) distRow.style.display = ['blood','alert','weather'].includes(type) ? 'block' : 'none';
  openModal('notifModal');
};

window.resetNotifModal = function() {
  const d = NOTIF_DEFAULTS[currentNotifType];
  if (!d) return;
  document.getElementById('nm-title').value = d.title;
  document.getElementById('nm-body').value = d.body;
  document.getElementById('nm-url').value = d.url;
};

window.sendFromModal = async function() {
  const title    = document.getElementById('nm-title').value.trim();
  const body     = document.getElementById('nm-body').value.trim();
  const url      = document.getElementById('nm-url').value.trim();
  const district = document.getElementById('nm-district')?.value || '';
  if (!title || !body) return toast('Title ও Message দিন','error');
  closeModal('notifModal');
  const payload = {type:currentNotifType, title, body, url:url||'/'};
  if (district) payload.district = district;
  await callSendNotif(payload);
};

window.sendCustomNotif = async function() {
  const title = document.getElementById('cn-title').value.trim();
  const body  = document.getElementById('cn-body').value.trim();
  const url   = document.getElementById('cn-url').value.trim();
  if (!title || !body) return toast('Title ও Message দিন','error');
  await callSendNotif({title, body, url:url||'/'});
  document.getElementById('cn-title').value='';
  document.getElementById('cn-body').value='';
  document.getElementById('cn-url').value='';
};

async function callSendNotif(payload) {
  const btn = document.getElementById('cn-btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ পাঠানো হচ্ছে...'; }
  try {
    const res = await fetch('/.netlify/functions/send-notification', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Admin-Key':ADMIN_KEY},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { toast('❌ Error: '+(data.error||'Unknown'),'error'); }
    else { toast(`✅ ${data.sent} জনের কাছে পাঠানো হয়েছে!`,'success'); loadNotifPage(); }
  } catch(e) { toast('❌ Network error','error'); }
  finally { if(btn){btn.disabled=false;btn.textContent='📤 সবার কাছে পাঠান';} }
}

async function loadNotifPage() {
  try {
    const [histSnap, subSnap] = await Promise.all([
      getDocs(collection(db,'notification_history')),
      getDocs(collection(db,'push_subscriptions'))
    ]);
    const docs = histSnap.docs.map(d=>({...d.data(),id:d.id}))
      .sort((a,b)=>((b.sentAt?.seconds||0)-(a.sentAt?.seconds||0)));
    setEl('n-total', histSnap.size);
    const activeCount = subSnap.docs.filter(d=>d.data().active!==false).length;
    setEl('n-sub', activeCount);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayCount = docs.filter(d=>{ const t=d.sentAt?.toDate?.(); return t&&t>=today; }).length;
    setEl('n-today', todayCount);
    renderHistory('notif-history', docs.slice(0,10));
  } catch(e) { console.log(e); }
}

function renderHistory(elId, docs) {
  const el = document.getElementById(elId);
  if (!docs.length) { el.innerHTML='<div class="empty">কোনো notification নেই</div>'; return; }
  const colors = {bajar:'#fbbf24',weather:'#60a5fa',streak:'#f05252',blood:'#f05252',alert:'#f05252',live:'#a78bfa',default:'#34d399'};
  el.innerHTML = docs.map(d => {
    const color = colors[d.type]||colors.default;
    const time = d.sentAt?.toDate?.()?.toLocaleString('bn-BD') || (d.sentAt?.seconds ? new Date(d.sentAt.seconds*1000).toLocaleString('bn-BD') : '—');
    return `<div class="hist-item">
      <div class="hist-dot" style="background:${color}"></div>
      <div class="hist-info"><div class="hist-title">${d.title||'—'}</div><div class="hist-time">${time}</div></div>
      <div class="hist-sent">✅ ${d.sent||0}</div>
    </div>`;
  }).join('');
}

// ── Alerts ──────────────────────────────────────────────
async function loadAlerts() {
  const el = document.getElementById('alert-list');
  el.innerHTML = '<div class="loading">লোড হচ্ছে...</div>';
  try {
    const snap = await getDocs(collection(db,'alerts'));
    if (snap.empty) { el.innerHTML='<div class="empty">কোনো সতর্কতা নেই</div>'; ['alert-sel-all','alert-bulk-del'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';}); return; }
    ['alert-sel-all','alert-bulk-del'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
    document.getElementById('alert-bulk-del').style.display='none';
    el.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const lvlClass = data.level==='danger'?'badge-red':data.level==='warning'?'badge-amber':'badge-blue';
      const time = data.createdAt?.toDate?.()?.toLocaleString('bn-BD')||'—';
      return `<div class="act-item" id="alert-row-${d.id}" style="gap:8px;">
        <input type="checkbox" class="alert-chk" data-id="${d.id}" onchange="onAlertCheck()" style="cursor:pointer;accent-color:var(--accent);flex-shrink:0;">
        <span class="act-icon">🚨</span>
        <div class="act-text"><b>${data.title||'—'}</b><br><span style="color:var(--text2);font-size:11px">${data.area||''} ${data.area&&data.body?'—':''} ${(data.body||'').substring(0,60)}${(data.body||'').length>60?'...':''}</span></div>
        <span class="badge ${lvlClass}">${data.level||'info'}</span>
        <button class="btn btn-ghost btn-sm" style="color:var(--blue);border-color:var(--blue-border);background:var(--blue-bg);" onclick='showAlertInfo(${JSON.stringify({id:d.id,...data,createdAt:time})})'>ℹ️ Info</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAlert('${d.id}')">🗑️</button>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML='<div class="empty text-red">Error loading</div>'; }
}

window.showAlertInfo = function(data) {
  const lvlLabel = data.level==='danger'?'🔴 বিপদ':data.level==='warning'?'🟡 সতর্কতা':'🔵 তথ্য';
  const typeEmoji = data.type==='flood'?'🌊':data.type==='fire'?'🔥':data.type==='health'?'🏥':'🚨';
  document.getElementById('alert-info-body').innerHTML = `
    <div style="display:grid;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg);border-radius:10px;border:1px solid var(--border);">
        <span style="font-size:32px">${typeEmoji}</span>
        <div><div style="font-size:15px;font-weight:900;">${data.title||'—'}</div><div style="font-size:11px;color:var(--text2);margin-top:2px;">${lvlLabel}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="padding:10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);"><div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">ধরন</div><div style="font-size:12px;font-weight:700;">${data.type||'—'}</div></div>
        <div style="padding:10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);"><div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">এলাকা</div><div style="font-size:12px;font-weight:700;">${data.area||'সকল এলাকা'}</div></div>
        <div style="padding:10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);"><div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">স্ট্যাটাস</div><div style="font-size:12px;font-weight:700;">${data.active?'✅ সক্রিয়':'❌ নিষ্ক্রিয়'}</div></div>
        <div style="padding:10px;background:var(--bg);border-radius:8px;border:1px solid var(--border);"><div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">তারিখ</div><div style="font-size:11px;">${data.createdAt||'—'}</div></div>
      </div>
      <div style="padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);"><div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">বিবরণ</div><div style="font-size:12px;line-height:1.6;">${data.body||'—'}</div></div>
    </div>`;
  document.getElementById('alertInfoModal').classList.add('open');
};

window.onAlertCheck = function() {
  const checked = document.querySelectorAll('.alert-chk:checked').length;
  const bulkBtn = document.getElementById('alert-bulk-del');
  if (bulkBtn) bulkBtn.style.display = checked > 0 ? '' : 'none';
};

window.toggleSelectAllAlerts = function() {
  const chks = document.querySelectorAll('.alert-chk');
  const allChecked = [...chks].every(c=>c.checked);
  chks.forEach(c=>c.checked=!allChecked);
  onAlertCheck();
};

window.bulkDeleteAlerts = async function() {
  const ids = [...document.querySelectorAll('.alert-chk:checked')].map(c=>c.dataset.id);
  if (!ids.length) return;
  if (!confirm(`${ids.length}টি সতর্কতা delete করবেন?`)) return;
  try {
    await Promise.all(ids.map(id=>deleteDoc(doc(db,'alerts',id))));
    toast(`✅ ${ids.length}টি delete হয়েছে`,'success');
    loadAlerts();
  } catch(e) { toast('❌ Error: '+e.message,'error'); }
};

window.postAlert = async function(withNotif=false) {
  const title = document.getElementById('al-title').value.trim();
  const body  = document.getElementById('al-body').value.trim();
  const type  = document.getElementById('al-type').value;
  const area  = document.getElementById('al-area').value.trim();
  const level = document.getElementById('al-level').value;
  if (!title || !body) return toast('শিরোনাম ও বিবরণ দিন','error');
  try {
    await addDoc(collection(db,'alerts'), {title,body,type,area,level,active:true,createdAt:serverTimestamp()});
    toast('✅ সতর্কতা Post হয়েছে!','success');
    document.getElementById('al-title').value='';
    document.getElementById('al-body').value='';
    document.getElementById('al-area').value='';
    if (withNotif) await callSendNotif({type:'alert',title:'🚨 '+title,body,url:'/alert.html'});
    loadAlerts();
  } catch(e) { toast('❌ Error: '+e.message,'error'); }
};

window.deleteAlert = async function(id) {
  if (!confirm('এই সতর্কতা delete করবেন?')) return;
  await deleteDoc(doc(db,'alerts',id));
  toast('Deleted','info'); loadAlerts();
};

// ── Blood Donors ─────────────────────────────────────────
let allDonors = [];
async function loadDonors() {
  const tbody = document.getElementById('donor-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'donors'));
    allDonors = snap.docs.map(d=>({...d.data(),id:d.id}));
    // Stats
    setEl('bl-total', allDonors.length);
    setEl('bl-active', allDonors.filter(d=>d.available!==false).length);
    setEl('bl-apos', allDonors.filter(d=>d.blood==='A+'||d.bloodGroup==='A+').length);
    setEl('bl-opos', allDonors.filter(d=>d.blood==='O+'||d.bloodGroup==='O+').length);
    setEl('b-blood', allDonors.length);
    renderDonors(allDonors);
  } catch(e) { tbody.innerHTML='<tr><td colspan="7" class="empty text-red">Error</td></tr>'; }
}

function renderDonors(donors) {
  const tbody = document.getElementById('donor-tbody');
  if (!donors.length) { tbody.innerHTML='<tr><td colspan="7" class="empty">কোনো দাতা নেই</td></tr>'; return; }
  tbody.innerHTML = donors.slice(0,50).map(d => `
    <tr>
      <td><input type="checkbox" class="donor-chk" data-id="${d.id}" onchange="onDonorCheck()" style="cursor:pointer;accent-color:var(--accent)"></td>
      <td><div style="font-weight:700;font-size:12px">${d.name||d.donorName||'—'}</div></td>
      <td><span class="badge badge-red">${d.blood||d.bloodGroup||'—'}</span></td>
      <td>${d.district||d.area||'—'}</td>
      <td style="font-family:monospace;font-size:11px">${d.phone||d.contact||'—'}</td>
      <td style="font-size:10px;color:var(--text2)">${d.createdAt?.toDate?.()?.toLocaleDateString('bn-BD')||'—'}</td>
      <td><div class="td-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteDonor('${d.id}')">🗑️</button>
      </div></td>
    </tr>`).join('');
}

window.toggleDonorCheckAll = function(cb) {
  document.querySelectorAll('.donor-chk').forEach(c=>c.checked=cb.checked);
  onDonorCheck();
};

window.onDonorCheck = function() {
  const checked = document.querySelectorAll('.donor-chk:checked').length;
  const bulkBtn = document.getElementById('donor-bulk-del');
  if (bulkBtn) bulkBtn.style.display = checked > 0 ? '' : 'none';
  const allChk = document.getElementById('donor-check-all');
  if (allChk) { const all = document.querySelectorAll('.donor-chk').length; allChk.indeterminate = checked>0&&checked<all; allChk.checked = checked===all&&all>0; }
};

window.bulkDeleteDonors = async function() {
  const ids = [...document.querySelectorAll('.donor-chk:checked')].map(c=>c.dataset.id);
  if (!ids.length) return;
  if (!confirm(`${ids.length}জন donor delete করবেন?`)) return;
  try {
    await Promise.all(ids.map(id=>deleteDoc(doc(db,'donors',id))));
    toast(`✅ ${ids.length}জন delete হয়েছে`,'success');
    loadDonors();
  } catch(e) { toast('❌ Error: '+e.message,'error'); }
};

window.filterDonors = function() {
  const q = document.getElementById('bl-search').value.toLowerCase();
  const filtered = allDonors.filter(d => JSON.stringify(d).toLowerCase().includes(q));
  renderDonors(filtered);
};

window.deleteDonor = async function(id) {
  if (!confirm('এই donor কে delete করবেন?')) return;
  await deleteDoc(doc(db,'donors',id));
  toast('Deleted','info'); loadDonors();
};

function renderBloodPreview(donors) {
  const el = document.getElementById('dash-blood');
  if (!donors.length) { el.innerHTML='<div class="empty">কোনো রক্তদাতা নেই</div>'; return; }
  el.innerHTML = donors.map(d => `
    <div class="donor-row">
      <div class="donor-ava">🩸</div>
      <div class="donor-info">
        <div class="donor-name">${d.name||d.donorName||'—'}</div>
        <div class="donor-meta">${d.blood||d.bloodGroup||'?'} · ${d.district||d.area||'—'}</div>
      </div>
      <span class="badge badge-red">${d.blood||d.bloodGroup||'—'}</span>
    </div>`).join('');
}

// ── Press Releases ───────────────────────────────────────
async function loadPress() {
  const el = document.getElementById('press-list');
  el.innerHTML='<div class="loading">লোড হচ্ছে...</div>';
  try {
    const snap = await getDocs(collection(db,'press_releases'));
    if (snap.empty) { el.innerHTML='<div class="empty">কোনো press release নেই</div>'; return; }
    el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;">
      <input type="checkbox" id="press-chk-all" onchange="togglePressAll(this)" style="cursor:pointer;accent-color:var(--accent)">
      <span style="font-size:11px;color:var(--text2)">সব Select</span>
      <button class="btn btn-ghost btn-sm" id="press-bulk-del" style="display:none;background:var(--red-bg);color:var(--red);border-color:var(--red-border);margin-left:8px;" onclick="bulkDeletePress()">🗑️ Selected Delete</button>
    </div>` + snap.docs.map(d => {
      const data = d.data();
      return `<div class="act-item" style="gap:8px;">
        <input type="checkbox" class="press-chk" data-id="${d.id}" onchange="onPressCheck()" style="cursor:pointer;accent-color:var(--accent);flex-shrink:0;">
        <span class="act-icon">📰</span>
        <div class="act-text"><b>${data.title||'—'}</b><br><span style="color:var(--text2);font-size:10px">${data.date||'—'} ${data.summary?'· '+(data.summary.substring(0,50))+'...':''}</span></div>
        <button class="btn btn-danger btn-sm" onclick="deletePress('${d.id}')">🗑️</button>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML='<div class="empty text-red">Error</div>'; }
}

window.togglePressAll = function(cb) { document.querySelectorAll('.press-chk').forEach(c=>c.checked=cb.checked); onPressCheck(); };
window.onPressCheck = function() { const n=document.querySelectorAll('.press-chk:checked').length; const b=document.getElementById('press-bulk-del'); if(b) b.style.display=n>0?'':'none'; };
window.bulkDeletePress = async function() {
  const ids=[...document.querySelectorAll('.press-chk:checked')].map(c=>c.dataset.id);
  if(!ids.length) return;
  if(!confirm(`${ids.length}টি press release delete করবেন?`)) return;
  await Promise.all(ids.map(id=>deleteDoc(doc(db,'press_releases',id))));
  toast(`✅ ${ids.length}টি delete হয়েছে`,'success'); loadPress();
};

window.addPressRelease = async function(withNotif=false) {
  const title   = document.getElementById('pr-title').value.trim();
  const summary = document.getElementById('pr-summary').value.trim();
  const content = document.getElementById('pr-content').value.trim();
  const date    = document.getElementById('pr-date').value || new Date().toISOString().slice(0,10);
  const img     = document.getElementById('pr-img').value.trim();
  if (!title || !summary) return toast('শিরোনাম ও সারসংক্ষেপ দিন','error');
  try {
    await addDoc(collection(db,'press_releases'), {title,summary,content,date,img,createdAt:serverTimestamp()});
    toast('✅ Press Release publish হয়েছে!','success');
    ['pr-title','pr-summary','pr-content','pr-img'].forEach(id => document.getElementById(id).value='');
    if (withNotif) await callSendNotif({type:'news',title:'📢 '+title,body:summary,url:'/news.html'});
    loadPress();
  } catch(e) { toast('❌ '+e.message,'error'); }
};

window.deletePress = async function(id) {
  if (!confirm('Delete করবেন?')) return;
  await deleteDoc(doc(db,'press_releases',id));
  toast('Deleted','info'); loadPress();
};

// ── Leaders ──────────────────────────────────────────────
async function loadLeaders() {
  const tbody = document.getElementById('leader-tbody');
  tbody.innerHTML='<tr><td colspan="8" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'leaders'));
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="8" class="empty">Firestore এ কোনো data নেই — migrate করুন</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      return `<tr>
        <td><b>${data.name||'—'}</b></td>
        <td>${data.party||'—'}</td>
        <td style="font-size:11px">${data.role||'—'}</td>
        <td><span style="color:${data.approval>=60?'var(--green)':data.approval>=30?'var(--amber)':'var(--red)'}">${data.approval||0}%</span></td>
        <td>${(data.promises||[]).length} টি</td>
        <td><input type="checkbox" class="leader-chk" data-id="${d.id}" onchange="onLeaderCheck()" style="cursor:pointer;accent-color:var(--accent)"></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteLeader('${d.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="8" class="empty text-red">Error</td></tr>'; }
}

window.onLeaderCheck = function() { const n=document.querySelectorAll('.leader-chk:checked').length; const b=document.getElementById('leader-bulk-del'); if(b) b.style.display=n>0?'':'none'; };
window.bulkDeleteLeaders = async function() {
  const ids=[...document.querySelectorAll('.leader-chk:checked')].map(c=>c.dataset.id);
  if(!ids.length) return;
  if(!confirm(ids.length+'জন নেতা delete করবেন?')) return;
  await Promise.all(ids.map(id=>deleteDoc(doc(db,'leaders',id))));
  toast('✅ '+ids.length+'জন delete হয়েছে','success'); loadLeaders();
};

window.saveLeader = async function() {
  const name     = document.getElementById('ld-name').value.trim();
  const party    = document.getElementById('ld-party').value.trim();
  const role     = document.getElementById('ld-role').value.trim();
  const approval = parseInt(document.getElementById('ld-approval').value)||0;
  const cat      = document.getElementById('ld-cat').value;
  const pText    = document.getElementById('ld-promises').value;
  const promises = pText.split('\n').filter(p=>p.trim()).map(p=>({text:p.trim(),status:'pending'}));
  if (!name) return toast('নাম দিন','error');
  await addDoc(collection(db,'leaders'), {name,party,role,approval,cat,promises,createdAt:serverTimestamp()});
  toast('✅ নেতা যোগ হয়েছে!','success');
  closeModal('leaderModal');
  loadLeaders();
};

window.deleteLeader = async function(id) {
  if (!confirm('Delete করবেন?')) return;
  await deleteDoc(doc(db,'leaders',id));
  toast('Deleted','info'); loadLeaders();
};

window.runDiscoverLeaders = async function() {
  const btn = document.getElementById('discover-btn');
  const status = document.getElementById('discover-status');
  btn.disabled = true;
  btn.textContent = '⏳ চলছে...';
  status.style.color = 'var(--amber)';
  status.textContent = 'RSS পড়ছে...';
  try {
    const res = await fetch('/.netlify/functions/discover-leaders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
      body: JSON.stringify({}),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error('Function error: ' + text.substring(0, 200));
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Unknown error');
    const msg = `✅ ${data.added || 0} নতুন, ${data.updated || 0} আপডেট`;
    toast(msg + (data.summary ? ' — ' + data.summary : ''), 'success');
    status.textContent = msg;
    status.style.color = 'var(--green)';
  } catch(e) {
    toast('❌ Discover failed: ' + e.message, 'error');
    status.textContent = '❌ ' + e.message.substring(0, 80);
    status.style.color = 'var(--red)';
  }
  btn.disabled = false;
  btn.textContent = '🔍 Discover চালাও';
};

window.runGenerateTimeline = async function() {
  const btn = document.getElementById('timeline-btn');
  const status = document.getElementById('timeline-status');
  btn.disabled = true;
  btn.textContent = '⏳ চলছে...';
  status.style.color = 'var(--amber)';
  status.textContent = 'News পড়ছে...';
  try {
    const res = await fetch('/.netlify/functions/generate-timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
      body: JSON.stringify({ force: true }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error('Function error: ' + text.substring(0, 200));
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.reason || 'Unknown error');
    const msg = data.skipped
      ? `⏭️ Skip — আজকে আগেই ${data.reason}`
      : `✅ ${data.events || 0}টি timeline event Appwrite-এ save হয়েছে`;
    toast(msg, 'success');
    status.textContent = msg;
    status.style.color = 'var(--green)';
  } catch(e) {
    toast('❌ Timeline failed: ' + e.message, 'error');
    status.textContent = '❌ ' + e.message.substring(0, 80);
    status.style.color = 'var(--red)';
  }
  btn.disabled = false;
  btn.textContent = '📅 Timeline বানাও';
};

window.runLeaderAiUpdate = async function() {
  const btn = document.getElementById('leader-ai-btn');
  const status = document.getElementById('leader-ai-status');
  btn.disabled = true;
  status.style.color = 'var(--amber)';

  let totalUpdated = 0, batchStart = 0;
  try {
    while (true) {
      btn.textContent = `⏳ ${batchStart+1}-${batchStart+10} analyze করছে...`;
      status.textContent = `${totalUpdated} জন updated, চলছে...`;

      const res = await fetch('/.netlify/functions/update-leaders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        body: JSON.stringify({ batchStart }),
      });

      // Check if response is JSON (not HTML error page)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Function error — Netlify env variables সেট আছে কিনা চেক করুন। Details: ' + text.substring(0, 200));
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');

      totalUpdated += data.updated || 0;

      if (!data.hasMore) break;
      batchStart = data.nextBatch;

      // Small pause between batches
      await new Promise(r => setTimeout(r, 1000));
    }

    toast(`✅ ${totalUpdated} জন নেতার data AI দিয়ে update হয়েছে!`, 'success');
    status.textContent = `✅ ${totalUpdated} জন updated`;
    status.style.color = 'var(--green)';
    loadLeaders();
  } catch(e) {
    toast('❌ AI Update failed: ' + e.message, 'error');
    status.textContent = '❌ ' + e.message.substring(0, 80);
    status.style.color = 'var(--red)';
  }
  btn.disabled = false;
  btn.textContent = '🤖 AI দিয়ে Update করুন';
};

window.migrateLeaders = async function() {
  if (!confirm('Firestore-এ সব নেতার latest data migrate করবেন? পুরনো data replace হবে না, নতুন add হবে।')) return;
  const leaders = [
    {id:'yunus',name:'ড. মুহাম্মদ ইউনূস',party:'অন্তর্বর্তীকালীন সরকার',role:'প্রধান উপদেষ্টা',icon:'👴',cat:'সরকার',approval:68,viral:true,
      promises:[{text:'নির্বাচন কমিশন সংস্কার',status:'done'},{text:'বিচার বিভাগ সংস্কার',status:'progress'},{text:'দুর্নীতি দমন কমিশন শক্তিশালীকরণ',status:'progress'},{text:'দ্রব্যমূল্য নিয়ন্ত্রণ',status:'pending'},{text:'সংবিধান সংস্কার কমিশন গঠন',status:'done'},{text:'নতুন নির্বাচনী রোডম্যাপ',status:'progress'}],
      statements:[{text:'আমরা একটি বৈষম্যহীন বাংলাদেশ গড়তে চাই।',date:'মার্চ ২০২৬'},{text:'নির্বাচন সংস্কার ছাড়া কোনো নির্বাচন নয়।',date:'ফেব্রুয়ারি ২০২৬'}],
      controversies:[{text:'রামপাল বিদ্যুৎকেন্দ্র চুক্তি নবায়ন নিয়ে সমালোচনা।',date:'জানুয়ারি ২০২৬'}],
      virals:[{text:'জুলাই গণঅভ্যুত্থানের পর নোবেলজয়ী হিসেবে সরকার প্রধান হওয়া আন্তর্জাতিক মনোযোগ আকর্ষণ করে।',icon:'🌍',date:'আগস্ট ২০২৪'}]},
    {id:'nahid',name:'নাহিদ ইসলাম',party:'জাতীয় নাগরিক পার্টি (NCP)',role:'আহ্বায়ক',icon:'🧑',cat:'যুব রাজনীতি',approval:71,viral:true,
      promises:[{text:'জুলাই গণঅভ্যুত্থানের বিচার নিশ্চিত',status:'progress'},{text:'ছাত্র-জনতার অধিকার রক্ষা',status:'done'},{text:'দুর্নীতিমুক্ত রাষ্ট্র গঠন',status:'pending'},{text:'নতুন রাজনৈতিক দল গঠন',status:'done'},{text:'তরুণদের রাজনীতিতে অন্তর্ভুক্তি',status:'progress'}],
      statements:[{text:'জুলাই বিপ্লবের চেতনা রক্ষা করা আমাদের দায়িত্ব।',date:'মার্চ ২০২৬'}],
      controversies:[],
      virals:[{text:'কোটা সংস্কার আন্দোলনের মুখপাত্র হিসেবে জাতীয় পরিচিতি লাভ।',icon:'✊',date:'জুলাই ২০২৪'},{text:'NCP গঠনের ঘোষণায় তরুণ প্রজন্মের ব্যাপক সাড়া।',icon:'🔥',date:'ফেব্রুয়ারি ২০২৬'}]},
    {id:'fakhrul',name:'মির্জা ফখরুল ইসলাম আলমগীর',party:'বিএনপি',role:'মহাসচিব',icon:'👤',cat:'বিরোধী দল',approval:42,
      promises:[{text:'নির্বাচনকালীন তত্ত্বাবধায়ক সরকার',status:'progress'},{text:'রাজবন্দী মুক্তি',status:'done'},{text:'গণতন্ত্র পুনরুদ্ধার',status:'progress'},{text:'বিএনপি চেয়ারপারসনের মুক্তি',status:'done'}],
      statements:[{text:'জনগণের ভোটের অধিকার প্রতিষ্ঠাই আমাদের একমাত্র লক্ষ্য।',date:'মার্চ ২০২৬'}],
      controversies:[{text:'দলীয় কোন্দল ও নেতৃত্বের সংকট নিয়ে প্রশ্ন।',date:'ফেব্রুয়ারি ২০২৬'}],
      virals:[{text:'খালেদা জিয়ার মুক্তির পর দলের পুনর্গঠনে নেতৃত্ব দেওয়া।',icon:'🎯',date:'২০২৪'}]},
    {id:'shafiqur',name:'শফিকুর রহমান',party:'জামায়াতে ইসলামী',role:'আমির',icon:'🧔',cat:'বিরোধী দল',approval:35,
      promises:[{text:'ইসলামী মূল্যবোধভিত্তিক রাষ্ট্র',status:'pending'},{text:'দুর্নীতিমুক্ত প্রশাসন',status:'pending'},{text:'নির্বাচনে অংশগ্রহণ নিশ্চিত',status:'progress'}],
      statements:[{text:'আমরা গণতান্ত্রিক পথেই এগিয়ে যাব।',date:'মার্চ ২০২৬'}],
      controversies:[{text:'১৯৭১ সালের ভূমিকা নিয়ে ঐতিহাসিক বিতর্ক অব্যাহত।',date:'চলমান'}],
      virals:[]},
    {id:'asif',name:'আসিফ মাহমুদ',party:'জাতীয় নাগরিক পার্টি (NCP)',role:'যুগ্ম আহ্বায়ক',icon:'👦',cat:'যুব রাজনীতি',approval:65,viral:true,
      promises:[{text:'শিক্ষা সংস্কার আন্দোলন',status:'progress'},{text:'তরুণ উদ্যোক্তাদের সহায়তা',status:'pending'},{text:'ছাত্র রাজনীতির সংস্কার',status:'progress'}],
      statements:[{text:'তরুণরাই পরিবর্তনের মূল শক্তি।',date:'মার্চ ২০২৬'}],
      controversies:[],
      virals:[{text:'জুলাই আন্দোলনে অগ্রণী ভূমিকায় তরুণ প্রজন্মের আইকন।',icon:'⚡',date:'জুলাই ২০২৪'}]},
    {id:'ali_riaz',name:'ড. আলী রীয়াজ',party:'সংবিধান সংস্কার কমিশন',role:'প্রধান',icon:'📚',cat:'সুশীল সমাজ',approval:60,
      promises:[{text:'সংবিধান সংস্কার প্রতিবেদন প্রকাশ',status:'done'},{text:'নির্বাচন ব্যবস্থার সুপারিশ',status:'done'},{text:'মৌলিক অধিকার সংস্কার',status:'progress'}],
      statements:[{text:'সংবিধান সংস্কার ছাড়া টেকসই গণতন্ত্র সম্ভব নয়।',date:'জানুয়ারি ২০২৬'}],
      controversies:[],
      virals:[{text:'সংবিধান সংস্কার প্রতিবেদন প্রকাশে ব্যাপক আলোচনা।',icon:'📋',date:'জানুয়ারি ২০২৬'}]},
  ];
  try {
    const { setDoc, doc } = await import('/js/aw-firestore.js');
    for (const leader of leaders) {
      const {id, ...data} = leader;
      await setDoc(doc(db,'leaders', id), {...data, createdAt:serverTimestamp()});
    }
    toast('✅ '+leaders.length+'জন নেতার latest data migrate হয়েছে!','success');
    loadLeaders();
  } catch(e) { toast('❌ Error: '+e.message,'error'); }
};

// ── Warriors ─────────────────────────────────────────────
async function loadWarriors() {
  const tbody = document.getElementById('warrior-tbody');
  tbody.innerHTML='<tr><td colspan="8" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'warriors'));
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="8" class="empty">কোনো যোদ্ধা নেই</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const typeClass = data.type==='shahid'?'badge-red':data.type==='ahat'?'badge-amber':'badge-green';
      const typeLabel = data.type==='shahid'?'🩸 শহীদ':data.type==='ahat'?'🩹 আহত':'✊ সক্রিয়';
      return `<tr>
        <td><b>${data.name||'—'}</b></td>
        <td><span class="badge ${typeClass}">${typeLabel}</span></td>
        <td>${data.dist||'—'}</td>
        <td style="font-size:11px">${data.role||'—'}</td>
        <td><span class="badge badge-blue">Active</span></td>
        <td><input type="checkbox" class="warrior-chk" data-id="${d.id}" onchange="onWarriorCheck()" style="cursor:pointer;accent-color:var(--accent)"></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteWarrior('${d.id}')">🗑️</button></td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="8" class="empty text-red">Error</td></tr>'; }
}

window.onWarriorCheck = function() { const n=document.querySelectorAll('.warrior-chk:checked').length; const b=document.getElementById('warrior-bulk-del'); if(b) b.style.display=n>0?'':'none'; };
window.bulkDeleteWarriors = async function() {
  const ids=[...document.querySelectorAll('.warrior-chk:checked')].map(c=>c.dataset.id);
  if(!ids.length) return;
  if(!confirm(ids.length+'জন যোদ্ধা delete করবেন?')) return;
  await Promise.all(ids.map(id=>deleteDoc(doc(db,'warriors',id))));
  toast('✅ '+ids.length+'জন delete হয়েছে','success'); loadWarriors();
};

window.saveWarrior = async function() {
  const name  = document.getElementById('wr-name').value.trim();
  const dist  = document.getElementById('wr-dist').value.trim();
  const role  = document.getElementById('wr-role').value.trim();
  const type  = document.getElementById('wr-type').value;
  const story = document.getElementById('wr-story').value.trim();
  const icon  = document.getElementById('wr-icon').value.trim() || '✊';
  if (!name) return toast('নাম দিন','error');
  await addDoc(collection(db,'warriors'), {name,dist,role,type,story,icon,approved:true,createdAt:serverTimestamp()});
  toast('✅ যোদ্ধা যোগ হয়েছে!','success');
  closeModal('warriorModal');
  loadWarriors();
};

window.deleteWarrior = async function(id) {
  if (!confirm('Delete করবেন?')) return;
  await deleteDoc(doc(db,'warriors',id));
  toast('Deleted','info'); loadWarriors();
};

// ── Bajar ────────────────────────────────────────────────
const bajarItems = [
  'মোটা চাল','সরু চাল','আটা','ডাল (মসুর)','ডাল (খেসারি)',
  'সয়াবিন তেল (লিটার)','পেঁয়াজ','রসুন','আদা',
  'আলু','টমেটো','বেগুন','মুরগি (কেজি)','গরুর মাংস (কেজি)','ডিম (হালি)'
];

async function loadBajar() {
  // Build form fields
  const fieldsEl = document.getElementById('bajar-fields');
  fieldsEl.innerHTML = bajarItems.map(item => `
    <div class="field">
      <label>${item}</label>
      <input type="number" id="bj-${item.replace(/\s+/g,'_')}" placeholder="৳ দাম" step="0.5">
    </div>`).join('');

  // Load current data
  const el = document.getElementById('bajar-current');
  try {
    const today = new Date().toISOString().slice(0,10);
    const snap = await getDoc(doc(db,'bajar_override','latest'));
    if (snap.exists()) {
      const data = snap.data();
      el.innerHTML = Object.entries(data).filter(([k])=>k!=='updatedAt').map(([k,v]) =>
        `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
          <span>${k}</span><span style="color:var(--amber);font-weight:700">৳ ${v}</span>
        </div>`).join('') || '<div class="empty">কোনো data নেই</div>';
      // Fill form
      Object.entries(data).forEach(([k,v]) => {
        const el = document.getElementById('bj-'+k.replace(/\s+/g,'_'));
        if (el) el.value = v;
      });
    } else { el.innerHTML='<div class="empty">এখনো কোনো data নেই</div>'; }
  } catch(e) { el.innerHTML='<div class="empty text-red">Error</div>'; }
}

window.saveBajar = async function(withNotif=false) {
  const data = {updatedAt: serverTimestamp()};
  bajarItems.forEach(item => {
    const val = document.getElementById('bj-'+item.replace(/\s+/g,'_'))?.value;
    if (val) data[item] = parseFloat(val);
  });
  await setDoc(doc(db,'bajar_override','latest'), data);
  toast('✅ বাজার দর Save হয়েছে!','success');
  if (withNotif) await callSendNotif({type:'bajar'});
  loadBajar();
};

// ── Medicines ────────────────────────────────────────────
async function loadMedicines() {
  const tbody = document.getElementById('med-tbody');
  tbody.innerHTML='<tr><td colspan="5" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'medicines'));
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="5" class="empty">কোনো ওষুধ নেই</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      return `<tr>
        <td><b>${data.name||'—'}</b></td>
        <td style="font-size:11px;color:var(--text2)">${data.generic||'—'}</td>
        <td style="color:var(--amber);font-weight:700">৳ ${data.mrp||'—'}</td>
        <td style="font-size:10px;color:var(--text2)">${data.createdAt?.toDate?.()?.toLocaleDateString('bn-BD')||'—'}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMed('${d.id}')">Delete</button></td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="5" class="empty text-red">Error</td></tr>'; }
}

window.saveMedicine = async function() {
  const name    = document.getElementById('med-name').value.trim();
  const generic = document.getElementById('med-generic').value.trim();
  const mrp     = parseFloat(document.getElementById('med-mrp').value)||0;
  const company = document.getElementById('med-company').value.trim();
  if (!name) return toast('ওষুধের নাম দিন','error');
  await addDoc(collection(db,'medicines'), {name,generic,mrp,company,createdAt:serverTimestamp()});
  toast('✅ ওষুধ যোগ হয়েছে!','success');
  closeModal('medModal');
  loadMedicines();
};

window.deleteMed = async function(id) {
  if (!confirm('Delete করবেন?')) return;
  await deleteDoc(doc(db,'medicines',id));
  toast('Deleted','info'); loadMedicines();
};

// ── Members ──────────────────────────────────────────────
async function loadMembers() {
  const tbody = document.getElementById('member-tbody');
  tbody.innerHTML='<tr><td colspan="5" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'members'));
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="5" class="empty">কোনো member নেই</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      return `<tr>
        <td><b>${data.name||'—'}</b></td>
        <td style="font-size:11px">${data.designation||data.desg||'—'}</td>
        <td><span class="badge badge-blue">${data.cat||'—'}</span></td>
        <td><a href="${data.facebook||'#'}" target="_blank" style="color:var(--blue);font-size:11px">Facebook ↗</a></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMember('${d.id}')">Delete</button></td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="5" class="empty text-red">Error</td></tr>'; }
}

window.saveMember = async function() {
  const name = document.getElementById('mb-name').value.trim();
  const desg = document.getElementById('mb-desg').value.trim();
  const cat  = document.getElementById('mb-cat').value;
  const img  = document.getElementById('mb-img').value.trim();
  const fb   = document.getElementById('mb-fb').value.trim();
  if (!name) return toast('নাম দিন','error');
  await addDoc(collection(db,'members'), {name,designation:desg,cat,img,facebook:fb||'#',createdAt:serverTimestamp()});
  toast('✅ Member যোগ হয়েছে!','success');
  closeModal('memberModal');
  loadMembers();
};

window.deleteMember = async function(id) {
  if (!confirm('Delete করবেন?')) return;
  await deleteDoc(doc(db,'members',id));
  toast('Deleted','info'); loadMembers();
};

// ── Polls ────────────────────────────────────────────────
async function loadPolls() {
  const tbody = document.getElementById('poll-tbody');
  tbody.innerHTML='<tr><td colspan="5" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(collection(db,'poll_users'));
    setEl('po-voters', snap.size);
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="5" class="empty">কোনো voter নেই</td></tr>'; return; }
    const users = snap.docs.map(d=>({...d.data(),id:d.id}))
      .sort((a,b)=>(b.streak||0)-(a.streak||0));
    setEl('po-streak', users.filter(u=>(u.streak||0)>0).length);
    setEl('po-rewards', users.filter(u=>u.rewardClaimed).length);
    tbody.innerHTML = users.slice(0,50).map(u => `
      <tr>
        <td><b>${u.name||'—'}</b></td>
        <td style="font-family:monospace;font-size:11px">${u.phone||'—'}</td>
        <td><span style="color:var(--amber);font-weight:700">🔥 ${u.streak||0}</span></td>
        <td>${(u.voteDays||[]).length}</td>
        <td style="font-size:10px;color:var(--text2)">${u.lastVote||'—'}</td>
      </tr>`).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="5" class="empty">Poll data নেই (localStorage based)</td></tr>'; }
}

// ── Forum ────────────────────────────────────────────────
async function loadForum() {
  const room  = document.getElementById('forum-room').value;
  const tbody = document.getElementById('forum-tbody');
  tbody.innerHTML='<tr><td colspan="4" class="loading">লোড হচ্ছে...</td></tr>';
  try {
    const snap = await getDocs(query(collection(db,'forum_messages'), where('roomId','==', room), orderBy('ts','desc')));
    if (snap.empty) { tbody.innerHTML='<tr><td colspan="4" class="empty">কোনো message নেই</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const time = data.ts?.toDate?.()?.toLocaleString('bn-BD')||'—';
      return `<tr>
        <td style="font-weight:700;font-size:12px">${data.name||'Anonymous'}</td>
        <td style="font-size:12px;max-width:300px">${data.text||'—'}</td>
        <td style="font-size:10px;color:var(--text2)">${time}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMsg('${d.id}')">Delete</button></td>
      </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="4" class="empty text-red">Error loading</td></tr>'; }
}

window.deleteMsg = async function(id) {
  if (!confirm('এই message delete করবেন?')) return;
  await deleteDoc(doc(db,'forum_messages',id));
  toast('Deleted','info'); loadForum();
};

// ── Settings ─────────────────────────────────────────────
window.changePassword = function() {
  const oldPass = document.getElementById('set-old').value;
  const newPass = document.getElementById('set-new').value;
  const confirm = document.getElementById('set-confirm').value;
  if (oldPass !== ADMIN_KEY) return toast('বর্তমান password ভুল','error');
  if (newPass !== confirm) return toast('নতুন password মিলছে না','error');
  if (newPass.length < 6) return toast('কমপক্ষে ৬ অক্ষর দিন','error');
  toast('⚠️ Netlify এবং GitHub Secrets এও ADMIN_SECRET_KEY update করুন','info');
};

window.saveSettings = function() { toast('Settings saved (UI only)','success'); };

window.runMigration = async function() {
  try {
    const res = await fetch('/.netlify/functions/migrate-subscriptions?key='+ADMIN_KEY);
    const data = await res.json();
    toast('✅ '+data.message,'success');
  } catch(e) { toast('❌ Error','error'); }
};

window.clearCache = function() { toast('Cache cleared','success'); };

// ── Helpers ──────────────────────────────────────────────
window.openModal  = id => document.getElementById(id).classList.add('open');
window.closeModal = id => document.getElementById(id).classList.remove('open');

function setEl(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast '+type;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.display='none'; }, 4000);
}

// ── File Upload via GitHub API ──────────────────────────
// ── Inline Upload (image URL field এর পাশে) ──────────────
window.inlineUpload = async function(input, targetFieldId, folder) {
  const file = input.files[0];
  if (!file) return;

  const progressEl = document.getElementById(targetFieldId.replace('-','_').split('_')[0]+'-'+targetFieldId.split('-').slice(1).join('-')+'-progress') ||
                     document.getElementById(targetFieldId+'-progress');
  const barEl    = progressEl?.querySelector('[id$="-bar"]') || progressEl?.querySelector('div > div');
  const statusEl = progressEl?.querySelector('[id$="-status"]') || progressEl?.querySelector('div + div');

  // Show preview for press release image
  if (targetFieldId === 'pr-img') {
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('pr-img-preview');
      const prevImg = document.getElementById('pr-img-preview-img');
      if (prev && prevImg) { prevImg.src = e.target.result; prev.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  }

  if (progressEl) { progressEl.style.display = 'block'; if(barEl) barEl.style.width='30%'; if(statusEl) statusEl.textContent='Uploading...'; }

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if(barEl) barEl.style.width='60%';

    const res = await fetch('/.netlify/functions/github-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
      body: JSON.stringify({ filename: file.name, content: base64, folder, message: `Admin upload: ${file.name}` })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    if(barEl) barEl.style.width='100%';
    if(statusEl) { statusEl.textContent = '✅ Uploaded! Deploying...'; statusEl.style.color = 'var(--green)'; }

    // Set URL in target field
    document.getElementById(targetFieldId).value = data.url;
    toast('✅ '+file.name+' uploaded!','success');
  } catch(e) {
    if(statusEl) { statusEl.textContent = '❌ '+e.message; statusEl.style.color = 'var(--red)'; }
    toast('❌ Upload failed: '+e.message,'error');
  }
};

window.previewFile = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('up-preview-img').src = e.target.result;
      document.getElementById('up-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
  // Auto-set commit message
  document.getElementById('up-message').placeholder = `Admin upload: ${file.name}`;
};

window.doUpload = async function() {
  const file = document.getElementById('up-file').files[0];
  if (!file) return toast('একটি file select করুন','error');

  const folder = document.getElementById('up-folder').value;
  const message = document.getElementById('up-message').value || `Admin upload: ${file.name}`;
  const btn = document.getElementById('up-btn');
  btn.disabled = true; btn.textContent = '⏳ Uploading...';

  // Show progress
  document.getElementById('up-progress').style.display = 'block';
  document.getElementById('up-progress-bar').style.width = '30%';

  try {
    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    document.getElementById('up-progress-bar').style.width = '60%';

    const res = await fetch('/.netlify/functions/github-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
      body: JSON.stringify({ filename: file.name, content: base64, folder, message })
    });

    document.getElementById('up-progress-bar').style.width = '100%';
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Upload failed');

    // Show result
    const resultEl = document.getElementById('up-result');
    resultEl.textContent = data.message;
    resultEl.className = 'upload-result success';
    resultEl.style.display = 'block';

    // Show URL copy box
    document.getElementById('up-url-val').value = data.url;
    document.getElementById('up-url-copy').style.display = 'block';

    toast('✅ Upload successful! Netlify deploy শুরু হয়েছে...','success');
  } catch(e) {
    const resultEl = document.getElementById('up-result');
    resultEl.textContent = '❌ ' + e.message;
    resultEl.className = 'upload-result error';
    resultEl.style.display = 'block';
    toast('❌ Upload failed: ' + e.message,'error');
  } finally {
    btn.disabled = false; btn.textContent = '⬆️ Upload করুন';
  }
};

window.copyUploadUrl = function() {
  const val = document.getElementById('up-url-val').value;
  navigator.clipboard.writeText(val).then(() => toast('✅ URL copied!','success'));
};

window.resetUpload = function() {
  document.getElementById('up-file').value = '';
  document.getElementById('up-preview').style.display = 'none';
  document.getElementById('up-progress').style.display = 'none';
  document.getElementById('up-progress-bar').style.width = '0%';
  document.getElementById('up-result').style.display = 'none';
  document.getElementById('up-url-copy').style.display = 'none';
  document.getElementById('up-message').value = '';
};

// ══════════════════════════════════════════════════════════════════════
// ANALYTICS ENGINE — array-backpropagation style, single source of truth
// ══════════════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────────────
let anRange      = 60;
let anAllDocs    = [];
let anLiveCount  = 0;
let anFeedFilter = 'all';
let anUnsubscribe = null;
let anChartInst = null, anCatInst = null, anDevInst = null;
let anCachedSubs = null, anCachedNotifs = null;

// ── Config maps (single source of truth) ──────────────────────────────
const PAGE_LABELS = {
  '/':'মূলপাতা','/index.html':'মূলপাতা','/rokto.html':'রক্তদাতা',
  '/alert.html':'সতর্কতা','/bajar.html':'বাজার দর','/news.html':'সংবাদ',
  '/community.html':'কমিউনিটি','/events.html':'ইভেন্ট',
  '/leader-tracker.html':'নেতা ট্র্যাকার','/july-warriors.html':'জুলাই যোদ্ধা',
  '/hospital.html':'হাসপাতাল','/doctor.html':'ডাক্তার','/medicine.html':'ওষুধ',
  '/weather.html':'আবহাওয়া','/forum.html':'ফোরাম','/donate.html':'ডোনেট',
  '/jobs.html':'চাকরি','/freelance.html':'ফ্রিল্যান্স',
  '/membership.html':'সদস্যপদ','/joaf-polls.html':'পোল',
  '/live.html':'Live','/agriculture.html':'কৃষি','/youth-startup.html':'Youth Startup'
};

const SRC_CFG = [
  {key:'Direct',  color:'#60a5fa', icon:'🔗'},
  {key:'Google',  color:'#34d399', icon:'🔍'},
  {key:'Facebook',color:'#f05252', icon:'📘'},
  {key:'Twitter', color:'#a78bfa', icon:'🐦'},
  {key:'Referral',color:'#fbbf24', icon:'📎'},
  {key:'Other',   color:'#7878a0', icon:'🌐'},
];
const SRC_COLORS = Object.fromEntries(SRC_CFG.map(s=>[s.key,s.color]));
const SRC_ICONS  = Object.fromEntries(SRC_CFG.map(s=>[s.key,s.icon]));

const DEV_CFG = [
  {key:'mobile',  color:'#f05252', icon:'📱', label:'মোবাইল'},
  {key:'desktop', color:'#60a5fa', icon:'🖥️',  label:'ডেস্কটপ'},
  {key:'tablet',  color:'#fbbf24', icon:'📲', label:'ট্যাবলেট'},
];
const DEV_COLORS = Object.fromEntries(DEV_CFG.map(d=>[d.key,d.color]));
const DEV_ICONS  = Object.fromEntries(DEV_CFG.map(d=>[d.key,d.icon]));
const DEV_LABELS = Object.fromEntries(DEV_CFG.map(d=>[d.key,d.label]));

// KPI card definitions (array-driven, order controls layout)
const KPI_DEFS = [
  {id:'an-kpi-today', icon:'👁️',  label:'আজকের Visit',  color:'blue',   sub:'an-kpi-today-sub'},
  {id:'an-kpi-hour',  icon:'⚡',  label:'শেষ ঘণ্টা',    color:'purple', sub:'an-kpi-hour-sub'},
  {id:'an-kpi-week',  icon:'📅',  label:'এই সপ্তাহ',    color:'amber',  sub:null},
  {id:'an-kpi-uniq',  icon:'🙋',  label:'Unique (আজ)',  color:'green',  sub:null},
  {id:'an-kpi-subs',  icon:'🔔',  label:'Subscribers',  color:'blue',   sub:'an-kpi-subs-sub'},
  {id:'an-kpi-notif', icon:'📤',  label:'Notifications', color:'red',   sub:null},
];

// Insight row definitions (array-driven)
const INSIGHT_DEFS = [
  {label:'Range মোট',   fn: (ir,all,now) => ir.length},
  {label:'আজ unique',   fn: (ir,all,now) => { const d=new Date(now);d.setHours(0,0,0,0); return new Set(all.filter(x=>x.tsMs>=d.getTime()).map(x=>x.uid||x.id)).size; }},
  {label:'গতকাল total', fn: (ir,all,now) => { const d=new Date(now);d.setHours(0,0,0,0); return all.filter(x=>x.tsMs>=d.getTime()-86400000&&x.tsMs<d.getTime()).length; }},
  {label:'Avg/hour',    fn: (ir,all,now) => { const h=Math.max(1,new Date(now).getHours()||1); const d=new Date(now);d.setHours(0,0,0,0); return Math.round(all.filter(x=>x.tsMs>=d.getTime()).length/h); }},
  {label:'Peak hour',   fn: (ir,all,now) => { const c={}; all.forEach(x=>{const h=new Date(x.tsMs).getHours();c[h]=(c[h]||0)+1;}); const pk=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; return pk?pk[0]+':00 ('+pk[1]+')':'—'; }},
  {label:'Top source',  fn: (ir,all,now) => { const c={}; ir.forEach(x=>{const s=x.source||'Direct';c[s]=(c[s]||0)+1;}); const pk=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; return pk?(SRC_ICONS[pk[0]]||'')+' '+pk[0]:'—'; }},
];

// ── Range helpers ──────────────────────────────────────────────────────
const RANGE_CFG = {
  60:    {label:'শেষ ৬০ মিনিট',  title:'⚡ শেষ ৬০ মিনিট',   unit:'min',  steps:60,  step_ms:60000},
  1440:  {label:'আজ (24 ঘণ্টা)', title:'🕐 আজকের ২৪ ঘণ্টা', unit:'hour', steps:24,  step_ms:3600000},
  10080: {label:'শেষ ৭ দিন',     title:'📅 শেষ ৭ দিন',       unit:'day',  steps:7,   step_ms:86400000},
  43200: {label:'শেষ ৩০ দিন',    title:'📆 শেষ ৩০ দিন',      unit:'day',  steps:30,  step_ms:86400000},
};

window.setAnRange = function(mins, el) {
  anRange = mins;
  document.querySelectorAll('.an-tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  renderAnalytics();
};

window.setFeedFilter = function(filter, el) {
  anFeedFilter = filter;
  document.querySelectorAll('.an-filter').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  renderFeed();
};

// ── CSS injection for filter buttons ──────────────────────────────────
(function injectAnCSS(){
  if(document.getElementById('an-style')) return;
  const s=document.createElement('style');s.id='an-style';
  s.textContent=`
    .an-filter{font-size:10px;padding:3px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;transition:all .15s}
    .an-filter.active,.an-filter:hover{background:var(--blue-bg,rgba(96,165,250,.1));color:var(--blue,#60a5fa);border-color:var(--blue-border,rgba(96,165,250,.3))}
    .an-feed-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);transition:background .15s}
    .an-feed-row:hover{background:var(--bg3)}
    .an-feed-row.new-row{animation:feedIn .4s ease}
    @keyframes feedIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
    .an-kpi{border-radius:12px;padding:12px 14px;border:1px solid var(--border);background:var(--bg2);transition:transform .15s}
    .an-kpi:hover{transform:translateY(-2px)}
    .kpi-num{font-size:22px;font-weight:900;line-height:1;margin:4px 0 2px}
    .kpi-label{font-size:10px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .kpi-sub{font-size:10px;margin-top:3px}
    .kpi-icon{font-size:16px;margin-bottom:2px}
  `;
  document.head.appendChild(s);
})();

// ── Listener ───────────────────────────────────────────────────────────
function startAnalyticsListener() {
  if(anUnsubscribe) return;
  try {
    anUnsubscribe = onSnapshot(collection(db,'pageviews'), snap => {
      const wasEmpty = anAllDocs.length === 0;
      anAllDocs = snap.docs.map(d=>({...d.data(), id:d.id, tsMs: d.data().ts?.toMillis?.()||0}));
      if(!wasEmpty) {
        snap.docChanges().forEach(ch => {
          if(ch.type==='added') {
            anLiveCount++;
            const badge = document.getElementById('an-live-badge');
            if(badge){badge.textContent='+'+anLiveCount;badge.style.display='';}
            const newBadge = document.getElementById('an-feed-new');
            if(newBadge){newBadge.style.display='';setTimeout(()=>newBadge.style.display='none',3000);}
          }
        });
      }
      if(document.getElementById('page-analytics')?.classList.contains('active')) renderAnalytics();
    });
  } catch(e){console.warn('Analytics listener:',e);}
}

function stopAnalyticsListener(){
  if(anUnsubscribe){anUnsubscribe();anUnsubscribe=null;}
  anLiveCount=0;
}

async function loadAnalytics(){
  if(typeof Chart==='undefined') return setTimeout(loadAnalytics,400);
  startAnalyticsListener();
  renderAnalytics();
}

// ── MAIN RENDER (pure function) ────────────────────────────────────────
function renderAnalytics(){
  if(typeof Chart==='undefined'||!anAllDocs) return;
  try{
    const now    = new Date();
    const cutoff = new Date(now - anRange * 60000);
    const inRange = anAllDocs.filter(d=>d.tsMs >= cutoff.getTime());
    const cfg    = RANGE_CFG[anRange] || RANGE_CFG[60];

    // ── Empty state ──
    const setup = document.getElementById('an-setup');
    if(setup) setup.style.display = anAllDocs.length>0?'none':'block';

    // ── Range summary ──
    const summEl = document.getElementById('an-range-summary');
    if(summEl) summEl.textContent = cfg.label+' · '+inRange.length+' visit';
    const titleEl = document.getElementById('an-chart-title');
    if(titleEl) titleEl.textContent = cfg.title;

    // ── KPI row ──────────────────────────────────────────────────────
    const todayStart    = new Date(now); todayStart.setHours(0,0,0,0);
    const hourStart     = new Date(now-3600000);
    const prevHourStart = new Date(now-7200000);
    const weekStart     = new Date(now-7*86400000);
    const todayCount    = anAllDocs.filter(d=>d.tsMs>=todayStart.getTime()).length;
    const hourCount     = anAllDocs.filter(d=>d.tsMs>=hourStart.getTime()).length;
    const prevHour      = anAllDocs.filter(d=>d.tsMs>=prevHourStart.getTime()&&d.tsMs<hourStart.getTime()).length;
    const weekCount     = anAllDocs.filter(d=>d.tsMs>=weekStart.getTime()).length;
    const uniqueToday   = new Set(anAllDocs.filter(d=>d.tsMs>=todayStart.getTime()).map(d=>d.uid||d.id)).size;
    const hourDiff      = hourCount-prevHour;
    const yestCount     = anAllDocs.filter(d=>d.tsMs>=todayStart.getTime()-86400000&&d.tsMs<todayStart.getTime()).length;
    const todayDiff     = todayCount-yestCount;

    const KPI_VALS = [
      {val:todayCount, sub:(todayDiff>=0?'▲ +':'▼ ')+Math.abs(todayDiff)+' গতকাল', subColor:todayDiff>=0?'var(--green)':'var(--red)'},
      {val:hourCount,  sub:(hourDiff>=0?'▲ +':'▼ ')+Math.abs(hourDiff)+' আগের', subColor:hourDiff>=0?'var(--green)':'var(--red)'},
      {val:weekCount,  sub:null, subColor:null},
      {val:uniqueToday,sub:null, subColor:null},
      {val:anCachedSubs,  sub:null, subColor:null}, // subs from initDashboard cache
      {val:anCachedNotifs,sub:null, subColor:null}, // notifs from initDashboard cache
    ];

    const kpiRow = document.getElementById('an-kpi-row');
    if(kpiRow && !kpiRow.dataset.built){
      kpiRow.dataset.built='1';
      const COLOR_MAP={blue:'rgba(96,165,250,.08)',purple:'rgba(167,139,250,.08)',amber:'rgba(251,191,36,.08)',green:'rgba(52,211,153,.08)',red:'rgba(248,113,113,.08)'};
      kpiRow.innerHTML = KPI_DEFS.map((k,i)=>`
        <div class="an-kpi" style="background:${COLOR_MAP[k.color]||'var(--bg2)'}">
          <div class="kpi-icon">${k.icon}</div>
          <div class="kpi-num" id="${k.id}">—</div>
          <div class="kpi-label">${k.label}</div>
          ${k.sub?`<div class="kpi-sub" id="${k.sub}"></div>`:''}
        </div>`).join('');
    }

    // Update KPI values
    KPI_DEFS.forEach((k,i)=>{
      const v=KPI_VALS[i];
      if(v&&v.val!==null){setEl(k.id,v.val.toLocaleString());}
      if(k.sub&&v&&v.sub){
        const el=document.getElementById(k.sub);
        if(el){el.textContent=v.sub;if(v.subColor)el.style.color=v.subColor;}
      }
    });

    // ── Timeline chart ────────────────────────────────────────────────
    const labels=[], data=[], dataUniq=[];
    const uidSets = [];

    for(let i=cfg.steps-1;i>=0;i--){
      const bEnd   = new Date(now - i*cfg.step_ms);
      const bStart = new Date(bEnd - cfg.step_ms);
      const bucket = inRange.filter(d=>d.tsMs>=bStart.getTime()&&d.tsMs<bEnd.getTime());
      data.push(bucket.length);
      dataUniq.push(new Set(bucket.map(d=>d.uid||d.id)).size);

      if(cfg.unit==='min')      labels.push(i%10===0?(cfg.steps-i)+'m':'');
      else if(cfg.unit==='hour') labels.push(bEnd.getHours()+':00');
      else {
        const dd=new Date(bEnd);
        labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dd.getDay()]+(i===0?' (আজ)':''));
      }
    }

    const peak    = Math.max(...data);
    const avg     = data.length? Math.round(data.reduce((a,b)=>a+b,0)/data.length) : 0;
    const pkLabel = labels[data.indexOf(peak)] || '';
    const peakEl = document.getElementById('an-chart-peak');
    const avgEl  = document.getElementById('an-chart-avg');
    if(peakEl) peakEl.textContent = peak ? `⬆ Peak: ${peak} visit @ ${pkLabel}` : '';
    if(avgEl)  avgEl.textContent  = avg  ? `∅ Avg: ${avg} visit/${cfg.unit}` : '';

    const subEl = document.getElementById('an-chart-sub');
    if(subEl) subEl.textContent = `${inRange.length} visit · unique ${new Set(inRange.map(d=>d.uid||d.id)).size}`;

    const GCOL='rgba(255,255,255,0.05)', TCOL='#7878a0';
    const ctx = document.getElementById('an-chart');
    if(ctx){
      const ds = [
        {label:'Visits', data, borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,0.07)', borderWidth:2, fill:true, tension:0.4, pointRadius:data.length>30?0:2, pointHoverRadius:5},
        {label:'Unique', data:dataUniq, borderColor:'#a78bfa', backgroundColor:'transparent', borderWidth:1.5, fill:false, tension:0.4, pointRadius:0, pointHoverRadius:4, borderDash:[4,3]},
      ];
      if(anChartInst){anChartInst.data.labels=labels;anChartInst.data.datasets[0].data=data;anChartInst.data.datasets[1].data=dataUniq;anChartInst.update('none');}
      else anChartInst=new Chart(ctx,{type:'line',data:{labels,datasets:ds},options:{
        responsive:true,maintainAspectRatio:false,animation:{duration:250},interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f1019',titleColor:'#eeeef5',bodyColor:'#7878a0',borderColor:'rgba(255,255,255,.08)',borderWidth:1,padding:10,
          callbacks:{afterBody:items=>{const idx=items[0].dataIndex;const total=data[idx];return total?['','📊 Rate: '+(Math.round(dataUniq[idx]/Math.max(1,total)*100))+'% unique']:[]}}}},
        scales:{x:{grid:{color:GCOL},ticks:{color:TCOL,font:{size:10},maxTicksLimit:18}},
                y:{grid:{color:GCOL},ticks:{color:TCOL,font:{size:10},precision:0},beginAtZero:true}}}});
    }

    // ── Top Pages (bar style) ─────────────────────────────────────────
    const pageCounts={};
    inRange.forEach(d=>{const k=d.page||'/';pageCounts[k]=(pageCounts[k]||0)+1;});
    const sorted=Object.entries(pageCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxPg=sorted[0]?.[1]||1;
    const pagesEl=document.getElementById('an-pages');
    const totalEl=document.getElementById('an-pages-total');
    if(totalEl) totalEl.textContent=Object.keys(pageCounts).length+' pages';
    if(pagesEl) pagesEl.innerHTML=sorted.length?sorted.map(([p,n],i)=>{
      const pct=Math.round(n/maxPg*100);
      const barColors=['#60a5fa','#818cf8','#a78bfa','#c084fc','#e879f9','#f472b6','#fb7185','#f87171'];
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72%">${PAGE_LABELS[p]||p}</span>
          <span style="color:var(--text2);flex-shrink:0">${n} <span style="color:var(--text3);font-size:9px">${Math.round(n/Math.max(1,inRange.length)*100)}%</span></span>
        </div>
        <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColors[i%barColors.length]};border-radius:3px;transition:width .5s ease"></div>
        </div>
      </div>`;
    }).join(''):'<div class="empty">data নেই</div>';

    // ── Donut helper (DRY) ─────────────────────────────────────────────
    function mkDonut(canvasId, legId, cfgArr, keyFn, instRef, setInst){
      const counts={};
      inRange.forEach(d=>{const k=keyFn(d);counts[k]=(counts[k]||0)+1;});
      if(!Object.keys(counts).length) counts['No data']=1;
      const keys=cfgArr.map(c=>c.key).filter(k=>counts[k]);
      const other=Object.keys(counts).filter(k=>!cfgArr.find(c=>c.key===k));
      const allKeys=[...keys,...other];
      const vals=allKeys.map(k=>counts[k]||0);
      const colors=allKeys.map(k=>cfgArr.find(c=>c.key===k)?.color||'#7878a0');
      const total=vals.reduce((a,b)=>a+b,0);

      const el=document.getElementById(canvasId);
      if(el){
        if(instRef){instRef.data.labels=allKeys;instRef.data.datasets[0].data=vals;instRef.data.datasets[0].backgroundColor=colors;instRef.update('none');}
        else setInst(new Chart(el,{type:'doughnut',data:{labels:allKeys,datasets:[{data:vals,backgroundColor:colors,borderWidth:2,borderColor:'#161722',hoverBorderWidth:0}]},options:{
          responsive:true,maintainAspectRatio:false,cutout:'68%',animation:{duration:300},
          plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f1019',titleColor:'#eeeef5',bodyColor:'#7878a0',callbacks:{label:i=>` ${i.label}: ${i.raw} (${Math.round(i.raw/total*100)}%)`}}}}}));
      }

      const legEl=document.getElementById(legId);
      if(legEl) legEl.innerHTML=allKeys.map((k,i)=>{
        const cfg2=cfgArr.find(c=>c.key===k);
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0">
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2)">
            <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};flex-shrink:0"></span>
            ${cfg2?.icon||''} ${cfg2?.label||k}
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--text)">${vals[i]} <span style="font-size:9px;color:var(--text3);font-weight:400">${Math.round(vals[i]/total*100)}%</span></div>
        </div>`;
      }).join('');
    }

    mkDonut('an-cat-chart','an-cat-legend', SRC_CFG, d=>d.source||'Direct', anCatInst, inst=>{anCatInst=inst;});
    mkDonut('an-device-chart','an-device-legend', DEV_CFG, d=>d.device||'desktop', anDevInst, inst=>{anDevInst=inst;});

    // ── Insights (array-driven) ───────────────────────────────────────
    const engEl=document.getElementById('an-engagement');
    if(engEl) engEl.innerHTML=INSIGHT_DEFS.map(def=>{
      let val; try{val=def.fn(inRange,anAllDocs,now);}catch{val='—';}
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:11px;color:var(--text2)">${def.label}</span>
        <span style="font-size:12px;font-weight:800;color:var(--text)">${val}</span>
      </div>`;
    }).join('');

    // ── Hourly Heatmap ────────────────────────────────────────────────
    const hmEl=document.getElementById('an-heatmap');
    if(hmEl){
      const hourCounts=Array(24).fill(0);
      anAllDocs.filter(d=>d.tsMs>=todayStart.getTime()).forEach(d=>{
        const h=new Date(d.tsMs).getHours();
        hourCounts[h]++;
      });
      const maxHour=Math.max(...hourCounts,1);
      hmEl.innerHTML=hourCounts.map((c,h)=>{
        const pct=Math.round(c/maxHour*100);
        const intensity=pct===0?'rgba(96,165,250,0.06)':pct<25?'rgba(96,165,250,0.2)':pct<50?'rgba(96,165,250,0.4)':pct<75?'rgba(96,165,250,0.65)':'rgba(96,165,250,0.9)';
        const now_h=new Date().getHours();
        const ring=h===now_h?'box-shadow:0 0 0 2px rgba(96,165,250,.5);':'';
        return `<div title="${h}:00 — ${c} visit" style="flex:1;height:${Math.max(6,pct)}%;background:${intensity};border-radius:3px 3px 0 0;cursor:default;transition:height .5s ease;min-height:4px;${ring}"></div>`;
      }).join('');
    }

    // ── Feed ──────────────────────────────────────────────────────────
    renderFeed();

  } catch(e){console.error('renderAnalytics:',e);}
}

function renderFeed(){
  const feedEl=document.getElementById('an-feed');
  const labelEl=document.getElementById('an-feed-label');
  if(!feedEl) return;

  const all=[...anAllDocs].sort((a,b)=>b.tsMs-a.tsMs);
  const filtered=anFeedFilter==='all'?all:all.filter(d=>{
    if(anFeedFilter==='mobile'||anFeedFilter==='desktop'||anFeedFilter==='tablet') return d.device===anFeedFilter;
    return d.source===anFeedFilter;
  });
  const recent=filtered.slice(0,50);

  if(labelEl) labelEl.textContent=`${anAllDocs.length} total · ${recent.length} showing${anFeedFilter!=='all'?' (filtered)':''}`;

  if(!recent.length){feedEl.innerHTML='<div class="empty">কোনো visit নেই</div>';return;}

  feedEl.innerHTML=recent.map((d,i)=>{
    const now2=Date.now();
    const ago=d.tsMs?(now2-d.tsMs):0;
    const agoStr=ago<60000?Math.round(ago/1000)+'s ago':ago<3600000?Math.round(ago/60000)+'m ago':ago<86400000?Math.round(ago/3600000)+'h ago':new Date(d.tsMs).toLocaleDateString('bn-BD');
    const t=d.tsMs?new Date(d.tsMs).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
    const devIcon=DEV_ICONS[d.device]||'🖥️';
    const srcColor=SRC_COLORS[d.source]||'var(--text2)';
    const srcIcon=SRC_ICONS[d.source]||'🌐';
    const isNew=ago<30000;
    return `<div class="an-feed-row${isNew?' new-row':''}">
      <span style="font-size:15px;flex-shrink:0;width:22px;text-align:center">${devIcon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)">${PAGE_LABELS[d.page]||d.page||'/'}</div>
        <div style="font-size:10px;margin-top:1px">
          <span style="color:${srcColor}">${srcIcon} ${d.source||'Direct'}</span>
          ${d.referrer?`<span style="color:var(--text3);margin-left:6px">↩ ${d.referrer.replace(/^https?:\/\//,'').slice(0,25)}</span>`:''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:10px;color:var(--text2)">${t}</div>
        <div style="font-size:9px;color:${isNew?'var(--green)':'var(--text3)'};font-weight:${isNew?700:400}">${agoStr}</div>
      </div>
    </div>`;
  }).join('');
}

// ── Close modals on background click
document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => { if(e.target===bg) bg.classList.remove('open'); });
});

// Set today's date default for press release
document.getElementById('pr-date').value = new Date().toISOString().slice(0,10);







// ── FB Reel Generator ─────────────────────────────────────────
let reelBlob = null;


async function fbAnalyzeImage(input) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('img-upload-preview');
  const thumb = document.getElementById('img-preview-thumb');
  const label = document.getElementById('img-upload-label');
  const status = document.getElementById('img-analyze-status');
  const reader = new FileReader();
  reader.onload = async function(e) {
    thumb.src = e.target.result;
    preview.style.display = 'block';
    label.style.display = 'none';
    status.style.display = 'block';
    status.textContent = 'Image analyze হচ্ছে...';
    try {
      const base64 = e.target.result.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      const res = await fetch('/.netlify/functions/groq-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: 'data:' + mimeType + ';base64,' + base64 }
              },
              {
                type: 'text',
                text: 'এই image টি analyze করো। এটি একটি বাংলাদেশী সংবাদ বা ঘটনার ছবি হতে পারে। Image থেকে যা দেখছ তার উপর ভিত্তি করে একটি বাংলা news summary লেখো। Summary তে থাকবে: কী ঘটেছে, কোথায়, কে জড়িত (যদি বোঝা যায়), এবং সম্ভাব্য তারিখ বা সময়। শুধু বাংলায় ৩-৫ বাক্যে লেখো, কোনো hashtag বা extra formatting ছাড়া।'
              }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (text) {
        document.getElementById('fb-news-input').value = text.trim();
        status.textContent = 'Image analyze সম্পন্ন';
        status.style.color = 'var(--green)';
      } else {
        throw new Error('AI response নেই');
      }
    } catch(err) {
      status.textContent = 'Error: ' + err.message;
      status.style.color = 'var(--red)';
    }
  };
  reader.readAsDataURL(file);
}

async function fbGenerateReel() {
  const text = document.getElementById('fb-news-input').value.trim();
  const imgInput = document.getElementById('fb-img-input');
  const imgFile = imgInput && imgInput.files && imgInput.files[0];
  if (!text && !imgFile) return alert('News text লিখুন অথবা Image upload করুন');
  if (!text) return alert('News text লিখুন');
  const btn = document.getElementById('fb-gen-btn');
  btn.textContent = '⏳ তৈরি হচ্ছে...';
  btn.disabled = true;
  // Show progress
  const logEl = document.getElementById('fb-post-log');
  if (logEl) logEl.innerHTML = '<div style="color:var(--blue);font-size:11px;font-weight:700">🤖 AI দিয়ে caption, slides ও video তৈরি হচ্ছে... (৫-১৫ মিনিট লাগতে পারে)</div>';

  try {
    // AI দিয়ে caption + slides + mood বানাও
    // Pre-load image as base64 for vision API
    window._fbImgBase64 = '';
    const imgInputPre = document.getElementById('fb-img-input');
    const imgFilePre = imgInputPre && imgInputPre.files && imgInputPre.files[0];
    if (imgFilePre) {
      window._fbImgBase64 = await new Promise(function(res){
        const rd = new FileReader();
        rd.onload = function(e){ res(e.target.result.split(',')[1]); };
        rd.onerror = function(){ res(''); };
        rd.readAsDataURL(imgFilePre);
      });
    }
    // Retry AI up to 2 times on failure
    let res, aiData;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch('/.netlify/functions/groq-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: imgFile ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        messages: (function(){
          var userContent = [];
          var t2 = document.getElementById('fb-news-input').value.trim();
          var imgF = document.getElementById('fb-img-input');
          var imgFile2 = imgF && imgF.files && imgF.files[0];
          if (imgFile2 && window._fbImgBase64) {
            userContent.push({type:'image_url', image_url:{url:'data:'+(imgFile2.type||'image/jpeg')+';base64,'+window._fbImgBase64}});
          }
          userContent.push({type:'text', text:`তুমি JOAF এর সোশ্যাল মিডিয়া ম্যানেজার।
⚠️ STRICT RULES — এগুলো ভাঙলে চলবে না:
1. slide এর "text" field এ কখনো hashtag (#), "Tags:", emoji দেবে না — শুধু plain বাংলা বাক্য
2. slide এর "text" field এ caption এর কোনো অংশ দেবে না
3. প্রতিটা slide এ আলাদা আলাদা তথ্য থাকবে — repeat করবে না
4. caption এবং slide text সম্পূর্ণ আলাদা content হবে
ধাপ ১: image ও/অথবা text থেকে ৩টা distinct visual moment এ ভাগ করো
ধাপ ২: slide 1 = hook, slide 2 = বিস্তারিত, slide 3 = উপসংহার
শুধু raw JSON দাও:
{"mood":"urgent|sad|positive|neutral|angry","caption":"Bengali caption with emoji and hashtags","tags":"tag1, tag2, tag3","slides":[{"text":"hook বাংলায়","label":"শুরু","theme":"cyber","illustration":"alert"},{"text":"বিস্তারিত বাংলায়","label":"বিস্তার","theme":"ocean","illustration":"people"},{"text":"উপসংহার বাংলায়","label":"আহ্বান","theme":"matrix","illustration":"megaphone"}]}
News/Context: ${t2 || '(image দেখে বিশ্লেষণ করো)'}`});
          return [{role:'user', content:userContent}];
        })()
      })
    });
          break;
      } catch(fetchErr) {
        if (attempt === 1) throw fetchErr;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    aiData = await res.json();
    const raw = aiData.choices?.[0]?.message?.content || '{}';
    // Robustly extract JSON — find first { to last }
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI JSON বের করা যায়নি: ' + raw.substring(0,100));
    const parsed = JSON.parse(jsonMatch[0]);

    document.getElementById('fb-caption').value = parsed.caption || text;
    // Store tags globally and show in UI
    window._joafTags = parsed.tags || '';
    const tagsEl = document.getElementById('fb-tags-display');
    if (tagsEl) tagsEl.value = parsed.tags || '(AI tags দেয়নি)';

    // New format: slides = [{text, label, theme, illustration}] or old string format
    const rawSlides = (parsed.slides && parsed.slides.length > 0) ? parsed.slides : [{ text, label: 'সংবাদ', theme: 'cyber', illustration: 'alert' }];
    const slideData = rawSlides.map(s => {
      if (typeof s === 'string') {
        return { text: s.replace(/^slide\s*\d+\s*[:\-]\s*/i, '').trim(), label: '', theme: '', illustration: '' };
      }
      // Clean slide text — remove hashtags, Tags: lines, excess emojis
    let cleanSlideText = (s.text || '').trim();
    cleanSlideText = cleanSlideText.replace(/#[\u0980-\u09FF\w]+/g, '').trim(); // remove Bengali/English hashtags
    cleanSlideText = cleanSlideText.replace(/Tags?:\s*.*/gi, '').trim(); // remove Tags: line
    cleanSlideText = cleanSlideText.replace(/^[\s\n]+|[\s\n]+$/g, '').trim();
    return { text: cleanSlideText || (s.text || '').trim(), label: s.label || '', theme: s.theme || '', illustration: s.illustration || '' };
    });
    const mood = parsed.mood || 'neutral';

    // ── Caption ও Tags আগেই দেখাও — video আসার আগেই ready ──
    document.getElementById('fb-preview').style.display = 'block';

    // ── AI Video generation — HuggingFace Wan2.1 ──────────
    reelBlob = await renderVideoWithAudio(slideData, mood, text, logEl);
    const videoEl = document.getElementById('fb-reel-video');
    videoEl.src = URL.createObjectURL(reelBlob);
    videoEl.style.display = 'block';

    document.getElementById('fb-download-btn').style.display = 'inline-block';
    document.getElementById('fb-post-reels-btn').style.display = 'inline-block';
    if (logEl) { logEl.innerHTML = ''; t2vLog(logEl, 5, '✅ AI Video তৈরি হয়েছে! Download করুন বা FB Reels এ দিন।', 'ok'); }

  } catch(e) {
    alert('Error: ' + e.message);
    console.error(e);
  } finally {
    btn.textContent = '🎬 Reel বানাও';
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════
//  AI TEXT-TO-VIDEO ENGINE v3 — Pure REST + EventSource
//  No Gradio CDN, No CORS issues, Direct HF Space API
//  Architecture: probe → join queue → EventSource poll → fetch blob
// ══════════════════════════════════════════════════════════════════

// ── Status Logger ──────────────────────────────────────────────
function t2vLog(logEl, stage, msg, type) {
  if (!logEl) return;
  const colors = { info:'#7878a0', ok:'#34d399', err:'#f05252', stage:'#fbbf24', active:'#60a5fa' };
  const color = colors[type] || colors.info;
  const line = document.createElement('div');
  line.style.cssText = 'font-size:11px;line-height:1.8;display:flex;gap:6px;';
  line.innerHTML = `<span style="color:#fbbf24;font-weight:700;flex-shrink:0">[S${stage}]</span><span style="color:${color}">${msg}</span>`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Viral Realism Prompt Wrapper ───────────────────────────────
function t2vBuildPrompt(rawText, slides) {
  const base = rawText || slides.map(s => typeof s==='string'?s:s.text||'').join('. ');
  const positive = base + ', photorealistic cinematic masterpiece, 8k resolution, cinematic volumetric lighting, dynamic fluid motion, shot on 35mm anamorphic lens, hyper-detailed, golden hour, trending on artstation';
  const negative  = 'cartoon, anime, 3d render, drawing, painting, static, text overlay, watermark, low quality, blurry, choppy, glitch, distorted face, extra limbs';
  return { positive, negative };
}

// ── Space Catalogue — probed in order, first alive wins ────────
// Each entry: { base, fnIndex, buildData(prompt,neg,seed) }
// HF Space API: POST /queue/join  →  EventSource /queue/data
// ── Netlify Proxy → HuggingFace Wan2.1 ────────────────────────
function t2vLog(logEl, stage, msg, type) {
  if (!logEl) return;
  const colors = { info:'#7878a0', ok:'#34d399', err:'#f05252', stage:'#fbbf24', active:'#60a5fa' };
  const line = document.createElement('div');
  line.style.cssText = 'font-size:11px;line-height:1.8;display:flex;gap:6px;';
  line.innerHTML = '<span style="color:#fbbf24;font-weight:700;flex-shrink:0">[S' + stage + ']</span><span style="color:' + (colors[type]||colors.info) + '">' + msg + '</span>';
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}
function t2vBuildPrompt(rawText, slides) {
  const base = rawText || slides.map(s => typeof s==='string'?s:s.text||'').join('. ');
  return {
    positive: base + ', photorealistic cinematic masterpiece, 8k resolution, cinematic volumetric lighting, dynamic fluid motion, shot on 35mm lens, hyper-detailed, trending on artstation',
    negative: 'cartoon, anime, 3d render, drawing, painting, static, text overlay, watermark, low quality, blurry, choppy, glitch'
  };
}
async function renderVideoWithAudio(slides, mood, rawText, logEl) {
  if (logEl) logEl.innerHTML = '';
  const log = function(s,m,t){ t2vLog(logEl,s,m,t); };
  log(1,'News content analyze হচ্ছে...','stage');
  await new Promise(function(r){setTimeout(r,300);});
  var moodScenes = {
    urgent:'dark dramatic crime scene bangladesh night red lighting cinematic',
    sad:'somber bangladesh village night blue lighting mournful atmosphere',
    angry:'tense protest crowd bangladesh dramatic orange lighting',
    positive:'bright bangladesh celebration golden hour joyful',
    neutral:'bangladesh news studio dramatic professional lighting'
  };
  var scenePrompt = moodScenes[mood] || moodScenes.neutral;
  var rt = rawText || '';
  if (rt.indexOf('খুন')>-1||rt.indexOf('হত্যা')>-1||rt.indexOf('মাদক')>-1)
    scenePrompt='dark crime scene bangladesh village night police emergency cinematic red blue lighting no text';
  else if (rt.indexOf('বন্যা')>-1||rt.indexOf('পানি')>-1)
    scenePrompt='flood bangladesh dramatic aerial cinematic no text';
  else if (rt.indexOf('আগুন')>-1)
    scenePrompt='fire night bangladesh orange flames dramatic cinematic no text';
  else if (rt.indexOf('আন্দোলন')>-1||rt.indexOf('বিক্ষোভ')>-1)
    scenePrompt='protest crowd bangladesh dramatic lighting cinematic no text';
  var fullPrompt = encodeURIComponent(scenePrompt+', photorealistic 8k cinematic volumetric lighting no text no watermark no logo');
  log(2,'AI Background frames generate হচ্ছে...','stage');
  var frames = [];
  for (var i=0;i<3;i++) {
    log(2,'Background '+(i+1)+'/3 তৈরি হচ্ছে...','info');
    try {
      var seed = Math.floor(Math.random()*99999)+i*1111;
      var furl = 'https://image.pollinations.ai/prompt/'+fullPrompt+'?width=608&height=1080&seed='+seed+'&nologo=true&model=flux';
      var fres = await fetch(furl);
      if (!fres.ok) throw new Error('failed');
      var fblob = await fres.blob();
      var fimgUrl = URL.createObjectURL(fblob);
      await new Promise(function(resolve){
        var img = new Image();
        img.onload = function(){ frames.push(img); resolve(); };
        img.onerror = function(){ resolve(); };
        img.src = fimgUrl;
      });
    } catch(fe){ log(2,'Frame '+(i+1)+' skip','info'); }
  }
  log(3,'Audio + Video compile হচ্ছে...','stage');
  var W=608, H=1080, FPS=24;
  var canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  var ctx2d = canvas.getContext('2d');
  var slideTexts = slides.map(function(s){return typeof s==='string'?s:(s.text||'');}).filter(Boolean);
  if (!slideTexts.length) slideTexts.push(rt.substring(0,120));
  var logoImg = null;
  await new Promise(function(resolve){
    var img = new Image(); img.crossOrigin='anonymous';
    img.onload=function(){ logoImg=img; resolve(); };
    img.onerror=function(){ resolve(); };
    img.src='/logoc7c3.png';
  });
  var audioCtx2 = new (window.AudioContext||window.webkitAudioContext)();
  var audioDest = audioCtx2.createMediaStreamDestination();
  var videoStream = canvas.captureStream(FPS);
  var combinedStream;
  try {
    combinedStream = new MediaStream(videoStream.getVideoTracks().concat(audioDest.stream.getAudioTracks()));
  } catch(e) { combinedStream = videoStream; }
  var recorder, chunks=[];
  try {
    recorder = new MediaRecorder(combinedStream, {mimeType:'video/webm;codecs=vp9,opus', videoBitsPerSecond:6000000});
  } catch(e) {
    try { recorder = new MediaRecorder(combinedStream, {mimeType:'video/webm', videoBitsPerSecond:4000000}); }
    catch(e2) { recorder = new MediaRecorder(videoStream, {videoBitsPerSecond:4000000}); }
  }
  recorder.ondataavailable = function(e){ if(e.data.size>0) chunks.push(e.data); };
  var SLIDE_DUR = FPS*4;
  var TOTAL_SLIDES = slideTexts.length+1;
  var TOTAL_FRAMES = TOTAL_SLIDES*SLIDE_DUR;
  var accentMap = {urgent:'#ef4444',sad:'#818cf8',positive:'#22c55e',angry:'#f97316',neutral:'#a855f7'};
  var accent = accentMap[mood]||'#a855f7';
  var moodLabelMap = {urgent:'🔴 জরুরি সংবাদ',sad:'😢 দুঃখজনক',positive:'✅ ইতিবাচক',angry:'⚠️ গুরুত্বপূর্ণ',neutral:'📢 সর্বশেষ'};
  var lastAudioSlide = -1;
  var videoBlob = await new Promise(function(resolve){
    recorder.onstop=function(){ resolve(new Blob(chunks,{type:'video/webm'})); };
    recorder.start(100);
    var frameNum=0;
    function drawNextFrame(){
      if(frameNum>=TOTAL_FRAMES){ recorder.stop(); return; }
      var slideIdx = Math.floor(frameNum/SLIDE_DUR);
      var slideFrame = frameNum%SLIDE_DUR;
      var t = slideFrame/SLIDE_DUR;
      if(slideIdx !== lastAudioSlide) {
        lastAudioSlide = slideIdx;
        playSlideAudioToDestination(audioCtx2, audioDest, mood, slideIdx, TOTAL_SLIDES, 4.2);
      }
      if(frames.length>0){
        var bg = frames[slideIdx%frames.length];
        var zoom = 1+t*0.05;
        var ox=(W*(zoom-1))/2, oy=(H*(zoom-1))/2;
        ctx2d.drawImage(bg,-ox,-oy,W*zoom,H*zoom);
      } else {
        var bgGrad=ctx2d.createLinearGradient(0,0,0,H);
        bgGrad.addColorStop(0,'#0a0020'); bgGrad.addColorStop(1,'#060b18');
        ctx2d.fillStyle=bgGrad; ctx2d.fillRect(0,0,W,H);
      }
      ctx2d.fillStyle='rgba(0,0,0,0.52)'; ctx2d.fillRect(0,0,W,H);
      var vig=ctx2d.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.85);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(0,0,0,0.55)');
      ctx2d.fillStyle=vig; ctx2d.fillRect(0,0,W,H);
      ctx2d.fillStyle=accent; ctx2d.fillRect(0,0,W,8);
      ctx2d.fillStyle=accent; ctx2d.fillRect(0,8,W,56);
      ctx2d.fillStyle='#fff';
      ctx2d.font="bold 26px 'Noto Sans Bengali',Arial,sans-serif";
      ctx2d.textAlign='left'; ctx2d.fillText('◉ JOAF NEWS',20,46);
      ctx2d.font="bold 22px 'Noto Sans Bengali',Arial,sans-serif";
      ctx2d.textAlign='right'; ctx2d.fillStyle='rgba(255,255,255,0.9)';
      ctx2d.fillText(moodLabelMap[mood]||'📢 সংবাদ',W-16,46);
      var logoSize=180, logoY=90;
      ctx2d.save(); ctx2d.shadowColor=accent; ctx2d.shadowBlur=25;
      ctx2d.beginPath(); ctx2d.arc(W/2,logoY+logoSize/2,logoSize/2+6,0,Math.PI*2);
      ctx2d.strokeStyle=accent; ctx2d.lineWidth=3; ctx2d.stroke(); ctx2d.restore();
      if(logoImg) ctx2d.drawImage(logoImg,W/2-logoSize/2,logoY,logoSize,logoSize);
      else { ctx2d.fillStyle=accent; ctx2d.font='bold 40px Arial'; ctx2d.textAlign='center'; ctx2d.fillText('JOAF',W/2,logoY+90); }
      var dg=ctx2d.createLinearGradient(W/2-220,0,W/2+220,0);
      dg.addColorStop(0,'transparent'); dg.addColorStop(0.5,accent); dg.addColorStop(1,'transparent');
      ctx2d.fillStyle=dg; ctx2d.globalAlpha=Math.min(1,t*5);
      ctx2d.fillRect(W/2-220,logoY+logoSize+12,440,4); ctx2d.globalAlpha=1;
      var isOutro = slideIdx>=slideTexts.length;
      if(!isOutro){
        var rawT=(slideTexts[slideIdx]||'');
        var cleanT=rawT.replace(/#\S+/g,'').replace(/Tags?:.*/gi,'').trim();
        var len=cleanT.length;
        var fontSize=len<40?50:len<80?40:len<140?32:26;
        ctx2d.font='bold '+fontSize+'px \'Noto Sans Bengali\',Arial,sans-serif';
        ctx2d.textAlign='center';
        var words=cleanT.split(' '), lines2=[];
        var line2='';
        for(var wi=0;wi<words.length;wi++){
          var test=line2+words[wi]+' ';
          if(ctx2d.measureText(test).width>W-60&&line2){lines2.push(line2.trim());line2=words[wi]+' ';}
          else line2=test;
        }
        if(line2.trim()) lines2.push(line2.trim());
        var lineH=fontSize*1.6, startY2=logoY+logoSize+45;
        for(var li=0;li<Math.min(lines2.length,6);li++){
          var rev=Math.min(1,Math.max(0,t*6-li*0.4));
          ctx2d.globalAlpha=rev;
          ctx2d.shadowColor='rgba(0,0,0,0.9)'; ctx2d.shadowBlur=10;
          ctx2d.fillStyle=li%2===0?'#ffffff':(accent==='#ef4444'?'#fca5a5':accent==='#22c55e'?'#86efac':'#d8b4fe');
          ctx2d.fillText(lines2[li],W/2,startY2+li*lineH);
          ctx2d.shadowBlur=0; ctx2d.globalAlpha=1;
        }
        ctx2d.font='bold 20px Arial'; ctx2d.fillStyle=accent; ctx2d.textAlign='center';
        ctx2d.fillText('● '+(slideIdx+1)+' / '+slideTexts.length,W/2,H-170);
      } else {
        if(logoImg) ctx2d.drawImage(logoImg,W/2-110,H/2-260,220,220);
        ctx2d.font="bold 36px 'Noto Sans Bengali',Arial"; ctx2d.fillStyle='#fff'; ctx2d.textAlign='center';
        ctx2d.shadowColor=accent; ctx2d.shadowBlur=20;
        ctx2d.fillText('জুলাই অনলাইন অ্যাক্টিভিস্টস ফোরাম',W/2,H/2+20);
        ctx2d.shadowBlur=0;
        ctx2d.font='bold 26px Arial'; ctx2d.fillStyle=accent;
        ctx2d.fillText('www.julyforum.com',W/2,H/2+70);
      }
      var prog=frameNum/TOTAL_FRAMES;
      ctx2d.fillStyle='rgba(255,255,255,0.12)';
      ctx2d.beginPath(); ctx2d.roundRect(30,H-130,W-60,8,4); ctx2d.fill();
      ctx2d.fillStyle=accent;
      ctx2d.beginPath(); ctx2d.roundRect(30,H-130,(W-60)*prog,8,4); ctx2d.fill();
      ctx2d.fillStyle='rgba(0,0,0,0.5)'; ctx2d.fillRect(0,H-48,W,48);
      ctx2d.font='bold 18px Arial'; ctx2d.fillStyle=accent; ctx2d.textAlign='center';
      ctx2d.fillText('www.julyforum.com',W/2,H-18);
      ctx2d.fillStyle='rgba(255,255,255,0.6)'; ctx2d.fillRect(0,H-6,W,6);
      frameNum++;
      setTimeout(drawNextFrame, 1000/FPS);
    }
    drawNextFrame();
    log(4,'Frames + Audio compile হচ্ছে...','active');
  });
  log(5,'Video ready — '+(videoBlob.size/1024/1024).toFixed(1)+' MB','ok');
  return videoBlob;
}
function playSlideAudioToDestination(audioCtx, dest, mood, slideIndex, totalSlides, duration) {
  var master = audioCtx.createGain();
  var now = audioCtx.currentTime;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.65, now+0.25);
  master.gain.setValueAtTime(0.65, now+duration-0.4);
  master.gain.linearRampToValueAtTime(0, now+duration);
  try { master.connect(dest); } catch(e){}
  try { master.connect(audioCtx.destination); } catch(e){}
  function makeRev(d,dc){
    var len=audioCtx.sampleRate*d;
    var buf=audioCtx.createBuffer(2,len,audioCtx.sampleRate);
    for(var ch=0;ch<2;ch++){var da=buf.getChannelData(ch);for(var i=0;i<len;i++)da[i]=(Math.random()*2-1)*Math.pow(1-i/len,dc);}
    var conv=audioCtx.createConvolver(); conv.buffer=buf;
    var g=audioCtx.createGain(); g.gain.value=0.28;
    conv.connect(g); g.connect(master); return conv;
  }
  var rev=makeRev(2,3);
  function n(freq,start,dur,vol,type){
    vol=vol||0.25; type=type||'sine';
    var o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0,now+start);
    g.gain.linearRampToValueAtTime(vol,now+start+0.05);
    g.gain.setValueAtTime(vol*0.7,now+start+dur*0.6);
    g.gain.linearRampToValueAtTime(0,now+start+dur);
    o.connect(g); g.connect(master); g.connect(rev);
    o.start(now+start); o.stop(now+start+dur+0.1);
  }
  function p(start,vol,freq,dec){
    vol=vol||0.4; freq=freq||80; dec=dec||0.1;
    var o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.frequency.setValueAtTime(freq,now+start);
    o.frequency.exponentialRampToValueAtTime(freq*0.3,now+start+dec*2);
    g.gain.setValueAtTime(vol,now+start);
    g.gain.exponentialRampToValueAtTime(0.001,now+start+dec*3);
    o.connect(g); g.connect(master); o.start(now+start); o.stop(now+start+dec*3+0.1);
  }
  function pad(freq,start,dur,vol){
    vol=vol||0.12;
    [1,1.5,2,3].forEach(function(h,i){
      var o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type='sine'; o.frequency.value=freq*h;
      g.gain.setValueAtTime(0,now+start);
      g.gain.linearRampToValueAtTime(vol/(i+1),now+start+0.8);
      g.gain.setValueAtTime(vol/(i+1),now+start+dur-0.4);
      g.gain.linearRampToValueAtTime(0,now+start+dur);
      o.connect(g); g.connect(rev); o.start(now+start); o.stop(now+start+dur+0.1);
    });
  }
  var si = slideIndex % 3;
  if(mood==='urgent'){
    if(si===0){ [220,277,330,440,554].forEach(function(f,i){ n(f,i*0.28,0.35,0.28,'sawtooth'); }); [0,0.5,1,1.5,2,2.5].forEach(function(t){ p(t,0.55,65,0.1); }); pad(110,0,duration,0.1); }
    else if(si===1){ [330,415,494,659,554,440].forEach(function(f,i){ n(f,i*0.4,0.5,0.3,'square'); }); [0,0.2,0.5,0.7,1.2,1.4].forEach(function(t){ p(t,0.5,75,0.09); }); pad(165,0,duration,0.12); }
    else { [440,554,659,880,784,659].forEach(function(f,i){ n(f,i*0.35,0.45,0.32,'sawtooth'); }); [0,0.15,0.3,0.6,0.75,0.9].forEach(function(t){ p(t,0.65,58,0.11); }); pad(220,0,duration,0.14); }
  } else if(mood==='sad'){
    if(si===0){ [523,466,415,370,330,294,261].forEach(function(f,i){ n(f,i*0.65,0.85,0.2,'sine'); }); pad(130,0,duration,0.1); [0,2,4].forEach(function(t){ p(t,0.12,88,0.22); }); }
    else if(si===1){ [261,294,330,311,294,261,247,261].forEach(function(f,i){ n(f,i*0.5,0.7,0.18,'sine'); }); pad(130,0,duration,0.08); [0,1.5,3].forEach(function(t){ p(t,0.1,80,0.25); }); }
    else { [294,330,370,349,330,311,294,261].forEach(function(f,i){ n(f,i*0.55,0.75,0.2,'sine'); }); pad(196,0,duration,0.1); }
  } else if(mood==='positive'){
    if(si===0){ [261,329,392,523,659,784,880].forEach(function(f,i){ n(f,i*0.28,0.38,0.26,'triangle'); }); [0,0.5,1,1.5,2].forEach(function(t){ p(t,0.28,100,0.07); }); pad(196,0,duration,0.1); }
    else if(si===1){ [523,659,784,880,1047,880,784,659].forEach(function(f,i){ n(f,i*0.38,0.42,0.28,'triangle'); }); [0,0.25,0.5,0.75,1].forEach(function(t){ p(t,0.32,110,0.06); }); pad(261,0,duration,0.12); }
    else { [784,880,988,1047,988,880,784].forEach(function(f,i){ n(f,i*0.32,0.38,0.3,'triangle'); }); [0,0.3,0.6,0.9].forEach(function(t){ p(t,0.38,120,0.06); }); pad(392,0,duration,0.14); }
  } else if(mood==='angry'){
    if(si===0){ [110,138,165,220,196].forEach(function(f,i){ n(f,i*0.45,0.65,0.28,'sawtooth'); }); [0,0.25,0.5,0.75,1,1.25].forEach(function(t){ p(t,0.6,52,0.14); }); pad(55,0,duration,0.12); }
    else if(si===1){ [0,0.2,0.4,0.6,0.8,1,1.2,1.4].forEach(function(t,i){ p(t,i%2===0?0.68:0.38,i%2===0?58:85,0.11); }); [165,220,196,247,220].forEach(function(f,i){ n(f,i*0.55,0.7,0.24,'square'); }); pad(110,0,duration,0.1); }
    else { [0,0.12,0.25,0.38,0.5,0.62,0.75,0.88].forEach(function(t,i){ p(t,0.72,i%3===0?52:72,0.1); }); [220,277,330,415,494].forEach(function(f,i){ n(f,i*0.38,0.48,0.28,'sawtooth'); }); pad(110,0,duration,0.14); }
  } else {
    if(si===0){ [261,329,392,329,392,466,392,329].forEach(function(f,i){ n(f,i*0.38,0.48,0.2,'triangle'); }); [0,1,2,3].forEach(function(t){ p(t,0.18,85,0.1); }); pad(130,0,duration,0.08); }
    else if(si===1){ [329,392,440,494,440,392,349,329].forEach(function(f,i){ n(f,i*0.42,0.52,0.22,'sine'); }); [0,1.5,3].forEach(function(t){ p(t,0.16,90,0.12); }); pad(196,0,duration,0.1); }
    else { [392,440,494,523,494,440,392,349].forEach(function(f,i){ n(f,i*0.45,0.55,0.2,'sine'); }); pad(261,0,duration,0.12); [0,2,4].forEach(function(t){ p(t,0.14,95,0.1); }); }
  }
  if(slideIndex>0){
    var wb=audioCtx.createBuffer(1,audioCtx.sampleRate*0.3,audioCtx.sampleRate);
    var wd=wb.getChannelData(0);
    for(var i=0;i<wd.length;i++) wd[i]=(Math.random()*2-1)*Math.sin(i/wd.length*Math.PI)*0.5;
    var ws=audioCtx.createBufferSource(); ws.buffer=wb;
    var wf=audioCtx.createBiquadFilter(); wf.type='bandpass';
    wf.frequency.setValueAtTime(700,now); wf.frequency.linearRampToValueAtTime(150,now+0.3);
    var wg=audioCtx.createGain(); wg.gain.value=0.25;
    ws.connect(wf); wf.connect(wg); wg.connect(master); ws.start(now);
  }
}
function playSlideSound(audioCtx, dest, mood, slideIndex, totalSlides) {
  const now = audioCtx.currentTime;
  const dur = 6.5;

  // ── MASTER GAIN ──────────────────────────────────────
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.7, now + 0.3);
  master.gain.setValueAtTime(0.7, now + dur - 0.5);
  master.gain.linearRampToValueAtTime(0, now + dur);
  master.connect(dest);

  // ── REVERB (convolution) ────────────────────────────
  function makeReverb(duration, decay) {
    const len = audioCtx.sampleRate * duration;
    const buf = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    const conv = audioCtx.createConvolver();
    conv.buffer = buf;
    return conv;
  }
  const reverb = makeReverb(2.5, 3);
  const reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.35;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  // ── HELPER: play a note ─────────────────────────────
  function note(freq, startT, duration, vol=0.4, type='sine', detune=0) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.setValueAtTime(0, now + startT);
    g.gain.linearRampToValueAtTime(vol, now + startT + 0.04);
    g.gain.setValueAtTime(vol * 0.7, now + startT + duration * 0.5);
    g.gain.linearRampToValueAtTime(0, now + startT + duration);
    osc.connect(g); g.connect(master); g.connect(reverb);
    osc.start(now + startT); osc.stop(now + startT + duration + 0.05);
  }

  // ── HELPER: percussion hit ──────────────────────────
  function percHit(startT, vol=0.5, freq=80, decay=0.08) {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * decay * 3, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * decay));
    }
    // Pitched body
    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, now + startT);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + startT + decay * 2);
    og.gain.setValueAtTime(vol, now + startT);
    og.gain.exponentialRampToValueAtTime(0.001, now + startT + decay * 3);
    osc.connect(og); og.connect(master);
    osc.start(now + startT); osc.stop(now + startT + decay * 3 + 0.05);
    // Noise layer
    const ns = audioCtx.createBufferSource();
    ns.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.value = vol * 0.4;
    ns.connect(ng); ng.connect(master);
    ns.start(now + startT);
  }

  // ── HELPER: string sweep (বাউল/সেতার feel) ─────────
  function stringSweep(freqs, startT, stepDur, vol=0.3) {
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      // Add slight vibrato
      const vibrato = audioCtx.createOscillator();
      const vibratoGain = audioCtx.createGain();
      vibrato.frequency.value = 5.5;
      vibratoGain.gain.value = 3;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now + startT + i * stepDur);
      vibrato.stop(now + startT + i * stepDur + stepDur + 0.1);
      g.gain.setValueAtTime(0, now + startT + i * stepDur);
      g.gain.linearRampToValueAtTime(vol, now + startT + i * stepDur + 0.06);
      g.gain.linearRampToValueAtTime(0, now + startT + i * stepDur + stepDur * 0.9);
      osc.connect(g); g.connect(master); g.connect(reverb);
      osc.start(now + startT + i * stepDur);
      osc.stop(now + startT + i * stepDur + stepDur + 0.1);
    });
  }

  // ── HELPER: dhol/tabla pattern ──────────────────────
  function dhol(pattern, startT, tempo, vol=0.5) {
    // pattern: array of {t: beat_offset, f: freq, d: decay}
    pattern.forEach(hit => {
      percHit(startT + hit.t * tempo, vol * (hit.v || 1), hit.f || 80, hit.d || 0.1);
    });
  }

  // ── BENGALI RAGAS — mood based ──────────────────────
  // Bhairav (dawn/solemn): D Eb F G A Bb C D
  // Bhairavi (sad/devotional): C D Eb F G Ab Bb C
  // Yaman (heroic/positive): C D E F# G A B C
  // Durga (powerful): C D F G A C
  // Kafi (neutral/folk): C D Eb F G A Bb C

  const RAGAS = {
    urgent:   [293, 330, 370, 392, 440, 494, 554, 587],  // Durga — powerful
    sad:      [261, 277, 311, 349, 392, 415, 466, 523],  // Bhairavi — sorrowful
    positive: [261, 293, 329, 370, 392, 440, 493, 523],  // Yaman — uplifting
    angry:    [220, 247, 277, 330, 370, 392, 440, 466],  // Bhairav — intense
    neutral:  [261, 293, 311, 349, 392, 440, 466, 523],  // Kafi — folk
  };
  const raga = RAGAS[mood] || RAGAS.neutral;
  const prog = slideIndex / Math.max(totalSlides - 1, 1); // 0→1 across slides

  // ── SLIDE-SPECIFIC CINEMATIC COMPOSITION ────────────
  if (mood === 'urgent') {
    // Dhol-heavy, intense, rising tension
    // Tabla pattern: dha dhin dhin dha
    const tablaPattern = [
      {t:0, f:90, d:0.12, v:1.2}, {t:0.5, f:120, d:0.06, v:0.7},
      {t:1, f:90, d:0.12, v:1.0}, {t:1.5, f:120, d:0.06, v:0.6},
      {t:2, f:90, d:0.12, v:1.1}, {t:2.5, f:150, d:0.05, v:0.8},
      {t:3, f:90, d:0.15, v:1.3},
    ];
    const beat = 0.5 - slideIndex * 0.025; // gets faster each slide
    dhol(tablaPattern, 0, beat, 0.5 + prog * 0.2);

    // Urgent string melody — like Shehnai alarm
    const slideRaga = raga.slice(slideIndex % 4, (slideIndex % 4) + 5);
    stringSweep(slideRaga, 0.1, 0.7, 0.25 + prog * 0.15);
    stringSweep([...slideRaga].reverse(), 3.7, 0.55, 0.2);

    // Bass drone
    note(raga[0] / 2, 0, dur * 0.8, 0.15, 'triangle');
    note(raga[0] / 2, dur * 0.8, dur * 0.2, 0.1, 'triangle');

    // Impact hit at slide start
    percHit(0, 0.8, 60, 0.15);
    if (slideIndex === totalSlides - 1) {
      // Final slide: climax hits
      percHit(0.25, 0.6, 80, 0.1);
      percHit(0.5, 0.5, 100, 0.08);
    }

  } else if (mood === 'sad') {
    // Baul/folk feel — like একতারা + দোতারা
    // Slow, mournful, reflective
    const sadMelody = [
      [raga[4], 0.0, 1.2],
      [raga[3], 1.3, 0.9],
      [raga[2], 2.3, 1.0],
      [raga[1], 3.4, 0.8],
      [raga[0], 4.3, 1.5 + (1 - prog) * 0.5],
    ];
    sadMelody.forEach(([f, t, d]) => note(f, t, d, 0.3 - prog * 0.05, 'sine'));

    // Harmonics (দোতারা overtone)
    sadMelody.forEach(([f, t, d]) => note(f * 1.5, t + 0.08, d * 0.7, 0.12, 'sine', 5));

    // Soft percussion — like duggi
    for (let t = 0; t < dur; t += 1.8) {
      percHit(t, 0.2, 70, 0.2);
    }
    // Bass pad
    note(raga[0] / 2, 0, dur, 0.1, 'sine');

  } else if (mood === 'positive') {
    // Joyful — like Baul dance + dhol celebration
    const joyPhrase = [
      raga[0], raga[2], raga[4], raga[6],
      raga[5], raga[4], raga[2], raga[0]
    ];
    // Two-octave arpeggio
    joyPhrase.forEach((f, i) => {
      note(f, i * 0.55, 0.5, 0.28, 'triangle');
      note(f * 2, i * 0.55 + 0.1, 0.35, 0.12, 'sine'); // octave shimmer
    });

    // Repeat with variation
    joyPhrase.forEach((f, i) => {
      note(f * 1.5, 4.5 + i * 0.25, 0.22, 0.18, 'triangle');
    });

    // Festive dhol
    const festDhol = [
      {t:0,f:100,d:0.1,v:1}, {t:0.25,f:140,d:0.05,v:0.6},
      {t:0.5,f:100,d:0.1,v:0.8}, {t:0.75,f:160,d:0.04,v:0.5},
      {t:1.0,f:100,d:0.12,v:1.1},
    ];
    dhol(festDhol, 0, 0.5, 0.4);
    dhol(festDhol, 2.5, 0.45, 0.45);

  } else if (mood === 'angry') {
    // Heavy — like war drum + intense সানাই
    // Powerful rhythm: dhamaar taal feel
    const warDrum = [
      {t:0,f:55,d:0.2,v:1.4}, {t:0.33,f:70,d:0.1,v:0.8},
      {t:0.67,f:55,d:0.18,v:1.2}, {t:1.0,f:55,d:0.2,v:1.5},
      {t:1.33,f:80,d:0.08,v:0.7}, {t:1.67,f:55,d:0.2,v:1.3},
    ];
    dhol(warDrum, 0, 0.45 - slideIndex * 0.015, 0.55 + prog * 0.25);

    // Aggressive melody — rising each slide
    const angryMel = raga.slice(0, 5).map((f, i) => [f, i * 0.8, 0.75]);
    angryMel.forEach(([f, t, d]) => {
      note(f, t, d, 0.25, 'sawtooth');
      note(f * 0.5, t, d, 0.1, 'square'); // sub bass
    });

    // Distorted impact
    percHit(0, 1.0, 40, 0.25);
    if (slideIndex % 2 === 0) percHit(0.15, 0.7, 60, 0.18);

  } else {
    // NEUTRAL — Cinematic news documentary feel
    // Like বাংলাদেশের documentary music — contemplative, serious
    const docMelody = [
      [raga[0], 0.0, 1.5],
      [raga[2], 1.6, 1.2],
      [raga[4], 2.9, 1.0],
      [raga[3], 4.0, 0.8],
      [raga[5], 4.9, dur - 4.9],
    ];
    docMelody.forEach(([f, t, d], i) => {
      note(f, t, d, 0.22 + i * 0.02, 'triangle');
      note(f * 1.5, t + 0.15, d * 0.6, 0.08, 'sine'); // harmony
    });

    // Soft tabla underscore
    for (let t = 0; t < dur; t += 1.0) {
      percHit(t, 0.18, 90, 0.09);
      if (t + 0.5 < dur) percHit(t + 0.5, 0.10, 120, 0.06);
    }

    // Pad/drone
    note(raga[0] / 2, 0, dur, 0.08, 'sine');
    note(raga[4] / 2, 0.5, dur - 0.5, 0.05, 'sine');
  }

  // ── CROSS-SLIDE PROGRESSION ─────────────────────────
  // Each slide gets louder/more intense as story builds
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.5 + prog * 0.35, now + 0.3);
  master.gain.setValueAtTime(0.5 + prog * 0.35, now + dur - 0.6);
  master.gain.linearRampToValueAtTime(0, now + dur);

  // ── SLIDE TRANSITION WHOOSH ─────────────────────────
  if (slideIndex > 0) {
    const whooshBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
    const wd = whooshBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) {
      wd[i] = (Math.random() * 2 - 1) * Math.sin(i / wd.length * Math.PI);
    }
    const whooshSrc = audioCtx.createBufferSource();
    whooshSrc.buffer = whooshBuf;
    const whooshFilter = audioCtx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(800, now);
    whooshFilter.frequency.linearRampToValueAtTime(200, now + 0.4);
    const whooshGain = audioCtx.createGain();
    whooshGain.gain.value = 0.25;
    whooshSrc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(master);
    whooshSrc.start(now);
  }
}


// ═══════════════════════════════════════════════════════════
// SLIDE THEMES — প্রতিটা slide এর নিজস্ব unique color palette
// ═══════════════════════════════════════════════════════════
const SLIDE_THEMES = [
  // Slide 0 — Deep Aurora (পটভূমি)
  { bg: ['#0a0020','#1a0050','#0d0035'], accent: '#a855f7', glow: '#7c3aed', sec: '#f0abfc', text: '#faf5ff', name: 'aurora' },
  // Slide 1 — Cyber Red (মূল ঘটনা)
  { bg: ['#1a0000','#2d0505','#0d0000'], accent: '#ef4444', glow: '#dc2626', sec: '#fca5a5', text: '#fff', name: 'cyber' },
  // Slide 2 — Ocean Neon (প্রভাব)
  { bg: ['#001825','#002d40','#001018'], accent: '#06b6d4', glow: '#0891b2', sec: '#67e8f9', text: '#ecfeff', name: 'ocean' },
  // Slide 3 — Golden Empire (বিশ্লেষণ)
  { bg: ['#1a1000','#2d1f00','#0d0800'], accent: '#f59e0b', glow: '#d97706', sec: '#fde68a', text: '#fffbeb', name: 'gold' },
  // Slide 4 — Matrix Green (আহ্বান)
  { bg: ['#001a00','#002d00','#000d00'], accent: '#22c55e', glow: '#16a34a', sec: '#86efac', text: '#f0fdf4', name: 'matrix' },
];

// মুড অনুযায়ী theme override
const MOOD_OVERRIDE = {
  urgent:   { accent: '#ef4444', glow: '#ff0000', sec: '#fca5a5' },
  sad:      { accent: '#818cf8', glow: '#6366f1', sec: '#c7d2fe' },
  positive: { accent: '#22c55e', glow: '#16a34a', sec: '#86efac' },
  angry:    { accent: '#f97316', glow: '#ea580c', sec: '#fed7aa' },
  neutral:  { accent: '#a855f7', glow: '#7c3aed', sec: '#d8b4fe' },
};

// Dynamic theme map — AI can request any of these
const DYNAMIC_THEMES = {
  aurora:   { bg:['#0a0020','#1a0050','#0d0035'], accent:'#a855f7', glow:'#7c3aed', sec:'#f0abfc', text:'#faf5ff' },
  cyber:    { bg:['#1a0000','#2d0505','#0d0000'], accent:'#ef4444', glow:'#dc2626', sec:'#fca5a5', text:'#fff' },
  ocean:    { bg:['#001825','#002d40','#001018'], accent:'#06b6d4', glow:'#0891b2', sec:'#67e8f9', text:'#ecfeff' },
  gold:     { bg:['#1a1000','#2d1f00','#0d0800'], accent:'#f59e0b', glow:'#d97706', sec:'#fde68a', text:'#fffbeb' },
  matrix:   { bg:['#001a00','#002d00','#000d00'], accent:'#22c55e', glow:'#16a34a', sec:'#86efac', text:'#f0fdf4' },
  fire:     { bg:['#1a0500','#2d0d00','#0d0200'], accent:'#ff6b00', glow:'#ff3d00', sec:'#ffad80', text:'#fff8f0' },
  storm:    { bg:['#0d0d1a','#1a1a2d','#060610'], accent:'#7c83ff', glow:'#4c55ff', sec:'#b8bcff', text:'#f0f0ff' },
  blood:    { bg:['#1a0000','#2d0000','#0d0000'], accent:'#cc0000', glow:'#ff0000', sec:'#ff6666', text:'#fff0f0' },
  galaxy:   { bg:['#000510','#000d20','#000208'], accent:'#818cf8', glow:'#4f46e5', sec:'#c7d2fe', text:'#eef2ff' },
  neon:     { bg:['#000d10','#001a1a','#000508'], accent:'#00ffcc', glow:'#00ccaa', sec:'#80ffe8', text:'#f0fffa' },
  forest:   { bg:['#001000','#001a00','#000800'], accent:'#4ade80', glow:'#16a34a', sec:'#bbf7d0', text:'#f0fdf4' },
  desert:   { bg:['#1a1000','#2d2000','#0d0800'], accent:'#fb923c', glow:'#ea580c', sec:'#fed7aa', text:'#fff7ed' },
  ice:      { bg:['#001020','#001830','#000810'], accent:'#67e8f9', glow:'#22d3ee', sec:'#cffafe', text:'#ecfeff' },
  volcanic: { bg:['#1a0500','#300a00','#0d0200'], accent:'#ff4500', glow:'#ff2200', sec:'#ff9980', text:'#fff5f0' },
  cosmic:   { bg:['#050010','#0d0025','#020008'], accent:'#e879f9', glow:'#d946ef', sec:'#f5d0fe', text:'#fdf4ff' },
};

// bg draw function map
const THEME_BG_FN = {
  aurora: drawBg_Aurora, cyber: drawBg_Cyber, ocean: drawBg_Ocean,
  gold: drawBg_Gold, matrix: drawBg_Matrix,
  fire: (ctx,w,h,c,t,rand) => {
    ctx.fillStyle=c.bg[0]; ctx.fillRect(0,0,w,h);
    const g=ctx.createRadialGradient(w/2,h,0,w/2,h,h*0.8);
    g.addColorStop(0,c.accent+'88'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  },
  storm: (ctx,w,h,c,t,rand) => {
    ctx.fillStyle=c.bg[0]; ctx.fillRect(0,0,w,h);
    for(let i=0;i<5;i++){
      const y=h*(0.1+i*0.2)+Math.sin(t*3+i)*60;
      const g=ctx.createLinearGradient(0,y-100,0,y+100);
      g.addColorStop(0,'transparent'); g.addColorStop(0.5,c.accent+'33'); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,y-100,w,200);
    }
  },
  blood: drawBg_Cyber,
  galaxy: drawBg_Aurora,
  neon: (ctx,w,h,c,t,rand) => {
    ctx.fillStyle=c.bg[0]; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.globalAlpha=0.08;
    for(let i=0;i<15;i++){
      const y=(h/15)*i+(t*80)%(h/15);
      ctx.fillStyle=c.accent; ctx.fillRect(0,y,w,2);
    }
    ctx.restore();
  },
  forest: drawBg_Matrix,
  desert: drawBg_Gold,
  ice: drawBg_Ocean,
  volcanic: drawBg_Cyber,
  cosmic: drawBg_Aurora,
};

function getTheme(index, mood, aiTheme='') {
  // AI theme overrides everything
  if (aiTheme && DYNAMIC_THEMES[aiTheme]) {
    const dt = DYNAMIC_THEMES[aiTheme];
    const moodOv = MOOD_OVERRIDE[mood] || {};
    return { ...dt, bgFn: THEME_BG_FN[aiTheme] || drawBg_Aurora, name: aiTheme, bg: dt.bg };
  }
  const base = SLIDE_THEMES[index % SLIDE_THEMES.length];
  const ov = MOOD_OVERRIDE[mood] || {};
  return { ...base, ...ov };
}

// ═══════════════════════════════════════════════════════════
// BACKGROUND GENERATORS — প্রতি slide আলাদা bg
// ═══════════════════════════════════════════════════════════
function drawBg_Aurora(ctx, w, h, c, t, rand) {
  // Deep space + aurora waves
  ctx.fillStyle = c.bg[0]; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const y = h * (0.2 + i * 0.15) + Math.sin(t * 2 + i) * 80;
    const waveH = 200 + rand() * 150;
    const grad = ctx.createLinearGradient(0, y - waveH, 0, y + waveH);
    const colors = ['#7c3aed','#a855f7','#06b6d4','#0891b2','#4f46e5'];
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, colors[i % colors.length] + '55');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, y - waveH, w, waveH * 2);
  }
}

function drawBg_Cyber(ctx, w, h, c, t, rand) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1a0000'); bg.addColorStop(0.5, '#2d0505'); bg.addColorStop(1, '#0d0000');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Grid lines
  ctx.save(); ctx.globalAlpha = 0.07 + Math.sin(t * 4) * 0.03;
  ctx.strokeStyle = c.accent; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function drawBg_Ocean(ctx, w, h, c, t, rand) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#001825'); bg.addColorStop(0.5, '#002d40'); bg.addColorStop(1, '#001018');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Ripple rings from center
  for (let r = 0; r < 6; r++) {
    const radius = 100 + r * 160 + (t * 200) % 160;
    const alpha = Math.max(0, 0.25 - (r * 0.04));
    ctx.beginPath(); ctx.arc(w/2, h * 0.45, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(6,182,212,${alpha})`; ctx.lineWidth = 2; ctx.stroke();
  }
}

function drawBg_Gold(ctx, w, h, c, t, rand) {
  const bg = ctx.createRadialGradient(w/2, h * 0.3, 0, w/2, h/2, h);
  bg.addColorStop(0, '#2d1f00'); bg.addColorStop(0.6, '#1a1000'); bg.addColorStop(1, '#0d0800');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Golden rays
  ctx.save(); ctx.globalAlpha = 0.06;
  for (let r = 0; r < 12; r++) {
    const angle = (r / 12) * Math.PI * 2 + t * 0.3;
    ctx.beginPath(); ctx.moveTo(w/2, h * 0.35);
    ctx.lineTo(w/2 + Math.cos(angle) * 1200, h * 0.35 + Math.sin(angle) * 1200);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 40; ctx.stroke();
  }
  ctx.restore();
}

function drawBg_Matrix(ctx, w, h, c, t, rand) {
  ctx.fillStyle = '#001200'; ctx.fillRect(0, 0, w, h);
  // Falling code rain
  ctx.save(); ctx.font = '18px monospace'; ctx.fillStyle = '#22c55e';
  for (let col = 0; col < 20; col++) {
    const x = col * 56 + 10;
    for (let row = 0; row < 12; row++) {
      const y = ((row * 80 + t * 300 * (rand() * 0.5 + 0.5)) % (h + 100));
      const alpha = Math.max(0, 0.05 + rand() * 0.1 - row * 0.005);
      ctx.globalAlpha = alpha;
      ctx.fillText(String.fromCharCode(0x30A0 + Math.floor(rand() * 96)), x, y);
    }
  }
  ctx.globalAlpha = 1; ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// VFX LAYERS — mood specific overlays
// ═══════════════════════════════════════════════════════════
function drawSceneVFX(ctx, w, h, mood, t, rand) {
  if (mood === 'urgent') {
    // Fire embers
    for (let i = 0; i < 70; i++) {
      const x = rand() * w;
      const baseY = h - rand() * h * 0.5;
      const y = ((baseY - t * h * 0.4) % h + h) % h;
      const size = rand() * 10 + 2;
      const alpha = rand() * 0.8 * Math.sin(t * Math.PI);
      const r = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      r.addColorStop(0, `rgba(255,230,80,${alpha})`);
      r.addColorStop(0.4, `rgba(255,80,0,${alpha * 0.7})`);
      r.addColorStop(1, 'transparent');
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x, y, size * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // Screen shake / flash at start
    if (t < 0.08) {
      ctx.fillStyle = `rgba(255,60,0,${(0.08-t)/0.08*0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
    // Heat distortion scanlines
    ctx.save(); ctx.globalAlpha = 0.04;
    for (let y = 0; y < h; y += 8) {
      ctx.fillStyle = `rgba(255,100,0,1)`;
      ctx.fillRect(0, y + Math.sin(y * 0.1 + t * 20) * 3, w, 2);
    }
    ctx.restore();
  }

  if (mood === 'sad') {
    // Heavy rain
    for (let i = 0; i < 100; i++) {
      const x = rand() * w;
      const y = (rand() * h + t * h * 0.7) % h;
      const len = rand() * 35 + 10;
      const alpha = rand() * 0.5 + 0.1;
      ctx.strokeStyle = `rgba(120,160,255,${alpha})`;
      ctx.lineWidth = rand() * 1.5 + 0.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + len); ctx.stroke();
    }
    // Blue mist at bottom
    const mist = ctx.createLinearGradient(0, h * 0.65, 0, h);
    mist.addColorStop(0, 'transparent');
    mist.addColorStop(1, 'rgba(20,30,100,0.45)');
    ctx.fillStyle = mist; ctx.fillRect(0, 0, w, h);
  }

  if (mood === 'positive') {
    // Golden sparkling stars + confetti
    for (let i = 0; i < 70; i++) {
      const x = rand() * w;
      const y = (rand() * h - t * 80) % h;
      const size = rand() * 7 + 2;
      const twinkle = Math.sin(t * Math.PI * 8 + i * 1.7) * 0.5 + 0.5;
      const alpha = twinkle * (rand() * 0.7 + 0.2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * Math.PI * 3 + i);
      const colors = ['255,230,50','255,150,200','100,230,255','180,255,100'];
      ctx.fillStyle = `rgba(${colors[i%4]},${alpha})`;
      // Star shape
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const r = p % 2 === 0 ? size * 2.5 : size * 0.6;
        p === 0 ? ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r)
                : ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  if (mood === 'angry') {
    // Lightning bolts
    if (Math.sin(t * Math.PI * 18) > 0.8) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,200,50,0.9)`;
      ctx.lineWidth = 4; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 30;
      let lx = rand() * w, ly = 0; ctx.beginPath(); ctx.moveTo(lx, ly);
      while (ly < h * 0.55) { lx += (rand()-0.5)*140; ly += rand()*90+50; ctx.lineTo(lx, ly); }
      ctx.stroke(); ctx.restore();
    }
    // Flying sparks
    for (let i = 0; i < 50; i++) {
      const x = rand() * w;
      const y = (rand() * h + t * h * 0.25) % h;
      const alpha = rand() * 0.7;
      ctx.fillStyle = `rgba(255,${Math.floor(rand()*120+80)},0,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, rand()*5+1, 0, Math.PI*2); ctx.fill();
    }
  }

  if (mood === 'neutral') {
    // Flowing neon lines
    ctx.save(); ctx.globalAlpha = 0.1;
    for (let i = 0; i < 10; i++) {
      const y = (h/10)*i + (t*100)%(h/10);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0,'transparent'); g.addColorStop(0.5,'#a855f7'); g.addColorStop(1,'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, y, w, 3);
    }
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════
// ANIMATED DRAWING — text content কে visual এ convert করো
// ═══════════════════════════════════════════════════════════
function drawSlideIllustration(ctx, w, h, index, mood, t, rand, c, aiIllustration='') {
  const illustType = aiIllustration || ['people','alert','ripple','chart','megaphone'][index % 5];
  const illustY = 1560; // below text zone (textZoneEnd=1450)
  ctx.save();

  if (illustType === 'people' || illustType === 'map' || illustType === 'flag') {
    // People/community orbiting
    for (let r = 0; r < 5; r++) {
      const radius = 30 + r * 55 + Math.sin(t * Math.PI * 2 + r) * 15;
      const alpha = 0.12 + Math.sin(t * 3 + r) * 0.06;
      ctx.beginPath(); ctx.arc(w/2, illustY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent; ctx.globalAlpha = alpha; ctx.lineWidth = 3; ctx.stroke();
    }
    // People icons
    const iconColors = [c.accent, c.sec, c.glow];
    for (let i = 0; i < 5; i++) {
      const angle = (i/5) * Math.PI * 2 + t * 0.5;
      const dist = 130 + Math.sin(t * 2 + i) * 15;
      const ix = w/2 + Math.cos(angle) * dist;
      const iy = illustY + Math.sin(angle) * dist * 0.4;
      ctx.globalAlpha = 0.6 + Math.sin(t*4+i)*0.2;
      ctx.fillStyle = iconColors[i%3];
      ctx.beginPath(); ctx.arc(ix, iy - 20, 18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath();
      ctx.arc(ix, iy + 20, 28, 0, Math.PI, true);
      ctx.fill();
    }
  } else if (illustType === 'alert' || illustType === 'explosion' || illustType === 'pulse') {
    // Alert / Breaking news
    ctx.globalAlpha = 0.7;
    // Alert triangle
    const pulse = 1 + Math.sin(t * Math.PI * 6) * 0.1;
    ctx.save(); ctx.translate(w/2, illustY); ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.moveTo(0, -100); ctx.lineTo(100, 60); ctx.lineTo(-100, 60);
    ctx.closePath();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 8;
    ctx.shadowColor = c.glow; ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.fillStyle = c.accent + '22'; ctx.fill();
    ctx.fillStyle = c.text; ctx.font = "bold 80px 'Noto Sans Bengali', sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('!', 0, 50); ctx.restore();
    // Radiating waves
    for (let r = 0; r < 3; r++) {
      const rad = 120 + r * 80 + (t * 150) % 80;
      ctx.globalAlpha = Math.max(0, 0.3 - t * 0.3 - r * 0.08);
      ctx.beginPath(); ctx.arc(w/2, illustY, rad, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.stroke();
    }
  } else if (illustType === 'ripple' || illustType === 'wave' || illustType === 'spiral') {
    // Ripple / wave effect
    for (let r = 0; r < 6; r++) {
      const phase = (t + r * 0.15) % 1;
      const radius = phase * 250;
      const alpha = Math.max(0, (1 - phase) * 0.4);
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(w/2, illustY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 4 - phase * 3; ctx.stroke();
    }
    // Arrow pointing down (impact/effect)
    const ay = illustY - 80;
    const bounce = Math.sin(t * Math.PI * 4) * 12;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = c.accent;
    ctx.shadowColor = c.glow; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(w/2, ay + 80 + bounce); ctx.lineTo(w/2 - 60, ay + bounce);
    ctx.lineTo(w/2 - 20, ay + bounce); ctx.lineTo(w/2 - 20, ay - 60 + bounce);
    ctx.lineTo(w/2 + 20, ay - 60 + bounce); ctx.lineTo(w/2 + 20, ay + bounce);
    ctx.lineTo(w/2 + 60, ay + bounce); ctx.closePath(); ctx.fill();
  } else if (illustType === 'chart' || illustType === 'rise' || illustType === 'eye') {
    // Chart / analysis
    const bars = [0.65, 0.9, 0.45, 0.78, 0.55];
    const barW = 80, gap = 40;
    const totalW = bars.length * barW + (bars.length - 1) * gap;
    const startX = w/2 - totalW/2;
    const maxH = 160;
    const baseY = illustY + 80;
    bars.forEach((v, i) => {
      const animV = v * Math.min(1, t * 3 - i * 0.2);
      const bh = Math.max(0, animV * maxH);
      const bx = startX + i * (barW + gap);
      // Bar glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = c.accent;
      ctx.fillRect(bx - 4, baseY - maxH, barW + 8, maxH + 8);
      // Bar fill
      ctx.globalAlpha = 0.85;
      const barGrad = ctx.createLinearGradient(0, baseY, 0, baseY - bh);
      barGrad.addColorStop(0, c.glow);
      barGrad.addColorStop(1, c.sec);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(bx, baseY - bh, barW, bh, 6);
      ctx.fill();
    });
    // Baseline
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(startX - 10, baseY); ctx.lineTo(startX + totalW + 10, baseY); ctx.stroke();
  } else if (illustType === 'megaphone' || illustType === 'hand' || illustType === 'star') {
    // Megaphone / call to action
    const pulse = 1 + Math.sin(t * Math.PI * 5) * 0.08;
    ctx.save(); ctx.translate(w/2, illustY); ctx.scale(pulse, pulse);
    // Megaphone shape
    ctx.fillStyle = c.accent;
    ctx.shadowColor = c.glow; ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.85;
    // Body
    ctx.beginPath();
    ctx.moveTo(-30, -30); ctx.lineTo(-30, 30);
    ctx.lineTo(80, 70); ctx.lineTo(80, -70);
    ctx.closePath(); ctx.fill();
    // Horn
    ctx.beginPath();
    ctx.moveTo(80, -70); ctx.lineTo(160, -120);
    ctx.lineTo(160, 120); ctx.lineTo(80, 70);
    ctx.closePath();
    ctx.fillStyle = c.sec; ctx.fill();
    // Handle
    ctx.fillStyle = c.glow;
    ctx.fillRect(-60, -15, 35, 30);
    ctx.restore();
    // Sound waves
    for (let r = 0; r < 4; r++) {
      const phase = (t * 1.5 + r * 0.25) % 1;
      const sx = w/2 + 160 + phase * 180;
      const alpha = Math.max(0, (1 - phase) * 0.6);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(w/2 + 140, illustY, 30 + phase * 120, -0.8, 0.8);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 4; ctx.stroke();
    }
  } else if (illustType === 'fire' || illustType === 'broken' || illustType === 'chain') {
    // Fire / broken chains
    const fy = illustY;
    for (let fl = 0; fl < 8; fl++) {
      const fx = w/2 + (rand()-0.5)*300;
      const fh = 60 + rand()*80 + Math.sin(t*Math.PI*6+fl)*20;
      const alpha = 0.5 + rand()*0.4;
      const fg = ctx.createLinearGradient(fx, fy, fx, fy-fh);
      fg.addColorStop(0, `rgba(255,100,0,${alpha})`);
      fg.addColorStop(0.5, `rgba(255,200,0,${alpha*0.7})`);
      fg.addColorStop(1, 'transparent');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fg;
      const fw2 = 20 + rand()*30;
      ctx.beginPath();
      ctx.moveTo(fx-fw2/2, fy); ctx.lineTo(fx+fw2/2, fy);
      ctx.lineTo(fx+fw2/4, fy-fh); ctx.lineTo(fx-fw2/4, fy-fh);
      ctx.closePath(); ctx.fill();
    }
  } else if (illustType === 'shield' || illustType === 'clock') {
    // Shield / protection
    const sx = w/2, sy = illustY;
    const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.06;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(pulse, pulse);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -110); ctx.lineTo(90, -60);
    ctx.lineTo(90, 30); ctx.quadraticCurveTo(90, 110, 0, 130);
    ctx.quadraticCurveTo(-90, 110, -90, 30);
    ctx.lineTo(-90, -60); ctx.closePath();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 7;
    ctx.shadowColor = c.glow; ctx.shadowBlur = 25; ctx.stroke();
    ctx.fillStyle = c.accent + '18'; ctx.fill();
    ctx.shadowBlur = 0;
    // Check mark
    ctx.strokeStyle = c.sec; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-35, 10); ctx.lineTo(-5, 45); ctx.lineTo(45, -30); ctx.stroke();
    ctx.restore();
  } else {
    // Default: pulsing orb
    for (let r = 0; r < 5; r++) {
      const radius = 40 + r*50 + Math.sin(t*Math.PI*3+r)*15;
      ctx.globalAlpha = 0.1 + Math.sin(t*2+r)*0.05;
      ctx.beginPath(); ctx.arc(w/2, illustY, radius, 0, Math.PI*2);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(w/2, illustY, 35, 0, Math.PI*2);
    ctx.fillStyle = c.accent; ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
// MAIN SLIDE RENDERER
// ═══════════════════════════════════════════════════════════
function drawSlideAnimated(ctx, text, index, total, mood, t, aiLabel='', aiTheme='', aiIllustration='') {
  const w = 1080, h = 1920;
  const c = getTheme(index, mood, aiTheme);
  const rand = seededRand(index * 1337 + 42);

  // ── BACKGROUND ──────────────────────────────────────────
  const defaultBgFns = [drawBg_Aurora, drawBg_Cyber, drawBg_Ocean, drawBg_Gold, drawBg_Matrix];
  const bgDrawFn = c.bgFn || defaultBgFns[index % defaultBgFns.length];
  bgDrawFn(ctx, w, h, c, t, rand);

  // ── MOOD VFX ─────────────────────────────────────────────
  drawSceneVFX(ctx, w, h, mood, t, rand);

  // ── PARTICLES ───────────────────────────────────────────
  for (let p = 0; p < 50; p++) {
    const px = rand() * w;
    const py = rand() * h;
    const speed = rand() * 0.5 + 0.1;
    const animY = (py + t * speed * h * 0.35) % h;
    const alpha = (rand() * 0.45 + 0.1) * Math.abs(Math.sin(t * Math.PI + p * 0.5));
    const size = rand() * 4 + 1;
    ctx.beginPath(); ctx.arc(px, animY, size, 0, Math.PI * 2);
    ctx.fillStyle = c.accent;
    ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
  }

  // ── TRANSITION FLASH ─────────────────────────────────────
  if (t < 0.08) {
    ctx.save();
    ctx.globalAlpha = (0.08 - t) / 0.08 * 0.5;
    const flash = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 700);
    flash.addColorStop(0, c.accent);
    flash.addColorStop(1, 'transparent');
    ctx.fillStyle = flash; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── SCALE TRANSITION ──────────────────────────────────────
  const scale = t < 0.1 ? (0.9 + t / 0.1 * 0.1) : 1.0;
  ctx.save();
  ctx.translate(w/2, h/2); ctx.scale(scale, scale); ctx.translate(-w/2, -h/2);

  // ── TOP ACCENT BAR ───────────────────────────────────────
  const barGrad = ctx.createLinearGradient(0, 0, w, 0);
  barGrad.addColorStop(0, 'transparent');
  barGrad.addColorStop(0.3, c.accent);
  barGrad.addColorStop(0.7, c.sec);
  barGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = barGrad; ctx.fillRect(0, 0, w, 10);

  // Slide number badge removed

  // ── BREAKING NEWS TICKER BAR ─────────────────────────────
  const tickerH = 52;
  const tickerY = 12;
  // Ticker background
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, tickerY, w, tickerH);
  // BREAKING label
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 26px 'Noto Sans Bengali', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('◉ JOAF', 30, tickerY + 34);
  // Separator
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(130, tickerY + 10, 2, 32);
  // Mood badge
  const moodLabels = { urgent: '🔴 জরুরি', sad: '😢 দুঃখজনক', positive: '✅ ইতিবাচক', angry: '⚠️ গুরুত্বপূর্ণ', neutral: '📢 সংবাদ' };
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = "bold 24px 'Noto Sans Bengali', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText(moodLabels[mood] || '📢 সংবাদ', 142, tickerY + 34);

  // ── JOAF LOGO HEADER ──────────────────────────────────────
  const logoAlpha = Math.min(1, t * 6);
  ctx.globalAlpha = logoAlpha;

  // JOAF Original Logo
  ctx.save(); ctx.translate(w/2, 360);
  // Glow ring behind logo
  const glowR = 160 + Math.sin(t * Math.PI * 3) * 8;
  const ringGrad = ctx.createRadialGradient(0, 0, glowR * 0.5, 0, 0, glowR);
  ringGrad.addColorStop(0, c.accent + '30');
  ringGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = ringGrad;
  ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
  // Pulsing accent ring
  ctx.beginPath(); ctx.arc(0, 0, 155 + Math.sin(t * Math.PI * 4) * 6, 0, Math.PI * 2);
  ctx.strokeStyle = c.accent; ctx.lineWidth = 4;
  ctx.shadowColor = c.glow; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
  // Draw real logo image
  const logoSize = 260;
  if (_logoLoaded) {
    ctx.shadowColor = c.glow; ctx.shadowBlur = 30;
    ctx.drawImage(JOAF_LOGO_IMG, -logoSize/2, -logoSize/2, logoSize, logoSize);
    ctx.shadowBlur = 0;
  } else {
    // Fallback text
    ctx.fillStyle = c.accent; ctx.font = "bold 100px 'Noto Sans Bengali', sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('JOAF', 0, 30);
  }
  ctx.restore();

  ctx.globalAlpha = 1;

  // ── ANIMATED DIVIDER ──────────────────────────────────────
  const divProg = Math.min(1, t * 4);
  const divW = 520 * divProg;
  const divGrad = ctx.createLinearGradient(w/2 - divW/2, 0, w/2 + divW/2, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.4, c.accent);
  divGrad.addColorStop(0.6, c.sec);
  divGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = divGrad;
  ctx.fillRect(w/2 - divW/2, 510, divW, 5);

  // ── SLIDE LABEL ──────────────────────────────────────────
  const label = aiLabel || ['হুক','মূল ঘটনা','আহ্বান'][index] || `অংশ ${index+1}`;
  const labelAlpha = Math.min(1, t * 5);
  ctx.save();
  ctx.globalAlpha = labelAlpha;
  // Label pill
  ctx.font = "bold 32px 'Noto Sans Bengali', sans-serif";
  const lblW = Math.max(ctx.measureText(`◆ ${label} ◆`).width + 60, 200);
  ctx.fillStyle = c.accent + '22';
  ctx.beginPath(); ctx.roundRect(w/2 - lblW/2, 540, lblW, 54, 27); ctx.fill();
  ctx.fillStyle = c.accent;
  ctx.textAlign = 'center';
  ctx.shadowColor = c.glow; ctx.shadowBlur = 15;
  ctx.fillText(`◆ ${label} ◆`, w/2, 577);
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── MAIN TEXT ────────────────────────────────────────────
  const cleanText = text.replace(/^slide\s*\d+\s*[:\-]\s*/i, '').trim()
    .replace(/#[\u0980-\u09FF\w]+/g, '').replace(/Tags?:\s*.*/gi, '').trim();

  // Dynamic font size based on text length
  const charLen = cleanText.length;
  const fontSize = charLen <= 40 ? 64 : charLen <= 80 ? 52 : charLen <= 140 ? 44 : 36;
  const lineH = Math.round(fontSize * 1.55);
  const maxW = 940;

  ctx.font = `bold ${fontSize}px 'Noto Sans Bengali', sans-serif`;
  ctx.fillStyle = c.text;
  ctx.textAlign = 'center';

  const words = cleanText.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line.trim()); line = word + ' ';
    } else { line = test; }
  }
  if (line.trim()) lines.push(line.trim());

  // textStartY=620, illustY=1480 → available=860px
  // maxLines = how many lines fit before illustration zone
  const textStartY = 620;
  const textZoneEnd = 1450; // illustration starts below this
  const maxLines = Math.min(lines.length, Math.floor((textZoneEnd - textStartY) / lineH));
  lines.splice(maxLines);

  lines.forEach((l, li) => {
    const lineReveal = Math.min(1, Math.max(0, t * 7 - li * 0.35));
    const slideIn = (1 - lineReveal) * 40;
    ctx.globalAlpha = lineReveal;
    ctx.save();
    ctx.translate(0, slideIn);
    if (li % 2 === 1) {
      ctx.fillStyle = c.sec;
      ctx.shadowColor = c.sec; ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = c.text;
      ctx.shadowColor = c.glow; ctx.shadowBlur = 18;
    }
    ctx.font = `bold ${fontSize}px 'Noto Sans Bengali', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(l, w/2, textStartY + li * lineH);
    ctx.shadowBlur = 0;
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  // ── ILLUSTRATION DRAWING ─────────────────────────────────
  drawSlideIllustration(ctx, w, h, index, mood, t, seededRand(index * 777), c, aiIllustration);

  // ── PROGRESS BAR ─────────────────────────────────────────
  const barY = 1800;
  ctx.fillStyle = c.accent + '20';
  ctx.beginPath(); ctx.roundRect(60, barY, w - 120, 14, 7); ctx.fill();
  const totalProg = (index + t) / total;
  const progGrad = ctx.createLinearGradient(60, 0, 60 + (w-120)*totalProg, 0);
  progGrad.addColorStop(0, c.glow);
  progGrad.addColorStop(1, c.sec);
  ctx.fillStyle = progGrad;
  ctx.beginPath(); ctx.roundRect(60, barY, (w-120)*totalProg, 14, 7); ctx.fill();

  // ── PROGRESS DOTS ────────────────────────────────────────
  const dotY = 1840;
  const spacing = 52;
  const startDotX = w/2 - (total-1)*spacing/2;
  for (let d = 0; d < total; d++) {
    const isActive = d === index;
    const isPast = d < index;
    const dotR = isActive ? 12 + Math.sin(t*Math.PI*5)*3 : 8;
    ctx.beginPath(); ctx.arc(startDotX + d*spacing, dotY, dotR, 0, Math.PI*2);
    ctx.fillStyle = isActive ? c.accent : isPast ? c.sec + 'aa' : c.accent + '30';
    ctx.fill();
    if (isActive) {
      ctx.strokeStyle = c.glow; ctx.lineWidth = 3;
      ctx.shadowColor = c.glow; ctx.shadowBlur = 15;
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  }

  // ── WATERMARK ────────────────────────────────────────────
  // Bottom watermark bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 1870, w, 50);
  ctx.globalAlpha = 0.9;
  ctx.font = "bold 24px 'Noto Sans Bengali', sans-serif";
  ctx.fillStyle = c.accent;
  ctx.textAlign = 'center';
  ctx.fillText('📌 www.julyforum.com', w/2, 1900);
  ctx.globalAlpha = 1;

  // ── BOTTOM ACCENT BAR ────────────────────────────────────
  ctx.fillStyle = barGrad; ctx.fillRect(0, h - 10, w, 10);

  ctx.restore(); // restore scale transform
}

// ═══════════════════════════════════════════════════════════
// OUTRO SLIDE — Stunning finale
// ═══════════════════════════════════════════════════════════
function drawOutroSlide(ctx, mood, t) {
  const w = 1080, h = 1920;
  const c = {
    urgent:   { bg1: '#0d0000', bg2: '#2d0505', accent: '#ef4444', glow: '#ff0000', sec: '#fca5a5', text: '#fff' },
    sad:      { bg1: '#030318', bg2: '#0d1240', accent: '#818cf8', glow: '#6366f1', sec: '#c7d2fe', text: '#e0e7ff' },
    positive: { bg1: '#001208', bg2: '#003d18', accent: '#22c55e', glow: '#16a34a', sec: '#86efac', text: '#f0fdf4' },
    angry:    { bg1: '#0d0300', bg2: '#2d1000', accent: '#f97316', glow: '#ea580c', sec: '#fed7aa', text: '#fff7ed' },
    neutral:  { bg1: '#060b18', bg2: '#1e1034', accent: '#a855f7', glow: '#7c3aed', sec: '#d8b4fe', text: '#faf5ff' },
  }[mood] || { bg1: '#060b18', bg2: '#1e1034', accent: '#a855f7', glow: '#7c3aed', sec: '#d8b4fe', text: '#faf5ff' };

  // Background
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, h);
  bg.addColorStop(0, c.bg2); bg.addColorStop(1, c.bg1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // Starfield
  const rand = seededRand(999);
  for (let s = 0; s < 200; s++) {
    const sx = rand() * w, sy = rand() * h;
    const alpha = (Math.sin(t * Math.PI * 4 + s * 0.5) * 0.5 + 0.5) * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath(); ctx.arc(sx, sy, rand() * 2.5 + 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // Expanding DNA-like double helix rings
  for (let r = 0; r < 8; r++) {
    const radius = 100 + r * 120 + t * 400;
    const alpha = Math.max(0, 0.5 - t * 0.5 - r * 0.055);
    ctx.beginPath(); ctx.arc(w/2, h/2 - 150, radius, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(w/2-radius, h/2-150, w/2+radius, h/2-150);
    ringGrad.addColorStop(0, c.accent + '00');
    ringGrad.addColorStop(0.5, c.accent + Math.floor(alpha*255).toString(16).padStart(2,'0'));
    ringGrad.addColorStop(1, c.sec + '00');
    ctx.strokeStyle = ringGrad; ctx.lineWidth = 3 + r * 0.5; ctx.stroke();
  }

  // JOAF Big Logo — cinematic reveal
  const logoScale = t < 0.35 ? Math.pow(t / 0.35, 0.6) : 1;
  ctx.save();
  ctx.translate(w/2, h/2 - 200);
  ctx.scale(logoScale, logoScale);
  // Outer glow
  ctx.shadowColor = c.glow; ctx.shadowBlur = 80;
  ctx.fillStyle = c.accent;
  if (_logoLoaded) {
    const oLogoSize = 320;
    ctx.shadowColor = c.glow; ctx.shadowBlur = 60;
    ctx.drawImage(JOAF_LOGO_IMG, -oLogoSize/2, -oLogoSize/2, oLogoSize, oLogoSize);
    ctx.shadowBlur = 0;
  } else {
    ctx.font = "bold 200px 'Noto Sans Bengali', sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('JOAF', 0, 0);
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Taglines — staggered fade in
  const outroTextLines = ['জুলাই অনলাইন অ্যাক্টিভিস্টস ফোরাম', 'www.julyforum.com'];
  outroTextLines.forEach((line, i) => {
    const alpha = Math.min(1, Math.max(0, t * 5 - 1.5 - i * 0.8));
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    if (i === 0) {
      ctx.font = "bold 48px 'Noto Sans Bengali', sans-serif";
      ctx.fillStyle = c.text;
      ctx.fillText(line, w/2, h/2 + 80);
    } else {
      ctx.font = "bold 36px 'Noto Sans Bengali', sans-serif";
      ctx.fillStyle = c.accent;
      ctx.shadowColor = c.glow; ctx.shadowBlur = 20;
      ctx.fillText(line, w/2, h/2 + 160);
      ctx.shadowBlur = 0;
    }
  });
  ctx.globalAlpha = 1;

  // Particle explosion burst
  for (let p = 0; p < 100; p++) {
    const angle = (p / 100) * Math.PI * 2;
    const speed = rand() * 0.6 + 0.4;
    const dist = t * 800 * speed;
    const px = w/2 + Math.cos(angle) * dist;
    const py = (h/2 - 200) + Math.sin(angle) * dist;
    const alpha = Math.max(0, (1 - t * 1.2) * (rand() * 0.6 + 0.3));
    const size = rand() * 6 + 2;
    ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2);
    const colors = [c.accent, c.sec, c.glow, '#ffffff'];
    ctx.fillStyle = colors[p%4];
    ctx.globalAlpha = alpha; ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Confetti
  for (let cf = 0; cf < 60; cf++) {
    const cx = rand() * w;
    const cy = (rand() * h + t * 600) % h;
    const cw = rand() * 20 + 8, ch = rand() * 10 + 4;
    const rot = rand() * Math.PI * 2 + t * 5;
    const alpha = Math.min(1, t * 3) * 0.7;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    const cfColors = [c.accent, c.sec, '#ffffff', '#ffff00', '#ff69b4'];
    ctx.fillStyle = cfColors[cf % cfColors.length];
    ctx.fillRect(-cw/2, -ch/2, cw, ch);
    ctx.restore();
  }

  // Top/bottom bars
  const bGrad = ctx.createLinearGradient(0, 0, w, 0);
  bGrad.addColorStop(0, 'transparent'); bGrad.addColorStop(0.5, c.accent); bGrad.addColorStop(1, 'transparent');
  ctx.globalAlpha = 1;
  ctx.fillStyle = bGrad;
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);
}

async function fbPostToReels() {
  if (!reelBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(reelBlob);
  a.download = 'joaf-reel.webm';
  a.click();
  const caption = document.getElementById('fb-caption').value || '';
  const tags = window._joafTags || '';
  const clipText = caption + (tags ? '\n\nTags: ' + tags : '');
  try { await navigator.clipboard.writeText(clipText); } catch(e) {}
  // Also store separately for extension
  window._joafTagsForExtension = tags;
  setTimeout(() => {
    window.open('https://business.facebook.com/latest/reels_composer/?ref=biz_web_home_post_to_multiple_pages&asset_id=901104276426275&context_ref=HOME', '_blank');
  }, 1000);
  const toast = document.createElement('div');
  toast.textContent = '✅ Video download হয়েছে! Caption clipboard এ আছে — Extension pages select করবে';
  toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#1877f2;color:#fff;padding:14px 24px;border-radius:10px;font-size:13px;font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function fbDownloadReel() {
  if (!reelBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(reelBlob);
  a.download = 'joaf-reel.webm';
  a.click();
}




window.isCinematic = true;
let sceneIndex = 0;
const scenes = ["সকাল ৮টা: রাজধানী স্থবির", "দুপুর ১২টা: নতুন ঘোষণা", "রাত ৮টা: চূড়ান্ত সিদ্ধান্ত"];

function startCinematic() {
  setInterval(() => {
    document.getElementById('eHl').value = scenes[sceneIndex % scenes.length];
    draw(); 
    sceneIndex++;
  }, 10000); // 10 second-e per slide, 3 slide = 30 sec
}
