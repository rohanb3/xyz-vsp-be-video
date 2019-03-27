/* eslint-disable no-param-reassign, class-methods-use-this, no-use-before-define */
const socketIOAuth = require('socketio-auth');

const {
  CONNECTION, DISCONNECT, CUSTOMERS, ROOM_CREATED,
} = require('@/constants/rooms');

const {
  CALL_REQUESTED,
  CALL_ENQUEUED,
  CALL_NOT_ENQUEUED,
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
    socketIOAuth(this.customers, {
      authenticate: authenticateCustomer,
      postAuthenticate: this.onCustomerAuthenticated.bind(this),
    });
    subscribeToCallAccepting(this.onCallAccepted.bind(this));
    subscribeToCallbackRequesting(this.checkCustomerAndEmitCallbackRequesting.bind(this));
  }

  onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, this.onCustomerRequestedCall.bind(this, customer));
    customer.on(CALL_FINISHED, this.onCustomerFinishedCall.bind(this, customer));
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
  }

  onCustomerAuthenticated(customer) {
    logger.debug('Customer authenticated', customer.id);
  }

  onCustomerRequestedCall(customer) {
    return requestCall(customer.id)
      .then((call) => {
        logger.debug('Customer call: added to pending', call);
        customer.pendingCallId = call.id;
        customer.emit(CALL_ENQUEUED, call.id);
      })
      .catch((err) => {
        logger.error('Customer call: adding to pending failed ', err);
        customer.emit(CALL_NOT_ENQUEUED);
      });
  }

  onCustomerFinishedCall(customer, call) {
    logger.debug('Call: attempt to finish', call && call.id, customer && customer.id);
    return call && customer
      ? finishCall(call.id, customer.id)
        .then(() => logger.debug('Call: finished by customer', call.id))
        .catch(err => logger.error('Call: finishing by customer failed', err))
      : Promise.resolve();
  }

  onCustomerDisconnected(customer) {
    logger.debug('Customer disconneted', customer.id, customer.pendingCallId);
    return customer.pendingCallId ? finishCall(customer.pendingCallId) : Promise.resolve();
  }

  onCallAccepted(call) {
    logger.debug('Customer call: accepted', call);
    const customerId = call.requestedBy;

    this.checkCustomerAndEmitCallAccepting(customerId, call.id);
  }

  checkCustomerAndEmitCallAccepting(customerId, callId) {
    const connectedCustomer = this.customers.connected[customerId];
    if (connectedCustomer) {
      logger.debug('Customer call: acception emitted to customer', callId, customerId);
      connectedCustomer.pendingCallId = null;
      this.emitCallAccepting(customerId, callId);
    }
  }

  checkCustomerAndEmitCallbackRequesting(call) {
    const { requestedBy, id } = call;
    const connectedCustomer = this.customers.connected[requestedBy];
    if (connectedCustomer) {
      logger.debug('Operator callback: emitting to customer', id);
      this.emitCallbackRequesting(requestedBy, id);

      const onCallbackAccepted = () => {
        connectedCustomer.removeListener(CALLBACK_DECLINED, onCallbackDeclined);
        acceptCallback(id)
          .then(() => connectedCustomer.emit(ROOM_CREATED, id))
          .then(() => logger.debug('Operator callback: accepted and emitted to customer'))
          .catch((err) => {
            logger.error('Operator callback: failed accepting or emitting to customer', err);
          });
      };

      const onCallbackDeclined = () => {
        connectedCustomer.removeListener(CALLBACK_ACCEPTED, onCallbackAccepted);
        declineCallback(id).catch((err) => {
          logger.error('Operator callback: declining failed', err);
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
