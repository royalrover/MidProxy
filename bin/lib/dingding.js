'use strict';

var https = require('https');

module.exports = function(opts){
  // 获取access_token
  var p = new Promise(function(resolve,reject){
    let req = https.request({
      hostname: 'oapi.dingtalk.com',
      port: 443,
      path: '/gettoken?corpid=dingb0913a20008ab31435c2f4657eb6378f&corpsecret=Vvmt6n7xzOsNuLzRqJBROG21u1tTdyntM3vtndmkDQozCY7tCQwDAFRkXBoPZkhe',
      method: 'GET'
    }, function(res){
      res.on('data', function(d) {
        resolve(d.toString());
      });
    });

    req.on('error',function(err){
      reject(err);
    });

    req.end();
  })
    .then(function(res){
      return new Promise(function(resolve,reject){

        let req = https.request({
          hostname: 'oapi.dingtalk.com',
          port: 443,
          path: '/message/send?access_token=' + JSON.parse(res).access_token,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }, function(res){
          res.on('data', function(d) {
            resolve(d.toString());
          });
        });

        req.on('error',function(e){
          reject(e);
        });

        req.end(JSON.stringify({
          // 用户id（欲休）
          touser: '03560809476122',
          // 应用id
          "agentid":"74990578",
          "msgtype": "oa",
          "oa":{
            "message_url": "http://mail.showjoy.com",
            "pc_message_url": "http://mail.showjoy.com",
            "head": {
              "bgcolor": "FFFF6666",
              "text": "监控告警"
            },
            "body": {
              "title": 'DANGER OF MIDPROXY WORKER',
              "form": [
                {
                  "key": "告警级别:",
                  "value": opts.message.grade.toUpperCase()
                },
                {
                  "key": "IP:",
                  "value": opts.message.ip
                },
                {
                  "key": "PID:",
                  "value": opts.message.pid
                },
                {
                  "key": "CPU Usage:",
                  "value": opts.cpu
                },
                {
                  "key": "memory Usage:",
                  "value": opts.memory
                }
              ],
              "file_count": "1",
              "author": 'MidProxy监控告警系统'
            }
          }
        }))
      });
    });
};

