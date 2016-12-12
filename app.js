'use strict';

var http = require('http');
var path = require('path');
var fs = require('fs');
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
var minify = require('html-minifier').minify;

// 当前运行环境
var env = process.argv[2];
var mock = (process.argv[3] == 'dev' || process.argv[3] == undefined) ? 'dev' :
  process.argv[3] == 'online' ? 'online' :
    process.argv[3] == 'test' ? 'test' :
      process.argv[3] == 'preview' ? 'preview': 'dev';

global.apiEnv = mock;
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
  if(!fs.existsSync(dirname)){
    return;
  }
  var controllers = fs.readdirSync(dirname);
  // 过滤隐藏文件
  controllers = checkDirsExceptDSStore(controllers);
  // 删除controllers数组中的“index.js”项
  //controllers.splice(controllers.indexOf('index.js'),1);

  if(controllers.length == 0)
    return;

  // 加载其他控制器
  // page目录创建多个controller完成复杂业务的开发和定制
  controllers.forEach(function(ctl){
    var fullpath = path.join(dirname,ctl);

    if(fullpath == path.join(process.cwd(),'routes/index.js')){
      return;
    }
    // 若是目录，递归加载包含的模块
    if(fs.statSync(fullpath).isDirectory()){

      resolveOtherControllers(Extends,fullpath);
      return;
    }

    require(fullpath).bind.call(null,Extends);
  });
};

global.out = require('./lib/router-tools/out').out;

var router = require('./routes/index');
var MidProxy = require('./lib/proxy/midproxy');
var envConfig = require('./lib/config').config();

// 热加载模块必须在所有私有模块引用前加载
var uaDetector = require('./midwares/uaDetector');
var logTrace = require('./midwares/logTrace').trace;
var auth = require('./midwares/auth');

var errorHandler = require('./midwares/error')(redisUtil,log);

var app = koa();

// 加载外挂的预配置
var root = process.cwd();
var base = path.join(process.cwd(),'extends/');
var projs = fs.readdirSync(base);
projs = checkDirsExceptDSStore(projs);
projs.forEach(function(proj,i){
  var cache,pkgConfig = path.join(base,proj,'package.json'),
    tmpLocation = path.join(base,proj,'views');
  try{
    pkgConfig = require(pkgConfig);
    cache = pkgConfig.cache;
    if(Object.prototype.toString.call(cache) !== '[object Array]'){
      log.error('cache must be an Array!');
      return;
    }
    cache.forEach(function(item){
      if(!item.v || !item.k){
        log.error('cache need have an "k" and "v" property!');
        return;
      }
      // 默认针对模板进行编译后缓存
      if(!item.type || item.type == 'template'){
        if(item.dirname){
          // 设置模板编译后的缓存
          redisUtil.setRedis(item['k'],template.compile(fs.readFileSync(path.join(tmpLocation,item.dirname,item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')));
        }else{
          redisUtil.setRedis(item['k'],template.compile(fs.readFileSync(path.join(tmpLocation,'mobile',item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')));
        }
      }else if(item.type == 'activity'){
        if(item.dirname){
          // 针对活动页面直接缓存压缩后的模板
          redisUtil.setRedis(item['k'],minify(fs.readFileSync(path.join(tmpLocation,item.dirname,item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')),{
            removeComments: true,
            collapseWhitespace: true,
            minifyJS:true,
            minifyCSS:true
          });
        }else{
          redisUtil.setRedis(item['k'],minify(fs.readFileSync(path.join(tmpLocation,'mobile',item.v.indexOf('.tmpl') > -1 ? item.v : item.v + '.tmpl'),'utf8')),{
            removeComments: true,
            collapseWhitespace: true,
            minifyJS:true,
            minifyCSS:true
          });
        }
      }else{
        // 非模板文件，则直接缓存序列化的内容
        try{
          redisUtil.setRedis(item['k'],JSON.stringify(item['v']));
        }catch(e){
          redisUtil.setRedis(item['k'],item['v'].toString());
        }

      }

    });
  }catch(e){
    log.error(e.stack);
  }
});

// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  // 尚妆公共头尾
  redisUtil.setRedis('f2e:common:basicHeadRender',template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8')));
  redisUtil.setRedis('f2e:common:headerRender',template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8')));
  redisUtil.setRedis('f2e:common:staticRender',template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8')));
  redisUtil.setRedis('f2e:common:footerRender',template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8')));
  //redisUtil.setRedis('f2e:channel:homePageRender',template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8')));
  //redisUtil.setRedis('f2e:channel:footRender',template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8')));

  // 达人店公共头尾部
  redisUtil.setRedis('f2e:shop:commonHeadRender',template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8')));
  redisUtil.setRedis('f2e:shop:commonHeaderRender',template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8')));
  redisUtil.setRedis('f2e:shop:commonFootRender',template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8')));
  redisUtil.setRedis('f2e:shop:commonFooterRender',template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8')));

  // 活动页面头尾部
  redisUtil.setRedis('f2e:activity:commonHeadRender',template.compile(fs.readFileSync('views/mobile/activity/common/head.tmpl','utf8')));
  redisUtil.setRedis('f2e:activity:commonFootRender',template.compile(fs.readFileSync('views/mobile/activity/common/foot.tmpl','utf8')));

  // 错误页面预编译
  redisUtil.setRedis('f2e:common:error50xRender',template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8')));
  redisUtil.setRedis('f2e:common:error404Render',template.compile(fs.readFileSync('views/mobile/common/error/404.tmpl','utf8')));
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
MidProxy.init(path.join(root,'api/global.json'));

projs.forEach(function(proj){
  var loc = path.join(base,proj,'api');
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
    log.error(e.stack);
  }
});

// 绑定到上下文 EnvConfig属性
//app.use(envConfig.config);

// binding “id” to context
app.use(reqId());

// 请求UA判断
app.use(uaDetector.exec);

// 登录检查
app.use(auth.check);

// 日志跟踪
app.use(logTrace(log));

// HTTP Header: X-Response-Time
app.use(responseTime());

// gzip
app.use(gzip());


// 静态文件夹
app.use(staticm('./static'));

// 解析body
app.use(koaBody({
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb',
  formidable:{uploadDir: __dirname}
}));

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

// 堆快照
var dump = function(message){
  var d = new Date();
  var name = process.pid + '_' + message.grade + '_' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' +
    d.getDate() + '-' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
  var p = 'tmp/heapdumps/' + name + '.heapsnapshot';
  heapdump.writeSnapshot(p,function(err, filename){
    log.info('dump written to ' + filename);
  });
  return p;
};

process.on('message',function(message){
  if(message.type == 'heapdump'){
    let p = dump(message);

    process.send({
      ip: message.ip,
      pid: process.pid,
      type: 'heapdump',
      success: 1,
      dumpPath: p,
      grade: message.grade
    })
  }
});