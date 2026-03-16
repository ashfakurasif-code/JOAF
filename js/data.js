// JOAF Data v6.0 — cache bust: 20260312
// ============================================================
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
    version: "6.0.0",
    social: {
      facebook: "https://www.facebook.com/julyforum",
      twitter: "https://twitter.com/julyforum",
      instagram: "https://instagram.com/julyforum",
      youtube: "",
      whatsapp: "https://chat.whatsapp.com/DjABAy1NNQMEtSW3wh8bXg"
    },
    formAction: "https://script.google.com/macros/s/AKfycbx_08UMe8YyqoQ8qWxzzwRZqt-VChzFkihLs1_5Gwr31B9SPIp08MjshlyIL2ieVm2r/exec"
  },

  // ── নেভিগেশন — priority অনুযায়ী সাজানো ──────────────────
  nav: [
    { label: "🏠 মূলপাতা",       href: "/",                    id: "home"      },
    { label: "🔥 আন্দোলন",        href: "/july-warriors.html",  id: "andolon",
      dropdown: [
        { label: "✊ জুলাই যোদ্ধা",     href: "/july-warriors.html"   },
        { label: "🏛️ নেতা ট্র্যাকার",  href: "/leader-tracker.html"  },
        { label: "🚫 দুর্নীতি রিপোর্ট", href: "/legal.html"            },
        { label: "🗳️ জনমত জরিপ",       href: "/joaf-polls.html"       },
        { label: "🩹 পরিবার সহায়",     href: "/july-family.html"      },
        { label: "🗳️ ভোটার তথ্য",      href: "/voter.html"            },
      ]
    },
    { label: "🆘 সেবা",           href: "/rokto.html",          id: "seva",
      dropdown: [
        { label: "🩸 রক্তদাতা",         href: "/rokto.html"            },
        { label: "🚨 জরুরি সতর্কতা",    href: "/alert.html"            },
        { label: "🛒 বাজার দর",         href: "/bajar.html"            },
        { label: "🌦️ আবহাওয়া",         href: "/weather.html"          },
        { label: "🏥 হাসপাতাল",         href: "/hospital.html"         },
        { label: "👨‍⚕️ ডাক্তার",        href: "/doctor.html"           },
        { label: "💊 ওষুধের দাম",       href: "/medicine.html"         },
        { label: "⚖️ আইনি সহায়তা",     href: "/legal.html"            },
        { label: "🍱 খাদ্য সহায়তা",    href: "/food-aid.html"         },
      ]
    },
    { label: "🌱 সুযোগ",          href: "/jobs.html",           id: "shujo",
      dropdown: [
        { label: "💼 চাকরি",            href: "/jobs.html"             },
        { label: "🎓 বৃত্তি",            href: "/jobs.html"             },
        { label: "🔧 কারিগর",           href: "/jobs.html"             },
        { label: "🌾 কৃষি তথ্য",        href: "/agriculture.html"      },
        { label: "👩‍💼 নারী উদ্যোক্তা", href: "/women-entrepreneur.html"},
        { label: "🚀 যুব উদ্যোক্তা",   href: "/youth-startup.html"    },
        { label: "💻 ফ্রিল্যান্সিং",    href: "/freelance.html"        },
      ]
    },
    { label: "🌐 JOAF",           href: "/community.html",      id: "joaf",
      dropdown: [
        { label: "👥 কমিউনিটি",         href: "/community.html"        },
        { label: "📰 সংবাদ",            href: "/news.html"             },
        { label: "📅 অনুষ্ঠান",         href: "/events.html"           },
        { label: "🗳️ জনমত",            href: "/joaf-polls.html"       },
        { label: "✊ জুলাই যোদ্ধা",     href: "/july-warriors.html"   },
        { label: "🏛️ নেতা ট্র্যাকার",  href: "/leader-tracker.html"  },
        { label: "📡 লাইভ",             href: "/live.html"             },
        { label: "💬 ফোরাম",            href: "/forum.html"            },
        { label: "🤝 যোগ দিন",          href: "/membership.html"       },
        { label: "💚 সহযোগিতা",         href: "/donate.html"           },
        { label: "📬 যোগাযোগ",          href: "/#contact-area"         },
      ]
    },
  ],

  // ── Push Notification messages — আকর্ষণীয় বাংলায় ──────────
  pushMessages: {
    welcome:    { title: "🔥 JOAF-এ স্বাগতম!", body: "আপনি এখন বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চের অংশ। Breaking news সবার আগে পাবেন — শুধু আপনি।" },
    breakingNews: { title: "🚨 ব্রেকিং নিউজ", body: "এইমাত্র একটি গুরুত্বপূর্ণ খবর এসেছে। এখনই দেখুন।" },
    dailyBajar: { title: "🛒 আজকের বাজার দর", body: "চাল, ডাল, সবজির দাম আপডেট হয়েছে। জানুন কোথায় কত সস্তা।" },
    weather:    { title: "🌦️ আবহাওয়া সতর্কতা", body: "আজ আপনার এলাকায় বিশেষ আবহাওয়া পূর্বাভাস রয়েছে। কৃষক ও জেলেরা সতর্ক থাকুন।" },
    poll:       { title: "🗳️ আজকের জনমত", body: "৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন — পুরস্কার আপনার জন্য অপেক্ষা করছে!" },
    streak:     { title: "🔥 Streak মিস করবেন না!", body: "আজকের ভোট এখনো বাকি। এখনই দিন — streak ভাঙলে আবার শুরু থেকে গুনতে হবে।" },
    blood:      { title: "🩸 জরুরি রক্ত দরকার!", body: "আপনার এলাকায় কেউ রক্তের জন্য অনুরোধ করেছেন। একটু সাহায্য করুন — একটি জীবন বাঁচান।" },
    alert:      { title: "🚨 জরুরি সতর্কতা!", body: "আপনার এলাকায় একটি জরুরি পরিস্থিতি জানানো হয়েছে। এখনই দেখুন।" },
    news:       { title: "📢 নতুন প্রেস রিলিজ", body: "JOAF-এর পক্ষ থেকে একটি গুরুত্বপূর্ণ বিবৃতি প্রকাশিত হয়েছে।" },
    reward:     { title: "🎉 পুরস্কার অর্জন!", body: "অভিনন্দন! আপনি ৩০ দিনের streak সম্পন্ন করেছেন। পুরস্কার দাবি করুন এখনই।" },
  },

  // ── PWA Install prompt message ─────────────────────────────
  pwaPrompt: {
    title: "📲 JOAF App Install করুন",
    subtitle: "www.julyforum.com — জুলাই চেতনার Digital Platform",
    bullets: [
      "🚨 জরুরি সতর্কতা — বন্যা, আগুন, দুর্ঘটনা",
      "🩸 রক্তের প্রয়োজনে তাৎক্ষণিক Alert",
      "📺 লাইভ সম্প্রচার ও Breaking News",
      "🏛️ নেতা ট্র্যাকার — প্রতিশ্রুতি vs বাস্তবতা",
      "🚫 দুর্নীতি রিপোর্ট করুন",
      "✊ জুলাই যোদ্ধা ও পরিবার সহায়",
      "🛒 বাজার দর · 💊 ওষুধের দাম · 🌤️ আবহাওয়া",
      "🏥 হাসপাতাল · ⚖️ আইনি সহায়তা · 🗳️ জনমত",
      "💼 চাকরি · 💻 ফ্রিল্যান্স · 🚀 উদ্যোক্তা",
      "🌐 বিশ্বজুড়ে JOAF নেটওয়ার্ক",
    ],
    install: "✅ Install করুন",
    later: "পরে"
  },

  // ── Notification permission prompt ─────────────────────────
  notifPrompt: {
    title: "🔔 Notification চালু করুন",
    subtitle: "ফোনে alert পেতে — ইন্টারনেট ছাড়াও",
    points: [
      "🔥 পাশের এলাকায় আগুন — আপনি কি জানতেন?",
      "🩸 এখনই কারো রক্ত দরকার — Alert পাচ্ছেন?",
      "📰 Breaking News — TV র আগে আপনার ফোনে",
      "✊ জুলাই আন্দোলনের আপডেট সবার আগে জানুন",
      "🏛️ আপনার নেতা কথা রাখছেন? ট্র্যাক করুন",
      "🚫 দুর্নীতির খবর চাপা পড়ার আগেই জানুন",
      "🛒 বাজারে যাওয়ার আগে দাম জেনে যান",
      "🌦️ কাল কি ঝড় আসছে? আগে জানুন",
    ],
    allow: "✅ চালু করুন",
    skip: "এখন না"
  },

  // ── কমিউনিটি গ্রুপ ────────────────────────────────────────
  communityGroups: [
    { cat:"main",   name:"ঘোষণা",                       meta:"কমিউনিটিতে স্বাগতম!",           cover:"নোটিশ",              whatsapp:"https://chat.whatsapp.com/LksryV0rnTQ92jHpnQi2nH" },
    { cat:"main",   name:"জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম", meta:"বাংলাদেশ — মূল আলোচনা গ্রুপ", cover:"মূল গ্রুপ",          whatsapp:"https://chat.whatsapp.com/DjABAy1NNQMEtSW3wh8bXg" },
    { cat:"main",   name:"JOAF অ্যাডমিনিস্ট্রেশন",      meta:"অ্যাডমিন/কোর টিম",              cover:"অ্যাডমিন",           whatsapp:"https://chat.whatsapp.com/D1MZlzgTWOX60VnmjjnmGG" },
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
    { cat:"regional", name:"JOAF যশোর",       meta:"যশোর জেলা",         lat:23.1667, lng:89.2167,   whatsapp:"https://chat.whatsapp.com/ECv9p3fedWL5tlSR7fRl6W" },
    { cat:"intl", name:"JOAF অস্ট্রেলিয়া",  meta:"অস্ট্রেলিয়া অধ্যায়",  lat:-25.2744, lng:133.7751, whatsapp:"https://chat.whatsapp.com/HlXTBTaycyNK7VLncC1Xze" },
    { cat:"intl", name:"JOAF কানাডা",        meta:"কানাডা অধ্যায়",        lat:56.1304,  lng:-106.3468,whatsapp:"https://chat.whatsapp.com/Jut5PlN6YShFgBLyuvh4fb" },
    { cat:"intl", name:"JOAF যুক্তরাষ্ট্র",  meta:"যুক্তরাষ্ট্র অধ্যায়",  lat:37.0902,  lng:-95.7129, whatsapp:"https://chat.whatsapp.com/F6jFxnu4cJb0zdWsmSUesM" },
    { cat:"intl", name:"JOAF ইউরোপ",         meta:"ইউরোপ অধ্যায়",         lat:54.5260,  lng:15.2551,  whatsapp:"https://chat.whatsapp.com/F4Pt9TERXBHHHtqW9lI8Vw" },
    { cat:"intl", name:"JOAF এশিয়া",         meta:"এশিয়া অধ্যায়",         lat:34.0479,  lng:100.6197, whatsapp:"https://chat.whatsapp.com/Kf5gLqptBWU8DKtJ9adHYY" },
    { cat:"intl", name:"JOAF মধ্যপ্রাচ্য",    meta:"মধ্যপ্রাচ্য অধ্যায়",    lat:24.7743,  lng:46.7386,  whatsapp:"https://chat.whatsapp.com/L9XMR9U4XcbBWRGKPIJX8R" },
    { cat:"special", name:"JO গুজব প্রতিরোধ টিম", meta:"ফ্যাক্ট-চেকিং",          cover:"গুজব প্রতিরোধ",     whatsapp:"https://chat.whatsapp.com/IGkg2NNZCYoGzuSpqzUQWq" },
    { cat:"special", name:"JOAF মিডিয়া টিম",       meta:"মিডিয়া/প্রেস",           cover:"মিডিয়া টিম",        whatsapp:"https://chat.whatsapp.com/JRlOXeTphEr4OHGHjrDh9D" },
    { cat:"special", name:"JOAF জোট",                meta:"সম্মিলিত প্ল্যাটফর্ম",   cover:"জোট",               whatsapp:"https://chat.whatsapp.com/FpiaCUfbMbW4ef9JPssZUy" },
    { cat:"special", name:"ভাইরাল গ্রুপ",            meta:"মিডিয়া প্রচার",          cover:"ভাইরাল গ্রুপ",       whatsapp:"https://chat.whatsapp.com/HjxvRUT7eRGBp5MrccWHlm" },
    { cat:"special", name:"JOAF কনটেন্ট ক্রিয়েটর",  meta:"ডিজাইন/ভিডিও/কনটেন্ট",  cover:"কনটেন্ট ক্রিয়েটর",  whatsapp:"https://chat.whatsapp.com/LYbysvJN6TrBBqeF6jrMsE" },
    { cat:"special", name:"JOAF প্রিমিয়াম সদস্য",   meta:"প্রিমিয়াম সাপোর্টার",   cover:"প্রিমিয়াম",          whatsapp:"https://chat.whatsapp.com/D1MZlzgTWOX60VnmjjnmGG" },
    { cat:"special", name:"Justice For Hadi",           meta:"হাদির জন্য ন্যায়বিচার",     cover:"Justice For Hadi",  whatsapp:"https://chat.whatsapp.com/CIiza2Z9IdM4H2gJUWMObY" },
    { cat:"main",    name:"জুলাই অনলাইন অ্যাক্টিভিস্ট ফোরাম-২.০", meta:"JOAF ২.০",              cover:"Forum-2.0",         whatsapp:"https://chat.whatsapp.com/Fnh6tjfUgdx7xMxyD9583z" },
  ],

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

  districtCoords: {
    'ঢাকা':{lat:23.8103,lng:90.4125},'চট্টগ্রাম':{lat:22.3569,lng:91.7832},'রাজশাহী':{lat:24.3745,lng:88.6042},'খুলনা':{lat:22.8456,lng:89.5403},'বরিশাল':{lat:22.7010,lng:90.3535},'সিলেট':{lat:24.8949,lng:91.8687},'রংপুর':{lat:25.7439,lng:89.2752},'ময়মনসিংহ':{lat:24.7471,lng:90.4203},'কুমিল্লা':{lat:23.4607,lng:91.1809},'নারায়ণগঞ্জ':{lat:23.6238,lng:90.4996},'গাজীপুর':{lat:23.9999,lng:90.4203},'টাঙ্গাইল':{lat:24.2513,lng:89.9167},'ফরিদপুর':{lat:23.6070,lng:89.8429},'যশোর':{lat:23.1667,lng:89.2167},'নোয়াখালী':{lat:22.8696,lng:91.0995},'বগুড়া':{lat:24.8465,lng:89.3773},'দিনাজপুর':{lat:25.6279,lng:88.6331},'পাবনা':{lat:24.0064,lng:89.2372},'নরসিংদী':{lat:23.9220,lng:90.7176},'মানিকগঞ্জ':{lat:23.8643,lng:90.0049},'মুন্সীগঞ্জ':{lat:23.5422,lng:90.5305},'শরীয়তপুর':{lat:23.2223,lng:90.4348},'মাদারীপুর':{lat:23.1710,lng:90.2094},'গোপালগঞ্জ':{lat:23.0047,lng:89.8267},'কিশোরগঞ্জ':{lat:24.4449,lng:90.7822},'নেত্রকোনা':{lat:24.8820,lng:90.7279},'জামালপুর':{lat:24.9196,lng:89.9481},'শেরপুর':{lat:25.0194,lng:90.0149},'ব্রাহ্মণবাড়িয়া':{lat:23.9570,lng:91.1115},'চাঁদপুর':{lat:23.2332,lng:90.6713},'ফেনী':{lat:23.0159,lng:91.3976},'লক্ষ্মীপুর':{lat:22.9424,lng:90.8412},'কক্সবাজার':{lat:21.4272,lng:92.0058},'বান্দরবান':{lat:22.1953,lng:92.2184},'রাঙ্গামাটি':{lat:22.6552,lng:92.1526},'খাগড়াছড়ি':{lat:23.1193,lng:91.9847},'হবিগঞ্জ':{lat:24.3745,lng:91.4156},'মৌলভীবাজার':{lat:24.4829,lng:91.7774},'সুনামগঞ্জ':{lat:25.0658,lng:91.3950},'নওগাঁ':{lat:24.8036,lng:88.9318},'চাঁপাইনবাবগঞ্জ':{lat:24.5965,lng:88.2760},'নাটোর':{lat:24.4103,lng:88.9956},'সিরাজগঞ্জ':{lat:24.4534,lng:89.7006},'জয়পুরহাট':{lat:25.0971,lng:89.0227},'সাতক্ষীরা':{lat:22.3155,lng:89.1118},'ঝিনাইদহ':{lat:23.1754,lng:89.1713},'মাগুরা':{lat:23.4873,lng:89.4193},'নড়াইল':{lat:23.1724,lng:89.5120},'বাগেরহাট':{lat:22.6602,lng:89.7854},'মেহেরপুর':{lat:23.7621,lng:88.6318},'চুয়াডাঙ্গা':{lat:23.6401,lng:88.8418},'কুষ্টিয়া':{lat:23.9014,lng:89.1226},'ঝালকাঠি':{lat:22.6440,lng:90.1987},'পটুয়াখালী':{lat:22.3596,lng:90.3296},'পিরোজপুর':{lat:22.5841,lng:89.9661},'ভোলা':{lat:22.6855,lng:90.6448},'বরগুনা':{lat:22.1500,lng:90.1124},'লালমনিরহাট':{lat:25.9923,lng:89.2847},'নীলফামারী':{lat:25.9316,lng:88.8560},'গাইবান্ধা':{lat:25.3288,lng:89.5286},'কুড়িগ্রাম':{lat:25.8074,lng:89.6363},'পঞ্চগড়':{lat:26.3411,lng:88.5542},'ঠাকুরগাঁও':{lat:26.0316,lng:88.4616},
  },

  pressReleases: [
    { id:1, slug:"press-release-1", title:"JOAF আনুষ্ঠানিক যাত্রা শুরু",   date:"2025-05-09", img:"/img/press-release-1.jpg", summary:"জুলাই অনলাইন অ্যাক্টিভিস্টস ফোরাম (জোয়াফ) আনুষ্ঠানিকভাবে তাদের কার্যক্রম শুরু করার ঘোষণা দিয়েছে।" },
    { id:2, slug:"press-release-2", title:"JOAF দ্বিতীয় প্রেস রিলিজ",      date:"2025-05-20", img:"/img/press-release-2.jpg", summary:"জোয়াফের দ্বিতীয় প্রেস রিলিজ।" },
    { id:3, slug:"press-release-3", title:"JOAF তৃতীয় প্রেস রিলিজ",        date:"2025-06-01", img:"/img/press-release-3.jpg", summary:"জোয়াফের তৃতীয় প্রেস রিলিজ।" },
    { id:4, slug:"press-release-4", title:"JOAF চতুর্থ প্রেস রিলিজ",        date:"2025-06-15", img:"/img/press-release-4.jpg", summary:"জোয়াফের চতুর্থ প্রেস রিলিজ।" },
    { id:5, slug:"press-release-5", title:"JOAF পঞ্চম প্রেস রিলিজ",         date:"2025-07-01", img:"/img/press-release-5.jpg", summary:"জোয়াফের পঞ্চম প্রেস রিলিজ।" },
    { id:6, slug:"press-release-6", title:"JOAF ষষ্ঠ প্রেস রিলিজ",          date:"2025-07-15", img:"/img/press-release-6.jpg", summary:"জোয়াফের ষষ্ঠ প্রেস রিলিজ।" },
    { id:7, slug:"press-release-7", title:"JOAF সপ্তম প্রেস রিলিজ",         date:"2025-08-01", img:"/img/press-release-7.jpg", summary:"জোয়াফের সপ্তম প্রেস রিলিজ।" },
    { id:8, slug:"press-release-8", title:"JOAF অষ্টম প্রেস রিলিজ",         date:"2025-08-20", img:"/img/press-release-8.jpg", summary:"জোয়াফের অষ্টম প্রেস রিলিজ।" },
  ],

  stats: [
    { number:"৮+",      label:"বিভাগ" },
    { number:"৫০+",     label:"জেলা প্রতিনিধি" },
    { number:"১০,০০০+", label:"সক্রিয় সদস্য" },
    { number:"২+",      label:"আন্তর্জাতিক শাখা" },
  ],

  ticker: [
    { text:"🚨 Breaking — সর্বশেষ খবর এখনই দেখুন",          href:"/news.html"      },
    { text:"🗳️ জনমত জরিপ — আজকের ভোট দিন, পুরস্কার জিতুন", href:"/joaf-polls.html"      },
    { text:"🩸 রক্ত দরকার? এখনই খুঁজুন",                    href:"/rokto.html"           },
    { text:"📄 আর্থিক বিবরণী প্রকাশিত হয়েছে",               href:"/financial-report.html"},
    { text:"✊ সদস্যতা গ্রহণ চলছে — এখনই যোগ দিন",          href:"/membership.html"      },
    { text:"🤝 কমিউনিটি গ্রুপে যোগ দিন",                    href:"/community.html"       },
  ]
};

