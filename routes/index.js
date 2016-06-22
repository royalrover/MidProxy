var MidProxy = require('../lib/proxy/midproxy');
var router = require('koa-router')();
var path = require('path');
var template = require('art-template');
var thunkify = require('thunkify');

template.config('extname', '.tmpl');

// 之前使用vm渲染时，在contrllor端给model对象添加了“pageName”属性，
// 标识每个页面，用于定制化公共头
router.get('/m',function* (next){
  var ctx = this;
  var proxy = MidProxy.create( 'Mobile.*' );
  // 目前的实现中，服务端会添加隐藏表单域_synToken
  proxy
    .getInfo()
    .getWechatInfo()
    .withCookie('abc=yangli');
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

  var renderObj,html;

  if(ret instanceof Error){
    renderObj = {
      commonEnv: this.EnvConfig['common_dev']
    };

    html = this._cache._commonError50xRender(renderObj);
  }else{
    renderObj = {
      homePage: ret[0].data,
      wxJsSdkConfig: ret[1].data,
      pageName: 'homepage',
      commonEnv: this.EnvConfig['common_dev'],
      channelEnv: this.EnvConfig['channel_dev'],
      itemId: null,
      useWXSDK: true,
      isApp: this.isApp,
      login: ret[0].login,
      switchToNew: true, //WAP2.0一期开关
      service: "http://m.showjoy.com",
      loginRedirectUri: "/",
      hasSwitch: true, // 显示电脑端和移动端切换的footer部分，用在公共脚部,
      serverTime: new Date(ret[0].data.now).getTime(), // 用于首页限时特卖倒计时
      endTime: ret[0].data.grouponVOs.length && new Date(ret[0].data.grouponVOs[0]['endTime']).getTime() //用于首页限时特卖倒计时
    };

    html = this._cache._commonBasicHeadRender(renderObj) + this._cache._commonHeaderRender(renderObj)
      + this._cache._commonChannelHomePageRender(renderObj)
      + this._cache._commonFooterRender(renderObj) + this._cache._commonChannelFootRender(renderObj);
  }

//  var html = template(path.join(__dirname,'../views/mobile/channel/abc'),{name: 'yangli',time: 'Fri Jun 17 2016 16:00:15 GMT+0800 (CST)'})
//  this.set('Transfer-Encoding','chunked');
  ctx.body = html;
});

module.exports = router;
