#!/bin/bash

cd /usr/local/midproxy/ShowJoy-MidProxy-CI

# 打开预警进程
node ./bin/precautionary.js &

# 开启MidProxy（预发环境），需要注意的是必须在预发环境执行，否则因无法访问zookeeper集群导致无法开启MidProxy
node ./bin/exec.js -conf release preview &

while true
do
   sleep 1
done