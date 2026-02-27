import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import { getUnderstandSystem, getUnderstandUserMessage } from './prompts.js';
import { normalizeQuestions } from './normalizeQuestions.js';

export async function understandHandler(sentence, nativeLang = 'zh', targetLang = 'en') {
  const LLM = getLLMOptions();
  if (!LLM.apiKey) throw new Error('API key not configured (set OPENROUTER_API_KEY / KIMI_API_KEY / DASHSCOPE_API_KEY)');

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

  const data = await llmJson(getUnderstandSystem(nativeLang, targetLang), getUnderstandUserMessage(sentence), 1600);
  const questions = normalizeQuestions(data.questions);
  const native_translation = typeof data.native_translation === 'string'
    ? data.native_translation.trim()
    : typeof data.zh_translation === 'string' ? data.zh_translation.trim() : '';
  const structure_breakdown = Array.isArray(data.structure_breakdown)
    ? data.structure_breakdown.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return { questions, native_translation, structure_breakdown };
}
