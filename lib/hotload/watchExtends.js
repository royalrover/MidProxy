'use strict';

var Event = require('events');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var emitter = new Event.EventEmitter();
var base = path.join(process.cwd(),'extends/');
var watch = require('./watch');

var checkDirsExceptDSStore = function(dirs){
  var nameReg = /^[a-z0-9]/i;
  var ret = [];
  dirs.forEach(function(v,i){
    if(v.match(nameReg)){
      ret.push(v);
    }
  });
  return ret;
};

exports.extendProjs = checkDirsExceptDSStore(fs.readdirSync(base));
exports.emitter = emitter;

// 监听目录 /extends 下的新工程
// 只监听 “添加新工程” 事件
exports.exec = function(cache,template,mock,MidProxy,log){
  var self = this;
  // 监听该目录
  // 只涉及新的extends工程加载，如果其中一个extends工程发生改变，
  // 在这里不会做处理仍然引用缓存模块
  fs.watch(base,function(event){
    // 创建新的目录
    var projs;
    var oldProjs = self.extendProjs;
    if(event && event == 'rename'){
      projs = fs.readdirSync(base);
      projs = checkDirsExceptDSStore(projs);
      // 更新当前的extendsProj数组
      self.extendProjs = projs;

      // 取两数组的差集
      projs = _.difference(projs,oldProjs);

      // 预处理编译模板
      projs.forEach(function(proj,i){
        var loc = path.join(base,proj,'pre');
        var viewLoc = path.join(base,proj,'views/mobile');
        try{
          if(fs.existsSync(loc) && fs.existsSync(path.join(loc,'index.js'))){
            var m = require(loc);
            m && m.preHandle && m.preHandle(cache,template,viewLoc);
          }
        }catch(e){
          log.error('require module error! message: '+ e.stack);
        }
      });

      // 初始化新加载extends工程的API
      projs.forEach(function(proj){
        var loc = path.join(base,proj,'api',mock);
        var jsons;
        try{
          jsons = fs.readdirSync(loc);
          jsons = checkDirsExceptDSStore(jsons);
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
      });

      // 触发'extendsAdd'事件
      setTimeout(function(){
        emitter.emit('extendsAdd',{
          projs: projs
        });
      },100);

    }
  });
};

exports.listenTemplate = function(){
  watch(path.join(process.cwd(),'extends'),function(e){
    var type = e.type;
    var fstype = e.fstype;
    var filename = e.filename;

    if(fstype !== 'file')
      return;

    if(path.extname(filename) !== '.tmpl')
      return;

    var projs = fs.readdirSync(base);
    projs = checkDirsExceptDSStore(projs);
    switch (type){
      case 'create':
        // 触发'templateAdd'事件
        emitter.emit('templateChange',{
          filename: filename,
          type: 'Add',
          projs: projs
        });
        break;

      case 'updated':
        // 触发'templateUpdate'事件
        emitter.emit('templateChange',{
          filename: filename,
          type: 'Update',
          projs: projs
        });
        break;

      case 'delete':
        // 触发'templateDelete'事件
        emitter.emit('templateChange',{
          filename: filename,
          type: 'Delete',
          projs: projs
        });
        break;
    }

    console.dir('templateChange...')
  });
};
