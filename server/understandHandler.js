import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import { UNDERSTAND_SYSTEM, getUnderstandUserMessage } from './prompts.js';
import { normalizeQuestions } from './normalizeQuestions.js';

export async function understandHandler(sentence) {
  const LLM = getLLMOptions();
  if (!LLM.apiKey) throw new Error('API key not configured');

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

  const data = await llmJson(UNDERSTAND_SYSTEM, getUnderstandUserMessage(sentence), 2304);
  const questions = normalizeQuestions(data.questions);
  const zh_translation = typeof data.zh_translation === 'string' ? data.zh_translation.trim() : '';
  const structure_breakdown = Array.isArray(data.structure_breakdown)
    ? data.structure_breakdown.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return { questions, zh_translation, structure_breakdown };
}
