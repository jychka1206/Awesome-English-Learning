import React, { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const HISTORY_KEY = 'sentence3q_history';
const LANG_PREF_KEY = 'sentence3q_lang';

// ── Language options ──────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { code: 'zh', label: '中文', whisper: 'zh' },
  { code: 'en', label: 'English', whisper: 'en' },
  { code: 'ja', label: '日本語', whisper: 'ja' },
  { code: 'ko', label: '한국어', whisper: 'ko' },
  { code: 'fr', label: 'Français', whisper: 'fr' },
  { code: 'es', label: 'Español', whisper: 'es' },
  { code: 'de', label: 'Deutsch', whisper: 'de' },
];

// ── UI translations ───────────────────────────────────────────────────────────

const TRANSLATIONS = {
  zh: {
    title: 'Awesome Language Learning',
    subtitle: '根据你的随心记，生成语言纠错小问题，并给出更地道的最终版本；或输入长难句做题并查看翻译与结构拆解。',
    nativeLangLabel: '我的母语',
    targetLangLabel: '我想学',
    tabImprove: '从随心记开始',
    tabUnderstand: '从长难句开始',
    inputLabelImprove: '大胆输入或说出目标语言吧（不会的单词可以用母语）',
    inputLabelUnderstand: '输入长难句（仅文本）',
    placeholderImprove: 'e.g. I have went there yesterday.',
    placeholderUnderstand: 'e.g. That the plates are moving is now beyond dispute.',
    voiceBtn: '点击飙目标语言',
    voiceBtnRecording: '点击结束录音',
    voiceBtnTranscribing: '转写中…',
    voiceUnsupported: '当前浏览器不支持录音转写，请用文本输入',
    submitBtn: '生成问题',
    submitBtnLoading: '出题中…',
    loadingText: '正在生成题目…',
    errorEmpty: '请输入或说出一句目标语言',
    questionLabel: (n) => `第 ${n} 题`,
    explanationLabel: '解析：',
    fillPlaceholder: '填写答案',
    fillSubmit: '提交',
    revealImproveTitle: '更地道的表达',
    revealNativeTitle: '母语翻译',
    revealUnderstandNativeTitle: '翻译',
    revealStructureTitle: '结构拆解',
    resetImprove: '再来一句',
    resetUnderstand: '再试一句',
    diaryToggle: (n) => `学习日记 (${n})`,
    diaryCollapse: '收起',
    diaryClear: '清空记录',
    diaryModeImprove: '从随心记开始',
    diaryModeUnderstand: '从长难句开始',
    highlightLabel: '原句（高亮处为有问题部分）：',
  },
  en: {
    title: 'Awesome Language Learning',
    subtitle: 'From your quick notes, get correction questions and a more natural version; or input a complex sentence to practise comprehension.',
    nativeLangLabel: 'My native language',
    targetLangLabel: 'I want to learn',
    tabImprove: 'Quick Notes Mode',
    tabUnderstand: 'Complex Sentence Mode',
    inputLabelImprove: 'Type or say a sentence in your target language (you can mix in your native language)',
    inputLabelUnderstand: 'Enter a complex sentence (text only)',
    placeholderImprove: 'e.g. I have went there yesterday.',
    placeholderUnderstand: 'e.g. That the plates are moving is now beyond dispute.',
    voiceBtn: 'Tap to speak',
    voiceBtnRecording: 'Tap to stop',
    voiceBtnTranscribing: 'Transcribing…',
    voiceUnsupported: 'Recording not supported in this browser. Please type instead.',
    submitBtn: 'Generate Questions',
    submitBtnLoading: 'Generating…',
    loadingText: 'Generating questions…',
    errorEmpty: 'Please enter or say a sentence in your target language',
    questionLabel: (n) => `Question ${n}`,
    explanationLabel: 'Explanation: ',
    fillPlaceholder: 'Type your answer',
    fillSubmit: 'Submit',
    revealImproveTitle: 'More natural expression',
    revealNativeTitle: 'Native language translation',
    revealUnderstandNativeTitle: 'Translation',
    revealStructureTitle: 'Structural breakdown',
    resetImprove: 'Try another sentence',
    resetUnderstand: 'Try another sentence',
    diaryToggle: (n) => `Learning diary (${n})`,
    diaryCollapse: 'Collapse',
    diaryClear: 'Clear history',
    diaryModeImprove: 'Quick Notes',
    diaryModeUnderstand: 'Complex Sentence',
    highlightLabel: 'Your sentence (highlighted parts have issues):',
  },
  ja: {
    title: 'Awesome Language Learning',
    subtitle: 'メモから語学矯正クイズを生成し、より自然な表現を提案します。また、難解な文を入力して理解問題に挑戦できます。',
    nativeLangLabel: '母国語',
    targetLangLabel: '学びたい言語',
    tabImprove: 'メモモード',
    tabUnderstand: '長文読解モード',
    inputLabelImprove: '目標言語で入力または話してください（わからない単語は母国語でOK）',
    inputLabelUnderstand: '難解な文を入力してください（テキストのみ）',
    placeholderImprove: 'e.g. I have went there yesterday.',
    placeholderUnderstand: 'e.g. That the plates are moving is now beyond dispute.',
    voiceBtn: 'タップして話す',
    voiceBtnRecording: 'タップして停止',
    voiceBtnTranscribing: '変換中…',
    voiceUnsupported: 'このブラウザでは録音がサポートされていません。テキスト入力をご利用ください。',
    submitBtn: '問題を生成',
    submitBtnLoading: '生成中…',
    loadingText: '問題を生成中…',
    errorEmpty: '目標言語で文を入力または話してください',
    questionLabel: (n) => `問題 ${n}`,
    explanationLabel: '解説：',
    fillPlaceholder: '答えを入力',
    fillSubmit: '送信',
    revealImproveTitle: 'より自然な表現',
    revealNativeTitle: '母国語訳',
    revealUnderstandNativeTitle: '翻訳',
    revealStructureTitle: '構造解説',
    resetImprove: '次の文へ',
    resetUnderstand: '次の文へ',
    diaryToggle: (n) => `学習日記 (${n})`,
    diaryCollapse: '折りたたむ',
    diaryClear: '履歴を消去',
    diaryModeImprove: 'メモモード',
    diaryModeUnderstand: '長文読解',
    highlightLabel: '入力文（ハイライト部分に問題あり）：',
  },
  ko: {
    title: 'Awesome Language Learning',
    subtitle: '메모에서 언어 교정 퀴즈를 생성하고 더 자연스러운 표현을 제안합니다. 또는 복잡한 문장을 입력해 독해 문제를 풀어보세요.',
    nativeLangLabel: '모국어',
    targetLangLabel: '배우고 싶은 언어',
    tabImprove: '메모 모드',
    tabUnderstand: '긴 문장 이해 모드',
    inputLabelImprove: '목표 언어로 입력하거나 말해보세요（모르는 단어는 모국어로 OK）',
    inputLabelUnderstand: '복잡한 문장을 입력하세요（텍스트만）',
    placeholderImprove: 'e.g. I have went there yesterday.',
    placeholderUnderstand: 'e.g. That the plates are moving is now beyond dispute.',
    voiceBtn: '탭하여 말하기',
    voiceBtnRecording: '탭하여 중지',
    voiceBtnTranscribing: '변환 중…',
    voiceUnsupported: '이 브라우저에서는 녹음이 지원되지 않습니다. 텍스트로 입력해주세요.',
    submitBtn: '문제 생성',
    submitBtnLoading: '생성 중…',
    loadingText: '문제를 생성하는 중…',
    errorEmpty: '목표 언어로 문장을 입력하거나 말해주세요',
    questionLabel: (n) => `문제 ${n}`,
    explanationLabel: '해설：',
    fillPlaceholder: '답 입력',
    fillSubmit: '제출',
    revealImproveTitle: '더 자연스러운 표현',
    revealNativeTitle: '모국어 번역',
    revealUnderstandNativeTitle: '번역',
    revealStructureTitle: '구조 분석',
    resetImprove: '다음 문장',
    resetUnderstand: '다음 문장',
    diaryToggle: (n) => `학습 일기 (${n})`,
    diaryCollapse: '접기',
    diaryClear: '기록 지우기',
    diaryModeImprove: '메모 모드',
    diaryModeUnderstand: '긴 문장 이해',
    highlightLabel: '입력 문장（하이라이트 부분에 문제 있음）：',
  },
  fr: {
    title: 'Awesome Language Learning',
    subtitle: 'À partir de vos notes, générez des exercices de correction et obtenez une version plus naturelle ; ou entrez une phrase complexe pour tester votre compréhension.',
    nativeLangLabel: 'Ma langue maternelle',
    targetLangLabel: 'Je veux apprendre',
    tabImprove: 'Mode Notes rapides',
    tabUnderstand: 'Mode Phrase complexe',
    inputLabelImprove: 'Tapez ou dites une phrase dans votre langue cible (vous pouvez mélanger avec votre langue maternelle)',
    inputLabelUnderstand: 'Entrez une phrase complexe (texte uniquement)',
    placeholderImprove: 'ex. I have went there yesterday.',
    placeholderUnderstand: 'ex. That the plates are moving is now beyond dispute.',
    voiceBtn: 'Appuyez pour parler',
    voiceBtnRecording: 'Appuyez pour arrêter',
    voiceBtnTranscribing: 'Transcription…',
    voiceUnsupported: "L'enregistrement n'est pas pris en charge par ce navigateur. Veuillez saisir du texte.",
    submitBtn: 'Générer les questions',
    submitBtnLoading: 'Génération…',
    loadingText: 'Génération des questions…',
    errorEmpty: 'Veuillez saisir ou prononcer une phrase dans votre langue cible',
    questionLabel: (n) => `Question ${n}`,
    explanationLabel: 'Explication : ',
    fillPlaceholder: 'Votre réponse',
    fillSubmit: 'Valider',
    revealImproveTitle: 'Expression plus naturelle',
    revealNativeTitle: 'Traduction en langue maternelle',
    revealUnderstandNativeTitle: 'Traduction',
    revealStructureTitle: 'Analyse structurelle',
    resetImprove: 'Autre phrase',
    resetUnderstand: 'Autre phrase',
    diaryToggle: (n) => `Journal d'apprentissage (${n})`,
    diaryCollapse: 'Réduire',
    diaryClear: "Effacer l'historique",
    diaryModeImprove: 'Notes rapides',
    diaryModeUnderstand: 'Phrase complexe',
    highlightLabel: 'Votre phrase (les parties surlignées ont des problèmes) :',
  },
  es: {
    title: 'Awesome Language Learning',
    subtitle: 'A partir de tus notas, genera ejercicios de corrección y obtén una versión más natural; o ingresa una oración compleja para practicar la comprensión.',
    nativeLangLabel: 'Mi idioma nativo',
    targetLangLabel: 'Quiero aprender',
    tabImprove: 'Modo Notas rápidas',
    tabUnderstand: 'Modo Oración compleja',
    inputLabelImprove: 'Escribe o di una oración en tu idioma objetivo (puedes mezclar con tu idioma nativo)',
    inputLabelUnderstand: 'Ingresa una oración compleja (solo texto)',
    placeholderImprove: 'ej. I have went there yesterday.',
    placeholderUnderstand: 'ej. That the plates are moving is now beyond dispute.',
    voiceBtn: 'Toca para hablar',
    voiceBtnRecording: 'Toca para detener',
    voiceBtnTranscribing: 'Transcribiendo…',
    voiceUnsupported: 'La grabación no es compatible con este navegador. Por favor, escribe el texto.',
    submitBtn: 'Generar preguntas',
    submitBtnLoading: 'Generando…',
    loadingText: 'Generando preguntas…',
    errorEmpty: 'Por favor, escribe o di una oración en tu idioma objetivo',
    questionLabel: (n) => `Pregunta ${n}`,
    explanationLabel: 'Explicación: ',
    fillPlaceholder: 'Escribe tu respuesta',
    fillSubmit: 'Enviar',
    revealImproveTitle: 'Expresión más natural',
    revealNativeTitle: 'Traducción al idioma nativo',
    revealUnderstandNativeTitle: 'Traducción',
    revealStructureTitle: 'Análisis estructural',
    resetImprove: 'Otra oración',
    resetUnderstand: 'Otra oración',
    diaryToggle: (n) => `Diario de aprendizaje (${n})`,
    diaryCollapse: 'Contraer',
    diaryClear: 'Borrar historial',
    diaryModeImprove: 'Notas rápidas',
    diaryModeUnderstand: 'Oración compleja',
    highlightLabel: 'Tu oración (las partes resaltadas tienen problemas):',
  },
  de: {
    title: 'Awesome Language Learning',
    subtitle: 'Aus deinen Notizen werden Korrekturaufgaben generiert und eine natürlichere Version vorgeschlagen; oder gib einen komplexen Satz ein, um dein Verständnis zu testen.',
    nativeLangLabel: 'Meine Muttersprache',
    targetLangLabel: 'Ich möchte lernen',
    tabImprove: 'Notiz-Modus',
    tabUnderstand: 'Komplexer Satz-Modus',
    inputLabelImprove: 'Schreibe oder sprich einen Satz in deiner Zielsprache (du kannst deine Muttersprache mischen)',
    inputLabelUnderstand: 'Gib einen komplexen Satz ein (nur Text)',
    placeholderImprove: 'z.B. I have went there yesterday.',
    placeholderUnderstand: 'z.B. That the plates are moving is now beyond dispute.',
    voiceBtn: 'Tippen zum Sprechen',
    voiceBtnRecording: 'Tippen zum Stoppen',
    voiceBtnTranscribing: 'Transkription…',
    voiceUnsupported: 'Aufnahme wird von diesem Browser nicht unterstützt. Bitte Text eingeben.',
    submitBtn: 'Fragen generieren',
    submitBtnLoading: 'Generiere…',
    loadingText: 'Fragen werden generiert…',
    errorEmpty: 'Bitte gib einen Satz in deiner Zielsprache ein oder sprich ihn',
    questionLabel: (n) => `Frage ${n}`,
    explanationLabel: 'Erklärung: ',
    fillPlaceholder: 'Antwort eingeben',
    fillSubmit: 'Absenden',
    revealImproveTitle: 'Natürlicherer Ausdruck',
    revealNativeTitle: 'Übersetzung in Muttersprache',
    revealUnderstandNativeTitle: 'Übersetzung',
    revealStructureTitle: 'Strukturanalyse',
    resetImprove: 'Nächster Satz',
    resetUnderstand: 'Nächster Satz',
    diaryToggle: (n) => `Lerntagebuch (${n})`,
    diaryCollapse: 'Einklappen',
    diaryClear: 'Verlauf löschen',
    diaryModeImprove: 'Notiz-Modus',
    diaryModeUnderstand: 'Komplexer Satz',
    highlightLabel: 'Dein Satz (markierte Teile haben Probleme):',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sentenceCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/(^\s*|[.!?]\s*)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function removeFillers(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/\b(um|uhm?|er|ah)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = reader.result;
      if (typeof raw !== 'string') { reject(new Error('音频编码失败')); return; }
      const comma = raw.indexOf(',');
      resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
    };
    reader.onerror = () => reject(new Error('音频编码失败'));
    reader.readAsDataURL(blob);
  });
}

