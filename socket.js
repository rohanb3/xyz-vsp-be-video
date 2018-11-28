/* eslint-disable no-use-before-define */

const socketIO = require('socket.io');

const { checkAndCreateRoom } = require('./services/twilio');
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
} = require('./constants/socket');

function socket(server) {
  const io = socketIO(server);
  const operators = io.of(OPERATORS);
  const customers = io.of(CUSTOMERS);

  const customersByOperators = {};
  const operatorsByCustomers = {};

  operators.on(CONNECTION, onOperatorConnected);
  customers.on(CONNECTION, onCustomerConnected);

  function onOperatorConnected(operator) {
    const operatorId = operator.id;
    console.log('operator connected', operatorId);
    addOperatorToActive(operatorId);
    notifyCustomersAboutOperatorsLength();
    operator.on(ACCEPT_CALL, onOperatorAcceptCall);
    operator.on(FINISH_CALL, () => onOperatorDisconnected(operatorId));
    operator.on(DISCONNECT, () => onOperatorDisconnected(operatorId));
  }

  function onCustomerConnected(customer) {
    console.log('customer connected', customer.id);
    const customerId = customer.id;
    customer.on(REQUEST_CALL, onCustomerRequestCall);
    customer.on(FINISH_CALL, () => onCustomerDisconnected(customerId));
    customer.on(DISCONNECT, () => onCustomerDisconnected(customerId));
    customer.on(OPERATORS_LENGTH, () => notifyCustomerAboutOperatorsLength(customerId));
  }

  function onCustomerRequestCall() {
    console.log('incoming call from customer', this.id);
    operators.to(ACTIVE_OPERATORS).emit(INCOMING_CALL, { customerId: this.id });
  }

  function onOperatorAcceptCall(data) {
    const operatorId = this.id;
    const { customerId } = data.query;
    console.log('operator accepted call', operatorId, '--->', customerId);
    removeOperatorFromActive(operatorId);
    notifyCustomersAboutOperatorsLength();
    checkAndCreateRoom(operatorId)
      .then(() => {
        bindCustomerToOperator(customerId, operatorId);
        this.emit(ROOM_CREATED, operatorId);
        this.on(OPERATOR_JOINED_ROOM, () => onOperatorJoinedRoom(operatorId, customerId));
      });
  }

  function onOperatorJoinedRoom(operatorId, customerId) {
    customers
      .to(customerId)
      .emit(CALL_ACCEPTED, operatorId);
  }

  function onOperatorDisconnected(operatorId) {
    const customerId = getCustomerIdByOperatorId(operatorId);
    console.log('operator disconnected', operatorId, customerId);
    if (customerId) {
      notifyCustomerAboutOperatorDisconnection(customerId);
      unbindCustomerFromOperator(customerId, operatorId);
      notifyCustomersAboutOperatorsLength();
    }
  }

  function onCustomerDisconnected(customerId) {
    const operatorId = getOperatorIdByCustomerId(customerId);
    console.log('customer disconnected', customerId, operatorId);
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
    console.log('notifyCustomersAboutOperatorsLength');
    customers.emit(OPERATORS_LENGTH, getOperatorsLengthData());
  }

  function notifyCustomerAboutOperatorsLength(customerId) {
    console.log('notifyCustomerAboutOperatorsLength');
    customers.to(customerId).emit(OPERATORS_LENGTH, getOperatorsLengthData());
  }

  function getOperatorsLengthData() {
    return {
      all: getAllOperatorsLength(),
      active: getActiveOperatorsLength(),
    };
  }

  function getActiveOperatorsLength() {
    const activeOperators = operators.in(ACTIVE_OPERATORS).connected;
    return Object.keys(activeOperators).length;
  }

  function getAllOperatorsLength() {
    return Object.keys(operators.connected).length;
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
