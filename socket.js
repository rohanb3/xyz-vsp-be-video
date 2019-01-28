/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');

const { createAdapter } = require('./services/socketAdapter');
const { createOperatorsRoom, createCustomersRoom } = require('./services/rooms');

const socket = ({ pendingCalls, callsDBClient }) => (server) => {
  const io = socketIO(server, { transports: ['websocket'] });
  const ioAdapter = createAdapter();

  io.adapter(ioAdapter);

  const operatorsRoom = createOperatorsRoom(io, pendingCalls, callsDBClient);
  const customersRoom = createCustomersRoom(io, pendingCalls, callsDBClient);

  return {
    operatorsRoom,
    customersRoom,
  };
};

module.exports = socket;

// io.origins([
//   'http://192.168.6.17:3000',
//   'http://192.168.6.17:8081',
// ]);

// io.use((socket, next) => {
//   console.log(socket);
//   next();
// });
