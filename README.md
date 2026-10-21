# Library for Persian(farsi) localization "`persian`"

[![npm version](https://badge.fury.io/js/persian.svg)](https://badge.fury.io/js/persian)
[![CI](https://github.com/Mahmoud-Sagharjoughi/js-persian/actions/workflows/ci.yml/badge.svg)](https://github.com/Mahmoud-Sagharjoughi/js-persian/actions/workflows/ci.yml)

## Installing

### Using NPM

```bash
npm install persian
```

### Using Yarn

```bash
yarn add persian
```

The standalone browser build, new conversion options, number and keyboard
utilities, and TypeScript definitions below
are available in version 1.1.0 and later. See [CHANGELOG.md](CHANGELOG.md) for changes.

### Using a script tag

The package includes `dist/persian.browser.js`. Copy that file
from the installed package to your website and load it before your application:

```html
<p id="amount"></p>
<script src="/js/persian.browser.js"></script>
<script>
  document.getElementById('amount').textContent = persian.toPersian('1234');
</script>
```

This standalone ES5 file exposes all ten exports as `window.persian`, including
`createPersian` for reusable defaults. It requires no bundler, module loader or
runtime dependencies. It also works in classic Web Workers:

```js
importScripts('/js/persian.browser.js');
self.postMessage(persian.toPersian('1234'));
```

Use ordinary script tags in the order shown, or use `defer` on both external
scripts. An inline script following a deferred library does not wait for it.
The file assigns the global name `persian`; loading it again replaces that
reference with a fresh API object. Previously saved instances remain usable.
Host `module`, `exports`, `require` and `define` globals are left untouched.
Existing CommonJS and ESM imports continue to use `dist/persian.js`.
In a TypeScript script that uses the browser global, include the package types
and compile as a script (`moduleDetection: "legacy"` on current TypeScript):

```ts
/// <reference types="persian" />
var text: string = persian.toPersian('1234');
```

## Migrating the old replaceAll side effect

Version 1.0.1 installed a custom `String.prototype.replaceAll(map)` as a side
effect of importing the package. Starting with 1.1.0, imports leave JavaScript's
built-in prototypes unchanged. Calls to `toPersian` and `toEnglish` do not need
this side effect.

If your application called that custom method directly, version 1.2.0 provides
an optional compatibility function. Change each affected call:

```js
// Before: depended on the prototype method installed by 1.0.1
require('persian');
var result = '12'.replaceAll({ '1': 'x' });

// After: explicit compatibility mapping; no global changes
var replaceFromMap = require('persian/legacy');
var result = replaceFromMap('12', { '1': 'x' }); // 'x2'
```

Importing `persian/legacy` alone does not restore the old method. Keep ordinary
standard calls such as `'aba'.replaceAll('a', 'x')` unchanged. A single automatic
wrapper cannot preserve both meanings: `'12'.replaceAll({ '1': 'x' })` returns
`'12'` with the standard method and `'x2'` with the old mapping method.

For native Node.js ESM, include the extension:

```js
import replaceFromMap from 'persian/legacy.js';
```

TypeScript supports the CommonJS import without additional type packages:

```ts
import replaceFromMap = require('persian/legacy');
const result: string = replaceFromMap('12', { '1': 'x' });
```

The helper is standalone ES5 CommonJS, has no dependencies, and works on Node.js
0.10 and later without native `String.prototype.replaceAll`. Browser bundlers
can import it separately. It is not added to `window.persian` or
`createPersian()` instances, and is not a standard `replaceAll` polyfill.

### Preserved mapping behavior

This entry is for migrating existing mappings, including their original quirks:

- Own enumerable string keys are joined as a regular expression, without
  escaping, and matched globally and case-insensitively. Invalid patterns throw.
- Each replacement is looked up using the actual matched text. For example,
  `replaceFromMap('A a', { a: 'x' })` returns `'undefined x'`. A key such as
  `'a+'` matches `'aaa'`, but looks up `map.aaa`, not `map['a+']`.
- Overlapping alternatives keep the runtime's `Object.keys` order. Replacements
  are one pass; inserted text is not searched again.
- Replacement values are converted to strings. `$&`, `$1` and `$$` in values
  are literal text, not replacement templates. Getters run for each match;
  inherited properties can supply a value for an actual match. Runtime-specific
  property lookup behavior, including `__proto__` in older V8 versions, is retained.
- An empty map creates an empty regex: `replaceFromMap('a', {})` returns
  `'undefinedaundefined'`. An empty-string key inserts its value at each UTF-16
  boundary, including inside surrogate pairs.

Use trusted mappings: keys are regex patterns, not literal search strings.
The typed API accepts strings or boxed strings and a mapping object. No new
validation or coercion is added at runtime, so errors from invalid inputs,
patterns or replacement values propagate. Symbols are not pattern keys, and
`Symbol.replace` on the map is not invoked. The map and built-in prototypes
are not modified by the helper.

## Compatibility

The published package uses ES5 CommonJS and has no runtime dependencies.
The release artifact has been tested on Node.js 0.10.48, 0.12.18, 4.0.0, 4.8.6,
4.9.1, 6.0.0, 6.12.0, 6.17.1, 8.0.0, 8.9.1, 8.17.0, 9.2.0, 10.24.1,
12.22.12, 14.21.3, 16.20.2, 18.20.8, 20.19.5, 22.23.3, 24.16.0 and 26.10.0.

Building from source requires Node.js 22.18 or later in the 22.x line, or Node.js
24.11 or later. This requirement applies to development tools; the published
package retains the runtime compatibility listed above.

Run `npm run lint` to check the source style and `npm test` to build the package
and run the regression tests, including the optional legacy entry. The tests cover conversion options, half-spaces, numeric boundaries, keyboard layouts, invalid
inputs, unchanged `String.prototype`, and all 65,536 UTF-16 code units across
every combination of conversion options. A fixed seed generates 5,000 additional
numeric cases covering mixed digit scripts, signs, leading and trailing zeros,
fractional precision, integer size limits, malformed Unicode inputs and ordinal
options. Integer words are also checked with an independent arithmetic reader.

CI builds one npm archive and tests that archive on the Node.js versions above
on Linux, plus Node.js 22, 24 and 26 on Windows and macOS. Each runtime installs
the local archive into a fresh project with its bundled npm, with install scripts
enabled and an unreachable registry, then runs the regression tests. CI also
checks that installation adds no runtime dependencies. Each runtime also runs
the benchmark without a timing threshold. CI checks native
ESM imports on Node.js 12 and later, ES5 output syntax, package contents, and valid
and invalid TypeScript usage with TypeScript 2.6.2 and 7.0.2. Separate browser jobs
test all ten named imports with Vite in development and production on Chromium,
Firefox and WebKit, using the same npm archive. The same engines also load the
standalone file directly with ordinary and deferred script tags, and run the
full regression suite in both pages and classic Web Workers. These checks cover
repeated loading, host module globals, global leakage and unchanged built-in
prototypes under a Content Security Policy that disallows inline scripts and eval.

Yarn consumer jobs install that archive with Yarn 1.3.2 on Node.js 8.9.1,
Yarn 1.22.22 on Node.js 24.16.0, and Yarn 4.18.1 on Node.js 24.16.0 using both
`node-modules` and Plug'n'Play. Installs use isolated caches, disabled registry
access and enabled lifecycle scripts. A second install checks the frozen or
immutable lockfile. Each consumer verifies package contents and zero runtime
dependencies, then runs the regression tests; Node.js 12 and later also check
native ESM imports. These consumers also test the legacy subpath against the
original 1.0.1 mapping method. Plug'n'Play consumers run through `yarn node` to load Yarn's
module resolver. These jobs test package consumption; building this repository
still requires the development Node.js versions listed above.

## Yarn consumer tests

To test a local archive with an already installed Yarn CLI, prepare a fresh
consumer with `test/package.js`, then run:

```bash
node test/package.js /path/to/empty-archive-directory /path/to/fresh-consumer --prepare-install
node test/yarn.js /path/to/yarn/bin/yarn.js /path/to/fresh-consumer classic
```

Use `node-modules` or `pnp` instead of `classic` with Yarn 4, passing the path to
`@yarnpkg/cli-dist/bin/yarn.js`. Each run requires a fresh consumer directory.
The runner keeps caches inside that directory and tests the local archive without
publishing it. Prepare the archive with `npm pack --pack-destination` as shown below.

## Browser tests

Browser test tools are isolated in `test/browser` and require Node.js 24.11 or
later. To test a local archive without publishing it:

```bash
npm ci --prefix test/browser --ignore-scripts
node test/browser/node_modules/playwright/cli.js install chromium firefox webkit
npm pack --pack-destination /path/to/empty-archive-directory
node test/package.js /path/to/empty-archive-directory /path/to/fresh-consumer --prepare-install
cd /path/to/fresh-consumer
npm install ./persian.tgz --save
cd /path/to/js-persian
npm run test:browser -- /path/to/fresh-consumer chromium
npm run test:browser -- /path/to/fresh-consumer firefox
npm run test:browser -- /path/to/fresh-consumer webkit
```

On Linux, Playwright may require system browser dependencies; use its
`install --with-deps` option when needed. These tests check conversion defaults
and options, Unicode, numeric precision, keyboard mapping, rejected inputs and
unchanged `String.prototype`. They cover the installed Playwright browser engines,
not historical browser versions. ES5 syntax does not establish compatibility
with every older browser; the tested standalone environments are the Playwright
engines above. Test tools and fixtures are excluded from the
published package.

## Benchmarks

Build with `npm run build`, then run `npm run benchmark` to measure `toPersian`
on fixed short and long inputs, including mixed digits, diacritics, and options
that preserve diacritics or disable Arabic conversion. The benchmark uses ES5
and Node's built-in timer and can run directly on Node.js 0.10 and later:

```bash
node benchmark/to-persian.js
node benchmark/to-persian.js /path/to/baseline/persian.js
```

The optional baseline is a compiled CommonJS module exporting `toPersian`.
Comparison runs verify matching outputs, warm up both modules, alternate their
measurement order, and report the median of seven samples. Results are
microseconds per call; a baseline/current ratio above 1 means the current module
is faster. Timings depend on the machine and runtime and are not CI pass/fail
thresholds. The benchmark is not included in the published package.

## Examples

### To Persian

Latest Version

```javascript
// ES6
import { toPersian, toEnglish } from 'persian';

toPersian('اردك علي ٤6٦'); // اردک علی ۴۶۶

// { english, arabic }
toPersian('اردك علي ٤6٦', { english: false }); // اردک علی ۴6۶

// From Persian To English
toEnglish('۷۶۳۲۴۵'); // 763245

```

### Using CommonJS

```javascript
var persian = require('persian');

persian.toPersian('اردك علي ٤6٦'); // اردک علی ۴۶۶
persian.toEnglish('۷۶۳۲۴۵'); // 763245
```

### Preserving half-spaces

By default, `toPersian` removes half-spaces (U+200C) when Arabic conversion is enabled.
Use `preserveHalfSpace` to keep them:

```javascript
toPersian('مي‌روم'); // میروم
toPersian('مي‌روم', { preserveHalfSpace: true }); // می‌روم
```

### Preserving diacritics

By default, `toPersian` removes diacritics in U+064B–U+065F when Arabic conversion
is enabled. Use `preserveDiacritics` to keep them while still converting letters
and digits:

```javascript
toPersian('عَلِي 123'); // علی ۱۲۳
toPersian('عَلِي 123', { preserveDiacritics: true }); // عَلِی ۱۲۳
```

`preserveDiacritics` and `preserveHalfSpace` can be enabled together. When
`arabic: false`, Arabic letters, digits, diacritics and joining characters are
already left unchanged.

Options for `toPersian`:

| Option | Default | Behavior |
| --- | --- | --- |
| `arabic` | `true` | Convert Arabic letters and digits, and remove diacritics and joining characters. |
| `english` | `true` | Convert English digits to Persian digits. |
| `preserveHalfSpace` | `false` | Keep U+200C during Arabic conversion. |
| `preserveDiacritics` | `false` | Keep U+064B–U+065F during Arabic conversion. |

### Converting Arabic digits to English

`toEnglish` converts Persian digits by default. Set its `arabic` option to `true`
to convert Arabic digits too; the default is `false`:

```javascript
toEnglish('۱۲٣4'); // 12٣4
toEnglish('۱۲٣4', { arabic: true }); // 1234
```

This option changes digits only; letters, diacritics and half-spaces are kept.
Both functions accept strings or numbers and return strings.

### Converting only digits or letters

`persianDigits` converts English and Arabic digits to Persian digits without
changing letters, diacritics, half-spaces, joining characters or punctuation.
`persianLetters` converts only `ي`, `ى` and `ك` to `ی`, `ی` and `ک`:

```javascript
import { persianDigits, persianLetters } from 'persian';

persianDigits('عَلِي می‌رود 12٣'); // عَلِي می‌رود ۱۲۳
persianLetters('عَلِي می‌رود 12٣'); // عَلِی می‌رود 12٣
```

Both accept strings or numbers and return strings. These additional helpers leave
`toPersian` and its existing defaults unchanged.

### Formatting numbers

`formatNumber` groups the integer part in threes. It preserves the input's digit
characters, sign, decimal separator, leading zeros and fractional trailing zeros.
The default thousands separator is `٬` (U+066C):

```javascript
import { formatNumber } from 'persian';

formatNumber('۱۲۳۴۵۶۷'); // ۱٬۲۳۴٬۵۶۷
formatNumber('−۰۰۱۲۳۴٫۵۰'); // −۰۰۱٬۲۳۴٫۵۰
formatNumber(-1234.5, { separator: ',' }); // -1,234.5
formatNumber('9007199254740993'); // 9٬007٬199٬254٬740٬993
```

`separator` must be a nonempty string without digits, signs or decimal separators.
It is inserted literally, including characters such as `$`.

### Removing number formatting

`unformatNumber` removes the specified thousands separator from a numeric string.
It preserves the sign, digit characters, decimal separator, leading zeros and
fractional trailing zeros. Its `separator` option follows `formatNumber`, with
`٬` as the default:

```javascript
import { unformatNumber } from 'persian';

unformatNumber('−۰۰۱٬۲۳۴٫۵۰'); // −۰۰۱۲۳۴٫۵۰
unformatNumber('9,007,199,254,740,993', { separator: ',' }); // 9007199254740993
unformatNumber('1$&234', { separator: '$&' }); // 1234
```

Ungrouped numeric strings are accepted. Grouped integers must have one to three
digits in the first group and exactly three in every later group. Empty groups,
misplaced separators and other invalid numeric syntax throw
`TypeError('INVALID_NUMBER')`. Separators are matched literally, including
multicharacter separators. This function accepts strings only; its options must
be an object when supplied. For any valid numeric string passed to `formatNumber` with the same separator,
unformatting the formatted result preserves the original numeric string.

### Numbers to Persian words

`numberToWords` supports signed integers and decimals written with English,
Persian or Arabic digits, including mixed digits:

```javascript
import { numberToWords } from 'persian';

numberToWords('۱۲۳'); // صد و بیست و سه
numberToWords('-12.50'); // منفی دوازده و پنج دهم
numberToWords('0.01'); // یک صدم
numberToWords('100000000000000001'); // صد کوادریلیون و یک
```

The integer part supports up to 18 digits after removing leading zeros (through quadrillions);
the fractional part supports up to 12 decimal places after removing trailing
zeros. Leading zeros and negative zero are normalized. A whole number followed
only by fractional zeros is read as a whole number.

Set `ordinal: true` to read an integer as an ordinal. The default remains cardinal:

```javascript
numberToWords(1, { ordinal: true }); // یکم
numberToWords(3, { ordinal: true }); // سوم
numberToWords('۳۰', { ordinal: true }); // سی‌ام
numberToWords(23, { ordinal: true }); // بیست و سوم
numberToWords('-3.000', { ordinal: true }); // منفی سوم
```

Zero is `صفرم`; only the last word of a compound number becomes ordinal.
Fractional zeros are accepted, but a nonzero fraction with `ordinal: true` throws
`RangeError('ORDINAL_REQUIRES_INTEGER')`. Set `ordinal: false` to keep cardinal
words, including decimals. Ordinal conversion activates only for boolean `true`.

Both numeric utilities accept strings or numbers. Strings must contain an optional
`+`, `-` or `−` (U+2212), one or more digits, and optionally `.` or `٫` (U+066B)
followed by one or more digits. Spaces, existing grouping separators and string
exponent notation are rejected with `TypeError('INVALID_NUMBER')`.

Use strings for exact large integers or decimals: numeric inputs use JavaScript's
existing string representation. Nonfinite numbers throw
`RangeError('NUMBER_MUST_BE_FINITE')`; numbers outside ±9007199254740991 throw
`RangeError('NUMBER_MUST_BE_SAFE')`. Numeric exponent notation is expanded to
ordinary decimal notation. `formatNumber` has no digit limit for strings;
`numberToWords` throws `RangeError('NUMBER_OUT_OF_RANGE')` beyond its limits.

### Persian words to digit strings

`wordsToDigits` reads Persian number words into an English digit string. It uses
three-digit groups rather than JavaScript numeric arithmetic for large integers,
so integers through 18 digits remain exact. Decimals support up to 12
fractional places after removing trailing zeros. Leading integer zeros, fractional trailing zeros and negative
zero are normalized.

```javascript
import { wordsToDigits } from 'persian';

wordsToDigits('سه هزار دویست و دوازده'); // 3212
wordsToDigits('منفی یک میلیون'); // -1000000
wordsToDigits('صد کوادریلیون و یک'); // 100000000000000001
wordsToDigits('دوازده و پنج دهم'); // 12.5
wordsToDigits('صفر ممیز صفر صفر یک'); // 0.001
```

Hundreds, tens and units use `و` between parts. Scale words must descend without
repetition; `و` between scale groups is optional, and a bare scale such as `هزار`
means one thousand. `یکصد` is accepted alongside `صد`. Whitespace is normalized,
Arabic `ي`, `ى` and `ك` are converted, and U+064B–U+065F diacritics are removed
for parsing. Other unknown words, digits, punctuation and malformed phrases are
rejected with `TypeError('INVALID_NUMBER_WORDS')`; spelling is not guessed.

Use `ordinal: true` for integer ordinals, including `اول`, `یکم`, `سوم` and the
forms produced by `numberToWords`. The default is cardinal/fractional reading:

```javascript
wordsToDigits('یک هزارم'); // 0.001
wordsToDigits('یک هزارم', { ordinal: true }); // 1000
wordsToDigits('بیست و سوم', { ordinal: true }); // 23
```

Some fractional phrases are ambiguous. `صد و پنج هزارم` can mean either `0.105`
or `100.005`, so it throws `TypeError('AMBIGUOUS_NUMBER_WORDS')`. Use `ممیز` to
separate the whole and fractional parts explicitly:

```javascript
wordsToDigits('صد ممیز پنج هزارم'); // 100.005
wordsToDigits('صفر ممیز صد و پنج هزارم'); // 0.105
```

After `ممیز`, use either individual digit words or a numerator followed by one
of the fraction names used by `numberToWords` (`دهم` through `تریلیونیم`). An
ordinary fractional phrase is accepted only when it has one numeric reading.
Consequently, integer words round-trip directly; decimal words may need an explicit
`ممیز`. Ordinal mode requires an ordinal ending and accepts no fractions.
Parsing accepts strings only, limits phrases to 80 words and never ignores unknown
words. More than 12 fractional places after removing trailing zeros from digit-by-digit
`ممیز` throws
`RangeError('NUMBER_OUT_OF_RANGE')`. Ordinal mode activates only for boolean `true`.

### Switching keyboard layouts

`switchKeyboard` converts the letter positions of the unshifted Persian Standard
and English QWERTY layouts. The default direction is `toEnglish`:

```javascript
import { switchKeyboard } from 'persian';

switchKeyboard('لخخلمث'); // google
switchKeyboard('google', { direction: 'toPersian' }); // لخخلمث
```

The mappings follow the letter rows in the
[Persian Standard keyboard layout](https://learn.microsoft.com/en-us/globalization/keyboards/kbdfar.html).
English `[`, `]`, `;`, `'` and `,` map to Persian `ج`, `چ`, `ک`, `گ` and `و`.
Digits, uppercase English letters, shifted symbols, half-spaces, emoji and other
unmapped characters stay unchanged. This function accepts strings only and
converts in the requested direction without guessing the input's language.

For `formatNumber` and `switchKeyboard`, `options` must be an object when provided.
An invalid separator or direction throws a `TypeError`.
These utilities are additional exports; existing conversion defaults are unchanged.

### Reusing settings

Use `createPersian` to set defaults once for an application or module. It returns
all nine conversion methods, with the same inputs and outputs as the individual
exports:

```javascript
import { createPersian } from 'persian';

const fa = createPersian({
  toPersian: { preserveHalfSpace: true, preserveDiacritics: true },
  toEnglish: { arabic: true },
  formatNumber: { separator: ',' },
  unformatNumber: { separator: ',' },
  wordsToDigits: { ordinal: true },
  numberToWords: { ordinal: true },
  switchKeyboard: { direction: 'toPersian' },
});

fa.toPersian('مي‌روم 123'); // می‌روم ۱۲۳
fa.toEnglish('۱۲٣'); // 123
fa.formatNumber('1234'); // 1,234
fa.numberToWords(3); // سوم
fa.switchKeyboard('google'); // لخخلمث
fa.unformatNumber('1,234'); // 1234
fa.wordsToDigits('سوم'); // 3
fa.persianDigits('علي 12٣'); // علي ۱۲۳
fa.persianLetters('علي 12٣'); // علی 12٣

fa.numberToWords(3, { ordinal: false }); // سه
fa.toPersian('مي‌روم 123', { english: false }); // می‌روم 123
```

Share this instance through your own module if several parts of your application
use the same settings. Each instance is independent, and the individual exports
keep their original defaults. `createPersian()` uses those original defaults too.
Methods can also be used without binding them to the instance:

```javascript
[1, 2, 3].map(fa.numberToWords); // ['یکم', 'دوم', 'سوم']
```

Options supplied to a method override only those fields for that call. An omitted
or `undefined` field inherits the instance default; an explicit `false` overrides
`true`. Configuration values are copied when the instance is created, so changing
the original configuration afterward has no effect. Only own properties are used
for configuration and per-call overrides.

The configuration and its method groups must be objects. Defaults for boolean
options must be booleans; separators and directions follow their usual validation.
Invalid configuration values throw `TypeError`. Unknown method or option names
in the configuration throw `TypeError('UNKNOWN_OPTION')`.

### TypeScript

Type definitions are included for every export, including `NumberToWordsOptions`,
`WordsToDigitsOptions`, `PersianConfig` and `PersianInstance`.

```typescript
import { toPersian, toEnglish, ToPersianOptions, ToEnglishOptions } from 'persian';

const options: ToPersianOptions = { preserveHalfSpace: true, preserveDiacritics: true };
const result: string = toPersian('مي‌روم 123', options);

const englishOptions: ToEnglishOptions = { arabic: true };
const digits: string = toEnglish('۱۲٣4', englishOptions);
```

___

Prior Version 1.0.0 (< 1.0.0)

```javascript
const toPersian = require('persian');

toPersian('اردك علي ٤6٦'); // اردک علی ۴۶۶

toPersian('اردك علي ٤6٦', { english: false }); // اردک علی ۴6۶

```
