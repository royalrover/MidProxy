
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
})('lib/proxy/midproxy.js', [9,11,13,83,199,204,208,214,33,37,41,56,43,44,47,52,53,62,63,64,65,72,76,68,85,94,97,99,90,91,102,103,111,112,115,149,151,107,108,119,121,122,125,133,136,137,142,155,158,188,162,164,166,169,172,177,180,191,200,205,211], {"27_9_8":0,"29_9_27":0,"32_13_30":0,"40_9_24":0,"46_17_19":0,"65_25_6":0,"65_35_2":0,"67_21_12":0,"86_13_23":0,"89_13_12":0,"106_13_12":0,"133_20_5":0,"133_29_40":0,"133_29_23":0,"133_56_13":0,"140_25_28":0,"172_20_5":0,"172_29_77":0,"172_29_45":0,"172_78_28":0,"172_29_18":0,"172_51_23":0,"176_25_30":0}, ["/** "," * MidProxy"," * As named, this class is provided to model the proxy."," * @author ShanFan"," * @created 24-3-2014"," **/","","// Dependencies","var InterfaceManager = require( './interfacemanager' )","  , ProxyFactory = require( './proxyfactory' );","var path = require('path');","// 日志打点","var logger = require(path.join(process.cwd(),'/lib/log4js/logger'));","/**"," * MidProxy Constructor"," * @param {Object|Array|String} profile. This profile describes what the model looks"," * like. eg:"," * profile = {"," *    getItems: 'Search.getItems',"," *    getCart: 'Cart.getCart'"," * }"," * profile = ['Search.getItems', 'Cart.getCart']"," * profile = 'Search.getItems'"," * profile = 'Search.*'"," */","function MidProxy( profile ) {","    if ( !profile ) return;","","    if ( typeof profile === 'string' ) {","","        // Get ids via prefix pattern like 'packageName.*'","        if ( /^(\\w+\\.)+\\*$/.test( profile ) ) {","            profile = ProxyFactory","                .getInterfaceIdsByPrefix( profile.replace( /\\*$/, '' ) );","","        } else {","            profile = [ profile ];","        }","    }","    if ( profile instanceof Array ) {","        var prof = {}, methodName;","        for ( var i = profile.length - 1; i >= 0; i-- ) {","            methodName = profile[ i ];","            methodName = methodName","                            .substring( methodName.lastIndexOf( '.' ) + 1 );","            if ( !prof[ methodName ] ) {","                prof[ methodName ] = profile[ i ];","","            // The method name is duplicated, so the full interface id is set","            // as the method name.","            } else {","                methodName = profile[ i ].replace( /\\./g, '_' );","                prof[ methodName ] = profile[ i ]; ","            }","        }","        profile = prof;","    }","    ","    // Construct the model following the profile","    for ( var method in profile ) {","        // 针对每个配置的接口创建一个对应函数","        this[ method ] = ( function( methodName, interfaceId ) {","            var proxy = ProxyFactory.create( interfaceId );","            return function( params ) {","                params = params || {};","","                if ( !this._queue ) {","                    this._queue = [];","                }","                // Push this method call into request queue. Once the done method","                // is called, all requests in this queue will be sent.","                this._queue.push( {","                    params: params,","                    proxy: proxy","                } );","                return this;","            };","        } )( method, profile[ method ] );","        // this._addMethod( method, profile[ method ] );","    }","}","","MidProxy.prototype = {","    done: function(f) {","        var self = this;","        if ( typeof f !== 'function' ) return;","","        // No request pushed in _queue, so callback directly and return.","        if ( !this._queue ) {","            f.apply( this );","            return;","        }","        // Send requests parallel","        self._sendRequestsParallel( self._queue,f);","","        // Clear queue","        self._queue = null;","","        return self;","    },","    withCookie: function( cookie ) {","        this._cookies = cookie;","        return this;","    },","    _done: function(resolve,reject){","        if ( !this._queue ) {","            resolve();","            return;","        }","","        var args = [], setcookies = [], self = this;","        var queue = this._queue;","","        // Count the number of callback;","        var cnt = queue.length;","","        // Send each request","        for ( var i = 0; i < queue.length; i++ ) {","            ( function( reqObj, k, cookie ) {","","                reqObj.proxy.request( reqObj.params, function( data, setcookie ) {","                    args[ k ] = data;","","                    // concat setcookie for cookie rewriting","                    setcookies = setcookies.concat( setcookie );","","                    // 将setCookies数组作为最后一个参数传递","                    // Set-Cookie：customer=huangxp; path=/foo; domain=.ibm.com;","                    //expires= Wednesday, 19-OCT-05 23:12:40 GMT; [secure]","","                    // 使用resolve传递结果，args是个数组，数组的前（len-1）项为对应请求","                    // 的结果，最后一项则为服务端设置的set-cookie集合","                    --cnt || args.push( setcookies ) && resolve(args);","","                }, function( err ) {","                    logger.error('Error in lib/proxy/midproxy.js');","                    logger.error( 'Error occured when sending request ='","                      + reqObj.params + '\\nCaused by:\\n', err.message );","","                    if ( typeof reject === 'function' ) {","                    //    reject( err );","                        resolve(err);","                    }","                }, cookie ); // request with cookie.","","            } )( queue[i], i, self._cookies );","        }","        // clear cookie of this request.","        self._cookies = undefined;","        // Clear queue","        self._queue = null;","    },","    _sendRequestsParallel: function( queue, callback) {","        // The final data array","        var args = [], setcookies = [], self = this;","","        // Count the number of callback;","        var cnt = queue.length;","","        // Send each request","        for ( var i = 0; i < queue.length; i++ ) {","            ( function( reqObj, k, cookie ) {","","                reqObj.proxy.request( reqObj.params, function( data, setcookie ) {","                    // fill data for callback","                    args[ k ] = data;","","                    // concat setcookie for cookie rewriting","                    setcookies = setcookies.concat( setcookie );","","                    // push the set-cookies as the last parameter for the callback function.","                    --cnt || args.unshift(null) && args.push( setcookies ) && callback.apply( self, args );","","                }, function( err ) {","","                    if ( typeof callback === 'function' ) {","                        callback( err );","","                    } else {","                        logger.error( 'Error occured when sending request ='","                            + reqObj.params + '\\nCaused by:\\n' + err.message );","                    }","                }, cookie ); // request with cookie.","","            } )( queue[i], i, self._cookies );","        }","        // clear cookie of this request.","        self._cookies = undefined;","    },","    error: function( f ) {","        this._errCallback = f;","    }","};","","/**"," * MidProxy.init"," * @param {String} path The path refers to the interface configuration file."," */","MidProxy.init = function( path ) {","    ProxyFactory.use( new InterfaceManager( path ) );","};","","","MidProxy.create = function( profile ) {","    return new this( profile );","};","","MidProxy.Interceptor = function( req, res ) {","    // todo: need to handle the case that the request url is multiple ","    // interfaces combined which configured in interface.json.","    ProxyFactory.Interceptor( req, res );","};","","module.exports = MidProxy;",""]);
/** 
 * MidProxy
 * As named, this class is provided to model the proxy.
 * @author ShanFan
 * @created 24-3-2014
 **/
