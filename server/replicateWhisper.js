const REPLICATE_PREDICTIONS_URL = 'https://api.replicate.com/v1/predictions';
const WHISPER_VERSION = '8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e';
const WAIT_SECONDS = 25;
const MAX_POLL_RETRIES = 20;
const POLL_INTERVAL_MS = 1500;

function cleanToken(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s|\r|\n|\uFEFF/g, '').trim();
}

function normalizeMimeType(raw) {
  if (typeof raw !== 'string') return 'audio/webm';
  const value = raw.trim().toLowerCase();
  if (/^audio\/[a-z0-9.+-]+$/.test(value)) return value;
  return 'audio/webm';
}

function extractTranscription(output) {
  if (typeof output === 'string') return output.trim();
  if (!output || typeof output !== 'object') return '';

  const keys = ['transcription', 'text', 'transcript'];
  for (const key of keys) {
    const value = output[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

async function fetchJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('语音转写服务暂时不可用，请检查网络后重试。');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const msg = payload?.detail || payload?.error || payload?.title || response.statusText || 'Replicate 请求失败';
    throw new Error(`Replicate API ${response.status}: ${msg}`);
  }

  return payload;
}

async function waitUntilFinished(getUrl, headers) {
  for (let i = 0; i < MAX_POLL_RETRIES; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const pred = await fetchJson(getUrl, { headers });
    if (pred.status === 'succeeded') return pred;
    if (pred.status === 'failed' || pred.status === 'canceled') {
      const msg = pred.error || '转写失败';
      throw new Error(`语音转写失败：${msg}`);
    }
  }
  throw new Error('语音转写超时，请缩短录音后重试。');
}

export async function transcribeAudioBase64(audioBase64, mimeType = 'audio/webm', language = 'en') {
  const token = cleanToken(process.env.REPLICATE_API_TOKEN || '');
  if (!token) throw new Error('未配置 REPLICATE_API_TOKEN');

  const data = typeof audioBase64 === 'string' ? audioBase64.trim() : '';
  if (!data) throw new Error('缺少音频数据');

  const safeMime = normalizeMimeType(mimeType);
  const safeLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'en';
  const audioDataUri = `data:${safeMime};base64,${data}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: `wait=${WAIT_SECONDS}`,
  };

  const created = await fetchJson(REPLICATE_PREDICTIONS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: WHISPER_VERSION,
      input: {
        audio: audioDataUri,
        language: safeLanguage,
      },
    }),
  });

  let prediction = created;
  if (prediction.status !== 'succeeded') {
    if (!prediction.urls?.get) throw new Error('语音转写状态未知，请稍后重试。');
    prediction = await waitUntilFinished(prediction.urls.get, headers);
  }

  const text = extractTranscription(prediction.output);
  if (!text) throw new Error('语音转写结果为空，请重试并说得更清晰一些。');
  return text;
}
