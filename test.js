var path = require('path');
var vm = require('vm');
var util = require(path.join(process.cwd(),'/lib/cache/redisUtil'));

var fn = 'function(){console.log(arguments)}';
var ret = vm.runInThisContext('abc = ' + fn, {filename: 'routes/index'});
console.log(ret);
console.log(global.abc);
console.log(abc)
abc = null;
console.log(global.abc)
console.log(abc)