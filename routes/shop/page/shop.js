'use strict';

var path = require('path');
var _ = require('lodash');
var MidProxy = require('../../../lib/proxy/midproxy');
var log = require(path.join(process.cwd(),'/lib/log4js/logger'));
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;

exports.bind = function(router){
  /**
   * @request /shop/upgrade
   * @description 达人店铺升级页
   */
  router.get('/shop/upgrade', function* (next){
    console.time('shop/upgrade');
    var proxy = MidProxy.create('Shop.*'),
      ret,
      html,
      self = this,
      app = this.app;

    proxy
      .getConfig(this.querystring) // getConfig接口需要根据url的queryString做判断
      .getConditions()
      .withCookie(this.request.header['cookie']);

    ret = yield new Promise(function(resolve,reject){
      proxy._done(resolve,reject);
    });

    if(ret instanceof Error){
      app.error50x.call(this,ret);
      yield* next;
      return;
    }

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

    try {
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

      html = app._cache._shopCommonHeadRender(renderObj) + app._cache._shopCommonHeaderRender(renderObj)
          + app._cache._shopUpgradeRender(renderObj)
        + app._cache._shopCommonFooterRender(renderObj) + app._cache._shopCommonFootRender(renderObj);

      log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] template render successfully');
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
    console.timeEnd('shop/upgrade');
  });
};
