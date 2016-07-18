'use strict';

var MidProxy = require('../../../lib/proxy/midproxy');

exports.bind = function(router){
  router.get('/api/shop/getConditions', function* (){
    var proxy = MidProxy.create('Shop.*'),ret;
    proxy
      .getConditions();

    ret = yield new Promise(function(resolve,reject){
      proxy._done(resolve,reject);
    });
    this.set({
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    });
    this.body = ret[0];
  });

  router.post('/api/shop/upgrade', function* (){
    var proxy = MidProxy.create('Shop.*'),ret;
    proxy
      .upgrade();

    ret = yield new Promise(function(resolve,reject){
      proxy._done(resolve,reject);
    });
    this.set({
      'cache-control': 'no-cache',
      'content-type': 'application/json'
    });
    this.body = ret[0];
  });
};
