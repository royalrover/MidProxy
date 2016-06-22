
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
})('lib/proxy/interfacemanager.js', [9,10,12,39,187,19,23,27,31,33,43,55,46,48,51,53,60,62,67,74,76,70,78,83,86,93,94,91,96,99,101,104,106,110,113,118,124,121,128,145,159,160,161,162,163,164,168,170,176,132,133,136,137,140,142,150,152,156,183,181], {"31_48_46":0,"31_97_2":0,"34_10_34":0,"35_10_26":0,"59_13_9":0,"63_25_48":0,"64_25_14":0,"63_27_17":0,"67_23_15":0,"69_13_29":0,"76_25_19":0,"76_48_2":0,"78_12_33":0,"79_19_63":0,"90_13_50":0,"90_13_12":0,"90_29_34":0,"95_13_22":0,"117_13_8":0,"120_17_29":0,"131_13_17":0,"131_13_5":0,"131_22_8":0,"135_13_34":0,"139_13_32":0,"146_29_13":0,"146_46_26":0,"148_13_82":0,"148_13_31":0,"149_19_31":0,"154_12_99":0,"154_15_50":0,"155_19_25":0,"154_15_24":0,"154_43_22":0,"159_31_11":0,"160_31_13":0,"161_30_19":0,"162_30_21":0,"163_30_13":0,"164_30_12":0,"179_13_5":0}, ["/** "," * InterfaceManager"," * This Class is provided to parse the interface configuration file so that"," * the Proxy class can easily access the structure of the configuration."," * @author ShanFan"," * @created 24-3-2014"," **/","","var fs = require( 'fs' );","var path = require('path');","// 日志打点","var logger = require(path.join(process.cwd(),'/lib/log4js/logger'));","","/**"," * InterfaceManager "," * @param {String|Object} path The file path of inteface configuration or the interface object"," */","function InterfaceManager( path ) {","    this._path = path;","","    // {Object} Interface Mapping, The key is interface id and ","    // the value is a json profile for this interface.","    this._interfaceMap = {};","","    // {Object} A interface Mapping for client, the key is interface id and ","    // the value is a json profile for this interface.","    this._clientInterfaces = {};","","    // {String} The path of rulebase where the interface rules is stored. This value will be override","    // if user specified the path of rulebase in interface.json.","    this._rulebase = typeof path === 'string' ? path.replace( /\\/[^\\/]*$/, '/interfaceRules' ) : '';","","    typeof path === 'string'","        ? this._loadProfilesFromPath( path )","        : this._loadProfiles( path );","}","","// InterfaceManager prototype","InterfaceManager.prototype = {","","    // @throws errors","    _loadProfilesFromPath: function( path ) {","        logger.info( 'Loading interface profiles.\\nPath = ' + path );","","        try {","            var profiles = fs.readFileSync( path, { encoding: 'utf8' } );","        } catch ( e ) {","            throw new Error( 'Fail to load interface profiles.' + e );","        }","        try {","            profiles = JSON.parse( profiles );","        } catch( e ) {","            throw new Error( 'Interface profiles has syntax error:' + e );","        }","        this._loadProfiles( profiles );","    },","    ","    _loadProfiles: function( profiles ) {","        if ( !profiles ) return;","        logger.info( 'Title:' + profiles.title + 'Version:', profiles.version );","","        this._rulebase = profiles.rulebase ","                       ? ( profiles.rulebase || './' ).replace(/\\/$/, '')","                       : this._rulebase;","","        // {String} The mock engine name.","        this._engine = profiles.engine || 'mockjs';","","        if ( profiles.status === undefined ) {","            throw new Error( 'There is no status specified in interface configuration!' );","        }","","        // {String} The interface status in using. ","        this._status = profiles.status;","","        var interfaces = profiles.interfaces || [];","        for ( var i = interfaces.length - 1; i >= 0; i-- ) {","            this._addProfile( interfaces[i] ) ","                && logger.info( 'Interface[' + interfaces[i].id + '] is loaded.' );","        }","    },","    getProfile: function( interfaceId ) {","        return this._interfaceMap[ interfaceId ];","    },","    getClientInterfaces: function() {","        return this._clientInterfaces;","    },","    // @throws errors","    getRule: function( interfaceId ) {","        if ( !interfaceId || !this._interfaceMap[ interfaceId ] ) {","            throw new Error( 'The interface profile ' + interfaceId + \" is not found.\" );","        }","        path = this._interfaceMap[ interfaceId ].ruleFile;","        console.log(path)","        if ( !fs.existsSync( path ) ) {","            throw new Error( 'The rule file is not existed.\\npath = ' + path );","        }","        try {","            var rulefile = fs.readFileSync( path, { encoding: 'utf8' } );","        } catch ( e ) {","            throw new Error( 'Fail to read rulefile of path ' + path );","        }","        try {","            return JSON.parse( rulefile );","        } catch( e ) {","            throw new Error( 'Rule file has syntax error. ' + e + '\\npath=' + path );","        }","    },","    getEngine: function() {","        return this._engine;","    },","    getStatus: function( name ) {","        return this._status;","    },","    // @return Array","    getInterfaceIdsByPrefix: function( pattern ) {","        if ( !pattern ) return [];","        var ids = [], map = this._interfaceMap, len = pattern.length;","        for ( var id in map ) {","            if ( id.slice( 0, len ) == pattern ) {","                ids.push( id );","            }","        }","        return ids;","    },","","    isProfileExisted: function( interfaceId ) {","        return !!this._interfaceMap[ interfaceId ];","    },","    _addProfile: function( prof ) {","        if ( !prof || !prof.id ) {","            logger.error( \"Can not add interface profile without id!\" );","            return false;","        }","        if ( !/^((\\w+\\.)*\\w+)$/.test( prof.id ) ) {","            logger.error( \"Invalid id: \" + prof.id );","            return false;","        }","        if ( this.isProfileExisted( prof.id ) ) {","            logger.error( \"Can not repeat to add interface [\" + prof.id","                     + \"]! Please check your interface configuration file!\" );","            return false;","        }","","        prof.ruleFile = this._rulebase + '/'","                         + ( prof.ruleFile || ( prof.id + \".rule.json\" ) );","","        if ( !this._isUrlsValid( prof.urls )","                && !fs.existsSync( prof.ruleFile ) ) {","            logger.error( 'Profile is deprecated:\\n' +","                prof + '\\nNo urls is configured and No ruleFile is available' );","            return false;","        }","        if (!( prof.status in prof.urls || prof.status === 'mock'","                || prof.status === 'mockerr')) {","            prof.status = this._status;","        }","","        prof.method         = (prof.method || 'GET').toUpperCase();","        prof.dataType       = (prof.dataType || 'json').toLowerCase();","        prof.isRuleStatic   = !!prof.isRuleStatic || false;","        prof.isCookieNeeded = !!prof.isCookieNeeded || false;","        prof.signed         = !!prof.signed || false;","        prof.timeout        = prof.timeout || 10000;","","        // prof.format","        // prof.filter         = ...","        this._interfaceMap[ prof.id ] = prof;","","        this._clientInterfaces[ prof.id ] = {","            id: prof.id,","            method: prof.method,","            dataType: prof.dataType","        };","","        return true;","    },","    _isUrlsValid: function( urls ) {","        if ( !urls ) return false;","        for ( var i in urls ) {","            return true;","        }","        return false;","    }","};","","module.exports = InterfaceManager;"]);
/** 
 * InterfaceManager
 * This Class is provided to parse the interface configuration file so that
 * the Proxy class can easily access the structure of the configuration.
 * @author ShanFan
 * @created 24-3-2014
 **/
