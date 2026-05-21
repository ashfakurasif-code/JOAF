// netlify/functions/bd-rss-utils.js
// Shared BD-focused RSS fetching, parsing and relevance filtering utility.
// Used by discover-leaders.js and generate-timeline.js.

const https = require('https');
const http  = require('http');

// ── Expanded BD-focused RSS source list ──────────────────────────────────────
// Covers major Bangla dailies, English dailies/portals, BD news agencies,
// sports, entertainment and lifestyle portals relevant to Bangladesh.
const BD_RSS_SOURCES = [
  // Major Bangla dailies
  { id: 'prothomalo',    name: 'প্রথম আলো',          rss: 'https://www.prothomalo.com/feed' },
  { id: 'jugantor',      name: 'যুগান্তর',             rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kalerkantho',   name: 'কালের কণ্ঠ',           rss: 'https://www.kalerkantho.com/rss.xml' },
  { id: 'samakal',       name: 'সমকাল',                rss: 'https://samakal.com/feed' },
  { id: 'ittefaq',       name: 'ইত্তেফাক',              rss: 'https://www.ittefaq.com.bd/rss.xml' },
  { id: 'manabzamin',    name: 'মানবজমিন',              rss: 'https://mzamin.com/rss' },
  { id: 'nayadiganta',   name: 'নয়া দিগন্ত',            rss: 'https://www.dailynayadiganta.com/rss.xml' },
  { id: 'banglatribune', name: 'বাংলা ট্রিবিউন',        rss: 'https://www.banglatribune.com/feeds' },
  { id: 'deshrupantor',  name: 'দেশ রূপান্তর',          rss: 'https://www.deshrupantor.com/feed' },
  { id: 'bonikbarta',    name: 'বণিক বার্তা',           rss: 'https://bonikbarta.net/feed' },
  // Major English dailies / portals
  { id: 'bdnews24',      name: 'BD News 24',           rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'dailystar',     name: 'The Daily Star',       rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'dhakatribune',  name: 'Dhaka Tribune',        rss: 'https://www.dhakatribune.com/feed' },
  { id: 'newage',        name: 'New Age',              rss: 'https://www.newagebd.net/rss/' },
  { id: 'finexp',        name: 'Financial Express BD', rss: 'https://thefinancialexpress.com.bd/rss.xml' },
  // BD news agencies and portals
  { id: 'risingbd',      name: 'Risingbd',             rss: 'https://www.risingbd.com/rss.xml' },
  { id: 'jagonews',      name: 'Jago News 24',         rss: 'https://www.jagonews24.com/feed' },
  { id: 'barta24',       name: 'বার্তা২৪',              rss: 'https://barta24.net/feed' },
  { id: 'bd24live',      name: 'BD24 Live',            rss: 'https://www.bd24live.com/feed' },
  // TV / broadcast portals
  { id: 'somoyertv',     name: 'সময় টিভি',              rss: 'https://www.somoynews.tv/feed' },
  { id: 'channeli',      name: 'Channel i',            rss: 'https://www.channelionline.com/feed' },
  { id: 'rtvonline',     name: 'RTV Online',           rss: 'https://www.rtvonline.com/feed' },
  { id: 'ntv',           name: 'NTV',                  rss: 'https://www.ntvbd.com/rss.xml' },
];

// ── BD domain allowlist for relevance gate ────────────────────────────────────
const BD_DOMAINS = new Set([
  'prothomalo.com', 'jugantor.com', 'kalerkantho.com', 'samakal.com',
  'ittefaq.com.bd', 'mzamin.com', 'dailynayadiganta.com', 'banglatribune.com',
  'deshrupantor.com', 'bonikbarta.net',
  'bdnews24.com', 'thedailystar.net', 'dhakatribune.com', 'newagebd.net',
  'thefinancialexpress.com.bd',
  'risingbd.com', 'jagonews24.com', 'barta24.net', 'bd24live.com',
  'somoynews.tv', 'channelionline.com', 'rtvonline.com', 'ntvbd.com',
  'somoy.tv', 'ekattor.tv', 'channel24bd.tv', 'atv.com.bd',
  'bssnews.net', 'bss.gov.bd', 'amardesh.com',
]);

// ── BD keyword list for relevance gate ───────────────────────────────────────
// An item passes the BD relevance gate if its title or link contains at least
// one of these keywords (case-insensitive).
const BD_KEYWORDS = [
  // Bangla-script geography
  'বাংলাদেশ', 'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা',
  'বরিশাল', 'ময়মনসিংহ', 'রংপুর', 'কুমিল্লা', 'নারায়ণগঞ্জ',
  // Bangla-script institutions / politics
  'সরকার', 'মন্ত্রী', 'সংসদ', 'নির্বাচন', 'প্রধানমন্ত্রী', 'রাষ্ট্রপতি',
  'আদালত', 'পুলিশ', 'র‍্যাব', 'সেনাবাহিনী', 'বিএনপি', 'আওয়ামী',
  'জামায়াত', 'ছাত্রলীগ', 'জুলাই', 'অভ্যুত্থান', 'অন্তর্বর্তী',
  // English geography (lowercase matching applied at runtime)
  'bangladesh', 'bangladeshi', 'dhaka', 'chittagong', 'sylhet',
  'rajshahi', 'khulna', 'barisal', 'mymensingh', 'rangpur', 'comilla',
  'narayanganj', 'gazipur', 'cox\'s bazar',
  // English institutions / politics
  'interim government', 'bnp', 'awami league', 'jamaat', 'yunus', 'hasina',
  'fakhrul', 'tarique', 'election commission bd', 'high court dhaka',
  'supreme court bangladesh', 'bangladesh bank', 'bgb', 'bsf bangladesh',
];

// ── HTTP fetch helper ─────────────────────────────────────────────────────────
function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JOAF-RSS/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout: 12000,
    }, (res) => {
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

// ── RSS item parser ───────────────────────────────────────────────────────────
// Returns up to maxItems rich item objects: { title, link, source, sourceId }
function parseItems(xml, source, maxItems = 15) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(
        new RegExp(
          `<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`
        )
      );
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    if (!title || title.length < 6) continue;
    items.push({ title, link, source: source.name, sourceId: source.id });
  }
  return items;
}

