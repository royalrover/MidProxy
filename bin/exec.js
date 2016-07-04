'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var cfork = require('cfork');
var logger = require('../lib/log4js/logger');

var pids = [];
cfork({
  exec: path.join(__dirname, '../app.js'),
  duration: 60000,
  args: [process.argv[3],process.argv[4]] // midProxy运行环境  cmd: node bin/exec.js -e dev online(mock)
})
  .on('fork', function (worker) {
    var pid = worker.process.pid;
    if(pids.indexOf(pid) == -1){
      pids.push(pid);
    }
    logger.info('[' + Date() + '] [worker:' + pid + '] new worker start');
    console.log('fork....');
    console.dir(pids);
    //fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
    //  if(err){
    //    logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when fork state');
    //  }
    //});
  })
  .on('listening', function (worker, address) {
    logger.info('[' + Date() + '] [worker:'+ worker.process.pid +'] listening on '+ address.port);
  //  process.send('listening');
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
console.log('exit....');
console.dir(pids);
    fs.writeFile('tmp/pids',JSON.stringify(pids),'utf8',function(err){
      if(err){
        logger.error('[' + Date() + '] [worker:' + pid + '] pid serialize error when exit state');
      }
    });
    var err = new Error(util.format('worker '+ cid +' died (code: '+ exitCode +', signal: '+ signal +', suicide: '+ worker.suicide +', state: '+ worker.state +')'));
    err.name = 'WorkerDiedError';
    logger.error('['+ Date() +'] [master:'+ process.pid +'] worker exit: '+ err.stack);
  });

process.once('SIGTERM', function () {
  process.exit(0);
});