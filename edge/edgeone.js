// 由 scripts/build-edgeone.js 从 edge/core.mjs 生成，请勿直接修改。

const HOMEPAGE_HTML = "<!doctype html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#0b1020\">\n  <title>番星ai题库 · 自建版</title>\n  <style>\n    :root {\n      --bg: #080b16;\n      --panel: rgba(17, 23, 42, 0.78);\n      --panel-solid: #11172a;\n      --line: rgba(148, 163, 184, 0.16);\n      --text: #e8ecf7;\n      --muted: #94a3b8;\n      --accent: #8b5cf6;\n      --accent-2: #22d3ee;\n      --ok: #34d399;\n      --bad: #fb7185;\n      --warn: #fbbf24;\n      --radius: 18px;\n      --shadow: 0 24px 80px rgba(0, 0, 0, 0.45);\n    }\n\n    * { box-sizing: border-box; }\n\n    html { color-scheme: dark; }\n\n    body {\n      margin: 0;\n      min-height: 100vh;\n      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n      color: var(--text);\n      background: var(--bg);\n      line-height: 1.6;\n      overflow-x: hidden;\n    }\n\n    .bg {\n      position: fixed;\n      inset: 0;\n      z-index: -1;\n      background:\n        radial-gradient(900px 500px at 12% -10%, rgba(139, 92, 246, 0.28), transparent 60%),\n        radial-gradient(800px 480px at 92% 0%, rgba(34, 211, 238, 0.18), transparent 60%),\n        radial-gradient(700px 500px at 50% 110%, rgba(52, 211, 153, 0.10), transparent 60%);\n    }\n\n    a { color: var(--accent-2); text-decoration: none; }\n    a:hover { text-decoration: underline; }\n\n    code {\n      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n      font-size: 0.92em;\n      color: #c4b5fd;\n    }\n\n    .shell {\n      width: min(1180px, calc(100% - 32px));\n      margin: 0 auto;\n      padding: 28px 0 56px;\n    }\n\n    .topbar {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 18px;\n      margin-bottom: 28px;\n    }\n\n    .brand {\n      display: flex;\n      align-items: center;\n      gap: 14px;\n      min-width: 0;\n    }\n\n    .logo {\n      width: 48px;\n      height: 48px;\n      flex: 0 0 48px;\n      display: grid;\n      place-items: center;\n      border-radius: 14px;\n      font-weight: 800;\n      letter-spacing: -0.04em;\n      font-size: 18px;\n      color: #fff;\n      background: linear-gradient(135deg, var(--accent), #4f46e5 55%, var(--accent-2));\n      box-shadow: 0 12px 30px rgba(139, 92, 246, 0.35);\n    }\n\n    .brand h1 {\n      margin: 0;\n      font-size: clamp(20px, 2.4vw, 27px);\n      letter-spacing: -0.03em;\n      line-height: 1.2;\n    }\n\n    .brand h1 span {\n      font-size: 0.55em;\n      font-weight: 600;\n      color: var(--muted);\n      margin-left: 6px;\n      letter-spacing: 0.04em;\n    }\n\n    .brand p {\n      margin: 4px 0 0;\n      color: var(--muted);\n      font-size: 13px;\n    }\n\n    .status-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 9px;\n      padding: 9px 14px;\n      border: 1px solid var(--line);\n      border-radius: 999px;\n      background: rgba(15, 23, 42, 0.72);\n      color: var(--muted);\n      font-size: 13px;\n      white-space: nowrap;\n    }\n\n    .status-pill .dot {\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      background: var(--warn);\n      box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.12);\n    }\n\n    .status-pill.online { color: var(--ok); border-color: rgba(52, 211, 153, 0.35); }\n    .status-pill.online .dot {\n      background: var(--ok);\n      box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.14);\n    }\n\n    .status-pill.offline { color: var(--bad); border-color: rgba(251, 113, 133, 0.35); }\n    .status-pill.offline .dot {\n      background: var(--bad);\n      box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.14);\n    }\n\n    .card {\n      border: 1px solid var(--line);\n      border-radius: var(--radius);\n      background: var(--panel);\n      backdrop-filter: blur(18px);\n      box-shadow: var(--shadow);\n      padding: 22px;\n    }\n\n    .hero {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 24px;\n      padding: 30px;\n      margin-bottom: 18px;\n      background:\n        linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(34, 211, 238, 0.05) 55%, transparent),\n        var(--panel);\n    }\n\n    .eyebrow {\n      margin: 0 0 8px;\n      font-size: 11px;\n      letter-spacing: 0.22em;\n      font-weight: 700;\n      color: var(--accent-2);\n    }\n\n    .hero h2 {\n      margin: 0 0 10px;\n      font-size: clamp(24px, 3.2vw, 38px);\n      letter-spacing: -0.04em;\n      line-height: 1.15;\n    }\n\n    .muted { color: var(--muted); }\n    .hero p { margin: 0; max-width: 650px; }\n\n    .hero-actions {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n      justify-content: flex-end;\n      flex: 0 0 auto;\n    }\n\n    .btn {\n      appearance: none;\n      border: 1px solid var(--line);\n      border-radius: 12px;\n      background: rgba(30, 41, 59, 0.72);\n      color: var(--text);\n      font: inherit;\n      font-size: 14px;\n      font-weight: 600;\n      padding: 10px 15px;\n      cursor: pointer;\n      transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;\n      white-space: nowrap;\n    }\n\n    .btn:hover {\n      transform: translateY(-1px);\n      border-color: rgba(148, 163, 184, 0.38);\n      background: rgba(51, 65, 85, 0.78);\n    }\n\n    .btn.primary {\n      border-color: transparent;\n      background: linear-gradient(135deg, var(--accent), #6366f1);\n      box-shadow: 0 12px 26px rgba(99, 102, 241, 0.28);\n    }\n\n    .btn.primary:hover { background: linear-gradient(135deg, #9f7aea, #6366f1); }\n\n    .btn.small {\n      padding: 6px 10px;\n      font-size: 12px;\n      border-radius: 9px;\n    }\n\n    .card-tools {\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n\n    .link-box {\n      margin-top: 14px;\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      color: var(--muted);\n      font-size: 13px;\n    }\n\n    .link-box code {\n      padding: 7px 10px;\n      border-radius: 9px;\n      background: rgba(2, 6, 23, 0.55);\n      border: 1px solid var(--line);\n      color: #a5f3fc;\n      word-break: break-all;\n    }\n\n    .token-row {\n      margin-top: 12px;\n      max-width: 440px;\n    }\n\n    .token-row input {\n      font-size: 13px;\n    }\n\n    .stats {\n      display: grid;\n      grid-template-columns: repeat(6, minmax(0, 1fr));\n      gap: 12px;\n      margin-bottom: 18px;\n    }\n\n    .stat {\n      padding: 16px;\n      border: 1px solid var(--line);\n      border-radius: 14px;\n      background: rgba(15, 23, 42, 0.58);\n      min-width: 0;\n    }\n\n    .stat .label {\n      display: block;\n      color: var(--muted);\n      font-size: 12px;\n      margin-bottom: 6px;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n    }\n\n    .stat .value {\n      display: block;\n      font-size: 16px;\n      font-weight: 700;\n      letter-spacing: -0.02em;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n    }\n\n    .stat .value.ok { color: var(--ok); }\n    .stat .value.bad { color: var(--bad); }\n\n    .grid.two {\n      display: grid;\n      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);\n      gap: 18px;\n      margin-bottom: 18px;\n    }\n\n    .card-head {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 12px;\n      margin-bottom: 16px;\n    }\n\n    .card-head h3 {\n      margin: 0;\n      font-size: 17px;\n      letter-spacing: -0.02em;\n    }\n\n    .tag {\n      display: inline-flex;\n      align-items: center;\n      padding: 4px 9px;\n      border-radius: 999px;\n      border: 1px solid var(--line);\n      color: var(--muted);\n      font-size: 11px;\n      font-weight: 700;\n      letter-spacing: 0.06em;\n    }\n\n    .code {\n      margin: 0;\n      max-height: 360px;\n      overflow: auto;\n      padding: 16px;\n      border-radius: 13px;\n      background: rgba(2, 6, 23, 0.62);\n      border: 1px solid var(--line);\n      color: #cbd5e1;\n      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n      font-size: 12.5px;\n      line-height: 1.65;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n\n    .hint {\n      margin: 12px 0 0;\n      color: var(--muted);\n      font-size: 12.5px;\n    }\n\n    .kv {\n      margin: 0;\n      display: grid;\n      grid-template-columns: auto minmax(0, 1fr);\n      gap: 10px 16px;\n      align-items: baseline;\n    }\n\n    .kv dt {\n      color: var(--muted);\n      font-size: 13px;\n      white-space: nowrap;\n    }\n\n    .kv dd {\n      margin: 0;\n      font-size: 13.5px;\n      font-weight: 600;\n      word-break: break-word;\n    }\n\n    form { display: grid; gap: 12px; }\n\n    label {\n      display: grid;\n      gap: 6px;\n      color: var(--muted);\n      font-size: 12.5px;\n      font-weight: 600;\n    }\n\n    input, select, textarea {\n      width: 100%;\n      border: 1px solid var(--line);\n      border-radius: 11px;\n      background: rgba(2, 6, 23, 0.55);\n      color: var(--text);\n      font: inherit;\n      font-size: 13.5px;\n      padding: 10px 12px;\n      outline: none;\n      transition: border-color 0.16s ease, box-shadow 0.16s ease;\n    }\n\n    input:focus, select:focus, textarea:focus {\n      border-color: rgba(139, 92, 246, 0.65);\n      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.14);\n    }\n\n    textarea { min-height: 78px; resize: vertical; }\n\n    .result {\n      margin-top: 14px;\n      min-height: 58px;\n      padding: 13px 14px;\n      border-radius: 12px;\n      border: 1px dashed var(--line);\n      background: rgba(2, 6, 23, 0.35);\n      color: var(--muted);\n      font-size: 13px;\n      white-space: pre-wrap;\n      word-break: break-word;\n    }\n\n    .result.ok {\n      color: #bbf7d0;\n      border-color: rgba(52, 211, 153, 0.38);\n      background: rgba(6, 78, 59, 0.22);\n    }\n\n    .endpoints {\n      list-style: none;\n      margin: 0;\n      padding: 0;\n      display: grid;\n      gap: 10px;\n    }\n\n    .endpoints li {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 12px;\n      padding: 9px 11px;\n      border: 1px solid var(--line);\n      border-radius: 10px;\n      background: rgba(2, 6, 23, 0.3);\n      font-size: 13px;\n    }\n\n    .endpoints code { color: #a5f3fc; }\n    .endpoints span { color: var(--muted); font-size: 12px; }\n\n    .meta {\n      margin-top: 14px;\n      color: var(--muted);\n      font-size: 12px;\n      word-break: break-word;\n    }\n\n    footer {\n      margin-top: 26px;\n      display: flex;\n      flex-wrap: wrap;\n      gap: 8px 18px;\n      justify-content: space-between;\n      color: var(--muted);\n      font-size: 12.5px;\n    }\n\n    .toast {\n      position: fixed;\n      left: 50%;\n      bottom: 28px;\n      transform: translate(-50%, 18px);\n      opacity: 0;\n      pointer-events: none;\n      padding: 10px 16px;\n      border-radius: 999px;\n      border: 1px solid rgba(139, 92, 246, 0.35);\n      background: rgba(30, 27, 75, 0.92);\n      color: #ede9fe;\n      font-size: 13px;\n      font-weight: 600;\n      transition: opacity 0.2s ease, transform 0.2s ease;\n      z-index: 10;\n    }\n\n    .toast.show {\n      opacity: 1;\n      transform: translate(-50%, 0);\n    }\n\n    @media (max-width: 980px) {\n      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }\n      .grid.two { grid-template-columns: minmax(0, 1fr); }\n      .hero { flex-direction: column; align-items: flex-start; }\n      .hero-actions { justify-content: flex-start; }\n    }\n\n    @media (max-width: 560px) {\n      .shell { width: min(100% - 20px, 1180px); padding-top: 18px; }\n      .topbar { align-items: flex-start; flex-direction: column; }\n      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n      .hero { padding: 22px; }\n      .card { padding: 18px; }\n      .btn { flex: 1 1 auto; }\n    }\n  </style>\n</head>\n<body>\n  <div class=\"bg\" aria-hidden=\"true\"></div>\n  <div class=\"shell\">\n    <header class=\"topbar\">\n      <div class=\"brand\">\n        <div class=\"logo\" aria-hidden=\"true\">番</div>\n        <div>\n          <h1>番星ai题库 <span>自建版</span></h1>\n          <p>OCS 助手 · AI 答题服务</p>\n        </div>\n      </div>\n      <div class=\"status-pill\" id=\"statusPill\" aria-live=\"polite\">\n        <span class=\"dot\" aria-hidden=\"true\"></span>\n        <span id=\"statusText\">检测中</span>\n      </div>\n    </header>\n\n    <section class=\"card hero\">\n      <div>\n        <p class=\"eyebrow\">QUICK IMPORT</p>\n        <h2>一条链接，接入 OCS 自动答题</h2>\n        <p class=\"muted\">将订阅链接填入 OCS 的题库配置，或直接复制 JSON。配置会按当前访问地址自动生成。</p>\n        <div class=\"link-box\">\n          <code id=\"configUrl\">加载中...</code>\n        </div>\n        <div class=\"token-row\">\n          <input id=\"tokenInput\" type=\"password\" placeholder=\"可选：输入 LOCAL_TOKEN 生成带令牌配置\" autocomplete=\"off\">\n        </div>\n      </div>\n      <div class=\"hero-actions\">\n        <a class=\"btn primary\" id=\"configLink\" href=\"/config\" target=\"_blank\" rel=\"noreferrer\">打开配置链接</a>\n        <button class=\"btn\" id=\"copyLink\" type=\"button\">复制链接</button>\n        <button class=\"btn\" id=\"copyConfig\" type=\"button\">复制 JSON</button>\n      </div>\n    </section>\n\n    <section class=\"stats\" aria-label=\"服务状态\">\n      <div class=\"stat\"><span class=\"label\">服务状态</span><span class=\"value\" id=\"statStatus\">检测中</span></div>\n      <div class=\"stat\"><span class=\"label\">运行平台</span><span class=\"value\" id=\"statPlatform\">-</span></div>\n      <div class=\"stat\"><span class=\"label\">运行时长</span><span class=\"value\" id=\"statUptime\">-</span></div>\n      <div class=\"stat\"><span class=\"label\">当前模型</span><span class=\"value\" id=\"statModel\">-</span></div>\n      <div class=\"stat\"><span class=\"label\">API Key</span><span class=\"value\" id=\"statKey\">-</span></div>\n      <div class=\"stat\"><span class=\"label\">令牌保护</span><span class=\"value\" id=\"statToken\">-</span></div>\n    </section>\n\n    <section class=\"grid two\">\n      <div class=\"card\">\n        <div class=\"card-head\">\n          <h3>题库配置</h3>\n          <span class=\"tag\">JSON</span>\n        </div>\n        <pre class=\"code\" id=\"configJson\">加载中...</pre>\n        <p class=\"hint\">提示：<code>url</code> 会自动使用当前访问地址；如需固定域名，可设置环境变量 <code>PUBLIC_BASE_URL</code>。启用 <code>LOCAL_TOKEN</code> 时，可在上方输入令牌生成带 <code>X-Token</code> 的配置，令牌只保留在当前页面。</p>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"card-head\">\n          <h3>模型与限制</h3>\n          <div class=\"card-tools\">\n            <button class=\"btn small\" id=\"testModel\" type=\"button\">测试模型</button>\n            <span class=\"tag\">/status</span>\n          </div>\n        </div>\n        <dl class=\"kv\" id=\"modelInfo\">\n          <dt>状态</dt><dd>加载中...</dd>\n        </dl>\n        <div class=\"meta\" id=\"modelTestResult\"></div>\n        <div class=\"meta\" id=\"meta\">正在读取服务信息</div>\n      </div>\n    </section>\n\n    <section class=\"grid two\">\n      <div class=\"card\">\n        <div class=\"card-head\">\n          <h3>接口测试</h3>\n          <span class=\"tag\">/query</span>\n        </div>\n        <form id=\"testForm\">\n          <label>题型\n            <select id=\"testType\">\n              <option value=\"single\">单选题</option>\n              <option value=\"multiple\">多选题</option>\n              <option value=\"judgement\">判断题</option>\n              <option value=\"completion\">填空题</option>\n            </select>\n          </label>\n          <label>题目\n            <textarea id=\"testTitle\" required>1+2=?</textarea>\n          </label>\n          <label>选项（每行一个）\n            <textarea id=\"testOptions\">A. 1\nB. 2\nC. 3\nD. 4</textarea>\n          </label>\n          <button class=\"btn primary\" type=\"submit\">测试答题</button>\n        </form>\n        <div class=\"result\" id=\"testResult\" aria-live=\"polite\">等待测试</div>\n      </div>\n\n      <div class=\"card\">\n        <div class=\"card-head\">\n          <h3>服务端点</h3>\n          <span class=\"tag\">API</span>\n        </div>\n        <ul class=\"endpoints\">\n          <li><code>GET /</code><span>主页</span></li>\n          <li><code>GET /health</code><span>健康检查</span></li>\n          <li><code>GET /status</code><span>运行状态</span></li>\n          <li><code>GET /config</code><span>题库配置</span></li>\n          <li><code>GET|POST /query</code><span>兼容答题接口</span></li>\n          <li><code>GET|POST /search</code><span>OCS 标准答题</span></li>\n        </ul>\n        <div class=\"meta\" id=\"endpointMeta\"></div>\n      </div>\n    </section>\n\n    <footer>\n      <span>番星ai题库 · 自建版 · 仅展示服务状态与模型配置，不返回 API Key</span>\n      <span><a href=\"/config\">订阅配置</a> · <a href=\"/status\">状态 JSON</a> · <a href=\"/health\">健康检查</a></span>\n    </footer>\n  </div>\n\n  <div class=\"toast\" id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n\n  <script>\n    (function () {\n      const origin = window.location.origin;\n      const $ = (id) => document.getElementById(id);\n      const setText = (id, value) => {\n        const node = $(id);\n        if (node) node.textContent = value === undefined || value === null || value === '' ? '-' : String(value);\n      };\n      const setTone = (id, ok) => {\n        const node = $(id);\n        if (!node) return;\n        node.classList.toggle('ok', Boolean(ok));\n        node.classList.toggle('bad', ok === false);\n      };\n\n      let configCache = null;\n      let endpointsCache = null;\n      let toastTimer = 0;\n\n      function showToast(message) {\n        const toast = $('toast');\n        if (!toast) return;\n        toast.textContent = message;\n        toast.classList.add('show');\n        window.clearTimeout(toastTimer);\n        toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);\n      }\n\n      function formatUptime(seconds) {\n        const total = Number(seconds);\n        if (!Number.isFinite(total) || total < 0) return '-';\n        const days = Math.floor(total / 86400);\n        const hours = Math.floor((total % 86400) / 3600);\n        const minutes = Math.floor((total % 3600) / 60);\n        const secs = Math.floor(total % 60);\n        if (days > 0) return days + '天 ' + hours + '小时';\n        if (hours > 0) return hours + '小时 ' + minutes + '分';\n        if (minutes > 0) return minutes + '分 ' + secs + '秒';\n        return secs + '秒';\n      }\n\n      function currentConfigUrl() {\n        return (endpointsCache && endpointsCache.config) || origin + '/config';\n      }\n\n      function currentQueryUrl() {\n        return (endpointsCache && endpointsCache.query) || origin + '/query';\n      }\n\n      function currentBaseUrl() {\n        const homepage = (endpointsCache && endpointsCache.homepage) || origin + '/';\n        return homepage.replace(/\\/+$/, '');\n      }\n\n      function applyEndpoints() {\n        const configUrl = currentConfigUrl();\n        setText('configUrl', configUrl);\n        const link = $('configLink');\n        if (link) link.href = configUrl;\n      }\n\n      const SOURCE_LABELS = {\n        'PUBLIC_BASE_URL': '环境变量',\n        'lan-ip': '内网 IP',\n        'loopback': '本机回环',\n        'ip': '服务器 IP',\n        'domain': '域名',\n        'edge-domain': '边缘域名'\n      };\n\n      function renderModel(status) {\n        const address = status.address || {};\n        const rows = [\n          ['访问地址', address.baseUrl],\n          ['识别方式', SOURCE_LABELS[address.source] || address.source],\n          ['供应商', status.model && status.model.provider],\n          ['模型', status.model && status.model.model],\n          ['接口地址', status.model && status.model.baseUrl],\n          ['请求超时', status.model ? status.model.timeoutMs + ' ms' : '-'],\n          ['题目上限', status.limits ? status.limits.maxTitleLength + ' 字符' : '-'],\n          ['选项上限', status.limits ? status.limits.maxOptionsLength + ' 字符' : '-'],\n          ['每分钟限流', status.limits && status.limits.rateLimitPerMin ? status.limits.rateLimitPerMin + ' 次' : '未启用'],\n          ['答题缓存', status.cache ? (status.cache.enabled ? status.cache.size + ' 条 · 命中 ' + status.cache.hits : '未启用') : '-'],\n          ['Version', status.version]\n        ];\n        const dl = $('modelInfo');\n        if (!dl) return;\n        dl.replaceChildren();\n        rows.forEach(([label, value]) => {\n          const dt = document.createElement('dt');\n          dt.textContent = label;\n          const dd = document.createElement('dd');\n          dd.textContent = value === undefined || value === null || value === '' ? '-' : String(value);\n          dl.append(dt, dd);\n        });\n      }\n\n      async function refreshStatus() {\n        try {\n          const response = await fetch(origin + '/status', { cache: 'no-store' });\n          if (!response.ok) throw new Error('HTTP ' + response.status);\n          const data = await response.json();\n\n          $('statusPill').classList.add('online');\n          $('statusPill').classList.remove('offline');\n          setText('statusText', '服务在线');\n          setText('statStatus', '在线');\n          setTone('statStatus', true);\n          setText('statPlatform', data.platform);\n          setText('statUptime', formatUptime(data.uptime));\n          setText('statModel', data.model && data.model.model);\n          setText('statKey', data.apiKeyConfigured ? '已配置' : '未配置');\n          setTone('statKey', Boolean(data.apiKeyConfigured));\n          setText('statToken', data.security && data.security.tokenEnabled ? '已启用' : '未启用');\n          setTone('statToken', data.security && data.security.tokenEnabled);\n          renderModel(data);\n          endpointsCache = data.endpoints || null;\n          applyEndpoints();\n\n          const endpoints = data.endpoints || {};\n          setText('endpointMeta', '配置文件 ' + currentConfigUrl() + ' · ' + new Date(data.time).toLocaleString());\n          setText('meta', '版本 ' + data.version + ' · ' + new Date(data.time).toLocaleString() + ' · ' + ((data.model && data.model.baseUrl) || ''));\n        } catch (error) {\n          $('statusPill').classList.remove('online');\n          $('statusPill').classList.add('offline');\n          setText('statusText', '服务离线');\n          setText('statStatus', '离线');\n          setTone('statStatus', false);\n          setText('meta', '状态获取失败：' + error.message);\n          setText('endpointMeta', '状态获取失败：' + error.message);\n        }\n      }\n\n      function currentConfig() {\n        if (!configCache) return null;\n        const cloned = JSON.parse(JSON.stringify(configCache));\n        const tokenInput = $('tokenInput');\n        const token = tokenInput ? tokenInput.value.trim() : '';\n        if (token && cloned[0]) {\n          cloned[0].headers = {\n            'Content-Type': 'application/json',\n            'X-Token': token\n          };\n        }\n        return cloned;\n      }\n\n      function renderConfig() {\n        const config = currentConfig();\n        const pre = $('configJson');\n        if (pre) pre.textContent = config ? JSON.stringify(config, null, 2) : '加载中...';\n      }\n\n      async function refreshConfig() {\n        try {\n          const response = await fetch(origin + '/config', { cache: 'no-store' });\n          if (!response.ok) throw new Error('HTTP ' + response.status);\n          configCache = await response.json();\n          renderConfig();\n          applyEndpoints();\n        } catch (error) {\n          setText('configUrl', '配置加载失败：' + error.message);\n          const pre = $('configJson');\n          if (pre) pre.textContent = '配置加载失败：' + error.message;\n        }\n      }\n\n      async function copyText(text, message) {\n        if (!text) return;\n        try {\n          await navigator.clipboard.writeText(text);\n        } catch (error) {\n          const area = document.createElement('textarea');\n          area.value = text;\n          area.style.position = 'fixed';\n          area.style.opacity = '0';\n          document.body.appendChild(area);\n          area.select();\n          document.execCommand('copy');\n          area.remove();\n        }\n        showToast(message);\n      }\n\n      $('copyLink').addEventListener('click', () => copyText(currentConfigUrl(), '配置链接已复制'));\n      $('copyConfig').addEventListener('click', () => {\n        const config = currentConfig();\n        copyText(config ? JSON.stringify(config, null, 2) : '', '题库配置已复制');\n      });\n      $('tokenInput').addEventListener('input', renderConfig);\n\n      $('testModel').addEventListener('click', async () => {\n        const result = $('modelTestResult');\n        result.textContent = '模型测试中...';\n        const headers = {};\n        const token = $('tokenInput').value.trim();\n        if (token) headers['X-Token'] = token;\n        try {\n          const response = await fetch(currentBaseUrl() + '/test-model', {\n            method: 'POST',\n            headers,\n            cache: 'no-store'\n          });\n          const data = await response.json();\n          if (data.code === 1) {\n            result.textContent = '模型正常 · ' + data.data.provider + ' / ' + data.data.model\n              + ' · ' + data.data.latencyMs + ' ms · 返回：' + data.data.answer;\n          } else {\n            result.textContent = '测试失败：' + (data.message || '未知错误');\n          }\n        } catch (error) {\n          result.textContent = '测试失败：' + error.message;\n        }\n      });\n\n      $('testForm').addEventListener('submit', async (event) => {\n        event.preventDefault();\n        const result = $('testResult');\n        result.classList.remove('ok');\n        result.textContent = '请求中...';\n        const params = new URLSearchParams({\n          title: $('testTitle').value,\n          type: $('testType').value,\n          options: $('testOptions').value\n        });\n        try {\n          const headers = {};\n          const token = $('tokenInput').value.trim();\n          if (token) headers['X-Token'] = token;\n          const response = await fetch(currentQueryUrl() + '?' + params.toString(), { cache: 'no-store', headers });\n          const data = await response.json();\n          if (data.code === 1) {\n            result.classList.add('ok');\n            result.textContent = '答案：' + data.data.answer + '\\n题目：' + data.data.question + '\\n来源：' + (data.data.is_ai ? 'AI' : '题库');\n          } else {\n            result.textContent = '失败：' + (data.message || '未知错误');\n          }\n        } catch (error) {\n          result.textContent = '请求失败：' + error.message;\n        }\n      });\n\n      refreshStatus();\n      refreshConfig();\n      window.setInterval(refreshStatus, 15000);\n    })();\n  </script>\n</body>\n</html>\n";

