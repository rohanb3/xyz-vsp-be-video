/* eslint-disable no-param-reassign, class-methods-use-this, no-use-before-define */
const socketIOAuth = require('socketio-auth');

const { CONNECTION, DISCONNECT, CUSTOMERS } = require('@/constants/rooms');

const {
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
} = require('@/constants/calls');

const {
  requestCall,
  finishCall,
  subscribeToCallAccepting,
  subscribeToCallbackRequesting,
  acceptCallback,
  declineCallback,
} = require('@/services/calls');

const { authenticateCustomer } = require('@/services/socketAuth');
const logger = require('@/services/logger')(module);

class CustomersRoom {
  constructor(io) {
    this.customers = io.of(CUSTOMERS);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));
    socketIOAuth(this.customers, { authenticate: authenticateCustomer });
    subscribeToCallAccepting(this.onCallAccepted.bind(this));
    subscribeToCallbackRequesting(this.checkCustomerAndEmitCallbackRequesting.bind(this));
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
        customer.pendingCallId = call.id;
      })
      .catch((err) => {
        logger.error('call.request.failed.customer', err);
      });
  }

  onCustomerFinishedCall(customer, call) {
    return finishCall(call.id, customer.id)
      .catch((err) => {
        logger.error('call.finish.failed.customer', err);
      });
  }

  onCustomerDisconnected(customer) {
    return customer.pendingCallId ? finishCall(customer.pendingCallId) : Promise.resolve();
  }

  onCallAccepted(call) {
    logger.debug('call.accepted.customer', call);
    const customerId = call.requestedBy;

    this.checkCustomerAndEmitCallAccepting(customerId, call.id);
  }

  checkCustomerAndEmitCallAccepting(customerId, callId) {
    const connectedCustomer = this.customers.connected[customerId];
    if (connectedCustomer) {
      logger.debug('customers.emit.accepted.call', callId);
      connectedCustomer.pendingCallId = null;
      this.emitCallAccepting(customerId, callId);
    }
  }

  checkCustomerAndEmitCallbackRequesting(call) {
    const { requestedBy, id } = call;
    const connectedCustomer = this.customers.connected[requestedBy];
    if (connectedCustomer) {
      logger.debug('customers.emit.requested.callback', id);
      this.emitCallAccepting(requestedBy, id);

      const onCallbackAccepted = () => {
        connectedCustomer.removeListener(CALLBACK_DECLINED, onCallbackDeclined);
        acceptCallback(call)
          .catch((err) => {
            logger.error('call.accept.failed.customer', err);
          });
      };

      const onCallbackDeclined = () => {
        connectedCustomer.removeListener(CALLBACK_ACCEPTED, onCallbackAccepted);
        declineCallback(call)
          .catch((err) => {
            logger.error('call.decline.failed.customer', err);
          });
      };

      connectedCustomer.once(CALLBACK_ACCEPTED, onCallbackAccepted);
      connectedCustomer.once(CALLBACK_DECLINED, onCallbackDeclined);
    }
  }

  emitCallAccepting(customerId, callId) {
    this.customers.connected[customerId].emit(CALL_ACCEPTED, callId);
  }

  emitCallbackRequesting(customerId, callId) {
    this.customers.connected[customerId].emit(CALLBACK_REQUESTED, callId);
  }
}

module.exports = CustomersRoom;
