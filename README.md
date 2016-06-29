# MidProxy中间件

## 使用方法

cd midproxy

node bin/exec.js -env dev

## 性能监控

cd midproxy

node bin/monitor.js

## 目录介绍

[midproxy]\n
  | -- [api]\n
  |      | -- interface_*.json\n
  | -- [bin]\n
  |      | -- exec.js 入口\n
  |      | -- monitor.js 监控点\n
  | -- lib\n
  | -- midwares\n
  | -- public\n
  | -- [routes]\n
  |      | -- index.js 主逻辑入口\n
  | -- [rules]\n
  |      | -- [channel]\n
  |      |      | -- Mobile.getInfo.rule.json\n
  |      |      | -- Mobile.getWechatInfo.rule.json\n
  | -- tests\n
  | -- tmp\n
  | -- [views]\n
  |      | -- [mobile]\n
  |      |      | -- [channel]\n
  |      |      |       | -- [config]\n
  |      |      |       |       | -- dev.json\n
  |      |      |       |       | -- release.json\n
  |      |      |       | -- [homepage]\n
  |      |      |       |       | -- homepage.tmpl\n
  |      |      |       | -- foot.tmpl\n
  |      |      | -- [common]\n
  |      |      |       | -- [config]\n
  |      |      |       |       | -- dev.json\n
  |      |      |       |       | -- release.json\n
  |      |      |       | -- [error]\n
  |      |      |       |       | -- 50x.tmpl\n
  |      |      |       | -- basicHead.tmpl\n
  |      |      |       | -- footer.tmpl\n
  |      |      |       | -- header.tmpl\n
  |      |      |       | -- static.tmpl\n
  | -- app.js\n