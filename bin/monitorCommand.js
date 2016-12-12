'use strict';

// 设置全局每个EventEmitter实例的最大Handler为200
// 在侦听多个进程的资源利用率时，loop循环中
require('events').EventEmitter.prototype._maxListeners = 200;
var pidusage   = require('pidusage');
var async = require('async');
var fs = require('fs');
var monitor = require('../lib/monit/monit.js');

monitor.init();
var pro = new Promise(function(resolve,reject){
  fs.readFile('tmp/pids','utf8',function(err,data){
    if(err){
      reject(err);
    }else{
      resolve(JSON.parse(data));
    }
  });
});

var processes = [];
pro.then(function(data){
  var query = function(){
    async.map(data, function(item,cb){
      pidusage.stat(item,function(e,stat){
        if(e){
          console.log('pidusage exec wrong...');
          return;
        }
        var it = {
          pid: item,
          monit: {
            cpu: Math.floor(stat.cpu),
            memory: Math.floor(stat.memory)
          }
        };
        processes.push(it);

        // 传参
        cb(null,it);
      });
    }, function(err,res){
      if(err){
        console.log('monitor encounter an error...');
        return;
      }
      //console.dir(res);
      var loop = function(){
        monitor.refresh(res);
        setTimeout(function(){
          query();
        },300);
      };

      loop();
    });
  };

  query();
});