const SERVICE_VERSION = '1.3.0';
const STARTED_AT = Date.now();

function buildMessages(context) {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    judgement: '判断题',
    completion: '填空题'
  };
  const t = typeMap[context.type] || '未知题型';

  return [
    {
      role: 'system',
      content: '你是严谨的答题助手。只输出最终答案，不要解释或推理。单选题只输出选项字母（如 A）；多选题输出字母并用 # 连接（如 A#B）；判断题输出 正确 或 错误；填空题直接输出填空内容。'
    },
    {
      role: 'user',
      content: `题型：${t}\n题目：${context.title || ''}\n选项：${context.options || '无'}`
    }
  ];
}

function normalizeFullWidth(text) {
  return text.replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function parseAnswer(content, type) {
  let answer = String(content).trim();
  answer = answer.replace(/^```[\w-]*\s*/, '').replace(/```$/, '').trim();
  answer = answer.replace(/^`([^`]+)`$/, '$1').trim();
  answer = answer.replace(/^\*{1,2}([^*]+)\*{1,2}$/, '$1').trim();
  answer = answer.replace(/^(?:答案|answer)\s*[:：]\s*/i, '').trim();
  answer = normalizeFullWidth(answer);

  let letters = answer.toUpperCase();
  if (type === 'single' && /^[A-Z][.。、)）]?$/.test(letters)) {
    return letters[0];
  }

  letters = letters.replace(/[.。!！;；:：]+$/, '').trim();
  if (type === 'multiple' && /^[A-Z]{2,}$/.test(letters)) {
    return letters.split('').join('#');
  }
  if (/^[A-Z](?:[#,，、\s]+[A-Z])+$/.test(letters)) {
    return letters.replace(/[#,，、\s]+/g, '#').replace(/#+/g, '#').replace(/^#|#$/g, '');
  }
  return answer;
}

function extractContent(data) {
  const message = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return '';
    }).join('');
  }
  return '';
}

function describeAiStatus(status) {
  if (status === 401 || status === 403) return 'AI 接口鉴权失败，请检查 AI_API_KEY';
  if (status === 429) return 'AI 接口限流，请稍后重试';
  if (status >= 500) return 'AI 接口暂时不可用，请稍后重试';
  return `AI 接口返回 HTTP ${status}`;
}

const CACHE_STORE = new Map();
const CACHE_STATS = { hits: 0, misses: 0 };

function cacheKey(context) {
  const title = String(context.title || '').trim().replace(/\s+/g, ' ');
  const options = String(context.options || '').trim();
  return JSON.stringify([title, context.type || '', options]);
}

function cacheGet(config, key) {
  const ttlMs = Number(config.CACHE_TTL_MS || 86400000);
  if (!ttlMs || ttlMs <= 0) return undefined;
  const item = CACHE_STORE.get(key);
  if (!item) {
    CACHE_STATS.misses += 1;
    return undefined;
  }
  if (item.expiresAt <= Date.now()) {
    CACHE_STORE.delete(key);
    CACHE_STATS.misses += 1;
    return undefined;
  }
  CACHE_STORE.delete(key);
  CACHE_STORE.set(key, item);
  CACHE_STATS.hits += 1;
  return item.value;
}

function cacheSet(config, key, value) {
  const ttlMs = Number(config.CACHE_TTL_MS || 86400000);
  if (!ttlMs || ttlMs <= 0) return;
  const maxEntries = Number(config.CACHE_MAX_ENTRIES || 1000);
  if (CACHE_STORE.size >= maxEntries && !CACHE_STORE.has(key)) {
    const oldest = CACHE_STORE.keys().next().value;
    if (oldest !== undefined) CACHE_STORE.delete(oldest);
  }
  CACHE_STORE.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cacheInfo(config) {
  const ttlMs = Number(config.CACHE_TTL_MS || 86400000);
  const maxEntries = Number(config.CACHE_MAX_ENTRIES || 1000);
  return {
    enabled: Boolean(ttlMs && ttlMs > 0),
    ttlMs,
    maxEntries,
    size: CACHE_STORE.size,
    hits: CACHE_STATS.hits,
    misses: CACHE_STATS.misses
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Token, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...extraHeaders
    }
  });
}

function html(body) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function sanitizeBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  } catch {
    return baseUrl;
  }
}

function resolveBase(config, request) {
  if (config.PUBLIC_BASE_URL) {
    return { base: config.PUBLIC_BASE_URL.replace(/\/+$/, ''), source: 'PUBLIC_BASE_URL' };
  }
  return { base: new URL(request.url).origin, source: 'edge-domain' };
}

function buildTikuConfig(base) {
  return [
    {
      name: '番星ai题库',
      homepage: 'https://724520.xyz',
      url: `${base}/query`,
      method: 'get',
      type: 'GM_xmlhttpRequest',
      contentType: 'json',
      data: {
        title: '${title}',
        options: '${options}',
        type: '${type}'
      },
      handler: 'return (res)=>res.code === 0 ? [res.message, undefined] : [res.data.question,res.data.answer,{ai: res.data.is_ai}]'
    }
  ];
}

function buildStatus(config, request, platform) {
  const address = resolveBase(config, request);
  const base = address.base;
  return {
    ok: true,
    service: 'fanxing-ai-tiku',
    version: SERVICE_VERSION,
    platform: platform || 'edge',
    uptime: Math.floor((Date.now() - STARTED_AT) / 1000),
    time: new Date().toISOString(),
    address: {
      baseUrl: base,
      source: address.source,
      lanIp: ''
    },
    apiKeyConfigured: Boolean(config.AI_API_KEY),
    model: {
      provider: config.AI_PROVIDER_NAME || 'OpenAI 兼容',
      model: config.AI_MODEL || 'gpt-4o-mini',
      baseUrl: sanitizeBaseUrl(config.AI_BASE_URL || 'https://api.openai.com/v1'),
      timeoutMs: Number(config.AI_TIMEOUT_MS || 30000)
    },
    cache: cacheInfo(config),
    security: { tokenEnabled: Boolean(config.LOCAL_TOKEN) },
    limits: {
      maxTitleLength: Number(config.MAX_TITLE_LENGTH || 2000),
      maxOptionsLength: Number(config.MAX_OPTIONS_LENGTH || 8000),
      rateLimitPerMin: 0
    },
    endpoints: {
      homepage: `${base}/`,
      search: `${base}/search`,
      query: `${base}/query`,
      config: `${base}/config`,
      status: `${base}/status`,
      health: `${base}/health`
    }
  };
}

function parseInput(config, body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: '缺少题目' };

  const maxTitleLength = Number(config.MAX_TITLE_LENGTH || 2000);
  if (title.length > maxTitleLength) {
    return { error: `题目过长（上限 ${maxTitleLength} 字符）` };
  }

  const options = typeof body.options === 'string' ? body.options : '';
  const maxOptionsLength = Number(config.MAX_OPTIONS_LENGTH || 8000);
  if (options.length > maxOptionsLength) {
    return { error: `选项过长（上限 ${maxOptionsLength} 字符）` };
  }

  if (!config.AI_API_KEY) return { error: '服务端未配置 AI_API_KEY' };

  return {
    context: {
      title,
      type: typeof body.type === 'string' ? body.type : '',
      options
    }
  };
}

async function readBody(request) {
  if (request.method === 'GET') {
    return Object.fromEntries(new URL(request.url).searchParams);
  }
  if (request.method === 'POST') {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }
  return null;
}

async function requestAi(config, context) {
  const baseUrl = (config.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = config.AI_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(config.AI_TIMEOUT_MS || 30000);
  const canTimeout = timeoutMs > 0 && typeof setTimeout === 'function' && typeof AbortController === 'function';
  const controller = canTimeout ? new AbortController() : null;
  const timer = canTimeout ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.AI_API_KEY}`
      },
      body: JSON.stringify({ model, temperature: 0, messages: buildMessages(context) }),
      ...(controller ? { signal: controller.signal } : {})
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('AI 接口超时');
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function resolveAnswer(config, context) {
  const aiResponse = await requestAi(config, context);
  if (!aiResponse.ok) {
    throw new Error(describeAiStatus(aiResponse.status));
  }

  const data = await aiResponse.json();
  const content = extractContent(data);
  if (!content) throw new Error('AI 未返回内容');

  const answer = parseAnswer(content, context.type);
  if (!answer) throw new Error('无法解析 AI 返回的答案');
  return answer;
}

