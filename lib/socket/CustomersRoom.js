/* eslint-disable no-use-before-define */

const moment = require('moment');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
} = require('./constants');

// const pendingCalls = require('./pendingCalls');

class CustomersRoom {
  constructor(customersSocket, pendingCallsQueue) {
    this.pendingCalls = pendingCallsQueue;
    this.pendingCalls.subscribeToCallAccepting(this.onCallAccepted);
    this.customers = customersSocket;
    this.customers.on(CONNECTION, this.onCustomerConnected);
  }

  onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, this.onCustomerRequestedCall.bind(this, customer));
    customer.on(CALL_FINISHED, this.onCustomerFinishedCall.bind(this, customer));
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
  }

  onCustomerRequestedCall(customer) {
    const pendingCallsSize = this.pendingCalls.size;
    const call = {
      requestedBy: customer.id,
      requestedAt: moment.utc().format(),
    };
    console.log('CUSTOMER REQUESTED CALL', call, pendingCallsSize);
    return this.pendingCalls.add(call);
  }

  onCustomerFinishedCall(customer) {
    console.log('CUSTOMER_FINISHED_CALL', customer.id);
    this.onCustomerDisconnected(customer);
  }

  onCustomerDisconnected(customer) {
    const customerId = customer.id;
    // const call = this.pendingCalls.removeByRequesterId(customerId);
    console.log('CUSTOMER_DISCONNECTED', customerId, this.pendingCalls.size);
  }

  onCallAccepted(call) {
    const customerId = call.requestedBy;
    this.customers.to(customerId).emit(CALL_ACCEPTED, call);
  }
}

module.exports = CustomersRoom;
