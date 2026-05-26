exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'HF_TOKEN not set' }) };
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }
  const { prompt } = body;

  // zeroscope-v2-xl — HF Inference API তে কাজ করে
  const models = [
    'https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w',
    'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b',
  ];

  let lastErr = '';
  for (const url of models) {
    try {
      const hfRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true',
        },
        body: JSON.stringify({ inputs: prompt }),
        // 9 minute timeout
        signal: AbortSignal.timeout(540000),
      });
      if (!hfRes.ok) {
        lastErr = await hfRes.text();
        continue;
      }
      const videoBuffer = await hfRes.arrayBuffer();
      const base64 = Buffer.from(videoBuffer).toString('base64');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'video/mp4' },
        body: base64,
        isBase64Encoded: true,
      };
    } catch(e) {
      lastErr = e.message;
      continue;
    }
  }
  return { statusCode: 503, body: JSON.stringify({ error: 'সব model busy — ৫ মিনিট পর চেষ্টা করুন। Detail: ' + lastErr.substring(0,200) }) };
};


<script>
document.addEventListener('DOMContentLoaded',()=>{
  const ids=['batchPostBtn','postSelectedBtn','qmPostBtn'];
  ids.forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.disabled=false;
      b.style.pointerEvents='auto';
      b.style.opacity='1';
      b.style.zIndex='99999';
    }
  });
});
</script>
