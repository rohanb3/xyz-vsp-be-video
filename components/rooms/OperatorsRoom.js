/* eslint-disable no-use-before-define */

const moment = require('moment');
const socketIOAuth = require('socketio-auth');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  ROOM_CREATED,
  ACTIVE_OPERATORS,
  OPERATORS,
} = require('../../constants/socket');
const { checkAndCreateRoom } = require('../../services/twilio');
const { authenticateOperator } = require('../../services/socketAuth');
const logger = require('../../services/logger');

class OperatorsRoom {
  constructor(io, pendingCalls, callsDBClient) {
    this.operators = io.of(OPERATORS);
    socketIOAuth(this.operators, { authenticate: authenticateOperator });
    this.operators.on(CONNECTION, this.onOperatorConnected.bind(this));
    this.callsDBClient = callsDBClient;
    this.pendingCalls = pendingCalls;
    this.pendingCalls.subscribeToItemEnqueueing(this.emitCallRequesting.bind(this));
    this.pendingCalls.subscribeToItemDequeueing(this.updateEldestPendingCall.bind(this));
  }

  onOperatorConnected(operator) {
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    const operatorId = operator.id;
    let call = null;

    this.removeOperatorFromActive(operator);

    return this.pendingCalls.dequeue()
      .then((rawCall) => {
        call = JSON.parse(rawCall);

        logger.debug('onOperatorAcceptCall', operatorId, call);

        call.acceptedBy = operatorId;
        call.acceptedAt = moment.utc().format();
      })
      .then(() => checkAndCreateRoom(operatorId))
      .then(() => {
        // logger.debug('room', room);
        operator.emit(ROOM_CREATED, operatorId);
        call.roomId = operatorId;
        return this.pendingCalls.acceptCall(call);
      });
  }

  onOperatorFinishedCall(operator) {
    this.addOperatorToActive(operator);
    this.onOperatorDisconnected(operator);
  }

  onOperatorDisconnected(operator) {
    const operatorId = operator.id;
    logger.debug('OPERATOR_DISCONNECTED', operatorId, this.pendingCallsQueue);
  }

  updateEldestPendingCall() {
    const call = this.pendingCalls.getCopyOfEldestCall();
    this.emitCallRequesting(call);
  }

  emitCallRequesting(call) {
    this.operators.to(ACTIVE_OPERATORS).emit(CALL_REQUESTED, call);
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
