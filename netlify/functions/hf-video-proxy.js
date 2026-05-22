exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'HF_TOKEN not set' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { prompt, negative_prompt, num_frames, num_inference_steps, guidance_scale, seed, height, width } = body;

  // HuggingFace Inference API — Wan2.1 1.3B (fast, free tier)
  const HF_API_URL = 'https://api-inference.huggingface.co/models/Wan-Video/Wan2.1-T2V-1.3B';

  try {
    const hfRes = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: negative_prompt || '',
          num_frames: num_frames || 81,
          num_inference_steps: num_inference_steps || 20,
          guidance_scale: guidance_scale || 7.0,
          seed: seed || Math.floor(Math.random() * 2147483647),
          height: height || 480,
          width: width || 832,
        }
      }),
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      return { statusCode: hfRes.status, body: JSON.stringify({ error: errText }) };
    }

    // HF returns raw video bytes
    const videoBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(videoBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'video/mp4' },
      body: base64,
      isBase64Encoded: true,
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
