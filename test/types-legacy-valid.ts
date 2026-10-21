import replaceFromMap = require('persian/legacy');
import withExtension = require('persian/legacy.js');
const mapped: string = replaceFromMap('12', { '1': 'x' });
const boxed: string = replaceFromMap(new String('aba'), { a: 'x' });
const values: string = replaceFromMap('abc', { a: 0, b: null, c: undefined });
const empty: string = withExtension('a', {});
