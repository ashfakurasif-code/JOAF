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
