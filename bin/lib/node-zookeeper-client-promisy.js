var ZooKeeper = require ("node-zookeeper-client");
var util = require('util');
var promise = require('./promise');

var ZKConstructor = ZooKeeper.createClient('127.0.0.1:8888').constructor;

function ZooKeeperPromise() {

  return ZKConstructor.apply(this, arguments);

}

util.inherits(ZooKeeperPromise, ZKConstructor);

ZooKeeperPromise.prototype.on_connected = function on_connected() {
  var self = this;
  var deferred = promise.defer();
  self.once ('connected', function () {
    deferred.resolve (self);
  });
  return deferred.promise;
};

function convertAsync(fn){
  return function() {
    var self = this;
    var deferred = promise.defer();
    arguments.length ++;
    arguments[arguments.length-1] = function(error, result){
      if(error) {
        deferred.reject(error);
      }else{
        deferred.resolve(result);
      }
    };
    fn.apply (self, arguments);
    return deferred.promise;
  };
}

for (var f in ZooKeeperPromise.prototype) {
  switch (f){
    case 'getState':
    case 'getSessionId':
    case 'getSessionPassword':
    case 'getSessionTimeout':
    case 'addAuthInfo':
    case 'create':
    case 'remove':
    case 'setData':
    case 'getData':
    case 'setACL':
    case 'getACL':
    case 'exists':
    case 'getChildren':
    case 'mkdirp':
      ZooKeeperPromise.prototype[f] = convertAsync (ZooKeeperPromise.prototype[f]);
      break;
  }
}


exports = module.exports = ZooKeeperPromise;
exports.ZK = ZooKeeperPromise; // backwards compatibility