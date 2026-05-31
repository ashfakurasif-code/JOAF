(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const EP = 'https://fra.cloud.appwrite.io/v1';
  const PJ = '6a11b6cd000b59f318eb';
  const DB = 'joaf';

  // ── Main press release ─────────────────────────────────────────────
  try {
    const res = await fetch(`${EP}/databases/${DB}/collections/press_releases/documents/${id}`, {
      headers: { 'X-Appwrite-Project': PJ }
    });
    if (!res.ok) throw new Error('not found');
    const pr = await res.json();

    const parseDate = d => d ? new Date(d.includes('T') ? d : d + 'T00:00:00') : null;
    const dateShort = pr.date ? (parseDate(pr.date).toLocaleDateString('bn-BD') || pr.date) : '';
    const dateFull  = pr.date ? (parseDate(pr.date).toLocaleDateString('bn-BD', {year:'numeric',month:'long',day:'numeric'}) || pr.date) : '';

    document.getElementById('pr-title').textContent        = pr.title || '';
    document.getElementById('pr-summary').textContent      = pr.summary || '';
    document.getElementById('pr-date-display').textContent = dateFull;
    document.getElementById('pr-content').innerHTML        = pr.content || pr.body || `<p>${pr.summary||''}</p><p style="color:#9ca3af;font-size:14px">📌 বিস্তারিত বিষয়বস্তু শীঘ্রই প্রকাশিত হবে।</p>`;
    document.title = (pr.title || 'প্রেস রিলিজ') + ' — জোয়াফ';

    const img = document.getElementById('pr-img');
    if (img && (pr.imageUrl || pr.img)) { img.src = pr.imageUrl || pr.img; img.alt = pr.title || ''; }

    // Date badges on image
    const top = document.getElementById('pr-img-date-top');
    const bot = document.getElementById('pr-img-date-bottom');
    if (top) top.innerHTML = dateShort ? `<i class="zmdi zmdi-calendar"></i> ${dateShort}` : '';
    if (bot) bot.textContent = pr.$id ? `#${pr.$id.slice(0,6)}` : '';

    // Share buttons
    const shareEl = document.getElementById('pr-share');
    if (shareEl) {
      const url   = encodeURIComponent(`https://www.julyforum.com/press-releases/view.html?id=${id}`);
      const title = encodeURIComponent(pr.title || 'প্রেস রিলিজ');
      shareEl.innerHTML = `
        <strong style="font-size:14px;align-self:center">শেয়ার করুন:</strong>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" style="background:#3b5998"><i class="zmdi zmdi-facebook"></i> Facebook</a>
        <a href="https://wa.me/?text=${title}%20${url}" target="_blank" style="background:#25d366"><i class="zmdi zmdi-whatsapp"></i> WhatsApp</a>
        <a href="https://twitter.com/intent/tweet?text=${title}&url=${url}" target="_blank" style="background:#1da1f2"><i class="zmdi zmdi-twitter"></i> Twitter</a>`;
    }
  } catch(e) {
    document.getElementById('pr-title').textContent = 'প্রেস রিলিজ পাওয়া যায়নি।';
  }

  // ── Sidebar + "আরও পড়ুন" cards (shared fetch) ──────────────────────
  try {
    const snap = await fetch(`${EP}/databases/${DB}/collections/press_releases/documents`, {
      headers: { 'X-Appwrite-Project': PJ }
    });
    const data = await snap.json();
    const all    = (data.documents || []).sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const others = all.filter(p => p.$id !== id);

    // Sidebar — top 4
    document.getElementById('sidebarPR').innerHTML = others.slice(0,4).map(p => `
      <a href="/press-releases/view.html?id=${p.$id}" class="sc-pr-item">
        <img src="${p.img || '/logoc7c3.png'}" alt="${p.title||''}" loading="lazy" onerror="this.src='/logoc7c3.png'">
        <div class="sc-pr-info">
          <h4>${p.title||''}</h4>
          <span>${p.date ? new Date(p.date).toLocaleDateString('bn-BD') : ''}</span>
        </div>
      </a>`).join('');

    // "আরও পড়ুন" section — 3 cards
    const moreEl = document.getElementById('more-press-grid');
    if (moreEl && others.length) {
      moreEl.innerHTML = others.slice(0,3).map((p,i) => {
        const dateStr = p.date ? new Date(p.date).toLocaleDateString('bn-BD') : '';
        const img     = p.img || '/logoc7c3.png';
        const viewUrl = `/press-releases/view.html?id=${p.$id}`;
        const shareUrl  = encodeURIComponent('https://www.julyforum.com' + viewUrl);
        const shareTitle= encodeURIComponent(p.title||'');
        return `
        <div class="col-md-6 col-lg-4 joaf-reveal" style="transition-delay:${i*0.1}s">
          <div class="press-card">
            <div class="press-card-img-wrap">
              <img src="${img}" alt="${p.title||''}" loading="lazy" onerror="this.src='/logoc7c3.png'">
              ${dateStr ? `<span class="press-date-top"><i class="zmdi zmdi-calendar"></i> ${dateStr}</span>` : ''}
            </div>
            <div class="press-card-body">
              <h4>${p.title||''}</h4>
              <p>${p.summary||''}</p>
              <a href="${viewUrl}" class="press-read-more">বিস্তারিত পড়ুন <i class="zmdi zmdi-arrow-right"></i></a>
              <div class="share-row">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="s-fb"><i class="zmdi zmdi-facebook"></i> শেয়ার</a>
                <a href="https://wa.me/?text=${shareTitle}%20${shareUrl}" target="_blank" class="s-wa"><i class="zmdi zmdi-whatsapp"></i> শেয়ার</a>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
      // trigger animations
      setTimeout(() => {
        document.querySelectorAll('#more-press-grid .joaf-reveal').forEach(el => el.classList.add('visible'));
      }, 100);
    }
  } catch(_e) {
    const sb = document.getElementById('sidebarPR');
    if (sb) sb.innerHTML = '';
  }
})();
