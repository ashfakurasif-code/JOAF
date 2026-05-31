
function joafShowEmergencyPopup(localHTML, nationalHTML) {
  const el = document.createElement('div');
  el.id = 'joaf-emergency-popup';
  el.style = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;padding:20px;display:flex;align-items:center;justify-content:center;';
  el.innerHTML = '<div style="background:#fff;width:100%;max-width:400px;border-radius:20px;padding:20px;max-height:80vh;overflow-y:auto;position:relative;"><button onclick="document.getElementById(\'joaf-emergency-popup\').remove()" style="position:absolute;top:10px;right:10px;border:none;background:#eee;width:30px;height:30px;border-radius:50%;cursor:pointer;">✕</button><div style="font-size:18px;font-weight:900;margin-bottom:15px;color:#90161f">জরুরি সহায়তা</div>' + localHTML + nationalHTML + '</div>';
  document.body.appendChild(el);
}

function joafShowEmergencyPopup(localHTML, nationalHTML) {
  const existing = document.getElementById('joaf-emergency-popup');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'joaf-emergency-popup';
  el.style = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;padding:20px;display:flex;align-items:center;justify-content:center;';
  el.innerHTML = '<div style="background:#fff;width:100%;max-width:400px;border-radius:20px;padding:20px;max-height:80vh;overflow-y:auto;position:relative;"><button onclick="document.getElementById(\'joaf-emergency-popup\').remove()" style="position:absolute;top:10px;right:10px;border:none;background:#eee;width:30px;height:30px;border-radius:50%;cursor:pointer;">✕</button><div style="font-size:18px;font-weight:900;margin-bottom:15px;color:#90161f">জরুরি সহায়তা</div>' + localHTML + nationalHTML + '</div>';
  document.body.appendChild(el);
}
