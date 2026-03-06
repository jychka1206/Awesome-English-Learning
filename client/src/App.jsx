import React, { useState, useCallback, useRef, useEffect } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const HISTORY_KEY = 'sentence3q_history';

/** 口语转写常用全小写，按句首大写规范显示 */
function sentenceCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/(^\s*|[\\.!?]\s*)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
}

/** 去掉常见口头填充词 */
function removeFillers(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/\b(um|uhm?|er|ah)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
const HISTORY_MAX = 200;

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch (_) {}
}

export default function App() {
  const [mode, setMode] = useState('improve');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [fillInputs, setFillInputs] = useState({});
  const [history, setHistory] = useState(() => loadHistoryFromStorage());

  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  const submit = useCallback(async () => {
    const sentence = text.trim();
    if (!sentence) {
      setError('请输入或说出一句英文');
      return;
    }
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
        body: JSON.stringify({ text: sentence }),
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(res.ok ? '接口返回格式异常' : `请求失败：${raw.slice(0, 80)}${raw.length > 80 ? '…' : ''}`);
      }
      if (!res.ok) throw new Error(data.error || res.statusText);
      // #region agent log
      fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'App.jsx:after-fetch',message:'Client received improve data',data:{has_better_expression:!!data.better_expression,has_better_expression_zh:'better_expression_zh' in (data||{}),better_expression_zh_len:(data&&data.better_expression_zh)?data.better_expression_zh.length:0,better_expression_zh_preview:(data&&data.better_expression_zh)?String(data.better_expression_zh).slice(0,80):null},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      setResult(data);
      if (mode === 'improve') {
        const hasChinese = /[\u4e00-\u9fff]/.test(sentence);
        if (!hasChinese && data.cleaned_transcript && typeof data.cleaned_transcript === 'string') {
          setText(data.cleaned_transcript.trim());
        }
        addToHistory({ mode: 'improve', original: sentence, better_expression: data.better_expression, translation_zh: data.better_expression_zh });
      }
      if (mode === 'understand') {
        addToHistory({ mode: 'understand', original: sentence, zh_translation: data.zh_translation, structure_breakdown: data.structure_breakdown });
      }
    } catch (e) {
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  }, [mode, text]);

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

  return (
    <>
      <h1>Awesome English Learning</h1>
      <p className="subtitle">很多人都说，学英语最有效的方法之一，是随时随地用英语“自言自语”。像写随心日记一样大胆开口，没有语境就自己创造语境。这个小工具会通过问题引导、优化后的版本和笔记回忆，帮你把英语练习变成一件顺其自然的事。</p>

      <div className="mode-tabs">
        <button
          type="button"
          className={mode === 'improve' ? 'active' : ''}
          onClick={() => { setMode('improve'); setResult(null); setError(''); }}
        >
          从随心记开始
        </button>
        <button
          type="button"
          className={mode === 'understand' ? 'active' : ''}
          onClick={() => { setMode('understand'); setResult(null); setError(''); }}
        >
          从长难句开始
        </button>
      </div>

      <div className="input-section">
        <label>
          {mode === 'improve' ? '大胆输入或说出英语吧（不会的单词和表达可以用中文）' : '输入长难句（仅文本）'}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'improve' ? 'e.g. I have went there yesterday.' : 'e.g. That the plates are moving is now beyond dispute.'}
          disabled={loading}
        />
        {mode === 'improve' && (
          <div className="voice-row">
            <VoiceInput onResult={setText} disabled={loading} />
          </div>
        )}
        <button type="button" className="submit-btn" onClick={submit} disabled={loading}>
          {loading ? '出题中…' : '生成问题'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading && <div className="loading">正在生成题目…</div>}

      {result && !loading && Array.isArray(result.questions) && result.questions.length > 0 && (
        <>
          {mode === 'improve' && result.highlighted_sentence && (
            <div className="highlighted-sentence-wrap">
              <span className="highlighted-sentence-label">原句（高亮处为有问题部分）：</span>
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
          />
        </>
      )}

      {result && allAnswered && (
        <Reveal
          mode={mode}
          result={result}
          setResult={setResult}
          originalText={text}
          onReset={reset}
        />
      )}

      <DiarySection history={history} onClear={() => setHistory([])} />
    </>
  );
}

