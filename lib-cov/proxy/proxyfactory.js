
// instrument by jscoverage, do not modifly this file
(function (file, lines, conds, source) {
  var BASE;
  if (typeof global === 'object') {
    BASE = global;
  } else if (typeof window === 'object') {
    BASE = window;
  } else {
    throw new Error('[jscoverage] unknow ENV!');
  }
  if (BASE._$jscoverage) {
    BASE._$jscmd(file, 'init', lines, conds, source);
    return;
  }
  var cov = {};
  /**
   * jsc(file, 'init', lines, condtions)
   * jsc(file, 'line', lineNum)
   * jsc(file, 'cond', lineNum, expr, start, offset)
   */
  function jscmd(file, type, line, express, start, offset) {
    var storage;
    switch (type) {
      case 'init':
        if(cov[file]){
          storage = cov[file];
        } else {
          storage = [];
          for (var i = 0; i < line.length; i ++) {
            storage[line[i]] = 0;
          }
          var condition = express;
          var source = start;
          storage.condition = condition;
          storage.source = source;
        }
        cov[file] = storage;
        break;
      case 'line':
        storage = cov[file];
        storage[line] ++;
        break;
      case 'cond':
        storage = cov[file];
        storage.condition[line] ++;
        return express;
    }
  }

  BASE._$jscoverage = cov;
  BASE._$jscmd = jscmd;
  jscmd(file, 'init', lines, conds, source);
})('lib/proxy/proxyfactory.js', [9,17,20,22,23,24,54,67,74,79,85,90,101,293,295,316,31,32,36,40,42,43,44,45,46,34,39,62,64,57,59,71,69,75,80,94,98,92,96,112,121,122,131,132,148,177,178,182,109,113,118,119,139,142,145,149,153,155,158,150,156,159,171,172,161,167,168,169,179,185,193,200,189,191,195,198,204,215,206,209,212,220,237,238,246,251,252,279,283,286,228,235,229,232,233,253,255,258,256,259,260,271,272,275,262,267,268,269,280,281,284,287,296,313,298,299,300,304,306,309,310,311], {"31_16_7":0,"31_27_2":0,"32_17_14":0,"32_35_2":0,"33_9_72":0,"33_9_32":0,"33_45_36":0,"38_9_8":0,"44_21_11":0,"46_24_16":0,"56_9_34":0,"68_9_16":0,"91_9_29":0,"95_9_4":0,"108_13_57":0,"108_13_33":0,"108_50_20":0,"113_22_37":0,"114_22_11":0,"116_13_89":0,"116_13_32":0,"117_19_36":0,"131_17_34":0,"131_54_2":0,"138_13_27":0,"144_20_26":0,"151_15_17":0,"162_26_6":0,"163_26_206":0,"164_30_48":0,"165_30_62":0,"177_8_27":0,"177_39_24":0,"188_13_37":0,"188_13_7":0,"188_24_26":0,"189_19_6":0,"190_20_23":0,"196_18_29":0,"197_18_11":0,"205_17_11":0,"208_17_22":0,"210_22_19":0,"211_22_24":0,"216_18_34":0,"217_18_39":0,"226_13_88":0,"226_13_32":0,"227_19_36":0,"229_53_4":0,"229_60_22":0,"263_26_6":0,"264_26_48":0,"271_16_26":0,"271_46_57":0,"273_56_18":0,"273_77_11":0,"297_9_29":0,"305_13_42":0}, ["/** "," * ProxyFactory, Proxy"," * This class is provided to create proxy objects following the configuration"," * @author ShanFan"," * @created 24-3-2014"," */","","// Dependencies","var fs = require( 'fs' )","  , path = require( 'path' )","  , http = require( 'http' )","  , url = require( 'url' )","  , querystring = require( 'querystring' )","  , iconv = require( 'iconv-lite' )","  , BufferHelper = require( 'bufferhelper' );","","var InterfacefManager = require( './interfacemanager' );","","// Instance of InterfaceManager, will be intialized when the proxy.use() is called.","var interfaceManager;","","var STATUS_MOCK = 'mock';","var STATUS_MOCK_ERR = 'mockerr';","var ENCODING_RAW = 'raw';","","// Current Proxy Status","// var CurrentStatus;","","// Proxy constructor","function Proxy( options ) {","    this._opt = options || {};","    this._urls = this._opt.urls || {};","    if ( this._opt.status === STATUS_MOCK || this._opt.status === STATUS_MOCK_ERR ) {","        return;","    }","    var currUrl = this._urls[ this._opt.status ];","","    if ( !currUrl ) {","        throw new Error( 'No url can be proxied!' );","    };","","    var urlObj = url.parse( currUrl );","    this._opt.hostname = urlObj.hostname;","    this._opt.port = urlObj.port || 80;","    this._opt.path = urlObj.path;","    this._opt.method = (this._opt.method || 'GET').toUpperCase();","}","","/**"," * use"," * @param {InterfaceManager} ifmgr"," * @throws errors"," */","Proxy.use = function( ifmgr ) {","","    if ( ifmgr instanceof InterfacefManager ) {","        interfaceManager = ifmgr;","    } else {","        throw new Error( 'Proxy can only use instance of InterfacefManager!' );","    }","","    this._engineName = interfaceManager.getEngine();","","    return this;","};","","Proxy.getMockEngine = function() {","    if ( this._mockEngine ) {","        return this._mockEngine;","    }","    return this._mockEngine = require( this._engineName );","};","","Proxy.getInterfaceIdsByPrefix = function( pattern ) {","    return interfaceManager.getInterfaceIdsByPrefix( pattern );","};","","// @throws errors","Proxy.getRule = function( interfaceId ) {","    return interfaceManager.getRule( interfaceId );","};","","// {Object} An object map to store created proxies. The key is interface id","// and the value is the proxy instance. ","Proxy.objects = {};","","// Proxy factory","// 代理每一个接口","// @throws errors","Proxy.create = function( interfaceId ) {","    if ( !!this.objects[ interfaceId ] ) {","        return this.objects[ interfaceId ];","    }","    var opt = interfaceManager.getProfile( interfaceId );","    if ( !opt ) {","        throw new Error( 'Invalid interface id: ' + interfaceId );","    }","    return this.objects[ interfaceId ] = new this( opt );","};","","Proxy.prototype = {","    // 该方法用于服务端请求数据","    request: function( params, callback, errCallback, cookie ) {","        // if ( typeof callback !== 'function' ) {","        //     console.error( 'No callback function for request = ', this._opt );","        //     return;","        // }","        if ( this._opt.isCookieNeeded === true && cookie === undefined ) {","            throw new Error( 'This request is cookie needed, you must set a cookie for it before request. id = ' + this._opt.id );","        }","","        errCallback = typeof errCallback !== 'function' ","                    ? function( e ) { console.error( e ); }","                    : errCallback;","","        if ( this._opt.status === STATUS_MOCK ","                || this._opt.status === STATUS_MOCK_ERR ) {","            this._mockRequest( params, callback, errCallback );","            return;","        }","        var self = this;","        var options = {","            hostname: self._opt.hostname,","            port: self._opt.port,","            path: self._opt.path,","            method: self._opt.method,","            headers: {","","            }","        };","        cookie ? options.headers['Cookie'] = cookie : '';","        var querystring = self._queryStringify( params );","","        // // Set cookie","        // options.headers = {","        //     'Cookie': cookie","        // }","        if ( self._opt.method === 'POST' ) {","            options.headers[ 'Content-Type' ] = 'application/x-www-form-urlencoded';","","            // TODO: contentLength为字节长度，使用Buffer.byteLength(str,enc)","            options.headers[ 'Content-Length' ] = Buffer.byteLength(querystring);","","        } else if ( self._opt.method === 'GET' ) {","            options.path += '?' + querystring;","        }","","        var req = http.request( options, function( res ) {","            var timer = setTimeout( function() {","                errCallback( new Error( 'timeout' ) );","            }, self._opt.timeout || 5000 );","","            var bufferHelper = new BufferHelper();","            ","            res.on( 'data', function( chunk ) {","                bufferHelper.concat( chunk );","            } );","            res.on( 'end', function() {","                var buffer = bufferHelper.toBuffer();","                try {","                    var result = self._opt.encoding === ENCODING_RAW ","                        ? buffer","                        : ( self._opt.dataType !== 'json' ","                            ? iconv.fromEncoding( buffer, self._opt.encoding )","                            : JSON.parse( iconv.fromEncoding( buffer, self._opt.encoding ) ) );","                } catch ( e ) {","                    clearTimeout( timer );","                    errCallback( new Error( \"The result has syntax error. \" + e ) );","                    return;","                }","                clearTimeout( timer );","                callback( result, res.headers['set-cookie'] );","            } );","","        } );","","        self._opt.method !== 'POST' || req.write( querystring );","        req.on( 'error', function( e ) {","            errCallback( e );","        } );","","        req.end();","    },","    getOption: function( name ) {","        return this._opt[ name ];","    },","    _queryStringify: function( params ) {","        if ( !params || typeof params === 'string' ) {","            return params || '';","        } else if ( params instanceof Array ) {","            return params.join( '&' );","        }","        var qs = [], val;","        for ( var i in params ) {","            val = typeof params[i] === 'object' ","                ? JSON.stringify( params[ i ] )","                : params[ i ];","            qs.push( i + '=' + encodeURIComponent(val) );","        }","        return qs.join( '&' );","    },","    _mockRequest: function( params, callback, errCallback ) {","        try {","            var engine = Proxy.getMockEngine();","            if ( !this._rule ) {","                this._rule = Proxy.getRule( this._opt.id );","            }","            if ( this._opt.isRuleStatic ) {","                callback( this._opt.status === STATUS_MOCK","                    ? this._rule.response ","                    : this._rule.responseError );","                return;","            }","","            callback( this._opt.status === STATUS_MOCK","                ? engine.mock( this._rule.response )","                : engine.mock( this._rule.responseError )","            );","        } catch ( e ) {","            errCallback( e );","        }","    },","    // 该方法用来代理客户端请求数据，与request方法的区别主要在于头部header是否有值","    // 代理客户端请求的话，header为原始请求中的数据","    interceptRequest: function( req, res ) {","        if ( this._opt.status === STATUS_MOCK","                || this._opt.status === STATUS_MOCK_ERR ) {","            this._mockRequest( {}, function( data ) {","                res.end( typeof data  === 'string' ? data : JSON.stringify( data ) );","            }, function( e ) {","                // console.error( 'Error ocurred when mocking data', e );","                res.statusCode = 500;","                res.end( 'Error orccured when mocking data' );","            } );","            return;","        }","        var self = this;","        var options = {","            hostname: self._opt.hostname,","            port: self._opt.port,","            path: self._opt.path + '?' + req.url.replace( /^[^\\?]*\\?/, '' ),","            method: self._opt.method,","            headers: req.headers","        };","","        options.headers.host = self._opt.hostname;","        // delete options.headers.referer;","        // delete options.headers['x-requested-with'];","        // delete options.headers['connection'];","        // delete options.headers['accept'];","        delete options.headers['accept-encoding'];","        var req2 = http.request( options, function( res2 ) {","            var bufferHelper = new BufferHelper();","","            res2.on( 'data', function( chunk ) {","                bufferHelper.concat( chunk );","            } );","            res2.on( 'end', function() {","                var buffer = bufferHelper.toBuffer();","                var result;","                try {","                    result = self._opt.encoding === ENCODING_RAW ","                        ? buffer","                        : iconv.fromEncoding( buffer, self._opt.encoding );","","                } catch ( e ) {","                    res.statusCode = 500;","                    res.end( e + '' );","                    return;","                }","                res2.headers['set-cookie'] && res.setHeader( 'Set-Cookie', res2.headers['set-cookie'] );","                res.setHeader( 'Content-Type'","                    , ( self._opt.dataType === 'json' ? 'application/json' : 'text/html' )","                        + ';charset=UTF-8' );","                res.end( result );","            } );","        } );","","        req2.on( 'error', function( e ) {","            res.statusCode = 500;","            res.end( e + '' );","        } );","        req.on( 'data', function( chunck ) {","            req2.write( chunck );","        } );","        req.on( 'end', function() {","            req2.end();","        } );","        ","    }","};","","var ProxyFactory = Proxy;","","ProxyFactory.Interceptor = function( req, res ) {","    var interfaceId = req.url.split( /\\?|\\// )[1];","    if ( interfaceId === '$interfaces' ) {","        var interfaces = interfaceManager.getClientInterfaces();","        res.end( JSON.stringify( interfaces ) );","        return;","    }","","    try {","        proxy = this.create( interfaceId );","        if ( proxy.getOption( 'intercepted' ) === false ) {","            throw new Error( 'This url is not intercepted by proxy.' );","        }","    } catch ( e ) {","        res.statusCode = 404;","        res.end( 'Invalid url: ' + req.url + '\\n' + e );","        return;","    }","    proxy.interceptRequest( req, res );","};","","module.exports = ProxyFactory;","",""]);
/** 
 * ProxyFactory, Proxy
 * This class is provided to create proxy objects following the configuration
 * @author ShanFan
 * @created 24-3-2014
 */
