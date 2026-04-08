# Awesome English Learning

随手学英语：根据**语音随心记**生成 3 道**纠错与润色**题，并给出**更地道的表达**；支持**长难句理解**，可做题并查看翻译与结构拆解。

---

## 快速开始

**环境**：Node 18+

1. 克隆仓库，在项目根目录创建 `.env`（可参考 `.env.example`）。
   - **建议模型**：`gpt-4o-mini`（速度与成本比较均衡）

2. 安装依赖并启动：
   ```bash
   npm run install:all
   npm run dev:server   # 终端 1：后端 → http://localhost:3001
   npm run dev:client  # 终端 2：前端 → http://localhost:5173
   ```
   在浏览器打开 http://localhost:5173 即可使用。

---

## 本地开发

| 目录    | 说明           |
|---------|----------------|
| `client/` | 前端（Vite + React） |
| `server/` | 后端（Node + Express） |

- 前端通过 Vite 代理将 `/api` 请求转发到本机 3001 端口；API 与密钥仅在后端使用，不暴露给浏览器。
- 大模型调用在服务端完成，具体配置请参考 `.env.example`。

**手机同网试用**：电脑与手机同一 WiFi 下，先在本机同时运行后端与前端，在前端终端查看 Network 地址（如 `http://192.168.x.x:5173`），在手机浏览器访问该地址即可。

---

## 线上部署（Vercel）

- 将仓库导入 Vercel，**Root Directory** 保持为空（使用仓库根目录）。
- 在 **Settings → Environment Variables** 中配置服务端所需的环境变量（参考 `.env.example`），保存后在 **Deployments** 中重新部署使配置生效。

---

## 功能说明

- **从随心记开始（Improve）**：输入一句英文（可语音），生成 3 道纠错/润色选择题，答完揭晓更地道的表达与中文翻译；无错误时也会出题，侧重替代表达与地道性。
- **从长难句开始（Understand）**：输入长难句，生成 3 道理解题，答完揭晓中文翻译与结构拆解。

---

## 技术栈

- **前端**：Vite、React，单页应用，无登录与数据库。
- **后端**：Express；大模型请求与 API Key 仅在服务端处理。
- **语音**：浏览器 Web Speech API（英文）；生产环境若需大陆可用，可替换为国内 ASR 服务。

---

## 仓库说明

- `server/`：Express 服务与 Improve/Understand 接口实现。
- `client/`：前端源码。
- `.env`：本地环境变量（含 API Key），请勿提交至版本库；参考 `.env.example` 配置。
