const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { pathToFileURL } = require('url');
const { createServer, loadConfig } = require('./server');
const { buildMessages, parseAnswer, extractContent, describeAiStatus } = require('./answer-utils');
const { generate: generateEdgeOne } = require('./scripts/build-edgeone');
const { generate: generateHomepage } = require('./scripts/build-homepage');
const { version: PACKAGE_VERSION } = require('./package.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const readConfig = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const compile = (code) => new Function(code)();
const env = { title: '1+2=？', type: 'multiple', options: 'A. 1\nB. 2\nC. 3\nD. 4' };

let aiPort = 0;
let mockCalls = [];

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
}

async function post(port, body, pathname = '/search', headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
}

async function get(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
  return { status: response.status, data: await response.json() };
}

async function getText(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    text: await response.text()
  };
}

function getWithHeaders(port, pathname, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method: 'GET', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function baseConfig(overrides = {}) {
  return {
    port: 0,
    host: '127.0.0.1',
    baseUrl: `http://127.0.0.1:${aiPort}/v1`,
    apiKey: 'test-key',
    model: 'test-model',
    token: '',
    timeoutMs: 5000,
    maxTitleLength: 2000,
    maxOptionsLength: 8000,
    rateLimitPerMin: 0,
    providerName: 'Test Provider',
    cacheTtlMs: 86400000,
    cacheMaxEntries: 1000,
    lanIp: '',
    logErrors: false,
    ...overrides
  };
}

async function withServer(overrides, fn) {
  const server = createServer(baseConfig(overrides));
  const port = await listen(server);
  try {
    return await fn(port);
  } finally {
    await close(server);
  }
}

function createMockAi() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(raw); } catch { payload = {}; }
      calls.push({ headers: req.headers, payload });

      const userContent = payload.messages && payload.messages[1] ? payload.messages[1].content : '';
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };

      if (userContent.includes('AI-AUTH')) return send(401, { error: 'unauthorized' });
      if (userContent.includes('AI-ERROR')) return send(500, { error: 'boom' });
      if (userContent.includes('AI-MALFORMED')) return send(200, { choices: [] });
      if (userContent.includes('AI-EMPTY')) return send(200, { choices: [{ message: { content: '```' } }] });
      if (userContent.includes('AI-BAD-JSON')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('not-json');
        return;
      }
      if (userContent.includes('AI-ARRAY')) {
        return send(200, { choices: [{ message: { content: [{ type: 'text', text: 'A#B' }] } }] });
      }
      return send(200, { choices: [{ message: { content: 'A#B' } }] });
    });
  });
  return { server, calls };
}

function edgeBindings(overrides = {}) {
  return {
    AI_API_KEY: 'test-key',
    AI_MODEL: 'test-model',
    AI_BASE_URL: `http://127.0.0.1:${aiPort}/v1`,
    LOCAL_TOKEN: 'secret',
    AI_PROVIDER_NAME: 'Test Provider',
    CACHE_TTL_MS: '0',
    CACHE_MAX_ENTRIES: '1000',
    MAX_TITLE_LENGTH: '2000',
    MAX_OPTIONS_LENGTH: '8000',
    ...overrides
  };
}

function loadEdgeOne(bindings) {
  const code = fs.readFileSync(path.join(__dirname, 'edge/edgeone.js'), 'utf8');
  let listener;
  const handleRequest = new Function('addEventListener', 'env', `${code}\nreturn handleRequest;`)(
    (type, cb) => { if (type === 'fetch') listener = cb; },
    bindings
  );
  return { handleRequest, getListener: () => listener };
}

const direct = readConfig('ai-tiku.json')[0];
const local = readConfig('local-ai-tiku.json')[0];
const remote = readConfig('remote-ai-tiku.json')[0];

