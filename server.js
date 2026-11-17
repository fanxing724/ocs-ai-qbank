const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { version: SERVICE_VERSION } = require('./package.json');
const { buildMessages, parseAnswer, extractContent, describeAiStatus } = require('./answer-utils');

const HOMEPAGE_HTML = fs.readFileSync(path.join(__dirname, 'homepage.html'), 'utf8');
const STARTED_AT = Date.now();

function loadConfig() {
  const host = process.env.HOST || '127.0.0.1';
  const lanIp = process.env.LAN_IP || (isDocker() || isLoopbackHost(host) ? '' : detectLanIp());
  return {
    port: Number(process.env.PORT || 3000),
    host,
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    token: process.env.LOCAL_TOKEN || '',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
    maxTitleLength: Number(process.env.MAX_TITLE_LENGTH || 2000),
    maxOptionsLength: Number(process.env.MAX_OPTIONS_LENGTH || 8000),
    rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN || 0),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
    providerName: process.env.AI_PROVIDER_NAME || 'OpenAI 兼容',
    cacheTtlMs: Number(process.env.CACHE_TTL_MS || 86400000),
    cacheMaxEntries: Number(process.env.CACHE_MAX_ENTRIES || 1000),
    lanIp
  };
}

function isLoopbackHost(host) {
  return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

function isDocker() {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function detectLanIp() {
  try {
    const candidates = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      if (/^(docker|br-|veth|virbr|tun|tap)/i.test(name)) continue;
      for (const info of interfaces[name] || []) {
        const family = typeof info.family === 'string' ? info.family : String(info.family);
        if (family !== 'IPv4' && family !== '4') continue;
        if (info.internal) continue;
        if (!info.address || info.address.startsWith('169.254.')) continue;
        if (!isPrivateIp(info.address)) continue;
        candidates.push(info.address);
      }
    }
    const score = (ip) => {
      if (ip.startsWith('192.168.')) return 0;
      if (ip.startsWith('10.')) return 1;
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
      return 3;
    };
    candidates.sort((a, b) => score(a) - score(b));
    return candidates[0] || '';
  } catch {
    return '';
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Token, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...CORS_HEADERS,
    ...extraHeaders
  });
  res.end(body);
}

