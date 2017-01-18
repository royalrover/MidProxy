/** 
 * ProxyFactory, Proxy
 * This class is provided to create proxy objects following the configuration
 * @author ShanFan
 * @created 24-3-2014
 */
"use strict";

// Dependencies
var fs = require( 'fs' )
  , path = require( 'path' )
  , http = require( 'http' )
  , url = require( 'url' )
  , querystring = require( 'querystring' )
  , iconv = require( 'iconv-lite' )
  , BufferHelper = require( 'bufferhelper' )
  , _ = require('lodash');

var InterfacefManager = require( './interfacemanager' );

// Instance of InterfaceManager, will be intialized when the proxy.use() is called.
var interfaceManager,interfaceManagers = [];

var STATUS_MOCK = 'mock';
var STATUS_MOCK_ERR = 'mockerr';
var ENCODING_RAW = 'raw';

// Current Proxy Status
// var CurrentStatus;

// Proxy constructor
function Proxy( options ) {
    this._opt = options || {};
    this._urls = this._opt.urls || {};
    if ( this._opt.status === STATUS_MOCK || this._opt.status === STATUS_MOCK_ERR ) {
        return;
    }
    //var currUrl = this._urls[ this._opt.status ];
    var currUrl = this._urls[ apiEnv ];

    if ( !currUrl ) {
        throw new Error( 'No url can be proxied!' );
    }

    var urlObj = url.parse( currUrl );
    this._opt.hostname = urlObj.hostname;
    this._opt.port = urlObj.port || 80;
    this._opt.path = urlObj.path;
    this._opt.method = (this._opt.method || 'GET').toUpperCase();
}

/**
 * use
 * @param {InterfaceManager} ifmgr
 * @throws errors
 */
Proxy.use = function( ifmgr ) {

    if ( ifmgr instanceof InterfacefManager ) {
        // 判断相同_path的InterfacefManager实例是否存在，若存在则删除已存在的实例，用于热加载替换
        for(let i= 0,len=interfaceManagers.length;i<len;i++){
            let item = interfaceManagers[i];
            if(item._path == ifmgr._path){
                interfaceManagers.splice(i,1);
            }
        }
        interfaceManagers.push(ifmgr);
    } else {
        throw new Error( 'Proxy can only use instance of InterfacefManager!' );
    }

    var engine = interfaceManagers[0].getEngine();
    for(let i = 1,len = interfaceManagers.length;i<len;i++){
        var item = interfaceManagers[i];
        if(engine !== item.getEngine()){
            throw new Error('interface files\' Engine is difference!');
        }
    }
    this._engineName = engine;
    return this;
};

Proxy.getMockEngine = function() {
    if ( this._mockEngine ) {
        return this._mockEngine;
    }
    return this._mockEngine = require( this._engineName );
};

Proxy.getInterfaceIdsByPrefix = function( pattern ) {
    var ret = [];
    for(let i = 0,len = interfaceManagers.length;i<len;i++){
        var r = interfaceManagers[i].getInterfaceIdsByPrefix( pattern );
        ret = ret.concat(r);
    }
    return ret;
};

// @throws errors
Proxy.getRule = function( interfaceId ) {
    var ret;
    for(let i = 0,len = interfaceManagers.length;i<len;i++){

        var im = interfaceManagers[i],r;
        // 判断当前interface是否含有该接口，防止在interfaceManager.getRule时报“无此接口”的错误
        if(im.getProfile(interfaceId)){
            r = im.getRule( interfaceId );
        }
        if(r){
            ret = r;
            break;
        }
    }
    return ret;
};

// {Object} An object map to store created proxies. The key is interface id
// and the value is the proxy instance. 
Proxy.objects = {};

// Proxy factory
// 代理每一个接口
// @throws errors
Proxy.create = function( interfaceId ) {
    if ( !!this.objects[ interfaceId ] ) {
        return this.objects[ interfaceId ];
    }
    var opt;
    for(let i = 0,len = interfaceManagers.length;i<len;i++){
        let r = interfaceManagers[i].getProfile( interfaceId );
        if(r){
            opt = r;
            break;
        }
    }
    if ( !opt ) {
        throw new Error( 'Invalid interface id: ' + interfaceId );
    }
    return this.objects[ interfaceId ] = new this( opt );
};