test('配置：直连 handler 与共享逻辑一致', () => {
  const build = compile(direct.data.messages.handler);
  const parse = compile(direct.handler);
  assert.deepStrictEqual(build(env), buildMessages(env));
  for (const content of ['A', 'A#B', '```\n答案：A、B\n```', '正确', '实现中华民族伟大复兴']) {
    assert.deepStrictEqual(parse({ choices: [{ message: { content } }] }), [undefined, parseAnswer(content)]);
  }
  assert.strictEqual(parse({}), undefined);
});

test('配置：本地题库 handler', () => {
  const handler = compile(local.handler);
  assert.deepStrictEqual(handler({ code: 1, data: { title: '题目', answers: ['A'] } }), ['题目', 'A']);
  assert.deepStrictEqual(handler({ code: 0, msg: '搜索不到' }), ['搜索不到', undefined]);
  assert.deepStrictEqual(handler(undefined), ['题库请求失败', undefined]);
});

test('配置：远程题库 handler 与本地一致', () => {
  assert.ok(remote.url.startsWith('https://'));
  assert.strictEqual(remote.headers['X-Token'], 'REPLACE_WITH_LOCAL_TOKEN');
  assert.strictEqual(remote.handler, local.handler);
  assert.deepStrictEqual(compile(remote.handler)({ code: 1, data: { title: '题目', answers: ['B'] } }), ['题目', 'B']);
});

