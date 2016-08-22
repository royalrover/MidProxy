'use strict';

var path = require('path');
var fs = require('fs');

exports.bind = function(Extends){
  var MidProxy = Extends.MidProxy;
  var View = Extends.View;
  var log = Extends.log;
  var _ = Extends.lodash;

  // ------------------------
  var createProxies = function(){
    var proxy = MidProxy.create('Shop.*');

    // 准备MidProxy即将调用的接口，此处并未发起请求
    proxy
      // getConfig接口需要根据url的queryString做判断
      .getConfig(this.querystring)
      .getConditions()
      // 由于服务端采用OAuth2认证，请求须携带cookie
      .withCookie(this.request.header['cookie']);

    var proxy2 = MidProxy.create( 'Mobile.*' );
    // BigPipe形式出发wechat配置
    //  console.time('asyncWechatConfig');

    proxy2
      .getWechatInfo();
    return [proxy,proxy2];
  };

  var handleRenderData = function(ret,app){  console.dir(ret)
    try{
      var globalConfig = ret[0][0].data;
      var dataJson = ret[0][1].data;
      var childrenLimit = dataJson.childrenLimit;
      var ordersLimit = dataJson.ordersLimit;
      var openedDaysLimit = dataJson.openedDaysLimit;

      dataJson.childrenLeft = parseInt(childrenLimit) - parseInt(dataJson.children);
      dataJson.ordersLeft = parseInt(ordersLimit) - parseInt(dataJson.orders);
      dataJson.openedDaysLeft = parseInt(openedDaysLimit) - parseInt(dataJson.openedDays);

      dataJson.childrenRate = parseInt(dataJson.children) / parseInt(childrenLimit) * 100 + '%';
      dataJson.ordersRate = parseInt(dataJson.orders) / parseInt(ordersLimit) * 100 + '%';
      dataJson.openedDaysRate = parseInt(dataJson.openedDays) / parseInt(openedDaysLimit) * 100 + '%';

      var renderObj = {
        title: '店铺升级页',
        pageName: 'shop-upgrade-home',
        fromOfficialAccount: globalConfig.fromOfficialAccount,
        myShopId: globalConfig.myShopId,
        shopId: globalConfig.shopId,
        shopName: globalConfig.shopName,
        userImage: globalConfig.userImage,
        commonEnv: app.EnvConfig['common_' + app.env],
        shopEnv: app.EnvConfig['shop_' + app.env],
        isApp: this.ua.isApp,
        wechetConfig: ret[1][0].data
      };

      _.assign(renderObj,dataJson);
    }catch(e){
      log.error(e.stack);
      throw e;
    }

    return renderObj;
  };

  /**
   * @request /shop/upgrade
   * @description 达人店铺升级页
   */
  /*Extends.get('/shop/upgrade', function* (next){
    var proxy = MidProxy.create('Shop.*'),
      ret,
      html,
      self = this,
      app = this.app,
      html;

    // 准备MidProxy即将调用的接口，此处并未发起请求
    proxy
      // getConfig接口需要根据url的queryString做判断
      .getConfig(this.querystring)
      .getConditions()
      // 由于服务端采用OAuth2认证，请求须携带cookie
      .withCookie(this.request.header['cookie']);

    // 此处开始向后端服务器获取数据
    // 返回的ret是个数组，数组长度为 “请求API个数 + 1”
    // 数组元素为每个API请求的数据，数组的最后一个元素为“Set-Cookie”字段，
    // 开发者在需要身份认证的页面中需要调用app.setCookie方法（如下）
    /!*ret = yield new Promise(function(resolve,reject){
      proxy._done(resolve,reject);
    });
    // 如果请求出错，则返回结果ret为Error类型，渲染错误页面
    if(ret instanceof Error){
      app.error50x.call(this,ret);
      yield* next;
      return;
    }

    try {
      // 开始准备渲染数据
      var globalConfig = ret[0].data;
      var dataJson = ret[1].data;

      var childrenLimit = dataJson.childrenLimit;
      var ordersLimit = dataJson.ordersLimit;
      var openedDaysLimit = dataJson.openedDaysLimit;

      dataJson.childrenLeft = parseInt(childrenLimit) - parseInt(dataJson.children);
      dataJson.ordersLeft = parseInt(ordersLimit) - parseInt(dataJson.orders);
      dataJson.openedDaysLeft = parseInt(openedDaysLimit) - parseInt(dataJson.openedDays);

      dataJson.childrenRate = parseInt(dataJson.children) / parseInt(childrenLimit) * 100 + '%';
      dataJson.ordersRate = parseInt(dataJson.orders) / parseInt(ordersLimit) * 100 + '%';
      dataJson.openedDaysRate = parseInt(dataJson.openedDays) / parseInt(openedDaysLimit) * 100 + '%';

      var renderObj = {
        title: '店铺升级页',
        pageName: 'shop-upgrade-home',
        fromOfficialAccount: globalConfig.fromOfficialAccount,
        myShopId: globalConfig.myShopId,
        shopId: globalConfig.shopId,
        shopName: globalConfig.shopName,
        userImage: globalConfig.userImage,
        commonEnv: app.EnvConfig['common_' + app.env],
        shopEnv: app.EnvConfig['shop_' + app.env],
        isApp: this.ua.isApp,
      };

      _.assign(renderObj,dataJson);

      // 此处发起redis调用，获取需要的模板
      var segs = yield new Promise(function(res){
        // 采用async并发请求redis服务
        async.parallel([
          function(cb){
            redisUtil.getRedis('f2e_shopCommonHeadRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'upgrade/index/f2e_shopCommonHeadRender'});
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
            redisUtil.getRedis('f2e_shopCommonHeaderRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'upgrade/index/f2e_shopCommonHeaderRender'});
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
            redisUtil.getRedis('f2e_shopUpgradeRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'upgrade/index/f2e_shopUpgradeRender'});
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
            redisUtil.getRedis('f2e_shopCommonFooterRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'upgrade/index/f2e_shopCommonFooterRender'});
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
            redisUtil.getRedis('f2e_shopCommonFootRender').then(function(reply){
              vm.runInThisContext('var fn = ' + reply, {filename: 'upgrade/index/f2e_shopCommonFootRender'});
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
        ], function(err,rets){
          if(err){
            res([err]);
          }

          rets.forEach(function(seg){
            // seg为对象，需要调用toString函数
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

    this.type = 'html';

    // 设置set-cookie
    app.setCookie(ret,self);

    // 方法一，实现Readable的子类View
    var stream = new View();
    stream.end(html);
    this.body = stream;
  });

  // 加载其他控制器
  controllers.forEach(function(ctl){
    require(path.join(__dirname,ctl)).bind(Extends);
  });
*!/



  try{
    var ret = sendReq.call(this,self,proxy)
    console.dir(ret[0].data)



    var body = render.call(this,self,renderObj,['f2e_shopCommonHeadRender','f2e_shopCommonHeaderRender','f2e_shopUpgradeRender','f2e_shopCommonFooterRender','f2e_shopCommonFootRender'])
    resp.call(this,self,body);
    resolveOtherControllers()
  }catch(e){
    throw e;
  }
})*/
//console.dir(out(['f2e_shopCommonHeadRender','f2e_shopCommonHeaderRender','f2e_shopUpgradeRender','f2e_shopCommonFooterRender','f2e_shopCommonFootRender']).toString())
  var keys = ['f2e_shopCommonHeadRender','f2e_shopCommonHeaderRender','f2e_shopUpgradeRender','f2e_shopCommonFooterRender','f2e_shopCommonFootRender'];

  Extends.get('/shop/upgrade',out({
    keys: keys,
    createProxies: createProxies,
    handleRenderData: handleRenderData,
    Extends: Extends,
    isSetCookie: false
  }));

  resolveOtherControllers(Extends,__dirname)
};

module.hotload = 1;