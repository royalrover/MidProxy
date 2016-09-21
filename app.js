'use strict';

var http = require('http');
var path = require('path');
var fs = require('fs');
var vm = require('vm');
var koa = require('koa');
var staticm = require('koa-static');
var koaBody = require('koa-body');
var responseTime = require('koa-response-time');
var reqId = require('koa-request-id');
var gzip = require('koa-gzip');
var graceful = require('graceful');
var template = require('art-template');
var heapdump = require('heapdump');
var async = require('async');
var _ = require('lodash');

// 当前运行环境
var env = process.argv[2];
var mock = (process.argv[3] == 'mock' || process.argv[3] == undefined) ? 'mock' : 'online';

// 暴露env至全局，目的是为了在测试环境中采用热加载，在线上环境采用传统部署
global.runEnv = env;
// 全局log对象,下面的模块可能依赖log
global.log = require('./lib/log4js/logger');
global.redisUtil = require('./lib/cache/redisUtil');
// 过滤隐藏文件
global.checkDirsExceptDSStore = function(dirs){
  var nameReg = /^[a-z0-9]/i;
  var ret = [];
  dirs.forEach(function(v,i){
    if(v.match(nameReg)){
      ret.push(v);
    }
  });
  return ret;
};

global.setCache = function(kv){
  _.forEach(kv,function(v,k){
    redisUtil.setRedis(k,v);
  });
};

global.resolveOtherControllers = function resolveOtherControllers(Extends,dirname){
  var controllers = fs.readdirSync(dirname);
  // 过滤隐藏文件
  controllers = checkDirsExceptDSStore(controllers);
  // 删除controllers数组中的“index.js”项
  controllers.splice(controllers.indexOf('index.js'),1);

  // 加载其他控制器
  // page目录创建多个controller完成复杂业务的开发和定制
  controllers.forEach(function(ctl){
    require(path.join(dirname,ctl)).bind(Extends);
  });
};

