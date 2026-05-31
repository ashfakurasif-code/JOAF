// Injected: dynamic Appwrite fetch for view.html?id=...
(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const EP = (globalThis.JOAF_ENDPOINT || 'https://fra.cloud.appwrite.io/v1');
  const PJ = (globalThis.JOAF_PROJECT_ID || '6a11b6cd000b59f318eb');
  const DB = (globalThis.JOAF_DATABASE_ID || 'joaf');

  try {
    const res = await fetch(`${EP}/databases/${DB}/collections/press_releases/documents/${id}`, {
      headers: { 'X-Appwrite-Project': PJ }
    });
    if (!res.ok) throw new Error('not found');
    const pr = await res.json();

    document.getElementById('pr-title').textContent        = pr.title || '';
    document.getElementById('pr-summary').textContent      = pr.summary || '';
    document.getElementById('pr-date-display').textContent = pr.date ? new Date(pr.date).toLocaleDateString('bn-BD') : '';
    const img = document.getElementById('pr-img');
    if (img && (pr.imageUrl || pr.img)) { img.src = pr.imageUrl || pr.img; img.alt = pr.title; }
    document.getElementById('pr-content').innerHTML        = pr.content || pr.summary || '';
    document.title = (pr.title || 'প্রেস রিলিজ') + ' — জোয়াফ';
  } catch(e) {
    document.getElementById('pr-title').textContent = 'প্রেস রিলিজ পাওয়া যায়নি।';
  }
})();