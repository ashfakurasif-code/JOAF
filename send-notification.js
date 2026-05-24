// netlify/functions/send-notification.js
// Appwrite REST — push_subscriptions + notification_history
const webpush = require('web-push');
const AW_EP  = 'https://fra.cloud.appwrite.io/v1';
const AW_P   = '6a11b6cd000b59f318eb';
const AW_KEY = process.env.APPWRITE_API_KEY;
const AW_DB  = 'joaf';
const AW_H   = { 'Content-Type':'application/json', 'X-Appwrite-Project':AW_P, 'X-Appwrite-Key':AW_KEY };

async function awList(col, lim=500) {
  let docs=[], offset=0;
  while(true) {
    const r = await fetch(`${AW_EP}/databases/${AW_DB}/collections/${col}/documents?limit=100&offset=${offset}`, {headers:AW_H});
    if (!r.ok) break;
    const d = await r.json();
    const b = d.documents || [];
    docs = docs.concat(b);
    if (b.length < 100 || docs.length >= lim) break;
    offset += 100;
  }
  return docs;
}

async function awPatch(col, id, data) {
  await fetch(`${AW_EP}/databases/${AW_DB}/collections/${col}/documents/${id}`, {
    method:'PATCH', headers:AW_H, body:JSON.stringify({data})
  });
}

async function awAdd(col, data) {
  await fetch(`${AW_EP}/databases/${AW_DB}/collections/${col}/documents`, {
    method:'POST', headers:AW_H,
    body:JSON.stringify({documentId:'unique()', data, permissions:['read("any")']})
  });
}

async function getActiveSubscriptions() {
  const docs = await awList('push_subscriptions');
  return docs
    .filter(d => d.active !== 'false' && d.active !== false)
    .map(d => ({
      id: d.$id,
      subscription: typeof d.subscription === 'string' ? JSON.parse(d.subscription) : d.subscription,
      district: d.district || '',
      active: d.active,
    }));
}

async function markInactive(id) {
  await awPatch('push_subscriptions', id, { active: 'false' });
}

async function saveHistory(data) {
  await awAdd('notification_history', {
    type:    data.type || 'custom',
    title:   String(data.title || ''),
    body:    String(data.body || ''),
    url:     String(data.url || ''),
    sent:    String(data.sent || 0),
    failed:  String(data.failed || 0),
    sentAt:  new Date().toISOString(),
  });
}