// Dependencies
_$jscmd("lib/proxy/proxyfactory.js", "line", 9);

var fs = require("fs"), path = require("path"), http = require("http"), url = require("url"), querystring = require("querystring"), iconv = require("iconv-lite"), BufferHelper = require("bufferhelper");

_$jscmd("lib/proxy/proxyfactory.js", "line", 17);

var InterfacefManager = require("./interfacemanager");

_$jscmd("lib/proxy/proxyfactory.js", "line", 20);

// Instance of InterfaceManager, will be intialized when the proxy.use() is called.
var interfaceManager;

_$jscmd("lib/proxy/proxyfactory.js", "line", 22);

var STATUS_MOCK = "mock";

_$jscmd("lib/proxy/proxyfactory.js", "line", 23);

var STATUS_MOCK_ERR = "mockerr";

_$jscmd("lib/proxy/proxyfactory.js", "line", 24);

var ENCODING_RAW = "raw";

// Current Proxy Status
// var CurrentStatus;
// Proxy constructor
function Proxy(options) {
    _$jscmd("lib/proxy/proxyfactory.js", "line", 31);
    this._opt = _$jscmd("lib/proxy/proxyfactory.js", "cond", "31_16_7", options) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "31_27_2", {});
    _$jscmd("lib/proxy/proxyfactory.js", "line", 32);
    this._urls = _$jscmd("lib/proxy/proxyfactory.js", "cond", "32_17_14", this._opt.urls) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "32_35_2", {});
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "33_9_72", _$jscmd("lib/proxy/proxyfactory.js", "cond", "33_9_32", this._opt.status === STATUS_MOCK) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "33_45_36", this._opt.status === STATUS_MOCK_ERR))) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 34);
        return;
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 36);
    var currUrl = this._urls[this._opt.status];
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "38_9_8", !currUrl)) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 39);
        throw new Error("No url can be proxied!");
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 40);
    _$jscmd("lib/proxy/proxyfactory.js", "line", 42);
    var urlObj = url.parse(currUrl);
    _$jscmd("lib/proxy/proxyfactory.js", "line", 43);
    this._opt.hostname = urlObj.hostname;
    _$jscmd("lib/proxy/proxyfactory.js", "line", 44);
    this._opt.port = _$jscmd("lib/proxy/proxyfactory.js", "cond", "44_21_11", urlObj.port) || 80;
    _$jscmd("lib/proxy/proxyfactory.js", "line", 45);
    this._opt.path = urlObj.path;
    _$jscmd("lib/proxy/proxyfactory.js", "line", 46);
    this._opt.method = (_$jscmd("lib/proxy/proxyfactory.js", "cond", "46_24_16", this._opt.method) || "GET").toUpperCase();
}

