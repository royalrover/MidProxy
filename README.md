# MidProxy中间件

## 使用方法

```
cd midproxy

node bin/exec.js -env dev
```

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
  |      | -- index.js 主逻辑入口
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