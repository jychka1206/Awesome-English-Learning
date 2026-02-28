const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'moonshotai/kimi-k2.5';
const KIMI_CHAT_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_MODEL = 'moonshot-v1-8k';
const DASHSCOPE_CHAT_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DASHSCOPE_MODEL = 'qwen-plus';

async function chatOnce(apiKey, messages, maxTokens, chatUrl, model) {
  const url = chatUrl || OPENROUTER_CHAT_URL;
  const m = model || OPENROUTER_MODEL;
  const timeoutMs = Math.max(5000, parseInt(process.env.LLM_TIMEOUT_MS || '45000', 10) || 45000);
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (url.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'http://localhost';
      headers['X-Title'] = process.env.OPENROUTER_APP_NAME || 'Awesome English Learning';
    }
    const payload = {
      model: m,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
    };
    if (url.includes('openrouter.ai')) {
      payload.reasoning = { effort: 'none', exclude: true };
    }
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error(`大模型请求超时（>${Math.floor(timeoutMs / 1000)}s），请重试。`);
    }
    throw new Error('大模型服务暂时不可用，请检查网络或稍后重试。');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg;
    if (res.status === 401) {
      msg = 'API 返回 401：Key 无效或已过期。请检查环境变量中的 API Key 是否正确，且无多余空格、换行或注释。';
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
  const chatUrl = opts.chatUrl || OPENROUTER_CHAT_URL;
  const model = opts.model || OPENROUTER_MODEL;
  try {
    return await chatOnce(apiKey, messages, maxTokens, chatUrl, model);
  } catch (e) {
    const isRetryable = e.message?.includes('暂时不可用') || e.message?.includes('超时') || e.cause?.code === 'ECONNREFUSED' || e.name === 'TypeError';
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
  const openRouterKey = cleanApiKey(process.env.OPENROUTER_API_KEY || '');
  if (openRouterKey) {
    return {
      provider: 'openrouter',
      apiKey: openRouterKey,
      chatUrl: OPENROUTER_CHAT_URL,
      model: process.env.OPENROUTER_MODEL || process.env.LLM_MODEL || OPENROUTER_MODEL,
    };
  }

  const dashKey = cleanApiKey(process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY || '');
  const dashUrl = (process.env.DASHSCOPE_BASE_URL || '').trim().replace(/\/$/, '');
  if (dashKey) {
    return {
      provider: 'dashscope',
      apiKey: dashKey,
      chatUrl: dashUrl ? `${dashUrl}/chat/completions` : DASHSCOPE_CHAT_URL,
      model: process.env.DASHSCOPE_MODEL || process.env.LLM_MODEL || DASHSCOPE_MODEL,
    };
  }

  const kimiKey = cleanApiKey(process.env.KIMI_API_KEY || '');
  if (/^sk-or-v1-/i.test(kimiKey)) {
    return {
      provider: 'openrouter',
      apiKey: kimiKey,
      chatUrl: OPENROUTER_CHAT_URL,
      model: process.env.OPENROUTER_MODEL || process.env.LLM_MODEL || OPENROUTER_MODEL,
    };
  }
  return {
    provider: 'kimi',
    apiKey: kimiKey,
    chatUrl: KIMI_CHAT_URL,
    model: process.env.KIMI_MODEL || KIMI_MODEL,
  };
}

/** 从回复中解析 JSON（允许被 markdown 代码块包裹） */
export function parseJsonBlock(text) {
  const rawText = typeof text === 'string' ? text : String(text || '');
  const trimmed = rawText.trim();
  const candidates = [];

  if (trimmed) candidates.push(trimmed);

  const fenceMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const m of fenceMatches) {
    if (m[1]) candidates.push(m[1].trim());
  }

  const objectLike = trimmed.match(/\{[\s\S]*$/);
  if (objectLike?.[0]) candidates.push(objectLike[0].trim());

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch (_) {}
    const extracted = extractFirstJsonObject(c);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch (_) {}
    }
    const healed = healMaybeTruncatedJson(c);
    if (healed) {
      try {
        return JSON.parse(healed);
      } catch (_) {}
    }
  }

  const preview = trimmed.slice(0, 240).replace(/\s+/g, ' ');
  throw new Error(`模型返回不是完整 JSON（preview: ${preview || 'empty'}）`);
}

function extractFirstJsonObject(text) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (start === -1) {
      if (ch === '{') {
        start = i;
        depth = 1;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function healMaybeTruncatedJson(text) {
  const fromBrace = text.slice(text.indexOf('{'));
  if (!fromBrace || fromBrace[0] !== '{') return '';

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < fromBrace.length; i += 1) {
    const ch = fromBrace[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') depth = Math.max(0, depth - 1);
  }
  if (depth <= 0) return '';

  const noTrailingComma = fromBrace.replace(/,\s*([}\]])/g, '$1');
  return `${noTrailingComma}${'}'.repeat(depth)}`;
}
