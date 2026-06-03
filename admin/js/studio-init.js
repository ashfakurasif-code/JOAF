/**
 * studio-init.js — updated to support viral OS pipeline tab
 */
(function () {
  const cfg = window.JOAF_CONFIG || {};

  var epEl = document.getElementById('cfg-endpoint');
  var prEl = document.getElementById('cfg-project');
  if (epEl) epEl.value = cfg.endpoint || '';
  if (prEl) prEl.value = cfg.projectId || '';

  // Tab switching — dynamic, handles any data-target
  var btns = Array.from(document.querySelectorAll('.btn[data-target]'));
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.frame').forEach(function (f) {
        f.classList.toggle('active', f.id === 'frame-' + btn.dataset.target);
      });
    });
  });

  async function refreshHealth() {
    var dot  = document.getElementById('healthDot');
    var text = document.getElementById('healthText');
    if (!dot || !text) return;
    dot.className = 'dot';
    text.textContent = 'Checking…';
    try {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshHealth);
  } else {
    refreshHealth();
  }
})();
