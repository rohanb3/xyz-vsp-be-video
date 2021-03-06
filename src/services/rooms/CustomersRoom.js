/* eslint-disable no-param-reassign, class-methods-use-this, no-use-before-define */
const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  CUSTOMERS,
  ROOM_CREATED,
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
  CUSTOMER_CONNECTED,
  CUSTOMER_DISCONNECTED,
  VOICE_CALL_REQUESTED,
  VOICE_CALL_FINISHED,
  VOICE_CALL_ACCEPTED,
  VOICE_CALL_STARTED,
  VOICE_CALL_FAILED,
} = require('@/constants/calls');

const BUSY = 'busy';

const calls = require('@/services/calls');
const voiceCalls = require('@/services/voiceCalls');

const twilio = require('@/services/twilio');

const { authenticateCustomer } = require('@/services/socketAuth');
const { connectionsHeap } = require('@/services/connectionsHeap');
const logger = require('@/services/logger')(module);

const { repeatUntilDelivered } = require('./utils');

class CustomersRoom {
  constructor(io, mediator) {
    this.customers = io.of(CUSTOMERS);
    this.customers.on(CONNECTION, this.onCustomerConnected.bind(this));

    this.mediator = mediator;

    socketIOAuth(this.customers, {
      authenticate: authenticateCustomer,
      postAuthenticate: this.onCustomerAuthenticated.bind(this),
      timeout: 15000,
    });
    calls.subscribeToCallAccepting(this.onCallAccepted.bind(this));
    calls.subscribeToCallFinishing(this.onCallFinished.bind(this));
    calls.subscribeToCallbackRequesting(
      this.checkCustomerAndEmitCallbackRequesting.bind(this)
    );
  }

  onCustomerConnected(customer) {
    customer.on(
      CALL_REQUESTED,
      this.onCustomerRequestedCall.bind(this, customer)
    );
    customer.on(
      CALL_FINISHED,
      this.onCustomerFinishedCall.bind(this, customer)
    );
    customer.on(DISCONNECT, this.onCustomerDisconnected.bind(this, customer));
    customer.on(
      VOICE_CALL_REQUESTED,
      this.onCustomerRequestedVoiceCall.bind(this, customer)
    );
    customer.on(
      VOICE_CALL_FINISHED,
      this.onCustomerFinishVoiceCall.bind(this, customer)
    );
    customer.on(
      VOICE_CALL_STARTED,
      this.onCustomerVoiceCallStarted.bind(this, customer)
    );
  }

  onCustomerAuthenticated(customer) {
    logger.debug(
      'Customer authenticated',
      customer.id,
      customer.identity,
      customer.deviceId,
      customer.tenantId
    );
    return this.getSocketIdByDeviceId(customer.deviceId)
      .then(socketId => {
        const connectedSocket = this.getConnectedCustomer(socketId);
        const isPreviousConnectionExist =
          !!connectedSocket &&
          connectedSocket !== customer &&
          connectedSocket.id !== customer.id;
        logger.debug(
          'Customer isPreviousConnectionExist: ',
          socketId,
          isPreviousConnectionExist,
          !!connectedSocket,
          connectedSocket !== customer
        );
        if (isPreviousConnectionExist) {
          logger.debug(
            'Customer previous connection exists: ',
            connectedSocket.deviceId,
            connectedSocket.identity
          );
          connectedSocket.deviceId = null;
          connectedSocket.identity = null;
        }
      })
      .finally(() => this.mapDeviceIdToSocketId(customer));
  }

