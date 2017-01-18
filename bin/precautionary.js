'use strict';

// 预警模块，该模块单独用一个进程（非子进程）运行，采用 domain socket方式与master进程通信
var path = require('path');
var fs = require('fs');
var nodemailer = require('nodemailer');
var DomainServer = require('./lib/domainSocket/Server');
var oldTimeCaution = {
  timestamp: 0,
  cpu: 0,
  memory: 0
},oldTimeDanger = {
  timestamp: 0,
  cpu: 0,
  memory: 0
};
var cautionInterval = 30 * 60 * 1000; // 半小时
var dangerInterval = 30 * 60 * 1000;
// 日志
require('midlog')(require('../lib/log4js/midlog.json'));

var domainServer = new DomainServer();
domainServer.listen(function(){
  logger.info('DOMAIN_SERVER IS LISTENING...');
});

domainServer.on('message',function(message,client){
  if(message.type == 'heapdump'){
    let timestamp = message.time;
    if(message.grade == 'caution'){
      // 做节流，防止workers在短时间内连续多次打点堆快照
      if(timestamp - oldTimeCaution.timestamp >= cautionInterval){
        // 为了在log系统中查看，当做错误处理
        logger.error('Memory Caution!! IP: ' + message.ip + ',PID: ' + message.pid +',mem: ' + message.memory/(1024 * 1024) +
          'MB, CPU usage: ' + message.cpu + '!');

        oldTimeCaution.timestamp = timestamp;
        oldTimeCaution.cpu = message.cpu;
        oldTimeCaution.memory = message.memory;
        client.send({
          type: 'heapdump',
          ip: message.ip,
          pid: message.pid,
          grade: 'caution'
        });
      }
    }else if(message.grade == 'danger'){
      if(timestamp - oldTimeDanger.timestamp >= dangerInterval){
        logger.error('Memory Danger!! IP: ' + message.ip + ',PID: ' + message.pid +',mem: ' + message.memory/(1024 * 1024) +
          'MB, CPU usage: ' + message.cpu + '!');

        oldTimeDanger.timestamp = timestamp;
        oldTimeDanger.cpu = message.cpu;
        oldTimeDanger.memory = message.memory;
        client.send({
          type: 'heapdump',
          ip: message.ip,
          pid: message.pid,
          grade: 'danger'
        });
      }
    }
  }else if(message.type == 'dumpover'){
    // 发送邮件
    let transporter = nodemailer.createTransport({
      service: '126',
      auth: {
        user: 'node_mailer_yuxiu@126.com',
        pass: 'yangli38' // 此处为 客户端认证密码，与登录密码不同（登录密码：yangli46）
      }
    });

    let cpu = message.grade == 'caution' ? oldTimeCaution.cpu : oldTimeDanger.cpu;
    let memory = message.grade == 'caution' ? oldTimeCaution.memory : oldTimeDanger.memory;
    let mailOptions = {
      from: 'node_mailer_yuxiu@126.com', // sender address
      to: 'yuxiu@showjoy.com', // list of receivers
      subject: 'DANGER OF MIDPROXY WORKER-' + message.grade.toUpperCase(), // Subject line
      html: '<h2>MIDPROXY ' + message.grade.toUpperCase() + ' OF <i>' + message.ip + '</i> <strong>WORKER_' + message.pid + '</strong></h2>' +
      '<p>cpu usage: ' + cpu + '</p>' +
      '<p>memory: ' + memory + 'MB</p>',
      attachments: [
        {
          filename: path.basename(message.path),
          path: message.path
        }
      ]
    };

    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        logger.error(error.stack);
      }

      // 删除堆快照
      fs.unlinkSync(message.path);
    });
  }

});

process.on('uncaughtException',function(e){
  logger.error('PRECAUTIONARY PROCESS ERROR: ' + e.message + ' \n' + e.stack);
});