// Appwrite Function: hf-video-proxy
// HTTP trigger — POST only
// Proxies text-to-video requests to HuggingFace Inference API

const MODELS = [
  'https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w',
  'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b',
];

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') return res.json({ error: 'Method Not Allowed' }, 405);

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return res.json({ error: 'HF_TOKEN not set' }, 500);

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.json({ error: 'Invalid JSON' }, 400); }

  const { prompt } = body;
  if (!prompt) return res.json({ error: 'prompt required' }, 400);

  let lastErr = '';
  for (const url of MODELS) {
    try {
      const hfRes = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json', 'x-wait-for-model': 'true' },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(540000),
      });
      if (!hfRes.ok) { lastErr = await hfRes.text(); continue; }
      const videoBuffer = await hfRes.arrayBuffer();
      const base64 = Buffer.from(videoBuffer).toString('base64');
      log('hf-video-proxy: success with ' + url);
      // Return base64-encoded video
      return res.send(base64, 200, { 'Content-Type': 'video/mp4', 'Content-Transfer-Encoding': 'base64' });
    } catch (e) { lastErr = e.message; continue; }
  }

  error('hf-video-proxy: all models failed — ' + lastErr);
  return res.json({ error: 'সব model busy — ৫ মিনিট পর চেষ্টা করুন। Detail: ' + lastErr.substring(0, 200) }, 503);
};
