
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
})('lib/proxy/modelproxy-client.js', [1,5,21,23,55,59,117,158,162,166,3,7,17,27,32,25,29,38,39,41,47,50,56,61,67,64,75,79,83,96,85,86,89,92,93,100,101,102,103,107,111,105,125,127,128,122,123,131,133,136,137,138,139,141,143,146,154,159,163], {"24_13_18":0,"28_13_8":0,"37_13_9":0,"38_22_4":0,"60_13_8":0,"63_17_29":0,"71_13_8":0,"73_13_27":0,"74_17_30":0,"82_13_24":0,"88_21_19":0,"103_29_6":0,"103_39_2":0,"104_25_12":0,"119_17_23":0,"121_17_12":0,"139_24_5":0,"139_33_28":0,"141_38_11":0,"141_53_17":0,"142_29_33":0}, ["KISSY.add( 'modelproxy', function ( S, IO ) {","    function Proxy( options ) {","        this._opt = options;","    }","    Proxy.prototype = {","        request: function( params, callback, errCallback ) {","            IO( {","                url: Proxy.base + '/' + this._opt.id,","                data: params,","                type: this._opt.method,","                dataType: this._opt.dataType,","                success: callback,","                error: errCallback","            } );","        },","        getOptions: function() {","            return this._opt;","        }","    };","","    Proxy.objects = {};","","    Proxy.create = function( id ) {","        if ( this.objects[ id ] ) {","            return this.objects[ id ];","        }","        var options = this._interfaces[ id ];","        if ( !options ) {","            throw new Error( 'No such interface id defined: '","                 + id + ', please check your interface configuration file' );","        }","        return this.objects[ id ] = new this( options );","    },","","      // 客户端异步获取接口配置","    Proxy.configBase = function( base ) {","        if ( this.base ) return;","        this.base = ( base || '' ).replace( /\\/$/, '' );","        var self = this;","        // load interfaces definition.","        IO( {","            url: this.base + '/$interfaces',","            async: false,","            type: 'get',","            dataType: 'json',","            success: function( interfaces ) {","                self.config( interfaces );","            },","            error: function( err ) {","                throw err;","            }","        } );","    };","","    Proxy.config = function( interfaces ) {","        this._interfaces = interfaces;","    };","","    Proxy.getInterfaceIdsByPrefix = function( pattern ) {","        if ( !pattern ) return [];","        var ids = [], map = this._interfaces, len = pattern.length;","        for ( var id in map ) {","            if ( id.slice( 0, len ) == pattern ) {","                ids.push( id );","            }","        }","        return ids;","    };","","    function ModelProxy( profile ) {","        if ( !profile ) return;","","        if ( typeof profile === 'string' ) {","            if ( /^(\\w+\\.)+\\*$/.test( profile ) ) {","                profile = Proxy","                    .getInterfaceIdsByPrefix( profile.replace( /\\*$/, '' ) );","","            } else {","                profile = [ profile ];","            }","        }","        if ( profile instanceof Array ) {","            var prof = {}, methodName;","            for ( var i = profile.length - 1; i >= 0; i-- ) {","                methodName = profile[ i ];","                methodName = methodName","                                .substring( methodName.lastIndexOf( '.' ) + 1 );","                if ( !prof[ methodName ] ) {","                    prof[ methodName ] = profile[ i ];","","                } else {","                    methodName = profile[ i ].replace( /\\./g, '_' );","                    prof[ methodName ] = profile[ i ]; ","                }","            }","            profile = prof;","        }","        ","        for ( var method in profile ) {","            this[ method ] = ( function( methodName, interfaceId ) {","                var proxy = Proxy.create( interfaceId );","                return function( params ) {","                    params = params || {};","                    if ( !this._queue ) {","                        this._queue = [];","                    }","                    this._queue.push( {","                        params: params,","                        proxy: proxy","                    } );","                    return this;","                };","            } )( method, profile[ method ] );","        }","    }","","    ModelProxy.prototype = {","        done: function( f, ef ) {","            if ( typeof f !== 'function' ) return;","","            if ( !this._queue ) {","                f.apply( this );","                return;","            }","            this._sendRequestsParallel( this._queue, f, ef );","","            this._queue = null;","            return this;","        },","        _sendRequestsParallel: function( queue, callback, errCallback ) {","            var args = [], self = this;","","            var cnt = queue.length;","","            for ( var i = 0; i < queue.length; i++ ) {","                ( function( reqObj, k ) {","                    reqObj.proxy.request( reqObj.params, function( data ) {","                        args[ k ] = data;","                        --cnt || callback.apply( self, args );","                    }, function( err ) {","                        errCallback = errCallback || self._errCallback;","                        if ( typeof errCallback === 'function' ) {","                            errCallback( err );","","                        } else {","                            console.error( 'Error occured when sending request ='","                                , reqObj.proxy.getOptions(), '\\nCaused by:\\n', err );","                        }","                    } );","                } )( queue[i], i );","            }","        },","        error: function( f ) {","            this._errCallback = f;","        }","    };","","    ModelProxy.create = function( profile ) {","        return new this( profile );","    };","","    ModelProxy.configBase = function( path ) {","        Proxy.configBase( path );","    };","    ","    return ModelProxy;","","}, { requires: ['io'] } );"]);
_$jscmd("lib/proxy/modelproxy-client.js", "line", 1);