// Dependencies
_$jscmd("lib/proxy/midproxy.js", "line", 9);

var InterfaceManager = require("./interfacemanager"), ProxyFactory = require("./proxyfactory");

_$jscmd("lib/proxy/midproxy.js", "line", 11);

var path = require("path");

_$jscmd("lib/proxy/midproxy.js", "line", 13);

// 日志打点
var logger = require(path.join(process.cwd(), "/lib/log4js/logger"));

/**
 * MidProxy Constructor
 * @param {Object|Array|String} profile. This profile describes what the model looks
 * like. eg:
 * profile = {
 *    getItems: 'Search.getItems',
 *    getCart: 'Cart.getCart'
 * }
 * profile = ['Search.getItems', 'Cart.getCart']
 * profile = 'Search.getItems'
 * profile = 'Search.*'
 */
function MidProxy(profile) {
    if (_$jscmd("lib/proxy/midproxy.js", "cond", "27_9_8", !profile)) return;
    if (_$jscmd("lib/proxy/midproxy.js", "cond", "29_9_27", typeof profile === "string")) {
        // Get ids via prefix pattern like 'packageName.*'
        if (_$jscmd("lib/proxy/midproxy.js", "cond", "32_13_30", /^(\w+\.)+\*$/.test(profile))) {
            _$jscmd("lib/proxy/midproxy.js", "line", 33);
            profile = ProxyFactory.getInterfaceIdsByPrefix(profile.replace(/\*$/, ""));
        } else {
            _$jscmd("lib/proxy/midproxy.js", "line", 37);
            profile = [ profile ];
        }
    }
    if (_$jscmd("lib/proxy/midproxy.js", "cond", "40_9_24", profile instanceof Array)) {
        _$jscmd("lib/proxy/midproxy.js", "line", 41);
        var prof = {}, methodName;
        for (var i = profile.length - 1; i >= 0; i--) {
            _$jscmd("lib/proxy/midproxy.js", "line", 43);
            methodName = profile[i];
            _$jscmd("lib/proxy/midproxy.js", "line", 44);
            methodName = methodName.substring(methodName.lastIndexOf(".") + 1);
            if (_$jscmd("lib/proxy/midproxy.js", "cond", "46_17_19", !prof[methodName])) {
                _$jscmd("lib/proxy/midproxy.js", "line", 47);
                prof[methodName] = profile[i];
            } else {
                _$jscmd("lib/proxy/midproxy.js", "line", 52);
                methodName = profile[i].replace(/\./g, "_");
                _$jscmd("lib/proxy/midproxy.js", "line", 53);
                prof[methodName] = profile[i];
            }
        }
        _$jscmd("lib/proxy/midproxy.js", "line", 56);
        profile = prof;
    }
    // Construct the model following the profile
    for (var method in profile) {
        _$jscmd("lib/proxy/midproxy.js", "line", 62);
        // 针对每个配置的接口创建一个对应函数
        this[method] = function(methodName, interfaceId) {
            _$jscmd("lib/proxy/midproxy.js", "line", 63);
            var proxy = ProxyFactory.create(interfaceId);
            _$jscmd("lib/proxy/midproxy.js", "line", 64);
            return function(params) {
                _$jscmd("lib/proxy/midproxy.js", "line", 65);
                params = _$jscmd("lib/proxy/midproxy.js", "cond", "65_25_6", params) || _$jscmd("lib/proxy/midproxy.js", "cond", "65_35_2", {});
                if (_$jscmd("lib/proxy/midproxy.js", "cond", "67_21_12", !this._queue)) {
                    _$jscmd("lib/proxy/midproxy.js", "line", 68);
                    this._queue = [];
                }
                _$jscmd("lib/proxy/midproxy.js", "line", 72);
                // Push this method call into request queue. Once the done method
                // is called, all requests in this queue will be sent.
                this._queue.push({
                    params: params,
                    proxy: proxy
                });
                _$jscmd("lib/proxy/midproxy.js", "line", 76);
                return this;
            };
        }(method, profile[method]);
    }
}

