#!/usr/bin/env node

import app from '../app.js';
import debug from 'debug';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { setIo } from './socketHub.js';

var serverDebug = debug('scoreparts:server');

var port = normalizePort(process.env.PORT || '3006');
app.set('port', port);

var server = http.createServer(app);

var io = new SocketIoServer(server, { cors: { origin: '*' } });
setIo(io);
io.on('connection', function (socket) {
  serverDebug('socket connected: ' + socket.id);
});

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
  var portNum = parseInt(val, 10);

  if (isNaN(portNum)) {
    return val;
  }

  if (portNum >= 0) {
    return portNum;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  serverDebug('Listening on ' + bind);
}
