# 安全策略

## 支持版本

| 版本 | 安全更新 |
|---|---|
| 1.3.x | 支持 |
| 1.2.x 及以下 | 不再支持 |

## 报告安全问题

请不要在公开 Issue 中披露可直接利用的漏洞、真实 API Key 或个人数据。

请通过维护者邮箱 `3509412293@qq.com` 联系，并尽量包含：

- 受影响的版本与部署方式（Node / Docker / EdgeOne / Cloudflare）
- 复现步骤或最小复现请求
- 影响范围
- 建议的修复方式（如有）

收到报告后会尽快确认并修复；修复完成前请避免公开细节。

## 部署安全建议

- 不要提交 `.env`、真实 API Key、`LOCAL_TOKEN` 或其他密钥。
- 公网部署务必设置 `LOCAL_TOKEN`，并通过 `X-Token` 请求头传递。
- Node/Docker 公网部署建议使用 Nginx、Caddy 等提供 HTTPS。
- 边缘平台请使用 Secret 类型保存 `AI_API_KEY`，不要写进代码或 `wrangler.toml`。
- 按需设置 `RATE_LIMIT_PER_MIN`；EdgeOne/Cloudflare 建议配合平台 WAF 或速率限制。
- `/status` 不返回 API Key；域名或公网 IP 访问时会隐藏内网 IP。
- 定期轮换 API Key，并检查 AI 平台用量与账单。
- 不要将服务直接暴露为无鉴权的公共代理。
