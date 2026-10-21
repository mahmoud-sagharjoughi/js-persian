var assert = require('assert');
var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var archiveDirectory = path.resolve(process.argv[2]);
var consumer = path.resolve(process.argv[3]);
var archives = fs.readdirSync(archiveDirectory).filter(function (file) {
  return /^persian-.*\.tgz$/.test(file);
});
assert.strictEqual(archives.length, 1, 'Expected one npm package');
var archive = fs.readFileSync(path.join(archiveDirectory, archives[0]));
var expectedFiles = ['CHANGELOG.md', 'LICENSE', 'README.md', 'dist/persian.js', 'dist/persian.browser.js', 'index.d.ts', 'legacy.d.ts', 'legacy.js', 'package.json'];
var entries = execFileSync('tar', ['-tzf', '-'], { input: archive, encoding: 'utf8' }).trim().split(/\r?\n/);
assert.deepEqual(entries.sort(), expectedFiles.map(function (file) { return 'package/' + file; }).sort());

var prepareInstall = process.argv[4] === '--prepare-install';
var target = path.join(consumer, 'node_modules', 'persian');
assert.ok(!fs.existsSync(consumer), 'Expected a fresh consumer directory');
fs.mkdirSync(consumer, { recursive: true });
var metadata = JSON.parse(execFileSync('tar', ['-xOzf', '-', 'package/package.json'], {
  input: archive, encoding: 'utf8',
}));
if (prepareInstall) {
  fs.writeFileSync(path.join(consumer, 'persian.tgz'), archive);
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({
    name: 'persian-install-test', version: '1.0.0', private: true,
  }, null, 2) + '\n');
  fs.copyFileSync(path.join(__dirname, 'installed.js'), path.join(consumer, 'installed.js'));
  fs.writeFileSync(path.join(consumer, 'expected-package.json'), JSON.stringify(metadata));
} else {
  fs.mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-xzf', '-', '--strip-components=1'], { input: archive, cwd: target });
}
assert.strictEqual(metadata.name, 'persian');
assert.strictEqual(metadata.version, require('../package.json').version);
assert.strictEqual(metadata.publishConfig.tag, 'next', 'The opt-in release must default to next');
assert.strictEqual(metadata.main, 'dist/persian.js');
assert.strictEqual(metadata.types, 'index.d.ts');
assert.deepEqual(metadata.files, ['dist/persian.js', 'dist/persian.browser.js', 'index.d.ts', 'legacy.js', 'legacy.d.ts', 'CHANGELOG.md']);
assert.deepEqual(Object.keys(metadata.dependencies || {}), []);

