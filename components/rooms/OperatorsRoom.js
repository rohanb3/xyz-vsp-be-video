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
const { ensureRoom } = require('../../services/twilio');
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
    this.pendingCalls.subscribeToItemDequeueing(this.updateOldestPendingCall.bind(this));
  }

  onOperatorConnected(operator) {
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this, operator));
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    const operatorId = operator.id;
    const call = {};
    const callUpdates = {
      acceptedBy: operatorId,
      acceptedAt: moment.utc().format(),
    };

    this.removeOperatorFromActive(operator);

    return this.pendingCalls.dequeue()
      .then((callFromQueue) => {
        logger.debug('onOperatorAcceptCall', operatorId, callFromQueue);
        Object.assign(call, callFromQueue);

        return ensureRoom(callFromQueue._id);
      })
      .then((room) => {
        const roomId = room.uniqueName;
        logger.debug('ROOM_CREATED', room);
        operator.emit(ROOM_CREATED, roomId);
        callUpdates.roomId = roomId;
        Object.assign(call, callUpdates);

        return this.pendingCalls.acceptCall(call);
      })
      .then(() => this.callsDBClient.updateById(call._id, callUpdates));
  }

  onOperatorFinishedCall(operator, call) {
    return this.markCallAsFinishedByOperator(operator, call)
      .then(() => {
        this.addOperatorToActive(operator);
        this.onOperatorDisconnected(operator);
      });
  }

  onOperatorDisconnected(operator) {
    const operatorId = operator.id;
    logger.debug('OPERATOR_DISCONNECTED', operatorId, this.pendingCallsQueue);
  }

  updateOldestPendingCall() {
    return this.pendingCalls.peak()
      .then((call) => {
        if (call) {
          this.emitCallRequesting(call);
        }
      });
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

  markCallAsFinishedByOperator(operator, call) {
    const operatorId = operator.id;
    const { roomId } = call;
    const updates = {
      finishedBy: operatorId,
      finishedAt: moment.utc().format(),
    };
    const query = { roomId };
    return this.callsDBClient.updateByQuery(query, updates);
  }
}

module.exports = OperatorsRoom;
