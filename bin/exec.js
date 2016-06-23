'use strict';

var path = require('path');
var util = require('util');
var cfork = require('cfork');
var logger = require('../lib/log4js/logger');

cfork({
  exec: path.join(__dirname, '../app.js'),
  duration: 60000
})
  .on('fork', function (worker) {
    logger.info('[' + Date() + '] [worker:' + worker.process.pid + '] new worker start');
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
    var err = new Error(util.format('worker '+ worker.process.pid +' died (code: '+ exitCode +', signal: '+ signal +', suicide: '+ worker.suicide +', state: '+ worker.state +')'));
    err.name = 'WorkerDiedError';
    logger.error('['+ Date() +'] [master:'+ process.pid +'] worker exit: '+ err.stack);
  });

process.once('SIGTERM', function () {
  process.exit(0);
});