'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const release = require('../scripts/check-release');
const head = 'a'.repeat(40);
const otherHead = 'b'.repeat(40);
const repository = 'mahmoud-sagharjoughi/js-persian';
const registryURL = 'https://registry.npmjs.org/';
const api = 'https://api.github.com/repos/' + repository;

function local() {
  return {
    pkg: { name: 'persian', version: '2.0.1', publishConfig: { tag: 'next', registry: registryURL } },
    lock: { name: 'persian', version: '2.0.1', packages: { '': { name: 'persian', version: '2.0.1' } } },
    changelog: '# Changes\n\n## 2.0.1\n\nA tested fix.\n',
    env: { npm_config_tag: 'next', npm_config_registry: registryURL, npm_config_user_agent: 'npm/11.13.0 node/v24.16.0 darwin arm64' },
  };
}

function metadata() {
  return {
    name: 'persian',
    'dist-tags': { latest: '1.0.1', next: '2.0.0' },
    versions: {
      '1.0.1': { version: '1.0.1' },
      '1.1.0': { version: '1.1.0', deprecated: 'Compatibility warning: replaceAll(map)' },
      '1.2.0': { version: '1.2.0', deprecated: 'Compatibility warning: replaceAll(map)' },
      '2.0.0': { version: '2.0.0' },
    },
  };
}

function run() {
  return { id: 123, head_sha: head, head_branch: 'master', event: 'push', path: '.github/workflows/ci.yml',
    head_repository: { full_name: repository }, status: 'completed', conclusion: 'success' };
}

function jobs() {
  const names = ['Build and verify package', 'TypeScript 2.6.2', 'TypeScript 7.0.2',
    'Browser / chromium', 'Browser / firefox', 'Browser / webkit',
    'Yarn 1.3.2 / classic / Node 8.9.1', 'Yarn 1.22.22 / classic / Node 24.16.0',
    'Yarn 4.18.1 / node-modules / Node 24.16.0', 'Yarn 4.18.1 / pnp / Node 24.16.0'];
  ['0.10.48', '0.12.18', '4.0.0', '4.8.6', '4.9.1', '6.0.0', '6.12.0', '6.17.1',
    '8.0.0', '8.9.1', '8.17.0', '9.2.0', '10.24.1', '12.22.12', '14.21.3', '16.20.2',
    '18.20.8', '20.19.5', '22.23.3', '24.16.0', '26.10.0'].forEach(function (node) {
    names.push('Node ' + node + ' / ubuntu-latest');
  });
  ['windows-latest', 'macos-latest'].forEach(function (platform) {
    ['22.23.3', '24.16.0', '26.10.0'].forEach(function (node) { names.push('Node ' + node + ' / ' + platform); });
  });
  return { total_count: names.length, jobs: names.map(function (name) {
    return { name: name, head_sha: head, status: 'completed', conclusion: 'success' };
  }) };
}

function validate(value) {
  release.validateLocal(value.pkg, value.lock, value.changelog, value.env);
}

test('accepts a stable next release with matching lock and changelog', function () {
  validate(local());
  const value = local();
  value.env.npm_config_registry = registryURL.slice(0, -1);
  value.changelog = value.changelog.replace(/\n/g, '\r\n');
  validate(value);
  delete value.env.npm_config_registry;
  value.changelog = '## 2.0.1 (2026-10-21)\r\n';
  validate(value);
});

