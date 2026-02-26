import { improveHandler } from '../server/improveHandler.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text : '';
  const sentence = text.trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const payload = await improveHandler(sentence);
    res.status(200).json(payload);
  } catch (e) {
    console.error('Improve error:', e);
    res.status(500).json({ error: e.message || 'Improve failed' });
  }
}