_$jscmd("lib/proxy/proxyfactory.js", "line", 54);

/**
 * use
 * @param {InterfaceManager} ifmgr
 * @throws errors
 */
Proxy.use = function(ifmgr) {
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "56_9_34", ifmgr instanceof InterfacefManager)) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 57);
        interfaceManager = ifmgr;
    } else {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 59);
        throw new Error("Proxy can only use instance of InterfacefManager!");
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 62);
    this._engineName = interfaceManager.getEngine();
    _$jscmd("lib/proxy/proxyfactory.js", "line", 64);
    return this;
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 67);

Proxy.getMockEngine = function() {
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "68_9_16", this._mockEngine)) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 69);
        return this._mockEngine;
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 71);
    return this._mockEngine = require(this._engineName);
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 74);

Proxy.getInterfaceIdsByPrefix = function(pattern) {
    _$jscmd("lib/proxy/proxyfactory.js", "line", 75);
    return interfaceManager.getInterfaceIdsByPrefix(pattern);
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 79);

// @throws errors
Proxy.getRule = function(interfaceId) {
    _$jscmd("lib/proxy/proxyfactory.js", "line", 80);
    return interfaceManager.getRule(interfaceId);
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 85);

// {Object} An object map to store created proxies. The key is interface id
// and the value is the proxy instance. 
Proxy.objects = {};

