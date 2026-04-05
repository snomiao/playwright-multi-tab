// Patch the built extension authToken.js to return a fixed token.
// This lets PLAYWRIGHT_MCP_EXTENSION_TOKEN=DEMO_FIXED_TOKEN_FOR_RECORDING
// skip the approval dialog entirely.
const fs = require('fs');
const path = require('path');

const FIXED_TOKEN = 'DEMO_FIXED_TOKEN_FOR_RECORDING';
const EXT_DIR = process.env.EXT_DIR || '/ext/dist';
const file = path.join(EXT_DIR, 'lib', 'ui', 'authToken.js');

let src = fs.readFileSync(file, 'utf8');

const original =
`const getOrCreateAuthToken = () => {
  let token = localStorage.getItem("auth-token");
  if (!token) {
    token = generateAuthToken();
    localStorage.setItem("auth-token", token);
  }
  return token;
};`;

const replacement =
`const getOrCreateAuthToken = () => {
  const token = "${FIXED_TOKEN}";
  localStorage.setItem("auth-token", token);
  return token;
};`;

if (!src.includes(original)) {
  console.error('ERROR: Could not find getOrCreateAuthToken body to patch.');
  process.exit(1);
}

src = src.replace(original, replacement);
fs.writeFileSync(file, src);
console.log('Patched authToken.js: getOrCreateAuthToken returns fixed token:', FIXED_TOKEN);
