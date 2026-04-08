import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import { IMPROVE_SYSTEM, getImproveUserMessage } from './prompts.js';
import { normalizeQuestions } from './normalizeQuestions.js';

export async function improveHandler(sentence) {
  const LLM = getLLMOptions();
  if (!LLM.apiKey) throw new Error('API key not configured (set ENVX_API_KEY, or KIMI_API_KEY / DASHSCOPE_API_KEY)');

  async function llmJson(systemPrompt, userMessage, maxTokens = 4096) {
    const baseOpts = {
      chatUrl: LLM.chatUrl,
      responseFormat: LLM.provider === 'envx' ? { type: 'json_object' } : undefined,
    };
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    const content = await chat(LLM.apiKey, messages, maxTokens, { ...baseOpts, model: LLM.model });
    try {
      return parseJsonBlock(content);
    } catch (e) {
      if (LLM.provider === 'envx' && LLM.model && LLM.model !== 'gpt-4o-mini') {
        const retry = await chat(LLM.apiKey, messages, maxTokens, { ...baseOpts, model: 'gpt-4o-mini' });
        return parseJsonBlock(retry);
      }
      throw e;
    }
  }

  async function translateToZh(english) {
    const content = await chat(LLM.apiKey, [
      { role: 'system', content: '将用户给出的英文句子翻译成一句中文，只输出这一句中文，不要其他内容。' },
      { role: 'user', content: english },
    ], 256, { chatUrl: LLM.chatUrl, model: LLM.model });
    return (content || '').trim().replace(/^["']|["']$/g, '');
  }

  const data = await llmJson(IMPROVE_SYSTEM, getImproveUserMessage(sentence), 2304);
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
      console.warn('Translate-to-zh failed:', e.message);
    }
    if (!better_expression_zh) {
      const rawZh = data.better_expression_zh ?? data.betterExpressionZh;
      if (typeof rawZh === 'string') better_expression_zh = rawZh.trim();
      else if (rawZh != null && typeof rawZh === 'object' && typeof rawZh.text === 'string') better_expression_zh = rawZh.text.trim();
    }
    if (!better_expression_zh) better_expression_zh = '（翻译暂无）';
  }
  const cleaned_transcript = typeof data.cleaned_transcript === 'string' ? data.cleaned_transcript.trim() : '';
  const highlighted_sentence = typeof data.highlighted_sentence === 'string' ? data.highlighted_sentence.trim() : (cleaned_transcript || '');
  const payload = { questions, better_expression, cleaned_transcript: cleaned_transcript || undefined, highlighted_sentence: highlighted_sentence || undefined };
  if (better_expression) payload.better_expression_zh = better_expression_zh || '（翻译暂无）';
  return payload;
}