// ── FULL MULTI-LEVEL MAZE DATA ────────────────────────────────
JOAF.maze = {
  layers: {
    0: { type:"big", tiles:[
      { id:1, icon:"🔥", name:"আন্দোলন",  sub:"জুলাই যোদ্ধা & ট্র্যাকার", color:"jc-red",   goTo:1 },
      { id:2, icon:"🆘", name:"সেবা",     sub:"রক্ত + জরুরি সতর্কতা",   color:"jc-teal",  goTo:2 },
      { id:3, icon:"🌱", name:"সুযোগ",    sub:"চাকরি, বৃত্তি, কারিগর",  color:"jc-green", goTo:3 },
      { id:4, icon:"🌐", name:"JOAF",     sub:"কমিউনিটি & যোগ দিন",    color:"jc-blue",  goTo:4 }
    ]},
    1: { type:"sub", title:"আন্দোলন", tiles:[
      { icon:"✊",  name:"জুলাই যোদ্ধা",    link:"/july-warriors.html" },
      { icon:"🏛️", name:"নেতা ট্র্যাকার",  link:"/leader-tracker.html" },
      { icon:"🚫", name:"দুর্নীতি রিপোর্ট", link:"/legal.html" },
      { icon:"🗳️", name:"জনমত জরিপ",       link:"/joaf-polls.html" },
      { icon:"🩹", name:"পরিবার সহায়",     link:"/july-family.html" },
      { icon:"🗳️", name:"ভোটার তথ্য",      link:"/voter.html" }
    ]},
    2: { type:"sub", title:"সেবা", tiles:[
      { icon:"🩸", name:"রক্তদাতা",      link:"/rokto.html" },
      { icon:"🚨", name:"জরুরি সতর্কতা", link:"/alert.html" },
      { icon:"🛒", name:"বাজার দর",      link:"/bajar.html" },
      { icon:"🌦️", name:"আবহাওয়া",      link:"/weather.html" },
      { icon:"🏥", name:"হাসপাতাল",      link:"/hospital.html" },
      { icon:"👨‍⚕️", name:"ডাক্তার",     link:"/doctor.html" },
      { icon:"💊", name:"ওষুধের দাম",    link:"/medicine.html" },
      { icon:"⚖️", name:"আইনি সহায়তা",  link:"/legal.html" },
      { icon:"🍱", name:"খাদ্য সহায়তা", link:"/food-aid.html" }
    ]},
    3: { type:"sub", title:"সুযোগ", tiles:[
      { icon:"💼", name:"চাকরি",         link:"/jobs.html" },
      { icon:"🎓", name:"বৃত্তি",         link:"/jobs.html" },
      { icon:"🔧", name:"কারিগর",        link:"/jobs.html" },
      { icon:"🌾", name:"কৃষি তথ্য",     link:"/agriculture.html" },
      { icon:"👩‍💼", name:"নারী উদ্যোক্তা", link:"/women-entrepreneur.html" },
      { icon:"🚀", name:"যুব উদ্যোক্তা", link:"/youth-startup.html" },
      { icon:"💻", name:"ফ্রিল্যান্সিং",  link:"/freelance.html" }
    ]},
    4: { type:"sub", title:"JOAF", tiles:[
      { icon:"👥", name:"কমিউনিটি",    link:"/community.html" },
      { icon:"📰", name:"সংবাদ",        link:"/news.html" },
      { icon:"📅", name:"অনুষ্ঠান",     link:"/events.html" },
      { icon:"🤝", name:"যোগ দিন",      link:"/membership.html" },
      { icon:"💚", name:"সহযোগিতা",    link:"/donate.html" },
      { icon:"📡", name:"লাইভ",         link:"/live.html" },
      { icon:"💬", name:"ফোরাম",        link:"/forum.html" }
    ]}
  }
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
