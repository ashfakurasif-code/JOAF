// Appwrite Function: fetch-rss
// HTTP trigger — GET
// Server-side RSS fetch — no CORS/block issues

const SOURCES = [
  { id: 'proto',    name: 'প্রথম আলো',  icon: '🗞️', rss: 'https://www.prothomalo.com/feed' },
  { id: 'bd24',     name: 'BD News 24', icon: '📡', rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'daily',    name: 'Daily Star', icon: '⭐', rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'jugantor', name: 'যুগান্তর',  icon: '📜', rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kaler',    name: 'কালের কণ্ঠ',icon: '🔔', rss: 'https://www.kalerkantho.com/rss.xml' },
];

async function fetchUrl(url, redirectCount = 0) {
  if (redirectCount > 5) throw new Error('Too many redirects');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JOAF-RSS/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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
    items.push({ title, link, pubDate: date, srcId: src.id, srcName: src.name, srcIcon: src.icon,
      isBreaking: title.toLowerCase().includes('breaking') || title.includes('জরুরি') || title.includes('ব্রেকিং') });
  }
  return items;
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  const reqSrc = req.query?.src;
  const sources = reqSrc ? SOURCES.filter(s => s.id === reqSrc) : SOURCES;

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const xml   = await fetchUrl(src.rss);
      const items = parseRSS(xml, src);
      return { id: src.id, items };
    })
  );

  const allItems = results.flatMap(r => r.status === 'fulfilled' ? r.value.items : []);
  const failed   = sources.filter((_, i) => results[i].status === 'rejected')
    .map((s, i) => ({ id: s.id, error: results[i]?.reason?.message }));

  log(`fetch-rss: ${allItems.length} items, ${failed.length} failed`);
  return res.json({ success: true, items: allItems, failed });
};
