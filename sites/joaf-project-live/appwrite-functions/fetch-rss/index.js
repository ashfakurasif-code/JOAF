// Appwrite Function: fetch-rss
// OPTIMIZED BUILD — Free Tier Safe
// Concurrent RSS fetches, 6s timeout each, CORS headers

const SOURCES = [
  { id: 'proto',    name: 'প্রথম আলো',   icon: '🗞️', rss: 'https://www.prothomalo.com/feed' },
  { id: 'bd24',     name: 'BD News 24',  icon: '📡', rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'daily',    name: 'Daily Star',  icon: '⭐', rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'jugantor', name: 'যুগান্তর',   icon: '📜', rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kaler',    name: 'কালের কণ্ঠ', icon: '🔔', rss: 'https://www.kalerkantho.com/rss.xml' },
];

function parseRSS(xml, src, maxItems = 10) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = re.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    if (!title) continue;
    items.push({
      title,
      link:      get('link') || get('guid'),
      pubDate:   get('pubDate') || get('dc:date') || new Date().toISOString(),
      srcId:     src.id, srcName: src.name, srcIcon: src.icon,
      isBreaking: /breaking|জরুরি|ব্রেকিং/i.test(title),
    });
  }
  return items;
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  const reqSrc  = req.query?.src;
  const sources = reqSrc ? SOURCES.filter(s => s.id === reqSrc) : SOURCES;

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const r = await fetch(src.rss, {
        headers: { 'User-Agent': 'Mozilla/5.0 (JOAF-RSS/2.0)', Accept: 'application/rss+xml,*/*' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
        redirect: 'follow',
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const xml = await r.text();
      return { id: src.id, items: parseRSS(xml, src) };
    })
  );

  const allItems = results.flatMap(r => r.status === 'fulfilled' ? r.value.items : []);
  const failed   = sources
    .filter((_, i) => results[i].status === 'rejected')
    .map((s, i) => ({ id: s.id, error: results[i]?.reason?.message }));

  log(`fetch-rss: ${allItems.length} items, ${failed.length} failed`);
  return res.json({ success: true, items: allItems, failed }, 200);
};
