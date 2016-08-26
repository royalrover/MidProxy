'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;

exports.refresh = function(config,cb){
  var hotload = config.hotload,
    redisUtil = config.redisUtil,
    template = config.template,
    mock = config.mock,
    MidProxy = config.MidProxy,
    log = config.log;

  hotload.on('swap',function(filename){
    log.info('swap: '+ filename);
    var layers = filename.split(path.sep);
    var _layers = [],exProjDir;

    layers.forEach(function(layer,i){
      if(layer && layer == 'extends'){
        _layers = layers.slice(0,i + 2);
      }
    });

    exProjDir = _layers.join(path.sep);

    // 重新加载exProjDir目录下的文件
    var loc = path.join(exProjDir,'pre');
    var viewLoc = path.join(exProjDir,'views/mobile');
    try{
      if(fs.existsSync(loc) && fs.existsSync(path.join(loc,'index.js'))){
        var m = require(loc);
        m && m.preHandle && m.preHandle(template,viewLoc);
      }
    }catch(e){
      log.error('require module error! message: '+ e.stack);
    }

    // 初始化新加载extends工程的API
    loc = path.join(exProjDir,'api',mock);
    var jsons;
    try{
      jsons = fs.readdirSync(loc);
      jsons.forEach(function(json){
        if(path.extname(json) !== '.json')
          return;

        var file = path.join(loc,json);
        if(!fs.existsSync(file)){
          log.error('interface file read error! the error path is ' + file);
          return;
        }
        MidProxy.init(file);
      })
    }catch(e){
      log.error('load extends APIs error! message: '+ e.stack);
    }

    cb && cb();
    // 重新加载路由策略
    //var loc = path.join(exProjDir,'routes');
    //var file = path.join(loc,'page');
    //var api = path.join(loc,'api');
    //if(fs.existsSync(loc)){
    //  if(fs.existsSync(file)){
    //    require(file).bind(router,MidProxy,View,log,_);
    //  }
    //
    //  if(fs.existsSync(api)){
    //    require(api).bind(router,MidProxy,View,log,_);
    //  }
    //}
  });
};