const NOTIFICATION_TYPES = {
  bajar:{title:'🛒 আজকের বাজার দর',body:'চাল, ডাল, সবজির দাম আপডেট হয়েছে।',url:'/bajar.html'},
  poll:{title:'🗳️ আজকের জনমত',body:'৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন।',url:'/joaf-polls.html'},
  streak:{title:'🔥 Streak মিস করবেন না!',body:'আজকের ভোট এখনো বাকি।',url:'/joaf-polls.html'},
  weather:{title:'🌦️ আবহাওয়া সতর্কতা',body:'আজ আপনার এলাকায় বিশেষ আবহাওয়া পূর্বাভাস।',url:'/weather.html'},
  blood:{title:'🩸 জরুরি রক্ত দরকার!',body:'আপনার এলাকায় কেউ রক্তের জন্য অনুরোধ করেছেন।',url:'/rokto.html'},
  alert:{title:'🚨 জরুরি সতর্কতা!',body:'আপনার এলাকায় একটি জরুরি পরিস্থিতি জানানো হয়েছে।',url:'/alert.html'},
  live:{title:'📡 JOAF Live শুরু হয়েছে!',body:'এখনই দেখুন — সরাসরি সম্প্রচার চলছে।',url:'/live.html'},
  warrior:{title:'🏆 নতুন জুলাই যোদ্ধা!',body:'একজন নতুন বীর সৈনিক আমাদের directory তে যোগ দিয়েছেন।',url:'/july-warriors.html'},
  corruption:{title:'🚫 দুর্নীতির রিপোর্ট',body:'একটি নতুন দুর্নীতির অভিযোগ দাখিল হয়েছে।',url:'/leader-tracker.html'},
  leader:{title:'🏛️ নেতা ট্র্যাকার আপডেট',body:'প্রতিশ্রুতি vs বাস্তবতা — সাপ্তাহিক আপডেট।',url:'/leader-tracker.html'},
  medicine:{title:'💊 ওষুধের দাম আপডেট',body:'এই সপ্তাহের ওষুধের দামের তালিকা আপডেট হয়েছে।',url:'/medicine.html'},
  agriculture:{title:'🌾 কৃষি আপডেট',body:'এই মৌসুমের কৃষি পরামর্শ ও বাজার দর আপডেট হয়েছে।',url:'/agriculture.html'},
  jobs:{title:'💼 নতুন চাকরির সুযোগ',body:'আপনার পছন্দের ক্যাটাগরিতে নতুন চাকরি এসেছে।',url:'/jobs.html'},
  news:{title:'📢 JOAF বিবৃতি',body:'JOAF এর পক্ষ থেকে একটি গুরুত্বপূর্ণ বিবৃতি প্রকাশিত হয়েছে।',url:'/news.html'},
  breaking:{title:'🚨 ব্রেকিং নিউজ',body:'এইমাত্র একটি গুরুত্বপূর্ণ খবর এসেছে।',url:'/news.html'},
  reward:{title:'🎉 পুরস্কার অর্জন!',body:'অভিনন্দন! আপনি ৩০ দিনের streak সম্পন্ন করেছেন।',url:'/joaf-polls.html'},
  welcome:{title:'🔥 JOAF-এ স্বাগতম!',body:'আপনি এখন বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চের অংশ।',url:'/'},
};

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type, X-Admin-Key', 'Content-Type':'application/json' };
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};
  if (event.httpMethod !== 'POST') return {statusCode:405,headers,body:JSON.stringify({error:'Method not allowed'})};
  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return {statusCode:401,headers,body:JSON.stringify({error:'Unauthorized'})};
  try {
    webpush.setVapidDetails('mailto:admin@julyforum.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const body = JSON.parse(event.body);
    const { type, title:customTitle, body:customBody, url:customUrl, _verify, district:filterDistrict } = body;
    if (_verify) return {statusCode:200,headers,body:JSON.stringify({verified:true})};
    let notifData = NOTIFICATION_TYPES[type] ? {...NOTIFICATION_TYPES[type]} : {title:customTitle||'🔥 JOAF',body:customBody||'নতুন আপডেট এসেছে',url:customUrl||'/'};
    if (customTitle) notifData.title = customTitle;
    if (customBody)  notifData.body  = customBody;
    if (customUrl)   notifData.url   = customUrl;
    let docs = await getActiveSubscriptions();
    if (filterDistrict && ['blood','alert','weather'].includes(type)) {
      const fd = docs.filter(d => d.district === filterDistrict);
      if (fd.length > 0) docs = fd;
    }
    if (!docs.length) return {statusCode:200,headers,body:JSON.stringify({success:true,sent:0,message:'No subscribers'})};
    const payload = JSON.stringify({title:notifData.title,body:notifData.body,url:notifData.url,type:type||'custom',tag:`joaf-${type||'custom'}-${Date.now()}`});
    let sent=0, failed=0;
    await Promise.all(docs.map(async (doc) => {
      if (!doc.subscription) return;
      try { await webpush.sendNotification(doc.subscription, payload); sent++; }
      catch (err) { failed++; if (err.statusCode===404||err.statusCode===410) await markInactive(doc.id).catch(()=>{}); }
    }));
    await saveHistory({type:type||'custom',title:notifData.title,body:notifData.body,url:notifData.url,sent,failed}).catch(()=>{});
    return {statusCode:200,headers,body:JSON.stringify({success:true,sent,failed,total:docs.length})};
  } catch (err) {
    console.error('send-notification error:', err);
    return {statusCode:500,headers,body:JSON.stringify({error:err.message})};
  }
};
