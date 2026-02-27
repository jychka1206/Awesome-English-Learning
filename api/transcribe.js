function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(data));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const body = req.body || {};
  const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm';
  const language = typeof body.language === 'string' ? body.language : 'en';

  if (!audioBase64) return sendJson(res, 400, { error: 'Missing or empty "audioBase64"' });
  if (!(process.env.REPLICATE_API_TOKEN || '').trim()) {
    return sendJson(res, 500, { error: '请在 Vercel 项目 Settings → Environment Variables 中配置 REPLICATE_API_TOKEN。' });
  }

  try {
    const { transcribeAudioBase64 } = await import('../server/replicateWhisper.js');
    const text = await transcribeAudioBase64(audioBase64, mimeType, language);
    return sendJson(res, 200, { text });
  } catch (e) {
    console.error('Transcribe error:', e);
    return sendJson(res, 500, { error: e.message || 'Transcribe failed' });
  }
}
