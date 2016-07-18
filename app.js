var http = require('http');
var log = require('./lib/log4js/logger');
var koa = require('koa');
var staticm = require('koa-static');
var koaBody = require('koa-body');
var responseTime = require('koa-response-time');
var reqId = require('koa-request-id');
var gzip = require('koa-gzip');
var graceful = require('graceful');
var template = require('art-template');
var router = require('./routes/index');
var path = require('path');
var fs = require('fs');
var MidProxy = require('./lib/proxy/midproxy');
var envConfig = require('./lib/config').config();
var uaDetector = require('./midwares/uaDetector');
var logTrace = require('./midwares/logTrace');
var errorHandler = require('./midwares/error');

var app = koa();
var cache = {};

// 当前运行环境
var env = process.argv[2];
var mock = (process.argv[3] == 'mock' || process.argv[3] == undefined) ? 'mock' : 'online';

// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  cache._commonBasicHeadRender = template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8'));
  cache._commonHeaderRender = template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8'));
  cache._commonStaticRender = template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8'));
  cache._commonFooterRender = template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8'));
  cache._channelHomePageRender = template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8'));
  cache._channelFootRender = template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8'));

  // 大人店公共头尾部
  cache._shopCommonHeadRender = template.compile(fs.readFileSync('views/mobile/shop/common/head.tmpl','utf8'));
  cache._shopCommonHeaderRender = template.compile(fs.readFileSync('views/mobile/shop/common/header.tmpl','utf8'));
  cache._shopCommonFootRender = template.compile(fs.readFileSync('views/mobile/shop/common/foot.tmpl','utf8'));
  cache._shopCommonFooterRender = template.compile(fs.readFileSync('views/mobile/shop/common/footer.tmpl','utf8'));
  // 店铺升级页面
  cache._shopUpgradeRender = template.compile(fs.readFileSync('views/mobile/shop/upgrade/shop-upgrade-home.tmpl','utf8'));

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
MidProxy.init( './api/'+ mock +'/OAuth/interface_oauth.json' );
MidProxy.init( './api/'+ mock +'/homepage/interface_1.json' );
MidProxy.init( './api/'+ mock +'/homepage/interface_2.json' );
MidProxy.init( './api/'+ mock +'/shop/interface_shop.json' );


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

app.use(router.routes());

app.use(errorHandler.error404);

app.use(errorHandler.error50x);

log.info("listening on port 8112");
var server = app.listen(8112);

// 代理 uncaughtException 事件处理
graceful({
  servers: [server],
  killTimeout: '15s'
});