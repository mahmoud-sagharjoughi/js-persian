var assert = require('assert');
var fs = require('fs');
var path = require('path');

var expected = require('./expected-package.json');
var metadata = require('persian/package.json');
assert.strictEqual(metadata.name, expected.name);
assert.strictEqual(metadata.version, expected.version);
assert.strictEqual(metadata.main, expected.main);
assert.strictEqual(metadata.types, expected.types);
assert.deepEqual(Object.keys(metadata.dependencies || {}), []);
assert.deepEqual(Object.keys(metadata.optionalDependencies || {}), []);
assert.deepEqual(Object.keys(metadata.peerDependencies || {}), []);
var mode = process.argv[2] || 'npm';
assert.ok(['npm', 'classic', 'node-modules', 'pnp'].indexOf(mode) !== -1);
var target = path.dirname(require.resolve('persian/package.json'));
if (mode === 'pnp') {
  assert.ok(process.versions.pnp, 'Expected an active PnP loader');
  assert.strictEqual(fs.existsSync(path.join(__dirname, 'node_modules')), false);
  var pnp = require('pnpapi');
  var locator = pnp.findPackageLocator(target + path.sep);
  assert.strictEqual(locator.name, 'persian');
  var dependencies = [];
  pnp.getPackageInformation(locator).packageDependencies.forEach(function (reference, name) {
    if (name !== 'persian') dependencies.push(name);
  });
  assert.deepEqual(dependencies, []);
} else {
  var modules = fs.readdirSync(path.join(__dirname, 'node_modules')).filter(function (entry) {
    return entry.charAt(0) !== '.';
  });
  assert.deepEqual(modules.sort(), ['persian']);
  assert.strictEqual(target, path.join(__dirname, 'node_modules', 'persian'));
}
assert.strictEqual(fs.lstatSync(target).isSymbolicLink(), false);
assert.deepEqual(fs.readdirSync(target).sort(), [
  'CHANGELOG.md', 'LICENSE', 'README.md', 'dist', 'index.d.ts', 'legacy.d.ts', 'legacy.js', 'package.json',
]);
assert.strictEqual(require.resolve('persian/legacy'), path.join(target, 'legacy.js'));
assert.strictEqual(require('persian/legacy')('12', { '1': 'x' }), 'x2');
assert.ok(fs.statSync(path.join(target, 'legacy.d.ts')).isFile());
assert.strictEqual(require.resolve('persian'), path.join(target, 'dist', 'persian.js'));
assert.ok(fs.statSync(path.join(target, metadata.types)).isFile());
assert.deepEqual(fs.readdirSync(path.join(target, 'dist')).sort(), ['persian.browser.js', 'persian.js']);
assert.strictEqual(require('./package.json').dependencies.persian,
  mode === 'node-modules' || mode === 'pnp' ? 'file:./persian.tgz' : 'file:persian.tgz');
console.log(mode + ' installation verified: ' + metadata.name + '@' + metadata.version);
