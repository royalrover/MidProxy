'use strict';

// 基于尚妆（达人店）认证体系，通过cookie的字段判断是否登录
module.exports.check = function*(next){
  var cookie,userInfo;
  cookie = this.cookies;
  // 该字段标识是否登录
  userInfo = cookie.get('userInfo');
  if(!userInfo){
    this.login = false;
  }else{
    this.login = true;
  }
  yield* next;
};