KISSY.add("modelproxy", function(S, IO) {
    function Proxy(options) {
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 3);
        this._opt = options;
    }
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 5);
    Proxy.prototype = {
        request: function(params, callback, errCallback) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 7);
            IO({
                url: Proxy.base + "/" + this._opt.id,
                data: params,
                type: this._opt.method,
                dataType: this._opt.dataType,
                success: callback,
                error: errCallback
            });
        },
        getOptions: function() {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 17);
            return this._opt;
        }
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 21);
    Proxy.objects = {};
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 23);
    Proxy.create = function(id) {
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "24_13_18", this.objects[id])) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 25);
            return this.objects[id];
        }
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 27);
        var options = this._interfaces[id];
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "28_13_8", !options)) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 29);
            throw new Error("No such interface id defined: " + id + ", please check your interface configuration file");
        }
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 32);
        return this.objects[id] = new this(options);
    }, // 客户端异步获取接口配置
    Proxy.configBase = function(base) {
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "37_13_9", this.base)) return;
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 38);
        this.base = (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "38_22_4", base) || "").replace(/\/$/, "");
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 39);
        var self = this;
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 41);
        // load interfaces definition.
        IO({
            url: this.base + "/$interfaces",
            async: false,
            type: "get",
            dataType: "json",
            success: function(interfaces) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 47);
                self.config(interfaces);
            },
            error: function(err) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 50);
                throw err;
            }
        });
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 55);
    Proxy.config = function(interfaces) {
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 56);
        this._interfaces = interfaces;
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 59);
    Proxy.getInterfaceIdsByPrefix = function(pattern) {
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "60_13_8", !pattern)) return [];
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 61);
        var ids = [], map = this._interfaces, len = pattern.length;
        for (var id in map) {
            if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "63_17_29", id.slice(0, len) == pattern)) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 64);
                ids.push(id);
            }
        }
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 67);
        return ids;
    };
    function ModelProxy(profile) {
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "71_13_8", !profile)) return;
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "73_13_27", typeof profile === "string")) {
            if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "74_17_30", /^(\w+\.)+\*$/.test(profile))) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 75);
                profile = Proxy.getInterfaceIdsByPrefix(profile.replace(/\*$/, ""));
            } else {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 79);
                profile = [ profile ];
            }
        }
        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "82_13_24", profile instanceof Array)) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 83);
            var prof = {}, methodName;
            for (var i = profile.length - 1; i >= 0; i--) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 85);
                methodName = profile[i];
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 86);
                methodName = methodName.substring(methodName.lastIndexOf(".") + 1);
                if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "88_21_19", !prof[methodName])) {
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 89);
                    prof[methodName] = profile[i];
                } else {
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 92);
                    methodName = profile[i].replace(/\./g, "_");
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 93);
                    prof[methodName] = profile[i];
                }
            }
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 96);
            profile = prof;
        }
        for (var method in profile) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 100);
            this[method] = function(methodName, interfaceId) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 101);
                var proxy = Proxy.create(interfaceId);
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 102);
                return function(params) {
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 103);
                    params = _$jscmd("lib/proxy/modelproxy-client.js", "cond", "103_29_6", params) || _$jscmd("lib/proxy/modelproxy-client.js", "cond", "103_39_2", {});
                    if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "104_25_12", !this._queue)) {
                        _$jscmd("lib/proxy/modelproxy-client.js", "line", 105);
                        this._queue = [];
                    }
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 107);
                    this._queue.push({
                        params: params,
                        proxy: proxy
                    });
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 111);
                    return this;
                };
            }(method, profile[method]);
        }
    }
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 117);
    ModelProxy.prototype = {
        done: function(f, ef) {
            if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "119_17_23", typeof f !== "function")) return;
            if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "121_17_12", !this._queue)) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 122);
                f.apply(this);
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 123);
                return;
            }
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 125);
            this._sendRequestsParallel(this._queue, f, ef);
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 127);
            this._queue = null;
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 128);
            return this;
        },
        _sendRequestsParallel: function(queue, callback, errCallback) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 131);
            var args = [], self = this;
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 133);
            var cnt = queue.length;
            for (var i = 0; i < queue.length; i++) {
                _$jscmd("lib/proxy/modelproxy-client.js", "line", 136);
                (function(reqObj, k) {
                    _$jscmd("lib/proxy/modelproxy-client.js", "line", 137);
                    reqObj.proxy.request(reqObj.params, function(data) {
                        _$jscmd("lib/proxy/modelproxy-client.js", "line", 138);
                        args[k] = data;
                        _$jscmd("lib/proxy/modelproxy-client.js", "line", 139);
                        _$jscmd("lib/proxy/modelproxy-client.js", "cond", "139_24_5", --cnt) || _$jscmd("lib/proxy/modelproxy-client.js", "cond", "139_33_28", callback.apply(self, args));
                    }, function(err) {
                        _$jscmd("lib/proxy/modelproxy-client.js", "line", 141);
                        errCallback = _$jscmd("lib/proxy/modelproxy-client.js", "cond", "141_38_11", errCallback) || _$jscmd("lib/proxy/modelproxy-client.js", "cond", "141_53_17", self._errCallback);
                        if (_$jscmd("lib/proxy/modelproxy-client.js", "cond", "142_29_33", typeof errCallback === "function")) {
                            _$jscmd("lib/proxy/modelproxy-client.js", "line", 143);
                            errCallback(err);
                        } else {
                            _$jscmd("lib/proxy/modelproxy-client.js", "line", 146);
                            console.error("Error occured when sending request =", reqObj.proxy.getOptions(), "\nCaused by:\n", err);
                        }
                    });
                })(queue[i], i);
            }
        },
        error: function(f) {
            _$jscmd("lib/proxy/modelproxy-client.js", "line", 154);
            this._errCallback = f;
        }
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 158);
    ModelProxy.create = function(profile) {
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 159);
        return new this(profile);
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 162);
    ModelProxy.configBase = function(path) {
        _$jscmd("lib/proxy/modelproxy-client.js", "line", 163);
        Proxy.configBase(path);
    };
    _$jscmd("lib/proxy/modelproxy-client.js", "line", 166);
    return ModelProxy;
}, {
    requires: [ "io" ]
});