/* eslint-disable no-param-reassign, class-methods-use-this */
const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  CUSTOMERS,
} = require('../../constants/socket');
const {
  requestCall,
  finishCall,
  markCallAsMissed,
  subscribeToCallAccepting,
} = require('../calls');
const { authenticateCustomer } = require('../socketAuth');
const logger = require('../logger');

class CustomersRoom {
  constructor(io) {
    this.customers = io.of(CUSTOMERS);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));
    socketIOAuth(this.customers, { authenticate: authenticateCustomer });
    subscribeToCallAccepting(this.onCallAccepted.bind(this));
  }

  onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, this.onCustomerRequestedCall.bind(this, customer));
    customer.on(CALL_FINISHED, this.onCustomerFinishedCall.bind(this, customer));
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
  }

  onCustomerRequestedCall(customer) {
    return requestCall(customer.id)
      .then((call) => {
        logger.debug('call.requested.customer', call);
        customer.pendingCall = call;
      });
  }

  onCustomerFinishedCall(customer, call) {
    return customer.pendingCall
      ? markCallAsMissed(customer.pendingCall)
      : finishCall(call.roomId, customer.id);
  }

  onCustomerDisconnected(customer) {
    return customer.pendingCall
      ? markCallAsMissed(customer.pendingCall)
      : Promise.resolve();
  }

  onCallAccepted(call) {
    logger.debug('call.accepted.customer', call);
    const customerId = call.requestedBy;

    this.checkCustomerAndEmitCallAccepting(customerId, call.roomId);
  }

  checkCustomerAndEmitCallAccepting(customerId, callId) {
    const connectedCustomer = this.customers.connected[customerId];
    if (connectedCustomer) {
      logger.debug('customers.emit.accepted.call', callId);
      connectedCustomer.pendingCall = null;
      this.emitCallAccepting(customerId, callId);
    }
  }

  emitCallAccepting(customerId, callId) {
    this.customers.connected[customerId].emit(CALL_ACCEPTED, callId);
  }
}

module.exports = CustomersRoom;
