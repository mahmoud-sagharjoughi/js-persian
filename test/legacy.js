var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var before = Object.getOwnPropertyDescriptor(String.prototype, 'replaceAll');
var names = Object.getOwnPropertyNames(String.prototype);
var replaceFromMap = require('../legacy');
var runCases = require('./legacy-cases');
var count = runCases(replaceFromMap, assert);
var fixture = fs.readFileSync(path.join(__dirname, 'fixtures/legacy-1.0.1.js'), 'utf8');
var originalContext = vm.createContext({});
vm.runInContext(fixture, originalContext);
var original = vm.runInContext('String.prototype.replaceAll', originalContext);
assert.strictEqual(runCases(function (text, map) { return original.call(text, map); }, assert), count);
assert.deepEqual(Object.getOwnPropertyNames(String.prototype), names);
assert.deepEqual(Object.getOwnPropertyDescriptor(String.prototype, 'replaceAll'), before);
var source = fs.readFileSync(require.resolve('../legacy'), 'utf8');
['native', 'absent', 'locked', 'getter', 'frozen'].forEach(function (mode) {
  var context = vm.createContext({ module: { exports: {} } });
  if (mode === 'absent') vm.runInContext('delete String.prototype.replaceAll;', context);
  if (mode === 'locked') vm.runInContext('Object.defineProperty(String.prototype, "replaceAll", {value: function () { return "sentinel"; }, writable: false, configurable: false});', context);
  if (mode === 'getter') vm.runInContext('Object.defineProperty(String.prototype, "replaceAll", {get: function () { throw new Error("Native property read"); }, configurable: false});', context);
  if (mode === 'frozen') vm.runInContext('Object.freeze(String.prototype);', context);
  var descriptor = vm.runInContext('Object.getOwnPropertyDescriptor(String.prototype, "replaceAll")', context);
  var properties = vm.runInContext('Object.getOwnPropertyNames(String.prototype)', context);
  vm.runInContext(source, context);
  assert.strictEqual(context.module.exports('12', { '1': 'x' }), 'x2');
  vm.runInContext(source, context);
  assert.strictEqual(context.module.exports('12', { '1': 'x' }), 'x2');
  assert.deepEqual(vm.runInContext('Object.getOwnPropertyNames(String.prototype)', context), properties);
  assert.deepEqual(vm.runInContext('Object.getOwnPropertyDescriptor(String.prototype, "replaceAll")', context), descriptor);
});
if (before && typeof before.value === 'function') {
  assert.strictEqual('12'.replaceAll({ '1': 'x' }), '12');
  assert.strictEqual('aba'.replaceAll('a', 'x'), 'xbx');
  assert.strictEqual('aba'.replaceAll(/a/g, 'x'), 'xbx');
  assert.strictEqual('aba'.replaceAll('a', function (match, offset) { return offset; }), '0b2');
  assert.strictEqual('ab'.replaceAll('', '-'), '-a-b-');
  assert.strictEqual('a'.replaceAll('a', '$&$&'), 'aa');
  assert.throws(function () { 'aba'.replaceAll(/a/, 'x'); }, TypeError);
  if (typeof Symbol === 'function' && Symbol.replace) {
    var search = {};
    search[Symbol.replace] = function (text, replacement) { return text + replacement; };
    assert.strictEqual('a'.replaceAll(search, 'b'), 'ab');
  }
}
console.log('Legacy mapping: ' + count + ' cases passed for both the helper and original 1.0.1; native isolation passed.');
