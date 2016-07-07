/**
 * @function client端UA判断
 * @type {number}
 */
exports.exec = function* (next){
  var u = this.header['user-agent'];
  if(u){
    this.ua = {
      //移动终端浏览器版本信息
      isWebKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
      isMobile: !!u.match(/AppleWebKit.*Mobile.*/) || !!u.match(/AppleWebKit/), //是否为移动终端
      isIos: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
      isAndroid: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器
      isIPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者QQHD浏览器
      isIPad: u.indexOf('iPad') > -1, //是否iPad
      isWebApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
      isWeixin: u.toLowerCase().indexOf('micromessenger') > -1, //是否微信内置浏览器,
      isShowjoyiOS: u.indexOf('ShowJoyiOS') > -1, // //是否iOS官方客户端内置浏览器
      isShowjoyAndroid: u.indexOf('ShowJoyAndroid') > -1, //是否Android官方客户端内置浏览器
      isIOSAPP: u.indexOf('iOSAPP') > -1, // //是否iOS官方客户端内置浏览器
      isAndroidAPP: u.indexOf('androidAPP') > -1, //是否Android官方客户端内置浏览器
      isApp: this.isShowjoyiOS || this.isShowjoyAndroid || this.isIOSAPP || this.isAndroidAPP
    };
  }else{
    this.ua = {
    }
  }

  yield* next;
};