'use strict';

var pidusage   = require('pidusage');
var async = require('async');
var fs = require('fs');
var logger = require('../../lib/log4js/logger');

var CAUTION = 838860800; // 800MB
var DANGER = 1258291200; // 1.2GB

exports.monit = function(zk,domainClient){
  if(!zk)
    return;
  var zkClient = zk.zkClient;
  var localIp = zk.ip;
  var zkRoot = '/midproxy/info/' + localIp;

  // 接收来自预警进程的消息，通知对应workers打点堆镜像
  domainClient.on('message',function(message){
    if(message.type == 'heapdump'){
      for(let i in process.workers){
        let worker = process.workers[i];
        if(worker.process.pid == message.pid){
          worker.send({
            type: 'heapdump',
            ip: message.ip,
            grade: message.grade
          });
          break;
        }
      }
    }
  });

  (function _query(){
    zkClient.getChildren(zkRoot)
      .then(function(children){
        if(!children instanceof Array){
          return [];
        }

        var ret = [];
        children.forEach(function(v){
          if(v.indexOf('worker') !== -1){
            ret.push(v.split(':')[1]);
          }
        });

        return ret;
      })
      .then(function(data){
        async.map(data, function(item,cb){
          pidusage.stat(item,function(e,stat){
            if(e){
              logger.error('pidusage exec wrong,' + e.stack);
              return;
            }
            var it = {
              pid: item,
              monit: {
                cpu: Math.floor(stat.cpu),
                memory: Math.floor(stat.memory)
              }
            };

            // 单独隔离成一个模块
            if(it.monit.memory >= CAUTION && it.monit.memory < DANGER){

              // TODO：打点堆快照，做对比使用！
              for(let wid in process.workers){
                let worker = process.workers[wid];
                if(worker.process.pid == it.pid){
                  domainClient.send({
                    type: 'heapdump',
                    ip: localIp,
                    pid: it.pid,
                    grade: 'caution',
                    time: new Date().getTime(),
                    memory: it.monit.memory/(1024 * 1024),
                    cpu: it.monit.cpu + '%'
                  });
                  break;
                }
              }

            }else if(it.monit.memory >= DANGER){
              // 1，打点堆镜像，需通过IPC与子进程通信
              // 2，发送提醒邮件
              for(let wid in process.workers){
                let worker = process.workers[wid];
                if(worker.process.pid == it.pid){
                  domainClient.send({
                    type: 'heapdump',
                    ip: localIp,
                    pid: it.pid,
                    grade: 'danger',
                    time: new Date().getTime(),
                    memory: it.monit.memory/(1024 * 1024),
                    cpu: it.monit.cpu + '%'
                  });
                  break;
                }
              }

            }

            // 修改znode节点数据
            zkClient.setData(zkRoot + '/worker:' + item,new Buffer(JSON.stringify(it.monit))).
              then(function(){
                // 传参
                cb(null,it);
              },function(e){
                // 传参
                cb(e);
              });

          });
        }, function(err){
          if(err){
            logger.error('monitor encounter an error,' + err + ' ' + err.stack);
            return;
          }

          var loop = function(){
            // 全局变量
            setTimeout(function(){
              if(process.monitSwitch == undefined || process.monitSwitch == true){
                _query();
              }
            },10000);
          };

          loop();
        });
      });
  })();

};

