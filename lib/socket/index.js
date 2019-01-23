/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');
const socketIOAuth = require('socketio-auth');

const { OPERATORS, CUSTOMERS } = require('./constants');
const { authenticateOperator, authenticateCustomer } = require('./auth');
const OperatorsRoom = require('./OperatorsRoom');
const CustomersRoom = require('./CustomersRoom');

const { createQueue } = require('../../services/pendingCalls');
const { createClient } = require('../../services/queueClient');
const serializer = require('../../services/serializer');

const QUEUE_CLIENT_HOST = '127.0.0.1';
const QUEUE_CLIENT_PORT = 6379;
const PENDING_CALLS_QUEUE_NAME = 'calls.pending';

const clientOptions = {
  port: QUEUE_CLIENT_PORT,
  host: QUEUE_CLIENT_HOST,
};
const pendingCallsQueueClient = createClient(clientOptions);
const queueOptions = {
  name: PENDING_CALLS_QUEUE_NAME,
  client: pendingCallsQueueClient,
  serializer,
};
const pendingCallsQueue = createQueue(queueOptions);

function socket(server) {
  const io = socketIO(server);
  const operators = io.of(OPERATORS);
  const customers = io.of(CUSTOMERS);

  socketIOAuth(operators, { authenticate: authenticateOperator });
  socketIOAuth(customers, { authenticate: authenticateCustomer });

  return {
    operatorsRoom: new OperatorsRoom(operators, pendingCallsQueue),
    customersRoom: new CustomersRoom(customers, pendingCallsQueue),
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
