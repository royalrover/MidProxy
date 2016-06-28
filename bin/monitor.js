'use strict';

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