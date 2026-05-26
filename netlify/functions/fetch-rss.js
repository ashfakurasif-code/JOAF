// netlify/functions/fetch-rss.js
// Server side থেকে RSS fetch করে — CORS/block সমস্যা নেই

const https = require('https');
const http  = require('http');

const SOURCES = [
  { id: 'proto',    name: 'প্রথম আলো',  icon: '🗞️', rss: 'https://www.prothomalo.com/feed' },
  { id: 'bd24',     name: 'BD News 24', icon: '📡', rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'daily',    name: 'Daily Star', icon: '⭐', rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'jugantor', name: 'যুগান্তর',  icon: '📜', rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kaler',    name: 'কালের কণ্ঠ',icon: '🔔', rss: 'https://www.kalerkantho.com/rss.xml' },
];

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JOAF-RSS/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout: 8000,
    }, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, redirectCount + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSS(xml, src) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    const date  = get('pubDate') || get('dc:date') || new Date().toISOString();
    if (!title) continue;
    items.push({
      title,
      link,
      pubDate: date,
      srcId:   src.id,
      srcName: src.name,
      srcIcon: src.icon,
      isBreaking: title.toLowerCase().includes('breaking') || title.includes('জরুরি') || title.includes('ব্রেকিং'),
    });
  }
  return items;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 মিনিট cache
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // নির্দিষ্ট source চাইলে শুধু সেটা, নাহলে সব
  const reqSrc = event.queryStringParameters?.src;
  const sources = reqSrc
    ? SOURCES.filter(s => s.id === reqSrc)
    : SOURCES;

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const xml   = await fetchUrl(src.rss);
      const items = parseRSS(xml, src);
      return { id: src.id, items };
    })
  );

  const allItems = results.flatMap(r =>
    r.status === 'fulfilled' ? r.value.items : []
  );

  const failed = sources
    .filter((_, i) => results[i].status === 'rejected')
    .map(s => ({ id: s.id, error: results[sources.indexOf(s)]?.reason?.message }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, items: allItems, failed }),
  };
};
