'use strict';
const path = require('path');
const fs = require('fs');
const net = require('net');
const Client = require('./client');
const EventEmitter = require('events');
const os = require('os');
const tmpDir = path.join(process.cwd(),'tmp');
let sockPath = path.join(tmpDir, 'midproxy.sock');

class Server extends EventEmitter{
  constructor() {
    super();
    this.server = net.createServer((socket)=> this.handleConnection(socket));
  }

  listen(callback) {
    if (fs.existsSync(sockPath)) {
      fs.unlinkSync(sockPath);
    }
    this.server.listen(sockPath, callback);
  }

  handleConnection(socket) {
    const client = new Client({
      socket: socket
    });
    client.on('message', (message) => {
      this.handleRequest(message, client);
    });
    this.emit('connect', client);
  }

  handleRequest(message, client) {
    this.emit('message', message, client);
  }
}

module.exports = Server;