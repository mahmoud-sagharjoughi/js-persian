'use strict';

module.exports = function replaceFromMap(input, mapObj) {
  var regex = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  return input.replace(regex, function replaceKey(key) {
    return mapObj[key];
  });
};
