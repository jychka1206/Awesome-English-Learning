import express from 'express';
import cors from 'cors';
import { loadEnv } from './loadEnv.js';
import { getLLMOptions } from './kimi.js';
import { improveHandler } from './improveHandler.js';
import { understandHandler } from './understandHandler.js';

loadEnv();
const app = express();
app.use(cors());
app.use(express.json());

const LLM = getLLMOptions();
if (!LLM.apiKey) {
  console.warn('Warning: No LLM API key. Set ENVX_API_KEY (recommended), or KIMI_API_KEY / DASHSCOPE_API_KEY in .env.');
} else {
  console.log(`LLM provider=${LLM.provider || 'unknown'} model=${LLM.model || 'unknown'}`);
}

app.post('/api/improve', async (req, res) => {
  const { text } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const payload = await improveHandler(sentence);
    return res.json(payload);
  } catch (e) {
    console.error('Improve error:', e);
    return res.status(500).json({ error: e.message || 'Improve failed' });
  }
});

app.post('/api/understand', async (req, res) => {
  const { text } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const payload = await understandHandler(sentence);
    return res.json(payload);
  } catch (e) {
    console.error('Understand error:', e);
    return res.status(500).json({ error: e.message || 'Understand failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