test('配置：loadConfig 读取环境变量', () => {
  const keys = ['PORT', 'HOST', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL', 'AI_PROVIDER_NAME', 'LOCAL_TOKEN', 'AI_TIMEOUT_MS', 'MAX_TITLE_LENGTH', 'MAX_OPTIONS_LENGTH', 'RATE_LIMIT_PER_MIN', 'CACHE_TTL_MS', 'CACHE_MAX_ENTRIES', 'LAN_IP'];
  const saved = {};
  for (const key of keys) saved[key] = process.env[key];
  Object.assign(process.env, {
    PORT: '4321',
    HOST: '0.0.0.0',
    AI_BASE_URL: 'https://example.com/v1',
    AI_API_KEY: 'key',
    AI_MODEL: 'model',
    AI_PROVIDER_NAME: 'Custom Provider',
    LOCAL_TOKEN: 'token',
    AI_TIMEOUT_MS: '1234',
    MAX_TITLE_LENGTH: '10',
    MAX_OPTIONS_LENGTH: '20',
    RATE_LIMIT_PER_MIN: '30',
    CACHE_TTL_MS: '60000',
    CACHE_MAX_ENTRIES: '50',
    LAN_IP: '192.168.1.10'
  });
  try {
    const config = loadConfig();
    assert.strictEqual(config.port, 4321);
    assert.strictEqual(config.host, '0.0.0.0');
    assert.strictEqual(config.baseUrl, 'https://example.com/v1');
    assert.strictEqual(config.apiKey, 'key');
    assert.strictEqual(config.model, 'model');
    assert.strictEqual(config.token, 'token');
    assert.strictEqual(config.timeoutMs, 1234);
    assert.strictEqual(config.maxTitleLength, 10);
    assert.strictEqual(config.maxOptionsLength, 20);
    assert.strictEqual(config.rateLimitPerMin, 30);
    assert.strictEqual(config.providerName, 'Custom Provider');
    assert.strictEqual(config.cacheTtlMs, 60000);
    assert.strictEqual(config.cacheMaxEntries, 50);
    assert.strictEqual(config.lanIp, '192.168.1.10');
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test('配置：回环监听不自动替换内网 IP', () => {
  const savedHost = process.env.HOST;
  const savedLanIp = process.env.LAN_IP;
  process.env.HOST = '127.0.0.1';
  delete process.env.LAN_IP;
  try {
    const config = loadConfig();
    assert.strictEqual(config.host, '127.0.0.1');
    assert.strictEqual(config.lanIp, '');
  } finally {
    if (savedHost === undefined) delete process.env.HOST;
    else process.env.HOST = savedHost;
    if (savedLanIp === undefined) delete process.env.LAN_IP;
    else process.env.LAN_IP = savedLanIp;
  }
});

test('解析：单选题与代码块清理', () => {
  assert.strictEqual(parseAnswer('A', 'single'), 'A');
  assert.strictEqual(parseAnswer('```\n答案：A\n```', 'single'), 'A');
  assert.strictEqual(parseAnswer('Ａ', 'single'), 'A');
});

test('解析：多选题多种分隔形式', () => {
  assert.strictEqual(parseAnswer('A#B', 'multiple'), 'A#B');
  assert.strictEqual(parseAnswer('A、B', 'multiple'), 'A#B');
  assert.strictEqual(parseAnswer('AB', 'multiple'), 'A#B');
  assert.strictEqual(parseAnswer('A B C', 'multiple'), 'A#B#C');
});

test('解析：判断题与填空题保持原文', () => {
  assert.strictEqual(parseAnswer('正确', 'judgement'), '正确');
  assert.strictEqual(parseAnswer('实现中华民族伟大复兴', 'completion'), '实现中华民族伟大复兴');
});

test('解析：Markdown 与标点清理', () => {
  assert.strictEqual(parseAnswer('**A**', 'single'), 'A');
  assert.strictEqual(parseAnswer('`A`', 'single'), 'A');
  assert.strictEqual(parseAnswer('A.', 'single'), 'A');
  assert.strictEqual(parseAnswer('A、B。', 'multiple'), 'A#B');
});

test('解析：AI 响应内容支持字符串与数组', () => {
  assert.strictEqual(extractContent({ choices: [{ message: { content: 'A' } }] }), 'A');
  assert.strictEqual(extractContent({ choices: [{ message: { content: [{ text: 'A' }, { text: '#B' }] } }] }), 'A#B');
  assert.strictEqual(extractContent({ choices: [] }), '');
  assert.strictEqual(extractContent(null), '');
});

test('解析：AI 状态码提示', () => {
  assert.ok(describeAiStatus(401).includes('鉴权'));
  assert.ok(describeAiStatus(403).includes('鉴权'));
  assert.ok(describeAiStatus(429).includes('限流'));
  assert.ok(describeAiStatus(502).includes('暂时不可用'));
  assert.ok(describeAiStatus(418).includes('418'));
});

test('服务：健康检查', async () => {
  await withServer({}, async (port) => {
    const { status, data } = await get(port, '/health');
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(data, { ok: true });
  });
});

test('主页：返回 HTML 与关键区块', async () => {
  await withServer({}, async (port) => {
    const { status, contentType, text } = await getText(port, '/');
    assert.strictEqual(status, 200);
    assert.ok(contentType.includes('text/html'));
    assert.ok(text.includes('番星ai题库'));
    assert.ok(text.includes('/status'));
    assert.ok(text.includes('/config'));
  });
});

test('主页：状态接口返回模型信息且不泄露 Key', async () => {
  await withServer({}, async (port) => {
    const { data } = await get(port, '/status');
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.service, 'fanxing-ai-tiku');
    assert.strictEqual(data.platform, 'node');
    assert.strictEqual(data.version, PACKAGE_VERSION);
    assert.strictEqual(data.address.source, 'loopback');
    assert.strictEqual(data.address.baseUrl, `http://127.0.0.1:${port}`);
    assert.strictEqual(data.model.provider, 'Test Provider');
    assert.strictEqual(data.model.model, 'test-model');
    assert.strictEqual(data.cache.enabled, true);
    assert.strictEqual(data.apiKeyConfigured, true);
    assert.strictEqual(data.security.tokenEnabled, false);
    assert.ok(!JSON.stringify(data).includes('test-key'));
  });
});

test('主页：配置接口自动指向当前 /query', async () => {
  await withServer({}, async (port) => {
    const { data } = await get(port, '/config');
    assert.ok(Array.isArray(data));
    assert.strictEqual(data[0].name, '番星ai题库');
    assert.strictEqual(data[0].homepage, 'https://724520.xyz');
    assert.strictEqual(data[0].url, `http://127.0.0.1:${port}/query`);
    assert.strictEqual(data[0].method, 'get');
    assert.ok(data[0].handler.includes('res.data.answer'));
  });
});

test('地址识别：局域网 IP 替换 localhost', async () => {
  await withServer({ lanIp: '192.168.1.50' }, async (port) => {
    const config = await get(port, '/config');
    assert.strictEqual(config.data[0].url, `http://192.168.1.50:${port}/query`);

    const { data } = await get(port, '/status');
    assert.strictEqual(data.address.source, 'lan-ip');
    assert.strictEqual(data.address.baseUrl, `http://192.168.1.50:${port}`);
    assert.strictEqual(data.address.lanIp, '192.168.1.50');
    assert.strictEqual(data.endpoints.config, `http://192.168.1.50:${port}/config`);
  });
});

test('地址识别：PUBLIC_BASE_URL 优先', async () => {
  await withServer({ publicBaseUrl: 'https://tiku.example.com/' }, async (port) => {
    const config = await get(port, '/config');
    assert.strictEqual(config.data[0].url, 'https://tiku.example.com/query');

    const { data } = await get(port, '/status');
    assert.strictEqual(data.address.source, 'PUBLIC_BASE_URL');
    assert.strictEqual(data.address.baseUrl, 'https://tiku.example.com');
  });
});

test('地址识别：域名与公网 IP 保留原地址', async () => {
  await withServer({ lanIp: '192.168.1.50' }, async (port) => {
    const domainConfig = await getWithHeaders(port, '/config', {
      Host: 'tiku.example.com',
      'X-Forwarded-Proto': 'https'
    });
    assert.strictEqual(domainConfig.data[0].url, 'https://tiku.example.com/query');

    const domainStatus = await getWithHeaders(port, '/status', {
      Host: 'tiku.example.com',
      'X-Forwarded-Proto': 'https'
    });
    assert.strictEqual(domainStatus.data.address.source, 'domain');
    assert.strictEqual(domainStatus.data.address.baseUrl, 'https://tiku.example.com');
    assert.strictEqual(domainStatus.data.address.lanIp, '');

    const ipConfig = await getWithHeaders(port, '/config', {
      Host: '203.0.113.10:8080'
    });
    assert.strictEqual(ipConfig.data[0].url, 'http://203.0.113.10:8080/query');

    const ipStatus = await getWithHeaders(port, '/status', {
      Host: '203.0.113.10:8080'
    });
    assert.strictEqual(ipStatus.data.address.source, 'ip');
    assert.strictEqual(ipStatus.data.address.baseUrl, 'http://203.0.113.10:8080');
    assert.strictEqual(ipStatus.data.address.lanIp, '');
  });
});

test('题库接口：/query 答题成功', async () => {
  await withServer({}, async (port) => {
    const query = new URLSearchParams({ title: env.title, type: env.type, options: env.options });
    const { data } = await get(port, `/query?${query}`);
    assert.deepStrictEqual(data, {
      code: 1,
      data: { question: env.title, answer: 'A#B', is_ai: true, cached: false }
    });
  });
});

test('题库接口：/query POST 成功', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, env, '/query');
    assert.deepStrictEqual(data, {
      code: 1,
      data: { question: env.title, answer: 'A#B', is_ai: true, cached: false }
    });
  });
});

