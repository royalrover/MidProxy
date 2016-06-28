/** 
 * MidProxy
 * As named, this class is provided to model the proxy.
 * @author ShanFan
 * @created 24-3-2014
 **/

// Dependencies
var InterfaceManager = require( './interfacemanager' )
  , ProxyFactory = require( './proxyfactory' );
var path = require('path');
// 日志打点
var logger = require(path.join(process.cwd(),'/lib/log4js/logger'));
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
function MidProxy( profile ) {
    if ( !profile ) return;

    if ( typeof profile === 'string' ) {

        // Get ids via prefix pattern like 'packageName.*'
        if ( /^(\w+\.)+\*$/.test( profile ) ) {
            profile = ProxyFactory
                .getInterfaceIdsByPrefix( profile.replace( /\*$/, '' ) );

        } else {
            profile = [ profile ];
        }
    }
    if ( profile instanceof Array ) {
        var prof = {}, methodName;
        for ( var i = profile.length - 1; i >= 0; i-- ) {
            methodName = profile[ i ];
            methodName = methodName
                            .substring( methodName.lastIndexOf( '.' ) + 1 );
            if ( !prof[ methodName ] ) {
                prof[ methodName ] = profile[ i ];

            // The method name is duplicated, so the full interface id is set
            // as the method name.
            } else {
                methodName = profile[ i ].replace( /\./g, '_' );
                prof[ methodName ] = profile[ i ]; 
            }
        }
        profile = prof;
    }
    
    // Construct the model following the profile
    for ( var method in profile ) {
        // 针对每个配置的接口创建一个对应函数
        this[ method ] = ( function( methodName, interfaceId ) {
            var proxy = ProxyFactory.create( interfaceId );
            return function( params ) {
                params = params || {};

                if ( !this._queue ) {
                    this._queue = [];
                }
                // Push this method call into request queue. Once the done method
                // is called, all requests in this queue will be sent.
                this._queue.push( {
                    params: params,
                    proxy: proxy
                } );
                return this;
            };
        } )( method, profile[ method ] );
        // this._addMethod( method, profile[ method ] );
    }
}

MidProxy.prototype = {
    done: function(f) {
        var self = this;
        if ( typeof f !== 'function' ) return;

        // No request pushed in _queue, so callback directly and return.
        if ( !this._queue ) {
            f.apply( this );
            return;
        }
        // Send requests parallel
        self._sendRequestsParallel( self._queue,f);

        // Clear queue
        self._queue = null;

        return self;
    },
    withCookie: function( cookie ) {
        this._cookies = cookie;
        return this;
    },
    _done: function(resolve,reject){
        if ( !this._queue ) {
            resolve();
            return;
        }

        var args = [], setcookies = [], self = this;
        var queue = this._queue;

        // Count the number of callback;
        var cnt = queue.length;

        // Send each request
        for ( var i = 0; i < queue.length; i++ ) {
            ( function( reqObj, k, cookie ) {

                reqObj.proxy.request( reqObj.params, function( data, setcookie ) {
                    args[ k ] = data;

                    // concat setcookie for cookie rewriting
                    setcookies = setcookies.concat( setcookie );

                    // 将setCookies数组作为最后一个参数传递
                    // Set-Cookie：customer=huangxp; path=/foo; domain=.ibm.com;
                    //expires= Wednesday, 19-OCT-05 23:12:40 GMT; [secure]

                    // 使用resolve传递结果，args是个数组，数组的前（len-1）项为对应请求
                    // 的结果，最后一项则为服务端设置的set-cookie集合
                    --cnt || args.push( setcookies ) && resolve(args);

                }, function( err ) {
                    logger.error('Error in lib/proxy/midproxy.js. Caused by:\n' + err.message);

                    if ( typeof reject === 'function' ) {
                    //    reject( err );
                        resolve(err);
                    }
                }, cookie ); // request with cookie.

            } )( queue[i], i, self._cookies );
        }
        // clear cookie of this request.
        self._cookies = undefined;
        // Clear queue
        self._queue = null;
    },
    _sendRequestsParallel: function( queue, callback) {
        // The final data array
        var args = [], setcookies = [], self = this;

        // Count the number of callback;
        var cnt = queue.length;

        // Send each request
        for ( var i = 0; i < queue.length; i++ ) {
            ( function( reqObj, k, cookie ) {

                reqObj.proxy.request( reqObj.params, function( data, setcookie ) {
                    // fill data for callback
                    args[ k ] = data;

                    // concat setcookie for cookie rewriting
                    setcookies = setcookies.concat( setcookie );

                    // push the set-cookies as the last parameter for the callback function.
                    --cnt || args.unshift(null) && args.push( setcookies ) && callback.apply( self, args );

                }, function( err ) {

                    if ( typeof callback === 'function' ) {
                        callback( err );

                    } else {
                        logger.error( 'Error occured when sending request ='
                            + JSON.stringify(reqObj.params) + '\nCaused by:\n' + err.stack );
                    }
                }, cookie ); // request with cookie.

            } )( queue[i], i, self._cookies );
        }
        // clear cookie of this request.
        self._cookies = undefined;
    },
    error: function( f ) {
        this._errCallback = f;
    }
};

/**
 * MidProxy.init
 * @param {String} path The path refers to the interface configuration file.
 */
MidProxy.init = function( path ) {
    ProxyFactory.use( new InterfaceManager( path ) );
};


MidProxy.create = function( profile ) {
    return new this( profile );
};

MidProxy.Interceptor = function( req, res ) {
    // todo: need to handle the case that the request url is multiple 
    // interfaces combined which configured in interface.json.
    ProxyFactory.Interceptor( req, res );
};

module.exports = MidProxy;
