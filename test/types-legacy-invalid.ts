import replaceFromMap = require('persian/legacy');
replaceFromMap(123, { '1': 'x' });
replaceFromMap(null, {});
replaceFromMap('a', null);
replaceFromMap('a');
const wrong: number = replaceFromMap('a', { a: 'x' });
replaceFromMap('a', { a: 'x' }, 'unused');
