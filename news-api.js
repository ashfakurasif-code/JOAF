// news-api.js

// API থেকে নিউজ fetch করার ফাংশন
async function fetchNewsFromAPI() {
    try {
        // আপনার API key ব্যবহার করুন
        const apiKey = 'adcf353db7c94c8b90a4974cfb4a4341';
        const apiUrl = `https://newsapi.org/v2/top-headlines?country=bd&apiKey=${apiKey}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.articles;
        
    } catch (error) {
        console.error('API থেকে নিউজ লোড করতে সমস্যা:', error);
        // API fail হলে fallback ডেটা return করুন
        return getFallbackNews();
    }
}

// Fallback ডেটা (API কাজ না করলে)
function getFallbackNews() {
    return [
        { title: "জবির সিন্ডিকেটে জকসু সংবিধির প্রস্তাব গৃহীত, থাকছে না বয়সের বাধা", url: "#" },
        { title: "ফরিদপুরে তিন মাসে গ্রেপ্তার ১৩২ মাদক ব্যবসায়ী", url: "#" },
        { title: "বাকৃবির আশরাফুল হক হলে একাধিক চুরির ঘটনা, ক্ষুব্ধ শিক্ষার্থীরা", url: "#" },
        { title: "শেখ বশিরউদ্দিনকে বিমান বাংলাদেশ এয়ারলাইন্সের চেয়ারম্যান পদে নিয়োগ দিলো সরকার", url: "#" },
        { title: "রয়টার্স ছাড়লেন আলোকচিত্রী ভ্যালেরি জিঙ্ক, গাজায় সাংবাদিক হত্যায় 'বৈধতা' দেয়ার অভিযোগ", url: "#" },
        { title: "রুমিন ফারহানার মিথ্যাচারের প্রতিবাদে এনসিপির সংবাদ সম্মেলন", url: "#" },
        { title: "রণবীর-আলিয়ার ২৫০ কটি রুপির নতুন বাংলো ঘিরে বিতর্ক, গোপনীয়তার প্রশ্ন তুললেন অভিনেত্রী", url: "#" },
        { title: "স্বর্ণের নতুন দাম নির্ধারণ", url: "#" },
        { title: "সিসিটিভি ক্যামেরার সামনে হবে ঢাকসুর ভোট গণনা", url: "#" },
        { title: "রাকসু নির্বাচন: ৩ দিনে মনোনয়নপত্র সংগ্রহ করেছেন ১৬৮ জন", url: "#" }
    ];
}

// নিউজ প্রদর্শনের ফাংশন
function displayNews(newsArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    // সর্বোচ্চ ১০টি নিউজ দেখান
    const newsToShow = newsArray.slice(0, 10);
    
    newsToShow.forEach((news, index) => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        newsItem.innerHTML = `
            <div class="news-number">${index + 1}</div>
            <div class="news-text">${news.title}</div>
        `;
        
        // নিউজের URL থাকলে ক্লিকযোগ্য করুন
        if (news.url && news.url !== '#') {
            newsItem.style.cursor = 'pointer';
            newsItem.addEventListener('click', () => {
                window.open(news.url, '_blank');
            });
        } else {
            newsItem.classList.add('unclickable');
        }
        
        container.appendChild(newsItem);
    });
}

// নিউজ লোড এবং প্রদর্শন
async function loadAndDisplayNews() {
    // লোডিং স্টেট দেখান
    document.getElementById('latest-news-container').innerHTML = `
        <div class="news-loading">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>সংবাদ লোড হচ্ছে...</p>
        </div>
    `;
    
    document.getElementById('popular-news-container').innerHTML = `
        <div class="news-loading">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>সংবাদ লোড হচ্ছে...</p>
        </div>
    `;
    
    const newsData = await fetchNewsFromAPI();
    
    // নিউজ প্রদর্শন
    displayNews(newsData, 'latest-news-container');
    displayNews(newsData, 'popular-news-container');
}

// ট্যাব ক্লিক ইভেন্ট হ্যান্ডলার
function setupTabHandlers() {
    const latestTab = document.getElementById('latest-tab');
    const popularTab = document.getElementById('popular-tab');
    
    if (latestTab) {
        latestTab.addEventListener('click', async () => {
            const newsData = await fetchNewsFromAPI();
            displayNews(newsData, 'latest-news-container');
        });
    }
    
    if (popularTab) {
        popularTab.addEventListener('click', async () => {
            const newsData = await fetchNewsFromAPI();
            displayNews(newsData, 'popular-news-container');
        });
    }
}

// পেজ লোড হলে নিউজ লোড করুন
document.addEventListener('DOMContentLoaded', function() {
    loadAndDisplayNews();
    setupTabHandlers();
    
    // প্রতি ১০ মিনিটে নিউজ রিফ্রেশ করুন
    setInterval(loadAndDisplayNews, 600000);
});