function sendHtml(res, html, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store'
  });
  res.end(html);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) reject(new Error('请求体过大'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
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

function extractHostname(host) {
  if (!host) return '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 ? host.slice(1, end) : host;
  }
  return host.split(':')[0];
}

function isIp(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^[0-9a-f:]+$/i.test(host);
}

function isPrivateIp(host) {
  return host === '::1'
    || host.startsWith('127.')
    || host.startsWith('10.')
    || host.startsWith('192.168.')
    || host.startsWith('169.254.')
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

function replaceHost(host, ip) {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    const port = end > 0 ? host.slice(end + 1) : '';
    return `${ip}${port}`;
  }
  const index = host.lastIndexOf(':');
  const port = index > 0 ? host.slice(index) : '';
  return `${ip}${port}`;
}

function resolveBase(config, req) {
  if (config.publicBaseUrl) {
    return { base: config.publicBaseUrl.replace(/\/+$/, ''), source: 'PUBLIC_BASE_URL' };
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const rawHost = forwardedHost || req.headers.host || `localhost:${config.port || 3000}`;
  const hostname = extractHostname(rawHost);
  const loopback = hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.');
  const lanIp = config.lanIp || '';

  let host = rawHost;
  let source;
  if (loopback && lanIp) {
    host = replaceHost(rawHost, lanIp);
    source = isPrivateIp(lanIp) ? 'lan-ip' : 'ip';
  } else if (loopback) {
    source = 'loopback';
  } else if (isIp(hostname)) {
    source = isPrivateIp(hostname) ? 'lan-ip' : 'ip';
  } else {
    source = 'domain';
  }

  return { base: `${proto}://${host}`, source };
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

function buildStatus(config, req, cacheStats) {
  const address = resolveBase(config, req);
  const base = address.base;
  return {
    ok: true,
    service: 'fanxing-ai-tiku',
    version: SERVICE_VERSION,
    platform: 'node',
    uptime: Math.floor((Date.now() - STARTED_AT) / 1000),
    time: new Date().toISOString(),
    address: {
      baseUrl: base,
      source: address.source,
      lanIp: address.source === 'lan-ip' ? (config.lanIp || '') : ''
    },
    apiKeyConfigured: Boolean(config.apiKey),
    model: {
      provider: config.providerName,
      model: config.model,
      baseUrl: sanitizeBaseUrl(config.baseUrl),
      timeoutMs: config.timeoutMs
    },
    cache: cacheStats || { enabled: false, size: 0, hits: 0, misses: 0 },
    security: { tokenEnabled: Boolean(config.token) },
    limits: {
      maxTitleLength: config.maxTitleLength,
      maxOptionsLength: config.maxOptionsLength,
      rateLimitPerMin: config.rateLimitPerMin
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

async function callAi(config, context) {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: buildMessages(context)
    }),
    signal: AbortSignal.timeout(config.timeoutMs)
  });

  if (!response.ok) {
    throw new Error(describeAiStatus(response.status));
  }
  const data = await response.json();
  const content = extractContent(data);
  if (!content) {
    throw new Error('AI 未返回内容');
  }
  const answer = parseAnswer(content, context.type);
  if (!answer) {
    throw new Error('无法解析 AI 返回的答案');
  }
  return answer;
}

function parseAnswerInput(config, body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: '缺少题目' };
  if (title.length > config.maxTitleLength) {
    return { error: `题目过长（上限 ${config.maxTitleLength} 字符）` };
  }

  const options = typeof body.options === 'string' ? body.options : '';
  if (options.length > config.maxOptionsLength) {
    return { error: `选项过长（上限 ${config.maxOptionsLength} 字符）` };
  }
  if (!config.apiKey) return { error: '服务端未配置 AI_API_KEY' };

  return {
    context: {
      title,
      type: typeof body.type === 'string' ? body.type : '',
      options
    }
  };
}

function createRateLimiter(limitPerMin) {
  const hits = new Map();
  return function allow(ip) {
    if (!limitPerMin || limitPerMin <= 0) return true;
    const now = Date.now();
    const windowStart = now - 60000;
    const recent = (hits.get(ip) || []).filter((t) => t > windowStart);
    if (recent.length >= limitPerMin) {
      hits.set(ip, recent);
      return false;
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) {
      for (const [key, times] of hits) {
        if (!times.some((t) => t > windowStart)) hits.delete(key);
      }
    }
    return true;
  };
}

function cacheKey(context) {
  const title = String(context.title || '').trim().replace(/\s+/g, ' ');
  const options = String(context.options || '').trim();
  return JSON.stringify([title, context.type || '', options]);
}

function createAnswerCache(ttlMs, maxEntries) {
  const store = new Map();
  const stats = { hits: 0, misses: 0 };
  const enabled = Boolean(ttlMs && ttlMs > 0);

  return {
    get(key) {
      if (!enabled) return undefined;
      const item = store.get(key);
      if (!item) {
        stats.misses += 1;
        return undefined;
      }
      if (item.expiresAt <= Date.now()) {
        store.delete(key);
        stats.misses += 1;
        return undefined;
      }
      store.delete(key);
      store.set(key, item);
      stats.hits += 1;
      return item.value;
    },
    set(key, value) {
      if (!enabled) return;
      if (store.size >= maxEntries && !store.has(key)) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    stats() {
      return {
        enabled,
        ttlMs,
        maxEntries,
        size: store.size,
        hits: stats.hits,
        misses: stats.misses
      };
    }
  };
}

function createServer(config) {
  const allowRequest = createRateLimiter(config.rateLimitPerMin);
  const cache = createAnswerCache(config.cacheTtlMs, config.cacheMaxEntries);

  return http.createServer(async (req, res) => {
    let isQuery = false;
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;

      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
      }

      if (pathname === '/' || pathname === '/index.html') {
        return sendHtml(res, HOMEPAGE_HTML);
      }

      if (pathname === '/health' || pathname.endsWith('/health')) {
        return sendJson(res, 200, { ok: true });
      }

      if (pathname === '/status' || pathname.endsWith('/status')) {
        return sendJson(res, 200, buildStatus(config, req, cache.stats()), { 'Cache-Control': 'no-store' });
      }

      if (pathname === '/config' || pathname.endsWith('/config')) {
        return sendJson(res, 200, buildTikuConfig(resolveBase(config, req).base), { 'Cache-Control': 'no-store' });
      }

      if (pathname === '/test-model' || pathname.endsWith('/test-model')) {
        if (req.method !== 'GET' && req.method !== 'POST') {
          return sendJson(res, 200, { code: 0, message: '仅支持 GET/POST' });
        }
        if (!allowRequest(req.socket.remoteAddress || 'unknown')) {
          return sendJson(res, 200, { code: 0, message: '请求过于频繁，请稍后重试' });
        }
        if (config.token && req.headers['x-token'] !== config.token) {
          return sendJson(res, 200, { code: 0, message: '本地令牌无效' });
        }
        if (!config.apiKey) {
          return sendJson(res, 200, { code: 0, message: '服务端未配置 AI_API_KEY' });
        }
        const started = Date.now();
        try {
          const answer = await callAi(config, {
            title: '1+1=?',
            type: 'single',
            options: 'A. 1\nB. 2\nC. 3\nD. 4'
          });
          return sendJson(res, 200, {
            code: 1,
            data: {
              provider: config.providerName,
              model: config.model,
              latencyMs: Date.now() - started,
              answer
            }
          });
        } catch (err) {
          return sendJson(res, 200, { code: 0, message: err.message });
        }
      }

      const isSearch = pathname === '/search' || pathname.endsWith('/search');
      isQuery = pathname === '/query' || pathname.endsWith('/query');
      if (!isSearch && !isQuery) {
        return sendJson(res, 404, { code: 0, msg: '未找到接口' });
      }

      if (!allowRequest(req.socket.remoteAddress || 'unknown')) {
        return sendJson(res, 200, isQuery
          ? { code: 0, message: '请求过于频繁，请稍后重试' }
          : { code: 0, msg: '请求过于频繁，请稍后重试' });
      }

      if (config.token && req.headers['x-token'] !== config.token) {
        return sendJson(res, 200, isQuery
          ? { code: 0, message: '本地令牌无效' }
          : { code: 0, msg: '本地令牌无效' });
      }

      let body;
      if (req.method === 'POST') {
        body = await readJson(req);
      } else if (req.method === 'GET') {
        body = Object.fromEntries(url.searchParams);
      } else {
        return sendJson(res, 200, isQuery
          ? { code: 0, message: '仅支持 GET/POST' }
          : { code: 0, msg: '仅支持 GET/POST' });
      }

      const parsed = parseAnswerInput(config, body);
      if (parsed.error) {
        return sendJson(res, 200, isQuery
          ? { code: 0, message: parsed.error }
          : { code: 0, msg: parsed.error });
      }

      const key = cacheKey(parsed.context);
      let answer = cache.get(key);
      const cached = answer !== undefined;
      if (!cached) {
        answer = await callAi(config, parsed.context);
        cache.set(key, answer);
      }

      if (isQuery) {
        return sendJson(res, 200, {
          code: 1,
          data: {
            question: parsed.context.title,
            answer,
            is_ai: !cached,
            cached
          }
        });
      }

      return sendJson(res, 200, {
        code: 1,
        data: { title: parsed.context.title, answers: [answer], cached },
        msg: '成功'
      });
    } catch (err) {
      if (config.logErrors !== false) {
        console.error('[OCS AI 题库]', err.message);
      }
      return sendJson(res, 200, isQuery
        ? { code: 0, message: err.message }
        : { code: 0, msg: err.message });
    }
  });
}

if (require.main === module) {
  const config = loadConfig();
  createServer(config).listen(config.port, config.host, () => {
    console.log(`番星ai题库已启动: http://${config.host}:${config.port}/`);
  });
}

module.exports = { createServer, loadConfig };
