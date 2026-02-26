/**
 * Kimi API 简单测试脚本
 * 运行前：复制 .env.example 为 .env，填入 KIMI_API_KEY；或命令行设置 set KIMI_API_KEY=你的key
 * Node 需 18+（或安装 node-fetch）
 */

const KIMI_API = 'https://api.moonshot.cn/v1/chat/completions';
const MODEL = 'moonshot-v1-8k';

async function callKimi(apiKey, userMessage) {
  const res = await fetch(KIMI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (content == null) throw new Error('Unexpected response: ' + JSON.stringify(data));
  return content;
}

// 简单从 .env 读取（无额外依赖）
function loadEnv() {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*KIMI_API_KEY\s*=\s*(.+?)\s*$/);
        if (m) process.env.KIMI_API_KEY = m[1].replace(/^["']|["']$/g, '').trim();
      }
    }
  } catch (_) {}
}

loadEnv();

(async () => {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.error('请设置 KIMI_API_KEY：');
    console.error('  1) 复制 .env.example 为 .env，填入 KIMI_API_KEY=你的key');
    console.error('  2) 或运行: set KIMI_API_KEY=你的key 然后 node test-kimi-api.js');
    process.exit(1);
  }

  console.log('正在调用 Kimi API...\n');
  try {
    const reply = await callKimi(apiKey, '用一句话用英文回答：What is 1+1?');
    console.log('Kimi 回复:', reply);
  } catch (e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();
