## MidProxy
MidProxy是尚妆基于前后端分离开发的一种尝试。MidProxy可以让前端开发人员初步涉入服务端领域，掌控用户请求处理，获取接口数据，按照前端模板规范渲染页面，并结合着其他优化如BigPipe可完成页面模块级别的异步渲染。

MidProxy的出现解决了前端开发和服务端开发紧耦合的窘况，此后前端资源的发布完全独立于后端系统，由前端开发人员管理页面视图级别的发布。

为了更好的理解MidProxy的工作方式，可做个类比：MidProxy就像tomcat，是MidProxy应用的容器（tomcat是servlet容器）。做过javaEE开发的人都知道tomcat有热加载机制，即每次编译“.java”文件后的字节码都可以在不重启tomcat进程的情况下被重复加载，从而“替换”tomcat进程地址空间中的“code segment”，这种特性也被称为**热加载**；同样MidProxy也实现了这种热加载功能，不过是针对commonJS规范的模块。这样的好处就是，以后在开发MidProxy应用并发布的时候不用再额外进行运维操作和相对繁琐的初始化操作，可以快速高效的在测试环境中进行调试。

> 在本文中，MidProxy应用指的是前端开发人员开发的MidProxy扩展应用，也就是下文的Extends工程；而MidProxy则单指MidProxy应用的容器

## MidProxy开发套件
MidProxy开发套件数据spon的插件，因此需要在安装spon的前提下使用。

如何安装spon，请看：http://docs.showjoy.net/2016/07/08/spon-info/

如何安装MidProxy开发套件，请看：http://docs.showjoy.net/2017/01/17/midproxykai-fa-gong-ju-spon-midproxy/

## MidProxy应用程序——Extends工程
MidProxy应用也就是Extends工程，运行在MidProxy这个容器中。它以前是由后端人员编写，现在被移到前端，因此这对前端开发人员而言提出了更高的要求，在保证后端服务正常的情况下更要注重性能。对于前端开发人员而言，“**内存泄漏、日志记录、错误处理和性能优化**”可能都是不熟悉或很厌烦的一些领域，但是如果想要涉猎后端开发，这些技能或领域都是必不可少需要或多或少了解的，这也正应了那句话，“能力越大，责任越大”；有了MidProxy，前端也就不仅仅是单纯的前端了，需要你了解些服务端的一些知识，如第三方缓存和自定义缓存的区别和使用，数据库表索引优化，表的连接和存储引擎的选取，socket连接池创建或使用，闭包导致的内存泄漏等。

在初次开发Extends工程的时候按照命令
```
spon mb init --mp
```
创建一个Extends工程，按照里面的提示编写即可。

==Extends工程对应gitlab的MidProxy Group，创建工程时需要特别注意，将工程设置为“public”==

### Extends工程编写
##### Extends工程名称
规范化：**语义化Extends工程名**

名称采用三段化：**MidProxy-shop-vertion1.5、mp-shop-trade、MidProxy-channel-home、mp-channel-vertion1.8**

三段化得命名简洁明了，透过名称可了解该工程的使用范围。在上面的例子中，第一段为MidProxy应用说明，可以使用“MidProxy或mp”；而二段为所对应的后端工程名，如shop对应后端的ShowJoy-Shop-UI；第三段则相对灵活，可以对应某个需求时的名称，如“version1.5”；也可以对应某个页面的名称，如“home”。但是这里面十分建议一个Extends工程按照需求来命名，一个工程可渲染多个相关页面，尽量避免一个Extends工程只渲染一个页面的情况，这是对运维成本的消耗，变相的浪费开发资源。
##### 目录层级
```
[midproxy-shop-version1.5]
  | -- [api]
  |      | -- interface_*.json
  | -- [routes]
  |      | -- [page]
  |      |      | -- index.js 主逻辑入口
  |      |      | -- other.js 其他逻辑入口
  |      | -- [api]
  |      |      | -- index.js api接口，用于开发阶段测试
  |      |      | -- other.js 其他api接口
  | -- [views]
  |      | -- [mobile]
  |      |      | -- upgrade.tmpl
  |      |      | -- [shop]
  |      |      |      | -- home.tmpl
  | -- package.json 缓存项配置、信息说明
  | -- README.md
 
```

- api目录为Extends工程的接口定义目录。

