FROM daocloud.io/library/node:latest

MAINTAINER yuxiu@showjoy.com

COPY . /usr/local/midproxy/ShowJoy-MidProxy-CI

WORKDIR /usr/local/midproxy/ShowJoy-MidProxy-CI

RUN npm install --registry=https://registry.npm.taobao.org

EXPOSE 8112

CMD ["sh /usr/local/midproxy/ShowJoy-MidProxy-CI/bin/start.sh"]