const HISTORY_MAX = 200;

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, HISTORY_MAX) : [];
  } catch { return []; }
}

function saveHistoryToStorage(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); } catch (_) {}
}

function loadLangPref() {
  try {
    const raw = localStorage.getItem(LANG_PREF_KEY);
    if (!raw) return { nativeLang: 'zh', targetLang: 'en' };
    const parsed = JSON.parse(raw);
    return {
      nativeLang: parsed.nativeLang || 'zh',
      targetLang: parsed.targetLang || 'en',
    };
  } catch { return { nativeLang: 'zh', targetLang: 'en' }; }
}

function saveLangPref(nativeLang, targetLang) {
  try { localStorage.setItem(LANG_PREF_KEY, JSON.stringify({ nativeLang, targetLang })); } catch (_) {}
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [{ nativeLang, targetLang }, setLangs] = useState(() => loadLangPref());
  const [mode, setMode] = useState('improve');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [fillInputs, setFillInputs] = useState({});
  const [history, setHistory] = useState(() => loadHistoryFromStorage());

  const T = TRANSLATIONS[nativeLang] || TRANSLATIONS.zh;

  useEffect(() => { saveHistoryToStorage(history); }, [history]);

  const handleLangChange = useCallback((field, value) => {
    setLangs((prev) => {
      const next = { ...prev, [field]: value };
      if (next.nativeLang === next.targetLang) {
        // auto-swap the other field to avoid same-same
        const other = field === 'nativeLang' ? 'targetLang' : 'nativeLang';
        next[other] = prev[field];
      }
      saveLangPref(next.nativeLang, next.targetLang);
      return next;
    });
    setResult(null);
    setError('');
  }, []);

  const submit = useCallback(async () => {
    const sentence = text.trim();
    if (!sentence) { setError(T.errorEmpty); return; }
    setError('');
    setLoading(true);
    setResult(null);
    setUserAnswers({});
    setFillInputs({});
    try {
      const endpoint = mode === 'improve' ? '/api/improve' : '/api/understand';
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, nativeLang, targetLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setResult(data);
      if (mode === 'improve') {
        if (data.cleaned_transcript && typeof data.cleaned_transcript === 'string') setText(data.cleaned_transcript.trim());
        addToHistory({ mode: 'improve', original: sentence, better_expression: data.better_expression, translation_native: data.better_expression_native });
      }
      if (mode === 'understand') {
        addToHistory({ mode: 'understand', original: sentence, native_translation: data.native_translation, structure_breakdown: data.structure_breakdown });
      }
    } catch (e) {
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  }, [mode, text, nativeLang, targetLang, T]);

  const setAnswer = useCallback((questionId, value, isCorrect) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: { value, isCorrect } }));
  }, []);

  const allAnswered = result?.questions?.length > 0 && result.questions.every((q) => userAnswers[q.id] != null);

  const reset = useCallback(() => {
    setResult(null);
    setUserAnswers({});
    setFillInputs({});
    setError('');
    setText('');
  }, []);

  const addToHistory = useCallback((entry) => {
    setHistory((prev) => [{ ...entry, id: Date.now(), time: new Date().toISOString() }, ...prev]);
  }, []);

  const targetWhisper = LANG_OPTIONS.find((l) => l.code === targetLang)?.whisper || targetLang;

  return (
    <>
      <h1>{T.title}</h1>
      <p className="subtitle">{T.subtitle}</p>

      <div className="lang-selector">
        <div className="lang-selector-item">
          <label>{T.nativeLangLabel}</label>
          <select value={nativeLang} onChange={(e) => handleLangChange('nativeLang', e.target.value)}>
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="lang-selector-arrow">→</div>
        <div className="lang-selector-item">
          <label>{T.targetLangLabel}</label>
          <select value={targetLang} onChange={(e) => handleLangChange('targetLang', e.target.value)}>
            {LANG_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mode-tabs">
        <button
          type="button"
          className={mode === 'improve' ? 'active' : ''}
          onClick={() => { setMode('improve'); setResult(null); setError(''); }}
        >
          {T.tabImprove}
        </button>
        <button
          type="button"
          className={mode === 'understand' ? 'active' : ''}
          onClick={() => { setMode('understand'); setResult(null); setError(''); }}
        >
          {T.tabUnderstand}
        </button>
      </div>

      <div className="input-section">
        <label>{mode === 'improve' ? T.inputLabelImprove : T.inputLabelUnderstand}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'improve' ? T.placeholderImprove : T.placeholderUnderstand}
          disabled={loading}
        />
        {mode === 'improve' && (
          <div className="voice-row">
            <VoiceInput
              onResult={(val) => { setText(val); setError(''); }}
              onError={setError}
              disabled={loading}
              targetWhisper={targetWhisper}
              T={T}
            />
          </div>
        )}
        <button type="button" className="submit-btn" onClick={submit} disabled={loading}>
          {loading ? T.submitBtnLoading : T.submitBtn}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading && <div className="loading">{T.loadingText}</div>}

      {result && !loading && Array.isArray(result.questions) && result.questions.length > 0 && (
        <>
          {mode === 'improve' && result.highlighted_sentence && (
            <div className="highlighted-sentence-wrap">
              <span className="highlighted-sentence-label">{T.highlightLabel}</span>
              <div className="highlighted-sentence">
                <HighlightedText text={result.highlighted_sentence} />
              </div>
            </div>
          )}
          <Questions
            mode={mode}
            questions={result.questions}
            userAnswers={userAnswers}
            fillInputs={fillInputs}
            setFillInputs={setFillInputs}
            setAnswer={setAnswer}
            T={T}
          />
        </>
      )}

      {result && allAnswered && (
        <Reveal mode={mode} result={result} onReset={reset} T={T} />
      )}

      <DiarySection history={history} onClear={() => setHistory([])} T={T} />
    </>
  );
}

