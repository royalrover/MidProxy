'use strict';

// 基于尚妆（达人店）认证体系，通过cookie的字段判断是否登录
module.exports.check = function*(next){
  var cookie,tgc;
  cookie = this.cookies;
  // 该字段为umbrella认证系统写入的ticket
  tgc = cookie.get('tgc');
  if(!tgc){
    this.login = false;
  }else{
    this.login = true;
  }
  yield* next;
};