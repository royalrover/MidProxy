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
  log.info('Nginx心跳检查');
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
 * @request /m
 * @description 首页渲染。
 * 之前使用vm渲染时，在contrllor端给model对象添加了“pageName”属性，
 * 标识每个页面，用于定制化公共头
 */
router.get('/m',function* (next){
//  console.time('router/m/');
  var proxy = MidProxy.create( 'Mobile.*' );
  var app = this.app,
    self = this;

  // 目前的实现中，服务端会添加隐藏表单域_synToken
  proxy
    .getInfo({name: 'uangdksdkjk',test: true,bar: 'too'})
    .withCookie(this.request.header['cookie']);

//  console.time('Block Req');
  // ret format:
  // [data1,data2,data3 ... [cookie]]

  // 第一种获取异步结果方式：
  // TODO: 修改thunkify的执行上下文
  // var done = thunkify(proxy.done,proxy);
  //  var ret = yield done();

  // 第二种获取异步结果方式：
  var ret = yield new Promise(function(resolve,reject){
    proxy._done(resolve,reject);
  });

//  console.timeEnd('Block Req');

  var renderObj,html = '';
  renderObj = {
    commonEnv: app.EnvConfig['common_dev']
  };

  if(ret instanceof Error){
    app.error50x.call(this,ret);
    yield* next;
    return;
  }else{
    renderObj = {
      homePage: ret[0].data,
      title: ret[0].data.pageBO.title,
      pageName: 'homepage',
      commonEnv: app.EnvConfig['common_' + app.env],
      channelEnv: app.EnvConfig['channel_' + app.env],
      itemId: null,
      useWXSDK: true,
      isApp: this.ua.isApp,
      login: ret[0].login,
      switchToNew: true, //WAP2.0一期开关
      service: this.request.hostname,
      loginRedirectUri: this.request.path,
      hasSwitch: true, // 显示电脑端和移动端切换的footer部分，用在公共脚部,
      serverTime: new Date(ret[0].data.now).getTime(), // 用于首页限时特卖倒计时
      endTime: ret[0].data.grouponVOs.length && new Date(ret[0].data.grouponVOs[0]['endTime']).getTime() //用于首页限时特卖倒计时
    };

    try {

      var segs = yield new Promise(function(res,rej){
        async.parallel([
          function(cb){
            redisUtil.getRedis('f2e_commonBasicHeadRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'routes/index'});
              var ret;
              try{
                ret = fn.call(template.utils,renderObj);
                fn = null;
              }catch(e){
                cb(e);
              }

              cb(null,ret);
            },function(err){
              cb(err);
            });
          },
          function(cb){
            redisUtil.getRedis('f2e_commonHeaderRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'routes/index'});
              var ret;
              try{
                ret = fn.call(template.utils,renderObj);
                fn = null;
              }catch(e){
                cb(e);
              }
              cb(null,ret);
            },function(err){
              cb(err);
            });
          },
          function(cb){
            redisUtil.getRedis('f2e_channelHomePageRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'routes/index'});
              var ret;
              try{
                ret = fn.call(template.utils,renderObj);
                fn = null;
              }catch(e){
                cb(e);
              }
              cb(null,ret);
            },function(err){
              cb(err);
            });
          },
          function(cb){
            redisUtil.getRedis('f2e_commonFooterRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'routes/index'});
              var ret;
              try{
                ret = fn.call(template.utils,renderObj);
                fn = null;
              }catch(e){
                cb(e);
              }
              cb(null,ret);
            },function(err){
              cb(err);
            });
          },
          function(cb){
            redisUtil.getRedis('f2e_channelFootRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'routes/index'});
              var ret;
              try{
                ret = fn.call(template.utils,renderObj);
                fn = null;
              }catch(e){
                cb(e);
              }
              cb(null,ret);
            },function(err){
              cb(err);
            });
          }
        ],function(err,rets){
          if(err){
            res([err]);
          }

          rets.forEach(function(seg){
            html += seg.toString();
          });

          // 返回数据
          res([null,html]);
        });
      });

      if(segs[0]){
        throw segs[0];
      }
    }catch(e){
      app.error50x.call(self,e);
      yield* next;
      return;
    }

  }

  this.type = 'html';

  // 设置set-cookie
  app.setCookie(ret,self);

  // 方法一，实现Readable的子类View
  var stream = new View();
  stream.end(html);
  this.body = stream;
//  console.timeEnd('router/m/');
  // 方法二，使用Stream类
  //var through = require('through');
  //var s = through();
  // through对象的逻辑是，创建一个flowing的读写流，一旦调用
  // write（end）函数，立即出发data事件，除非调用pause函数
  // 切换读模式，因此进行异步注入数据
  //process.nextTick(function(){
  //  s.write(html);
  //});

  //this.body = s;
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
Extends.log = log;
Extends.lodash = _;

// 默认只提供两种请求，即get和post
Extends.use = function(urlPattern,ops){
  if(!ops || typeof ops !== 'object'){
    log.error('params must be an Object!');
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
