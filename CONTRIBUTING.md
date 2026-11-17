# 贡献指南

感谢参与番星ai题库。提交代码前请先阅读本指南。

## 开发环境

- Node.js 22+（推荐 24）
- 项目零运行时依赖，通常不需要 `npm install`
- 可选：Docker，用于验证容器部署

## 常用命令

```bash
npm start              # 启动 Node 服务
npm run check          # 所有入口文件语法检查
npm test               # 运行完整测试
npm run build          # 重新生成主页模块与 EdgeOne 代码
npm run docker:build   # 构建容器镜像
npm run docker:up      # Docker Compose 启动
```

## 目录说明

| 路径 | 说明 |
|---|---|
| `server.js` | Node HTTP 服务、主页、状态、`/query`、`/search`、`/test-model` |
| `answer-utils.js` | 提示词、答案解析、AI 响应提取 |
| `edge/core.mjs` | 边缘运行时共享逻辑（Web API） |
| `edge/cloudflare.mjs` | Cloudflare Workers 入口 |
| `edge/edgeone.js` | 由脚本生成的 EdgeOne 代码，不要直接修改 |
| `edge/homepage.mjs` | 由脚本生成的主页模块，不要直接修改 |
| `homepage.html` | 状态主页源文件 |
| `scripts/` | 生成脚本 |
| `test.js` | 测试套件（本地 mock AI，不发起真实请求） |

## 修改约定

- 修改 `edge/core.mjs` 或 `homepage.html` 后，执行 `npm run build` 同步生成文件。
- 不要直接编辑 `edge/edgeone.js`、`edge/homepage.mjs`，测试会校验它们是否与源文件一致。
- 新增或修改行为时，请在 `test.js` 中补充测试。
- 多平台行为要保持一致：Node、Cloudflare、EdgeOne 的接口字段和错误文案应尽量统一。
- 边缘代码只使用 Web 标准 API（`Request`、`Response`、`fetch`、`URL`），不要引入 Node 内置模块。
- Node 代码使用 CommonJS；边缘代码使用 ESM。
- 缩进 2 空格，保持现有代码风格。

## 提交与 PR

建议使用 Conventional Commits：

```text
feat: 新功能
fix: 修复问题
docs: 文档
test: 测试
chore: 构建或杂项
```

PR 描述请包含：

- 改动内容
- 影响平台
- 测试方式与结果
- 是否涉及配置或安全变更

## 开源协议

贡献代码即表示同意以 [MIT License](LICENSE) 授权。