- routes目录定义用户逻辑。所有的页面级别的控制器需要在其下page目录中编写，入口文件为index.js。可以在同级别目录或子目录中创建其他的控制器完成复杂逻辑的开发。routes目录还可以有与page目录平行的子目录api，主要用于编写开发过程中的mock数据。

- view目录存放相关页面的模板。

- README.md需要开发者描述当前Extends工程所涉及的页面范围和一些注意事项

- package.json中配置缓存数据

##### 接口配置文件
每个Extends工程都有一个或多个接口配置文件，通过spon创建的Extends工程默认会创建一个**interface_demo.json**接口文件，即：
```
{
  "title": "MidProxy接口配置",
  "version": "0.0.1",
  "engine": "mockjs",
  "status": "online",
  "hotload": 1,
  "interfaces": [ {
    "name": "获取达人店店铺是否升级",
    "id": "Shop.getConditions",
    "method": "get",
    "urls": {
      "dev": "http://shop.m.showjoy.net/api/shop/getConditions",
      "test": "http://localhost:15381/api/shop/getConditions",
      "preview": "http://localhost:54601/api/shop/getConditions",
      "online": "http://localhost:54101/api/shop/getConditions"
    },
    "dataType": "json",
    "encoding": "utf8",
    "isCookieNeeded": true
  },{
    "name": "店铺升级",
    "id": "Shop.upgrade",
    "method": "post",
    "urls": {
      "dev": "http://shop.m.showjoy.net/api/shop/upgrade",
      "test": "http://localhost:15381/api/shop/upgrade",
      "preview": "http://localhost:54601/api/shop/upgrade",
      "online": "http://localhost:54101/api/shop/upgrade"
    },
    "dataType": "text",
    "encoding": "utf8",
    "isCookieNeeded": true
  },
    {
      "name": "店铺收益页",
      "id": "Shop.getCommission",
      "method": "get",
      "urls": {
        "dev": "http://h5.showjoy.net:8080/shopappserver/api/shop/commission/home",
        "test": "http://localhost:15381/api/shop/upgrade",
        "preview": "http://localhost:54601/api/shop/upgrade",
        "online": "http://localhost:54101/api/shop/upgrade"
      },
      "dataType": "json",
      "encoding": "utf8",
      "isCookieNeeded": true
    }]
}
```
开发人员需要重点关注**status,hotload,interfaces**这几个属性。

- status标识当前Extends工程运行状态，有两个可选值“online”和“mock”，目前由于mock平台的使用，没有必要在Extends工程中再设置“mock”模式，因此status的值应该一直设置为“online”

- hotload为开启热加载的开关，默认设为1为开启热加载，在本地开发环境中使用

- interfaces属性为一个数组，标示了当前接口文件定义的所有接口。每个接口项的规范也比较固定，有“**name、id、method、urls、dataType、encoding、isCookieNeeded**”属性。
 1. name描述接口的名称
 2. id描述接口的调用方法，如“id：Shop.getConditions”配置，在代码中就是用 Shop.getConditions()为发起对应http请求做初始化工作
 3. method描述请求类型
 4. urls定义对应方法的请求地址。Extends工程运行在4套服务器环境中--本地开发环境、测试环境、预发环境和线上环境。每套环境都有着不同的接口地址，因此要合理修改此处url。需要注意的是，默认提供的端口号均为达人店工程在“测试、预发和线上”环境上对应的端口。
 5. dataType定义online地址返回的数据类型，可以为“json”或“text”，默认服务端返回的是json格式字符串
 6. encoding描述服务端返回数据的字符编码，默认为UTF-8
 7. isCookieNeeded描述该请求是否需要用户cookie，默认服务端所有接口都需要针对用户做认证，因此需要设置为true，而且在routes/controllers编写中，也需要做额外处理，这在下文会提到。

##### 项目配置
```
package.json

{
  "type": "MidProxy",
  "name": "***",
  "info": "***",
  "views": [],
  "cache": [
    {
      "k": "f2e:temp:TestDemo",
      "v": "demo",
      "dirname": "mobile",
      "type": "template"
    },
    {
      "k": "f2e:temp:demo2",
      "v": "demo2",
      "type": "template"
    },
    {
      "k": "f2e:temp:shop:upgrade",
      "v": "upgrade",
      "dirname": "mobile/shop"
    },
    {
      "k": "f2e:temp:shop:commission",
      "v": "commission",
      "dirname": "mobile/shop"
    },
    {
      "k": "f2e:temp:shop:commission",
      "v": "commission",
      "dirname": "mobile/shop"
    },
    {
      "k": "f2e:app:shop:abc",
      "v": "commission",
      "dirname": "mobile/shop"
    }
  ],
  "hotload": 1
}
```
配置项中着重需要强调的是cache属性。每个cache项可以配置四个属性：k、v、dirname（可选）、type（可选）。

