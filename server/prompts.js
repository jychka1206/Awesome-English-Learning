const LANG_NAMES = {
  zh: 'Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
};

export function getImproveSystem(nativeLang = 'zh', targetLang = 'en') {
  const native = LANG_NAMES[nativeLang] || nativeLang;
  const target = LANG_NAMES[targetLang] || targetLang;

  return `${target} learning. The learner's native language is ${native}. Input may be a speech transcript, ${native}, or mixed ${native}-${target}. Output one JSON only. Questions and options should reflect native-like usage (collocations, phrases, idiomatic choices). The final sentence (better_expression) must be based on the user's input (cleaned version): same meaning and structure, only correct errors and make small refinements; do not add or remove content, and do not heavily rephrase.

(1) cleaned_transcript: Clean the input into one ${target} sentence (remove fillers, repetition, self-correction). One period at the end. If the input is all ${native} or mixed ${native}-${target}, produce the natural ${target} equivalent and use that as cleaned_transcript.

(2) highlighted_sentence: Same as cleaned_transcript but wrap any wrong or unidiomatic parts in **. If no error, same as cleaned_transcript with no **. Do NOT treat contractions vs full forms as errors (have/'ve, is/'s, etc. are equivalent).

(3) questions: You MUST output exactly 3 multiple-choice (mcq) questions. Never output only 1 or 2—the "questions" array must have exactly 3 items.

CRITICAL — Improve is about correction and refinement of the ${target} expression only. It is NOT reading comprehension. Do NOT ask: what the sentence means, what a word refers to, main idea, inference, or why the speaker said something. Every question must be one of: (a) Which part is wrong and how to correct it? (b) Which is the correct / more idiomatic way to say this (word, phrase, or structure)? (c) Which option is the right refinement (collocation, phrasal verb, or fixed expression)? So: correction (fix errors) or refinement (better wording / native-like phrasing)—no meaning or comprehension.

  - All ${native}: all 3 questions = "What is the correct / natural ${target} for this (part)?" e.g. "The ${target} expression for '...' is: _____" with 4 options.
  - Mixed ${native}–${target}: first cover the ${native} parts (questions like "The ${target} expression for '…' is: _____"). The rest of the sentence is in ${target}—if that ${target} has errors, use questions to correct them too. So: some questions = correct/natural ${target} for the ${native} bits; remaining questions = correction or refinement of the ${target} parts. Always 3 questions total.
  - All ${target}: correction first, refinement second. Look at where the errors are and how many. Use one question per error for correction (what is wrong, what is the correct form); if there are fewer than 3 errors, use the remaining questions for refinement (more idiomatic option, better collocation, better phrasing). If there are no errors, all 3 questions = refinement only (more idiomatic way, natural collocation, better refinement). Never comprehension.
  - Every question: in ${target}; include the sentence or blank so the user can answer from the question alone; 4 distinct options; explanation in ${target} (why that choice is the right correction/refinement).
Format per item: {"type":"mcq","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}

(4) better_expression: Must be based on the input (cleaned_transcript): express the same content the user gave, only correct errors and make small refinements (e.g. natural collocation where needed). Do not add new ideas or remove parts; do not heavily rephrase or rewrite. Required. Contractions and full forms are both acceptable.

(5) better_expression_native: One ${native} translation of better_expression. Required.

JSON only:
{"cleaned_transcript":"","highlighted_sentence":"","questions":[{"type":"mcq","question":"","options":["","","",""],"correctIndex":0,"explanation":""},{"type":"mcq",...},{"type":"mcq",...}],"better_expression":"","better_expression_native":""}`;
}

export function getImproveUserMessage(sentence) {
  return sentence;
}

export function getUnderstandSystem(nativeLang = 'zh', targetLang = 'en') {
  const native = LANG_NAMES[nativeLang] || nativeLang;
  const target = LANG_NAMES[targetLang] || targetLang;

  return `[REQUIRED] ① question, options, explanation must all be in ${target}. Include the original sentence in the stem so the reader can answer from the question alone. ② Exactly 3 mcq questions, 4 distinct options each.

Long/difficult ${target} sentence comprehension. Output one JSON only. 3 questions on structure/meaning/clauses/reference/logic.
  - question: In ${target}. Include the original sentence in the stem (e.g. In "That the plates are moving is now beyond dispute.", what does "that" refer to?) so the reader can answer from the question alone.
  - options: All 4 options in ${target}, all different.
  - explanation: In ${target}.
native_translation = one ${native} translation of the sentence. structure_breakdown = 2–5 short points in ${native} (for the reveal section).

JSON structure only:
{"questions":[{"type":"mcq","question":"","options":["","","",""],"correctIndex":0,"explanation":""},...3 items],"native_translation":"","structure_breakdown":[]}`;
}

export function getUnderstandUserMessage(sentence) {
  return sentence;
}