// ── BD relevance gate ─────────────────────────────────────────────────────────
// Returns true if the item passes at least one BD signal:
//   1. Its link's hostname is in the BD domain allowlist, OR
//   2. Its title (or link) contains a BD keyword.
function isBDRelevant(item) {
  // 1. Domain allowlist check
  if (item.link) {
    try {
      const hostname = new URL(item.link).hostname.replace(/^www\./, '');
      if (BD_DOMAINS.has(hostname)) return true;
    } catch (_) {}
  }
  // 2. Keyword match in title + link (case-insensitive)
  const text = ((item.title || '') + ' ' + (item.link || '')).toLowerCase();
  for (const kw of BD_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) return true;
  }
  return false;
}

// ── Main export: fetch BD-relevant headlines ──────────────────────────────────
/**
 * Fetch and filter BD-relevant headlines from all BD_RSS_SOURCES.
 *
 * Returns:
 *   items         — array of { title, link, source, sourceId }
 *   headlines     — array of title strings (for AI prompt)
 *   filteredCount — number of items that did NOT pass the BD relevance gate
 *   sourceCounts  — map of sourceId → { fetched, passed, error }
 */
async function fetchBDHeadlines({ maxPerSource = 15, totalLimit = 60 } = {}) {
  const results = await Promise.allSettled(
    BD_RSS_SOURCES.map(s =>
      fetchUrl(s.rss)
        .then(xml => ({ source: s, items: parseItems(xml, s, maxPerSource), error: null }))
        .catch(err => ({ source: s, items: [], error: err.message }))
    )
  );

  let allItems = [];
  let filteredCount = 0;
  const sourceCounts = {};

  results.forEach((result, index) => {
    const source = BD_RSS_SOURCES[index];
    const { items, error } =
      result.status === 'fulfilled'
        ? result.value
        : { items: [], error: result.reason?.message };

    const passed = [];
    for (const item of items) {
      if (isBDRelevant(item)) {
        passed.push(item);
      } else {
        filteredCount++;
      }
    }
    sourceCounts[source.id] = { fetched: items.length, passed: passed.length, error: error || null };
    allItems = allItems.concat(passed);
  });

  const limitedItems = allItems.slice(0, totalLimit);
  return {
    items:        limitedItems,
    headlines:    limitedItems.map(i => i.title),
    filteredCount,
    sourceCounts,
  };
}

module.exports = {
  BD_RSS_SOURCES,
  BD_DOMAINS,
  BD_KEYWORDS,
  fetchUrl,
  parseItems,
  isBDRelevant,
  fetchBDHeadlines,
};
