# Changelog

## Unreleased

- Add maintainer-only publication checks for the next channel, version and
  lockfile consistency, protected npm metadata, a clean pushed commit and its
  complete successful compatibility CI matrix. Add isolated release-gate and
  npm lifecycle tests. Runtime behavior and existing npm dist-tags are unchanged.

## 2.0.0 (2026-10-21)

### Compatibility notice

Removing the `String.prototype.replaceAll(map)` method installed by 1.0.1 is a
breaking change for applications that called it directly. Versions 1.1.0 and
1.2.0 already removed that side effect in minor releases; both remain available
with a targeted compatibility warning. A warning does not mean every consumer
should downgrade.

Version 2.0.0 establishes the major-version boundary. Its runtime files and
TypeScript declarations are byte-identical to 1.2.0. Standard JavaScript methods
remain untouched, and the existing `toPersian` / `toEnglish` defaults are
unchanged. This documentation clarification changes no runtime behavior.

### Release channels

- `latest` remains on **1.0.1**; `next` points to **2.0.0**.
- This release does not remove or replace any published version. The default
  publication tag in this repository is `next`.
- `next` is not a SemVer prerelease marker. Open ranges such as `*` and `>=1`
  permit 2.0.0; `^1.0.1` excludes 2.0.0 but permits the warned 1.x releases.
  Package managers and existing lockfiles can select different versions.
- Resolving `latest` again can downgrade applications that adopted newer APIs.
  Neither a tag change nor a warning repairs or rewrites an existing deployment.

### Pin the version that matches your application

Preserve the last working lockfile and inspect `npm ls persian` or
`yarn why persian` before changing dependencies. Choose one row and the package
manager already used by your project:

| Situation | npm | Yarn |
| --- | --- | --- |
| Depends on the historical 1.0.1 mapping method | `npm install persian@1.0.1 --save-exact` | `yarn add persian@1.0.1 --exact` |
| Already works on 1.1.0 | `npm install persian@1.1.0 --save-exact` | `yarn add persian@1.1.0 --exact` |
| Already works on 1.2.0 | `npm install persian@1.2.0 --save-exact` | `yarn add persian@1.2.0 --exact` |
| Ready to migrate to, or already works on, 2.0.0 | `npm install persian@2.0.0 --save-exact` | `yarn add persian@2.0.0 --exact` |

For `*`, `latest`, `next` or broad ranges, choose the exact version from the last
working deployment, not whatever a fresh install currently returns. Do not
remove a working lockfile or downgrade newer-API users solely to silence the
warning. Pinning 1.0.1 retains its global prototype mutation and lacks the newer
APIs and standalone browser build.

Verify that `package.json` has the intended exact version, review the lockfile
diff, test the application, and commit both files. Use `npm ci` where supported,
`yarn install --frozen-lockfile` for Yarn Classic, or `yarn install --immutable`
for modern Yarn in CI. Older npm users should retain their established
shrinkwrap workflow. Use the same package-manager version and configuration as
the working project. A direct pin does not necessarily control transitive
copies; identify and test the parent dependency before changing those.

Applications using only `toPersian` / `toEnglish`, with no dependency on the
global method, do not need the legacy helper. Preserve the working version
first, and test any deliberate upgrade separately.

### Migrate legacy mapping calls explicitly

After selecting 2.0.0, change each affected call:

```js
// Before: depended on the method installed by 1.0.1
text.replaceAll(map);

// After: explicit mapping, without changing String.prototype
var replaceFromMap = require('persian/legacy');
replaceFromMap(text, map);
```

Importing `persian/legacy` alone does not fix old call sites. Leave standard
`replaceAll(search, replacement)` calls unchanged. The helper exists in 1.2.0
and 2.0.0, not in 1.0.1 or 1.1.0. Native Node.js ESM imports use
`import replaceFromMap from 'persian/legacy.js'`.

Test the application's actual mappings and interactions with other libraries;
the old regex, case-insensitive lookup, coercion and empty-map quirks are
preserved. Keep the working code and lockfile together as a rollback point.
Browser consumers should pin their artifact or CDN URL too; the helper is a
separate bundler import and is not added to the standalone `window.persian` API.

See the [pinning guide](README.md#pin-a-direct-dependency) and
[full migration guide](README.md#migrating-the-old-replaceall-side-effect) for
version-specific instructions and edge cases.

## 1.2.0 (2026-10-21)

### Added

- Optional `persian/legacy` mapping function with TypeScript declarations for migrating calls to the custom `String.prototype.replaceAll` installed by 1.0.1.
- Legacy behavior and isolation regressions, checked against the original 1.0.1 method and through packaged Node.js, Yarn, ESM and browser consumers.

The helper preserves the old mapping semantics without installing or replacing a global method. Existing `string.replaceAll(map)` calls require an explicit migration; importing the helper alone does not change them. The main API and standalone browser build are unchanged.

## 1.1.0 (2026-10-21)

### Added

- A standalone ES5 `dist/persian.browser.js` build for script tags and classic Web Workers.
- Global `persian` TypeScript definitions for browser scripts.
- Full standalone regressions for direct loading, deferred scripts, reloads and host module globals.
- `preserveHalfSpace` and `preserveDiacritics` options for `toPersian`.
- Optional Arabic digit conversion in `toEnglish` with `{ arabic: true }`.
- `formatNumber` for grouping numeric strings without losing precision or digit style.
- `numberToWords` for Persian integer and decimal words, with optional integer ordinals.
- `createPersian` for independent instances with reusable defaults and per-call overrides.
- `switchKeyboard` for Persian Standard and English QWERTY letter positions.
- `persianDigits` and `persianLetters` for independent digit and letter conversions.
- `unformatNumber` for removing valid grouping without losing precision or digit style.
- `wordsToDigits` for exact integer, decimal and ordinal parsing, with explicit ambiguity errors.
- Reusable separator and ordinal defaults for the reverse number utilities.
- TypeScript definitions for all exports and options.
- Conversion benchmarks for short and long inputs.
- CI coverage for packaged installation, CommonJS, native ESM, TypeScript and Vite browser consumers.
- Offline Yarn Classic and Yarn 4 consumer tests, including Plug'n'Play and lockfile checks.
- Reproducible generated numeric regressions for mixed digits, precision limits and malformed inputs.

### Changed

- Remove U+064B–U+065F diacritics in one replacement pass in `toPersian`.
- Update Babel and ESLint development tools while retaining ES5 CommonJS output.

Existing conversion defaults are unchanged. The package has no runtime dependencies
and retains compatibility with Node.js 0.10 and later. Building from source requires
Node.js 22.18 or later in the 22.x line, or Node.js 24.11 or later.