Proxy.prototype = {
    // 该方法用于服务端请求数据
    request: function( params, callback, errCallback, cookie ) {
        // if ( typeof callback !== 'function' ) {
        //     console.error( 'No callback function for request = ', this._opt );
        //     return;
        // }

        errCallback = typeof errCallback !== 'function'
          ? function( e ) { console.error( e ); }
          : errCallback;

        if ( this._opt.isCookieNeeded === true && cookie === undefined ) {
            errCallback( new Error( 'This request is cookie needed, you must set a cookie for it before request. id = ' + this._opt.id ));
        }

        if ( this._opt.status === STATUS_MOCK
                || this._opt.status === STATUS_MOCK_ERR ) {
            console.log('mock...')
            this._mockRequest( params, callback, errCallback );
            return;
        }
        var self = this;
        var options = {
            hostname: self._opt.hostname,
            port: self._opt.port,
            path: self._opt.path,
            method: self._opt.method,
            headers: {
            }
        };
        cookie ? options.headers['Cookie'] = cookie : '';
        var querystring = self._queryStringify( params );

        // // Set cookie
        // options.headers = {
        //     'Cookie': cookie
        // }
        if ( self._opt.method === 'POST' ) {
            options.headers[ 'Content-Type' ] = 'application/x-www-form-urlencoded';

            // TODO: contentLength为字节长度，使用Buffer.byteLength(str,enc)
            options.headers[ 'Content-Length' ] = Buffer.byteLength(querystring);

        } else if ( self._opt.method === 'GET' ) {
            options.path += '?' + querystring;
        }

        var req = http.request( options, function( res ) {
            var timer = setTimeout( function() {
                errCallback( new Error( 'timeout' ) );
            }, self._opt.timeout || 5000 );

            var bufferHelper = new BufferHelper();

            res.on( 'data', function( chunk ) {
                bufferHelper.concat( chunk );
            } );
            res.on( 'end', function() {
                var buffer = bufferHelper.toBuffer();

                try {
                    var result = self._opt.encoding === ENCODING_RAW 
                        ? buffer
                        : ( self._opt.dataType !== 'json' 
                            ? iconv.fromEncoding( buffer, self._opt.encoding )
                            : JSON.parse( iconv.fromEncoding( buffer, self._opt.encoding ) ) );
                } catch ( e ) {
                    clearTimeout( timer );
                    errCallback( new Error( "The result has syntax error. " + e ) );
                    return;
                }
                clearTimeout( timer );
                callback( result, res.headers['set-cookie'], res.headers);
            } );

        } );

        // 针对post请求写查询字符串
        self._opt.method !== 'POST' || req.write( querystring );

        // todo: 针对接口请求做二次容灾    ✔
        req.on( 'error', function() {
            // 随机获取其他节点的ip，请求服务
            var anotherIp = servers[Math.floor(Math.random() * servers.length)];

            // 接口容灾，二次请求
            options.hostname = anotherIp;

            var req2 = http.request( options, function( res ) {
                var timer = setTimeout( function() {
                    errCallback( new Error( 'timeout' ) );
                }, self._opt.timeout || 5000 );

                var bufferHelper = new BufferHelper();

                res.on( 'data', function( chunk ) {
                    bufferHelper.concat( chunk );
                } );
                res.on( 'end', function() {
                    var buffer = bufferHelper.toBuffer();

                    try {
                        var result = self._opt.encoding === ENCODING_RAW
                          ? buffer
                          : ( self._opt.dataType !== 'json'
                          ? iconv.fromEncoding( buffer, self._opt.encoding )
                          : JSON.parse( iconv.fromEncoding( buffer, self._opt.encoding ) ) );
                    } catch ( e ) {
                        clearTimeout( timer );
                        errCallback( new Error( "The result has syntax error. " + e ) );
                        return;
                    }
                    clearTimeout( timer );
                    callback( result, res.headers['set-cookie'], res.headers);
                } );

            } );

            self._opt.method !== 'POST' || req2.write( querystring );

            req2.on('error',function(e){
                errCallback( e );
            });

            req2.end();
        } );

        req.end();
    },
    getOption: function( name ) {
        return this._opt[ name ];
    },
    _queryStringify: function( params ) {
        if ( !params || typeof params === 'string' ) {
            return params || '';
        } else if ( params instanceof Array ) {
            return params.join( '&' );
        }
        var qs = [], val;
        for ( var i in params ) {
            val = typeof params[i] === 'object' 
                ? JSON.stringify( params[ i ] )
                : params[ i ];
            qs.push( i + '=' + encodeURIComponent(val) );
        }
        return qs.join( '&' );
    },
    _mockRequest: function( params, callback, errCallback ) {
        try {
            var engine = Proxy.getMockEngine();
            if ( !this._rule ) {
                this._rule = Proxy.getRule( this._opt.id );
            }

            callback( this._opt.status === STATUS_MOCK
                ? engine.mock( this._rule.response )
                : engine.mock( this._rule.responseError )
            );
        } catch ( e ) {
            errCallback( e );
        }
    },
    // 该方法用来代理客户端请求数据，与request方法的区别主要在于头部header是否有值
    // 代理客户端请求的话，header为原始请求中的数据
    interceptRequest: function( req, res ) {
        if ( this._opt.status === STATUS_MOCK
                || this._opt.status === STATUS_MOCK_ERR ) {
            this._mockRequest( {}, function( data ) {
                res.end( typeof data  === 'string' ? data : JSON.stringify( data ) );
            }, function( e ) {
                // console.error( 'Error ocurred when mocking data', e );
                res.statusCode = 500;
                res.end( 'Error orccured when mocking data' );
            } );
            return;
        }
        var self = this;
        var options = {
            hostname: self._opt.hostname,
            port: self._opt.port,
            path: self._opt.path + '?' + req.url.replace( /^[^\?]*\?/, '' ),
            method: self._opt.method,
            headers: req.headers
        };

        options.headers.host = self._opt.hostname;
        // delete options.headers.referer;
        // delete options.headers['x-requested-with'];
        // delete options.headers['connection'];
        // delete options.headers['accept'];
        delete options.headers['accept-encoding'];
        var req2 = http.request( options, function( res2 ) {
            var bufferHelper = new BufferHelper();

            res2.on( 'data', function( chunk ) {
                bufferHelper.concat( chunk );
            } );
            res2.on( 'end', function() {
                var buffer = bufferHelper.toBuffer();
                var result;
                try {
                    result = self._opt.encoding === ENCODING_RAW 
                        ? buffer
                        : iconv.fromEncoding( buffer, self._opt.encoding );

                } catch ( e ) {
                    res.statusCode = 500;
                    res.end( e + '' );
                    return;
                }
                res2.headers['set-cookie'] && res.setHeader( 'Set-Cookie', res2.headers['set-cookie'] );
                res.setHeader( 'Content-Type'
                    , ( self._opt.dataType === 'json' ? 'application/json' : 'text/html' )
                        + ';charset=UTF-8' );
                res.end( result );
            } );
        } );

        req2.on( 'error', function( e ) {
            res.statusCode = 500;
            res.end( e + '' );
        } );
        req.on( 'data', function( chunck ) {
            req2.write( chunck );
        } );
        req.on( 'end', function() {
            req2.end();
        } );
        
    }
};

var ProxyFactory = Proxy;

ProxyFactory.Interceptor = function( req, res ) {
    var interfaceId = req.url.split( /\?|\// )[1];
    if ( interfaceId === '$interfaces' ) {
    //    var interfaces = interfaceManager.getClientInterfaces();
        var interfaces = {};
        for(let i = 0,len = interfaceManagers.length;i<len;i++){
            _.assign(interfaces,interfaceManagers[i].getClientInterfaces());
        }
        res.end( JSON.stringify( interfaces ) );
        return;
    }

    try {
        proxy = this.create( interfaceId );
        if ( proxy.getOption( 'intercepted' ) === false ) {
            throw new Error( 'This url is not intercepted by proxy.' );
        }
    } catch ( e ) {
        res.statusCode = 404;
        res.end( 'Invalid url: ' + req.url + '\n' + e );
        return;
    }
    proxy.interceptRequest( req, res );
};

module.exports = ProxyFactory;