_$jscmd("lib/proxy/interfacemanager.js", "line", 9);

var fs = require("fs");

_$jscmd("lib/proxy/interfacemanager.js", "line", 10);

var path = require("path");

_$jscmd("lib/proxy/interfacemanager.js", "line", 12);

// 日志打点
var logger = require(path.join(process.cwd(), "/lib/log4js/logger"));

/**
 * InterfaceManager 
 * @param {String|Object} path The file path of inteface configuration or the interface object
 */
function InterfaceManager(path) {
    _$jscmd("lib/proxy/interfacemanager.js", "line", 19);
    this._path = path;
    _$jscmd("lib/proxy/interfacemanager.js", "line", 23);
    // {Object} Interface Mapping, The key is interface id and 
    // the value is a json profile for this interface.
    this._interfaceMap = {};
    _$jscmd("lib/proxy/interfacemanager.js", "line", 27);
    // {Object} A interface Mapping for client, the key is interface id and 
    // the value is a json profile for this interface.
    this._clientInterfaces = {};
    _$jscmd("lib/proxy/interfacemanager.js", "line", 31);
    // {String} The path of rulebase where the interface rules is stored. This value will be override
    // if user specified the path of rulebase in interface.json.
    this._rulebase = typeof path === "string" ? _$jscmd("lib/proxy/interfacemanager.js", "cond", "31_48_46", path.replace(/\/[^\/]*$/, "/interfaceRules")) : _$jscmd("lib/proxy/interfacemanager.js", "cond", "31_97_2", "");
    _$jscmd("lib/proxy/interfacemanager.js", "line", 33);
    typeof path === "string" ? _$jscmd("lib/proxy/interfacemanager.js", "cond", "34_10_34", this._loadProfilesFromPath(path)) : _$jscmd("lib/proxy/interfacemanager.js", "cond", "35_10_26", this._loadProfiles(path));
}

