// bd-rss-utils.js — Shared BD-focused RSS utility (ESM)

const BD_RSS_SOURCES = [
  { id: 'prothomalo',    name: 'প্রথম আলো',          rss: 'https://www.prothomalo.com/feed' },
  { id: 'jugantor',      name: 'যুগান্তর',             rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kalerkantho',   name: 'কালের কণ্ঠ',           rss: 'https://www.kalerkantho.com/rss.xml' },
  { id: 'samakal',       name: 'সমকাল',                rss: 'https://samakal.com/feed' },
  { id: 'bdnews24',      name: 'BD News 24',           rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'dailystar',     name: 'The Daily Star',       rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'dhakatribune',  name: 'Dhaka Tribune',        rss: 'https://www.dhakatribune.com/feed' },
  { id: 'risingbd',      name: 'Risingbd',             rss: 'https://www.risingbd.com/rss.xml' },
  { id: 'barta24',       name: 'বার্তা২৪',              rss: 'https://barta24.net/feed' },
  { id: 'somoyertv',     name: 'সময় টিভি',              rss: 'https://www.somoynews.tv/feed' },
];

const BD_DOMAINS = new Set([
  'prothomalo.com','jugantor.com','kalerkantho.com','samakal.com',
  'bdnews24.com','thedailystar.net','dhakatribune.com','newagebd.net',
  'risingbd.com','jagonews24.com','barta24.net','bd24live.com',
  'somoynews.tv','channelionline.com','rtvonline.com','ntvbd.com',
]);

const BD_KEYWORDS = [
  'বাংলাদেশ','ঢাকা','চট্টগ্রাম','সরকার','মন্ত্রী','সংসদ','নির্বাচন',
  'বিএনপি','আওয়ামী','জামায়াত','জুলাই','অভ্যুত্থান','অন্তর্বর্তী',
  'bangladesh','bangladeshi','dhaka','chittagong','sylhet','rajshahi',
  'interim government','bnp','awami league','yunus','hasina',
];

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JOAF-RSS/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseItems(xml, source, maxItems = 15) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    if (!title || title.length < 6) continue;
    items.push({ title, link, source: source.name, sourceId: source.id });
  }
  return items;
}

function isBDRelevant(item) {
  if (item.link) {
    try {
      const hostname = new URL(item.link).hostname.replace(/^www\./, '');
      if (BD_DOMAINS.has(hostname)) return true;
    } catch (_) {}
  }
  const text = ((item.title || '') + ' ' + (item.link || '')).toLowerCase();
  for (const kw of BD_KEYWORDS) { if (text.includes(kw.toLowerCase())) return true; }
  return false;
}

export async function fetchBDHeadlines({ maxPerSource = 15, totalLimit = 60 } = {}) {
  const results = await Promise.allSettled(
    BD_RSS_SOURCES.map(s =>
      fetchUrl(s.rss).then(xml => ({ source: s, items: parseItems(xml, s, maxPerSource), error: null })).catch(err => ({ source: s, items: [], error: err.message }))
    )
  );

  let allItems = [];
  let filteredCount = 0;
  const sourceCounts = {};

  results.forEach((result, index) => {
    const source = BD_RSS_SOURCES[index];
    const { items, error } = result.status === 'fulfilled' ? result.value : { items: [], error: result.reason?.message };
    const passed = items.filter(item => { if (isBDRelevant(item)) return true; filteredCount++; return false; });
    sourceCounts[source.id] = { fetched: items.length, passed: passed.length, error: error || null };
    allItems = allItems.concat(passed);
  });

  const limitedItems = allItems.slice(0, totalLimit);
  return { items: limitedItems, headlines: limitedItems.map(i => i.title), filteredCount, sourceCounts };
}
