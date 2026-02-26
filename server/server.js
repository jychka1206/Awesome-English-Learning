import express from 'express';
import cors from 'cors';
import { loadEnv } from './loadEnv.js';
import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import {
  IMPROVE_SYSTEM,
  getImproveUserMessage,
  UNDERSTAND_SYSTEM,
  getUnderstandUserMessage,
} from './prompts.js';

loadEnv();
const app = express();
app.use(cors());
app.use(express.json());

const LLM = getLLMOptions();
if (!LLM.apiKey) {
  console.warn('Warning: No LLM API key. Set KIMI_API_KEY or DASHSCOPE_API_KEY in .env.');
}

async function llmJson(systemPrompt, userMessage, maxTokens = 4096) {
  const content = await chat(LLM.apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], maxTokens, { chatUrl: LLM.chatUrl, model: LLM.model });
  return parseJsonBlock(content);
}

/** 将英文一句翻译成中文，用于 better_expression_zh 缺失时兜底 */
async function translateToZh(english) {
  // #region agent log
  fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:translateToZh-entry',message:'translateToZh called',data:{input_len:(english||'').length,input_preview:(english||'').slice(0,60)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  const content = await chat(LLM.apiKey, [
    { role: 'system', content: '将用户给出的英文句子翻译成一句中文，只输出这一句中文，不要其他内容。' },
    { role: 'user', content: english },
  ], 256, { chatUrl: LLM.chatUrl, model: LLM.model });
  const out = (content || '').trim().replace(/^["']|["']$/g, '');
  // #region agent log
  fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:translateToZh-exit',message:'translateToZh result',data:{output_len:out.length,output_preview:out.slice(0,80)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  return out;
}

app.post('/api/improve', async (req, res) => {
  if (!LLM.apiKey) return res.status(500).json({ error: 'API key not configured (KIMI_API_KEY or DASHSCOPE_API_KEY)' });
  const { text } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const data = await llmJson(IMPROVE_SYSTEM, getImproveUserMessage(sentence), 1536);
    // #region agent log
    fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:improve-after-llm',message:'LLM parsed data',data:{keys:Object.keys(data||{}),better_expression_len:(data&&data.better_expression)?String(data.better_expression).length:0,better_expression_preview:(data&&data.better_expression)?String(data.better_expression).slice(0,80):null,q0_explanation_preview:data?.questions?.[0]?.explanation?String(data.questions[0].explanation).slice(0,120):null,q0_options:data?.questions?.[0]?.options||null},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(()=>{});
    // #endregion
    const questions = normalizeQuestions(data.questions);
    const better_expression = (
      typeof data.better_expression === 'string' ? data.better_expression
        : typeof data.betterExpression === 'string' ? data.betterExpression
        : ''
    ).trim();
    let better_expression_zh = '';
    if (better_expression) {
      try {
        better_expression_zh = await translateToZh(better_expression);
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:translateToZh-catch',message:'translateToZh threw',data:{err:e.message},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        console.warn('Translate-to-zh failed:', e.message);
      }
      if (!better_expression_zh) {
        const rawZh = data.better_expression_zh ?? data.betterExpressionZh;
        if (typeof rawZh === 'string') better_expression_zh = rawZh.trim();
        else if (rawZh != null && typeof rawZh === 'object' && typeof rawZh.text === 'string') better_expression_zh = rawZh.text.trim();
      }
      if (!better_expression_zh) better_expression_zh = '（翻译暂无）';
    }
    // #region agent log
    fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:after-zh',message:'better_expression_zh state',data:{better_expression_empty:!better_expression,better_expression_zh_len:better_expression_zh.length,better_expression_zh_preview:better_expression_zh.slice(0,80)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const cleaned_transcript = typeof data.cleaned_transcript === 'string' ? data.cleaned_transcript.trim() : '';
    const highlighted_sentence = typeof data.highlighted_sentence === 'string' ? data.highlighted_sentence.trim() : (cleaned_transcript || '');
    // #region agent log
    fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:improve-before-res',message:'Response payload',data:{better_expression_len:better_expression.length,better_expression_preview:better_expression.slice(0,80),q0_explanation_preview:questions[0]?.explanation?.slice(0,120)||null,q0_options:questions[0]?.options||null},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    const payload = { questions, better_expression, cleaned_transcript: cleaned_transcript || undefined, highlighted_sentence: highlighted_sentence || undefined };
    if (better_expression) payload.better_expression_zh = better_expression_zh || '（翻译暂无）';
    // #region agent log
    fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'server.js:res-json',message:'payload before res.json',data:{payload_keys:Object.keys(payload),has_better_expression_zh:'better_expression_zh' in payload,better_expression_zh_len:(payload.better_expression_zh||'').length,better_expression_zh_preview:(payload.better_expression_zh||'').slice(0,80)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return res.json(payload);
  } catch (e) {
    console.error('Improve error:', e);
    return res.status(500).json({ error: e.message || 'Improve failed' });
  }
});

app.post('/api/understand', async (req, res) => {
  if (!LLM.apiKey) return res.status(500).json({ error: 'API key not configured' });
  const { text } = req.body || {};
  const sentence = (text || '').trim();
  if (!sentence) return res.status(400).json({ error: 'Missing or empty "text"' });
  try {
    const data = await llmJson(UNDERSTAND_SYSTEM, getUnderstandUserMessage(sentence), 1536);
    const questions = normalizeQuestions(data.questions);
    const zh_translation = typeof data.zh_translation === 'string' ? data.zh_translation.trim() : '';
    const structure_breakdown = Array.isArray(data.structure_breakdown)
      ? data.structure_breakdown.map((s) => String(s).trim()).filter(Boolean)
      : [];
    return res.json({ questions, zh_translation, structure_breakdown });
  } catch (e) {
    console.error('Understand error:', e);
    return res.status(500).json({ error: e.message || 'Understand failed' });
  }
});

/** 统一题目格式：全部 mcq；选项去重；保证至少 3 题（不足则用最后一题补齐） */
function normalizeQuestions(list) {
  if (!Array.isArray(list)) return [];
  let arr = list.slice(0, 3);
  while (arr.length < 3 && arr.length > 0) arr.push(arr[arr.length - 1]);
  return arr.map((q, i) => {
    const base = {
      id: i + 1,
      type: 'mcq',
      question: String(q.question || '').trim(),
      explanation: String(q.explanation || '').trim(),
    };
    let options = Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o)) : [];
    for (let j = 0; j < options.length; j++) {
      const prev = options.slice(0, j).indexOf(options[j]);
      if (prev !== -1) options[j] = '选项' + (j + 1);
    }
    while (options.length < 4) options.push('选项' + (options.length + 1));
    base.options = options.slice(0, 4);
    base.correctIndex = Math.max(0, Math.min(3, parseInt(q.correctIndex, 10) || 0));
    return base;
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
