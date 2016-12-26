'use strict';

var path = require('path');
var vm = require('vm');
var template = require('art-template');
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;
var _ = require('lodash');

var renderErrorPage = function(code,error,redisUtil,log){
  log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error');
  var prom;

  if(code >= 500){
    prom = redisUtil.getRedis('f2e:common:error50xRender');
  }else{
    prom = redisUtil.getRedis('f2e:common:error404Render');
  }

  log.error('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error,\n' + error.stack);
  return prom;
};

module.exports = function(redisUtil,log){

  return {
      error404: function* (next){
      var message = 'errors.errors.pageNotFound',prom,html;
      var app = this.app;
      var renderObj = {
        commonEnv: app.EnvConfig['common_' + app.env],
        shopEnv: app.EnvConfig['shop_' + app.env]
      },self = this;

      if(this.status >= 500){
        yield* next;
        return;
      }
      // do not cache 404 error
      this.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
      });
      if (this.method.toLowerCase() === 'get') {
        prom = renderErrorPage.call(this,404,new Error(message),redisUtil,log);
        yield new Promise(function(res){
          prom.then(function(reply) {
            vm.runInThisContext('var fn = ' + reply, {filename: 'middleware/error'});
            try {
              html = fn.call(template.utils, renderObj);
              fn = null;
            } catch (e) {
              res(e);
            }
            res();
          });
        });

        this.type = 'html';

        // 方法一，实现Readable的子类View
        var stream = new View();
        stream.end(html.toString());
        this.body = stream;
      } else {
        this.status = 404;
        this.body = message;
      }
    },
    error50x: function* (){
      var err = this._error,
        returnErrors = [],
        prom,html;
      var app = this.app;
      var renderObj = {
        commonEnv: app.EnvConfig['common_' + app.env],
        shopEnv: app.EnvConfig['shop_' + app.env]
      };

      // 50x errors should never be cached
      this.set({'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});


      if (this.method.toLowerCase() === 'get') {
        prom = renderErrorPage.call(this, 500, err,redisUtil,log);
        yield new Promise(function(res){
          prom.then(function(reply){
            vm.runInThisContext('var fn = ' + reply, {filename: 'middleware/error'});
            try {
              html = fn.call(template.utils, renderObj);
              fn = null;
            } catch (e) {
              res(e);
            }
            res();
          });
        });
        this.type = 'html';

        // 方法一，实现Readable的子类View
        var stream = new View();
        stream.end(html.toString());
        this.body = stream;
      } else {
        if (!_.isArray(err)) {
          err = [].concat(err);
        }

        _.each(err, function (errorItem) {
          var errorContent = {};

          errorContent.message = _.isString(errorItem) ? errorItem :
            (_.isObject(errorItem) ? errorItem.message : 'errors.errors.unknownError');
          errorContent.errorType = errorItem.errorType || 'InternalServerError';
          returnErrors.push(errorContent);
        });

        this.status = 500;
        this.body = {
          errors: returnErrors
        };
      }
    }
  };
}