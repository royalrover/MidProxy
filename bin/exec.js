'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var cfork = require('cfork');
var nodemailer = require('nodemailer');
var midlog = require('midlog');
var cpus = require('os').cpus().length;
// 配置日志
midlog(require('../lib/log4js/midlog.json'));
var zk = require('./lib/zk2');
var contant = zk.Contant;
var pids = [];
var count = 0;
// 跨进程通信客户端
var DomainClient = require('./lib/domainSocket/Client');
global.domainClient = new DomainClient();
// 分布式节点(不包括本机)
global.globalNodesWithoutLocal = [];

var _start = function(zkClient){
  var cluster = cfork({
    exec: path.join(__dirname, '../app.js'),
    duration: 60000,
    args: [process.argv[3],process.argv[4]] // midProxy运行环境  cmd: node bin/exec.js -e dev online
  })
    .on('fork', function (worker) {
      var pid = worker.process.pid;
      if(pids.indexOf(pid) == -1){
        pids.push(pid);
      }

      // 创建znode临时节点
      zkClient.exists('/midproxy/info/' + zk.ip + '/master')
        .then(function(stat){
          return zkClient.create('/midproxy/info/' + zk.ip + '/worker:' + pid,new Buffer(pid + ''),contant.EPHEMERAL);
        })
        .then(function(){

        },function(e){
          logger.error('znode create Error when fork worker:' + pid + ',' + e);
        });

      count++;
      logger.info('[' + Date() + '] [worker:' + pid + '] new worker start');

      if(count == cpus){
        fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
          if(err){
            logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when fork state');
          }
        });
      }

      // 每fork一个子进程，都侦听message事件，处理内存打点和邮件发送
      worker.on('message',function(message){
        switch(message.type){
          case 'heapdump':
            if(message.success == 1){
              domainClient.send({
                type: 'dumpover',
                ip: message.ip,
                pid: message.pid,
                path: message.dumpPath,
                success: 1,
                grade: message.grade
              });
            }
            break;

          // 请求容灾，交付给其他主机的服务器,发送所有主机节点给worker
          /*case 'recovery':
            worker.send({
              type: 'nodes',
              // 再次请求本地主机IP
              nodes: globalNodesWithoutLocal
            });
            break;*/
        }


      });
    })
    .on('listening', function (worker, address) {
      logger.info('[' + Date() + '] [worker:'+ worker.process.pid +'] listening on '+ address.port);
    })
    .on('disconnect', function (worker) {
      logger.info('[' + Date() + '] [master:' + process.pid + '] worker:' + worker.process.pid + ' disconnect, suicide: '+ worker.suicide +', state: '+ worker.state +'.');
    })
    .on('exit', function (worker, code, signal) {
      var exitCode = worker.process.exitCode;
      var cid = worker.process.pid,ind = pids.indexOf(cid);
      if(ind !== -1){
        pids.splice(ind,1);
      }

      // 删除对应的znode节点
      zkClient.exists('/midproxy/info/' + zk.ip + '/master').
        then(function(stat){
          if(stat){
            return zkClient.remove('/midproxy/info/' + zk.ip + '/worker:' + cid,-1)
              .then(function(){},function(pathOrErrNo){
                logger.error("delete znode error!  " + pathOrErrNo);
              });
          }
        });

      fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
        if(err){
          logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when exit state');
        }
      });
      var err = new Error(util.format('worker '+ cid +' died (code: '+ exitCode +', signal: '+ signal +', suicide: '+ worker.suicide +', state: '+ worker.state +')'));
      err.name = 'WorkerDiedError';
      logger.error('['+ Date() +'] [master:'+ process.pid +'] worker exit: '+ err.stack);
    });

  process.workers = cluster.workers;
  // TODO: 恢复阶段 需要再次监控
  var monitor = require('./lib/monitor');
  monitor.monit(zk,domainClient,'init');
};

// 获取分布式服务节点
var getNodes = function(path,zk){
  var localIP = zk.ip;

  // 使用一次性的watcher做监控
  zk.zkClient.getChildren(path,function(event){
    getNodes(path,zk);
  }).
    then(function(children){
      globalNodesWithoutLocal = [];
      children.forEach(function(ip){
        if(ip !== localIP){
          globalNodesWithoutLocal.push(ip);
        }
      });
      for(let i in process.workers){
        let worker = process.workers[i];
        // In a worker, this function will close all servers, wait for the 'close' event on those servers,
        // and then disconnect the IPC channel.
        worker.send({
          type: 'nodes',
          nodes: globalNodesWithoutLocal
        })
      }
    },function(err){
      logger.error('zk getChildren encouter error! ' + err.stack);
    });
};

zk.promise.then(function(){
  _start(zk.zkClient);
  getNodes('/midproxy/info',zk);
});

process.once('SIGTERM', function () {
  // todo: 需要遍历子进程一次关闭
  for(let i in process.workers){
    let worker = process.workers[i];
    // In a worker, this function will close all servers, wait for the 'close' event on those servers,
    // and then disconnect the IPC channel.
    worker.disconnect();
  }
  process.exit(0);
});

process.on('uncaughtException',function(e){
  logger.error(e)
})