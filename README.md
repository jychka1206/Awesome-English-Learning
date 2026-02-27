# Awesome English Learning

随手学英语：根据你的**语音随心记**，生成 3 个**语言纠错、润色**小问题，并给出**更地道的最终版本**；另有**长难句理解模式**，输入难句即可做题并查看翻译与结构拆解。

## 运行

### 1. 环境

- Node 18+
- 在项目根目录创建 `.env`（见 `.env.example`），至少填入：
  - `OPENROUTER_API_KEY=你的 OpenRouter key`（推荐）
    - 或使用 `KIMI_API_KEY` / `DASHSCOPE_API_KEY`
  - `REPLICATE_API_TOKEN=你的Replicate Token`（用于语音转写 `openai/whisper`）

### 2. 后端

```bash
cd server
npm install
npm run dev
```

后端默认：http://localhost:3000

### 3. 前端

```bash
cd client
npm install
npm run dev
```

前端默认：http://localhost:5173（已代理 `/api` 到 3000）

在浏览器打开 http://localhost:5173 即可使用。

### 4. 手机 / 移动端试用

1. **电脑和手机连同一个 WiFi**（不能开访客网络隔离）。
2. 先在本机**同时**跑好后端和前端：
   - 终端 1：`cd server` → `npm run dev`
   - 终端 2：`cd client` → `npm run dev`
3. 看前端终端里打印的 **Network 地址**，例如：`http://192.168.1.100:5173`
4. 在手机浏览器里输入这个地址（把 `192.168.1.100` 换成你电脑的局域网 IP）。
5. 若不知道电脑 IP：Windows 在终端运行 `ipconfig`，看「无线局域网」或「以太网」下的 IPv4；Mac 在「系统设置 → 网络」里看。

注意：API 请求会由电脑上的 Vite 代理到本机后端，所以只要电脑在跑、手机能访问电脑的 5173 端口即可。

### 5. 线上部署（Vercel 一键前后端）

项目已支持在 **Vercel 上同时跑前端和 API**，无需单独部署后端。

1. **Vercel 项目设置**
   - **Root Directory**：留空（不要填 `client`），用仓库根目录。
   - **Environment Variables**：添加 **`OPENROUTER_API_KEY`**（推荐，或 `KIMI_API_KEY` / `DASHSCOPE_API_KEY`）以及 **`REPLICATE_API_TOKEN`**（语音转写）。
2. 推送代码后 Vercel 会自动用根目录的 `vercel.json` 构建：安装依赖 → 构建 `client` → 将 `/api/*` 交给 serverless，其余走前端。
3. 部署完成后直接打开 Vercel 给的网址即可使用（含手机）。

## 功能

- **Improve**：输入一句英文（文本或语音），生成 3 道题；每题答完即显示解析；三题都答完揭晓「更地道的表达」。无错误时也会出 3 题（替代表达/地道性），并在解析中说明原表达正确。
- **Understand**：输入长难句（仅文本），3 道理解题；答完揭晓中文翻译 + 结构拆解。

## 技术

- 前端：Vite + React，单页，无登录无数据库
- 后端：Express，代理 OpenRouter/Kimi/DashScope（Key 不暴露给前端）
- 语音：浏览器 `MediaRecorder` + 后端转发 Replicate `openai/whisper`

## 目录

- `server/`：Express + LLM 调用（`/api/improve`、`/api/understand`）+ 语音转写（`/api/transcribe`）
- `client/`：前端源码
- `.env`：API Key（勿提交）
