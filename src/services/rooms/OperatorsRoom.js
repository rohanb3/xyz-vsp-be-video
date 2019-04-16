/* eslint-disable no-param-reassign, class-methods-use-this */

const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  ROOM_CREATED,
  ACTIVE_OPERATORS,
  OPERATORS,
} = require('@/constants/rooms');

const {
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  CALLS_CHANGED,
  CALLS_EMPTY,
  CALL_ACCEPTING_FAILED,
  CALLBACK_REQUESTING_FAILED,
  PEER_OFFLINE,
} = require('@/constants/calls');

const { STATUS_CHANGED_ONLINE, STATUS_CHANGED_OFFLINE } = require('@/constants/operatorStatuses');

const calls = require('@/services/calls');

const { CallsPendingEmptyError, PeerOfflineError } = require('@/services/calls/errors');

const twilio = require('@/services/twilio');

const { authenticateOperator } = require('@/services/socketAuth');
const { connectionsHeap } = require('@/services/connectionsHeap');
const logger = require('@/services/logger')(module);

class OperatorsRoom {
  constructor(io) {
    this.operators = io.of(OPERATORS);
    this.operators.on(CONNECTION, this.onOperatorConnected.bind(this));
    socketIOAuth(this.operators, {
      authenticate: authenticateOperator,
      postAuthenticate: this.onOperatorAuthenticated.bind(this),
    });
    calls.subscribeToCallbackAccepting(this.checkOperatorAndEmitCallbackAccepting.bind(this));
    calls.subscribeToCallbackDeclining(this.checkOperatorAndEmitCallbackDeclining.bind(this));
    calls.subscribeToCallsLengthChanging(this.emitCallsInfo.bind(this));
  }

  onOperatorConnected(operator) {
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALLBACK_REQUESTED, this.onOperatorRequestedCallback.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    operator.on(STATUS_CHANGED_ONLINE, this.addOperatorToActive.bind(this, operator));
    operator.on(STATUS_CHANGED_OFFLINE, this.removeOperatorFromActive.bind(this, operator));
  }

  onOperatorAuthenticated(operator) {
    logger.debug('Operator authenticated', operator.id, operator.identity);
    this.mapSocketIdentityToId(operator);
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    logger.debug('Customer call: attempt to accept by operator', operator && operator.identity);
    return calls
      .acceptCall(operator.identity)
      .then(({ id, requestedAt }) => {
        const token = twilio.getToken(operator.identity, id);
        operator.emit(ROOM_CREATED, { id, requestedAt, token });
      })
      .then(() => logger.debug('Customer call: accepted by operator', operator.identity))
      .catch((err) => {
        if (err instanceof CallsPendingEmptyError) {
          logger.error('Customer call: accepting failed - queue empty', operator.identity, err);
          operator.emit(CALLS_EMPTY);
        } else {
          logger.error('Customer call: accepting failed', operator.identity, err);
          operator.emit(CALL_ACCEPTING_FAILED);
        }
      });
  }

  onOperatorRequestedCallback(operator, callId) {
    logger.debug('Operator callback: attempt to request', operator.identity, callId);
    if (!callId) {
      logger.error('Operator callback requested: no callId', operator.identity);
      return Promise.resolve();
    }
    return calls
      .requestCallback(callId, operator.identity)
      .then((callback) => {
        operator.pendingCallbackId = callback.id;
      })
      .then(() => logger.debug('Operator callback: requested', operator.id))
      .catch((err) => {
        if (err instanceof PeerOfflineError) {
          logger.error('Operator callback: requesting failed - peer offline', err);
          operator.emit(PEER_OFFLINE);
        } else {
          logger.error('Operator callback: requesting failed because peer offline', err);
          operator.emit(CALLBACK_REQUESTING_FAILED);
        }
      });
  }

  onOperatorFinishedCall(operator, call) {
    logger.debug('Call: attempt to finish by operator', call && call.id, operator.identity);
    return call && call.id
      ? calls
        .finishCall(call.id, operator.identity)
        .then(() => logger.debug('Call: finished by operator', call.id, operator.identity))
        .catch(err => logger.error('Call: finishing by customer failed', err))
      : Promise.resolve();
  }

  onOperatorDisconnected(operator) {
    this.checkAndUnmapSocketIdentityFromId(operator);
    logger.debug('Operator disconnected:', operator.identity);
  }

  checkOperatorAndEmitCallbackAccepting(call) {
    const { acceptedBy, id } = call;
    return this.getSocketIdByIdentity(acceptedBy).then((socketId) => {
      const connectedOperator = this.operators.connected[socketId];
      if (connectedOperator) {
        this.emitCallbackAccepting(connectedOperator, id);
      }
    });
  }

  checkOperatorAndEmitCallbackDeclining(call) {
    const { acceptedBy, id } = call;
    return this.getSocketIdByIdentity(acceptedBy).then((socketId) => {
      const connectedOperator = this.operators.connected[socketId];
      if (connectedOperator) {
        this.emitCallbackDeclining(connectedOperator, id);
      }
    });
  }

  emitCallbackAccepting(operator, callId) {
    operator.emit(CALLBACK_ACCEPTED, callId);
  }

  emitCallbackDeclining(operator, callId) {
    operator.emit(CALLBACK_DECLINED, callId);
  }

  emitCallsInfo(info) {
    logger.debug('Calls info: emitting to active operators', info);
    return this.operators.to(ACTIVE_OPERATORS).emit(CALLS_CHANGED, info);
  }

  addOperatorToActive(operator) {
    const operatorId = operator.id;
    const connectedOperator = this.operators.connected[operatorId];
    if (connectedOperator) {
      logger.debug('Operator: added to active', operatorId);
      connectedOperator.join(ACTIVE_OPERATORS);
      return calls
        .getCallsInfo()
        .then((info) => {
          connectedOperator.emit(CALLS_CHANGED, info);
          logger.debug('Operator: emitted calls info', operatorId);
        })
        .catch(err => logger.error('Calls info: emitting to active operator failed', err));
    }
    return Promise.resolve();
  }

  removeOperatorFromActive(operator) {
    const operatorId = operator.id;
    const connectedOperator = this.operators.connected[operatorId];
    if (connectedOperator) {
      logger.debug('Operator: removed from active', operatorId);
      connectedOperator.leave(ACTIVE_OPERATORS);
    }
  }

  mapSocketIdentityToId(socket) {
    return connectionsHeap.add(socket.identity, socket.id);
  }

  checkAndUnmapSocketIdentityFromId(socket) {
    return socket.identity ? connectionsHeap.remove(socket.identity) : Promise.resolve();
  }

  getSocketIdByIdentity(identity) {
    return connectionsHeap.get(identity);
  }
}

module.exports = OperatorsRoom;
