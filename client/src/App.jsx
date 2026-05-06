import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

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
  const textareaId = 'sentence-input';
  const voiceRef = useRef(null);

  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  const submit = useCallback(async () => {
    // 如果正在录音，提交前自动结束录音，避免影响其它操作
    voiceRef.current?.stop?.();
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
      <header className="app-header">
        <h1>Awesome English Learning</h1>
        <p className="subtitle">
          很多人都说，学英语最有效的方法之一，是随时随地用英语“自言自语”。像写随心日记一样大胆开口，没有语境就自己创造语境。这个小工具会通过问题引导、优化后的版本和笔记回忆，帮你把英语练习变成一件顺其自然的事。
        </p>
      </header>

      <div className="mode-tabs" role="tablist" aria-label="练习模式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'improve'}
          className={mode === 'improve' ? 'active' : ''}
          onClick={() => { voiceRef.current?.stop?.(); setMode('improve'); setResult(null); setError(''); }}
        >
          从随心记开始
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'understand'}
          className={mode === 'understand' ? 'active' : ''}
          onClick={() => { voiceRef.current?.stop?.(); setMode('understand'); setResult(null); setError(''); }}
        >
          从长难句开始
        </button>
      </div>

      <main className="app-main">
        <div className="input-section" role="region" aria-label="输入">
        <label htmlFor={textareaId}>
          {mode === 'improve' ? '大胆输入或说出英语吧（不会的单词和表达可以用中文）' : '输入长难句（仅文本）'}
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'improve' ? 'e.g. Yesterday I have went to the new cafe with my friend; we was talking about how to 减压 after the exam, and I feel my English still sound a little strange.' : 'e.g. That the plates are moving is now beyond dispute.'}
          disabled={loading}
        />
        {mode === 'improve' && (
          <div className="voice-row">
            <VoiceInput ref={voiceRef} onResult={setText} disabled={loading} />
          </div>
        )}
        <button type="button" className="submit-btn" onClick={submit} disabled={loading}>
          {loading ? '出题中…' : '生成问题'}
        </button>
        </div>

        {error && <div className="error-msg" role="alert">{error}</div>}

        {loading && <div className="loading" role="status" aria-live="polite">正在生成题目…</div>}

        {result && !loading && Array.isArray(result.questions) && result.questions.length > 0 && (
          <>
            {mode === 'improve' && result.highlighted_sentence && (
              <section className="highlighted-sentence-wrap" aria-label="原句高亮">
                <span className="highlighted-sentence-label">原句（高亮处为有问题部分）：</span>
                <div className="highlighted-sentence">
                  <HighlightedText text={result.highlighted_sentence} />
                </div>
              </section>
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
      </main>
    </>
  );
}

/** 一些国产浏览器（夸克 / 华为 / UC / QQ / 小米 / vivo / OPPO 等）即便暴露了
 *  webkitSpeechRecognition，底层也常常无法工作（依赖 Google 语音或干脆是空实现）。
 *  这里仅做"软提示"：仍允许用户尝试，失败时给出明确原因。 */
function detectKnownProblemBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /(Quark|Huawei|HuaweiBrowser|HWBrowser|UCBrowser|MiuiBrowser|XiaoMi|QQBrowser|MQQBrowser|VivoBrowser|HeyTapBrowser|OppoBrowser|baiduboxapp|baidubrowser)/i.test(ua);
}

const VoiceInput = forwardRef(function VoiceInput({ onResult, disabled }, ref) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [hint, setHint] = useState(() => (detectKnownProblemBrowser()
    ? '当前浏览器对英文语音识别支持不稳定，建议使用 Chrome / Edge / Safari，或直接打字输入'
    : ''));
  const recRef = useRef(null);
  const startingRef = useRef(false);
  const watchdogRef = useRef(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearWatchdog();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onaudiostart = null;
      rec.onsoundstart = null;
      rec.onspeechstart = null;
      try { rec.abort(); } catch (_) {}
      try { rec.stop(); } catch (_) {}
    }
    startingRef.current = false;
  }, [clearWatchdog]);

  const stop = useCallback(() => {
    cleanup();
    setRecording(false);
  }, [cleanup]);

  useImperativeHandle(ref, () => ({ stop }), [stop]);

  // 组件卸载时务必释放，避免麦克风一直占用
  useEffect(() => () => { cleanup(); }, [cleanup]);

  const start = () => {
    if (startingRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    cleanup();
    setHint('');
    onResult('');

    let rec;
    try {
      rec = new SR();
    } catch (_) {
      setHint('当前浏览器无法启动语音识别，请改用 Chrome / Edge / Safari，或直接打字');
      return;
    }
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    // 标记引擎已"真正开始工作"，关闭看门狗
    const markAlive = () => clearWatchdog();
    rec.onaudiostart = markAlive;
    rec.onsoundstart = markAlive;
    rec.onspeechstart = markAlive;

    rec.onresult = (e) => {
      clearWatchdog();
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        full += transcript;
        if (e.results[i].isFinal) full += '. ';
      }
      full = removeFillers(full.trim()).replace(/\s*\.\s*\./g, '.').replace(/\s+$/, '').trim();
      onResult(sentenceCase(full));
    };
    rec.onend = () => {
      clearWatchdog();
      if (recRef.current === rec) {
        recRef.current = null;
        startingRef.current = false;
        setRecording(false);
      }
    };
    rec.onerror = (ev) => {
      clearWatchdog();
      const code = ev && ev.error;
      let msg = '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        msg = '麦克风权限被拒绝，请在浏览器设置里允许麦克风后再试';
      } else if (code === 'no-speech') {
        msg = '没听到声音，请靠近麦克风再试一次';
      } else if (code === 'audio-capture') {
        msg = '没有可用的麦克风设备';
      } else if (code === 'network') {
        msg = '当前浏览器的语音识别需要联网（部分国产浏览器无法访问），建议改用 Chrome / Edge / Safari，或直接打字';
      } else if (code === 'aborted') {
        msg = '';
      } else if (code) {
        msg = '语音识别失败：' + code;
      }
      if (msg) setHint(msg);
      if (recRef.current === rec) {
        recRef.current = null;
        startingRef.current = false;
        setRecording(false);
      }
    };

    recRef.current = rec;
    startingRef.current = true;
    try {
      rec.start();
      setRecording(true);
      // 看门狗：5 秒内若没有任何"真在录"的信号（audiostart/soundstart/speechstart/result），
      // 判定为"无声失败"——常见于小米 / 华为 / 夸克 等浏览器：start() 不报错但底层并未真正打开麦克风
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        if (recRef.current === rec) {
          setHint('当前浏览器没有真正打开麦克风（已自动停止）。请在系统/浏览器设置里允许麦克风权限，或改用 Chrome / Edge / Safari，或直接打字输入');
          cleanup();
          setRecording(false);
        }
      }, 5000);
    } catch (err) {
      // 常见：InvalidStateError —— 上一次会话尚未完全释放
      recRef.current = null;
      startingRef.current = false;
      setRecording(false);
      setHint('启动语音识别失败，请稍后再试，或换 Chrome / Edge / Safari');
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (recording) stop();
    else start();
  };

  if (!supported) {
    return <span className="voice-hint">当前浏览器不支持语音识别，请直接输入，或改用 Chrome / Edge / Safari</span>;
  }

  return (
    <>
      <button
        type="button"
        className={recording ? 'recording' : ''}
        disabled={disabled}
        aria-pressed={recording}
        onClick={handleClick}
      >
        {recording ? '点击结束' : '点击录音'}
      </button>
      {hint && <span className="voice-hint" role="status">{hint}</span>}
    </>
  );
});

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
