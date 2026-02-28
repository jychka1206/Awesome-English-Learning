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
  const text = typeof body.text === 'string' ? body.text : '';
  const nativeLang = typeof body.nativeLang === 'string' ? body.nativeLang : 'zh';
  const targetLang = typeof body.targetLang === 'string' ? body.targetLang : 'en';
  const sentence = text.trim();
  if (!sentence) return sendJson(res, 400, { error: 'Missing or empty "text"' });
  try {
    const { getLLMOptions } = await import('../server/kimi.js');
    const llm = getLLMOptions();
    if (!llm.apiKey) {
      return sendJson(res, 500, { error: '请在 Vercel 项目 Settings → Environment Variables 中配置 OPENROUTER_API_KEY（或 KIMI_API_KEY / DASHSCOPE_API_KEY），保存后点 Deployments → Redeploy。' });
    }
    const { understandHandler } = await import('../server/understandHandler.js');
    const payload = await understandHandler(sentence, nativeLang, targetLang);
    sendJson(res, 200, payload);
  } catch (e) {
    console.error('Understand error:', e);
    sendJson(res, 500, { error: e.message || 'Understand failed' });
  }
}
