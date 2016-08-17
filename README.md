# MidProxy中间件

## 使用方法

```
cd midproxy

node bin/exec.js -env dev online(mock) [测试环境]

node bin/exec.js -env release online [线上环境]
```

MidProxy提供了两种数据源，一种为mock，另一种为online。但是由于公司[mock平台](http://mock.showjoy.net)的使用，因此

在MidProxy工程中就没有使用mock的必要了。在实际开发中推荐大家只使用online方式，在**module.interfaces.urls**中配置

正确的mock地址即可满足在开发阶段的需求。

## 性能监控

```
cd midproxy

node bin/monitor.js
```

## 目录介绍

```
[midproxy]
  | -- [api]
  |      | -- interface_*.json
  | -- [bin]
  |      | -- exec.js 入口
  |      | -- monitor.js 监控点
  | -- lib
  | -- midwares
  | -- public
  | -- [routes]
  |      | -- cacheLRU.js 主逻辑入口
  | -- [rules]
  |      | -- [channel]
  |      |      | -- Mobile.getInfo.rule.json
  |      |      | -- Mobile.getWechatInfo.rule.json
  | -- tests
  | -- tmp
  | -- [views]
  |      | -- [mobile]
  |      |      | -- [channel]
  |      |      |       | -- [config]
  |      |      |       |       | -- dev.json
  |      |      |       |       | -- release.json
  |      |      |       | -- [homepage]
  |      |      |       |       | -- homepage.tmpl
  |      |      |       | -- foot.tmpl
  |      |      | -- [common]
  |      |      |       | -- [config]
  |      |      |       |       | -- dev.json
  |      |      |       |       | -- release.json
  |      |      |       | -- [error]
  |      |      |       |       | -- 50x.tmpl
  |      |      |       | -- basicHead.tmpl
  |      |      |       | -- footer.tmpl
  |      |      |       | -- header.tmpl
  |      |      |       | -- static.tmpl
  | -- app.js
  ```

  ## 插件机制

  日常MidProxy工程开发主要是插件开发，MidProxy插件是业务的载体，可以在一个插件中实现多个页面渲染和性能优化；

  同时，插件的发布和装载机制已经在MidProxy中得到实现。关于插件的详细信息请关注相关文档。

  ## spon中的MidProxy工程

  前端工具套件spon已集成了MidProxy的初始化创建，执行命令

  ```
  spon mb init -mb proName
  ```

  spon默认初始化了样例工程，通过修改局部代码即可完成MidProxy Extends工程的开发。