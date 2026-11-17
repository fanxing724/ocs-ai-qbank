const fs = require('fs');
const path = require('path');

function generate() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'edge', 'core.mjs'), 'utf8');
  const homepage = fs.readFileSync(path.join(__dirname, '..', 'homepage.html'), 'utf8');
  const body = source
    .replace(/^import \{ HOMEPAGE_HTML \} from '\.\/homepage\.mjs';\s*/m, `const HOMEPAGE_HTML = ${JSON.stringify(homepage)};\n\n`)
    .replace(/export\s*\{[^}]*\};?\s*$/, '')
    .trim();

  if (/^\s*(import|export)\s/m.test(body)) {
    throw new Error('edge/core.mjs 仍包含模块语法，无法生成 EdgeOne 代码');
  }

  return `// 由 scripts/build-edgeone.js 从 edge/core.mjs 生成，请勿直接修改。\n\n${body}\n\naddEventListener('fetch', (event) => {\n  event.respondWith(handleRequest(event.request, typeof env !== 'undefined' ? env : {}, 'edgeone'));\n});\n`;
}

if (require.main === module) {
  const target = path.join(__dirname, '..', 'edge', 'edgeone.js');
  fs.writeFileSync(target, generate());
  console.log(`已生成 ${target}`);
}

module.exports = { generate };