var benchmark = fs.readFileSync(path.join(__dirname, '../benchmark/to-persian.js'), 'utf8');
if (process.argv[4] === '--check-syntax') {
  var parse = require('acorn').parse;
  parse(fs.readFileSync(path.join(target, metadata.main), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(target, 'dist/persian.browser.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'standalone.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'browser/assert.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(target, 'legacy.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'legacy.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'legacy-cases.js'), 'utf8'), { ecmaVersion: 5 });
  parse(benchmark, { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'installed.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'persian.test.js'), 'utf8'), { ecmaVersion: 5 });
  parse(fs.readFileSync(path.join(__dirname, 'yarn.js'), 'utf8'), { ecmaVersion: 5 });
  console.log('Package and benchmark ES5 syntax verified.');
}
fs.writeFileSync(path.join(consumer, 'benchmark.js'), benchmark.replace(/require\('\.\.\/'\)/g, "require('persian')"));

var regression = fs.readFileSync(path.join(__dirname, 'persian.test.js'), 'utf8');
fs.writeFileSync(path.join(consumer, 'test.js'), regression.replace(/require\('\.\.\/'\)/g, "require('persian')"));
fs.copyFileSync(path.join(__dirname, 'types-browser.ts'), path.join(consumer, 'types-browser.ts'));
fs.copyFileSync(path.join(__dirname, 'types-valid.ts'), path.join(consumer, 'types-valid.ts'));
fs.copyFileSync(path.join(__dirname, 'types-invalid.ts'), path.join(consumer, 'types-invalid.ts'));
var browserInvalid = fs.readFileSync(path.join(__dirname, 'types-invalid.ts'), 'utf8')
  .replace(/^import [^\n]+/, '/// <reference types="persian" />')
  .replace(/^([a-zA-Z]+)\(/gm, 'persian.$1(');
fs.writeFileSync(path.join(consumer, 'types-browser-invalid.ts'), browserInvalid);
fs.writeFileSync(path.join(consumer, 'test.mjs'), [
  "import assert from 'assert';",
  "import replaceFromMap from 'persian/legacy.js';",
  "assert.strictEqual(replaceFromMap('12', { '1': 'x' }), 'x2');",
  "assert.strictEqual(typeof replaceFromMap, 'function');",
  "import { toPersian, toEnglish, formatNumber, numberToWords, switchKeyboard, createPersian, persianDigits, persianLetters, unformatNumber, wordsToDigits } from 'persian';",
  "assert.strictEqual(toPersian('123'), '۱۲۳');",
  "assert.strictEqual(toPersian('مي\\u200cروم', { preserveHalfSpace: true }), 'می\\u200cروم');",
  "assert.strictEqual(toEnglish('۱۲۳'), '123');",
  "assert.strictEqual(toEnglish('۱۲٣4', { arabic: true }), '1234');",
  "assert.strictEqual(toPersian('عَلِي', { preserveDiacritics: true }), 'عَلِی');",
  "assert.strictEqual(formatNumber('۱۲۳۴'), '۱٬۲۳۴');",
  "assert.strictEqual(numberToWords('۱۲۳'), 'صد و بیست و سه');",
  "assert.strictEqual(switchKeyboard('لخخلمث'), 'google');",
  "assert.strictEqual(numberToWords(3, { ordinal: true }), 'سوم');",
  "const fa = createPersian({ toEnglish: { arabic: true }, numberToWords: { ordinal: true } });",
  "assert.strictEqual(fa.toEnglish('٣'), '3');",
  "assert.strictEqual(fa.numberToWords(3), 'سوم');",
  "assert.strictEqual(fa.numberToWords(3, { ordinal: false }), 'سه');",
  "assert.strictEqual(persianDigits('علي 12٣'), 'علي ۱۲۳');",
  "assert.strictEqual(persianLetters('علي 12٣'), 'علی 12٣');",
  "assert.strictEqual(unformatNumber('۱٬۲۳۴٫۵۰'), '۱۲۳۴٫۵۰');",
  "assert.strictEqual(wordsToDigits('سه هزار و دوازده'), '3012');",
  "assert.strictEqual(wordsToDigits('سوم', { ordinal: true }), '3');",
  "assert.strictEqual(wordsToDigits('صد ممیز پنج هزارم'), '100.005');",
  "console.log('Native ESM imports passed.');",
].join('\n'));
console.log('Package contents verified: ' + metadata.name + '@' + metadata.version);

fs.copyFileSync(path.join(__dirname, 'standalone.js'), path.join(consumer, 'standalone.js'));

var legacy = fs.readFileSync(path.join(__dirname, 'legacy.js'), 'utf8');
fs.writeFileSync(path.join(consumer, 'legacy-test.js'), legacy.replace(/'\.\.\/legacy'/g, "'persian/legacy'"));
fs.copyFileSync(path.join(__dirname, 'legacy-cases.js'), path.join(consumer, 'legacy-cases.js'));
fs.mkdirSync(path.join(consumer, 'fixtures'));
fs.copyFileSync(path.join(__dirname, 'fixtures/legacy-1.0.1.js'), path.join(consumer, 'fixtures/legacy-1.0.1.js'));
['types-legacy-valid.ts', 'types-legacy-invalid.ts'].forEach(function (file) {
  fs.copyFileSync(path.join(__dirname, file), path.join(consumer, file));
});
