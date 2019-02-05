/* eslint-disable no-param-reassign, class-methods-use-this */

const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  ROOM_CREATED,
  CALLS_INFO,
  ACTIVE_OPERATORS,
  OPERATORS,
} = require('../../constants/socket');
const {
  acceptCall,
  finishCall,
  subscribeToCallRequesting,
  subscribeToCallsLengthChanging,
} = require('../calls');
const { authenticateOperator } = require('../socketAuth');
const logger = require('../logger');

class OperatorsRoom {
  constructor(io) {
    this.operators = io.of(OPERATORS);
    this.operators.on(CONNECTION, this.onOperatorConnected.bind(this));
    socketIOAuth(this.operators, { authenticate: authenticateOperator });
    subscribeToCallRequesting(this.emitCallRequesting.bind(this));
    subscribeToCallsLengthChanging(this.emitQueueInfo.bind(this));
  }

  onOperatorConnected(operator) {
    logger.debug('operator.connected', operator.id);
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    logger.debug('operator.accepted.call', operator.id);
    return acceptCall(operator.id)
      .then(call => operator.emit(ROOM_CREATED, call.roomId));
  }

  onOperatorFinishedCall(operator, call) {
    logger.debug('operator.finished.call');
    return finishCall(call.roomId, operator.id);
  }

  onOperatorDisconnected(operator) {
    const operatorId = operator.id;
    logger.debug('operator.disconnected', operatorId);
  }

  emitCallRequesting(call) {
    logger.debug('call.requested.operators.room', call);
    this.operators.to(ACTIVE_OPERATORS).emit(CALL_REQUESTED, call);
  }

  emitQueueInfo(info) {
    logger.debug('queue.info.operators.room', info);
    return this.operators.emit(CALLS_INFO, info);
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
