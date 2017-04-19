#!/bin/bash

cd /usr/local/midproxy/ShowJoy-MidProxy-CI

# 打开预警进程
node ./bin/precautionary.js &

# 开启MidProxy（本地开发环境）
node ./bin/exec.js -conf dev dev &

while true
do
   sleep 1
done