const localFailures = [
  ['wrong package', v => { v.pkg.name = 'other'; }, /persian package/],
  ['legacy major', v => { v.pkg.version = '1.3.0'; }, /2.x line/],
  ['unreviewed major', v => { v.pkg.version = '3.0.0'; }, /2.x line/],
  ['prerelease', v => { v.pkg.version = '2.1.0-beta.1'; }, /stable numeric/],
  ['build metadata', v => { v.pkg.version = '2.0.1+build'; }, /stable numeric/],
  ['leading zero', v => { v.pkg.version = '2.01.0'; }, /stable numeric/],
  ['unsafe integer', v => { v.pkg.version = '2.9007199254740992.0'; }, /safe integers/],
  ['missing version', v => { delete v.pkg.version; }, /stable numeric/],
  ['version prefix', v => { v.pkg.version = 'v2.0.1'; }, /stable numeric/],
  ['missing publish config', v => { delete v.pkg.publishConfig; }, /publishConfig.tag/],
  ['latest publish config', v => { v.pkg.publishConfig.tag = 'latest'; }, /publishConfig.tag/],
  ['alternate publish registry', v => { v.pkg.publishConfig.registry = 'https://npm.pkg.github.com/'; }, /publishConfig.registry/],
  ['latest CLI tag', v => { v.env.npm_config_tag = 'latest'; }, /--tag=next/],
  ['missing CLI tag', v => { delete v.env.npm_config_tag; }, /--tag=next/],
  ['tag case', v => { v.env.npm_config_tag = 'Next'; }, /--tag=next/],
  ['HTTP registry', v => { v.env.npm_config_registry = 'http://registry.npmjs.org/'; }, /--registry/],
  ['alternate registry', v => { v.env.npm_config_registry = 'https://npm.pkg.github.com/'; }, /--registry/],
  ['missing pinned registry', v => { delete v.pkg.publishConfig.registry; }, /publishConfig.registry/],
  ['registry credentials', v => { v.env.npm_config_registry = 'https://user:secret@registry.npmjs.org/'; }, /--registry/],
  ['old npm', v => { v.env.npm_config_user_agent = 'npm/6.0.0'; }, /npm 11/],
  ['unverified npm', v => { v.env.npm_config_user_agent = 'npm/12.0.0'; }, /npm 11/],
  ['missing npm', v => { delete v.env.npm_config_user_agent; }, /npm 11/],
  ['lock version mismatch', v => { v.lock.version = '2.0.0'; }, /must agree/],
  ['lock root mismatch', v => { v.lock.packages[''].version = '2.0.0'; }, /must agree/],
  ['lock name mismatch', v => { v.lock.name = 'other'; }, /must agree/],
  ['missing lock root', v => { delete v.lock.packages['']; }, /must agree/],
  ['missing changelog entry', v => { v.changelog = '## 2.0.0\n'; }, /CHANGELOG/],
  ['changelog partial match', v => { v.changelog = '## 2.0.10\n'; }, /CHANGELOG/],
  ['runtime dependency', v => { v.pkg.dependencies = { example: '*' }; }, /Runtime dependencies/],
  ['optional dependency', v => { v.pkg.optionalDependencies = { example: '*' }; }, /Runtime dependencies/],
  ['peer dependency', v => { v.pkg.peerDependencies = { example: '*' }; }, /Runtime dependencies/],
  ['bundled dependency', v => { v.pkg.bundledDependencies = ['example']; }, /Runtime dependencies/],
];
localFailures.forEach(function ([name, change, message]) {
  test('blocks ' + name, function () { const value = local(); change(value); assert.throws(() => validate(value), message); });
});

test('accepts a new numeric version even past a two-digit minor', function () {
  const value = metadata(); value.versions['2.9.9'] = { version: '2.9.9' }; value['dist-tags'].next = '2.9.9';
  release.validateRegistry({ version: '2.10.0' }, value);
});

const registryFailures = [
  ['missing metadata', () => null, /Invalid npm/],
  ['wrong name', v => { v.name = 'other'; return v; }, /Invalid npm/],
  ['moved latest', v => { v['dist-tags'].latest = '2.0.0'; return v; }, /latest must/],
  ['missing protected version', v => { delete v.versions['1.1.0']; return v; }, /protected published/],
  ['missing warning', v => { delete v.versions['1.2.0'].deprecated; return v; }, /warning/],
  ['irrelevant warning', v => { v.versions['1.1.0'].deprecated = 'use something else'; return v; }, /warning/],
  ['deprecated latest', v => { v.versions['1.0.1'].deprecated = 'old'; return v; }, /latest version/],
  ['missing next', v => { delete v['dist-tags'].next; return v; }, /npm next/],
  ['unavailable next', v => { v['dist-tags'].next = '2.8.0'; return v; }, /npm next/],
  ['legacy next', v => { v['dist-tags'].next = '1.0.1'; return v; }, /npm next/],
  ['deprecated next', v => { v.versions['2.0.0'].deprecated = 'bad'; return v; }, /npm next/],
  ['duplicate version', v => { v.versions['2.0.1'] = { version: '2.0.1' }; return v; }, /already published/],
  ['downgrade', v => { v.versions['2.1.0'] = { version: '2.1.0' }; return v; }, /newer than every/],
  ['deprecated higher version', v => { v.versions['2.1.0'] = { version: '2.1.0', deprecated: 'old' }; return v; }, /newer than every/],
];
registryFailures.forEach(function ([name, change, message]) {
  test('blocks registry ' + name, function () { assert.throws(() => release.validateRegistry(local().pkg, change(metadata())), message); });
});

