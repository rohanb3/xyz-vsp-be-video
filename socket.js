/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');

const { createAdapter } = require('./services/socketAdapter');
const { createOperatorsRoom, createCutomersRoom } = require('./services/rooms');
const { createQueue } = require('./services/pendingCalls');
const { createClient } = require('./services/queueClient');
const { createChannel } = require('./services/queueChannel');
const serializer = require('./services/serializer');
const {
  REDIS_HOST,
  REDIS_PORT,
} = require('./constants/redis');

const PENDING_CALLS_QUEUE_NAME = 'calls.pending';
const PENDING_CALLS_CHANNEL_NAME = 'channel.pending.calls';

const clientOptions = {
  port: REDIS_PORT,
  host: REDIS_HOST,
};

const channelOptions = {
  name: PENDING_CALLS_CHANNEL_NAME,
  port: REDIS_PORT,
  host: REDIS_HOST,
  serializer,
};

const pendingCallsQueueClient = createClient(clientOptions);
const pendingCallsQueueChannel = createChannel(channelOptions);

const queueOptions = {
  name: PENDING_CALLS_QUEUE_NAME,
  client: pendingCallsQueueClient,
  channel: pendingCallsQueueChannel,
  serializer,
};
const pendingCallsQueue = createQueue(queueOptions);

function socket(server) {
  const io = socketIO(server);
  const ioAdapter = createAdapter();

  io.adapter(ioAdapter);

  const operatorsRoom = createOperatorsRoom(io, pendingCallsQueue);
  const customersRoom = createCutomersRoom(io, pendingCallsQueue);

  return {
    operatorsRoom,
    customersRoom,
  };
}

module.exports = socket;

// io.origins([
//   'http://192.168.6.17:3000',
//   'http://192.168.6.17:8081',
// ]);

// io.use((socket, next) => {
//   console.log(socket);
//   next();
// });