// ── VoiceInput ────────────────────────────────────────────────────────────────

function VoiceInput({ onResult, onError, disabled, targetWhisper, T }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [supported] = useState(
    !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  };

  const uploadAudio = async (blob) => {
    if (!blob || blob.size <= 0) throw new Error('录音为空，请重试。');
    const audioBase64 = await blobToBase64(blob);
    const res = await fetch(API_BASE + '/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType: blob.type || 'audio/webm', language: targetWhisper }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const txt = typeof data.text === 'string' ? data.text : '';
    if (!txt.trim()) throw new Error('语音转写结果为空');
    onResult(sentenceCase(removeFillers(txt)));
  };

  const start = async () => {
    if (!supported || transcribing) return;
    onError('');
    onResult('');
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
      const picked = types.find((t) => MediaRecorder.isTypeSupported?.(t));
      const rec = picked ? new MediaRecorder(stream, { mimeType: picked }) : new MediaRecorder(stream);
      rec.ondataavailable = (event) => { if (event.data && event.data.size > 0) chunksRef.current.push(event.data); };
      rec.onerror = () => { setRecording(false); stopStream(); onError('录音失败，请重试。'); };
      rec.onstop = async () => {
        setRecording(false);
        stopStream();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || picked || 'audio/webm' });
        chunksRef.current = [];
        setTranscribing(true);
        try { await uploadAudio(blob); }
        catch (e) { onError(e.message || '语音转写失败'); }
        finally { setTranscribing(false); }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      stopStream();
      setRecording(false);
      onError(e.message || '无法访问麦克风，请检查浏览器权限');
    }
  };

  const stop = () => { if (recRef.current) { try { recRef.current.stop(); } catch (_) {} recRef.current = null; } };

  const handleClick = (e) => {
    e.preventDefault();
    if (disabled || transcribing) return;
    if (recording) stop(); else start();
  };

  if (!supported) return <span className="voice-hint">{T.voiceUnsupported}</span>;

  return (
    <button
      type="button"
      className={recording ? 'recording' : ''}
      disabled={disabled || transcribing}
      onClick={handleClick}
    >
      {recording ? T.voiceBtnRecording : transcribing ? T.voiceBtnTranscribing : T.voiceBtn}
    </button>
  );
}

