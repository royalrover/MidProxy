'use strict';

var vm = require('vm');
var async = require('async');
var template = require('art-template');

exports.out = function out(setting){
  return function* (next){
    var self = this;
    try{
      var MidProxy = setting.Extends.MidProxy;
      var _ = setting.Extends.lodash;
      var createProxies = setting.createProxies;
      var handleRenderData = setting.handleRenderData;
      var page = setting.page;
      // 保存配置数组
      var _keys = page && page.cacheKeys;
      var keys = _keys.slice();
      var title,pageName;

      if(!keys){
        throw new Error('必须使用缓存的模板渲染页面!');
      }

      // 默认使用 达人店的公共头尾部
      var type = page && page.type ? page.type : 'shop';

      // 未登录状态
      if(!this.login){
        if(type.indexOf('shop') != -1){
          if(apiEnv == 'test'){
            this.redirect('http://login.shop.showjoy.net/?service=' + encodeURIComponent(this.protocol + '://' + this.hostname) + '&redirect_uri=' + encodeURIComponent(this.path));
            return;
          }else{
            // todo: https目前微信认证需要升级，目前仅仅使用http通道
            this.redirect('http://login.shop.showjoy.com/oauth_sign_in/weixin_h5?service=' + encodeURIComponent(this.protocol + '://' + this.hostname) + '&redirect_uri=' + encodeURIComponent(this.path) );
            return;
          }
        }
      }

      if(type == 'shop'){
        title = page.title;
        pageName = page.pageName;
        if(title == undefined){
          throw new Error('必须提供页面的title！');
        }
        if(!pageName){
          throw new Error('必须提供页面的pageName，pageName对应线上资源路径名！');
        }
      }else if(type.indexOf('activity') !== -1){
        title = page.title;
        if(title == undefined){
          throw new Error('必须提供页面的title！');
        }
      }

      // 是否使用MidProxy提供的达人店共同头
      var useCommonHeader = Boolean(page.useCommonHeader);
      var useCommonFooter = Boolean(page.useCommonFooter);
      var useCommonWeexHeadAndFoot = Boolean(page.useCommonWeex);
      var useCommonWeexFooter = Boolean(page.useCommonWeexFooter);
      var View = setting.Extends.View;
      var isSetCookie = setting.isSetCookie || false;
    }catch(e){
      self.logger.error('global.out exec encounter an error. The setting object sames to be wrong.')
      self.logger.error(e.message);
      self.app.error50x.call(this,new TypeError('global.out exec encounter an error. The setting object sames to be wrong.'));
      yield* next;
      return;
    }

    try {
      var app = this.app;
      var ret,proxy,isMultiCrossReq;
      var shopConfig,activityConfig;

      switch(type){
        // 针对活动页面，直接返回模板
        case 'activity-shop':
        case 'activity-showjoy':
          let firstPageOptimize = page.firstPageOptimize;
          if(firstPageOptimize){
            if(!createProxies || !handleRenderData){
              app.error50x.call(this,new TypeError('首屏渲染优化必须提供createProxies和handleRenderData函数'));
              yield* next;
              return;
            }

            proxy = createProxies.call(this);
          }else{
            // 不做首屏优化，全部异步渲染
            proxy = [];
          }

          isMultiCrossReq = false;
          // 针对达人店项目，需要额外请求配置信息接口
          let activityProxy = MidProxy.create('Activity.getHideInputValues');
          //  shopConfigProxy.getConfig().withCookie('OUTFOX_SEARCH_USER_ID_NCOO=103319058.29401897; um_remember="5385980EA93F8265018C9FCD285B8ED7:2E175E4D7F73DDD96CC2524B965E12A6:1367D8AF23E010D536321D9696BB26CA"; tgc=u0H0UQjJOo; userInfo="{\\"cartItemNum\\":0,\\"discount\\":1,\\"email\\":\\"\\",\\"id\\":2091211,\\"image\\":\\"http://file.showjoy.com/images/4d/4d4922680fdc4484b7ac111866acea5f.jpg\\",\\"level\\":0,\\"memberPoint\\":150,\\"nick\\":\\"%E6%AC%B2%E4%BC%91\\",\\"sexType\\":\\"\\",\\"tel\\":\\"\\",\\"unreadMsgNum\\":9,\\"userAuth\\":\\"ROLE_USER\\",\\"username\\":\\"%E6%AC%B2%E4%BC%91\\"}"; _fp_sw_a=-1051452936.1231c2e7-8b63-4fb9-a86d-75f3a21047c7.1477025652101.1477025652101.1477025652101.1; _mj_si=si4105454592; _mj_c=v3,last,1477025652380,1477025652380,315360000000|v3.4,cm,1477025652394,1477025652380,315360000000; _ga=GA1.2.1359876247.1477025653; JSESSIONID=0448F1E285AFB6E0F11BF78AB8983C56');
          // TODO: 达人店的所有接口都需要身份认证，而相关的认证信息在cookie中，所以在使用getConfig接口获取
          // TODO: 达人店相关配置时需要先在浏览器中认证通过，再通过修改host[127.0.0.1 -> test.h5.showjoy.net]实现cookie获取，最终发送携带认证信息的请求
          activityProxy.getHideInputValues().withCookie(this.request.header['cookie']);

          if(_.isArray(proxy)){
            proxy.unshift(activityProxy);
            if(proxy.length > 1){
              isMultiCrossReq = true;
            }else{
              isMultiCrossReq = false;
            }
            ret = yield proxy.map(function(p){
              return new Promise(function(resolve,reject){
                try{
                  p._done(resolve,reject);
                }catch(e){
                  resolve(e);
                }
              });
            });

            activityConfig = ret.shift()[0].data;

            // 如果请求出错，则返回结果ret为Error类型，渲染错误页面
            let _flag = false,errorRet;
            ret.forEach(function(r){
              if(r instanceof Error){
                _flag = true;
                errorRet = r;
              }
            });
            if(_flag){
              app.error50x.call(this,errorRet);
              yield* next;
              return;
            }
          }else{
            app.error50x.call(this,new TypeError('the result of function createProxies is wrong,the result must an Array!'));
            yield* next;
            return;
          }

          break;
        case 'shop':
          // 针对达人店工程，需要额外请求全局配置接口，如**http://shop.m.showjoy.net/api/getConfig**
          proxy = createProxies.call(this);
          isMultiCrossReq = false;
          // 针对达人店项目，需要额外请求配置信息接口
          let shopConfigProxy = MidProxy.create('Shop.getConfig');
          //  shopConfigProxy.getConfig().withCookie('OUTFOX_SEARCH_USER_ID_NCOO=103319058.29401897; um_remember="5385980EA93F8265018C9FCD285B8ED7:2E175E4D7F73DDD96CC2524B965E12A6:1367D8AF23E010D536321D9696BB26CA"; tgc=u0H0UQjJOo; userInfo="{\\"cartItemNum\\":0,\\"discount\\":1,\\"email\\":\\"\\",\\"id\\":2091211,\\"image\\":\\"http://file.showjoy.com/images/4d/4d4922680fdc4484b7ac111866acea5f.jpg\\",\\"level\\":0,\\"memberPoint\\":150,\\"nick\\":\\"%E6%AC%B2%E4%BC%91\\",\\"sexType\\":\\"\\",\\"tel\\":\\"\\",\\"unreadMsgNum\\":9,\\"userAuth\\":\\"ROLE_USER\\",\\"username\\":\\"%E6%AC%B2%E4%BC%91\\"}"; _fp_sw_a=-1051452936.1231c2e7-8b63-4fb9-a86d-75f3a21047c7.1477025652101.1477025652101.1477025652101.1; _mj_si=si4105454592; _mj_c=v3,last,1477025652380,1477025652380,315360000000|v3.4,cm,1477025652394,1477025652380,315360000000; _ga=GA1.2.1359876247.1477025653; JSESSIONID=0448F1E285AFB6E0F11BF78AB8983C56');
          // TODO: 达人店的所有接口都需要身份认证，而相关的认证信息在cookie中，所以在使用getConfig接口获取
          // TODO: 达人店相关配置时需要先在浏览器中认证通过，再通过修改host[127.0.0.1 -> test.h5.showjoy.net]实现cookie获取，最终发送携带认证信息的请求
          shopConfigProxy.getConfig().withCookie(this.request.header['cookie']);

          if(_.isArray(proxy)){
            isMultiCrossReq = true;
            proxy.unshift(shopConfigProxy);
            ret = yield proxy.map(function(p){
              return new Promise(function(resolve,reject){
                try{
                  p._done(resolve,reject);
                }catch(e){
                  resolve(e);
                }
              });
            });

            shopConfig = ret.shift()[0].data;

            // 如果请求出错，则返回结果ret为Error类型，渲染错误页面
            let _flag = false,errorRet;
            ret.forEach(function(r){
              if(r instanceof Error){
                _flag = true;
                errorRet = r;
              }
            });
            if(_flag){
              app.error50x.call(this,errorRet);
              yield* next;
              return;
            }
          }else{
            app.error50x.call(this,new TypeError('the result of function createProxies is wrong,the result must an Array!'));
            yield* next;
            return;
          }
          break;
        default:
          proxy = createProxies.call(this);
          isMultiCrossReq = false;
          if(_.isArray(proxy)){
            isMultiCrossReq = true;
            ret = yield proxy.map(function(p){
              return new Promise(function(resolve,reject){
                try{
                  p._done(resolve,reject);
                }catch(e){
                  resolve(e);
                }
              });
            });

            // 如果请求出错，则返回结果ret为Error类型，渲染错误页面
            let _flag = false,errorRet;
            ret.forEach(function(r){
              if(r instanceof Error){
                _flag = true;
                errorRet = r;
              }
            });
            if(_flag){
              app.error50x.call(this,errorRet);
              yield* next;
              return;
            }
          }else{
            app.error50x.call(this,new TypeError('the result of function createProxies is wrong'));
            yield* next;
            return;
          }
          break;
      }

      var renderObj,html = '';
      if(handleRenderData){
        renderObj = handleRenderData.call(this,ret,app);
      }else{
        renderObj = Object.create(null);
      }

      try{

        if(type == 'activity-shop' || type == 'activity-showjoy'){
          keys.unshift('f2e:activity:commonHeadRender');
          keys.push('f2e:activity:commonFootRender');
          // 针对活动页面,添加model层数据
          if(renderObj.title){
            renderObj._title = renderObj.title;
            renderObj.title = title;
          }else{
            renderObj.title = title;
          }
          renderObj.time = activityConfig.timer;
          // renderObj._synToken = activityConfig._synToken;
          renderObj.shopId = activityConfig.shopId ? activityConfig.shopId : '';
          renderObj.isHaveShop = activityConfig.isHaveShop + '';
          renderObj.__type__ = type;
        }else{
          // 判断是否是weex页面
          if(useCommonWeexHeadAndFoot){
            keys.unshift('f2e:shop:commonWeexHeadRender');
            if(useCommonWeexFooter){
              keys.push('f2e:shop:commonWeexFooterRender');
            }
            keys.push('f2e:shop:commonWeexFootRender');
          }
          // 针对达人店的产品页面
          else if(useCommonHeader || useCommonFooter){
            if(type !== 'shop'){
              self.logger.error('目前MidProxy仅提供达人店的公共部分！');
            }else{
              // 插入数据至keys数组
              switch(Number(useCommonHeader) + '' + Number(useCommonFooter)){
                case '11':
                  keys.unshift('f2e:shop:commonHeaderRender');
                  keys.unshift('f2e:shop:commonHeadRender');
                  keys.push('f2e:shop:commonFooterRender');
                  keys.push('f2e:shop:commonFootRender');
                  break;
                case '10':
                  keys.unshift('f2e:shop:commonHeaderRender');
                  keys.unshift('f2e:shop:commonHeadRender');
                  keys.push('f2e:shop:commonFootRender');
                  break;
                case '01':
                  keys.unshift('f2e:shop:commonHeadRender');
                  keys.push('f2e:shop:commonFooterRender');
                  keys.push('f2e:shop:commonFootRender');
                  break;
                case '00':
                  keys.unshift('f2e:shop:commonHeadRender');
                  keys.push('f2e:shop:commonFootRender');
                  break;
                default:
                  keys.unshift('f2e:shop:commonHeaderRender');
                  keys.unshift('f2e:shop:commonHeadRender');
                  keys.push('f2e:shop:commonFooterRender');
                  keys.push('f2e:shop:commonFootRender');
              }
            }
          }

          // 添加model层数据
          if(renderObj.title){
            renderObj._title = renderObj.title;
            renderObj.title = title;
          }else{
            renderObj.title = title;
          }
          if(renderObj.pageName){
            renderObj._pageName = renderObj.pageName;
            renderObj.pageName = pageName;
          }else{
            renderObj.pageName = pageName;
          }

          // 是否使用新的footer tab栏
          renderObj.isNewFooter = page.isNewFooter;
          renderObj.isFromApp = self.ua.isApp;
          // 针对使用达人店公共头尾部的页面，需要添加对应的属性，如shopId等
          renderObj.fromOfficialAccount = shopConfig.fromOfficialAccount;
          renderObj.myShopId = shopConfig.myShopId;
          renderObj.shopId = shopConfig.shopId;
          renderObj.shopName = shopConfig.shopName;
          renderObj.userImage = shopConfig.userImage;
          renderObj.commonEnv = app.EnvConfig['common_' + app.env];
          renderObj.shopEnv = app.EnvConfig['shop_' + app.env];
        }
      }catch(e){
        self.logger.error('model object enconters error! ' + e.message);
        self.logger.error(e.stack);
        app.error50x.call(self,new TypeError('the result of function createProxies is wrong'));
        yield* next;
        return;
      }

      var jobs = keys.map(function(key){
        return function(cb){
          redisUtil.getRedis(key).then(function(reply){
            vm.runInThisContext('var _render = ' + reply, {filename: key});
            var ret;
            try{
              ret = _render.call(template.utils,renderObj);
            }catch(e){
              cb(e);
            }
            cb(null,ret);
          },function(err){
            cb(err);
          });
        }
      });

      // 此处发起redis调用，获取需要的模板
      var segs = yield new Promise(function(res){
        // 采用async并发请求redis服务
        async.parallel(jobs, function(err,rets){
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

      // 返回数据有误，则进入50x页面
      if(segs[0]){
        throw segs[0];
      }

    }catch(e){
      app.error50x.call(self,e);
      yield* next;
      return;
    }

    this.type = 'html';

    // 在需要登录认证的页面，必须设置setCookie header
    // 设置set-cookie
    if(isSetCookie){
      app.setCookie(ret,self,isMultiCrossReq);
    }


    // 使用实现Readable的子类View完成流式读取
    var stream = new View();
    stream.end(html);
    this.body = stream;
  }
};