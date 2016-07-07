var MidProxy = require('../lib/proxy/midproxy');
var router = require('koa-router')();
var path = require('path');
var template = require('art-template');
var thunkify = require('thunkify');
var log = require(path.join(process.cwd(),'/lib/log4js/logger'));
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;

template.config('extname', '.tmpl');

// 之前使用vm渲染时，在contrllor端给model对象添加了“pageName”属性，
// 标识每个页面，用于定制化公共头
router.get('/m',function* (next){
  console.time('router/m/');
  var ctx = this;
  var proxy = MidProxy.create( 'Mobile.*' );
  // 目前的实现中，服务端会添加隐藏表单域_synToken
  proxy
    .getInfo({name: 'uangdksdkjk',test: true,bar: 'too'})
//    .getWechatInfo()
    .withCookie(this.request.header['cookie']);

  console.time('Block Req');
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

  console.timeEnd('Block Req');

  var renderObj,html;
  renderObj = {
    commonEnv: this.EnvConfig['common_dev']
  };

  if(ret instanceof Error){
    html = this._cache._commonError50xRender(renderObj);
  }else{
    renderObj = {
      homePage: ret[0].data,
    //  wxJsSdkConfig: ret[1].data,
      pageName: 'homepage',
      commonEnv: this.EnvConfig['common_' + this.env],
      channelEnv: this.EnvConfig['channel_' + this.env],
      itemId: null,
      useWXSDK: true,
      isApp: this.isApp,
      login: ret[0].login,
      switchToNew: true, //WAP2.0一期开关
      service: this.request.hostname,
      loginRedirectUri: this.request.path,
      hasSwitch: true, // 显示电脑端和移动端切换的footer部分，用在公共脚部,
      serverTime: new Date(ret[0].data.now).getTime(), // 用于首页限时特卖倒计时
      endTime: ret[0].data.grouponVOs.length && new Date(ret[0].data.grouponVOs[0]['endTime']).getTime() //用于首页限时特卖倒计时
    };

    try {
      html = this._cache._commonBasicHeadRender(renderObj) + this._cache._commonHeaderRender(renderObj)
        + this._cache._channelHomePageRender(renderObj)
        + this._cache._commonFooterRender(renderObj) + this._cache._channelFootRender(renderObj);
      log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] template render with commonBasicHead,commonHeader,channelHomePage,commonFooter and channelFoot');
    }catch(e){
      log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error when use some templates among commonBasicHead,commonHeader,channelHomePage,commonFooter and channelFoot');
      renderObj = {
        commonEnv: this.EnvConfig['common_dev']
      };

      html = this._cache._commonError50xRender(renderObj);
      log.error('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error, ' + e.message);
    }

  }

  this.type = 'html';

  // 方法一，实现Readable的子类View
  var stream = new View();
  stream.end(html);
  this.body = stream;
  console.timeEnd('router/m/');
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

router.get('/getWechatConfig',function* (){
  console.time('router/getWechatConfig/');
  var ctx = this;
  var proxy = MidProxy.create( 'Mobile.*' );
  var ret;
  // BigPipe形式出发wechat配置
  console.time('asyncWechatConfig')
  proxy
    .getWechatInfo();

  ret = yield new Promise(function(resolve,reject){
    proxy._done(resolve,reject);
  });
  console.timeEnd('asyncWechatConfig')
  this.set({
    'cache-control': 'no-cache',
    'content-type': 'application/javascript'
  });
  this.body = 'd.do("wechatConfig-ready",'+ JSON.stringify(ret[0].data) +')';
  console.timeEnd('router/getWechatConfig/');
});

router.get('/',function* (){
  log.info('Nginx心跳检查');
  this.body = 'hello world';
});

module.exports = router;
