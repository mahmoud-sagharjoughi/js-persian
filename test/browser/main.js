import { toPersian, toEnglish, formatNumber, numberToWords, switchKeyboard, createPersian, persianDigits, persianLetters, unformatNumber, wordsToDigits } from 'persian';

import replaceFromMap from 'persian/legacy';
import runLegacyCases from './legacy-cases.mjs';

var checks = 0;
function equal(actual, expected) {
  if (actual !== expected) {
    throw new Error('Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
  checks += 1;
}
function rejects(action, type, message) {
  var error;
  try { action(); } catch (caught) { error = caught; }
  equal(error instanceof type, true);
  equal(error.message, message);
}

var result = document.getElementById('result');
try {
  runLegacyCases(replaceFromMap, {
    strictEqual: equal,
    throws: function (action, predicate) {
      var error;
      try { action(); } catch (caught) { error = caught; }
      equal(!!error && predicate(error), true);
    },
  });
  equal(String.prototype.replaceAll, window.originalReplaceAll);
  equal('12'.replaceAll({ '1': 'x' }), '12');
  [toPersian, toEnglish, formatNumber, numberToWords, switchKeyboard, createPersian, persianDigits, persianLetters, unformatNumber, wordsToDigits].forEach(function (method) {
    equal(typeof method, 'function');
  });
  equal(toPersian('اردك علي ٤6٦'), 'اردک علی ۴۶۶');
  equal(toPersian(''), '');
  equal(toPersian(-123.45), '-۱۲۳.۴۵');
  equal(toPersian('hello 🌍\nمي\u200cروم 12٤'), 'hello 🌍\nمیروم ۱۲۴');
  equal(toPersian('مِي\u200cروم 12٤', { preserveHalfSpace: true, preserveDiacritics: true }), 'مِی\u200cروم ۱۲۴');
  equal(toPersian('عَلِي 123٤', { arabic: false }), 'عَلِي ۱۲۳٤');
  equal(toPersian('123٤', { english: false }), '123۴');
  equal(toPersian('عَلِي 🌍 123٤', { arabic: false, english: false }), 'عَلِي 🌍 123٤');
  equal(toEnglish('۱۲٣4'), '12٣4');
  equal(toEnglish('مِي\u200cروم 🌍 ۱۲٣4', { arabic: true }), 'مِي\u200cروم 🌍 1234');
  equal(toEnglish(''), '');
  equal(toEnglish(toPersian('0123456789', { arabic: false })), '0123456789');
  equal(formatNumber('۱۲۳۴۵۶۷'), '۱٬۲۳۴٬۵۶۷');
  equal(formatNumber('−۰۰۱۲۳۴٫۵۰'), '−۰۰۱٬۲۳۴٫۵۰');
  equal(formatNumber('9007199254740993'), '9٬007٬199٬254٬740٬993');
  equal(formatNumber('1234567', { separator: '$&' }), '1$&234$&567');
  equal(formatNumber(5e-324), '0.' + new Array(324).join('0') + '5');
  equal(numberToWords('۱۲٣'), 'صد و بیست و سه');
  equal(numberToWords('-12.50'), 'منفی دوازده و پنج دهم');
  equal(numberToWords('0.01'), 'یک صدم');
  equal(numberToWords('100000000000000001'), 'صد کوادریلیون و یک');
  equal(numberToWords('-0.000'), 'صفر');
  equal(switchKeyboard('لخخلمث'), 'google');
  equal(switchKeyboard('google', { direction: 'toPersian' }), 'لخخلمث');
  equal(switchKeyboard('۱۲٣4 ABC! 🌍\n\u200c'), '۱۲٣4 ABC! 🌍\n\u200c');
  rejects(function () { toPersian(null); }, TypeError, 'INPUT_MUST_BE_NUMBER_OR_STRING');
  rejects(function () { formatNumber('1,000'); }, TypeError, 'INVALID_NUMBER');
  rejects(function () { formatNumber(9007199254740992); }, RangeError, 'NUMBER_MUST_BE_SAFE');
  rejects(function () { numberToWords('1000000000000000000'); }, RangeError, 'NUMBER_OUT_OF_RANGE');
  equal(JSON.stringify(Object.getOwnPropertyNames(String.prototype)), JSON.stringify(window.stringProperties));
  equal(String.prototype.replaceAll, window.originalReplaceAll);
  equal('aba'.replaceAll('a', 'x'), 'xbx');
  equal(numberToWords(3, { ordinal: true }), 'سوم');
  equal(numberToWords(30, { ordinal: true }), 'سی\u200cام');
  equal(numberToWords('-23.00', { ordinal: true }), 'منفی بیست و سوم');
  rejects(function () { numberToWords('0.01', { ordinal: true }); }, RangeError, 'ORDINAL_REQUIRES_INTEGER');
  var config = {
    toPersian: { preserveHalfSpace: true },
    toEnglish: { arabic: true },
    formatNumber: { separator: ',' },
    numberToWords: { ordinal: true },
    switchKeyboard: { direction: 'toPersian' },
  };
  var fa = createPersian(config);
  equal(fa.toPersian('مي\u200cروم'), 'می\u200cروم');
  equal(fa.toEnglish('٣'), '3');
  equal(fa.formatNumber('1234'), '1,234');
  equal(fa.numberToWords(3), 'سوم');
  equal(fa.numberToWords(3, { ordinal: false }), 'سه');
  equal(fa.numberToWords(3, { ordinal: undefined }), 'سوم');
  equal(fa.switchKeyboard('google'), 'لخخلمث');
  equal(numberToWords(3), 'سه');
  equal(createPersian().toEnglish('٣'), '٣');
  config.toEnglish.arabic = false;
  equal(fa.toEnglish('٣'), '3');
  equal(JSON.stringify([1, 2, 3].map(fa.numberToWords)), JSON.stringify(['یکم', 'دوم', 'سوم']));
  rejects(function () { createPersian({ numberToWords: { ordinal: 'yes' } }); }, TypeError, 'OPTION_MUST_BE_BOOLEAN');
  equal(JSON.stringify(Object.getOwnPropertyNames(String.prototype)), JSON.stringify(window.stringProperties));
  equal(String.prototype.replaceAll, window.originalReplaceAll);
  equal(persianDigits('عَلِي می\u200cرود 🌍 12٣'), 'عَلِي می\u200cرود 🌍 ۱۲۳');
  equal(persianLetters('عَلِي می\u200cرود 🌍 12٣'), 'عَلِی می\u200cرود 🌍 12٣');
  equal(unformatNumber('−۰۰۱٬۲۳۴٫۵۰'), '−۰۰۱۲۳۴٫۵۰');
  equal(unformatNumber('1$&234', { separator: '$&' }), '1234');
  equal(wordsToDigits('صد کوادریلیون و یک'), '100000000000000001');
  equal(wordsToDigits('یک هزارم'), '0.001');
  equal(wordsToDigits('یک هزارم', { ordinal: true }), '1000');
  equal(wordsToDigits('صد ممیز پنج هزارم'), '100.005');
  rejects(function () { wordsToDigits('صد و پنج هزارم'); }, TypeError, 'AMBIGUOUS_NUMBER_WORDS');
  rejects(function () { wordsToDigits('یک دو'); }, TypeError, 'INVALID_NUMBER_WORDS');
  rejects(function () { unformatNumber('1٬23'); }, TypeError, 'INVALID_NUMBER');
  var reverse = createPersian({ unformatNumber: { separator: ',' }, wordsToDigits: { ordinal: true } });
  equal(reverse.unformatNumber('1,234'), '1234');
  equal(reverse.wordsToDigits('سوم'), '3');
  equal(reverse.wordsToDigits('یک هزارم', { ordinal: false }), '0.001');
  equal(reverse.persianDigits('علي 12٣'), 'علي ۱۲۳');
  equal(reverse.persianLetters('علي 12٣'), 'علی 12٣');
  result.textContent = checks + ' browser checks passed.';
  result.dataset.checks = String(checks);
  result.dataset.status = 'passed';
} catch (error) {
  result.textContent = error.stack || error.message;
  result.dataset.status = 'failed';
  throw error;
}
