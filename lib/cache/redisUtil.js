'use strict';

var path = require('path');
var config;
if(apiEnv == 'test'){
  config = require('./redisConfigTest.json');
}else if(apiEnv == 'online'){
  config = require('./redisConfigOnline.json');
}else if(apiEnv == 'preview'){
  config = require('./redisConfigPreview.json');
}else{
  config = require('./redisConfigTest.json');
}

var openClient = function () {
  var client = require('redis').createClient(config.port, config.address,{
    password: config.password,
    db: config.db
  });
  client.on('error', function (err) {
    logger.error('create connection for Redis error!\nerror: ' + err.stack);
  });
  return client;
};

var client = openClient();
module.exports.getRedis = function (key) {
  var prom = new Promise(function(res,rej){
    client.get(key, function (err, reply) {
      if (err){
        logger.error('Redis get the key "'+ key +'" error!\n error:' + err.stack);
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
        logger.error('Redis set the key "' + key + '" error! \nerror: ' + err.stack);
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
        logger.error('Redis del the key "'+ key +'" error!\n error:' + err.stack);
        rej(err);
      }

    //  client.quit();
      res(reply);
    });
  });

  return prom;
};