'use strict';

exports.bind = function(router){
  require('./api/shop').bind(router);
  require('./page/shop').bind(router);
};