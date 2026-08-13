const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const args = process.argv.slice(2);
let content = `export const version = '\${pkg.version}';\n`;

if (args[0] === 'write') {
  content = `export const version = '${pkg.version}';\n`;
}
fs.writeFileSync(path.join(__dirname, './src/version.ts'), content);
