/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');
const socketIOAuth = require('socketio-auth');
const moment = require('moment');

const { checkAndCreateRoom } = require('../twilio');
const {
  CONNECTION,
  DISCONNECT,
  REQUEST_CALL,
  ACCEPT_CALL,
  INCOMING_CALL,
  FINISH_CALL,
  CALL_ACCEPTED,
  ROOM_CREATED,
  OPERATOR_JOINED_ROOM,
  OPERATOR_DISCONNECTED,
  CUSTOMER_DISCONNECTED,
  OPERATORS_LENGTH,
  OPERATORS,
  CUSTOMERS,
  ACTIVE_OPERATORS,
} = require('./constants');
const { authenticateOperator, authenticateCustomer } = require('./auth');

const pendingCallsQueue = [];
const activeCalls = [];

function socket(server) {
  const io = socketIO(server);
  const operators = io.of(OPERATORS);
  const customers = io.of(CUSTOMERS);

  socketIOAuth(operators, { authenticate: authenticateOperator });
  socketIOAuth(customers, { authenticate: authenticateCustomer });

  const customersByOperators = {};
  const operatorsByCustomers = {};

  operators.on(CONNECTION, onOperatorConnected);
  customers.on(CONNECTION, onCustomerConnected);

  function onOperatorConnected(operator) {
    const operatorId = operator.id;
    addOperatorToActive(operatorId);
    notifyCustomersAboutOperatorsLength();
    operator.on(ACCEPT_CALL, onOperatorAcceptCall);
    operator.on(FINISH_CALL, () => onOperatorFinishedCall(operatorId));
    operator.on(DISCONNECT, () => onOperatorDisconnected(operatorId));
  }

  function onCustomerConnected(customer) {
    const customerId = customer.id;
    customer.on(REQUEST_CALL, onCustomerRequestCall);
    customer.on(FINISH_CALL, () => onCustomerFinishedCall(customerId));
    customer.on(DISCONNECT, () => onCustomerDisconnected(customerId));
    customer.on(OPERATORS_LENGTH, () => notifyCustomerAboutOperatorsLength(customerId));
  }

  function onCustomerRequestCall() {
    console.log('auth', this.auth);
    const call = {
      requestedBy: this.id,
      requestedAt: moment.utc().format(),
    };
    pendingCallsQueue.unshift(call);
    console.log('pendingCallsQueue', pendingCallsQueue);
    operators.to(ACTIVE_OPERATORS).emit(INCOMING_CALL, { customerId: this.id });
  }

  function onOperatorAcceptCall(data) {
    const operatorId = this.id;
    const { customerId } = data.query;
    const call = pendingCallsQueue.pop();
    console.log('pendingCallsQueue', pendingCallsQueue);
    console.log('call', call);
    call.acceptedBy = operatorId;
    call.acceptedAt = moment.utc().format();
    activeCalls.push(call);
    console.log('activeCalls', activeCalls);
    console.log('pendingCallsQueue', pendingCallsQueue);
    removeOperatorFromActive(operatorId);
    notifyCustomersAboutOperatorsLength();
    checkAndCreateRoom(operatorId).then(() => {
      bindCustomerToOperator(customerId, operatorId);
      this.emit(ROOM_CREATED, operatorId);
      this.on(OPERATOR_JOINED_ROOM, () => onOperatorJoinedRoom(operatorId, customerId));
    });
  }

  function onOperatorJoinedRoom(operatorId, customerId) {
    customers.to(customerId).emit(CALL_ACCEPTED, operatorId);
  }

  function onOperatorFinishedCall(operatorId) {
    addOperatorToActive(operatorId);
    onOperatorDisconnected(operatorId);
  }

  function onOperatorDisconnected(operatorId) {
    const customerId = getCustomerIdByOperatorId(operatorId);
    notifyCustomersAboutOperatorsLength();
    if (customerId) {
      notifyCustomerAboutOperatorDisconnection(customerId);
      unbindCustomerFromOperator(customerId, operatorId);
    }
  }

  function onCustomerFinishedCall(customerId) {
    onCustomerDisconnected(customerId);
  }

  function onCustomerDisconnected(customerId) {
    const operatorId = getOperatorIdByCustomerId(customerId);
    if (operatorId) {
      notifyOperatorAboutCustomerDisconnection(operatorId);
      unbindCustomerFromOperator(customerId, operatorId);
      addOperatorToActive(operatorId);
      notifyCustomersAboutOperatorsLength();
    }
  }

  function notifyCustomerAboutOperatorDisconnection(customerId) {
    customers.to(customerId).emit(OPERATOR_DISCONNECTED);
  }

  function notifyOperatorAboutCustomerDisconnection(operatorId) {
    operators.to(operatorId).emit(CUSTOMER_DISCONNECTED);
  }

  function bindCustomerToOperator(customerId, operatorId) {
    customersByOperators[operatorId] = customerId;
    operatorsByCustomers[customerId] = operatorId;
  }

  function unbindCustomerFromOperator(customerId, operatorId) {
    customersByOperators[operatorId] = null;
    delete operatorsByCustomers[customerId];
  }

  function getCustomerIdByOperatorId(operatorId) {
    return customersByOperators[operatorId];
  }

  function getOperatorIdByCustomerId(customerId) {
    return operatorsByCustomers[customerId];
  }

  function addOperatorToActive(operatorId) {
    operators.connected[operatorId].join(ACTIVE_OPERATORS);
  }

  function removeOperatorFromActive(operatorId) {
    operators.connected[operatorId].leave(ACTIVE_OPERATORS);
  }

  function notifyCustomersAboutOperatorsLength() {
    // customers.emit(OPERATORS_LENGTH, getOperatorsLengthData());
    return getOperatorsLengthData().then(data => customers.emit(OPERATORS_LENGTH, data));
  }

  function notifyCustomerAboutOperatorsLength(customerId) {
    // customers.to(customerId).emit(OPERATORS_LENGTH, getOperatorsLengthData());
    return getOperatorsLengthData().then(data => customers.to(customerId).emit(OPERATORS_LENGTH, data));
  }

  function getOperatorsLengthData() {
    const promises = [getAllOperatorsLength(), getActiveOperatorsLength()];
    return Promise.all(promises).then(([all, active]) => ({ all, active }));
    // return {
    //   all: getAllOperatorsLength(),
    //   active: getActiveOperatorsLength(),
    // };
  }

  function getActiveOperatorsLength() {
    // operators.in(ACTIVE_OPERATORS).clients((err, clients) => {
    //   console.log('CLIENTS', clients.length);
    // });
    // const activeOperators = operators.in(ACTIVE_OPERATORS).connected;
    // return Object.keys(activeOperators).length;
    return new Promise((resolve, reject) => {
      operators.in(ACTIVE_OPERATORS).clients((err, clients) => {
        if (err) {
          reject(err);
        } else {
          console.log('active operators', clients.length);
          resolve(clients.length);
        }
      });
    });
  }

  function getAllOperatorsLength() {
    // return Object.keys(operators.connected).length;
    return new Promise((resolve, reject) => {
      operators.clients((err, clients) => {
        if (err) {
          reject(err);
        } else {
          console.log('all operators', clients.length);
          resolve(clients.length);
        }
      });
    });
  }
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
