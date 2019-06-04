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
  PEER_BUSY,
} = require('@/constants/calls');

const BUSY = 'busy';

const calls = require('@/services/calls');

const twilio = require('@/services/twilio');

const { authenticateCustomer } = require('@/services/socketAuth');
const { connectionsHeap } = require('@/services/connectionsHeap');
const logger = require('@/services/logger')(module);

class CustomersRoom {
  constructor(io) {
    this.customers = io.of(CUSTOMERS);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));

    socketIOAuth(this.customers, {
      authenticate: authenticateCustomer,
      postAuthenticate: this.onCustomerAuthenticated.bind(this),
    });
    calls.subscribeToCallAccepting(this.onCallAccepted.bind(this));
    calls.subscribeToCallbackRequesting(this.checkCustomerAndEmitCallbackRequesting.bind(this));
  }

  onCustomerConnected(customer) {
    customer.on(CALL_REQUESTED, this.onCustomerRequestedCall.bind(this, customer));
    customer.on(CALL_FINISHED, this.onCustomerFinishedCall.bind(this, customer));
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
  }

  onCustomerAuthenticated(customer) {
    logger.debug('Customer authenticated', customer.id, customer.identity, customer.deviceId);
    return this.mapDeviceIdToSocketId(customer);
  }

  onCustomerRequestedCall(customer, data) {
    const { identity: requestedBy, deviceId } = customer;
    const { salesRepId, callbackEnabled } = data;
    const payload = {
      requestedBy,
      deviceId,
      salesRepId,
      callbackEnabled,
    };
    return calls
      .requestCall(payload)
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
    logger.debug('Call: attempt to finish', call && call.id, customer.identity);
    return call && call.id
      ? calls
        .finishCall(call.id, customer.identity)
        .then(() => logger.debug('Call: finished by customer', call.id))
        .catch(err => logger.error('Call: finishing by customer failed', err))
      : Promise.resolve();
  }

  onCustomerDisconnected(customer) {
    logger.debug('Customer disconnected', customer.identity, customer.pendingCallId);
    const finishingCallPromise = customer.pendingCallId
      ? calls.finishCall(customer.pendingCallId, customer.identity)
      : Promise.resolve();

    return finishingCallPromise
      .catch((err) => {
        logger.error('Call: finishing by customer failed', err);
      })
      .finally(() => this.checkAndUnmapDeviceIdFromSocketId(customer));
  }

  onCallAccepted(call) {
    const {
      id, requestedBy, acceptedBy, deviceId,
    } = call;
    return this.getSocketIdByDeviceId(deviceId).then((socketId) => {
      logger.debug('Customer call: accepted', id, requestedBy, acceptedBy);
      this.checkCustomerAndEmitCallAccepting(socketId, id, acceptedBy);
    });
  }

  checkCustomerAndEmitCallAccepting(socketId, callId, operatorId) {
    const connectedCustomer = this.customers.connected[socketId];
    if (connectedCustomer) {
      logger.debug('Customer call: acception emitted to customer', callId, socketId);
      connectedCustomer.pendingCallId = null;
      const token = twilio.getToken(connectedCustomer.deviceId, callId);
      this.emitCallAccepting(connectedCustomer, { roomId: callId, operatorId, token });
    }
  }

  checkCustomerAndEmitCallbackRequesting(call) {
    const { deviceId, id, acceptedBy } = call;
    return this.getSocketIdByDeviceId(deviceId).then((socketId) => {
      const connectedCustomer = this.customers.connected[socketId];
      if (connectedCustomer) {
        logger.debug('Operator callback: emitting to customer', id);
        this.emitCallbackRequesting(connectedCustomer, { roomId: id, operatorId: acceptedBy });

        const onCallbackAccepted = () => {
          connectedCustomer.removeListener(CALLBACK_DECLINED, onCallbackDeclined);
          calls
            .acceptCallback(id)
            .then(() => connectedCustomer.emit(ROOM_CREATED, id))
            .then(() => logger.debug('Operator callback: accepted and emitted to customer'))
            .catch((err) => {
              logger.error('Operator callback: failed accepting or emitting to customer', err);
            });
        };

        const onCallbackDeclined = (data = {}) => {
          const reason = data.message === BUSY ? PEER_BUSY : '';
          connectedCustomer.removeListener(CALLBACK_ACCEPTED, onCallbackAccepted);
          calls.declineCallback(id, reason).catch((err) => {
            logger.error('Operator callback: declining failed', err);
          });
        };

        connectedCustomer.once(CALLBACK_ACCEPTED, onCallbackAccepted);
        connectedCustomer.once(CALLBACK_DECLINED, onCallbackDeclined);
      }
    });
  }

  emitCallAccepting(customer, callData) {
    customer.emit(CALL_ACCEPTED, callData);
  }

  emitCallbackRequesting(customer, callData) {
    customer.emit(CALLBACK_REQUESTED, callData);
  }

  mapDeviceIdToSocketId(socket) {
    return connectionsHeap.add(socket.deviceId, socket.id);
  }

  checkAndUnmapDeviceIdFromSocketId(socket) {
    return socket.deviceId ? connectionsHeap.remove(socket.deviceId) : Promise.resolve();
  }

  getSocketIdByDeviceId(deviceId) {
    return connectionsHeap.get(deviceId);
  }
}

module.exports = CustomersRoom;
