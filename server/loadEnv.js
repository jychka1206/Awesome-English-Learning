import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvValue(raw) {
  let val = raw.replace(/^["']|["']$/g, '').trim();
  const hashIdx = val.indexOf('#');
  if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
  val = val.replace(/\r\n|\r|\n/g, '').trim();
  return val;
}

export function loadEnv() {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) {
    console.warn('loadEnv: 未找到 .env，尝试过的路径:', candidates.map((p) => path.resolve(p)));
    return;
  }
  let content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = parseEnvValue(trimmed.slice(eq + 1));
    if (key && val !== '') process.env[key] = val;
  }
  console.log('loadEnv: 已加载 .env');
}
