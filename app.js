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
var envConfig = require('./midwares/envConfigMidware');

var cwd = process.cwd();

var app = koa();
var cache = {};

// 预编译views/mobile/common/* 的模板
var preHandle = function(){
  cache._commonBasicHeadRender = template.compile(fs.readFileSync('views/mobile/common/basicHead.tmpl','utf8'));
  cache._commonHeaderRender = template.compile(fs.readFileSync('views/mobile/common/header.tmpl','utf8'));
  cache._commonStaticRender = template.compile(fs.readFileSync('views/mobile/common/static.tmpl','utf8'));
  cache._commonFooterRender = template.compile(fs.readFileSync('views/mobile/common/footer.tmpl','utf8'));
  cache._commonChannelHomePageRender = template.compile(fs.readFileSync('views/mobile/channel/homepage/homepage.tmpl','utf8'));
  cache._commonChannelFootRender = template.compile(fs.readFileSync('views/mobile/channel/foot.tmpl','utf8'));
  cache._commonError50xRender = template.compile(fs.readFileSync('views/mobile/common/error/50x.tmpl','utf8'));
};

preHandle();

// 初始化modelproxy接口文件
MidProxy.init( './api/interface_online.json' );

// 绑定到上下文 EnvConfig属性
app.use(envConfig.config);
// HTTP Header: X-Response-Time
app.use(responseTime());
// gzip
app.use(gzip());
// binding “id” to context
app.use(reqId());
app.use(staticm('./static'));
app.use(koaBody({formidable:{uploadDir: __dirname}}));
app.use(function* (next){
  var ua = this.header['user-agent'];
  if(ua.indexOf('ShowJoyiOS') > -1 || ua.indexOf('ShowJoyAndroid') > -1 || ua.indexOf('iOSAPP') > -1 || ua.indexOf('androidAPP') > -1){
    this.isApp = true;
  }
  this.isApp = false;
  this._cache = cache;
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