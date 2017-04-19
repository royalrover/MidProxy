# MidProxy中间件

## 使用方法

```
cd midproxy

sh bin/start.dev.sh [本地开发环境]

sh bin/start.test.sh [测试环境]

sh bin/start.preview.sh [预发环境]

sh bin/start.online.sh [线上环境]
```

MidProxy提供了两种数据源，一种为mock，另一种为online。但是由于公司[mock平台](http://mock.showjoy.net)的使用，因此

在MidProxy工程中就没有使用mock的必要了。在实际开发中推荐大家只使用online方式，在**module.interfaces.urls**中配置

正确的mock地址即可满足在开发阶段的需求。

## 性能监控

### 命令行监控

```
cd midproxy

node bin/monitorCommand.js
```

通过命令行可以粗略看出当前主进程所有子进程的性能指标。

### 分布式图形监控预警系统(默认已在启动脚本中开启)
命令行监控只能针对一台主机，而在线上环境中不仅需要知道单个节点的状态，还需了解全局的信息，因此分布式图形监控系统应运而生。

分布式图形监控预警系统，基于分布式节点的数据同步机制，在保证单点故障、故障恢复、分布式数据最终一致性的基础上向上层提供可查询接口。在此基础上
通过前端组件的定时轮训实现动态监控；同时，基于设定的经验告警值完成**CAUTION**、**DANGER**状态的打点、通知告警。

值得注意的是，监控预警系统并不是运行MidProxy主进程的子进程，其运行时与主进程同属于同级别的系统进程。这样做的目的就是充分隔绝监控预警功能与MidProxy容器
功能，保证两个模块的运行时不会互相影响，确保稳定的基础上提供服务。

```
cd midproxy

node bin/precautionary.js -env dev[online/release/test]
```

## 目录介绍

```
[midproxy]
  | -- [api]
  |      | -- interface_*.json
  | -- [bin]
  |      | -- exec.js 入口
  |      | -- monitorCommand.js 命令行监控入口
  |      | -- precautionary.js 监控预警系统入口
  | -- extends MidProxy应用扩展程序
  | -- lib
  | -- midwares
  | -- public
  | -- [routes]
  |      | -- index.js 主逻辑入口
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

  ## 应用扩展机制

  日常MidProxy工程开发主要是应用扩展，MidProxy应用扩展是业务的载体，可以在一个插件中实现多个页面渲染和性能优化；

  同时，应用的发布和装载机制已经在MidProxy中得到实现。关于应用扩展的详细信息请关注相关文档。

  ## spon中的MidProxy工程

  前端工具套件spon已集成了MidProxy的初始化创建，执行命令

  ```
  spon mb init -mb proName
  ```

  spon默认初始化了样例工程，通过修改局部代码即可完成MidProxy Extends工程的开发。