global.out =
  function out(setting){
    try{
      var _ = setting.Extends.lodash;
      var createProxies = setting.createProxies;
      var handleRenderData = setting.handleRenderData;
      var keys = setting.keys;
      var View = setting.Extends.View;
      var isSetCookie = setting.isSetCookie || false;
    }catch(e){
      log.error('global.out exec encounter an error. The setting object sames to be wrong.')
      return function* (next){
        this.app.error50x.call(this,new TypeError('the result of function createProxies is wrong'));
        yield* next;
        return;
      }
    }

    return function* (next){
      try {
        var app = this.app;
        var ret;
        var proxy = createProxies.call(this);
        var self = this;
        var isMultiCrossReq = false;

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
          var _flag = false,errorRet;
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

        }else if(proxy instanceof MidProxy){
          ret = yield new Promise(function(resolve,reject){
            proxy._done(resolve,reject);
          });

          // 如果请求出错，则返回结果ret为Error类型，渲染错误页面
          if(ret instanceof Error){
            app.error50x.call(this,ret);
            yield* next;
            return;
          }
        }else{
          app.error50x.call(this,new TypeError('the result of function createProxies is wrong'));
          yield* next;
          return;
        }

        var renderObj = handleRenderData.call(this,ret,app);
        var html = '';

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

var router = require('./routes/index');
var MidProxy = require('./lib/proxy/midproxy');
var envConfig = require('./lib/config').config();

// 热加载模块必须在所有私有模块引用前加载
var hotload;// = require('./lib/hotload');
var watcher;// = require('./lib/hotload/watchExtends');
var ref;// = require('./lib/hotload/refresh');
var clear;// = require('./lib/hotload/clear');
var uaDetector = require('./midwares/uaDetector');
var logTrace = require('./midwares/logTrace').trace;

var errorHandler = require('./midwares/error')(redisUtil,log);

var app = koa();

// 加载外挂的预配置
var root = process.cwd();
var base = path.join(process.cwd(),'extends/');
var projs = fs.readdirSync(base);
projs = checkDirsExceptDSStore(projs);
projs.forEach(function(proj,i){
  var loc = path.join(base,proj,'pre');
  var viewLoc = path.join(base,proj,'views/mobile');
  try{
    if(fs.existsSync(loc)){
      var m = require(loc);
      m && m.preHandle && m.preHandle(template,viewLoc);
    }
  }catch(e){
    throw e;
  }
});

// 针对测试环境，使用热加载
if(env == 'dev'){
  hotload = require('./lib/hotload');
  watcher = require('./lib/hotload/watchExtends');
  ref = require('./lib/hotload/refresh');
  clear = require('./lib/hotload/clear');

  // 监听‘/extends’
  watcher.exec(redisUtil,template,mock,MidProxy,log);

  // 监听’/extends‘每个工程的模板
  watcher.listenTemplate();

  watcher.emitter.on('templateChange',function(e){
    // 无论e.type为 ADD、Update还是Delete，都重新编译所有模板
    var projs = e.projs;
    log.trace('reload preHandle >>>>>>>>>>>>>>>>> >>>>>>>>>>>>>>>>>  list of projs:' + projs.join(','));
    projs.forEach(function(proj,i){
      var loc = path.join(base,proj,'pre');
      var viewLoc = path.join(base,proj,'views/mobile');
      try{
        if(fs.existsSync(loc)){
          var m = require(loc);
          m && m.preHandle && m.preHandle(template,viewLoc);
        }
      }catch(e){
        throw e;
      }
    });
  });
}



// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  // 尚妆公共头尾
  redisUtil.setRedis('f2e_commonBasicHeadRender',template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8')));
  redisUtil.setRedis('f2e_commonHeaderRender',template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8')));
  redisUtil.setRedis('f2e_commonStaticRender',template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8')));
  redisUtil.setRedis('f2e_commonFooterRender',template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8')));
  redisUtil.setRedis('f2e_channelHomePageRender',template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8')));
  redisUtil.setRedis('f2e_channelFootRender',template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8')));
  //cache.put('_commonBasicHeadRender',template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8')));
  //cache.put('_commonHeaderRender',template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8')));
  //cache.put('_commonStaticRender',template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8')));
  //cache.put('_commonFooterRender',template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8')));
  //cache.put('_channelHomePageRender',template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8')));
  //cache.put('_channelFootRender',template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8')));

  //cache._commonBasicHeadRender = template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8'));
  //cache._commonHeaderRender = template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8'));
  //cache._commonStaticRender = template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8'));
  //cache._commonFooterRender = template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8'));
  //cache._channelHomePageRender = template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8'));
  //cache._channelFootRender = template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8'));

  // 达人店公共头尾部
  redisUtil.setRedis('f2e_shopCommonHeadRender',template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8')));
  redisUtil.setRedis('f2e_shopCommonHeaderRender',template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8')));
  redisUtil.setRedis('f2e_shopCommonFootRender',template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8')));
  redisUtil.setRedis('f2e_shopCommonFooterRender',template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8')));
  //cache.put('_shopCommonHeadRender',template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8')));
  //cache.put('_shopCommonHeaderRender',template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8')));
  //cache.put('_shopCommonFootRender',template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8')));
  //cache.put('_shopCommonFooterRender',template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8')));

  //cache._shopCommonHeadRender = template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8'));
  //cache._shopCommonHeaderRender = template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8'));
  //cache._shopCommonFootRender = template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8'));
  //cache._shopCommonFooterRender = template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8'));

  // 错误页面预编译
  redisUtil.setRedis('f2e_commonError50xRender',template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8')));
  redisUtil.setRedis('f2e_commonError404Render',template.compile(fs.readFileSync('views/mobile/common/error/404.tmpl','utf8')));
  //cache.put('_commonError50xRender',template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8')));
  //cache.put('_commonError404Render',template.compile(fs.readFileSync('views/mobile/common/error/404.tmpl','utf8')));

  //cache._commonError50xRender = template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8'));
  //cache._commonError404Render = template.compile(fs.readFileSync('views/mobile/common/error/404.tmpl','utf8'));
};

preHandle();

// 绑定环境到app实例
app.env = env;

// 绑定模板缓存到app实例
//app._cache = cache;

// 绑定相关配置文件到app实例
// TODO: 配置文件随着规模变大，也需要放置redis中
app.EnvConfig = envConfig;

// 绑定50x处理函数到app实例
app.error50x = function(error){
  this._error = error;
  this.status = 500;
};

// 设置set-cookie操作，在所有返回页面试图前都需调用
app.setCookie = function(ret,ctx,isMultiCrossReq){
  if(isMultiCrossReq){
    ret.forEach(function(result){
      result.pop().forEach(function(setCookie){
        ctx.set('Set-Cookie',setCookie);
      });
    });
  }else{
    ret.pop().forEach(function(setCookie){
      ctx.set('Set-Cookie',setCookie);
    });
  }
};

// 针对OAuth操作，做重定向
app.redirect = function(headers,ctx){
  ctx.status = 302;
  ctx.set('Location',headers['location']);
  ctx.set('Content-Length',headers['content-length']);
};

// 初始化modelproxy接口文件,可初始化多份接口文件
MidProxy.init(path.join(root,'api/'+ mock +'/OAuth/interface_oauth.json'));
MidProxy.init(path.join(root,'api/'+ mock +'/homepage/interface_1.json'));
MidProxy.init(path.join(root,'api/'+ mock +'/homepage/interface_2.json'));

projs.forEach(function(proj){
  var loc = path.join(base,proj,'api',mock);
  var jsons;
  try{
    jsons = fs.readdirSync(loc);
    jsons = checkDirsExceptDSStore(jsons);
    jsons.forEach(function(json){
      if(path.extname(json) !== '.json')
        return;

      MidProxy.init(path.join(loc,json));
    })
  }catch(e){
    throw e;
  }
});

// 绑定到上下文 EnvConfig属性
//app.use(envConfig.config);

// binding “id” to context
app.use(reqId());

// 请求UA判断
app.use(uaDetector.exec);

// 日志跟踪
app.use(logTrace(log));

// HTTP Header: X-Response-Time
app.use(responseTime());

// gzip
app.use(gzip());


// 静态文件夹
app.use(staticm('./static'));

// 解析body
app.use(koaBody({formidable:{uploadDir: __dirname}}));

// 用闭包保存router引用，使用hotload后更改的router
var fn = router.routes();

app.use(function* (next){
  // TODO：警告
  // 此处浪费太多时间进行fix，原因在于router.routes返回一个名字叫dispatch的generator函数，
  // dispatch函数针对请求做path匹配，并执行相对应的handler方法。
  // 默认koa将所有的中间件在每次请求响应的context上下文执行，同理通过常规的app.use(router.routes())
  // 方式绑定自定义路由也默认在context环境执行。
  // 因此，在使用闭包的形式引用dispatch函数，必须也要绑定上下文
  var gen = fn.call(this,next);
  yield* gen;
});


app.use(errorHandler.error404);

app.use(errorHandler.error50x);

log.info("MidProxy's master process is listening on port 8112");

var server = app.listen(8112);

// 代理 uncaughtException 事件处理
graceful({
  servers: [server],
  killTimeout: '15s'
});

if(env == 'dev'){
  // 重新挂载改动的extends模块
  // 更新路由模块的逻辑如下：
  // 1，对于新增的extends工程，在router对象基础上添加其他的策略
  // 2，对于已存在的extends工程，针对某些路由策略做修改，则重新加载router；而针对非路由部分代码（api定义，pre预处理等）的修改仍采用热替换
  ref.refresh({
    hotload: hotload,
    redisUtil: redisUtil,
    template: template,
    mock: mock,
    MidProxy: MidProxy,
    log: log
  },function(){
    log.trace('reload routes >>>>>>>>>>>>>>>>> >>>>>>>>>>>>>>>>>');
    // 清空router模块的缓存
    clear.clearFileCache(require.resolve('./routes/index'));
    router = require('./routes/index');

    //  log.trace(router.stack[router.stack.length-1]['stack'][0].toString())
    // 更新控制器函数
    fn = router.routes();
  });
}

// 堆快照
var dump = function(){
  var d = new Date();
  var name = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + '_' + process.pid;
  heapdump.writeSnapshot('/tmp/heapwatcher/' + name + '.heapsnapshot',function(err, filename){
    log.info('dump written to ' + filename);
  });
  setTimeout(function(){
    dump();
  },12 * 60 * 60 * 1000);
};

// 12h记录一次
dump();