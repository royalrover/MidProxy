'use strict';

var path = require('path');
var config = require('./redisConfig.json');
var log = require(path.join(process.cwd(),'lib/log4js/logger'));

var openClient = function () {
  var client = require('redis').createClient(config.port, config.address,{password: config.password});
  client.on('error', function (err) {
    log.error('create connection for Redis error!\nerror: ' + err.stack);
  });
  return client;
};

var client = openClient();
module.exports.getRedis = function (key) {
  var prom = new Promise(function(res,rej){
    client.get(key, function (err, reply) {
      if (err){
        log.error('Redis get the key "'+ key +'" error!\n error:' + err.stack);
        rej(err);
      }

    //  client.quit();
      res(reply);
    });
  });

  return prom;
};
module.exports.setRedis = function (key, val) {
  var prom = new Promise(function(res,rej){
    client.set(key, val, function (err, reply) {
      if (err){
        log.error('Redis set the key "' + key + '" error! \nerror: ' + err.stack);
        rej(err);
      }

    //  client.quit();
      res(reply);
    });
  });

  return prom;
};
module.exports.delRedis = function(key){
  var prom = new Promise(function(res,rej){
    client.del(key, function (err, reply) {
      if (err){
        log.error('Redis del the key "'+ key +'" error!\n error:' + err.stack);
        rej(err);
      }

    //  client.quit();
      res(reply);
    });
  });

  return prom;
};