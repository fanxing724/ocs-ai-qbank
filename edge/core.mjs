import { HOMEPAGE_HTML } from './homepage.mjs';

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

export { buildMessages, parseAnswer, extractContent, describeAiStatus, handleRequest };
