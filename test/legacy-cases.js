module.exports = function runLegacyCases(replaceFromMap, assert) {
  var count = 0;
  function equal(actual, expected) {
    assert.strictEqual(actual, expected);
    count += 1;
  }
  function rejects(action, name) {
    assert.throws(action, function (error) { return error.name === name; });
    count += 1;
  }
  equal(replaceFromMap('12', { '1': 'x' }), 'x2');
  equal(replaceFromMap('', { a: 'x' }), '');
  equal(replaceFromMap('aba', { a: 'b', b: 'c' }), 'bcb');
  equal(replaceFromMap('a', { a: '$&$1$$' }), '$&$1$$');
  equal(replaceFromMap('A a', { a: 'x' }), 'undefined x');
  equal(replaceFromMap('A a', { a: 'x', A: 'y' }), 'y x');
  equal(replaceFromMap('ab', { a: 'x', ab: 'y' }), 'xb');
  equal(replaceFromMap('ab', { ab: 'y', a: 'x' }), 'y');
  equal(replaceFromMap('a.', { '.': 'x' }), 'undefinedx');
  equal(replaceFromMap('aaa', { 'a+': 'x' }), 'undefined');
  equal(replaceFromMap('a', { '(a)': 'x' }), 'undefined');
  equal(replaceFromMap('a', { '^': 'x' }), 'undefineda');
  equal(replaceFromMap('a', {}), 'undefinedaundefined');
  equal(replaceFromMap('', {}), 'undefined');
  equal(replaceFromMap('ab', { '': '-' }), '-a-b-');
  equal(replaceFromMap('🌍', { '': '-' }), '-\ud83c-\udf0d-');
  equal(replaceFromMap('ی\u200cک\n🌍', { 'ی': 'ي', '🌍': 'earth' }), 'ي\u200cک\nearth');
  equal(replaceFromMap(new String('aba'), { a: 'x' }), 'xbx');
  equal(replaceFromMap('abcde', { a: 0, b: false, c: null, d: undefined, e: '' }), '0falsenullundefined');
  var replacement = function () { throw new Error('Replacement value was called'); };
  equal(replaceFromMap('a', { a: replacement }), String(replacement));
  equal(replaceFromMap('a', { a: { toString: function () { return 'value'; } } }), 'value');
  var sentinel = new Error('sentinel');
  assert.throws(function () {
    replaceFromMap('a', { a: { toString: function () { throw sentinel; } } });
  }, function (error) { return error === sentinel; });
  count += 1;
  var map = Object.create({ A: 'inherited' });
  map.a = 'own';
  Object.defineProperty(map, 'b', { value: 'hidden' });
  equal(replaceFromMap('Aab', map), 'inheritedownb');
  var reads = 0;
  Object.defineProperty(map, 'x', { enumerable: true, get: function () { reads += 1; return reads; } });
  equal(replaceFromMap('xx', map), '12');
  equal(reads, 2);
  Object.defineProperty(map, 'z', { enumerable: true, get: function () { throw sentinel; } });
  equal(replaceFromMap('not matched', { z: 'ok' }), 'not matched');
  equal(replaceFromMap('q', map), 'q');
  assert.throws(function () { replaceFromMap('z', map); }, function (error) { return error === sentinel; });
  count += 1;
  var bare = Object.create(null);
  Object.defineProperty(bare, '__proto__', { value: 'safe', enumerable: true });
  bare.constructor = 'ctor';
  equal(replaceFromMap('__proto__ constructor', bare), 'safe ctor');
  equal(Object.prototype.safe, undefined);
  var frozen = Object.freeze({ a: 'x' });
  equal(replaceFromMap('aba', frozen), 'xbx');
  equal(frozen.a, 'x');
  var escaped = { '\\.': 'unused' };
  Object.defineProperty(escaped, '.', { value: 'dot' });
  equal(replaceFromMap('a.b', escaped), 'adotb');
  [null, undefined].forEach(function (value) {
    rejects(function () { replaceFromMap('a', value); }, 'TypeError');
  });
  [null, undefined, 123, true, {}].forEach(function (value) {
    rejects(function () { replaceFromMap(value, { a: 'x' }); }, 'TypeError');
  });
  rejects(function () { replaceFromMap('a', { '[': 'x' }); }, 'SyntaxError');
  if (typeof Symbol === 'function') {
    var symbolic = { a: 'x' };
    symbolic[Symbol('key')] = 'ignored';
    if (Symbol.replace) symbolic[Symbol.replace] = function () { throw new Error('Symbol.replace called'); };
    equal(replaceFromMap('aba', symbolic), 'xbx');
    rejects(function () { replaceFromMap('a', { a: Symbol('value') }); }, 'TypeError');
  }
  if (typeof Proxy === 'function') {
    var events = [];
    var proxy = new Proxy({ a: 'x' }, {
      ownKeys: function () { events.push('keys'); return ['a']; },
      getOwnPropertyDescriptor: function () { events.push('descriptor'); return { enumerable: true, configurable: true }; },
      get: function (target, key) { events.push('get:' + key); return target[key]; },
    });
    equal(replaceFromMap('aa', proxy), 'xx');
    equal(events.join(','), 'keys,descriptor,get:a,get:a');
  }
  var seed = 1749;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; }
  var alphabet = 'abAB12یک .\n\u200c\ud83c\udf0d';
  var generatedMap = { a: '$&', b: 'xy', '1': 0, '2': false, 'ی': 'ي' };
  for (var index = 0; index < 5000; index += 1) {
    var text = '';
    var expected = '';
    var length = random() % 70;
    for (var position = 0; position < length; position += 1) {
      var character = alphabet.charAt(random() % alphabet.length);
      text += character;
      expected += 'abAB12ی'.indexOf(character) === -1 ? character : String(generatedMap[character]);
    }
    equal(replaceFromMap(text, generatedMap), expected);
  }
  return count;
};
