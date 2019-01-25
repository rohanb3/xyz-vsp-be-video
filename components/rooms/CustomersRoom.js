/* eslint-disable no-use-before-define, no-param-reassign */

const moment = require('moment');
const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  CUSTOMERS,
} = require('../../constants/socket');
const { authenticateCustomer } = require('../../services/socketAuth');

class CustomersRoom {
  constructor(io, pendingCalls) {
    this.customers = io.of(CUSTOMERS);
    socketIOAuth(this.customers, { authenticate: authenticateCustomer });
    this.pendingCalls = pendingCalls;
    this.pendingCalls.subscribeToCallAccepting(this.onCallAccepted);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));
  }

  onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, this.onCustomerRequestedCall.bind(this, customer));
    customer.on(CALL_FINISHED, this.onCustomerFinishedCall.bind(this, customer));
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
  }

  onCustomerRequestedCall(customer) {
    const call = {
      requestedBy: customer.id,
      requestedAt: moment.utc().format(),
    };
    return this.pendingCalls.enqueue(call)
      .then(() => {
        console.log('CUSTOMER CALL_REQUESTED', call);
        customer.pendingCall = call;
      });
  }

  onCustomerFinishedCall(customer) {
    console.log('CUSTOMER_FINISHED_CALL', customer.id);
    return this.onCustomerDisconnected(customer);
  }

  onCustomerDisconnected(customer) {
    const customerId = customer.id;
    console.log('CUSTOMER_DISCONNECTED', customerId);
    return this.checkCustomerPendingCallAndMarkAsMissed(customer);
  }

  checkCustomerPendingCallAndMarkAsMissed(customer) {
    const { pendingCall } = customer;
    if (pendingCall) {
      return this.pendingCalls.remove(pendingCall)
        .then((wasCallPending) => {
          if (wasCallPending) {
            console.log('Success. Call was removed from queue and can be marked as missed', pendingCall);
            customer.pendingCall = null;
          } else {
            console.log('Fail. Call was not in pending', pendingCall);
          }
        });
    }
    return Promise.resolve();
  }

  onCallAccepted(call) {
    const customerId = call.requestedBy;
    if (this.customers.connected[customerId] && this.customers.connected[customerId].pendingCall) {
      this.customers.connected[customerId].pendingCall = null;
    }
    this.customers.to(customerId).emit(CALL_ACCEPTED, call);
  }
}

module.exports = CustomersRoom;