for (const [field, value] of [['head_sha', otherHead], ['head_branch', 'feature'], ['event', 'pull_request'],
  ['path', '.github/workflows/other.yml'], ['head_repository', { full_name: 'other/fork' }],
  ['status', 'in_progress'], ['conclusion', 'failure'], ['conclusion', 'cancelled'], ['id', '123']]) {
  test('blocks CI run with ' + field + '=' + JSON.stringify(value), function () {
    const valueRun = run(); valueRun[field] = value; assert.throws(() => release.validateRun(valueRun, head));
  });
}

test('accepts the complete successful CI matrix', function () { release.validateRun(run(), head); release.validateJobs(jobs(), head); });
for (const conclusion of ['skipped', 'failure', 'cancelled', 'neutral', 'timed_out', null]) {
  test('blocks a ' + conclusion + ' job despite successful workflow summary', function () {
    const value = jobs(); value.jobs[1].conclusion = conclusion; assert.throws(() => release.validateJobs(value, head), /Every compatibility/);
  });
}
for (const [name, change] of [
  ['pending job', v => { v.jobs[0].status = 'queued'; }],
  ['other commit', v => { v.jobs[0].head_sha = otherHead; }],
  ['partial page', v => { v.total_count = 101; }],
  ['reduced matrix', v => { v.jobs.pop(); v.total_count--; }],
  ['missing old Node coverage', v => { v.jobs[10].name = 'unrelated'; }],
  ['missing browser coverage', v => { v.jobs[3].name = 'unrelated'; }],
]) {
  test('blocks ' + name, function () { const value = jobs(); change(value); assert.throws(() => release.validateJobs(value, head)); });
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'persian-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const value = local();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(value.pkg));
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify(value.lock));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), value.changelog);
  const urls = [];
  return {
    root: root, env: value.env, urls: urls,
    git: args => args[0] === 'status' ? '' : head,
    getJSON: async function (url) {
      urls.push(url);
      if (url === registryURL + 'persian') return metadata();
      if (url === api + '/git/ref/heads/master') return { object: { sha: head } };
      if (url === api + '/actions/workflows/ci.yml/runs?head_sha=' + head + '&event=push&branch=master&per_page=1') return { workflow_runs: [run()] };
      if (url === api + '/actions/runs/123/jobs?filter=latest&per_page=100') return jobs();
      throw new Error('Unexpected URL');
    },
  };
}

test('complete release verification reads only public metadata and writes nothing', async function (t) {
  const options = fixture(t);
  const before = fs.readdirSync(options.root).map(name => [name, fs.readFileSync(path.join(options.root, name), 'utf8')]);
  assert.deepEqual(await release.checkRelease(options), { version: '2.0.1', head: head, jobs: 37 });
  assert.equal(options.urls.length, 4);
  assert.deepEqual(fs.readdirSync(options.root).map(name => [name, fs.readFileSync(path.join(options.root, name), 'utf8')]), before);
});

test('blocks dirty worktrees before any network request', async function (t) {
  const options = fixture(t); options.git = () => ' M package.json';
  await assert.rejects(release.checkRelease(options), /Commit all/); assert.deepEqual(options.urls, []);
});
test('blocks missing Git repository', async function (t) {
  const options = fixture(t); delete options.git;
  await assert.rejects(release.checkRelease(options)); assert.deepEqual(options.urls, []);
});
test('blocks unpublished local commit', async function (t) {
  const options = fixture(t); const get = options.getJSON;
  options.getJSON = url => url.includes('/git/ref/') ? { object: { sha: otherHead } } : get(url);
  await assert.rejects(release.checkRelease(options), /current pushed master/);
});
test('blocks missing CI rather than looking at an older commit', async function (t) {
  const options = fixture(t); const get = options.getJSON;
  options.getJSON = url => url.includes('/workflows/') ? { workflow_runs: [] } : get(url);
  await assert.rejects(release.checkRelease(options), /No master push CI/);
});
test('blocks network failure without falling back to cached success', async function (t) {
  const options = fixture(t); options.getJSON = async () => { throw new Error('Unavailable'); };
  await assert.rejects(release.checkRelease(options), /Unavailable/);
});
test('blocks changes made while the remote checks run', async function (t) {
  const options = fixture(t); let statusCalls = 0;
  options.git = args => args[0] === 'status' ? (++statusCalls === 1 ? '' : '?? new-file') : head;
  await assert.rejects(release.checkRelease(options), /checkout changed/);
});
test('blocks HEAD changing while remote checks run', async function (t) {
  const options = fixture(t); let headCalls = 0;
  options.git = args => args[0] === 'status' ? '' : (++headCalls === 1 ? head : otherHead);
  await assert.rejects(release.checkRelease(options), /checkout changed/);
});

