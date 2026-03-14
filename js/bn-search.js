// JOAF Bangla Search Utility v2.0
// English টাইপ করলে বাংলা match করবে + continent mapping
(function() {

// Continent → countries mapping (for community group search)
const CONTINENT_MAP = {
  // JOAF Asia — Asia র সব দেশ (Bangladesh বাদে)
  'joaf asia': ['afghanistan','armenia','azerbaijan','bahrain','bhutan','brunei','cambodia','china','cyprus','georgia','india','indonesia','iran','iraq','israel','japan','jordan','kazakhstan','kuwait','kyrgyzstan','laos','lebanon','malaysia','maldives','mongolia','myanmar','nepal','north korea','oman','pakistan','palestine','philippines','qatar','saudi','saudi arabia','singapore','south korea','sri lanka','syria','taiwan','tajikistan','thailand','timor','turkey','turkmenistan','uae','united arab emirates','uzbekistan','vietnam','yemen'],
  // JOAF Middle East
  'joaf middle east': ['bahrain','egypt','iran','iraq','israel','jordan','kuwait','lebanon','oman','palestine','qatar','saudi','saudi arabia','syria','turkey','uae','united arab emirates','yemen'],
  // JOAF Europe
  'joaf europe': ['albania','andorra','austria','belarus','belgium','bosnia','bulgaria','croatia','cyprus','czech','denmark','estonia','finland','france','germany','greece','hungary','iceland','ireland','italy','kosovo','latvia','liechtenstein','lithuania','luxembourg','malta','moldova','monaco','montenegro','netherlands','north macedonia','norway','poland','portugal','romania','russia','san marino','serbia','slovakia','slovenia','spain','sweden','switzerland','ukraine','uk','united kingdom','england','scotland','wales','vatican'],
  // JOAF Australia (we have this group)
  'joaf australia': ['australia','new zealand','fiji','papua','solomon','vanuatu','samoa','tonga','kiribati','micronesia','palau','nauru','tuvalu'],
  // JOAF Canada
  'joaf canada': ['canada'],
  // JOAF USA
  'joaf usa': ['usa','united states','america'],
};

// Bangladesh districts (English → Bengali)
const DISTRICTS = {
  'dhaka':'ঢাকা','chittagong':'চট্টগ্রাম','chattogram':'চট্টগ্রাম',
  'sylhet':'সিলেট','rajshahi':'রাজশাহী','khulna':'খুলনা',
  'barisal':'বরিশাল','barishal':'বরিশাল','rangpur':'রংপুর',
  'mymensingh':'ময়মনসিংহ','comilla':'কুমিল্লা','cumilla':'কুমিল্লা',
  'narayanganj':'নারায়ণগঞ্জ','gazipur':'গাজীপুর','tangail':'টাঙ্গাইল',
  'faridpur':'ফরিদপুর','jessore':'যশোর','jashore':'যশোর',
  'noakhali':'নোয়াখালী','bogra':'বগুড়া','bogura':'বগুড়া',
  'dinajpur':'দিনাজপুর','pabna':'পাবনা','narsingdi':'নরসিংদী',
  'manikganj':'মানিকগঞ্জ','munshiganj':'মুন্সীগঞ্জ',
  'shariatpur':'শরীয়তপুর','madaripur':'মাদারীপুর',
  'gopalganj':'গোপালগঞ্জ','kishoreganj':'কিশোরগঞ্জ',
  'netrokona':'নেত্রকোনা','jamalpur':'জামালপুর','sherpur':'শেরপুর',
  'brahmanbaria':'ব্রাহ্মণবাড়িয়া','chandpur':'চাঁদপুর',
  'feni':'ফেনী','lakshmipur':'লক্ষ্মীপুর','coxsbazar':'কক্সবাজার',
  'bandarban':'বান্দরবান','rangamati':'রাঙ্গামাটি',
  'khagrachhari':'খাগড়াছড়ি','habiganj':'হবিগঞ্জ',
  'moulvibazar':'মৌলভীবাজার','sunamganj':'সুনামগঞ্জ',
  'naogaon':'নওগাঁ','chapainawabganj':'চাঁপাইনবাবগঞ্জ',
  'natore':'নাটোর','sirajganj':'সিরাজগঞ্জ','joypurhat':'জয়পুরহাট',
  'satkhira':'সাতক্ষীরা','jhenaidah':'ঝিনাইদহ','magura':'মাগুরা',
  'narail':'নড়াইল','bagerhat':'বাগেরহাট','meherpur':'মেহেরপুর',
  'chuadanga':'চুয়াডাঙ্গা','kushtia':'কুষ্টিয়া','jhalokati':'ঝালকাঠি',
  'patuakhali':'পটুয়াখালী','pirojpur':'পিরোজপুর','bhola':'ভোলা',
  'barguna':'বরগুনা','lalmonirhat':'লালমনিরহাট','nilphamari':'নীলফামারী',
  'gaibandha':'গাইবান্ধা','kurigram':'কুড়িগ্রাম','panchagarh':'পঞ্চগড়',
  'thakurgaon':'ঠাকুরগাঁও',
};

// International cities/countries
const INTL = {
  'australia':'অস্ট্রেলিয়া','aus':'অস্ট্রেলিয়া',
  'usa':'যুক্তরাষ্ট্র','us':'যুক্তরাষ্ট্র','america':'যুক্তরাষ্ট্র',
  'uk':'যুক্তরাজ্য','england':'যুক্তরাজ্য','britain':'যুক্তরাজ্য',
  'canada':'কানাডা','europe':'ইউরোপ','germany':'জার্মানি',
  'berlin':'বার্লিন','london':'লন্ডন','new york':'নিউ ইয়র্ক',
  'newyork':'নিউ ইয়র্ক','toronto':'টরন্টো','sydney':'সিডনি',
  'malaysia':'মালয়েশিয়া','singapore':'সিঙ্গাপুর','dubai':'দুবাই',
  'saudi':'সৌদি','saudi arabia':'সৌদি আরব','riyadh':'রিয়াদ',
  'qatar':'কাতার','kuwait':'কুয়েত','bahrain':'বাহরাইন',
  'oman':'ওমান','uae':'সংযুক্ত আরব আমিরাত','abu dhabi':'আবুধাবি',
  'italy':'ইতালি','france':'ফ্রান্স','spain':'স্পেন',
  'japan':'জাপান','korea':'কোরিয়া','china':'চীন',
  'india':'ভারত','pakistan':'পাকিস্তান','nepal':'নেপাল',
  'sri lanka':'শ্রীলঙ্কা','myanmar':'মিয়ানমার','thailand':'থাইল্যান্ড',
  'indonesia':'ইন্দোনেশিয়া','philippines':'ফিলিপাইন',
  'middle east':'মধ্যপ্রাচ্য','middleeast':'মধ্যপ্রাচ্য',
  'asia':'এশিয়া','africa':'আফ্রিকা','europe':'ইউরোপ',
  'ireland':'আয়ারল্যান্ড','netherlands':'নেদারল্যান্ড',
  'sweden':'সুইডেন','norway':'নরওয়ে','denmark':'ডেনমার্ক',
  'finland':'ফিনল্যান্ড','switzerland':'সুইজারল্যান্ড',
  'austria':'অস্ট্রিয়া','belgium':'বেলজিয়াম','portugal':'পর্তুগাল',
  'greece':'গ্রিস','poland':'পোল্যান্ড','russia':'রাশিয়া',
  'turkey':'তুরস্ক','iran':'ইরান','iraq':'ইরাক',
  'jordan':'জর্ডান','lebanon':'লেবানন','syria':'সিরিয়া',
  'israel':'ইসরায়েল','egypt':'মিশর','libya':'লিবিয়া',
  'tunisia':'তিউনিসিয়া','morocco':'মরক্কো','algeria':'আলজেরিয়া',
  'nigeria':'নাইজেরিয়া','ghana':'ঘানা','kenya':'কেনিয়া',
  'ethiopia':'ইথিওপিয়া','south africa':'দক্ষিণ আফ্রিকা',
  'new zealand':'নিউজিল্যান্ড','fiji':'ফিজি',
  'bangladesh':'বাংলাদেশ',
};

const ALL_MAP = {...DISTRICTS, ...INTL};

// Check if query matches a continent group
function continentMatch(query, groupName) {
  const gName = groupName.toLowerCase();
  for (const [group, countries] of Object.entries(CONTINENT_MAP)) {
    if (gName.includes(group.replace('joaf ','')) || gName === group) {
      if (countries.some(c => c.startsWith(query) || query.startsWith(c) || c === query)) {
        return true;
      }
    }
  }
  return false;
}

// Main search function
window.bnSearch = function(query, text, groupName) {
  if (!query || !text) return false;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  const g = (groupName || text).toLowerCase();

  // Direct match
  if (t.includes(q)) return true;

  // Continent match — e.g. "malaysia" → JOAF Asia
  if (groupName && continentMatch(q, groupName)) return true;

  // Transliteration match
  const bn = ALL_MAP[q];
  if (bn && t.includes(bn.toLowerCase())) return true;

  // Partial match
  for (const [en, bnWord] of Object.entries(ALL_MAP)) {
    if (en.startsWith(q) && t.includes(bnWord.toLowerCase())) return true;
    if (q.startsWith(en) && en.length >= 3 && t.includes(bnWord.toLowerCase())) return true;
  }

  // Partial continent match
  if (groupName) {
    for (const [group, countries] of Object.entries(CONTINENT_MAP)) {
      if (g.includes(group.replace('joaf ',''))) {
        if (countries.some(c => c.startsWith(q) || q.startsWith(c.slice(0,4)))) return true;
      }
    }
  }

  return false;
};

})();
