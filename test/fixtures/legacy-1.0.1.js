// Original method from persian@1.0.1; run only in an isolated VM context.
'use strict';

String.prototype.replaceAll = function (mapObj) {
  var regex = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  var str = this;
  return str.replace(regex, function (key) {
    return mapObj[key];
  });
};