_$jscmd("lib/proxy/proxyfactory.js", "line", 90);

// Proxy factory
// 代理每一个接口
// @throws errors
Proxy.create = function(interfaceId) {
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "91_9_29", !!this.objects[interfaceId])) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 92);
        return this.objects[interfaceId];
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 94);
    var opt = interfaceManager.getProfile(interfaceId);
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "95_9_4", !opt)) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 96);
        throw new Error("Invalid interface id: " + interfaceId);
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 98);
    return this.objects[interfaceId] = new this(opt);
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 101);

Proxy.prototype = {
    // 该方法用于服务端请求数据
    request: function(params, callback, errCallback, cookie) {
        // if ( typeof callback !== 'function' ) {
        //     console.error( 'No callback function for request = ', this._opt );
        //     return;
        // }
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "108_13_57", _$jscmd("lib/proxy/proxyfactory.js", "cond", "108_13_33", this._opt.isCookieNeeded === true) && _$jscmd("lib/proxy/proxyfactory.js", "cond", "108_50_20", cookie === undefined))) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 109);
            throw new Error("This request is cookie needed, you must set a cookie for it before request. id = " + this._opt.id);
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 112);
        errCallback = typeof errCallback !== "function" ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "113_22_37", function(e) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 113);
            console.error(e);
        }) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "114_22_11", errCallback);
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "116_13_89", _$jscmd("lib/proxy/proxyfactory.js", "cond", "116_13_32", this._opt.status === STATUS_MOCK) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "117_19_36", this._opt.status === STATUS_MOCK_ERR))) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 118);
            this._mockRequest(params, callback, errCallback);
            _$jscmd("lib/proxy/proxyfactory.js", "line", 119);
            return;
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 121);
        var self = this;
        _$jscmd("lib/proxy/proxyfactory.js", "line", 122);
        var options = {
            hostname: self._opt.hostname,
            port: self._opt.port,
            path: self._opt.path,
            method: self._opt.method,
            headers: {}
        };
        _$jscmd("lib/proxy/proxyfactory.js", "line", 131);
        cookie ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "131_17_34", options.headers["Cookie"] = cookie) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "131_54_2", "");
        _$jscmd("lib/proxy/proxyfactory.js", "line", 132);
        var querystring = self._queryStringify(params);
        // // Set cookie
        // options.headers = {
        //     'Cookie': cookie
        // }
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "138_13_27", self._opt.method === "POST")) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 139);
            options.headers["Content-Type"] = "application/x-www-form-urlencoded";
            _$jscmd("lib/proxy/proxyfactory.js", "line", 142);
            // TODO: contentLength为字节长度，使用Buffer.byteLength(str,enc)
            options.headers["Content-Length"] = Buffer.byteLength(querystring);
        } else if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "144_20_26", self._opt.method === "GET")) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 145);
            options.path += "?" + querystring;
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 148);
        var req = http.request(options, function(res) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 149);
            var timer = setTimeout(function() {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 150);
                errCallback(new Error("timeout"));
            }, _$jscmd("lib/proxy/proxyfactory.js", "cond", "151_15_17", self._opt.timeout) || 5e3);
            _$jscmd("lib/proxy/proxyfactory.js", "line", 153);
            var bufferHelper = new BufferHelper();
            _$jscmd("lib/proxy/proxyfactory.js", "line", 155);
            res.on("data", function(chunk) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 156);
                bufferHelper.concat(chunk);
            });
            _$jscmd("lib/proxy/proxyfactory.js", "line", 158);
            res.on("end", function() {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 159);
                var buffer = bufferHelper.toBuffer();
                try {
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 161);
                    var result = self._opt.encoding === ENCODING_RAW ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "162_26_6", buffer) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "163_26_206", self._opt.dataType !== "json" ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "164_30_48", iconv.fromEncoding(buffer, self._opt.encoding)) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "165_30_62", JSON.parse(iconv.fromEncoding(buffer, self._opt.encoding))));
                } catch (e) {
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 167);
                    clearTimeout(timer);
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 168);
                    errCallback(new Error("The result has syntax error. " + e));
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 169);
                    return;
                }
                _$jscmd("lib/proxy/proxyfactory.js", "line", 171);
                clearTimeout(timer);
                _$jscmd("lib/proxy/proxyfactory.js", "line", 172);
                callback(result, res.headers["set-cookie"]);
            });
        });
        _$jscmd("lib/proxy/proxyfactory.js", "line", 177);
        _$jscmd("lib/proxy/proxyfactory.js", "cond", "177_8_27", self._opt.method !== "POST") || _$jscmd("lib/proxy/proxyfactory.js", "cond", "177_39_24", req.write(querystring));
        _$jscmd("lib/proxy/proxyfactory.js", "line", 178);
        req.on("error", function(e) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 179);
            errCallback(e);
        });
        _$jscmd("lib/proxy/proxyfactory.js", "line", 182);
        req.end();
    },
    getOption: function(name) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 185);
        return this._opt[name];
    },
    _queryStringify: function(params) {
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "188_13_37", _$jscmd("lib/proxy/proxyfactory.js", "cond", "188_13_7", !params) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "188_24_26", typeof params === "string"))) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 189);
            return _$jscmd("lib/proxy/proxyfactory.js", "cond", "189_19_6", params) || "";
        } else if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "190_20_23", params instanceof Array)) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 191);
            return params.join("&");
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 193);
        var qs = [], val;
        for (var i in params) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 195);
            val = typeof params[i] === "object" ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "196_18_29", JSON.stringify(params[i])) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "197_18_11", params[i]);
            _$jscmd("lib/proxy/proxyfactory.js", "line", 198);
            qs.push(i + "=" + encodeURIComponent(val));
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 200);
        return qs.join("&");
    },
    _mockRequest: function(params, callback, errCallback) {
        try {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 204);
            var engine = Proxy.getMockEngine();
            if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "205_17_11", !this._rule)) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 206);
                this._rule = Proxy.getRule(this._opt.id);
            }
            if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "208_17_22", this._opt.isRuleStatic)) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 209);
                callback(this._opt.status === STATUS_MOCK ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "210_22_19", this._rule.response) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "211_22_24", this._rule.responseError));
                _$jscmd("lib/proxy/proxyfactory.js", "line", 212);
                return;
            }
            _$jscmd("lib/proxy/proxyfactory.js", "line", 215);
            callback(this._opt.status === STATUS_MOCK ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "216_18_34", engine.mock(this._rule.response)) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "217_18_39", engine.mock(this._rule.responseError)));
        } catch (e) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 220);
            errCallback(e);
        }
    },
    // 该方法用来代理客户端请求数据，与request方法的区别主要在于头部header是否有值
    // 代理客户端请求的话，header为原始请求中的数据
    interceptRequest: function(req, res) {
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "226_13_88", _$jscmd("lib/proxy/proxyfactory.js", "cond", "226_13_32", this._opt.status === STATUS_MOCK) || _$jscmd("lib/proxy/proxyfactory.js", "cond", "227_19_36", this._opt.status === STATUS_MOCK_ERR))) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 228);
            this._mockRequest({}, function(data) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 229);
                res.end(typeof data === "string" ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "229_53_4", data) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "229_60_22", JSON.stringify(data)));
            }, function(e) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 232);
                // console.error( 'Error ocurred when mocking data', e );
                res.statusCode = 500;
                _$jscmd("lib/proxy/proxyfactory.js", "line", 233);
                res.end("Error orccured when mocking data");
            });
            _$jscmd("lib/proxy/proxyfactory.js", "line", 235);
            return;
        }
        _$jscmd("lib/proxy/proxyfactory.js", "line", 237);
        var self = this;
        _$jscmd("lib/proxy/proxyfactory.js", "line", 238);
        var options = {
            hostname: self._opt.hostname,
            port: self._opt.port,
            path: self._opt.path + "?" + req.url.replace(/^[^\?]*\?/, ""),
            method: self._opt.method,
            headers: req.headers
        };
        _$jscmd("lib/proxy/proxyfactory.js", "line", 246);
        options.headers.host = self._opt.hostname;
        _$jscmd("lib/proxy/proxyfactory.js", "line", 251);
        // delete options.headers.referer;
        // delete options.headers['x-requested-with'];
        // delete options.headers['connection'];
        // delete options.headers['accept'];
        delete options.headers["accept-encoding"];
        _$jscmd("lib/proxy/proxyfactory.js", "line", 252);
        var req2 = http.request(options, function(res2) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 253);
            var bufferHelper = new BufferHelper();
            _$jscmd("lib/proxy/proxyfactory.js", "line", 255);
            res2.on("data", function(chunk) {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 256);
                bufferHelper.concat(chunk);
            });
            _$jscmd("lib/proxy/proxyfactory.js", "line", 258);
            res2.on("end", function() {
                _$jscmd("lib/proxy/proxyfactory.js", "line", 259);
                var buffer = bufferHelper.toBuffer();
                _$jscmd("lib/proxy/proxyfactory.js", "line", 260);
                var result;
                try {
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 262);
                    result = self._opt.encoding === ENCODING_RAW ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "263_26_6", buffer) : _$jscmd("lib/proxy/proxyfactory.js", "cond", "264_26_48", iconv.fromEncoding(buffer, self._opt.encoding));
                } catch (e) {
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 267);
                    res.statusCode = 500;
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 268);
                    res.end(e + "");
                    _$jscmd("lib/proxy/proxyfactory.js", "line", 269);
                    return;
                }
                _$jscmd("lib/proxy/proxyfactory.js", "line", 271);
                _$jscmd("lib/proxy/proxyfactory.js", "cond", "271_16_26", res2.headers["set-cookie"]) && _$jscmd("lib/proxy/proxyfactory.js", "cond", "271_46_57", res.setHeader("Set-Cookie", res2.headers["set-cookie"]));
                _$jscmd("lib/proxy/proxyfactory.js", "line", 272);
                res.setHeader("Content-Type", (self._opt.dataType === "json" ? _$jscmd("lib/proxy/proxyfactory.js", "cond", "273_56_18", "application/json") : _$jscmd("lib/proxy/proxyfactory.js", "cond", "273_77_11", "text/html")) + ";charset=UTF-8");
                _$jscmd("lib/proxy/proxyfactory.js", "line", 275);
                res.end(result);
            });
        });
        _$jscmd("lib/proxy/proxyfactory.js", "line", 279);
        req2.on("error", function(e) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 280);
            res.statusCode = 500;
            _$jscmd("lib/proxy/proxyfactory.js", "line", 281);
            res.end(e + "");
        });
        _$jscmd("lib/proxy/proxyfactory.js", "line", 283);
        req.on("data", function(chunck) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 284);
            req2.write(chunck);
        });
        _$jscmd("lib/proxy/proxyfactory.js", "line", 286);
        req.on("end", function() {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 287);
            req2.end();
        });
    }
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 293);

