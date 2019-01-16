/* eslint-disable no-use-before-define */

const moment = require('moment');

const {
  CONNECTION,
  DISCONNECT,
  REQUEST_CALL,
  INCOMING_CALL,
  FINISH_CALL,
  ACTIVE_OPERATORS,
} = require('./constants');

const pendingCalls = require('./pendingCalls');

module.exports = function createCustomersRoom(operators, customers) {
  customers.on(CONNECTION, onCustomerConnected);

  function onCustomerConnected(customer) {
    customer.on(REQUEST_CALL, onCustomerRequestCall);
    customer.on(FINISH_CALL, onCustomerFinishedCall);
    customer.on(DISCONNECT, onCustomerDisconnected);
  }

  function onCustomerRequestCall() {
    const pendingCallsSize = pendingCalls.size;
    const call = {
      requestedBy: this.id,
      requestedAt: moment.utc().format(),
    };
    console.log('CUSTOMER REQUESTED CALL', call, pendingCallsSize);
    pendingCalls.add(call);

    console.log('EMITTING TO ACTIVE OPERATORS');
    operators.to(ACTIVE_OPERATORS).emit(INCOMING_CALL);
  }

  function onCustomerFinishedCall() {
    console.log('CUSTOMER_FINISHED_CALL', this.id);
    onCustomerDisconnected.call(this);
  }

  function onCustomerDisconnected() {
    const customerId = this.id;
    console.log('CUSTOMER_DISCONNECTED', customerId);
  }
};
