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

var app = koa();
var cache = {};

// 当前运行环境
var env = process.argv[2];

// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  cache._commonBasicHeadRender = template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8'));
  cache._commonHeaderRender = template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8'));
  cache._commonStaticRender = template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8'));
  cache._commonFooterRender = template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8'));
  cache._channelHomePageRender = template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8'));
  cache._channelFootRender = template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8'));
  cache._commonError50xRender = template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8'));
};

preHandle();

// 初始化modelproxy接口文件
MidProxy.init( './api/interface_mock.json' );

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

// 绑定模版到请求上下文
app.use(function* (next){
  this.isApp = this.ua.isApp;
  this.EnvConfig = envConfig;
  this._cache = cache;
  this.env = env;
  yield next;
});

app.use(router.routes());


log.info("listening on port 8112");
var server = app.listen(8112);

// 代理 uncaughtException 事件处理
graceful({
  servers: [server],
  killTimeout: '15s'
});