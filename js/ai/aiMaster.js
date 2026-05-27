/**
 * aiMaster.js — Unified AI Engine
 * ONE AI call → full MasterContentObject
 * Supports: text topic, OCR image, URL scrape
 */

const AI_PROXY = '/.netlify/functions/groq-proxy';

/** Build full prompt from topic/OCR text */
function buildMasterPrompt(input, tone = 'urgent') {
  return `তুমি বাংলাদেশের সেরা AI media content strategist।
Tone: ${tone}

INPUT:
"""
${input.trim()}
"""

একটি মাত্র JSON object return করো। কোনো extra text, markdown backtick বা explanation নেই।

JSON structure (সব ফিল্ড বাংলায়, hashtags ইংরেজি):
{
  "headline": "সংক্ষিপ্ত, শক্তিশালী শিরোনাম",
  "subHeadline": "সাব-হেডলাইন",
  "hook": "max ৮ শব্দের scroll stopper, question বা shocking statement",
  "summary": "২-৩ বাক্যের সারসংক্ষেপ",
  "breakingLine": "breaking news line যদি প্রযোজ্য হয়",
  "caption": "hook দিয়ে শুরু, emoji সহ, CTA + hashtags দিয়ে শেষ — full viral caption",
  "shortCaption": "max ৫০ শব্দের ছোট caption",
  "mediumCaption": "100-150 শব্দের মাঝারি caption",
  "longCaption": "200+ শব্দের বিস্তারিত caption",
  "hashtags": ["#JOAF", "#বাংলাদেশ"],
  "keywords": ["keyword1", "keyword2"],
  "emotion": "urgent|sad|positive|angry|neutral",
  "tone": "breaking|informative|motivational|critical",
  "urgency": "high|medium|low",
  "sentiment": "positive|negative|neutral",
  "cta": "call to action text",
  "engagementQuestion": "engagement বাড়ানোর প্রশ্ন",
  "thumbnailText": "thumbnail-এ বড় text (max ৫ শব্দ)",
  "reelTitle": "reel-এর title",
  "reelHook": "reel শুরুর hook text",
  "reelScript": ["slide 1 text", "slide 2 text", "slide 3 text"],
  "sceneBreakdown": [{"title":"scene name","duration":5,"text":"content","mood":"urgent"}],
  "voiceoverText": "full voiceover script",
  "voiceSegments": [{"text":"segment","startTime":0,"duration":3}],
  "subtitleLines": ["subtitle line 1", "subtitle line 2"],
  "highlightWords": ["গুরুত্বপূর্ণ", "জরুরি"],
  "emphasisWords": ["keyword"],
  "visualMood": "dark|vibrant|minimal|cinematic",
  "colorTheme": "red|blue|green|gold|white",
  "animationStyle": "fast|smooth|dramatic|minimal",
  "musicMood": "urgent|calm|uplifting|dramatic",
  "cardTemplate": "breaking|feature|quote|data",
  "reelTemplate": "news|story|highlight|announcement",
  "platformVariants": {
    "facebook": {"caption": "fb-specific caption", "postType": "photo|video|reel"},
    "instagram": {"caption": "ig caption", "postType": "reel|post"},
    "youtube": {"title": "yt title", "description": "yt description"}
  },
  "publishSettings": {"postType": "image|video|reel|carousel", "priority": "high|medium|low"},
  "renderSettings": {"aspectRatio": "1:1|9:16|16:9", "fps": 30, "duration": 30, "quality": "high"},
  "analyticsHints": {"viralScore": 75, "engagementPotential": 80, "controversyLevel": 20},
  "safety": {"nsfw": false, "political": false, "sensitive": false}
}`;
}

/**
 * Main AI generation function
 * @param {string} input — topic text, OCR text, or scraped content
 * @param {string} tone — urgent|informative|motivational
 * @param {File|null} imageFile — optional image for vision AI
 * @returns {Promise<MasterContentObject>}
 */
export async function generateMasterContent(input, tone = 'urgent', imageFile = null) {
  const messages = [];

  if (imageFile) {
    // Vision AI path — send image + text
    const base64 = await fileToBase64(imageFile);
    const mimeType = imageFile.type || 'image/jpeg';
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        { type: 'text', text: buildMasterPrompt(input || 'এই ছবি থেকে content তৈরি করো', tone) }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: buildMasterPrompt(input, tone)
    });
  }

  const res = await fetch(AI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: 2000, temperature: 0.7 })
  });

  if (!res.ok) throw new Error(`AI proxy error: ${res.status}`);

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  return parseMasterContent(text, input, tone);
}