function VoiceInput({ onResult, disabled }) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  const start = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
      return;
    }
    onResult(''); // 开始录音时清空输入框，避免和上一次内容混在一起
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true; // 一边说一边出字
    rec.onresult = (e) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        full += transcript;
        if (e.results[i].isFinal) full += '. ';
      }
      full = removeFillers(full.trim()).replace(/\s*\.\s*\./g, '.').replace(/\s+$/, '').trim();
      onResult(sentenceCase(full));
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stop = () => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch (_) {}
      recRef.current = null;
    }
    setRecording(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (recording) stop();
    else start();
  };

  if (!supported) return <span className="voice-hint">当前浏览器不支持语音识别，请用文本输入</span>;

  return (
    <button
      type="button"
      className={recording ? 'recording' : ''}
      disabled={disabled}
      onClick={handleClick}
    >
      {recording ? '点击结束' : '点击飙英语'}
    </button>
  );
}

/** 把 **错误部分** 渲染成高亮 */
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

function Questions({ mode, questions, userAnswers, fillInputs, setFillInputs, setAnswer }) {
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
        />
      ))}
    </div>
  );
}

function QuestionCard({ question, userAnswer, fillInput, setFillInput, setAnswer }) {
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
      <h3>第 {question.id} 题</h3>
      <div className="q-text">{question.question || ''}</div>

      {isMcq && (
        <div className="options">
          {options.map((opt, i) => {
            const answered = userAnswer != null;
            const isChosen = userAnswer?.value === i;
            const correct = i === correctIndex;
            let cls = 'option-btn';
            if (answered) {
              if (correct) cls += ' correct';
              else if (isChosen) cls += ' wrong';
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => handleMcq(i)}
                disabled={answered}
              >
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
            placeholder="填写答案"
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
            disabled={showExplanation}
          />
          <button type="button" className="fill-submit" onClick={handleFillSubmit} disabled={showExplanation}>
            提交
          </button>
        </>
      )}

      {showExplanation && (
        <div className="explanation">
          <strong>解析：</strong> {question.explanation || ''}
        </div>
      )}
    </div>
  );
}

function Reveal({ mode, result, setResult, originalText, onReset }) {
  const handleReset = () => onReset();

  if (mode === 'improve') {
    // #region agent log
    fetch('http://127.0.0.1:7617/ingest/2497e231-7b11-43f6-982f-333ac8264014',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9e6527'},body:JSON.stringify({sessionId:'9e6527',location:'App.jsx:Reveal-improve',message:'Reveal render improve',data:{has_better_expression_zh:'better_expression_zh' in (result||{}),better_expression_zh_len:(result&&result.better_expression_zh)?result.better_expression_zh.length:0,better_expression_zh_preview:(result&&result.better_expression_zh)?String(result.better_expression_zh).slice(0,80):null},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return (
      <div className="reveal-box">
        <h3>更地道的表达</h3>
        <div className="better-sentence">{result.better_expression || '—'}</div>
        <h3>中文翻译</h3>
        <div className="zh-translation">{result.better_expression_zh || '—'}</div>
        <button type="button" className="reset-btn" onClick={handleReset}>再来一句</button>
      </div>
    );
  }
  return (
    <div className="reveal-box">
      <h3>中文翻译</h3>
      <div className="zh-translation">{result.zh_translation || '—'}</div>
      <h3>结构拆解</h3>
      <ul className="structure-list">
        {(result.structure_breakdown || []).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      <button type="button" className="reset-btn" onClick={handleReset}>再试一句</button>
    </div>
  );
}

function DiarySection({ history, onClear }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;
  return (
    <section className="diary-section">
      <button type="button" className="diary-toggle" onClick={() => setOpen(!open)}>
        {open ? '收起' : '学习日记'} ({history.length})
      </button>
      {open && (
        <>
          <button type="button" className="diary-clear" onClick={onClear}>清空记录</button>
          <ul className="diary-list">
            {history.map((entry) => (
              <li key={entry.id} className="diary-item">
                <time className="diary-time">
                  {formatTime(entry.time)}
                </time>
                <span className="diary-mode">{entry.mode === 'improve' ? '从随心记开始' : '从长难句开始'}</span>
                {entry.mode === 'improve' ? (
                  <div className="diary-content">
                    <div className="diary-original">{entry.original}</div>
                    <div className="diary-better">→ {entry.better_expression || '—'}</div>
                    {entry.translation_zh && <div className="diary-zh">{entry.translation_zh}</div>}
                  </div>
                ) : (
                  <div className="diary-content">
                    <div className="diary-original">{entry.original}</div>
                    <div className="diary-zh">{entry.zh_translation || '—'}</div>
                    {(entry.structure_breakdown || []).length > 0 && (
                      <ul className="diary-structure">
                        {(entry.structure_breakdown || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
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
