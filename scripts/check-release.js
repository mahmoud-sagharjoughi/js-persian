'use strict';

// Maintainer tooling only; this file is not shipped in the npm package.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repository = 'mahmoud-sagharjoughi/js-persian';
const registry = 'https://registry.npmjs.org/';
const api = 'https://api.github.com/repos/' + repository;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function versionParts(version) {
  ensure(typeof version === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version),
    'Only stable numeric versions are allowed; prereleases and other release lines need a policy review.');
  const parts = version.split('.').map(Number);
  ensure(parts.every(Number.isSafeInteger), 'Version components must be safe integers.');
  return parts;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function validateLocal(pkg, lock, changelog, env) {
  ensure(pkg.name === 'persian', 'Expected the persian package.');
  ensure(versionParts(pkg.version)[0] === 2, 'Only the 2.x line may publish to next; 1.x and new majors need a policy review.');
  ensure(pkg.publishConfig && pkg.publishConfig.tag === 'next', 'publishConfig.tag must remain next.');
  ensure(pkg.publishConfig.registry === registry,
    'publishConfig.registry must be the public npm registry.');
  ensure(env.npm_config_tag === 'next', 'Specify --tag=next explicitly; publishing to latest or an implicit tag is blocked.');
  // npm 11 omits environment values equal to its defaults, even with an explicit flag.
  // The manifest pins the public registry; any non-default CLI override must agree.
  ensure(env.npm_config_registry === undefined || env.npm_config_registry === registry || env.npm_config_registry === registry.slice(0, -1),
    'Use --registry=https://registry.npmjs.org/; other registry overrides are blocked.');
  ensure(/^npm\/11\./.test(env.npm_config_user_agent || ''), 'Use npm 11 for the verified release lifecycle.');
  ensure(lock.name === pkg.name && lock.version === pkg.version && lock.packages &&
    lock.packages[''] && lock.packages[''].version === pkg.version && lock.packages[''].name === pkg.name,
  'package.json and package-lock.json must agree on name and version.');
  const escaped = pkg.version.replace(/\./g, '\\.');
  ensure(new RegExp('^## ' + escaped + '(?: \\(\\d{4}-\\d{2}-\\d{2}\\))?\\r?$', 'm').test(changelog), 'Add a CHANGELOG.md section for this exact version.');
  ['dependencies', 'optionalDependencies', 'peerDependencies', 'bundledDependencies', 'bundleDependencies'].forEach(function (field) {
    ensure(!pkg[field] || Object.keys(pkg[field]).length === 0, 'Runtime dependencies require a compatibility review.');
  });
}

function validateRegistry(pkg, metadata) {
  ensure(metadata && metadata.name === 'persian' && metadata.versions && metadata['dist-tags'], 'Invalid npm registry metadata.');
  const versions = metadata.versions;
  const tags = metadata['dist-tags'];
  ensure(tags.latest === '1.0.1', 'npm latest must still point to 1.0.1; investigate without moving tags automatically.');
  ['1.0.1', '1.1.0', '1.2.0', '2.0.0'].forEach(function (version) {
    ensure(versions[version] && versions[version].version === version, 'A protected published version is missing: ' + version);
  });
  ['1.1.0', '1.2.0'].forEach(function (version) {
    ensure(typeof versions[version].deprecated === 'string' && versions[version].deprecated.includes('replaceAll'),
      'The compatibility warning is missing for ' + version + '.');
  });
  ensure(!versions['1.0.1'].deprecated, 'The protected latest version must not be deprecated.');
  ensure(tags.next && versions[tags.next] && versionParts(tags.next)[0] === 2 && !versions[tags.next].deprecated,
    'npm next must reference an available, non-deprecated stable 2.x version.');
  ensure(!Object.prototype.hasOwnProperty.call(versions, pkg.version), 'This version is already published; do not republish or overwrite it.');
  Object.keys(versions).filter(function (version) {
    return /^2\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version);
  }).forEach(function (version) {
    ensure(compareVersions(pkg.version, version) > 0, 'The release must be newer than every published stable 2.x version, including deprecated ones.');
  });
}