test('题库接口：/query 缺少题目', async () => {
  await withServer({}, async (port) => {
    const { data } = await get(port, '/query');
    assert.deepStrictEqual(data, { code: 0, message: '缺少题目' });
  });
});

test('服务：POST 答题成功', async () => {
  await withServer({}, async (port) => {
    const { status, data } = await post(port, env);
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(data, { code: 1, data: { title: env.title, answers: ['A#B'], cached: false }, msg: '成功' });
  });
});

test('服务：GET 答题成功', async () => {
  await withServer({}, async (port) => {
    const query = new URLSearchParams({ title: env.title, type: env.type, options: env.options });
    const { data } = await get(port, `/search?${query}`);
    assert.deepStrictEqual(data, { code: 1, data: { title: env.title, answers: ['A#B'], cached: false }, msg: '成功' });
  });
});

test('服务：CORS 预检', async () => {
  await withServer({}, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/search`, { method: 'OPTIONS' });
    assert.strictEqual(response.status, 204);
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*');
  });
});

test('服务：未知路径返回 404', async () => {
  await withServer({}, async (port) => {
    const { status, data } = await get(port, '/unknown');
    assert.strictEqual(status, 404);
    assert.strictEqual(data.msg, '未找到接口');
  });
});

test('服务：支持子路径 /api/search', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, env, '/api/search');
    assert.strictEqual(data.code, 1);
  });
});

test('服务：不支持的方法', async () => {
  await withServer({}, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/search`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env)
    });
    const data = await response.json();
    assert.strictEqual(data.msg, '仅支持 GET/POST');
  });
});

