#!/bin/bash

cd /usr/local/midproxy/ShowJoy-MidProxy-CI

node ./bin/precautionary.js &

node ./bin/exec.js -conf dev test &

while true
do
   sleep 1
done