**k** 为缓存的键，键的命名需要遵守规范：
==分段命名，分隔符为“:”。开头部分为f2e，表示前端资源缓存；第二部分为temp或app，分别对应模板数据或应用缓存；第三部分则为对应的具体工程的页面。键的取值不应太长，同时具有好的阅读性。==

**v** 为缓存的值。可以为编译后的模板，也可以为字符串或者为对象。如果缓存内容为编译的模板，则为模板文件名称。

**type** 标示缓存的类型，默认值为template，缓存模板。如果要缓存非模板数据，则需更改type为**app**类型。

**dirname** 标示缓存模板的路径，相对于views目录而言。如
```
  {
      "k": "f2e:temp:shop:upgrade",
      "v": "upgrade",
      "dirname": "mobile/shop"
    }
```
意味着对路径 views/mobile/shop/upgrade.tmpl的模板存储在缓存中，键为“f2e:temp:shop:upgrade”。

##### 控制器
routes目录下存放的是核心模块——控制器。对于控制器的编写需要额外小心，因为用户请求处理的第一道流水线来自于我们，因此在注重可靠的前提下确保性能。MidProxy容器的http内核采用koa模块，不熟悉koa编写的开发者也不需担心，因为控制器的编写完全按照demo的示范就完全满足需求。

示例代码：
```
'use strict';

exports.bind = function(Extends) {
  var MidProxy = Extends.MidProxy;
  var log = Extends.log;
  var _ = Extends.lodash;

  Extends.use('/shop/commission.html',{

    page: {
      // 项目工程，默认为“达人店”
      type: 'shop',
      // 针对达人店工程，可选择的引用公共头部和尾部。此处的header和footer对应于showjoy-shop-view工程的header.html和footer.html
      useCommonHeader: true,
      useCommonFooter: false,
      // 渲染页面内容部分的模板缓存键名
      cacheKeys: ['f2e:temp:shop:commission'],
      // 页面title值，必须设置。可以为空字符串'',当设置为空字符串时，使用shopName属性作为页面的title
      title: '收益页',
      // 设置js、css对应该工程的名称，即showjoyassets组中的page工程名称
      pageName: 'commission-home'
    },
    method: 'get',
    // 创建MidProxy代理实例，返回结果为数组
    createProxies: function(){

      var proxy = MidProxy.create('Shop.*');
      // 准备MidProxy即将调用的接口，此处并未发起请求
      proxy
        // getConfig的参数为get请求的查询字符串，默认使用真是请求的查询字符串
        // 由于服务端采用OAuth2认证，请求须携带cookie
        .getCommission()
        .withCookie(this.request.header['cookie']);

      // 返回值必须为为数组
      return [proxy];
    },
    // 构建model数据
    handleRenderData: function(ret,app){
      try{
        var dataJson = ret[0][0].data;
      }catch(e){
        log.error(e.stack);
        throw e;
      }
      return dataJson;
    },
    // 设置服务端是否设置cookie，默认为false。在登录认证页面需要设置为true，大多数的展示页面不需要此权限
    isSetCookie: false
  });
}

// 当前模块在本地开发环境开启热加载
module.hotload = 1;
```
控制器模块的核心逻辑已被封装在MidProxy的内核中，因此对于开发者而言编写一个控制器就更为容易，通过向Extends.use方法中传递参数即可，第一个参数为匹配的请求路径，第二个则为配置对象。
```
配置对象说明：（[]内部为数据类型）
1，page [object]：当前页面的信息说明
    属性说明：
    type [string]：标识页面所属工程，默认为达人店，即shop，可选的值为["shop","activity-shop"]，最后项对应“达人店活动页”
    useCommonHeader [boolean]：是否使用达人店的公共header部分，该header即为ShowJoy-Shop-UI中的header.html
    useCommonFooter [boolean]：是否使用达人店的公共footer部分，该footer即为ShowJoy-Shop-UI中的footer.html
    useCommonWeex [boolean]: 是否使用达人店的weex公共头部和尾部模板（headWeex.tmpl和footWeex.tmpl）
    useCommonWeexFooter [boolean]: 是否使用达人店weex的tab底部
    isNewFooter [boolean]: 是否使用新的tab底部模板
    cacheKeys [array]：使用模板缓存的键
    title [string]：页面的title，必须设置。如果设置为'',则使用shopName（店名）渲染
    pageName [string]：该页面对应的前端page工程名，引用线上的静态文件
2，method [enum:"get" & "post"]：匹配的请求类型，默认为get
3，createProxies [function]：业务逻辑的核心，在函数中创建一个或多个MidProxy实例，并定义接下来的HTTP请求。该函数返回值MidProxy实例数组
4，handleRenderData[函数]：根据HTTP响应的数据作相应处理，并返回处理后的待渲染数据
5，isSetCookie[Boolean]：是否准许服务端设置客户端的CooKie值，默认为false，除了在需要认证的页面设置该值为true，其他大多数场景设置为false
```

