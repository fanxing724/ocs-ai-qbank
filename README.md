# 番星ai题库 · 自建版（多平台部署）

一个轻量 AI 答题服务：OCS 助手通过题库配置调用它，服务再请求 OpenAI 兼容接口获取答案。自带状态主页，展示快速导入链接、服务状态、模型配置和接口测试；内置答题缓存与模型连通性测试。API Key 只保存在服务端，浏览器端不暴露。

支持 Linux / macOS / Windows 原生运行、Docker、EdgeOne 边缘函数（国内/国际）和 Cloudflare Workers。

## 文件

- `homepage.html`：状态主页（快速导入、服务状态、模型配置、接口测试）。
- `server.js` / `answer-utils.js`：Node.js 服务与共享逻辑。
- `local-ai-tiku.json`：本机/局域网 OCS 配置。
- `remote-ai-tiku.json`：公网/边缘部署 OCS 配置模板（含 `X-Token`）。
- `ai-tiku.json`：浏览器直连 AI 的配置（仅本地备用，会暴露 API Key）。
- `start.sh` / `start.ps1`：Linux/macOS 与 Windows 启动脚本。
- `Dockerfile` / `docker-compose.yml` / `.env.example`：容器部署。
- `edge/core.mjs`：边缘运行时共享逻辑。
- `edge/homepage.mjs`：由 `homepage.html` 生成的主页模块。
- `edge/edgeone.js`：EdgeOne 边缘函数（由脚本生成，内联主页）。
- `edge/cloudflare.mjs` / `wrangler.toml`：Cloudflare Workers。
- `scripts/build-homepage.js` / `scripts/build-edgeone.js`：生成脚本。
- `test.js` / `package.json`：测试与快捷命令。

## 主页与接口

浏览器打开 `http://127.0.0.1:3000/` 即可看到主页：

- 快速导入链接：`/config`，返回可直接粘贴/订阅的番星ai题库 JSON。
- 服务状态：在线状态、运行平台、版本、运行时长。
- 模型配置：供应商、模型名、接口地址（脱敏）、超时、长度限制、限流、缓存状态。
- 接口测试：直接在页面调用 `/query` 测试答题。
- 模型测试：点击“测试模型”调用 `/test-model`，检查 AI 供应商连通性与延迟。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/` | GET | 状态主页 |
| `/health` | GET | 健康检查 |
| `/status` | GET | 运行状态与模型配置，不返回 API Key |
| `/config` | GET | 快速导入的番星ai题库配置 |
| `/query` | GET/POST | 兼容答题接口 |
| `/search` | GET/POST | OCS 标准答题接口 |
| `/test-model` | GET/POST | 模型连通性测试，发起一次最小 AI 请求 |

`/config` 中的 `url` 会自动使用当前访问地址；如果部署在反向代理或边缘平台，可设置 `PUBLIC_BASE_URL` 固定域名。`homepage` 固定为 `https://724520.xyz`，其余字段与提供的自建版配置一致。

### 地址识别规则

- `PUBLIC_BASE_URL` 优先，设置后直接使用该地址。
- Node 端：`HOST` 为非回环地址（如 `0.0.0.0` 或内网 IP）时，通过 `localhost` 访问会自动替换为检测到的内网 IPv4；`HOST=127.0.0.1` 时保留回环地址，避免配置指向不可达地址。也可用 `LAN_IP` 显式指定。
- 通过内网 IP 访问时保留内网 IP；通过公网 IP 或域名访问时保留原地址。
- Docker 内默认不自动检测（容器 IP 通常无法从局域网访问），请设置 `LAN_IP=宿主机内网IP` 或 `PUBLIC_BASE_URL`。
- 边缘函数：使用绑定的域名（Request URL 的 origin），也可用 `PUBLIC_BASE_URL` 覆盖。
- `/status.address.source` 会返回 `PUBLIC_BASE_URL`、`lan-ip`、`loopback`、`ip`、`domain`、`edge-domain` 之一。
- 仅在识别方式为 `lan-ip` 时返回 `lanIp`；域名或公网 IP 访问时隐藏内网地址。

### 答题缓存与模型测试

- 相同题目（标题 + 题型 + 选项）在 TTL 内直接命中内存缓存，减少重复 AI 调用；`CACHE_TTL_MS=0` 可关闭。
- `/search` 返回 `data.cached`；`/query` 返回 `cached`，缓存命中时 `is_ai=false`。
- Node 缓存按进程隔离；EdgeOne / Cloudflare 缓存按边缘实例隔离，不保证跨节点共享。
- `/test-model` 会发起一次最小 AI 请求；设置 `LOCAL_TOKEN` 时需携带 `X-Token`。

### 设计参考

