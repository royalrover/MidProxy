'use strict';

var path = require('path');
var fs = require('fs');
var watch = require('./watch');

exports.refresh = function(config,cb){
  var hotload = config.hotload,
    MidProxy = config.MidProxy,
    template = config.template,
    log = config.log,
    base = process.currentCwd;

  // 监听routes目录，如果新增控制器文件，则重新加载所有控制器
  watch(path.join(base,'routes'),function(event) {
    var type = event.type;
    var fstype = event.fstype;
    var filename = event.filename;
    var fullname = event.fullname;
    if(fstype !== 'file')
      return;

    try{
      // 新增配置文件
      if(path.extname(fullname) == '.js'){
        if(type !== 'create'){
          cb && cb();
        }
      }
    }catch(e){
      log.error(e.message);
    }
  });

  hotload.on('swap',function(filename){
    log.trace('hot swap: '+ filename);

    if(path.basename(filename) == 'package.json'){
      // 配置文件中的cache选项改变，重新设置缓存
      var cache,base = path.join(process.currentCwd),
        pkgConfig = path.join(base,'package.json'),
        tmpLocation = path.join(base,'views');
      try{
        pkgConfig = require(pkgConfig);
        cache = pkgConfig.cache;
        if(Object.prototype.toString.call(cache) !== '[object Array]'){
          log.error('cache must be an Array!');
          return;
        }
        cache.forEach(function(item){
          if(!item.v || !item.k){
            log.error('cache need have an "k" and "v" property!');
            return;
          }
          // 默认针对模板进行编译后缓存
          if(!item.type || item.type == 'template'){
            if(item.dirname){
              // 设置模板编译后的缓存
              redisUtil.setRedis(item['k'],template.compile(fs.readFileSync(path.join(tmpLocation,item.dirname,item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')));
            }else{
              redisUtil.setRedis(item['k'],template.compile(fs.readFileSync(path.join(tmpLocation,'mobile',item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')));
            }
          }else{
            // 非模板文件，则直接缓存序列化的内容
            redisUtil.setRedis(item['k'],item['v'].toString ? item.toString() : JSON.stringify(item['v']));
          }

        });
      }catch(e){
        log.error(e.message);
      }
    }else if(path.extname(filename) == '.json'){
      try{
        MidProxy.init(filename);
      }catch(e){
        log.error(e.stack);
        process.exit(1);
      }
    }

    cb && cb();
  });
};