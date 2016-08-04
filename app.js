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
var co = require('co');
var heapdump = require('heapdump');
// 热加载模块必须在所有私有模块引用前加载
var hotload = require('./lib/hotload');

var log = require('./lib/log4js/logger');
var router = require('./routes/index');
var MidProxy = require('./lib/proxy/midproxy');
var envConfig = require('./lib/config').config();
var watcher = require('./lib/hotload/watchExtends');
var ref = require('./lib/hotload/refresh');
var clear = require('./lib/hotload/clear');
var uaDetector = require('./midwares/uaDetector');
var logTrace = require('./midwares/logTrace');
var errorHandler = require('./midwares/error');

var app = koa();
var cache = {};

// 当前运行环境
var env = process.argv[2];
var mock = (process.argv[3] == 'mock' || process.argv[3] == undefined) ? 'mock' : 'online';

// 过滤隐藏文件
app.checkDirsExceptDSStore = function(dirs){
  var nameReg = /^[a-z0-9]/i;
  var ret = [];
  dirs.forEach(function(v,i){
    if(v.match(nameReg)){
      ret.push(v);
    }
  });
  return ret;
};

// 加载外挂的预配置
var root = process.cwd();
var base = path.join(process.cwd(),'extends/');
var projs = fs.readdirSync(base);
projs = app.checkDirsExceptDSStore(projs);
projs.forEach(function(proj,i){
  var loc = path.join(base,proj,'pre');
  var viewLoc = path.join(base,proj,'views/mobile');
  try{
    if(fs.existsSync(loc)){
      var m = require(loc);
      m && m.preHandle && m.preHandle(cache,template,viewLoc);
    }
  }catch(e){
    throw e;
  }
});

// 监听‘/extends’
watcher.exec(cache,template,mock,MidProxy);

// 监听’/extends‘每个工程的模板
watcher.listenTemplate();

watcher.emitter.on('templateChange',function(e){
  // 无论e.type为 ADD、Update还是Delete，都重新编译所有模板
  var projs = e.projs;
  projs.forEach(function(proj,i){
    var loc = path.join(base,proj,'pre');
    var viewLoc = path.join(base,proj,'views/mobile');
    try{
      if(fs.existsSync(loc)){
        var m = require(loc);
        m && m.preHandle && m.preHandle(cache,template,viewLoc);
      }
    }catch(e){
      throw e;
    }
  });
});

// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  // 尚妆公共头尾
  cache._commonBasicHeadRender = template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8'));
  cache._commonHeaderRender = template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8'));
  cache._commonStaticRender = template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8'));
  cache._commonFooterRender = template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8'));
  cache._channelHomePageRender = template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8'));
  cache._channelFootRender = template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8'));

  // 达人店公共头尾部
  cache._shopCommonHeadRender = template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8'));
  cache._shopCommonHeaderRender = template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8'));
  cache._shopCommonFootRender = template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8'));
  cache._shopCommonFooterRender = template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8'));

  // 错误页面预编译
  cache._commonError50xRender = template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8'));
  cache._commonError404Render = template.compile(fs.readFileSync('views/mobile/common/error/404.tmpl','utf8'));
};

preHandle();

// 绑定环境到app实例
app.env = env;

// 绑定模板缓存到app实例
app._cache = cache;

// 绑定相关配置文件到app实例
app.EnvConfig = envConfig;

// 绑定50x处理函数到app实例
app.error50x = function(error){
  this._error = error;
  this.status = 500;
};

// 设置set-cookie操作，在所有返回页面试图前都需调用
app.setCookie = function(ret,ctx){
  ret.pop().forEach(function(setCookie){
    ctx.set('Set-Cookie',setCookie);
  });
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
    jsons = app.checkDirsExceptDSStore(jsons);
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


// TODO：针对每个req做跟踪，时间记录、终端记录、

// binding “id” to context
app.use(reqId());

// 请求UA判断
app.use(uaDetector.exec);

// 日志跟踪
app.use(logTrace.trace);

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

log.info("listening on port 8112");
var server = app.listen(8112);

// 代理 uncaughtException 事件处理
graceful({
  servers: [server],
  killTimeout: '15s'
});

// 重新挂载改动的extends模块
// 更新路由模块的逻辑如下：
// 1，对于新增的extends工程，在router对象基础上添加其他的策略
// 2，对于已存在的extends工程，针对某些路由策略做修改，则重新加载router；而针对非路由部分代码（api定义，pre预处理等）的修改仍采用热替换
ref.refresh({
  hotload: hotload,
  cache: cache,
  template: template,
  mock: mock,
  MidProxy: MidProxy
},function(){
  // 清空router模块的缓存
  clear.clearFileCache(require.resolve('./routes/index'));
  router = require('./routes/index');

  //console.dir(router.stack[router.stack.length-1]['stack'][0].toString())
  // 更新控制器函数
  fn = router.routes();
});


var dump = function(){
  var d = new Date();
  var name = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + '_' + process.pid;
  heapdump.writeSnapshot('/Users/showjoy/' + name + '.heapsnapshot',function(err, filename){
    console.log('dump written to', filename);
  });
};

dump();

// 24h记录一次
setTimeout(dump,24 * 3600 * 1000);