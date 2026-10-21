import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, build, preview } from 'vite';
import { chromium, firefox, webkit } from 'playwright';
import { verifyStandalone } from './standalone.mjs';

const consumer = path.resolve(process.argv[2] || '');
const name = process.argv[3] || 'chromium';
assert.ok(process.argv[2] && process.argv.length <= 4, 'Usage: npm run test:browser -- <installed-consumer> [chromium|firefox|webkit]');
const engine = { chromium, firefox, webkit }[name];
assert.ok(engine, 'Unsupported browser: ' + name);
assert.ok((await stat(path.join(consumer, 'node_modules/persian/dist/persian.js'))).isFile());
const fixtures = path.dirname(fileURLToPath(import.meta.url));
for (const file of ['index.html', 'main.js']) {
  await copyFile(path.join(fixtures, file), path.join(consumer, file));
}
const legacyCases = await readFile(path.join(fixtures, '../legacy-cases.js'), 'utf8');
await writeFile(path.join(consumer, 'legacy-cases.mjs'), legacyCases.replace('module.exports =', 'export default'));
const config = { root: consumer, configFile: false };
const originalNodeEnv = process.env.NODE_ENV;
let browser;
let dev;
let production;
async function verify(server, mode) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure().errorText));
  try {
    const port = server.httpServer.address().port;
    const response = await page.goto('http://127.0.0.1:' + port);
    assert.equal(response.status(), 200);
    await page.locator('#result[data-status="passed"], #result[data-status="failed"]').waitFor({ timeout: 30000 });
    const result = page.locator('#result');
    assert.equal(await result.getAttribute('data-status'), 'passed', await result.textContent());
    assert.ok(Number(await result.getAttribute('data-checks')) >= 40);
    assert.deepEqual(errors, []);
    console.log(name + ' / ' + mode + ': ' + await result.textContent());
  } catch (error) {
    throw new Error(name + ' / ' + mode + ': ' + (errors.join('\n') || error.message), { cause: error });
  } finally {
    await page.close();
  }
}
try {
  browser = await engine.launch();
  console.log(name + ' version: ' + browser.version());
  await verifyStandalone(browser, consumer, fixtures, name);
  process.env.NODE_ENV = 'development';
  dev = await createServer({ ...config, server: { host: '127.0.0.1', port: 0, hmr: false } });
  await dev.listen();
  await verify(dev, 'development');
  await dev.close();
  dev = undefined;
  process.env.NODE_ENV = 'production';
  await build(config);
  production = await preview({ ...config, preview: { host: '127.0.0.1', port: 0 } });
  await verify(production, 'production');
} finally {
  await Promise.all([
    production && new Promise((resolve, reject) => production.httpServer.close(error => error ? reject(error) : resolve())),
    dev && dev.close(),
    browser && browser.close(),
  ]);
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