test('服务：缺少题目', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, {});
    assert.strictEqual(data.code, 0);
    assert.strictEqual(data.msg, '缺少题目');
  });
});

test('服务：非法 JSON', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, '{bad');
    assert.strictEqual(data.code, 0);
    assert.strictEqual(data.msg, '请求体不是合法 JSON');
  });
});

test('服务：未配置 API Key', async () => {
  await withServer({ apiKey: '' }, async (port) => {
    const { data } = await post(port, env);
    assert.strictEqual(data.msg, '服务端未配置 AI_API_KEY');
  });
});

test('服务：令牌校验', async () => {
  await withServer({ token: 'secret' }, async (port) => {
    const denied = await post(port, env);
    assert.strictEqual(denied.data.msg, '本地令牌无效');
    const ok = await post(port, env, '/search', { 'X-Token': 'secret' });
    assert.strictEqual(ok.data.code, 1);
  });
});

test('服务：AI 401 错误提示', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-AUTH' });
    assert.ok(data.msg.includes('鉴权'));
  });
});

test('服务：AI 500 错误提示', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-ERROR' });
    assert.ok(data.msg.includes('暂时不可用'));
  });
});

test('服务：AI 响应缺少内容', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-MALFORMED' });
    assert.strictEqual(data.msg, 'AI 未返回内容');
  });
});

test('服务：AI 数组形式内容', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-ARRAY' });
    assert.deepStrictEqual(data.data.answers, ['A#B']);
  });
});

test('服务：AI 返回非法 JSON', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-BAD-JSON' });
    assert.strictEqual(data.code, 0);
    assert.ok(data.msg);
  });
});

test('服务：AI 返回空答案', async () => {
  await withServer({}, async (port) => {
    const { data } = await post(port, { ...env, title: 'AI-EMPTY' });
    assert.strictEqual(data.msg, '无法解析 AI 返回的答案');
  });
});

test('服务：题目长度限制', async () => {
  await withServer({ maxTitleLength: 5 }, async (port) => {
    const { data } = await post(port, { ...env, title: '123456' });
    assert.ok(data.msg.includes('题目过长'));
  });
});

test('服务：选项长度限制', async () => {
  await withServer({ maxOptionsLength: 5 }, async (port) => {
    const { data } = await post(port, { ...env, options: '123456' });
    assert.ok(data.msg.includes('选项过长'));
  });
});

test('服务：限流', async () => {
  await withServer({ rateLimitPerMin: 1 }, async (port) => {
    const first = await post(port, env);
    assert.strictEqual(first.data.code, 1);
    const second = await post(port, env);
    assert.strictEqual(second.data.msg, '请求过于频繁，请稍后重试');
  });
});

test('缓存：相同题目命中缓存', async () => {
  await withServer({}, async (port) => {
    const before = mockCalls.length;
    const first = await post(port, env);
    const second = await post(port, env);

    assert.strictEqual(mockCalls.length - before, 1);
    assert.strictEqual(first.data.data.cached, false);
    assert.strictEqual(second.data.data.cached, true);
    assert.deepStrictEqual(second.data.data.answers, ['A#B']);

    const status = await get(port, '/status');
    assert.strictEqual(status.data.cache.size, 1);
    assert.strictEqual(status.data.cache.hits, 1);
    assert.strictEqual(status.data.cache.misses, 1);
  });
});

