// ============================================================
// JOAF Central Data — এখানে সব data রাখা। একটা জায়গায় বদলালেই সব জায়গায় আপডেট।
// ============================================================

const JOAF = {
  site: {
    name: "জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম",
    nameEn: "July Online Activists' Forum",
    abbr: "JOAF",
    tagline: "দেশ আগে, দল পরে",
    tagline2: "আমরা ফিরে এসেছি। এবার ভবিষ্যৎ গড়ার দায়িত্ব নিয়েই।",
    email: "joafforum@gmail.com",
    phone: "+880 1234-567890",
    address: "Road - 9, South Banasree, Dhaka-1219",
    logo: "/logoc7c3.png",
    favicon: "/favicon.ico",
    baseUrl: "https://julyforum.com",
    fbAppId: "1114707634145642",
    gaId: "G-QV3CFV7R98",
    version: "3.0.0",
    social: {
      facebook: "https://www.facebook.com/julyforum",
      twitter: "https://twitter.com/julyforum",
      instagram: "https://instagram.com/julyforum",
      youtube: "",
      whatsapp: ""
    }
  },

  nav: [
    { label: "Home", labelBn: "হোম", href: "/index.html", id: "home" },
    { label: "Events", labelBn: "ইভেন্ট", href: "/events.html", id: "events" },
    { label: "Media", labelBn: "মিডিয়া", href: "/media-news.html", id: "media" },
    { label: "Polls", labelBn: "জনমত", href: "/joaf-polls.html", id: "polls" },
    { label: "Community", labelBn: "কমিউনিটি", href: "/community.html", id: "community" },
    { label: "About", labelBn: "আমাদের সম্পর্কে", href: "/index.html#about-area", id: "about" },
    { label: "Join Form", labelBn: "সদস্যতা", href: "/membership.html", id: "membership" },
    { label: "Donate", labelBn: "অনুদান", href: "/donate.html", id: "donate" },
    { label: "Contact", labelBn: "যোগাযোগ", href: "/index.html#footer-area", id: "contact" },
  ],

  // নিউক্লিয়াস — কেন্দ্রীয় নেতৃত্ব
  nucleus: [
    {
      id: "farhana-sharmin-shuchi",
      name: "ফারহানা শারমিন শুচি",
      role: "সভাপতি",
      roleEn: "President",
      roleClass: "president",
      img: "/img/farhana-sharmin-shuchi.jpg",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/farhana-sharmin-shuchi.html"
    },
    {
      id: "shirin-chowdhury",
      name: "শিরিন চৌধুরী",
      role: "সাধারণ সম্পাদক",
      roleEn: "General Secretary",
      roleClass: "secretary",
      img: "/img/shirin-chowdhury.jpg",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/shirin-chowdhury.html"
    },
    {
      id: "muhtashimur-rahman-shihab",
      name: "মো. মুহতাশিমুর রহমান শিহাব",
      role: "মূখ্য সংগঠক",
      roleEn: "Chief Organizer",
      roleClass: "spokesperson",
      img: "/img/muhtashimur-rahman-shihab.jpg",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/muhtashimur-rahman-shihab.html"
    },
    {
      id: "munsi-mokhles-uddin-ashik",
      name: "মুন্সী মোখলেস উদ্দীন আশিক",
      role: "সিনিয়র যুগ্ম মূখ্য সংগঠক",
      roleEn: "Sr. Joint Chief Organizer",
      roleClass: "senior-coordinator",
      img: "/img/munsi-mokhles-uddin-ashik.jpg",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/munsi-mokhles-uddin-ashik.html"
    },
    {
      id: "tarannum-binte-zakir",
      name: "তারান্নুম বিনতে জাকির",
      role: "যুগ্ম মূখ্য সংগঠক",
      roleEn: "Joint Chief Organizer",
      roleClass: "coordinator",
      img: "/img/tarannum-binte-zakir.jpg",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/tarannum-binte-zakir.html"
    },
    {
      id: "mohammad-saiful-howladar",
      name: "মোহাম্মদ সাইফুল হাওলাদার",
      role: "যুগ্ম মূখ্য সংগঠক — দক্ষিণাঞ্চল",
      roleEn: "Joint Chief Organizer — South",
      roleClass: "coordinator",
      img: "/members/mohammad-saiful-howladar.png",
      facebook: "https://www.facebook.com/share/16yx91kkw4/",
      profilePage: "#"
    },
    {
      id: "ashfakur-rahman-himu",
      name: "আশফাকুর রহমান হিমু",
      role: "মূখ্য সংগঠক (গুজবরোধী সেল)",
      roleEn: "Chief Organizer — Anti-Rumor Cell",
      roleClass: "chief-organizer",
      img: "/img/ashfakur-rahman-himu.png",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/ashfakur-rahman-himu.html"
    },
    {
      id: "engineer-ayman-andalib",
      name: "ইঞ্জিনিয়ার আয়মান আন্দালীব",
      role: "মূখ্য সংগঠক (সম্মিলিত বৈপ্লবিক জোট)",
      roleEn: "Chief Organizer — Coalition",
      roleClass: "chief-organizer",
      img: "/img/engineer-ayman-andalib.png",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/engineer-ayman-andalib.html"
    },
    {
      id: "md-asifur-rahman",
      name: "মো. আসিফুর রহমান",
      role: "মূখ্য সংগঠক (মিডিয়া)",
      roleEn: "Chief Organizer — Media",
      roleClass: "chief-organizer",
      img: "/img/md-asifur-rahman.png",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/md-asifur-rahman.html"
    },
    {
      id: "asif-mahmud-khan",
      name: "আসিফ মাহমুদ খান",
      role: "সিনিয়র যুগ্ম মূখ্য সংগঠক (মিডিয়া)",
      roleEn: "Sr. Joint Chief Organizer — Media",
      roleClass: "senior-coordinator",
      img: "/img/asif-mahmud-khan.png",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/asif-mahmud-khan.html"
    },
    {
      id: "sm-shahiduzzaman-limon",
      name: "এস. এম. শহিদুজ্জামান লিমন",
      role: "মূখ্য সংগঠক (সার্কুলেশন টিম)",
      roleEn: "Chief Organizer — Circulation",
      roleClass: "chief-organizer",
      img: "/img/sm-shahiduzzaman-limon.png",
      facebook: "https://www.facebook.com/share/15yL2rq5XL/",
      profilePage: "/members/sm-shahiduzzaman-limon.html"
    }
  ],

  // উপদেষ্টা বলয়
  advisors: [
    { id: "rafe-salman", name: "রাফে সালমান", designation: "ফ্যাকাল্টি, ইউনাইটেড ইন্টারন্যাশনাল ইউনিভার্সিটি", img: "/members/rafe-salman.png", facebook: "#", profilePage: "/members/rafe-salman.html" },
    { id: "tushar-mohammad-abdul-hannan", name: "তুষার মোহাম্মদ আব্দুল হান্নান", designation: "কবি ও লেখক", img: "/members/tushar-mohammad-abdul-hannan.png", facebook: "#", profilePage: "/members/tushar-mohammad-abdul-hannan.html" },
    { id: "engineer-ahsanul-muzakkir", name: "ইঞ্জিনিয়ার আহসানুল মুযাক্কির", designation: "শিল্প উদ্যোক্তা", img: "/members/engineer-ahsanul-muzakkir.png", facebook: "#", profilePage: "/members/engineer-ahsanul-muzakkir.html" },
    { id: "mohammad-tahazzat-hossain", name: "মোহাম্মদ তাহাজ্জত হোসেন", designation: "জাগ্রত ব্যবসায়ী ও সমাজসেবক", img: "/members/mohammad-tahazzat-hossain.png", facebook: "#", profilePage: "/members/mohammad-tahazzat-hossain.html" },
    { id: "mohammad-nurul-huda-duke", name: "মোহাম্মদ নুরুল হুদা ডিউক", designation: "কবি ও এক্টিভিস্ট", img: "/members/mohammad-nurul-huda-duke.png", facebook: "#", profilePage: "/members/mohammad-nurul-huda-duke.html" },
    { id: "mozammel-hossain-mohan", name: "মোজাম্মেল হোসেন মোহন", designation: "সমাজ ও রাষ্ট্র চিন্তক", img: "/members/mozammel-hossain-mohan.png", facebook: "#", profilePage: "/members/mozammel-hossain-mohan.html" },
    { id: "saifuddin-jahid", name: "সাইফ উদ্দীন জাহিদ", designation: "লেখক ও ব্যবসায়ী", img: "/members/saifuddin-jahid.png", facebook: "#", profilePage: "/members/saifuddin-jahid.html" },
    { id: "captain-jahan", name: "ক্যাপ্টেন জাহান", designation: "অ্যাক্টিভিস্ট (বিডিআর বিদ্রোহ সংশ্লিষ্ট)", img: "/members/captain-jahan.png", facebook: "#", profilePage: "/members/captain-jahan.html" }
  ],

  // সম্মিলিত বৈপ্লবিক জোট
  coalition: [
    { id: "engineer-ayman-andalib", name: "ইঞ্জিনিয়ার আয়মান আন্দালীব", party: "ইনকিলাব মঞ্চ", img: "/members/engineer-ayman-andalib.png", facebook: "#", profilePage: "/members/engineer-ayman-andalib.html" },
    { id: "engineer-shak", name: "ইঞ্জিনিয়ার শাক", party: "জুলাই মঞ্চ", img: "/members/engineer-shak.png", facebook: "#", profilePage: "/members/engineer-shak.html" },
    { id: "ananta-majumdar", name: "অনন্ত মজুমদার", party: "গণপরিষদ", img: "/members/ananta-majumdar.png", facebook: "https://www.facebook.com/ananta.mazumder.2024", profilePage: "/members/ananta-majumdar.html" },
    { id: "azad-khan-bhasani", name: "আজাদ খান ভাসানী", party: "আহ্বায়ক, ভাষানী পরিষদ", img: "/members/azad-khan-bhasani.png", facebook: "#", profilePage: "/members/azad-khan-bhasani.html" },
    { id: "barrister-asaduzzaman-fuad", name: "ব্যারিস্টার আসাদুজ্জামান ফুয়াদ", party: "এবি পার্টি", img: "/members/barrister-asaduzzaman-fuad.png", facebook: "#", profilePage: "/members/barrister-asaduzzaman-fuad.html" },
    { id: "imran-naim", name: "ইমরান নাঈম", party: "এনসিপি", img: "/members/imran-naim.png", facebook: "#", profilePage: "/members/imran-naim.html" },
    { id: "bayezid-bostami", name: "বায়েজিদ বোস্তামী", party: "বাংলাদেশ ইসলামী ছাত্রশিবির", img: "/members/bayezid-bostami.png", facebook: "#", profilePage: "/members/bayezid-bostami.html" },
    { id: "syead-rakibul-hossain", name: "সৈয়দ রাকিবুল হোসেন", party: "বাংলাদেশ জাতীয় পার্টি (বিজেপি)", img: "/members/syead-rakibul-hossain.png", facebook: "#", profilePage: "/members/syead-rakibul-hossain.html" },
    { id: "sadik", name: "সাদিক", party: "সমাজতান্ত্রিক ছাত্র ফ্রন্ট", img: "/members/sadik.png", facebook: "#", profilePage: "/members/sadik.html" }
  ],

  // Press Releases — এখানে নতুন যোগ করলে সব জায়গায় আসবে
  pressReleases: [
    { id: 1, slug: "press-release-1", title: "প্রেস রিলিজ ১", date: "2025-05-09", img: "/img/press-release-1.jpg", summary: "জুলাই অনলাইন অ্যাক্টিভিস্টস ফোরাম (জোয়াফ) আনুষ্ঠানিকভাবে তাদের কার্যক্রম শুরু করার ঘোষণা দিয়েছে।" },
    { id: 2, slug: "press-release-2", title: "প্রেস রিলিজ ২", date: "2025-05-20", img: "/img/press-release-2.jpg", summary: "জোয়াফের দ্বিতীয় প্রেস রিলিজ।" },
    { id: 3, slug: "press-release-3", title: "প্রেস রিলিজ ৩", date: "2025-06-01", img: "/img/press-release-3.jpg", summary: "জোয়াফের তৃতীয় প্রেস রিলিজ।" },
    { id: 4, slug: "press-release-4", title: "প্রেস রিলিজ ৪", date: "2025-06-15", img: "/img/press-release-4.jpg", summary: "জোয়াফের চতুর্থ প্রেস রিলিজ।" },
    { id: 5, slug: "press-release-5", title: "প্রেস রিলিজ ৫", date: "2025-07-01", img: "/img/press-release-5.jpg", summary: "জোয়াফের পঞ্চম প্রেস রিলিজ।" },
    { id: 6, slug: "press-release-6", title: "প্রেস রিলিজ ৬", date: "2025-07-15", img: "/img/press-release-6.jpg", summary: "জোয়াফের ষষ্ঠ প্রেস রিলিজ।" },
    { id: 7, slug: "press-release-7", title: "প্রেস রিলিজ ৭", date: "2025-08-01", img: "/img/press-release-7.jpg", summary: "জোয়াফের সপ্তম প্রেস রিলিজ।" },
    { id: 8, slug: "press-release-8", title: "প্রেস রিলিজ ৮", date: "2025-08-20", img: "/img/press-release-8.jpg", summary: "জোয়াফের অষ্টম প্রেস রিলিজ।" }
  ],

  // Stats
  stats: [
    { number: "৮+", label: "বিভাগ" },
    { number: "৫০+", label: "জেলা প্রতিনিধি" },
    { number: "১০,০০০+", label: "সক্রিয় সদস্য" },
    { number: "২+", label: "আন্তর্জাতিক শাখা" }
  ]
};

