#!/bin/bash

cd /usr/local/midproxy/ShowJoy-MidProxy-CI

# 打开预警进程
node ./bin/precautionary.js &

# 开启MidProxy（测试环境）
node ./bin/exec.js -conf dev test &

while true
do
   sleep 1
done