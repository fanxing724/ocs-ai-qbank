const fs = require('fs');
const path = require('path');

function generate() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'homepage.html'), 'utf8');
  return `// 由 scripts/build-homepage.js 从 homepage.html 生成，请勿直接修改。\nexport const HOMEPAGE_HTML = ${JSON.stringify(html)};\n`;
}

if (require.main === module) {
  const target = path.join(__dirname, '..', 'edge', 'homepage.mjs');
  fs.writeFileSync(target, generate());
  console.log(`已生成 ${target}`);
}

module.exports = { generate };
