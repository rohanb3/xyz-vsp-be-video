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

const { getToken } = require('@/services/twilio');

const { authenticateCustomer } = require('@/services/socketAuth');
const logger = require('@/services/logger')(module);

class CustomersRoom {
  constructor(io) {
    this.customers = io.of(CUSTOMERS);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));
    this.idsMap = new Map();
    this.callIdsToSocketIdsMap = new Map();

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
    logger.debug('Customer authenticated', customer.id, customer.identity);
    this.mapSocketIdentityToId(customer);
  }

  onCustomerRequestedCall(customer) {
    return requestCall(customer.identity)
      .then((call) => {
        logger.debug('Customer call: added to pending', call);
        customer.pendingCallId = call.id;
        customer.emit(CALL_ENQUEUED, call.id);
        this.callIdsToSocketIdsMap.set(call.id, customer.id);
        setTimeout(() => {
          this.callIdsToSocketIdsMap.delete(call.id, customer.id);
        }, 5 * 60 * 1000);
      })
      .catch((err) => {
        logger.error('Customer call: adding to pending failed ', err);
        customer.emit(CALL_NOT_ENQUEUED);
      });
  }

  onCustomerFinishedCall(customer, call) {
    logger.debug('Call: attempt to finish', call && call.id, customer.identity);
    return call && call.id
      ? finishCall(call.id, customer.identity)
        .then(() => logger.debug('Call: finished by customer', call.id))
        .catch(err => logger.error('Call: finishing by customer failed', err))
      : Promise.resolve();
  }

  onCustomerDisconnected(customer) {
    logger.debug('Customer disconneted', customer.identity, customer.pendingCallId);
    this.checkAndUnmapSocketIdentityFromId(customer);
    return customer.pendingCallId ? finishCall(customer.pendingCallId) : Promise.resolve();
  }

  onCallAccepted(call) {
    const { id, requestedBy, acceptedBy } = call;
    // const socketId = this.getSocketIdByIdentity(requestedBy);
    const socketId = this.callIdsToSocketIdsMap.get(id);
    logger.debug('Customer call: accepted', id, requestedBy, acceptedBy);

    this.checkCustomerAndEmitCallAccepting(socketId, id, acceptedBy);
  }

  checkCustomerAndEmitCallAccepting(socketId, callId, operatorId) {
    const connectedCustomer = this.customers.connected[socketId];
    if (connectedCustomer) {
      logger.debug('Customer call: acception emitted to customer', callId, socketId);
      connectedCustomer.pendingCallId = null;
      const token = getToken(connectedCustomer.identity, callId);
      this.emitCallAccepting(socketId, { roomId: callId, operatorId, token });
    }
  }

  checkCustomerAndEmitCallbackRequesting(call) {
    const { requestedBy, id, acceptedBy } = call;
    // const socketId = this.getSocketIdByIdentity(requestedBy);
    const socketId = this.callIdsToSocketIdsMap.get(id);
    const connectedCustomer = this.customers.connected[socketId];
    if (connectedCustomer) {
      logger.debug('Operator callback: emitting to customer', id);
      this.emitCallbackRequesting(socketId, { roomId: id, operatorId: acceptedBy });

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

  emitCallAccepting(customerId, callData) {
    this.customers.connected[customerId].emit(CALL_ACCEPTED, callData);
  }

  emitCallbackRequesting(customerId, callData) {
    this.customers.connected[customerId].emit(CALLBACK_REQUESTED, callData);
  }

  mapSocketIdentityToId(socket) {
    this.idsMap.set(socket.identity, socket.id);
  }

  checkAndUnmapSocketIdentityFromId(socket) {
    if (socket.identity) {
      this.idsMap.delete(socket.identity);
    }
  }

  getSocketIdByIdentity(identity) {
    return this.idsMap.get(identity);
  }
}

module.exports = CustomersRoom;
