/**
 * description: 主控制器逻辑
 * @type {MidProxy|exports|module.exports}
 */
'use strict';

var MidProxy = require('../lib/proxy/midproxy');
var router = require('koa-router')();
var path = require('path');
var fs = require('fs');
var vm = require('vm');
var async = require('async');
var _ = require('lodash');
var template = require('art-template');
var thunkify = require('thunkify');
var http = require('http');
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;
template.config('extname', '.tmpl');

/**
 * @request /
 * @description 首页心跳检查
 */
router.get('/',function* (){
  this.status = 200;
  this.body = 'hello ShowJoy';
});

/**
 * @request /shopui
 * @description 首页心跳检查
 */
router.get('/shopui',function* (){
  this.status = 200;
  this.body = 'hello ShowJoy';
});

/**
 * @request /status
 * @description 心跳检查
 */
router.get('/status',function* (){
  this.logger.info('Nginx心跳检查');
  var proxy = MidProxy.create( 'Server.checkHeartbeat' );
  proxy
    .checkHeartbeat()
    .withCookie(this.request.header['cookie']);
  var ret = yield new Promise(function(resolve,reject){
    proxy._done(resolve,reject);
  });

  if(ret[0] == 'success'){
    this.status = 200;
    this.body = 'hello world';
  }else{
    this.status = 500;
    this.body = 'error';
  }
});

/**
 * @request /shop/getWechatConfig
 * @description 获取微信配置，采用BigPipe渲染
 */
router.get('/api/shop/getWechatConfig',function* (){
  var proxy = MidProxy.create( 'Mobile.*' );
  var ret;
  // BigPipe形式出发wechat配置
  proxy
    .getWechatInfo({
      url: this.querystring
    })
    .withCookie(this.request.header['cookie']);

  ret = yield new Promise(function(resolve,reject){
    proxy._done(resolve,reject);
  });

  // 微信配置接口异步请求错误，则触发“wechatConfig-error”事件，弹窗提醒
  if(ret instanceof Error){
    //  html = this._cache._commonError50xRender(renderObj);
    this.set({
      'cache-control': 'no-cache',
      'content-type': 'application/javascript'
    });
    this.body = 'd.do("wechatConfig-error",'+ JSON.stringify(ret) +')';
    return;
  }else{
    this.set({
      'cache-control': 'no-cache',
      'content-type': 'application/javascript'
    });
    this.body = 'd.do("wechatConfig-ready",'+ JSON.stringify(ret[0].data) +')';
  }

});


/**
 * @request /ticket_login
 * @description 打通OAuth2认证环节，针对302过来的"/ticket_login"请求，
 * MidProxy仅进行转发，并在接收响应后设置“set-cookie”并
 * 实现302跳转
 */
router.get('/ticket_login',function* (next){
  var proxy = MidProxy.create( 'OAuth.*')
    ,ret
    ,self = this,
    app = this.app;

  proxy
    .send(this.querystring)
    .withCookie(this.request.header['cookie']);

  ret = yield new Promise(function(resolve,reject){
    proxy._done(resolve,reject);
  });

  // 响应头
  this.type = 'html';

  // 设置set-cookie
  app.setCookie(ret,self);

  // 跳转
  app.redirect(ret.pop(),self);

  this.body = ret[0];
});


// 加载外挂包
var base = path.join(process.cwd(),'extends/');
var projs = fs.readdirSync(base);
projs = checkDirsExceptDSStore(projs);

var Extends = Object.create(router);
Extends.MidProxy =  MidProxy;
Extends.View =  View;
Extends.lodash = _;

// 默认只提供两种请求，即get和post
Extends.use = function(urlPattern,ops){
  if(!ops || typeof ops !== 'object'){
    logger.error('params must be an Object!');
    return;
  }
  var isGet = ops.method ? ops.method.toLowerCase() == 'get' ? true : false : true;
  ops.Extends = Extends;
  if(isGet){
    Extends.get(urlPattern,out(ops));
  }else{
    Extends[ops.method.toLowerCase()](urlPattern,out(ops));
  }
};

var load = function(projs){
  projs.forEach(function(proj){
    var loc = path.join(base,proj,'routes');
    var file = path.join(loc,'page');
    var api = path.join(loc,'api');
    var m;

    if(fs.existsSync(loc)){
      if(fs.existsSync(file) && fs.existsSync(path.join(file,'index.js'))){
        m = require(file);
        m && m.bind && m.bind(Extends);
      }
      // 加载page下的其他路由模块
      resolveOtherControllers(Extends,file);

      if(fs.existsSync(api) && fs.existsSync(path.join(api,'index.js'))){
        m = require(api);
        m && m.bind && m.bind(Extends);
      }
      // 加载api下的其他路由模块
      resolveOtherControllers(Extends,api);
    }
  });
};

load(projs);

module.exports = router;
