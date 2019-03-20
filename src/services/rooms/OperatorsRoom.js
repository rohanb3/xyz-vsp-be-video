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
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  CALLS_CHANGED,
} = require('@/constants/calls');

const {
  acceptCall,
  requestCallback,
  finishCall,
  subscribeToCallRequesting,
  subscribeToCallbackAccepting,
  subscribeToCallbackDeclining,
  subscribeToCallsLengthChanging,
} = require('@/services/calls');

const { authenticateOperator } = require('@/services/socketAuth');
const logger = require('@/services/logger')(module);

class OperatorsRoom {
  constructor(io) {
    this.operators = io.of(OPERATORS);
    this.operators.on(CONNECTION, this.onOperatorConnected.bind(this));
    socketIOAuth(this.operators, { authenticate: authenticateOperator });
    subscribeToCallRequesting(this.emitCallRequesting.bind(this));
    subscribeToCallbackAccepting(this.checkCustomerAndEmitCallbackAccepting.bind(this));
    subscribeToCallbackDeclining(this.checkCustomerAndEmitCallbackDeclining.bind(this));
    subscribeToCallsLengthChanging(this.emitCallsInfo.bind(this));
  }

  onOperatorConnected(operator) {
    logger.debug('operator.connected', operator.id);
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALLBACK_REQUESTED, this.onOperatorRequestedCallback.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    logger.debug('operator.accepted.call', operator.id);
    return acceptCall(operator.id)
      .then(({ id, requestedAt }) => operator.emit(ROOM_CREATED, { id, requestedAt }))
      .catch((err) => {
        logger.error('call.accept.failed.operator', err);
      });
  }

  onOperatorRequestedCallback(operator, callId) {
    logger.debug('operator.requested.callback', operator.id, callId);
    if (!callId) {
      return Promise.resolve();
    }
    return requestCallback(callId, operator.id)
      .then((callback) => {
        operator.pendingCallbackId = callback.id;
      })
      .catch((err) => {
        logger.error('callback.request.failed.operator', err);
      });
  }

  onOperatorFinishedCall(operator, call) {
    logger.debug('operator.finished.call', call && call.id, operator && operator.id);
    return call && operator
      ? finishCall(call.id, operator.id).catch((err) => {
        logger.error('call.finish.failed.operator', err);
      })
      : Promise.resolve();
  }

  onOperatorDisconnected(operator) {
    const operatorId = operator.id;
    logger.debug('operator.disconnected', operatorId);
  }

  checkCustomerAndEmitCallbackAccepting(call) {
    const { acceptedBy, id } = call;
    const connectedOperator = this.operators.connected[acceptedBy];
    if (connectedOperator) {
      this.emitCallbackAccepting(acceptedBy, { id });
    }
  }

  checkCustomerAndEmitCallbackDeclining(call) {
    const { acceptedBy, id } = call;
    const connectedOperator = this.operators.connected[acceptedBy];
    if (connectedOperator) {
      this.emitCallbackDeclining(acceptedBy, { id });
    }
  }

  emitCallRequesting(call) {
    logger.debug('call.requested.operators.room', call);
    this.operators.to(ACTIVE_OPERATORS).emit(CALL_REQUESTED, call);
  }

  emitCallbackAccepting(operatorId, callId) {
    this.operators.connected[operatorId].emit(CALLBACK_ACCEPTED, callId);
  }

  emitCallbackDeclining(operatorId, callId) {
    this.operators.connected[operatorId].emit(CALLBACK_DECLINED, callId);
  }

  emitCallsInfo(info) {
    logger.debug('queue.info.operators.room', info);
    return this.operators.emit(CALLS_CHANGED, info);
  }

  addOperatorToActive(operator) {
    const operatorId = operator.id;
    logger.debug('addOperatorToActive', operatorId);
    this.operators.connected[operatorId].join(ACTIVE_OPERATORS);
  }

  removeOperatorFromActive(operator) {
    const operatorId = operator.id;
    logger.debug('removeOperatorFromActive', operatorId);
    this.operators.connected[operatorId].leave(ACTIVE_OPERATORS);
  }
}

module.exports = OperatorsRoom;
