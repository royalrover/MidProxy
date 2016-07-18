'use strict';

var path = require('path');
var log = require(path.join(process.cwd(),'/lib/log4js/logger'));
var View = require(path.join(process.cwd(),'/lib/proxy/viewReadStream')).View;
var _ = require('lodash');

var renderErrorPage = function(code,error){
  log.info('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error');
  var app = this.app;
  var renderObj = {
    commonEnv: app.EnvConfig['common_' + app.env]
  },html;

  if(code >= 500){
    html = app._cache._commonError50xRender(renderObj);
  }else{
    html = app._cache._commonError404Render(renderObj);
  }

  log.error('request[id=' + this.id + ',path='+ this.path + this.search + '] render encountered an error,\n' + error.stack);
  return html;
};

module.exports = {
  error404: function* (next){
    var message = 'errors.errors.pageNotFound',html;

    if(this.status >= 500){
      yield* next;
      return;
    }
    // do not cache 404 error
    this.set({
      'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });
    if (this.method.toLowerCase() === 'get') {
      html = renderErrorPage.call(this,404,new Error(message));
      this.type = 'html';

      // 方法一，实现Readable的子类View
      var stream = new View();
      stream.end(html);
      this.body = stream;
    } else {
      this.status = 404;
      this.body = message;
    }
  },
  error50x: function* (){
    var err = this._error,
      returnErrors = [],
      html;

    // 50x errors should never be cached
    this.set({'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});


    if (this.method.toLowerCase() === 'get') {
      html = renderErrorPage.call(this, 500, err);
      this.type = 'html';

      // 方法一，实现Readable的子类View
      var stream = new View();
      stream.end(html);
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