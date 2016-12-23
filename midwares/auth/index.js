'use strict';

// 基于尚妆（达人店）认证体系，通过cookie的字段判断是否登录
module.exports.check = function*(next){
  var cookie,tgc,rememberNum;
  cookie = this.cookies;
  // 该字段为umbrella认证系统写入的ticket
  tgc = cookie.get('tgc');
  rememberNum = cookie.get('um_remember');
  if(!tgc && !rememberNum){
    this.login = false;
  }else{
    this.login = true;
  }
  yield* next;
};