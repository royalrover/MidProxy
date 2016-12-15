var fs = require('fs');
var path = require('path');
var net = require('net');
var ZK = require('./node-zookeeper-client-promisy.js');
var ZKContant = require ("node-zookeeper-client").CreateMode;
var logger = require('../../lib/log4js/logger');

var env = process.argv[4];
var zkConfig;

switch(env){
  case 'release':
    zkConfig = require('./zookeeper.release.json');
    break;
  case 'preview':
    zkConfig = require('./zookeeper.preview.json');
    break;
  case 'test':
    zkConfig = require('./zookeeper.test.json');
    break;
  default:
    zkConfig = require('./zookeeper.test.json');
}

var createZkClient = function(){
  var client = new ZK(zkConfig.connect,zkConfig.config);
  client.on('expired',function(){
    logger.trace('session expired!!!');
    // 关闭上次回话的中的监控
    process.monitSwitch = false;
    var newClient = createZkClient();

    setTimeout(function(){
      // 清除监控循环
      client = null;
      restore(newClient);
      logger.trace('session expired then reconnect!!!');
    },10000);

  });

  client.on('disconnected',function(){
    logger.trace('zkClient disconnected!!!');
  });
  return client;
};

var getLocalIP = function(callback) {
  var socket = net.createConnection(80, 'www.showjoy.com');
  socket.on('connect', function() {
    callback(undefined, socket.address().address);
    socket.end();
  });
  socket.on('error', function(e) {
    callback(e, 'error');
  });
};

var zkClient = createZkClient();

var localIp;

// 获取本机ip并创建对应的主进程Znode节点
var actions = function(zkClient){
  return new Promise(function(res,rej){
    getLocalIP(function(e,ip){
      if(e){
        rej(e);
        return;
      }
      process.localIP = ip;
      res(ip);
    });
  })
    .then(function(ip){
      exports.ip = localIp = ip;
      zkClient.connect();
      zkClient.on_connected();
    })
    .then(function(){
      return zkClient.exists('/midproxy/info/' + localIp);
    })
    .then(function(stat){
      if(stat){
        return zkClient.exists('/midproxy/info/' + localIp + '/isAlive')
          .then(function(stat){
            if(!stat){
              return zkClient.create('/midproxy/info/' + localIp + '/isAlive',new Buffer('1'),ZKContant.EPHEMERAL).
                then(function(){
                  return zkClient.create('/midproxy/info/' + localIp + '/master',new Buffer(process.pid + ''),ZKContant.EPHEMERAL);
                });
            }
          });
      }
      return zkClient.create('/midproxy/info/' + localIp,null).
        then(function(){
          // 使用 /isAlive 叶子节点标识当前主机ip节点是否存活
          return zkClient.create('/midproxy/info/' + localIp + '/isAlive',new Buffer('1'),ZKContant.EPHEMERAL);
        }).
        then(function(){
          return zkClient.create('/midproxy/info/' + localIp + '/master',new Buffer(process.pid + ''),ZKContant.EPHEMERAL);
        });
    })
    .catch(function(e){
      logger.error('ZooKeeper module error code when action: ' + e);
    });
};

var restore = function(zkClient){
  return new Promise(function(res,rej){
    getLocalIP(function(e,ip){
      if(e){
        rej(e);
        return;
      }
      process.localIP = ip;
      res(ip);
    });
  })
    .then(function(ip){
      exports.ip = localIp = ip;
      zkClient.connect();
      zkClient.on_connected();
    })
    .then(function(){
      return zkClient.exists('/midproxy/info/' + localIp);
    })
    .then(function(stat){
      if(stat){
        return zkClient.exists('/midproxy/info/' + localIp + '/isAlive')
          .then(function(stat){
            if(!stat){
              return zkClient.create('/midproxy/info/' + localIp + '/isAlive',new Buffer('1'),ZKContant.EPHEMERAL).
                then(function(){
                  return zkClient.create('/midproxy/info/' + localIp + '/master',new Buffer(process.pid + ''),ZKContant.EPHEMERAL);
                });
            }
          });
      }
      return zkClient.create('/midproxy/info/' + localIp,null).
        then(function(){
          // 使用 /isAlive 叶子节点标识当前主机ip节点是否存活
          return zkClient.create('/midproxy/info/' + localIp + '/isAlive',new Buffer('1'),ZKContant.EPHEMERAL);
        }).
        then(function(){
          return zkClient.create('/midproxy/info/' + localIp + '/master',new Buffer(process.pid + ''),ZKContant.EPHEMERAL);
        });
    })
    // 构建worker节点
    .then(function(){
      return new Promise(function(res,rej){
        var pids = JSON.parse(fs.readFileSync('tmp/pids','utf8'));
        var tx = zkClient.transaction();
        var pid;
        for(var i=0,len=pids.length;i<len;i++){
          pid = pids[i];
          tx = tx.create('/midproxy/info/' + localIp + '/worker:' + pid,new Buffer(pid + ''),ZKContant.EPHEMERAL);
        }
        tx.commit(function(e,results){
          if(e){
            rej(e);
            return;
          }
          res(results);
        });
      });
    })
    .then(function(){
      process.monitSwitch = true;
      var monitor = require('./monitor');
      monitor.monit({
        zkClient: zkClient,
        ip: localIp
      });
    })
    .catch(function(e){
      logger.error('ZooKeeper module error code when restore: ' + e);
    });
};

exports.promise = actions(zkClient);

exports.zkClient = zkClient;
exports.Contant = ZKContant;