_$jscmd("lib/proxy/interfacemanager.js", "line", 39);

// InterfaceManager prototype
InterfaceManager.prototype = {
    // @throws errors
    _loadProfilesFromPath: function(path) {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 43);
        logger.info("Loading interface profiles.\nPath = " + path);
        try {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 46);
            var profiles = fs.readFileSync(path, {
                encoding: "utf8"
            });
        } catch (e) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 48);
            throw new Error("Fail to load interface profiles." + e);
        }
        try {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 51);
            profiles = JSON.parse(profiles);
        } catch (e) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 53);
            throw new Error("Interface profiles has syntax error:" + e);
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 55);
        this._loadProfiles(profiles);
    },
    _loadProfiles: function(profiles) {
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "59_13_9", !profiles)) return;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 60);
        logger.info("Title:" + profiles.title + "Version:", profiles.version);
        _$jscmd("lib/proxy/interfacemanager.js", "line", 62);
        this._rulebase = profiles.rulebase ? _$jscmd("lib/proxy/interfacemanager.js", "cond", "63_25_48", (_$jscmd("lib/proxy/interfacemanager.js", "cond", "63_27_17", profiles.rulebase) || "./").replace(/\/$/, "")) : _$jscmd("lib/proxy/interfacemanager.js", "cond", "64_25_14", this._rulebase);
        _$jscmd("lib/proxy/interfacemanager.js", "line", 67);
        // {String} The mock engine name.
        this._engine = _$jscmd("lib/proxy/interfacemanager.js", "cond", "67_23_15", profiles.engine) || "mockjs";
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "69_13_29", profiles.status === undefined)) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 70);
            throw new Error("There is no status specified in interface configuration!");
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 74);
        // {String} The interface status in using. 
        this._status = profiles.status;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 76);
        var interfaces = _$jscmd("lib/proxy/interfacemanager.js", "cond", "76_25_19", profiles.interfaces) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "76_48_2", []);
        for (var i = interfaces.length - 1; i >= 0; i--) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 78);
            _$jscmd("lib/proxy/interfacemanager.js", "cond", "78_12_33", this._addProfile(interfaces[i])) && _$jscmd("lib/proxy/interfacemanager.js", "cond", "79_19_63", logger.info("Interface[" + interfaces[i].id + "] is loaded."));
        }
    },
    getProfile: function(interfaceId) {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 83);
        return this._interfaceMap[interfaceId];
    },
    getClientInterfaces: function() {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 86);
        return this._clientInterfaces;
    },
    // @throws errors
    getRule: function(interfaceId) {
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "90_13_50", _$jscmd("lib/proxy/interfacemanager.js", "cond", "90_13_12", !interfaceId) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "90_29_34", !this._interfaceMap[interfaceId]))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 91);
            throw new Error("The interface profile " + interfaceId + " is not found.");
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 93);
        path = this._interfaceMap[interfaceId].ruleFile;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 94);
        console.log(path);
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "95_13_22", !fs.existsSync(path))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 96);
            throw new Error("The rule file is not existed.\npath = " + path);
        }
        try {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 99);
            var rulefile = fs.readFileSync(path, {
                encoding: "utf8"
            });
        } catch (e) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 101);
            throw new Error("Fail to read rulefile of path " + path);
        }
        try {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 104);
            return JSON.parse(rulefile);
        } catch (e) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 106);
            throw new Error("Rule file has syntax error. " + e + "\npath=" + path);
        }
    },
    getEngine: function() {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 110);
        return this._engine;
    },
    getStatus: function(name) {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 113);
        return this._status;
    },
    // @return Array
    getInterfaceIdsByPrefix: function(pattern) {
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "117_13_8", !pattern)) return [];
        _$jscmd("lib/proxy/interfacemanager.js", "line", 118);
        var ids = [], map = this._interfaceMap, len = pattern.length;
        for (var id in map) {
            if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "120_17_29", id.slice(0, len) == pattern)) {
                _$jscmd("lib/proxy/interfacemanager.js", "line", 121);
                ids.push(id);
            }
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 124);
        return ids;
    },
    isProfileExisted: function(interfaceId) {
        _$jscmd("lib/proxy/interfacemanager.js", "line", 128);
        return !!this._interfaceMap[interfaceId];
    },
    _addProfile: function(prof) {
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "131_13_17", _$jscmd("lib/proxy/interfacemanager.js", "cond", "131_13_5", !prof) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "131_22_8", !prof.id))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 132);
            logger.error("Can not add interface profile without id!");
            _$jscmd("lib/proxy/interfacemanager.js", "line", 133);
            return false;
        }
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "135_13_34", !/^((\w+\.)*\w+)$/.test(prof.id))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 136);
            logger.error("Invalid id: " + prof.id);
            _$jscmd("lib/proxy/interfacemanager.js", "line", 137);
            return false;
        }
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "139_13_32", this.isProfileExisted(prof.id))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 140);
            logger.error("Can not repeat to add interface [" + prof.id + "]! Please check your interface configuration file!");
            _$jscmd("lib/proxy/interfacemanager.js", "line", 142);
            return false;
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 145);
        prof.ruleFile = this._rulebase + "/" + (_$jscmd("lib/proxy/interfacemanager.js", "cond", "146_29_13", prof.ruleFile) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "146_46_26", prof.id + ".rule.json"));
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "148_13_82", _$jscmd("lib/proxy/interfacemanager.js", "cond", "148_13_31", !this._isUrlsValid(prof.urls)) && _$jscmd("lib/proxy/interfacemanager.js", "cond", "149_19_31", !fs.existsSync(prof.ruleFile)))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 150);
            logger.error("Profile is deprecated:\n" + prof + "\nNo urls is configured and No ruleFile is available");
            _$jscmd("lib/proxy/interfacemanager.js", "line", 152);
            return false;
        }
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "154_12_99", !(_$jscmd("lib/proxy/interfacemanager.js", "cond", "154_15_50", _$jscmd("lib/proxy/interfacemanager.js", "cond", "154_15_24", prof.status in prof.urls) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "154_43_22", prof.status === "mock")) || _$jscmd("lib/proxy/interfacemanager.js", "cond", "155_19_25", prof.status === "mockerr")))) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 156);
            prof.status = this._status;
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 159);
        prof.method = (_$jscmd("lib/proxy/interfacemanager.js", "cond", "159_31_11", prof.method) || "GET").toUpperCase();
        _$jscmd("lib/proxy/interfacemanager.js", "line", 160);
        prof.dataType = (_$jscmd("lib/proxy/interfacemanager.js", "cond", "160_31_13", prof.dataType) || "json").toLowerCase();
        _$jscmd("lib/proxy/interfacemanager.js", "line", 161);
        prof.isRuleStatic = _$jscmd("lib/proxy/interfacemanager.js", "cond", "161_30_19", !!prof.isRuleStatic) || false;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 162);
        prof.isCookieNeeded = _$jscmd("lib/proxy/interfacemanager.js", "cond", "162_30_21", !!prof.isCookieNeeded) || false;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 163);
        prof.signed = _$jscmd("lib/proxy/interfacemanager.js", "cond", "163_30_13", !!prof.signed) || false;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 164);
        prof.timeout = _$jscmd("lib/proxy/interfacemanager.js", "cond", "164_30_12", prof.timeout) || 1e4;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 168);
        // prof.format
        // prof.filter         = ...
        this._interfaceMap[prof.id] = prof;
        _$jscmd("lib/proxy/interfacemanager.js", "line", 170);
        this._clientInterfaces[prof.id] = {
            id: prof.id,
            method: prof.method,
            dataType: prof.dataType
        };
        _$jscmd("lib/proxy/interfacemanager.js", "line", 176);
        return true;
    },
    _isUrlsValid: function(urls) {
        if (_$jscmd("lib/proxy/interfacemanager.js", "cond", "179_13_5", !urls)) return false;
        for (var i in urls) {
            _$jscmd("lib/proxy/interfacemanager.js", "line", 181);
            return true;
        }
        _$jscmd("lib/proxy/interfacemanager.js", "line", 183);
        return false;
    }
};

_$jscmd("lib/proxy/interfacemanager.js", "line", 187);

module.exports = InterfaceManager;