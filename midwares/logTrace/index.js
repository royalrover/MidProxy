/**
 * @function req请求日志记录
 */
var path = require('path');
var log = require(path.join(process.cwd(),'/lib/log4js/logger'));

exports.trace = function* (next){
  var d = new Date();

  log.info('received a request[id=' + this.id + ',path='+ this.path + this.search +'] at ' + d.toLocaleTimeString() + ' on ' + d.toLocaleDateString() );
  log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] visited by ' + (this.ua.isMobile ? 'mobilePhone[use in ' +
    (this.ua.isAndroid ? 'Android]' : this.ua.isIos ? 'IOS]' : this.ua.isWeixin ? 'weixin]' : this.ua.isApp ?
    'App]' : this.ua.isWebKit ? 'WebKit]' : 'others]') : 'pc]') );

  yield* next;

  // 记录每个请求的响应时间
  log.trace('responding a request[id=' + this.id + ',path='+ this.path + this.search  + '] use ' + this.response.header['x-response-time']);
};