test('模型：/test-model 连通性测试', async () => {
  await withServer({}, async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/test-model`, { method: 'POST' });
    const data = await response.json();
    assert.strictEqual(data.code, 1);
    assert.strictEqual(data.data.provider, 'Test Provider');
    assert.strictEqual(data.data.model, 'test-model');
    assert.strictEqual(data.data.answer, 'A#B');
    assert.ok(data.data.latencyMs >= 0);
  });
});

test('边缘：core 与 Node 逻辑一致', async () => {
  const core = await import(pathToFileURL(path.join(__dirname, 'edge/core.mjs')).href);
  assert.deepStrictEqual(core.buildMessages(env), buildMessages(env));
  for (const [content, type] of [['A', 'single'], ['A、B', 'multiple'], ['AB', 'multiple'], ['正确', 'judgement'], ['实现中华民族伟大复兴', 'completion']]) {
    assert.strictEqual(core.parseAnswer(content, type), parseAnswer(content, type));
  }
  assert.strictEqual(core.extractContent({ choices: [{ message: { content: [{ text: 'A' }] } }] }), 'A');
  assert.strictEqual(core.describeAiStatus(429), describeAiStatus(429));
});

test('边缘：Cloudflare 答题成功', async () => {
  const cf = await import(pathToFileURL(path.join(__dirname, 'edge/cloudflare.mjs')).href);
  const request = new Request('https://worker.example.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': 'secret' },
    body: JSON.stringify(env)
  });
  const response = await cf.default.fetch(request, edgeBindings());
  const data = await response.json();
  assert.deepStrictEqual(data, { code: 1, data: { title: env.title, answers: ['A#B'], cached: false }, msg: '成功' });
});

test('边缘：Cloudflare 主页、状态、配置与 /query', async () => {
  const cf = await import(pathToFileURL(path.join(__dirname, 'edge/cloudflare.mjs')).href);
  const bindings = edgeBindings();

  const home = await cf.default.fetch(new Request('https://worker.example.com/'), bindings);
  assert.ok((await home.text()).includes('番星ai题库'));

  const status = await (await cf.default.fetch(new Request('https://worker.example.com/status'), bindings)).json();
  assert.strictEqual(status.platform, 'cloudflare');
  assert.strictEqual(status.version, PACKAGE_VERSION);
  assert.strictEqual(status.address.source, 'edge-domain');
  assert.strictEqual(status.address.baseUrl, 'https://worker.example.com');
  assert.strictEqual(status.cache.enabled, false);

  const config = await (await cf.default.fetch(new Request('https://worker.example.com/config'), bindings)).json();
  assert.strictEqual(config[0].url, 'https://worker.example.com/query');

  const query = new URLSearchParams({ title: env.title, type: env.type, options: env.options });
  const result = await (await cf.default.fetch(new Request(`https://worker.example.com/query?${query}`, {
    headers: { 'X-Token': 'secret' }
  }), bindings)).json();
  assert.deepStrictEqual(result, {
    code: 1,
    data: { question: env.title, answer: 'A#B', is_ai: true, cached: false }
  });

  const modelTest = await (await cf.default.fetch(new Request('https://worker.example.com/test-model', {
    method: 'POST',
    headers: { 'X-Token': 'secret' }
  }), bindings)).json();
  assert.strictEqual(modelTest.code, 1);
  assert.strictEqual(modelTest.data.provider, 'Test Provider');
});

test('边缘：Cloudflare 令牌校验', async () => {
  const cf = await import(pathToFileURL(path.join(__dirname, 'edge/cloudflare.mjs')).href);
  const request = new Request('https://worker.example.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(env)
  });
  const data = await (await cf.default.fetch(request, edgeBindings())).json();
  assert.strictEqual(data.msg, '本地令牌无效');
});

