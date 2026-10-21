var assert = require('assert');
var path = require('path');
var fs = require('fs');
var spawnSync = require('child_process').spawnSync;

var compiler = path.resolve(process.argv[2]);
var consumer = path.resolve(process.argv[3]);
var modern = process.argv[4] === 'modern';
var flags = ['--strict', '--noEmit', '--target', modern ? 'es2015' : 'es5',
  '--module', modern ? 'node16' : 'commonjs', '--moduleResolution', modern ? 'node16' : 'node'];
function compile(file) {
  var scriptFlags = modern && file.indexOf('types-browser') === 0 ? ['--moduleDetection', 'legacy'] : [];
  var result = spawnSync(process.execPath, [compiler].concat(flags, scriptFlags, [file]), { cwd: consumer, encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.strictEqual(result.signal, null);
  return result;
}
var valid = compile('types-valid.ts');
assert.strictEqual(valid.status, 0, valid.stdout + valid.stderr);
var legacy = compile('types-legacy-valid.ts');
assert.strictEqual(legacy.status, 0, legacy.stdout + legacy.stderr);
var browser = compile('types-browser.ts');
assert.strictEqual(browser.status, 0, browser.stdout + browser.stderr);
['types-invalid.ts', 'types-browser-invalid.ts', 'types-legacy-invalid.ts'].forEach(function (file) {
  var invalid = compile(file);
  assert.notStrictEqual(invalid.status, 0, invalid.stdout + invalid.stderr);
  var errors = invalid.stdout.match(/error TS[0-9]+:/g) || [];
  var invalidLines = fs.readFileSync(path.join(consumer, file), 'utf8').split(/\r?\n/);
  var expectedLines = [];
  invalidLines.forEach(function (line, index) {
    if (line.trim() && line.indexOf('import ') !== 0 && line.indexOf('/// ') !== 0) {
      expectedLines.push(index + 1);
    }
  });
  assert.strictEqual(errors.length, expectedLines.length, invalid.stdout + invalid.stderr);
  expectedLines.forEach(function (line) {
    assert.ok(invalid.stdout.indexOf(file + '(' + line + ',') !== -1, invalid.stdout);
  });
});
console.log('TypeScript valid inputs accepted and invalid inputs rejected.');
