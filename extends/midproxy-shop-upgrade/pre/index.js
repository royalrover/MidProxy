var fs = require('fs');
var path = require('path');

exports.preHandle = function(template,location){
  var loc = path.join(location,'upgrade.tmpl');
//  redisUtil.setRedis('f2e_shopUpgradeRender',template.compile(fs.readFileSync(loc,'utf8')));
  setCache({
    f2e_shopUpgradeRender: template.compile(fs.readFileSync(loc,'utf8'))
  })
};

module.hotload = 1;