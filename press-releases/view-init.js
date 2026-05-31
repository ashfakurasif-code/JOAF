(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const EP = 'https://fra.cloud.appwrite.io/v1';
  const PJ = '6a11b6cd000b59f318eb';
  const DB = 'joaf';

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

  try {
    const snap = await fetch(`${EP}/databases/${DB}/collections/press_releases/documents`, {
      headers: { 'X-Appwrite-Project': PJ }
    });
    const data = await snap.json();
    const others = (data.documents || []).filter(p => p.$id !== id).slice(0, 4);
    document.getElementById('sidebarPR').innerHTML = others.map(p => `
      <a href="/press-releases/view.html?id=${p.$id}" class="sc-pr-item">
        <img src="${p.img || '/logoc7c3.png'}" alt="${p.title||''}" loading="lazy" onerror="this.src='/logoc7c3.png'">
        <div class="sc-pr-info">
          <h4>${p.title||''}</h4>
          <span>${p.date ? new Date(p.date).toLocaleDateString('bn-BD') : ''}</span>
        </div>
      </a>`).join('');
  } catch(_e) {
    document.getElementById('sidebarPR').innerHTML = '';
  }
})();
