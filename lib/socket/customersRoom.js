/* eslint-disable no-use-before-define */

const moment = require('moment');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_FINISHED,
  ACTIVE_OPERATORS,
} = require('./constants');

const pendingCalls = require('./pendingCalls');

module.exports = function createCustomersRoom(operators, customers) {
  customers.on(CONNECTION, onCustomerConnected);

  function onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, onCustomerRequestCall);
    customer.on(CALL_FINISHED, onCustomerFinishedCall);
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
    operators.to(ACTIVE_OPERATORS).emit(CALL_REQUESTED);
  }

  function onCustomerFinishedCall() {
    console.log('CUSTOMER_FINISHED_CALL', this.id);
    onCustomerDisconnected.call(this);
  }

  function onCustomerDisconnected() {
    const customerId = this.id;
    const call = pendingCalls.removeByRequesterId(customerId);
    console.log('CUSTOMER_DISCONNECTED', customerId, call);
  }
};
