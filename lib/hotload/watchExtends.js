'use strict';

var Event = require('events');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var emitter = new Event.EventEmitter();
var base = path.join(process.currentCwd);
var watch = require('./watch');

var throttle = function(delay, action){
  var last = 0;
  return function(){
    var curr = +new Date();
    if (curr - last > delay){
      action.apply(this, arguments);
      last = curr;
    }
  }
};

var extendsAddEmitter = throttle(1000,function(){
  // 触发'extendsAdd'事件
  setTimeout(function(){

    // extendsAdd事件废弃
    emitter.emit('extendsAdd',{
    });
  },100);
});

exports.emitter = emitter;

// 监听工程的模板、接口配置
exports.exec = function(cache,template,mock,MidProxy,log){
  var self = this;
  // 监听该目录
  // 只涉及新的extends工程加载，如果其中一个extends工程发生改变，
  // 在这里不会做处理仍然引用缓存模块
  watch(path.join(base,'api'),function(event){
    var type = event.type;
    var fstype = event.fstype;
    var filename = event.filename;
    var fullname = event.fullname;

    if(fstype !== 'file')
      return;

    try{
      // 新增配置文件
      if(path.extname(fullname) == '.json'){
        if(type == 'create'){
          MidProxy.init(fullname);
        }
      }
    }catch(e){
      log.error(e.message);
    }

    extendsAddEmitter();
  });
};

exports.listenTemplate = function(){
  watch(path.join(process.currentCwd,'views'),function(e){
    var type = e.type;
    var fstype = e.fstype;
    var filename = e.filename;
    var fullname = e.fullname;

    if(fstype !== 'file')
      return;

    if(path.extname(filename) !== '.tmpl')
      return;

    if(fstype !== 'file')
      return;

    // 新增配置文件
    if(path.extname(filename) == '.tmpl') {
      switch (type) {
        case 'create':
          // 触发'templateAdd'事件
          emitter.emit('templateChange', {
            filename: filename,
            type: 'Add',
            fullname: fullname
          });
          break;

        case 'updated':
          // 触发'templateUpdate'事件
          emitter.emit('templateChange', {
            filename: filename,
            type: 'Update',
            fullname: fullname
          });
          break;

        case 'delete':
          // 触发'templateDelete'事件
          emitter.emit('templateChange', {
            filename: filename,
            type: 'Delete',
            fullname: fullname
          });
          break;
      }
    }

  });
};