  onCustomerRequestedCall(customer, data) {
    const { identity: requestedBy, deviceId, tenantId } = customer;
    const { salesRepId, callbackEnabled } = data;

    const payload = {
      requestedBy,
      deviceId,
      salesRepId,
      callbackEnabled,
      tenantId,
    };
    return calls
      .requestCall(payload)
      .then(call => {
        logger.debug('Customer call: added to pending', call);
        customer.pendingCallId = call.id;
        customer.emit(CALL_ENQUEUED, call.id);
      })
      .catch(err => {
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

  onCustomerDisconnected(customer, reason) {
    logger.debug(
      'Customer disconnected',
      customer.identity,
      customer.pendingCallId,
      reason
    );
    const finishingCallPromise = customer.pendingCallId
      ? calls.finishCall(customer.pendingCallId, customer.identity)
      : Promise.resolve();

    return finishingCallPromise
      .catch(err => {
        logger.error('Call: finishing by customer failed', err);
      })
      .then(() => this.getSocketIdByDeviceId(customer.deviceId))
      .then(socketId => {
        logger.debug('Customer disconnection: ', socketId, customer.id);
      })
      .finally(() => this.checkAndUnmapDeviceIdFromSocketId(customer));
  }

  onCallAccepted(call) {
    const { id, requestedBy, acceptedBy, deviceId } = call;
    logger.debug(
      'Customer call: accepted',
      id,
      requestedBy,
      acceptedBy,
      deviceId
    );
    return this.getSocketIdByDeviceId(deviceId)
      .then(socketId => this.getCustomer(socketId, id, acceptedBy))
      .then(({ connectedCustomer, callData } = {}) => {
        return connectedCustomer && repeatUntilDelivered(
          () => this.emitCallAccepting(connectedCustomer, callData),
          delivered => {
            connectedCustomer.once(CUSTOMER_CONNECTED, delivered);
            return () => connectedCustomer.off(CUSTOMER_CONNECTED, delivered);
          }
        ).catch(error => {
          this.mediator.emit(CUSTOMER_DISCONNECTED, callData);
          logger.error(error);
        });
      });
  }

  onCallFinished(call) {
    const callFinishedNotByCustomer = call.finishedBy !== call.requestedBy;
    if (callFinishedNotByCustomer) {
      this.checkCustomerAndEmitCallFinishing(call);
    }
  }

  getCustomer(socketId, callId, operatorId) {
    const connectedCustomer = this.getConnectedCustomer(socketId);

    logger.debug(
      'Checking customer before accept call emit',
      !!connectedCustomer,
      socketId,
      callId,
      operatorId
    );
    if (connectedCustomer) {
      logger.debug(
        'Customer call: acception emitted to customer',
        callId,
        socketId
      );
      connectedCustomer.pendingCallId = null;
      const token = twilio.getToken(connectedCustomer.deviceId, callId);
      let callData = {
        roomId: callId,
        operatorId,
        token,
      };
      return { connectedCustomer, callData };
    }
  }

  checkCustomerAndEmitCallbackRequesting(call) {
    const { deviceId, id, acceptedBy } = call;
    return this.getSocketIdByDeviceId(deviceId).then(socketId => {
      const connectedCustomer = this.getConnectedCustomer(socketId);
      if (connectedCustomer) {
        logger.debug('Operator callback: emitting to customer', id);
        this.emitCallbackRequesting(connectedCustomer, {
          roomId: id,
          operatorId: acceptedBy,
        });

        const onCallbackAccepted = () => {
          connectedCustomer.removeListener(
            CALLBACK_DECLINED,
            onCallbackDeclined
          );
          calls
            .acceptCallback(id)
            .then(() => connectedCustomer.emit(ROOM_CREATED, id))
            .then(() =>
              logger.debug(
                'Operator callback: accepted and emitted to customer'
              )
            )
            .catch(err => {
              logger.error(
                'Operator callback: failed accepting or emitting to customer',
                err
              );
            });
        };

        const onCallbackDeclined = (data = {}) => {
          const reason = data.message === BUSY ? PEER_BUSY : '';
          connectedCustomer.removeListener(
            CALLBACK_ACCEPTED,
            onCallbackAccepted
          );
          calls.declineCallback(id, reason).catch(err => {
            logger.error('Operator callback: declining failed', err);
          });
        };

        connectedCustomer.once(CALLBACK_ACCEPTED, onCallbackAccepted);
        connectedCustomer.once(CALLBACK_DECLINED, onCallbackDeclined);
      }
    });
  }

  checkCustomerAndEmitCallFinishing(call) {
    const { deviceId, id } = call;
    return this.getSocketIdByDeviceId(deviceId).then(socketId => {
      const connectedCustomer = this.getConnectedCustomer(socketId);
      if (connectedCustomer) {
        logger.debug('Call finished: emitting to customer', id, deviceId);
        this.emitCallFinishing(connectedCustomer, { id });
      }
    });
  }

  emitCallAccepting(customer, callData) {
    customer.emit(CALL_ACCEPTED, callData);
  }

  emitCallbackRequesting(customer, callData) {
    customer.emit(CALLBACK_REQUESTED, callData);
  }

  emitCallFinishing(customer, data) {
    customer.emit(CALL_FINISHED, data);
  }

  mapDeviceIdToSocketId(socket) {
    logger.debug(
      'Customer mapDeviceIdToSocketId: ',
      socket.deviceId,
      socket.id
    );
    return connectionsHeap.add(socket.deviceId, socket.id).catch(err => {
      logger.error(
        'Customer: mapDeviceIdToSocketId failed:',
        socket.deviceId,
        socket.id,
        err
      );
    });
  }

  checkAndUnmapDeviceIdFromSocketId(socket) {
    logger.debug(
      'Customer checkAndUnmapDeviceIdFromSocketId: ',
      socket.deviceId
    );
    return socket.deviceId
      ? connectionsHeap
          .remove(socket.deviceId)
          .catch(err =>
            logger.error(
              'Customer checkAndUnmapDeviceIdFromSocketId failed: ',
              socket.deviceId,
              err
            )
          )
      : Promise.resolve();
  }

  getSocketIdByDeviceId(deviceId) {
    logger.debug('Customer getSocketIdByDeviceId: ', deviceId);
    return connectionsHeap
      .get(deviceId)
      .catch(err =>
        logger.error('Customer getSocketIdByDeviceId failed: ', deviceId, err)
      );
  }

  getConnectedCustomer(socketId) {
    return this.customers.connected[socketId];
  }

  onCustomerRequestedVoiceCall(customer, data) {
    const { identity: requestedBy, deviceId } = customer;
    const call = {
      ...data,
      requestedBy,
      deviceId,
    };

    logger.debug('Customer requested voice call', call);

    voiceCalls
      .requestCall(call)
      .then(acceptedCall => {
        logger.debug(
          'Customers voice call was accepted',
          call.requestedBy,
          acceptedCall.id
        );
        customer.emit(VOICE_CALL_ACCEPTED, acceptedCall);
      })
      .catch(error => {
        logger.debug('Customers voice call was failed', error);
        customer.emit(VOICE_CALL_FAILED, error);
      });
  }

  onCustomerFinishVoiceCall(customer, data) {
    const { identity } = customer;
    const { id } = data;

    logger.debug('Customers voice call was finished', id);

    voiceCalls.finishCall(id, identity).catch(ex => {
      logger.debug('Customers voice call insert in db failed', ex);
      throw ex;
    });
  }

  onCustomerVoiceCallStarted(customer, data) {
    const { identity: startedBy } = customer;
    const { id, roomId } = data;

    const call = {
      roomId,
      startedBy,
    };

    logger.debug('Customers voice call was started', id);

    voiceCalls.startCall(id, call).catch(ex => {
      logger.debug('Customers voice call insert in db failed', ex);
      throw ex;
    });
  }
}

module.exports = CustomersRoom;
