import express from 'express';
import cors from 'cors';
import { loadEnv } from './loadEnv.js';
import { getLLMOptions } from './kimi.js';
import { improveHandler } from './improveHandler.js';
import { understandHandler } from './understandHandler.js';
import { transcribeAudioBase64 } from './replicateWhisper.js';

loadEnv();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const LLM = getLLMOptions();
if (!LLM.apiKey) {
  console.warn('Warning: No LLM API key. Set OPENROUTER_API_KEY, KIMI_API_KEY, or DASHSCOPE_API_KEY in .env.');
}
if (!(process.env.REPLICATE_API_TOKEN || '').trim()) {
  console.warn('Warning: No REPLICATE_API_TOKEN. Voice transcription endpoint will fail.');
}

app.post('/api/improve', async (req, res) => {
  const { text, nativeLang = 'zh', targetLang = 'en' } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const payload = await improveHandler(sentence, nativeLang, targetLang);
    return res.json(payload);
  } catch (e) {
    console.error('Improve error:', e);
    return res.status(500).json({ error: e.message || 'Improve failed' });
  }
});

app.post('/api/understand', async (req, res) => {
  const { text, nativeLang = 'zh', targetLang = 'en' } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const payload = await understandHandler(sentence, nativeLang, targetLang);
    return res.json(payload);
  } catch (e) {
    console.error('Understand error:', e);
    return res.status(500).json({ error: e.message || 'Understand failed' });
  }
});

app.post('/api/transcribe', async (req, res) => {
  const body = req.body || {};
  const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm';
  const language = typeof body.language === 'string' ? body.language : 'en';

  if (!audioBase64) return res.status(400).json({ error: 'Missing or empty "audioBase64"' });
  try {
    const text = await transcribeAudioBase64(audioBase64, mimeType, language);
    return res.json({ text });
  } catch (e) {
    console.error('Transcribe error:', e);
    return res.status(500).json({ error: e.message || 'Transcribe failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