test('HTTP reads have a deadline, reject redirects and never send credentials', async function (t) {
  t.mock.method(global, 'fetch', async function (url, options) {
    assert.equal(url, registryURL + 'persian');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(Object.keys(options.headers).sort(), ['Accept', 'Cache-Control', 'User-Agent']);
    return { ok: true, json: async () => metadata() };
  });
  assert.deepEqual(await release.requestJSON(registryURL + 'persian'), metadata());
});
for (const failure of ['http', 'json', 'timeout']) {
  test('fails closed on ' + failure + ' and redacts remote errors', async function (t) {
    t.mock.method(global, 'fetch', async function () {
      if (failure === 'timeout') throw new Error('private response');
      return { ok: failure !== 'http', status: 429, json: async () => { throw new Error('private response'); } };
    });
    await assert.rejects(release.requestJSON(registryURL + 'persian'), function (error) {
      assert.match(error.message, /Cannot verify public release metadata/);
      assert.ok(!error.message.includes('private response')); return true;
    });
  });
}

test('real Git inspection accepts a clean committed fixture', async function (t) {
  const options = fixture(t);
  const git = args => execFileSync('git', args, { cwd: options.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Release test', '-c', 'user.email=release-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Test fixture']);
  const actualHead = git(['rev-parse', 'HEAD']);
  const get = options.getJSON;
  options.getJSON = async url => JSON.parse(JSON.stringify(await get(url.replace(actualHead, head))).replaceAll(head, actualHead));
  delete options.git;
  assert.equal((await release.checkRelease(options)).head, actualHead);
  fs.writeFileSync(path.join(options.root, 'untracked.txt'), 'changed');
  await assert.rejects(release.checkRelease(options), /Commit all/);
});

for (const [tag, message] of [['latest', /Release blocked: Specify --tag=next/], ['next', /Release blocked: Commit all/]]) {
test('npm publish dry-run runs the full hook and blocks ' + tag + ' before tests or packing', function (t) {
  const options = fixture(t);
  fs.mkdirSync(path.join(options.root, 'scripts'));
  fs.copyFileSync(path.join(__dirname, '../scripts/check-release.js'), path.join(options.root, 'scripts/check-release.js'));
  const pkg = local().pkg;
  pkg.scripts = { ...require('../package.json').scripts, prepack: 'node -e "require(\'fs\').writeFileSync(\'packed\',\'yes\')"' };
  fs.writeFileSync(path.join(options.root, 'package.json'), JSON.stringify(pkg));
  fs.writeFileSync(path.join(options.root, 'npmrc'), '');
  execFileSync('git', ['init', '-q'], { cwd: options.root });
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'publish', '--dry-run', '--tag=' + tag, '--registry=' + registryURL], {
    cwd: options.root, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, npm_config_userconfig: path.join(options.root, 'npmrc'), npm_config_cache: path.join(options.root, 'cache'), npm_config_offline: 'true', npm_config_ignore_scripts: 'false' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, message);
  assert.ok(!(result.stdout + result.stderr).includes('> persian@2.0.1 lint'));
  assert.ok(!(result.stdout + result.stderr).includes('> persian@2.0.1 test'));
  assert.ok(!fs.existsSync(path.join(options.root, 'packed')));
});
}

test('npm lifecycle passes explicit next and registry to the guard', function (t) {
  const options = fixture(t);
  const pkg = local().pkg;
  pkg.scripts = { prepublishOnly: 'node verify.js' };
  fs.writeFileSync(path.join(options.root, 'package.json'), JSON.stringify(pkg));
  fs.writeFileSync(path.join(options.root, 'npmrc'), '');
  fs.writeFileSync(path.join(options.root, 'verify.js'), [
    "const release = require(" + JSON.stringify(path.resolve(__dirname, '../scripts/check-release')) + ");",
    "release.validateLocal(require('./package.json'), require('./package-lock.json'), require('fs').readFileSync('CHANGELOG.md', 'utf8'), process.env);",
  ].join('\n'));
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'prepublishOnly', '--tag=next', '--registry=' + registryURL], {
    cwd: options.root, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, npm_config_userconfig: path.join(options.root, 'npmrc'), npm_config_cache: path.join(options.root, 'cache') },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('repository release hook checks policy before lint and regressions', function () {
  const pkg = require('../package.json');
  assert.equal(pkg.scripts.prepublishOnly, 'npm run release:check && npm run lint && npm test');
  assert.equal(pkg.publishConfig.tag, 'next');
  assert.ok(!pkg.files.includes('scripts/check-release.js'));
  assert.match(fs.readFileSync(path.join(__dirname, '../.github/workflows/ci.yml'), 'utf8'), /- run: npm run test:release/);
});