var ProxyFactory = Proxy;

_$jscmd("lib/proxy/proxyfactory.js", "line", 295);

ProxyFactory.Interceptor = function(req, res) {
    _$jscmd("lib/proxy/proxyfactory.js", "line", 296);
    var interfaceId = req.url.split(/\?|\//)[1];
    if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "297_9_29", interfaceId === "$interfaces")) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 298);
        var interfaces = interfaceManager.getClientInterfaces();
        _$jscmd("lib/proxy/proxyfactory.js", "line", 299);
        res.end(JSON.stringify(interfaces));
        _$jscmd("lib/proxy/proxyfactory.js", "line", 300);
        return;
    }
    try {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 304);
        proxy = this.create(interfaceId);
        if (_$jscmd("lib/proxy/proxyfactory.js", "cond", "305_13_42", proxy.getOption("intercepted") === false)) {
            _$jscmd("lib/proxy/proxyfactory.js", "line", 306);
            throw new Error("This url is not intercepted by proxy.");
        }
    } catch (e) {
        _$jscmd("lib/proxy/proxyfactory.js", "line", 309);
        res.statusCode = 404;
        _$jscmd("lib/proxy/proxyfactory.js", "line", 310);
        res.end("Invalid url: " + req.url + "\n" + e);
        _$jscmd("lib/proxy/proxyfactory.js", "line", 311);
        return;
    }
    _$jscmd("lib/proxy/proxyfactory.js", "line", 313);
    proxy.interceptRequest(req, res);
};

_$jscmd("lib/proxy/proxyfactory.js", "line", 316);

module.exports = ProxyFactory;