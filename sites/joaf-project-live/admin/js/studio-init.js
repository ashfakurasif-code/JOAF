/**
 * studio-init.js
 * Logic for admin/studio.html — extracted from inline <script> to satisfy CSP.
 *
 * Health check routes through join_aw_exec('get-stats') instead of directly
 * fetching cloud.appwrite.io/v1/health, which is blocked by CORS for
 * cross-origin requests from www.julyforum.com.
 */
(function () {
  const cfg = window.JOAF_CONFIG || {};

  // Populate toolbar display fields
  var epEl = document.getElementById('cfg-endpoint');
  var prEl = document.getElementById('cfg-project');
  if (epEl) epEl.value = cfg.endpoint || '';
  if (prEl) prEl.value = cfg.projectId || '';

  // Tab switching
  var btns = Array.from(document.querySelectorAll('.btn[data-target]'));
  var frames = {
    news: document.getElementById('frame-news'),
    fb:   document.getElementById('frame-fb'),
    reel: document.getElementById('frame-reel')
  };
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      Object.keys(frames).forEach(function (k) {
        if (frames[k]) frames[k].classList.toggle('active', k === btn.dataset.target);
      });
    });
  });

  // Health check — proxied through get-stats Appwrite function to avoid CORS.
  // Direct fetch to cloud.appwrite.io/v1/health is blocked cross-origin.
  async function refreshHealth() {
    var dot  = document.getElementById('healthDot');
    var text = document.getElementById('healthText');
    if (!dot || !text) return;
    dot.className = 'dot';
    text.textContent = 'Checking…';

    try {
      // join_aw_exec is defined in joaf-init.js (loaded before this script).
      // get-stats returns { ok: true, activeSubs, ... } when Appwrite DB is reachable.
      var adminKey = '';
      try { adminKey = localStorage.getItem('joaf_admin_key') || ''; } catch (_) {}

      var res = await window.join_aw_exec('get-stats', {
        method: 'GET',
        headers: { 'X-Admin-Key': adminKey }
      });
      var ok = res.ok || res.status === 200;
      dot.className = 'dot ' + (ok ? 'ok' : 'bad');
      text.textContent = ok ? 'Health pass' : 'Health fail';
    } catch (_) {
      dot.className = 'dot bad';
      text.textContent = 'Health error';
    }
  }

  var refreshBtn = document.getElementById('refreshHealth');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshHealth);

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshHealth);
  } else {
    refreshHealth();
  }
})();