test('边缘：Cloudflare 缓存命中', async () => {
  const cf = await import(pathToFileURL(path.join(__dirname, 'edge/cloudflare.mjs')).href);
  const bindings = edgeBindings({ CACHE_TTL_MS: '60000' });
  const title = `edge-cache-${Date.now()}-${Math.random()}`;
  const url = `https://worker.example.com/query?${new URLSearchParams({ title, type: 'single', options: 'A. 1' })}`;
  const headers = { 'X-Token': 'secret' };

  const first = await (await cf.default.fetch(new Request(url, { headers }), bindings)).json();
  const second = await (await cf.default.fetch(new Request(url, { headers }), bindings)).json();

  assert.strictEqual(first.data.cached, false);
  assert.strictEqual(first.data.is_ai, true);
  assert.strictEqual(second.data.cached, true);
  assert.strictEqual(second.data.is_ai, false);
});

test('边缘：EdgeOne 答题成功', async () => {
  const { getListener } = loadEdgeOne(edgeBindings());
  const event = {
    request: new Request('https://eo.example.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': 'secret' },
      body: JSON.stringify(env)
    }),
    respondWith(promise) { this.promise = promise; }
  };
  const listener = getListener();
  assert.strictEqual(typeof listener, 'function');
  listener(event);
  const data = await (await event.promise).json();
  assert.deepStrictEqual(data, { code: 1, data: { title: env.title, answers: ['A#B'], cached: false }, msg: '成功' });
});

test('边缘：EdgeOne 主页与状态', async () => {
  const { handleRequest } = loadEdgeOne(edgeBindings());
  const bindings = edgeBindings();

  const home = await handleRequest(new Request('https://eo.example.com/'), bindings, 'edgeone');
  assert.ok((await home.text()).includes('番星ai题库'));

  const statusResponse = await handleRequest(new Request('https://eo.example.com/status'), bindings, 'edgeone');
  const status = await statusResponse.json();
  assert.strictEqual(status.platform, 'edgeone');
  assert.strictEqual(status.version, PACKAGE_VERSION);
  assert.strictEqual(status.address.source, 'edge-domain');
  assert.strictEqual(status.address.baseUrl, 'https://eo.example.com');

  const config = await (await handleRequest(new Request('https://eo.example.com/config'), bindings, 'edgeone')).json();
  assert.strictEqual(config[0].url, 'https://eo.example.com/query');
});

test('边缘：EdgeOne 令牌校验', async () => {
  const { handleRequest } = loadEdgeOne(edgeBindings());
  const request = new Request('https://eo.example.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(env)
  });
  const data = await (await handleRequest(request, edgeBindings())).json();
  assert.strictEqual(data.msg, '本地令牌无效');
});

test('边缘：edgeone.js 与 core 生成结果一致', () => {
  const actual = fs.readFileSync(path.join(__dirname, 'edge/edgeone.js'), 'utf8');
  assert.strictEqual(actual, generateEdgeOne());
});

test('边缘：edge/homepage.mjs 与 homepage.html 同步', () => {
  const actual = fs.readFileSync(path.join(__dirname, 'edge/homepage.mjs'), 'utf8');
  assert.strictEqual(actual, generateHomepage());
});

async function run() {
  const started = Date.now();
  let passed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures.push({ name, err });
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
    }
  }

  const duration = Date.now() - started;
  console.log(`\n${passed} 通过，${failures.length} 失败，共 ${tests.length} 项，耗时 ${duration}ms`);
  if (failures.length) {
    process.exitCode = 1;
    for (const { name, err } of failures) {
      console.error(`\n[失败] ${name}\n${err.stack}`);
    }
  }
}

async function main() {
  const mock = createMockAi();
  mockCalls = mock.calls;
  aiPort = await listen(mock.server);
  try {
    await run();
  } finally {
    await close(mock.server);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