因此编写一个控制器可以总结为2部分：

1. 导出bind方法。该方法有一个**Extends**参数，通过该对象可获取MidProxy实例、log单例（日志记录）和lodash实例；

==Extends.log的方法只接受字符串参数！！==
```
Extends.log.info('some debug info');
Extends.log.error(new Error('error code').stack);
Extends.log.trace(new Date().getTime());
```
同时Extends也集成了koa-router的功能，通过get和post完成对应方法的处理。

2. 设置当前模块使用热加载，即module.hotload = 1。

###### 控制器相关API

koa的中间件采用generator函数写法，因此需要开发人员了解generator函数的一些使用方法（即使不了解也没关系，照着demo依葫芦画葫芦即可）。

**MidProxy创建**

创建MidProxy实例有两种方法：

- 模糊匹配法，即 `var proxy = MidProxy.create('Shop.*')`。这样，Shop命名空间下的所有方法都被定义在proxy对象中，以上文示范的接口配置文件为例，proxy有以下方法：
```
proxy.getConditions();
proxy.upgrade();
proxy.getConfig();
```
- 精确匹配法，即 `var proxy = MidProxy.create('Shop.getConfig')`。proxy对象则只有一个方法，即proxy.getConfig()。

MidProxy实例可以像类似jQuery那样使用链式调用。以上文为例：
```
proxy.getConditions()
     .upgrade()
     .getConfig();
```

另外，在接口配置文件中针对某个接口定义了属性“isCookieNeeded：true”，需要在这里注入cookie，否则出现请求错误，进入错误页。

```
proxy.getConditions()
     .upgrade()
     .getConfig()
     .withCookie(this.request.header['cookie']);
```

针对某个请求可能需要携带查询字符串，这可以通过函数参数的方式实现：
```
proxy.getConditions(this.querystring)
     .upgrade({
        name: 'showjoy'
     })
     .getConfig(this.querystring);
```
这样，这三个请求MidProxy都会携带用户请求的查询字符串向后端服务器发出请求。

==需要注意的是，执行proxy对象的接口方法时并没有立刻请求数据，而是准备相关的请求数据。==

##### Extends工程的热加载
上文中提到了热加载功能，这个功能在本地开发环境中（即在本地执行命令spon midproxy开启的调试环境）都有体现。在开发Extends工程中，需要保证这些模块（文件）需要开启热加载：
```
api/* 中的接口文件，设置属性{"hotload": 1}

routes/page/* 所有的模块，需设置"module.hotload = 1"

views/* 模板文件无需做处理，始终支持热加载
```

##### Extends工程发布
Extends工程发布和前端资源发布类似，仍是采用git进行CI。

详细流程可以查看[前端资源发布流程](http://docs.showjoy.net/2016/07/14/publish/)

发布至测试环境：
```
git checkout dev
git add 
spon cmt
git push origin dev
git tag dev/x.x.x
git push origin dev/x.x.x
```

发布至预发环境：
```
git checkout preview
git add 
spon cmt
git push origin preview
git tag preview/x.x.x
git push origin preview/x.x.x
```

发布至线上环境：
```
git checkout master
git add 
spon cmt
git push origin master
git tag publish/x.x.x
git push origin publish/x.x.x
```
