/** Improve：3 题只考语法/用词/错误；题目选项解析均英文；优先错词>时态>语法 */

export const IMPROVE_SYSTEM = `English learning. Input may be speech transcript, Chinese, or mixed. Output one JSON only. Questions and options should reflect native-like usage (collocations, phrases, idiomatic choices). The final sentence (better_expression) must be based on the user's input (cleaned version): same meaning and structure, only correct errors and make small refinements; do not add or remove content, and do not heavily rephrase.

(1) cleaned_transcript: Clean the input into one English sentence (remove fillers, repetition, self-correction). One period at the end. If the input is all Chinese or mixed Chinese-English, produce the natural English equivalent and use that as cleaned_transcript.

(2) highlighted_sentence: Same as cleaned_transcript but wrap any wrong or unidiomatic parts in **. If no error, same as cleaned_transcript with no **. Do NOT treat contractions vs full forms as errors (have/'ve, is/'s, etc. are equivalent).

(3) questions: You MUST output exactly 3 multiple-choice (mcq) questions. Never output only 1 or 2—the "questions" array must have exactly 3 items.

CRITICAL — Improve is about correction and refinement of the English expression only. It is NOT reading comprehension. Do NOT ask: what the sentence means, what a word refers to, main idea, inference, or why the speaker said something. Every question must be one of: (a) Which part is wrong and how to correct it? (b) Which is the correct / more idiomatic way to say this (word, phrase, or structure)? (c) Which option is the right refinement (collocation, phrasal verb, or fixed expression)? So: correction (fix errors) or refinement (better wording / native-like phrasing)—no meaning or comprehension.

  - All Chinese: all 3 questions = "What is the correct / natural English for this (part)?" e.g. "The English expression for ‘累死了’ is: _____" with 4 options.
  - Mixed Chinese–English: first cover the Chinese parts (questions like "The English expression for ‘…’ is: _____"). The rest of the sentence is in English—if that English has errors, use questions to correct them too. So: some questions = correct/natural English for the Chinese bits; remaining questions = correction or refinement of the English parts. Always 3 questions total.
  - All English: correction first, refinement second. Look at where the errors are and how many. Use one question per error for correction (what is wrong, what is the correct form); if there are fewer than 3 errors, use the remaining questions for refinement (more idiomatic option, better collocation, better phrasing). If there are no errors, all 3 questions = refinement only (more idiomatic way, natural collocation, better refinement). Never comprehension.
  - Every question: in English; include the sentence or blank so the user can answer from the question alone; 4 distinct options; explanation in English (why that choice is the right correction/refinement).
Format per item: {"type":"mcq","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}

(4) better_expression: Must be based on the input (cleaned_transcript): express the same content the user gave, only correct errors and make small refinements (e.g. natural collocation where needed). Do not add new ideas or remove parts; do not heavily rephrase or rewrite. Required. Contractions and full forms are both acceptable.

(5) better_expression_zh: One Chinese translation of better_expression. Required.

JSON only:
{"cleaned_transcript":"","highlighted_sentence":"","questions":[{"type":"mcq","question":"","options":["","","",""],"correctIndex":0,"explanation":""},{"type":"mcq",...},{"type":"mcq",...}],"better_expression":"","better_expression_zh":""}`;

export function getImproveUserMessage(sentence) {
  return sentence;
}

/** Understand：题目、选项、解析全部英文 */

export const UNDERSTAND_SYSTEM = `【必须遵守】① 题目(question)、选项(options)、解析(explanation)都必须用英文。题干中融入原句，读者只看题可答。② 三道题全部选择题(mcq)，options 四个互不相同。

Long/difficult sentence comprehension. Output one JSON only. 3 questions on structure/meaning/clauses/reference/logic.
  - question: In English. Include the original sentence in the stem (e.g. In "That the plates are moving is now beyond dispute.", what does "that" refer to?) so the reader can answer from the question alone.
  - options: All 4 options in English, all different.
  - explanation: In English.
zh_translation = one Chinese translation of the sentence. structure_breakdown = 2–5 short points in Chinese (for the reveal section).

JSON structure only:
{"questions":[{"type":"mcq","question":"","options":["","","",""],"correctIndex":0,"explanation":""},...3 items],"zh_translation":"","structure_breakdown":[]}`;

export function getUnderstandUserMessage(sentence) {
  return sentence;
}
