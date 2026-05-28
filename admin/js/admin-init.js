// admin-init.js — runs before DOM parses, sets CSS var to show/hide login screen
(function () {
  if (localStorage.getItem('joaf_admin_key')) {
    document.documentElement.style.setProperty('--ls-display', 'none');
  } else {
    document.documentElement.style.setProperty('--ls-display', 'flex');
  }
})();

// Populate district dropdowns — called after DOM is ready
window.joafPopulateDistricts = function() {
  const DISTRICTS = ['ঢাকা','চট্টগ্রাম','রাজশাহী','খুলনা','বরিশাল','সিলেট','রংপুর','ময়মনসিংহ','কুমিল্লা','নারায়ণগঞ্জ','গাজীপুর','টাঙ্গাইল','ফরিদপুর','যশোর','নোয়াখালী','বগুড়া','দিনাজপুর','পাবনা','নরসিংদী','মানিকগঞ্জ','মুন্সীগঞ্জ','শরীয়তপুর','মাদারীপুর','গোপালগঞ্জ','কিশোরগঞ্জ','নেত্রকোনা','জামালপুর','শেরপুর','ব্রাহ্মণবাড়িয়া','চাঁদপুর','ফেনী','লক্ষ্মীপুর','কক্সবাজার','বান্দরবান','রাঙ্গামাটি','খাগড়াছড়ি','হবিগঞ্জ','মৌলভীবাজার','সুনামগঞ্জ','নওগাঁ','চাঁপাইনবাবগঞ্জ','নাটোর','সিরাজগঞ্জ','জয়পুরহাট','সাতক্ষীরা','ঝিনাইদহ','মাগুরা','নড়াইল','বাগেরহাট','মেহেরপুর','চুয়াডাঙ্গা','কুষ্টিয়া','ঝালকাঠি','পটুয়াখালী','পিরোজপুর','ভোলা','বরগুনা','লালমনিরহাট','নীলফামারী','গাইবান্ধা','কুড়িগ্রাম','পঞ্চগড়','ঠাকুরগাঁও'].sort();
  document.querySelectorAll('select[id*="district"]').forEach(function(sel) {
    if (sel.options.length > 1) return;
    DISTRICTS.forEach(function(d) {
      var o = document.createElement('option');
      o.value = d; o.textContent = d;
      sel.appendChild(o);
    });
  });
};
document.addEventListener('DOMContentLoaded', window.joafPopulateDistricts);
