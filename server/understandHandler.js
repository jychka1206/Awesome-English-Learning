import { chat, parseJsonBlock, getLLMOptions } from './kimi.js';
import { UNDERSTAND_SYSTEM, getUnderstandUserMessage } from './prompts.js';
import { normalizeQuestions } from './normalizeQuestions.js';

export async function understandHandler(sentence) {
  const LLM = getLLMOptions();
  if (!LLM.apiKey) throw new Error('API key not configured');

  async function llmJson(systemPrompt, userMessage, maxTokens = 4096) {
    const content = await chat(LLM.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], maxTokens, { chatUrl: LLM.chatUrl, model: LLM.model });
    return parseJsonBlock(content);
  }

  const data = await llmJson(UNDERSTAND_SYSTEM, getUnderstandUserMessage(sentence), 1536);
  const questions = normalizeQuestions(data.questions);
  const zh_translation = typeof data.zh_translation === 'string' ? data.zh_translation.trim() : '';
  const structure_breakdown = Array.isArray(data.structure_breakdown)
    ? data.structure_breakdown.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return { questions, zh_translation, structure_breakdown };
}
