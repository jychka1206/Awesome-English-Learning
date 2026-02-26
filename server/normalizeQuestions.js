/** 统一题目格式：全部 mcq；选项去重；保证至少 3 题（不足则用最后一题补齐） */
export function normalizeQuestions(list) {
  if (!Array.isArray(list)) return [];
  let arr = list.slice(0, 3);
  while (arr.length < 3 && arr.length > 0) arr.push(arr[arr.length - 1]);
  return arr.map((q, i) => {
    const base = {
      id: i + 1,
      type: 'mcq',
      question: String(q.question || '').trim(),
      explanation: String(q.explanation || '').trim(),
    };
    let options = Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o)) : [];
    for (let j = 0; j < options.length; j++) {
      const prev = options.slice(0, j).indexOf(options[j]);
      if (prev !== -1) options[j] = '选项' + (j + 1);
    }
    while (options.length < 4) options.push('选项' + (options.length + 1));
    base.options = options.slice(0, 4);
    base.correctIndex = Math.max(0, Math.min(3, parseInt(q.correctIndex, 10) || 0));
    return base;
  });
}