// ── HighlightedText ───────────────────────────────────────────────────────────

function HighlightedText({ text }) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <mark key={i} className="sentence-highlight">{part.slice(2, -2)}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Questions ─────────────────────────────────────────────────────────────────

function Questions({ questions, userAnswers, fillInputs, setFillInputs, setAnswer, T }) {
  const list = Array.isArray(questions) ? questions : [];
  return (
    <div className="questions-section">
      {list.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          userAnswer={userAnswers[q.id]}
          fillInput={fillInputs[q.id] ?? ''}
          setFillInput={(v) => setFillInputs((prev) => ({ ...prev, [q.id]: v }))}
          setAnswer={setAnswer}
          T={T}
        />
      ))}
    </div>
  );
}

function QuestionCard({ question, userAnswer, fillInput, setFillInput, setAnswer, T }) {
  const [submitted, setSubmitted] = useState(false);
  if (!question || typeof question.id === 'undefined') return null;
  const isMcq = question.type === 'mcq';
  const correctIndex = Math.max(0, Math.min(3, parseInt(question.correctIndex, 10) || 0));
  const options = Array.isArray(question.options) ? question.options : [];

  const handleMcq = (optionIndex) => {
    if (userAnswer != null) return;
    setAnswer(question.id, optionIndex, optionIndex === correctIndex);
  };

  const handleFillSubmit = () => {
    if (submitted) return;
    const raw = (fillInput || '').trim();
    const answers = String(question.correctAnswer || '')
      .split(/\s*\/\s*/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const correct = answers.length > 0 && answers.includes(raw.toLowerCase());
    setAnswer(question.id, raw, correct);
    setSubmitted(true);
  };

  const showExplanation = userAnswer != null;

  return (
    <div className="question-card">
      <h3>{T.questionLabel(question.id)}</h3>
      <div className="q-text">{question.question || ''}</div>
      {isMcq && (
        <div className="options">
          {options.map((opt, i) => {
            const answered = userAnswer != null;
            const isChosen = userAnswer?.value === i;
            const correct = i === correctIndex;
            let cls = 'option-btn';
            if (answered) { if (correct) cls += ' correct'; else if (isChosen) cls += ' wrong'; }
            return (
              <button key={i} type="button" className={cls} onClick={() => handleMcq(i)} disabled={answered}>
                {opt}
              </button>
            );
          })}
        </div>
      )}
      {!isMcq && (
        <>
          <input
            type="text"
            className="fill-input"
            placeholder={T.fillPlaceholder}
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
            disabled={showExplanation}
          />
          <button type="button" className="fill-submit" onClick={handleFillSubmit} disabled={showExplanation}>
            {T.fillSubmit}
          </button>
        </>
      )}
      {showExplanation && (
        <div className="explanation">
          <strong>{T.explanationLabel}</strong>{question.explanation || ''}
        </div>
      )}
    </div>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────

function Reveal({ mode, result, onReset, T }) {
  if (mode === 'improve') {
    return (
      <div className="reveal-box">
        <h3>{T.revealImproveTitle}</h3>
        <div className="better-sentence">{result.better_expression || '—'}</div>
        <h3>{T.revealNativeTitle}</h3>
        <div className="zh-translation">{result.better_expression_native || '—'}</div>
        <button type="button" className="reset-btn" onClick={onReset}>{T.resetImprove}</button>
      </div>
    );
  }
  return (
    <div className="reveal-box">
      <h3>{T.revealUnderstandNativeTitle}</h3>
      <div className="zh-translation">{result.native_translation || '—'}</div>
      <h3>{T.revealStructureTitle}</h3>
      <ul className="structure-list">
        {(result.structure_breakdown || []).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      <button type="button" className="reset-btn" onClick={onReset}>{T.resetUnderstand}</button>
    </div>
  );
}

// ── DiarySection ──────────────────────────────────────────────────────────────

function DiarySection({ history, onClear, T }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <section className="diary-section">
      <button type="button" className="diary-toggle" onClick={() => setOpen(!open)}>
        {open ? T.diaryCollapse : T.diaryToggle(history.length)}
      </button>
      {open && (
        <>
          <button type="button" className="diary-clear" onClick={onClear}>{T.diaryClear}</button>
          <ul className="diary-list">
            {history.map((entry) => (
              <li key={entry.id} className="diary-item">
                <time className="diary-time">{formatTime(entry.time)}</time>
                <span className="diary-mode">
                  {entry.mode === 'improve' ? T.diaryModeImprove : T.diaryModeUnderstand}
                </span>
                {entry.mode === 'improve' ? (
                  <div className="diary-content">
                    <div className="diary-original">{entry.original}</div>
                    <div className="diary-better">→ {entry.better_expression || '—'}</div>
                    {entry.translation_native && <div className="diary-zh">{entry.translation_native}</div>}
                  </div>
                ) : (
                  <div className="diary-content">
                    <div className="diary-original">{entry.original}</div>
                    <div className="diary-zh">{entry.native_translation || '—'}</div>
                    {(entry.structure_breakdown || []).length > 0 && (
                      <ul className="diary-structure">
                        {(entry.structure_breakdown || []).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}
