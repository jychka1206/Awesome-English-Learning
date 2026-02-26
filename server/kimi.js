const KIMI_CHAT_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_MODEL = 'moonshot-v1-8k';
const DASHSCOPE_CHAT_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DASHSCOPE_MODEL = 'qwen-plus';

async function chatOnce(apiKey, messages, maxTokens, chatUrl, model) {
  const url = chatUrl || KIMI_CHAT_URL;
  const m = model || KIMI_MODEL;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: m,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });
  } catch (e) {
    throw new Error('大模型服务暂时不可用，请检查网络或稍后重试。');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg;
    if (res.status === 401) {
      msg = 'API 返回 401：Key 无效或已过期。请检查 .env 中填的是否为当前使用的服务（Kimi 用 KIMI_API_KEY，通义用 DASHSCOPE_API_KEY），且无多余空格、换行或注释。';
    } else if (res.status >= 500) {
      msg = `大模型服务暂时不可用(${res.status})，请稍后重试。`;
    } else {
      msg = `API ${res.status}: ${text}`;
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (content == null) throw new Error('返回格式异常，请稍后重试。');
  return content;
}

/**
 * @param {string} apiKey
 * @param {Array} messages
 * @param {number} maxTokens
 * @param {{ chatUrl?: string, model?: string }} [opts] - 可选：chatUrl 与 model，不传则用 Kimi
 */
export async function chat(apiKey, messages, maxTokens = 4096, opts = {}) {
  const chatUrl = opts.chatUrl || KIMI_CHAT_URL;
  const model = opts.model || KIMI_MODEL;
  try {
    return await chatOnce(apiKey, messages, maxTokens, chatUrl, model);
  } catch (e) {
    const isRetryable = e.message?.includes('暂时不可用') || e.cause?.code === 'ECONNREFUSED' || e.name === 'TypeError';
    if (isRetryable) {
      await new Promise((r) => setTimeout(r, 2000));
      return chatOnce(apiKey, messages, maxTokens, chatUrl, model);
    }
    throw e;
  }
}

function cleanApiKey(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\s|\r|\n|\uFEFF/g, '').trim();
}

export function getLLMOptions() {
  const dashKey = cleanApiKey(process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY || '');
  const dashUrl = (process.env.DASHSCOPE_BASE_URL || '').trim().replace(/\/$/, '');
  if (dashKey) {
    return {
      apiKey: dashKey,
      chatUrl: dashUrl ? `${dashUrl}/chat/completions` : DASHSCOPE_CHAT_URL,
      model: process.env.LLM_MODEL || DASHSCOPE_MODEL,
    };
  }
  const kimiKey = cleanApiKey(process.env.KIMI_API_KEY || '');
  return {
    apiKey: kimiKey,
    chatUrl: KIMI_CHAT_URL,
    model: KIMI_MODEL,
  };
}

/** 从回复中解析 JSON（允许被 markdown 代码块包裹） */
export function parseJsonBlock(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/);
  const raw = match ? (match[1] || match[1]).trim() : trimmed;
  return JSON.parse(raw);
}
