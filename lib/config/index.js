/**
 * @function 读取多个工程的配置文件，如 views/mobile/*\/config\/*json 多个目录的配置文件
 * @type {number}
 */
exports.config = function(){
  var path = require('path');
  var fs = require('fs');
  var configRoot = path.join('views/mobile');
  var Config = {};

  var dirs = fs.readdirSync(configRoot);
  // 过滤隐藏文件
  dirs.filter(function(d){
    if(d.match(/\.\w+/i)){
      return false;
    }
    var stat = fs.statSync(path.join(configRoot,d));
    if(!stat.isDirectory()){
      return false;
    }
    return true;
  });

  dirs.forEach(function(d,i){
    var p = path.join(configRoot,d,'config');
    var names = ['dev','release'];
    names.forEach(function(n){
      var file = path.join(p,n + '.json');
      if(fs.existsSync(file)){
        Config[d + '_' + n] = require(path.join(process.cwd(),file));
      }
    });
  });

  return Config;
};