/**
 * Injects INSTAHELP_API_URL from Vercel env into js/config.js at build time.
 * Skips silently when the env var is not set (local dev uses the default URL).
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.INSTAHELP_API_URL;
const configPath = path.join(__dirname, '..', 'js', 'config.js');

if (!apiUrl) {
  console.log('INSTAHELP_API_URL not set — using default apiUrl in js/config.js');
  process.exit(0);
}

let content = fs.readFileSync(configPath, 'utf8');
const escaped = apiUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const updated = content.replace(/apiUrl:\s*'[^']*'/, "apiUrl: '" + escaped + "'");

if (updated === content) {
  console.warn('Could not patch apiUrl in js/config.js');
  process.exit(1);
}

fs.writeFileSync(configPath, updated);
console.log('Patched js/config.js with INSTAHELP_API_URL');