// Bangla utility functions — সব জায়গায় ব্যবহার করা হবে
const BanglaUtil = {
  digits: ['০','১','২','৩','৪','৫','৬','৭','৮','৯'],
  months: ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"],
  weekdays: ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"],
  cities: { "Dhaka":"ঢাকা","Chattogram":"চট্টগ্রাম","Sylhet":"সিলেট","Khulna":"খুলনা","Barishal":"বরিশাল","Rajshahi":"রাজশাহী","Rangpur":"রংপুর","Mymensingh":"ময়মনসিংহ","Leipzig":"লাইপৎসিগ","London":"লন্ডন","New York":"নিউ ইয়র্ক" },

  toNum(n) { return n.toString().split('').map(d => (d>='0'&&d<='9') ? this.digits[d] : d).join(''); },
  toCity(c) { return this.cities[c] || c; },
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${this.weekdays[d.getDay()]}, ${this.toNum(d.getDate())} ${this.months[d.getMonth()]}, ${this.toNum(d.getFullYear())}`;
  },
  formatTime(d) {
    const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const period = h >= 4 && h < 12 ? 'সকাল' : h >= 12 && h < 18 ? 'বিকেল' : 'রাত';
    const dh = h % 12 || 12;
    return `${period} ${this.toNum(dh)}:${this.toNum(m<10?'0'+m:m)}:${this.toNum(s<10?'0'+s:s)}`;
  }
};
