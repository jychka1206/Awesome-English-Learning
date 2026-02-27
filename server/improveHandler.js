import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import { getImproveSystem, getImproveUserMessage } from './prompts.js';
import { normalizeQuestions } from './normalizeQuestions.js';

const LANG_NAMES = {
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
};

export async function improveHandler(sentence, nativeLang = 'zh', targetLang = 'en') {
  const LLM = getLLMOptions();
  if (!LLM.apiKey) throw new Error('API key not configured (set OPENROUTER_API_KEY / KIMI_API_KEY / DASHSCOPE_API_KEY)');

  const nativeName = LANG_NAMES[nativeLang] || nativeLang;

  async function llmJson(systemPrompt, userMessage, maxTokens = 2048) {
    let lastErr = null;
    for (let i = 0; i < 3; i += 1) {
      const hardRule = '\n\nCRITICAL: Return one complete valid JSON object only. No markdown fences. No extra text.';
      const content = await chat(LLM.apiKey, [
        { role: 'system', content: `${systemPrompt}${hardRule}` },
        {
          role: 'user',
          content: i === 0
            ? userMessage
            : `${userMessage}\n\nYour previous response was not valid JSON. Output strict JSON now.`,
        },
      ], maxTokens + i * 256, { chatUrl: LLM.chatUrl, model: LLM.model });
      try {
        return parseJsonBlock(content);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('模型返回格式异常');
  }

  async function translateToNative(text) {
    const content = await chat(LLM.apiKey, [
      { role: 'system', content: `Translate the given sentence into one ${nativeName} sentence. Output only that single translated sentence, nothing else.` },
      { role: 'user', content: text },
    ], 256, { chatUrl: LLM.chatUrl, model: LLM.model });
    return (content || '').trim().replace(/^["']|["']$/g, '');
  }

  const data = await llmJson(getImproveSystem(nativeLang, targetLang), getImproveUserMessage(sentence), 1800);
  const questions = normalizeQuestions(data.questions);
  const better_expression = (
    typeof data.better_expression === 'string' ? data.better_expression
      : typeof data.betterExpression === 'string' ? data.betterExpression
      : ''
  ).trim();
  let better_expression_native = '';
  if (better_expression) {
    const raw = data.better_expression_native ?? data.better_expression_zh ?? data.betterExpressionZh;
    if (typeof raw === 'string') better_expression_native = raw.trim();
    else if (raw != null && typeof raw === 'object' && typeof raw.text === 'string') better_expression_native = raw.text.trim();

    if (!better_expression_native) {
      try {
        better_expression_native = await translateToNative(better_expression);
      } catch (e) {
        console.warn('translateToNative failed:', e.message);
      }
    }
    if (!better_expression_native) better_expression_native = '—';
  }
  const cleaned_transcript = typeof data.cleaned_transcript === 'string' ? data.cleaned_transcript.trim() : '';
  const highlighted_sentence = typeof data.highlighted_sentence === 'string' ? data.highlighted_sentence.trim() : (cleaned_transcript || '');
  const payload = { questions, better_expression, cleaned_transcript: cleaned_transcript || undefined, highlighted_sentence: highlighted_sentence || undefined };
  if (better_expression) payload.better_expression_native = better_expression_native || '—';
  return payload;
}
