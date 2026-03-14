// JOAF Bangla Search Utility
// English টাইপ করলে বাংলা match করবে
(function() {

// Common transliteration map
const MAP = {
  'dhaka':'ঢাকা','chittagong':'চট্টগ্রাম','chattogram':'চট্টগ্রাম',
  'sylhet':'সিলেট','rajshahi':'রাজশাহী','khulna':'খুলনা',
  'barisal':'বরিশাল','barishal':'বরিশাল','rangpur':'রংপুর',
  'mymensingh':'ময়মনসিংহ','comilla':'কুমিল্লা','cumilla':'কুমিল্লা',
  'narayanganj':'নারায়ণগঞ্জ','gazipur':'গাজীপুর','tangail':'টাঙ্গাইল',
  'faridpur':'ফরিদপুর','jessore':'যশোর','noakhali':'নোয়াখালী',
  'bogra':'বগুড়া','bogura':'বগুড়া','dinajpur':'দিনাজপুর',
  'pabna':'পাবনা','narsingdi':'নরসিংদী','manikganj':'মানিকগঞ্জ',
  'munshiganj':'মুন্সীগঞ্জ','shariatpur':'শরীয়তপুর','madaripur':'মাদারীপুর',
  'gopalganj':'গোপালগঞ্জ','kishoreganj':'কিশোরগঞ্জ','netrokona':'নেত্রকোনা',
  'jamalpur':'জামালপুর','sherpur':'শেরপুর','brahmanbaria':'ব্রাহ্মণবাড়িয়া',
  'chandpur':'চাঁদপুর','feni':'ফেনী','lakshmipur':'লক্ষ্মীপুর',
  'coxsbazar':'কক্সবাজার','bandarban':'বান্দরবান','rangamati':'রাঙ্গামাটি',
  'khagrachhari':'খাগড়াছড়ি','habiganj':'হবিগঞ্জ','moulvibazar':'মৌলভীবাজার',
  'sunamganj':'সুনামগঞ্জ','naogaon':'নওগাঁ','chapainawabganj':'চাঁপাইনবাবগঞ্জ',
  'natore':'নাটোর','sirajganj':'সিরাজগঞ্জ','joypurhat':'জয়পুরহাট',
  'satkhira':'সাতক্ষীরা','jhenaidah':'ঝিনাইদহ','magura':'মাগুরা',
  'narail':'নড়াইল','bagerhat':'বাগেরহাট','meherpur':'মেহেরপুর',
  'chuadanga':'চুয়াডাঙ্গা','kushtia':'কুষ্টিয়া','jhalokati':'ঝালকাঠি',
  'patuakhali':'পটুয়াখালী','pirojpur':'পিরোজপুর','bhola':'ভোলা',
  'barguna':'বরগুনা','lalmonirhat':'লালমনিরহাট','nilphamari':'নীলফামারী',
  'gaibandha':'গাইবান্ধা','kurigram':'কুড়িগ্রাম','panchagarh':'পঞ্চগড়',
  'thakurgaon':'ঠাকুরগাঁও',
  // আন্তর্জাতিক
  'australia':'অস্ট্রেলিয়া','usa':'যুক্তরাষ্ট্র','uk':'যুক্তরাজ্য',
  'canada':'কানাডা','europe':'ইউরোপ','germany':'জার্মানি',
  'berlin':'বার্লিন','london':'লন্ডন','newyork':'নিউ ইয়র্ক',
  'new york':'নিউ ইয়র্ক','toronto':'টরন্টো','sydney':'সিডনি',
  'malaysia':'মালয়েশিয়া','singapore':'সিঙ্গাপুর','dubai':'দুবাই',
  'saudi':'সৌদি','riyadh':'রিয়াদ','qatar':'কাতার','kuwait':'কুয়েত',
  'bahrain':'বাহরাইন','oman':'ওমান','uae':'সংযুক্ত আরব আমিরাত',
  'italy':'ইতালি','france':'ফ্রান্স','spain':'স্পেন','japan':'জাপান',
  'korea':'কোরিয়া','china':'চীন','india':'ভারত','pakistan':'পাকিস্তান',
  'middleeast':'মধ্যপ্রাচ্য','middle east':'মধ্যপ্রাচ্য','asia':'এশিয়া',
  // Blood groups
  'a+':'A+','a-':'A-','b+':'B+','b-':'B-','ab+':'AB+','ab-':'AB-','o+':'O+','o-':'O-',
  // Common words
  'blood':'রক্ত','donor':'দাতা','alert':'সতর্কতা','fire':'আগুন',
  'flood':'বন্যা','hospital':'হাসপাতাল','doctor':'ডাক্তার',
};

// Normalize search: try both original and transliterated
window.bnSearch = function(query, text) {
  if (!query || !text) return false;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();

  // Direct match
  if (t.includes(q)) return true;

  // Transliteration match
  const bn = MAP[q];
  if (bn && t.includes(bn.toLowerCase())) return true;

  // Partial transliteration
  for (const [en, bnWord] of Object.entries(MAP)) {
    if (en.startsWith(q) && t.includes(bnWord.toLowerCase())) return true;
    if (q.startsWith(en) && t.includes(bnWord.toLowerCase())) return true;
  }

  return false;
};

})();
