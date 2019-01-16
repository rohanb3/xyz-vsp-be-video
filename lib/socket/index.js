/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');
const socketIOAuth = require('socketio-auth');

const { OPERATORS, CUSTOMERS } = require('./constants');
const { authenticateOperator, authenticateCustomer } = require('./auth');
const createOperatorsRoom = require('./operatorsRoom');
const createCustomersRoom = require('./customersRoom');

function socket(server) {
  const io = socketIO(server);
  const operators = io.of(OPERATORS);
  const customers = io.of(CUSTOMERS);

  socketIOAuth(operators, { authenticate: authenticateOperator });
  socketIOAuth(customers, { authenticate: authenticateCustomer });

  createCustomersRoom(operators, customers);
  createOperatorsRoom(operators, customers);
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
