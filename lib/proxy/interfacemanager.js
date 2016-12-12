/** 
 * InterfaceManager
 * This Class is provided to parse the interface configuration file so that
 * the Proxy class can easily access the structure of the configuration.
 * @author ShanFan
 * @created 24-3-2014
 **/

var fs = require( 'fs' );
var path = require('path');
// 日志打点
var logger = require(path.join(process.cwd(),'/lib/log4js/logger'));

/**
 * InterfaceManager 
 * @param {String|Object} path The file path of inteface configuration or the interface object
 */
function InterfaceManager( path ) {
    this._path = path;

    // {Object} Interface Mapping, The key is interface id and 
    // the value is a json profile for this interface.
    this._interfaceMap = {};

    // {Object} A interface Mapping for client, the key is interface id and 
    // the value is a json profile for this interface.
    this._clientInterfaces = {};

    typeof path === 'string'
        ? this._loadProfilesFromPath( path )
        : this._loadProfiles( path );
}

// InterfaceManager prototype
InterfaceManager.prototype = {

    // @throws errors
    _loadProfilesFromPath: function( path ) {
        logger.info( 'Loading APIs, Path = ' + path );

        try {
            var profiles = require(path);
        } catch ( e ) {
            throw new Error( 'Fail to load interface profiles.' + e );
        }
        this._loadProfiles( profiles );
    },
    
    _loadProfiles: function( profiles ) {
        if ( !profiles ) return;
        logger.info( 'Title:' + profiles.title + 'Version:', profiles.version );

        // {String} The mock engine name.
        this._engine = profiles.engine || 'mockjs';

        if ( profiles.status === undefined ) {
            throw new Error( 'There is no status specified in interface configuration!' );
        }

        // {String} The interface status in using. 
        this._status = profiles.status;

        var interfaces = profiles.interfaces || [];
        for ( var i = interfaces.length - 1; i >= 0; i-- ) {
            this._addProfile( interfaces[i] ) 
                && logger.info( 'Interface[' + interfaces[i].id + '] is loaded.' );
        }
    },
    getProfile: function( interfaceId ) {
        return this._interfaceMap[ interfaceId ];
    },
    getClientInterfaces: function() {
        return this._clientInterfaces;
    },
    // @throws errors
    getRule: function( interfaceId ) {
        if ( !interfaceId || !this._interfaceMap[ interfaceId ] ) {
            throw new Error( 'The interface profile ' + interfaceId + " is not found." );
        }
        var p = this._interfaceMap[ interfaceId ]._ruleFile;
        if ( !fs.existsSync( p ) ) {
            throw new Error( 'The rule file is not existed.\npath = ' + path );
        }
        try {
        //    var rulefile = fs.readFileSync( path, { encoding: 'utf8' } );
            var rulefile = require( p );
        } catch ( e ) {
            throw new Error( 'Fail to read rulefile of path ' + path );
        }
        return rulefile;
        /*try {
            return JSON.parse( rulefile );
        } catch( e ) {
            throw new Error( 'Rule file has syntax error. ' + e + '\npath=' + path );
        }*/
    },
    getEngine: function() {
        return this._engine;
    },
    getStatus: function( name ) {
        return this._status;
    },
    // @return Array
    getInterfaceIdsByPrefix: function( pattern ) {
        if ( !pattern ) return [];
        var ids = [], map = this._interfaceMap, len = pattern.length;
        for ( var id in map ) {
            if ( id.slice( 0, len ) == pattern ) {
                ids.push( id );
            }
        }
        return ids;
    },

    isProfileExisted: function( interfaceId ) {
        return !!this._interfaceMap[ interfaceId ];
    },
    _addProfile: function( prof ) {
        if ( !prof || !prof.id ) {
            logger.error( "Can not add interface profile without id!" );
            return false;
        }
        if ( !/^((\w+\.)*\w+)$/.test( prof.id ) ) {
            logger.error( "Invalid id: " + prof.id );
            return false;
        }
        if ( this.isProfileExisted( prof.id ) ) {
            logger.error( "Can not repeat to add interface [" + prof.id
                     + "]! Please check your interface configuration file!" );
            return false;
        }

        if ( !this._isUrlsValid( prof.urls )
                && !fs.existsSync( prof._ruleFile ) ) {
            logger.error( 'Profile is deprecated:\n' +
                prof._ruleFile + '\nNo urls is configured and No ruleFile is available' );
            return false;
        }
        if (!prof.status || (prof.status == this._status)) {
            prof.status = this._status;
        }
        prof.method         = (prof.method || 'GET').toUpperCase();
        prof.dataType       = (prof.dataType || 'json').toLowerCase();
        prof.isCookieNeeded = !!prof.isCookieNeeded || false;
        prof.signed         = !!prof.signed || false;
        prof.timeout        = prof.timeout || 10000;

        this._interfaceMap[ prof.id ] = prof;

        this._clientInterfaces[ prof.id ] = {
            id: prof.id,
            method: prof.method,
            dataType: prof.dataType
        };

        return true;
    },
    _isUrlsValid: function( urls ) {
        if ( !urls ) return false;
        for ( var i in urls ) {
            return true;
        }
        return false;
    }
};

module.exports = InterfaceManager;