_$jscmd("lib/proxy/midproxy.js", "line", 83);

MidProxy.prototype = {
    done: function(f) {
        _$jscmd("lib/proxy/midproxy.js", "line", 85);
        var self = this;
        if (_$jscmd("lib/proxy/midproxy.js", "cond", "86_13_23", typeof f !== "function")) return;
        // No request pushed in _queue, so callback directly and return.
        if (_$jscmd("lib/proxy/midproxy.js", "cond", "89_13_12", !this._queue)) {
            _$jscmd("lib/proxy/midproxy.js", "line", 90);
            f.apply(this);
            _$jscmd("lib/proxy/midproxy.js", "line", 91);
            return;
        }
        _$jscmd("lib/proxy/midproxy.js", "line", 94);
        // Send requests parallel
        self._sendRequestsParallel(self._queue, f);
        _$jscmd("lib/proxy/midproxy.js", "line", 97);
        // Clear queue
        self._queue = null;
        _$jscmd("lib/proxy/midproxy.js", "line", 99);
        return self;
    },
    withCookie: function(cookie) {
        _$jscmd("lib/proxy/midproxy.js", "line", 102);
        this._cookies = cookie;
        _$jscmd("lib/proxy/midproxy.js", "line", 103);
        return this;
    },
    _done: function(resolve, reject) {
        if (_$jscmd("lib/proxy/midproxy.js", "cond", "106_13_12", !this._queue)) {
            _$jscmd("lib/proxy/midproxy.js", "line", 107);
            resolve();
            _$jscmd("lib/proxy/midproxy.js", "line", 108);
            return;
        }
        _$jscmd("lib/proxy/midproxy.js", "line", 111);
        var args = [], setcookies = [], self = this;
        _$jscmd("lib/proxy/midproxy.js", "line", 112);
        var queue = this._queue;
        _$jscmd("lib/proxy/midproxy.js", "line", 115);
        // Count the number of callback;
        var cnt = queue.length;
        // Send each request
        for (var i = 0; i < queue.length; i++) {
            _$jscmd("lib/proxy/midproxy.js", "line", 119);
            (function(reqObj, k, cookie) {
                _$jscmd("lib/proxy/midproxy.js", "line", 121);
                reqObj.proxy.request(reqObj.params, function(data, setcookie) {
                    _$jscmd("lib/proxy/midproxy.js", "line", 122);
                    args[k] = data;
                    _$jscmd("lib/proxy/midproxy.js", "line", 125);
                    // concat setcookie for cookie rewriting
                    setcookies = setcookies.concat(setcookie);
                    _$jscmd("lib/proxy/midproxy.js", "line", 133);
                    // 将setCookies数组作为最后一个参数传递
                    // Set-Cookie：customer=huangxp; path=/foo; domain=.ibm.com;
                    //expires= Wednesday, 19-OCT-05 23:12:40 GMT; [secure]
                    // 使用resolve传递结果，args是个数组，数组的前（len-1）项为对应请求
                    // 的结果，最后一项则为服务端设置的set-cookie集合
                    _$jscmd("lib/proxy/midproxy.js", "cond", "133_20_5", --cnt) || _$jscmd("lib/proxy/midproxy.js", "cond", "133_29_40", _$jscmd("lib/proxy/midproxy.js", "cond", "133_29_23", args.push(setcookies)) && _$jscmd("lib/proxy/midproxy.js", "cond", "133_56_13", resolve(args)));
                }, function(err) {
                    _$jscmd("lib/proxy/midproxy.js", "line", 136);
                    logger.error("Error in lib/proxy/midproxy.js");
                    _$jscmd("lib/proxy/midproxy.js", "line", 137);
                    logger.error("Error occured when sending request =" + reqObj.params + "\nCaused by:\n", err.message);
                    if (_$jscmd("lib/proxy/midproxy.js", "cond", "140_25_28", typeof reject === "function")) {
                        _$jscmd("lib/proxy/midproxy.js", "line", 142);
                        //    reject( err );
                        resolve(err);
                    }
                }, cookie);
            })(queue[i], i, self._cookies);
        }
        _$jscmd("lib/proxy/midproxy.js", "line", 149);
        // clear cookie of this request.
        self._cookies = undefined;
        _$jscmd("lib/proxy/midproxy.js", "line", 151);
        // Clear queue
        self._queue = null;
    },
    _sendRequestsParallel: function(queue, callback) {
        _$jscmd("lib/proxy/midproxy.js", "line", 155);
        // The final data array
        var args = [], setcookies = [], self = this;
        _$jscmd("lib/proxy/midproxy.js", "line", 158);
        // Count the number of callback;
        var cnt = queue.length;
        // Send each request
        for (var i = 0; i < queue.length; i++) {
            _$jscmd("lib/proxy/midproxy.js", "line", 162);
            (function(reqObj, k, cookie) {
                _$jscmd("lib/proxy/midproxy.js", "line", 164);
                reqObj.proxy.request(reqObj.params, function(data, setcookie) {
                    _$jscmd("lib/proxy/midproxy.js", "line", 166);
                    // fill data for callback
                    args[k] = data;
                    _$jscmd("lib/proxy/midproxy.js", "line", 169);
                    // concat setcookie for cookie rewriting
                    setcookies = setcookies.concat(setcookie);
                    _$jscmd("lib/proxy/midproxy.js", "line", 172);
                    // push the set-cookies as the last parameter for the callback function.
                    _$jscmd("lib/proxy/midproxy.js", "cond", "172_20_5", --cnt) || _$jscmd("lib/proxy/midproxy.js", "cond", "172_29_77", _$jscmd("lib/proxy/midproxy.js", "cond", "172_29_45", _$jscmd("lib/proxy/midproxy.js", "cond", "172_29_18", args.unshift(null)) && _$jscmd("lib/proxy/midproxy.js", "cond", "172_51_23", args.push(setcookies))) && _$jscmd("lib/proxy/midproxy.js", "cond", "172_78_28", callback.apply(self, args)));
                }, function(err) {
                    if (_$jscmd("lib/proxy/midproxy.js", "cond", "176_25_30", typeof callback === "function")) {
                        _$jscmd("lib/proxy/midproxy.js", "line", 177);
                        callback(err);
                    } else {
                        _$jscmd("lib/proxy/midproxy.js", "line", 180);
                        logger.error("Error occured when sending request =" + reqObj.params + "\nCaused by:\n" + err.message);
                    }
                }, cookie);
            })(queue[i], i, self._cookies);
        }
        _$jscmd("lib/proxy/midproxy.js", "line", 188);
        // clear cookie of this request.
        self._cookies = undefined;
    },
    error: function(f) {
        _$jscmd("lib/proxy/midproxy.js", "line", 191);
        this._errCallback = f;
    }
};

_$jscmd("lib/proxy/midproxy.js", "line", 199);

/**
 * MidProxy.init
 * @param {String} path The path refers to the interface configuration file.
 */
MidProxy.init = function(path) {
    _$jscmd("lib/proxy/midproxy.js", "line", 200);
    ProxyFactory.use(new InterfaceManager(path));
};

_$jscmd("lib/proxy/midproxy.js", "line", 204);

MidProxy.create = function(profile) {
    _$jscmd("lib/proxy/midproxy.js", "line", 205);
    return new this(profile);
};

_$jscmd("lib/proxy/midproxy.js", "line", 208);

MidProxy.Interceptor = function(req, res) {
    _$jscmd("lib/proxy/midproxy.js", "line", 211);
    // todo: need to handle the case that the request url is multiple 
    // interfaces combined which configured in interface.json.
    ProxyFactory.Interceptor(req, res);
};

_$jscmd("lib/proxy/midproxy.js", "line", 214);

module.exports = MidProxy;