// JOAF Data v5.1 — cache bust: 20260311
// ============================================================
// JOAF Central Data v4.0
// ✅ এই একটা ফাইল বদলালে সব জায়গায় আপডেট হবে
// ============================================================

const JOAF = {
  site: {
    name: "জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম",
    nameEn: "July Online Activists' Forum",
    abbr: "JOAF",
    tagline: "দেশ আগে, দল পরে",
    tagline2: "আমরা ফিরে এসেছি। এবার ভবিষ্যৎ গড়ার দায়িত্ব নিয়েই।",
    email: "joafforum@gmail.com",
    address: "রোড-৯, দক্ষিণ বনশ্রী, ঢাকা-১২১৯",
    logo: "/logoc7c3.png",
    favicon: "/favicon.ico",
    baseUrl: "https://julyforum.com",
    fbAppId: "1114707634145642",
    gaId: "G-QV3CFV7R98",
    version: "5.1.0",
    social: {
      facebook: "https://www.facebook.com/julyforum",
      twitter: "https://twitter.com/julyforum",
      instagram: "https://instagram.com/julyforum",
      youtube: "",
      whatsapp: "https://chat.whatsapp.com/DjABAy1NNQMEtSW3wh8bXg"
    },
    // Google Apps Script form submission endpoint
    formAction: "https://script.google.com/macros/s/AKfycbx_08UMe8YyqoQ8qWxzzwRZqt-VChzFkihLs1_5Gwr31B9SPIp08MjshlyIL2ieVm2r/exec"
  },

  // ── নেভিগেশন ──────────────────────────────────────────────
  // এখানে বদলালে সব pages এ nav আপডেট হবে
  nav: [
    { label: "🏠 মূলপাতা",      href: "/",                       id: "home"       },
    { label: "📅 অনুষ্ঠান",      href: "/events.html",            id: "events"     },
    { label: "📰 সংবাদ",         href: "/media-news.html",        id: "media"      },
    { label: "🗳️ জনমত",         href: "/joaf-polls.html",        id: "polls"      },
    { label: "🤝 কমিউনিটি",      href: "/community.html",         id: "community"  },
    { label: "💡 আমরা কে",       href: "/#about-area",            id: "about"      },
    { label: "✊ যোগ দিন",       href: "/membership.html",        id: "membership" },
    { label: "💚 সহযোগিতা",      href: "/donate.html",            id: "donate"     },
    { label: "📬 যোগাযোগ",       href: "/#contact-area",          id: "contact"    },
  ],

  // ── কমিউনিটি গ্রুপ ────────────────────────────────────────
  // এখানে নতুন group যোগ করুন — community.html auto-update হবে
  // whatsapp: "#" মানে link এখনো নেই
  communityGroups: [
    // মূল হাব
    { cat:"main",   name:"ঘোষণা",                       meta:"কমিউনিটিতে স্বাগতম!",           cover:"নোটিশ",              whatsapp:"https://chat.whatsapp.com/LksryV0rnTQ92jHpnQi2nH" },
    { cat:"main",   name:"জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম", meta:"বাংলাদেশ — মূল আলোচনা গ্রুপ", cover:"মূল গ্রুপ",          whatsapp:"https://chat.whatsapp.com/DjABAy1NNQMEtSW3wh8bXg" },
    { cat:"main",   name:"JOAF অ্যাডমিনিস্ট্রেশন",      meta:"অ্যাডমিন/কোর টিম",              cover:"অ্যাডমিন",           whatsapp:"https://chat.whatsapp.com/D1MZlzgTWOX60VnmjjnmGG" },
    // আঞ্চলিক — বাংলাদেশ
    { cat:"regional", name:"JOAF রংপুর",      meta:"রংপুর বিভাগ",       lat:25.7468, lng:89.2517,  whatsapp:"https://chat.whatsapp.com/IJpRYzN1SDyEzg0vUXKrA4" },
    { cat:"regional", name:"JOAF রাজশাহী",    meta:"রাজশাহী বিভাগ",     lat:24.3740, lng:88.6011,  whatsapp:"https://chat.whatsapp.com/Jwg49EBt2NoCfCepl15Zpx" },
    { cat:"regional", name:"JOAF বরিশাল",     meta:"বরিশাল বিভাগ",      lat:22.7050, lng:90.3700,  whatsapp:"https://chat.whatsapp.com/L3DDPArvbrJAOmykNEwwUy"  },
    { cat:"regional", name:"JOAF চট্টগ্রাম",  meta:"চট্টগ্রাম বিভাগ",   lat:22.3569, lng:91.7832,  whatsapp:"https://chat.whatsapp.com/GeuvZmew8Nn2xM7jnE1Cjr"  },
    { cat:"regional", name:"JOAF খুলনা",      meta:"খুলনা বিভাগ",       lat:22.8150, lng:89.5682,  whatsapp:"https://chat.whatsapp.com/DUR2CTilXWZLoK6gqXVyex"  },
    { cat:"regional", name:"JOAF নরসিংদী",    meta:"নরসিংদী জেলা",      lat:23.9220, lng:90.7176,  whatsapp:"https://chat.whatsapp.com/IS6pXplsHU7LBPuwZXtunG"  },
    { cat:"regional", name:"JOAF বগুড়া",      meta:"বগুড়া জেলা",        lat:24.8500, lng:89.3700,  whatsapp:"https://chat.whatsapp.com/E5CBvwIEfIwDyPL3RtvtGw" },
    { cat:"regional", name:"JOAF ফরিদপুর",    meta:"ফরিদপুর জেলা",      lat:23.6066, lng:89.8406,  whatsapp:"https://chat.whatsapp.com/E8h0BvwcU0p3N27H5bTcWU" },
    { cat:"regional", name:"JOAF গাজীপুর",    meta:"গাজীপুর জেলা",      lat:23.9981, lng:90.4203,  whatsapp:"https://chat.whatsapp.com/GWSciM4qsPGKEbponrXdm2" },
    { cat:"regional", name:"JOAF জামালপুর",   meta:"জামালপুর জেলা",     lat:24.9196, lng:89.9481,  whatsapp:"https://chat.whatsapp.com/Bssk1EgjT57CP3vux8E28h" },
    { cat:"regional", name:"JOAF মাদারীপুর",  meta:"মাদারীপুর জেলা",    lat:23.1710, lng:90.2094,  whatsapp:"https://chat.whatsapp.com/EBHEG1YieBR8FGFNEwvuzH" },
    { cat:"regional", name:"JOAF কুমিল্লা",   meta:"কুমিল্লা জেলা",     lat:23.4619, lng:91.1809,  whatsapp:"https://chat.whatsapp.com/CrXlPd2Q3MU82PGwb58eGX" },
    // আন্তর্জাতিক
    { cat:"intl", name:"JOAF অস্ট্রেলিয়া",  meta:"অস্ট্রেলিয়া অধ্যায়",  lat:-25.2744, lng:133.7751, whatsapp:"https://chat.whatsapp.com/HlXTBTaycyNK7VLncC1Xze" },
    { cat:"intl", name:"JOAF কানাডা",        meta:"কানাডা অধ্যায়",        lat:56.1304,  lng:-106.3468,whatsapp:"https://chat.whatsapp.com/Jut5PlN6YShFgBLyuvh4fb" },
    { cat:"intl", name:"JOAF যুক্তরাষ্ট্র",  meta:"যুক্তরাষ্ট্র অধ্যায়",  lat:37.0902,  lng:-95.7129, whatsapp:"https://chat.whatsapp.com/F6jFxnu4cJb0zdWsmSUesM" },
    { cat:"intl", name:"JOAF ইউরোপ",         meta:"ইউরোপ অধ্যায়",         lat:54.5260,  lng:15.2551,  whatsapp:"https://chat.whatsapp.com/F4Pt9TERXBHHHtqW9lI8Vw" },
    { cat:"intl", name:"JOAF এশিয়া",         meta:"এশিয়া অধ্যায়",         lat:34.0479,  lng:100.6197, whatsapp:"https://chat.whatsapp.com/Kf5gLqptBWU8DKtJ9adHYY" },
    { cat:"intl", name:"JOAF মধ্যপ্রাচ্য",    meta:"মধ্যপ্রাচ্য অধ্যায়",    lat:24.7743,  lng:46.7386,  whatsapp:"https://chat.whatsapp.com/L9XMR9U4XcbBWRGKPIJX8R" },
    // বিশেষায়িত
    { cat:"special", name:"JO গুজব প্রতিরোধ টিম", meta:"ফ্যাক্ট-চেকিং",          cover:"গুজব প্রতিরোধ",     whatsapp:"https://chat.whatsapp.com/IGkg2NNZCYoGzuSpqzUQWq" },
    { cat:"special", name:"JOAF মিডিয়া টিম",       meta:"মিডিয়া/প্রেস",           cover:"মিডিয়া টিম",        whatsapp:"https://chat.whatsapp.com/JRlOXeTphEr4OHGHjrDh9D" },
    { cat:"special", name:"JOAF জোট",                meta:"সম্মিলিত প্ল্যাটফর্ম",   cover:"জোট",               whatsapp:"https://chat.whatsapp.com/FpiaCUfbMbW4ef9JPssZUy" },
    { cat:"special", name:"ভাইরাল গ্রুপ",            meta:"মিডিয়া প্রচার",          cover:"ভাইরাল গ্রুপ",       whatsapp:"https://chat.whatsapp.com/HjxvRUT7eRGBp5MrccWHlm" },
    { cat:"special", name:"JOAF কনটেন্ট ক্রিয়েটর",  meta:"ডিজাইন/ভিডিও/কনটেন্ট",  cover:"কনটেন্ট ক্রিয়েটর",  whatsapp:"https://chat.whatsapp.com/LYbysvJN6TrBBqeF6jrMsE" },
    { cat:"special", name:"JOAF প্রিমিয়াম সদস্য",   meta:"প্রিমিয়াম সাপোর্টার",   cover:"প্রিমিয়াম",          whatsapp:"https://chat.whatsapp.com/D1MZlzgTWOX60VnmjjnmGG" },
    { cat:"special", name:"Justice For Hadi",           meta:"হাদির জন্য ন্যায়বিচার",     cover:"Justice For Hadi",  whatsapp:"https://chat.whatsapp.com/CIiza2Z9IdM4H2gJUWMObY" },
    { cat:"main",    name:"জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম-২.০", meta:"JOAF ২.০",              cover:"Forum-2.0",         whatsapp:"https://chat.whatsapp.com/Fnh6tjfUgdx7xMxyD9583z" },
    { cat:"regional", name:"JOAF যশোর",               meta:"যশোর জেলা",             lat:23.1667, lng:89.2167,   whatsapp:"https://chat.whatsapp.com/ECv9p3fedWL5tlSR7fRl6W" },
    // সম্প্রসারণ
  ],

  // ── নিউক্লিয়াস ────────────────────────────────────────────
  nucleus: [
    { id:"farhana-sharmin-shuchi",    name:"ফারহানা শারমিন শুচি",        role:"সভাপতি",                         img:"/img/farhana-sharmin-shuchi.jpg",    facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"shirin-chowdhury",          name:"শিরিন চৌধুরী",               role:"সাধারণ সম্পাদক",                 img:"/img/shirin-chowdhury.jpg",          facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"muhtashimur-rahman-shihab", name:"মো. মুহতাশিমুর রহমান শিহাব",role:"মূখ্য সংগঠক",                    img:"/img/muhtashimur-rahman-shihab.jpg", facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"munsi-mokhles-uddin-ashik", name:"মুন্সী মোখলেস উদ্দীন আশিক", role:"সিনিয়র যুগ্ম মূখ্য সংগঠক",     img:"/img/munsi-mokhles-uddin-ashik.jpg",facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"tarannum-binte-zakir",      name:"তারান্নুম বিনতে জাকির",       role:"যুগ্ম মূখ্য সংগঠক",             img:"/img/tarannum-binte-zakir.jpg",     facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"mohammad-saiful-howladar",  name:"মোহাম্মদ সাইফুল হাওলাদার",  role:"যুগ্ম মূখ্য সংগঠক — দক্ষিণাঞ্চল",img:"/members/mohammad-saiful-howladar.png",facebook:"https://www.facebook.com/share/16yx91kkw4/" },
    { id:"ashfakur-rahman-himu",      name:"আশফাকুর রহমান হিমু",         role:"মূখ্য সংগঠক (গুজবরোধী সেল)",    img:"/img/ashfakur-rahman-himu.png",     facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"engineer-ayman-andalib",    name:"ইঞ্জিনিয়ার আয়মান আন্দালীব",role:"মূখ্য সংগঠক (সম্মিলিত জোট)",   img:"/img/engineer-ayman-andalib.png",   facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"md-asifur-rahman",          name:"মো. আসিফুর রহমান",           role:"মূখ্য সংগঠক (মিডিয়া)",          img:"/img/md-asifur-rahman.png",         facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"asif-mahmud-khan",          name:"আসিফ মাহমুদ খান",            role:"সিনিয়র যুগ্ম মূখ্য সংগঠক (মিডিয়া)",img:"/img/asif-mahmud-khan.png",    facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
    { id:"sm-shahiduzzaman-limon",    name:"এস. এম. শহিদুজ্জামান লিমন", role:"মূখ্য সংগঠক (সার্কুলেশন টিম)",  img:"/img/sm-shahiduzzaman-limon.png",   facebook:"https://www.facebook.com/share/15yL2rq5XL/" },
  ],

  advisors: [
    { id:"rafe-salman",                    name:"রাফে সালমান",                  designation:"ফ্যাকাল্টি, ইউনাইটেড ইন্টারন্যাশনাল ইউনিভার্সিটি", img:"/members/rafe-salman.png",                    facebook:"#" },
    { id:"tushar-mohammad-abdul-hannan",   name:"তুষার মোহাম্মদ আব্দুল হান্নান",designation:"কবি ও লেখক",               img:"/members/tushar-mohammad-abdul-hannan.png",   facebook:"#" },
    { id:"engineer-ahsanul-muzakkir",      name:"ইঞ্জিনিয়ার আহসানুল মুযাক্কির",designation:"শিল্প উদ্যোক্তা",           img:"/members/engineer-ahsanul-muzakkir.png",      facebook:"#" },
    { id:"mohammad-tahazzat-hossain",      name:"মোহাম্মদ তাহাজ্জত হোসেন",    designation:"জাগ্রত ব্যবসায়ী ও সমাজসেবক",img:"/members/mohammad-tahazzat-hossain.png",      facebook:"#" },
    { id:"mohammad-nurul-huda-duke",       name:"মোহাম্মদ নুরুল হুদা ডিউক",   designation:"কবি ও এক্টিভিস্ট",          img:"/members/mohammad-nurul-huda-duke.png",       facebook:"#" },
    { id:"mozammel-hossain-mohan",         name:"মোজাম্মেল হোসেন মোহন",        designation:"সমাজ ও রাষ্ট্র চিন্তক",     img:"/members/mozammel-hossain-mohan.png",         facebook:"#" },
    { id:"saifuddin-jahid",                name:"সাইফ উদ্দীন জাহিদ",           designation:"লেখক ও ব্যবসায়ী",           img:"/members/saifuddin-jahid.png",                facebook:"#" },
    { id:"captain-jahan",                  name:"ক্যাপ্টেন জাহান",             designation:"অ্যাক্টিভিস্ট",              img:"/members/captain-jahan.png",                  facebook:"#" },
  ],

  coalition: [
    { id:"engineer-ayman-andalib",    name:"ইঞ্জিনিয়ার আয়মান আন্দালীব", party:"ইনকিলাব মঞ্চ",               img:"/members/engineer-ayman-andalib.png",   facebook:"#" },
    { id:"engineer-shak",             name:"ইঞ্জিনিয়ার শাক",             party:"জুলাই মঞ্চ",                  img:"/members/engineer-shak.png",            facebook:"#" },
    { id:"ananta-majumdar",           name:"অনন্ত মজুমদার",               party:"গণপরিষদ",                     img:"/members/ananta-majumdar.png",          facebook:"https://www.facebook.com/ananta.mazumder.2024" },
    { id:"azad-khan-bhasani",         name:"আজাদ খান ভাসানী",             party:"আহ্বায়ক, ভাষানী পরিষদ",      img:"/members/azad-khan-bhasani.png",        facebook:"#" },
    { id:"barrister-asaduzzaman-fuad",name:"ব্যারিস্টার আসাদুজ্জামান ফুয়াদ",party:"এবি পার্টি",            img:"/members/barrister-asaduzzaman-fuad.png",facebook:"#" },
    { id:"imran-naim",                name:"ইমরান নাঈম",                   party:"এনসিপি",                      img:"/members/imran-naim.png",               facebook:"#" },
    { id:"bayezid-bostami",           name:"বায়েজিদ বোস্তামী",           party:"বাংলাদেশ ইসলামী ছাত্রশিবির",  img:"/members/bayezid-bostami.png",          facebook:"#" },
    { id:"syead-rakibul-hossain",     name:"সৈয়দ রাকিবুল হোসেন",         party:"বাংলাদেশ জাতীয় পার্টি",     img:"/members/syead-rakibul-hossain.png",    facebook:"#" },
    { id:"sadik",                     name:"সাদিক",                        party:"সমাজতান্ত্রিক ছাত্র ফ্রন্ট",  img:"/members/sadik.png",                    facebook:"#" },
  ],

  // ── প্রেস রিলিজ ───────────────────────────────────────────
  // নতুন press release যোগ করতে এখানে শুধু একটা object যোগ করুন
  // তারপর /press-releases/ ফোল্ডারে ওই slug নামে একটা .txt ফাইল রাখুন
  // সিস্টেম auto-generate করবে বাকি সব
  pressReleases: [
    {
      id: 1,
      slug: "press-release-1",
      title: "JOAF আনুষ্ঠানিক যাত্রা শুরু",
      date: "2025-05-09",
      img: "/img/press-release-1.jpg",
      summary: "জুলাই অনলাইন অ্যাক্টিভিস্টস ফোরাম (জোয়াফ) আনুষ্ঠানিকভাবে তাদের কার্যক্রম শুরু করার ঘোষণা দিয়েছে।"
    },
    {
      id: 2,
      slug: "press-release-2",
      title: "JOAF দ্বিতীয় প্রেস রিলিজ",
      date: "2025-05-20",
      img: "/img/press-release-2.jpg",
      summary: "জোয়াফের দ্বিতীয় প্রেস রিলিজ।"
    },
    {
      id: 3,
      slug: "press-release-3",
      title: "JOAF তৃতীয় প্রেস রিলিজ",
      date: "2025-06-01",
      img: "/img/press-release-3.jpg",
      summary: "জোয়াফের তৃতীয় প্রেস রিলিজ।"
    },
    {
      id: 4,
      slug: "press-release-4",
      title: "JOAF চতুর্থ প্রেস রিলিজ",
      date: "2025-06-15",
      img: "/img/press-release-4.jpg",
      summary: "জোয়াফের চতুর্থ প্রেস রিলিজ।"
    },
    {
      id: 5,
      slug: "press-release-5",
      title: "JOAF পঞ্চম প্রেস রিলিজ",
      date: "2025-07-01",
      img: "/img/press-release-5.jpg",
      summary: "জোয়াফের পঞ্চম প্রেস রিলিজ।"
    },
    {
      id: 6,
      slug: "press-release-6",
      title: "JOAF ষষ্ঠ প্রেস রিলিজ",
      date: "2025-07-15",
      img: "/img/press-release-6.jpg",
      summary: "জোয়াফের ষষ্ঠ প্রেস রিলিজ।"
    },
    {
      id: 7,
      slug: "press-release-7",
      title: "JOAF সপ্তম প্রেস রিলিজ",
      date: "2025-08-01",
      img: "/img/press-release-7.jpg",
      summary: "জোয়াফের সপ্তম প্রেস রিলিজ।"
    },
    {
      id: 8,
      slug: "press-release-8",
      title: "JOAF অষ্টম প্রেস রিলিজ",
      date: "2025-08-20",
      img: "/img/press-release-8.jpg",
      summary: "জোয়াফের অষ্টম প্রেস রিলিজ।"
    },
  ],

  stats: [
    { number: "৮+",      label: "বিভাগ" },
    { number: "৫০+",     label: "জেলা প্রতিনিধি" },
    { number: "১০,০০০+", label: "সক্রিয় সদস্য" },
    { number: "২+",      label: "আন্তর্জাতিক শাখা" },
  ],

  ticker: [
    { text: "🗳️ জনমত জরিপ — আপনার মতামত দিন",       href: "/joaf-polls.html"      },
    { text: "📄 আর্থিক বিবরণী প্রকাশিত হয়েছে",        href: "/financial-report.html" },
    { text: "✊ সদস্যতা গ্রহণ চলছে — এখনই যোগ দিন",  href: "/membership.html"       },
    { text: "📢 নতুন প্রেস রিলিজ প্রকাশিত হয়েছে",     href: "/press-releases/press-release-8.html" },
    { text: "🤝 কমিউনিটি গ্রুপে যোগ দিন",             href: "/community.html"        },
    { text: "💚 আমাদের সহযোগিতা করুন",                href: "/donate.html"           },
  ]
};

// ── Bangla Utilities ───────────────────────────────────────
const BanglaUtil = {
  digits: ['০','১','২','৩','৪','৫','৬','৭','৮','৯'],
  months: ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"],
  weekdays: ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"],
  cities: {"Dhaka":"ঢাকা","Chattogram":"চট্টগ্রাম","Sylhet":"সিলেট","Khulna":"খুলনা","Barishal":"বরিশাল","Rajshahi":"রাজশাহী","Rangpur":"রংপুর","Mymensingh":"ময়মনসিংহ","Leipzig":"লাইপৎসিগ","London":"লন্ডন","New York":"নিউ ইয়র্ক","Toronto":"টরন্টো","Sydney":"সিডনি"},
  toNum(n) { return n.toString().split('').map(d=>(d>='0'&&d<='9')?this.digits[d]:d).join(''); },
  toCity(c) { return this.cities[c]||c; },
  formatDate(d) {
    const dt = typeof d==='string' ? new Date(d+'T00:00:00') : d;
    return `${this.weekdays[dt.getDay()]}, ${this.toNum(dt.getDate())} ${this.months[dt.getMonth()]}, ${this.toNum(dt.getFullYear())}`;
  },
  formatDateShort(d) {
    const dt = typeof d==='string' ? new Date(d+'T00:00:00') : d;
    return `${this.toNum(dt.getDate())} ${this.months[dt.getMonth()]} ${this.toNum(dt.getFullYear())}`;
  },
  formatTime(d) {
    const h=d.getHours(),m=d.getMinutes(),s=d.getSeconds();
    const period=h>=4&&h<12?'সকাল':h>=12&&h<18?'বিকেল':'রাত';
    const dh=h%12||12;
    return `${period} ${this.toNum(dh)}:${this.toNum(m<10?'0'+m:m)}:${this.toNum(s<10?'0'+s:s)}`;
  }
};
