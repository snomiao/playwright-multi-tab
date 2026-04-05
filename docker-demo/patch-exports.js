const fs = require('fs');
const pkgPath = './node_modules/playwright-core/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.exports['./lib/tools/cli-client/cli'] = './lib/tools/cli-client/cli.js';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('Patched playwright-core exports: added ./lib/tools/cli-client/cli');
