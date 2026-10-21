var assert = require('assert');
var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var cli = path.resolve(process.argv[2]);
var consumer = path.resolve(process.argv[3]);
var mode = process.argv[4];
assert.ok(process.argv.length === 5 && ['classic', 'node-modules', 'pnp'].indexOf(mode) !== -1,
  'Usage: node test/yarn.js <yarn-cli> <fresh-prepared-consumer> <classic|node-modules|pnp>');
assert.ok(fs.existsSync(path.join(consumer, 'persian.tgz')));
assert.strictEqual(fs.existsSync(path.join(consumer, 'yarn.lock')), false);
assert.strictEqual(fs.existsSync(path.join(consumer, 'node_modules')), false);
var env = {};
Object.keys(process.env).forEach(function (key) { env[key] = process.env[key]; });
env.PATH = path.dirname(process.execPath) + path.delimiter + env.PATH;
env.YARN_IGNORE_PATH = '1';
env.YARN_GLOBAL_FOLDER = path.join(consumer, 'global');
env.YARN_CACHE_FOLDER = path.join(consumer, 'cache');
env.npm_config_userconfig = path.join(consumer, 'npmrc');
function yarn(args) {
  execFileSync(process.execPath, [cli].concat(args), { cwd: consumer, env: env, stdio: 'inherit' });
}
var version = execFileSync(process.execPath, [cli, '--version'], {
  cwd: consumer, env: env, encoding: 'utf8',
}).trim();
console.log('Yarn ' + version);
var lockfile;
if (mode === 'classic') {
  var flags = ['--offline', '--non-interactive', '--no-progress',
    '--registry', 'http://127.0.0.1:9', '--cache-folder', path.join(consumer, 'cache')];
  if (version === '1.22.22') flags.push('--no-default-rc');
  yarn(['add', 'file:persian.tgz'].concat(flags));
  lockfile = fs.readFileSync(path.join(consumer, 'yarn.lock'), 'utf8');
  yarn(['install', '--frozen-lockfile'].concat(flags));
} else {
  fs.writeFileSync(path.join(consumer, '.yarnrc.yml'), [
    'nodeLinker: ' + mode,
    'enableNetwork: false',
    'enableScripts: true',
    'enableTelemetry: false',
    'enableGlobalCache: false',
    'pnpEnableEsmLoader: true',
    'npmRegistryServer: "http://127.0.0.1:9"',
  ].join('\n') + '\n');
  yarn(['add', 'persian@file:./persian.tgz']);
  lockfile = fs.readFileSync(path.join(consumer, 'yarn.lock'), 'utf8');
  yarn(['install', '--immutable', '--immutable-cache']);
}
assert.strictEqual(fs.readFileSync(path.join(consumer, 'yarn.lock'), 'utf8'), lockfile);
function consumerNode(args) {
  if (mode === 'pnp') yarn(['node'].concat(args));
  else execFileSync(process.execPath, args, { cwd: consumer, env: env, stdio: 'inherit' });
}
consumerNode(['installed.js', mode]);
consumerNode(['test.js']);
consumerNode(['legacy-test.js']);
consumerNode(['standalone.js', consumer]);
if (Number(process.versions.node.split('.')[0]) >= 12) consumerNode(['test.mjs']);
console.log('Yarn ' + mode + ': archive installation, lockfile and consumer tests passed.');