/** Parse AI JSON response into MasterContentObject */
export function parseMasterContent(text, fallbackInput = '', tone = 'urgent') {
  // Strip markdown fences
  const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

  // Find JSON object
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) return buildFallbackContent(fallbackInput, tone, text);

  try {
    const obj = JSON.parse(clean.slice(start, end + 1));
    return normalizeContent(obj, fallbackInput, tone);
  } catch {
    return buildFallbackContent(fallbackInput, tone, text);
  }
}

/** Fill missing fields with sensible defaults */
function normalizeContent(obj, input, tone) {
  const id = `joaf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    topic: input,
    sourceType: 'manual',
    sourceUrl: '',
    language: 'bn',
    headline: obj.headline || input.slice(0, 60),
    subHeadline: obj.subHeadline || '',
    hook: obj.hook || obj.headline || '',
    summary: obj.summary || '',
    breakingLine: obj.breakingLine || '',
    caption: obj.caption || obj.headline || '',
    shortCaption: obj.shortCaption || obj.caption || '',
    mediumCaption: obj.mediumCaption || obj.caption || '',
    longCaption: obj.longCaption || obj.caption || '',
    hashtags: obj.hashtags || ['#JOAF', '#বাংলাদেশ'],
    keywords: obj.keywords || [],
    tags: obj.tags || [],
    emotion: obj.emotion || tone,
    tone: obj.tone || 'breaking',
    urgency: obj.urgency || 'high',
    sentiment: obj.sentiment || 'neutral',
    cta: obj.cta || 'শেয়ার করুন',
    engagementQuestion: obj.engagementQuestion || '',
    pollQuestion: obj.pollQuestion || '',
    thumbnailText: obj.thumbnailText || obj.headline?.slice(0, 30) || '',
    seoTitle: obj.seoTitle || obj.headline || '',
    seoDescription: obj.seoDescription || obj.summary || '',
    reelTitle: obj.reelTitle || obj.headline || '',
    reelHook: obj.reelHook || obj.hook || '',
    reelScript: obj.reelScript || [obj.hook, obj.summary, obj.cta].filter(Boolean),
    sceneBreakdown: obj.sceneBreakdown || buildDefaultScenes(obj),
    sceneTransitions: obj.sceneTransitions || ['fade', 'slide', 'fade'],
    sceneDurations: obj.sceneDurations || [5, 10, 5],
    voiceoverText: obj.voiceoverText || obj.caption || '',
    voiceSegments: obj.voiceSegments || [],
    subtitleLines: obj.subtitleLines || obj.reelScript || [],
    highlightWords: obj.highlightWords || [],
    emphasisWords: obj.emphasisWords || [],
    viralPhrases: obj.viralPhrases || [],
    visualMood: obj.visualMood || 'dark',
    colorTheme: obj.colorTheme || 'red',
    animationStyle: obj.animationStyle || 'dramatic',
    cameraStyle: obj.cameraStyle || 'dynamic',
    musicMood: obj.musicMood || 'urgent',
    sfxHints: obj.sfxHints || [],
    cardTemplate: obj.cardTemplate || 'breaking',
    reelTemplate: obj.reelTemplate || 'news',
    platformVariants: obj.platformVariants || {
      facebook: { caption: obj.caption || '', postType: 'photo' },
      instagram: { caption: obj.shortCaption || obj.caption || '', postType: 'post' },
      youtube: { title: obj.headline || '', description: obj.summary || '' }
    },
    publishSettings: obj.publishSettings || { postType: 'image', priority: 'high' },
    renderSettings: obj.renderSettings || { aspectRatio: '1:1', fps: 30, duration: 30, quality: 'high' },
    analyticsHints: obj.analyticsHints || { viralScore: 70, engagementPotential: 75, controversyLevel: 10 },
    safety: obj.safety || { nsfw: false, political: false, sensitive: false },
    assets: obj.assets || { images: [], audio: [], logos: [], overlays: [] }
  };
}

function buildDefaultScenes(obj) {
  return [
    { title: 'Hook', duration: 5, text: obj.hook || '', mood: 'urgent' },
    { title: 'Content', duration: 15, text: obj.summary || '', mood: 'informative' },
    { title: 'CTA', duration: 5, text: obj.cta || 'শেয়ার করুন', mood: 'positive' }
  ];
}

function buildFallbackContent(input, tone, rawText) {
  return normalizeContent({
    headline: input.slice(0, 80),
    summary: input,
    caption: input,
    emotion: tone
  }, input, tone);
}

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/** OCR → AI pipeline */
export async function processImageWithOCR(imageFile, tone = 'urgent') {
  // Try OCR first
  try {
    const { extractTextFromImage } = await import('./ocrEngine.js');
    const { text, confidence } = await extractTextFromImage(imageFile);
    if (confidence > 65 && text.trim().length > 20) {
      return generateMasterContent(text, tone, null);
    }
  } catch {}
  // Fall back to vision AI
  return generateMasterContent('', tone, imageFile);
}