参考了 [ZError](https://github.com/Miaozeqiu/ZError) 的供应商/模型自定义、本地缓存与连通性测试思路；本项目保持轻量 HTTP 服务形态，不引入 Tauri 桌面端。

## 部署方式总览

| 场景 | 方式 | 适用平台 |
|---|---|---|
| 本机或局域网 | Node 原生运行 | Linux / macOS / Windows |
| 容器化 | Docker / Compose | Linux / Windows / macOS / NAS / 云主机 |
| 边缘函数 | `edge/edgeone.js` | EdgeOne 国内站、国际站 |
| 边缘函数 | `edge/cloudflare.mjs` | Cloudflare Workers |

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AI_API_KEY` | 无 | 必填，AI 接口密钥 |
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容接口地址 |
| `AI_MODEL` | `gpt-4o-mini` | 模型名 |
| `AI_PROVIDER_NAME` | `OpenAI 兼容` | 供应商显示名称 |
| `HOST` / `PORT` | `127.0.0.1` / `3000` | Node 服务监听地址 |
| `LOCAL_TOKEN` | 空 | 可选，请求头 `X-Token` 校验 |
| `AI_TIMEOUT_MS` | `30000` | AI 请求超时 |
| `MAX_TITLE_LENGTH` | `2000` | 题目长度上限 |
| `MAX_OPTIONS_LENGTH` | `8000` | 选项长度上限 |
| `RATE_LIMIT_PER_MIN` | `0` | 每分钟限流，0 为关闭（仅 Node/Docker） |
| `CACHE_TTL_MS` | `86400000` | 答题缓存有效期，0 为关闭 |
| `CACHE_MAX_ENTRIES` | `1000` | 答题缓存最大条数 |
| `PUBLIC_BASE_URL` | 空 | 固定 `/config` 与 `/status` 中使用的对外地址 |
| `LAN_IP` | 自动检测 | 覆盖 Node 端识别到的内网 IP；`HOST=127.0.0.1` 或 Docker 下建议显式设置 |

## 1. Node 原生运行

需要 Node.js 22+（推荐 24）。

```bash
export AI_API_KEY=sk-你的密钥
export AI_BASE_URL=https://api.openai.com/v1
export AI_MODEL=gpt-4o-mini
./start.sh
# 或：npm start
```

Windows PowerShell：

```powershell
$env:AI_API_KEY = "sk-你的密钥"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4o-mini"
.\start.ps1
```

默认监听 `127.0.0.1:3000`，主页为 `http://127.0.0.1:3000/`。局域网访问设置 `HOST=0.0.0.0`，公网建议同时设置 `LOCAL_TOKEN` 和 `RATE_LIMIT_PER_MIN`。

## 2. Docker 部署

```bash
cp .env.example .env
# 编辑 .env，填入 AI_API_KEY
npm run docker:up
```

镜像包含 `homepage.html` 和 `package.json`，默认 `HOST=0.0.0.0`，内置健康检查。多架构构建：

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t 你的仓库/ocs-ai-tiku:latest --push .
```

## 3. EdgeOne 边缘函数（国内 / 国际）

`edge/homepage.mjs` 和 `edge/edgeone.js` 均由构建脚本生成。修改 `homepage.html` 或 `edge/core.mjs` 后执行：

```bash
npm run build
# 等价于 npm run build:homepage && npm run build:edgeone
```

部署：

1. 国际站：EdgeOne 控制台创建边缘函数，粘贴 `edge/edgeone.js`。
2. 国内站：腾讯云控制台 → EdgeOne → 站点 → 边缘函数 → 函数管理，新建函数并粘贴同一份代码。
3. 在「环境变量与密钥」中添加并部署：

| 变量名 | 类型 | 示例 |
|---|---|---|
| `AI_API_KEY` | Secret | `sk-你的密钥` |
| `AI_BASE_URL` | String | `https://api.openai.com/v1` |
| `AI_MODEL` | String | `gpt-4o-mini` |
| `AI_PROVIDER_NAME` | String | `OpenAI 兼容` |
| `LOCAL_TOKEN` | Secret | 自定义令牌，可选但公网建议设置 |
| `AI_TIMEOUT_MS` | String | `30000` |
| `MAX_TITLE_LENGTH` / `MAX_OPTIONS_LENGTH` | String | `2000` / `8000` |
| `CACHE_TTL_MS` / `CACHE_MAX_ENTRIES` | String | `86400000` / `1000` |
| `PUBLIC_BASE_URL` | String | `https://your-function.example.com` |

4. 触发规则需覆盖 `/`、`/config`、`/status`、`/query`、`/search`，或直接绑定域名根路径，否则主页或配置接口可能返回 404。
5. 部署后用默认访问地址或触发规则访问 `/` 查看主页，`/config` 获取快速导入配置。

> 代码使用 `addEventListener('fetch', ...)` 入口和全局 `env`，符合 EdgeOne 边缘函数运行时。EdgeOne Pages Functions 的 `onRequest` 风格不在本实现范围内。

## 4. Cloudflare Workers

```bash
npx wrangler login
npx wrangler secret put AI_API_KEY
# 可选：npx wrangler secret put LOCAL_TOKEN
npx wrangler deploy
```

`wrangler.toml` 已配置 `main = "edge/cloudflare.mjs"` 和默认 `AI_BASE_URL` / `AI_MODEL`。部署后访问 `https://ocs-ai-tiku.<你的子域>.workers.dev/` 查看主页，`/config` 获取快速导入配置。本地调试：`npx wrangler dev`。

## 5. 配置 OCS 助手

- 本机/局域网：用 `local-ai-tiku.json`，把 `127.0.0.1:3000` 改成实际 IP 或域名。
- 公网/边缘：用 `remote-ai-tiku.json`，把 `your-domain.example.com` 改成函数域名，`X-Token` 改成 `LOCAL_TOKEN`。
- 也可以直接访问主页，复制 `/config` 链接或 JSON；该配置使用兼容的 `/query` 接口。
- 脚本头部元信息添加对应 `@connect`，例如 `@connect your-domain.example.com`；也可将 `@connect 模式` 设为宽松模式。

接口验证：

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/status
curl http://127.0.0.1:3000/config
curl 'http://127.0.0.1:3000/query?title=1%2B2%3D%3F&type=single&options=A.%201'
```

成功返回：

```json
{"code":1,"data":{"question":"1+2=?","answer":"A","is_ai":true}}
```

## 6. 安全建议

- 公网部署务必设置 `LOCAL_TOKEN`，OCS 配置通过 `X-Token` 传递；主页 `/status` 和 `/config` 不要求令牌，但不会返回 API Key。
- `ai-tiku.json` 会把 API Key 写进浏览器配置，仅建议本机临时使用。
- Node 限流是单进程内存实现，多实例部署需用反向代理或平台限流；EdgeOne/Cloudflare 建议用平台 WAF/速率限制。
- 用 Nginx / Caddy 为 Node/Docker 部署提供 HTTPS。

## 7. systemd 后台运行（Linux 可选）

```bash
sudo mkdir -p /opt/ocs-ai-tiku
sudo cp server.js answer-utils.js homepage.html package.json /opt/ocs-ai-tiku/
sudo tee /etc/ocs-ai-tiku.env >/dev/null <<'EOF'
AI_API_KEY=sk-你的密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
HOST=127.0.0.1
PORT=3000
RATE_LIMIT_PER_MIN=60
EOF
sudo chmod 600 /etc/ocs-ai-tiku.env
sudo tee /etc/systemd/system/ocs-ai-tiku.service >/dev/null <<'EOF'
[Unit]
Description=番星ai题库服务
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/ocs-ai-tiku
EnvironmentFile=/etc/ocs-ai-tiku.env
ExecStart=/usr/bin/node /opt/ocs-ai-tiku/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now ocs-ai-tiku
```

## 8. 答案格式与容错

- `/search` 返回 `{ code: 1, data: { title, answers: [答案] } }`；`/query` 返回 `{ code: 1, data: { question, answer, is_ai } }`。
- 多选题答案用 `#` 分隔，例如 `A#B`；`A、B`、`A B`、`AB` 也会归一化为 `A#B`。
- 自动清理代码块、`答案：` 前缀、全角字母、Markdown 包裹和尾随标点。
- 支持 AI 返回字符串或数组形式的内容；401/403/429/5xx 会返回可读错误信息。

## 9. 测试与质量分析

```bash
npm run check   # 所有入口文件语法检查
npm test        # 52 项测试
```

当前覆盖：

| 分组 | 数量 | 内容 |
|---|---:|---|
| 配置 | 5 | 直连/本地/远程 handler、环境变量加载、回环监听 |
| 解析 | 6 | 单选、多选、判断、填空、代码块、全角字母、Markdown/标点、数组内容、状态码 |
| 主页/接口 | 6 | HTML 主页、状态接口、配置接口、`/query` GET/POST 与错误 |
| 地址识别 | 3 | 内网 IP 替换 localhost、`PUBLIC_BASE_URL` 优先、域名与公网 IP 保留 |
| 服务 | 20 | 健康检查、GET/POST、CORS、路由、方法、非法请求、令牌、AI 错误、长度限制、限流 |
| 缓存/模型 | 2 | 缓存命中与 `/test-model` 连通性 |
| 边缘 | 10 | core 与 Node 一致、Cloudflare/EdgeOne 主页与接口、令牌、缓存、生成文件同步 |

未覆盖：真实 AI 服务调用、真实 EdgeOne/Cloudflare 部署、负载与安全渗透测试、OCS 浏览器端联调。建议上线前用真实 Key 做一次 `curl` 冒烟测试，并在目标平台验证 `@connect`、HTTPS 和令牌。

## 10. 常见问题

- **401/403**：检查 `AI_API_KEY` 和 `AI_BASE_URL` 是否匹配；EdgeOne/Cloudflare 的环境变量修改后需重新部署。
- **429**：AI 服务限流，降低请求频率或更换配额。
- **请求超时**：调大 `AI_TIMEOUT_MS`，并确认边缘函数到 AI 域名的网络可达。
- **OCS 提示请求失败**：检查 `@connect` 是否包含函数域名；HTTPS 页面尽量用 `GM_xmlhttpRequest`，避免混合内容限制。
- **主页配置地址不对**：设置 `PUBLIC_BASE_URL` 为实际对外地址，或通过实际域名访问主页。
- **EdgeOne 代码不同步**：修改 `edge/core.mjs` 或 `homepage.html` 后执行 `npm run build`。