async function handleRequest(request, bindings, platform) {
  let isQuery = false;
  try {
    const config = bindings || (typeof globalThis !== 'undefined' && globalThis.env) || {};
    const path = new URL(request.url).pathname;

    if (request.method === 'OPTIONS') return json({});
    if (path === '/' || path === '/index.html') return html(HOMEPAGE_HTML);
    if (path === '/health' || path.endsWith('/health')) return json({ ok: true });
    if (path === '/status' || path.endsWith('/status')) {
      return json(buildStatus(config, request, platform), 200, { 'Cache-Control': 'no-store' });
    }
    if (path === '/config' || path.endsWith('/config')) {
      return json(buildTikuConfig(resolveBase(config, request).base), 200, { 'Cache-Control': 'no-store' });
    }

    if (path === '/test-model' || path.endsWith('/test-model')) {
      if (request.method !== 'GET' && request.method !== 'POST') {
        return json({ code: 0, message: '仅支持 GET/POST' });
      }
      const modelToken = config.LOCAL_TOKEN || '';
      if (modelToken && request.headers.get('X-Token') !== modelToken) {
        return json({ code: 0, message: '本地令牌无效' });
      }
      if (!config.AI_API_KEY) {
        return json({ code: 0, message: '服务端未配置 AI_API_KEY' });
      }
      const started = Date.now();
      try {
        const answer = await resolveAnswer(config, {
          title: '1+1=?',
          type: 'single',
          options: 'A. 1\nB. 2\nC. 3\nD. 4'
        });
        return json({
          code: 1,
          data: {
            provider: config.AI_PROVIDER_NAME || 'OpenAI 兼容',
            model: config.AI_MODEL || 'gpt-4o-mini',
            latencyMs: Date.now() - started,
            answer
          }
        });
      } catch (err) {
        return json({ code: 0, message: err.message });
      }
    }

    const isSearch = path === '/search' || path.endsWith('/search');
    isQuery = path === '/query' || path.endsWith('/query');
    if (!isSearch && !isQuery) {
      return json({ code: 0, msg: '未找到接口' }, 404);
    }

    const token = config.LOCAL_TOKEN || '';
    if (token && request.headers.get('X-Token') !== token) {
      return json(isQuery ? { code: 0, message: '本地令牌无效' } : { code: 0, msg: '本地令牌无效' });
    }

    const body = await readBody(request);
    if (body === null) {
      return json(isQuery ? { code: 0, message: '仅支持 GET/POST' } : { code: 0, msg: '仅支持 GET/POST' });
    }

    const parsed = parseInput(config, body);
    if (parsed.error) {
      return json(isQuery ? { code: 0, message: parsed.error } : { code: 0, msg: parsed.error });
    }

    const key = cacheKey(parsed.context);
    let answer = cacheGet(config, key);
    const cached = answer !== undefined;
    if (!cached) {
      answer = await resolveAnswer(config, parsed.context);
      cacheSet(config, key, answer);
    }

    if (isQuery) {
      return json({
        code: 1,
        data: {
          question: parsed.context.title,
          answer,
          is_ai: !cached,
          cached
        }
      });
    }

    return json({
      code: 1,
      data: { title: parsed.context.title, answers: [answer], cached },
      msg: '成功'
    });
  } catch (err) {
    return json(isQuery ? { code: 0, message: err.message } : { code: 0, msg: err.message });
  }
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, typeof env !== 'undefined' ? env : {}, 'edgeone'));
});
