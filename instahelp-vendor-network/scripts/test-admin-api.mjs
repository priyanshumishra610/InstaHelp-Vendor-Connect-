/**
 * Local smoke test for admin API + google.script.run shim (no browser).
 * Run: node scripts/test-admin-api.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadShim() {
  const configSrc = readFileSync(join(root, 'js/config.js'), 'utf8');
  const apiSrc = readFileSync(join(root, 'js/api.js'), 'utf8');
  const sandbox = { window: {}, fetch, URLSearchParams, console };
  vm.runInNewContext(configSrc + '\n' + apiSrc, sandbox);
  return sandbox.window.google.script.run;
}

function call(run, method, args, handler) {
  return new Promise((resolve) => {
    run.withSuccessHandler((res) => {
      handler(res);
      resolve(res);
    })[method](...args);
  });
}

async function main() {
  const run = loadShim();
  const pwd = "we'll-get-it-done";

  const login = await call(run, 'loginAdmin', [pwd], () => {});
  if (!login.success) {
    console.error('FAIL login:', login);
    process.exit(1);
  }
  console.log('OK login, token length', login.token.length);

  const token = login.token;
  const results = await Promise.all([
    call(run, 'getAdminStats', [token], () => {}),
    call(run, 'getAllApplications', [token], () => {}),
    call(run, 'getAllVendors', [token], () => {})
  ]);

  const [stats, apps, vendors] = results;
  const ok =
    stats.success &&
    apps.success &&
    vendors.success &&
    Array.isArray(apps.applications) &&
    apps.applications.length > 0 &&
    Array.isArray(vendors.vendors) &&
    vendors.vendors.length > 0;

  console.log('stats.pendingApprovals', stats.stats?.pendingApprovals);
  console.log('applications', apps.applications?.length, apps.applications?.map((a) => a.BusinessName));
  console.log('vendors', vendors.vendors?.length, vendors.vendors?.map((v) => v.BusinessName));

  if (!ok) {
    console.error('FAIL concurrent admin load');
    process.exit(1);
  }
  console.log('PASS admin API smoke test');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
