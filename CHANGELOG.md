# Changelog

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