function validateRun(run, head) {
  ensure(run && run.head_sha === head && run.head_branch === 'master' && run.event === 'push' &&
    run.path === '.github/workflows/ci.yml' && run.head_repository && run.head_repository.full_name === repository,
  'Expected the master push CI run for this exact commit.');
  ensure(run.status === 'completed' && run.conclusion === 'success', 'The newest CI run for this commit must finish successfully.');
  ensure(Number.isSafeInteger(run.id) && run.id > 0, 'Invalid CI run ID.');
}

function validateJobs(result, head) {
  ensure(result && Array.isArray(result.jobs) && result.total_count === result.jobs.length && result.total_count >= 37,
    'Expected the complete compatibility matrix (at least 37 jobs); matrix changes need a policy review.');
  ensure(result.jobs.every(function (job) {
    return job.head_sha === head && job.status === 'completed' && job.conclusion === 'success';
  }), 'Every compatibility job must pass; skipped, pending or failed jobs block publication.');
  const names = result.jobs.map(function (job) { return job.name; });
  ['Build and verify package', 'Node 0.10.48 / ubuntu-latest', 'Node 26.10.0 / ubuntu-latest',
    'TypeScript 2.6.2', 'TypeScript 7.0.2', 'Browser / chromium', 'Browser / firefox', 'Browser / webkit',
    'Yarn 1.3.2 / classic / Node 8.9.1', 'Yarn 1.22.22 / classic / Node 24.16.0',
    'Yarn 4.18.1 / node-modules / Node 24.16.0', 'Yarn 4.18.1 / pnp / Node 24.16.0'].forEach(function (name) {
    ensure(names.includes(name), 'A required compatibility job is missing: ' + name);
  });
}

async function requestJSON(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'persian-release-check', 'Cache-Control': 'no-cache', Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    ensure(response.ok, 'HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    // Never echo response bodies, credentials or local npm configuration.
    throw new Error('Cannot verify public release metadata from ' + new URL(url).hostname + '; retry after checking connectivity and rate limits.');
  }
}

async function checkRelease(options = {}) {
  const root = options.root || path.resolve(__dirname, '..');
  const env = options.env || process.env;
  const getJSON = options.getJSON || requestJSON;
  const git = options.git || function (args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  };
  const read = function (file) { return fs.readFileSync(path.join(root, file), 'utf8'); };
  const pkg = JSON.parse(read('package.json'));
  validateLocal(pkg, JSON.parse(read('package-lock.json')), read('CHANGELOG.md'), env);
  ensure(git(['status', '--porcelain', '--untracked-files=all']) === '', 'Commit all tracked and untracked changes before releasing.');
  const head = git(['rev-parse', 'HEAD']);
  ensure(/^[a-f0-9]{40}$/.test(head), 'Expected a valid Git commit.');
  const metadata = await getJSON(registry + 'persian');
  validateRegistry(pkg, metadata);
  const remote = await getJSON(api + '/git/ref/heads/master');
  ensure(remote && remote.object && remote.object.sha === head, 'Release only the current pushed master commit.');
  const runs = await getJSON(api + '/actions/workflows/ci.yml/runs?head_sha=' + head + '&event=push&branch=master&per_page=1');
  ensure(runs && Array.isArray(runs.workflow_runs) && runs.workflow_runs.length === 1, 'No master push CI run exists for this commit.');
  const run = runs.workflow_runs[0];
  validateRun(run, head);
  const jobs = await getJSON(api + '/actions/runs/' + run.id + '/jobs?filter=latest&per_page=100');
  validateJobs(jobs, head);
  ensure(git(['rev-parse', 'HEAD']) === head && git(['status', '--porcelain', '--untracked-files=all']) === '',
    'The checkout changed during verification; start again.');
  return { version: pkg.version, head: head, jobs: jobs.total_count };
}

module.exports = { checkRelease, validateLocal, validateRegistry, validateRun, validateJobs, requestJSON };

if (require.main === module) {
  checkRelease().then(function (result) {
    console.log('Release check passed: persian@' + result.version + ' -> next; ' + result.jobs + ' CI jobs passed for ' + result.head + '.');
    console.log('No package or dist-tag was changed.');
  }).catch(function (error) {
    console.error('Release blocked: ' + error.message);
    process.exitCode = 1;
  });
}
