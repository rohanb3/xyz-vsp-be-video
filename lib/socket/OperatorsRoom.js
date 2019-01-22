/* eslint-disable no-use-before-define */

const moment = require('moment');

const {
  CONNECTION,
  DISCONNECT,
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  ROOM_CREATED,
  ACTIVE_OPERATORS,
} = require('./constants');
const { checkAndCreateRoom } = require('../twilio');

class OperatorsRoom {
  constructor(operatorsSocket, pendingCallsQueue) {
    this.pendingCalls = pendingCallsQueue;
    this.pendingCalls.subscribeToItemAdding(this.emitCallRequesting);
    this.pendingCalls.subscribeToItemTaking(this.updateEldestPendingCall);
    this.operators = operatorsSocket;
    this.operators.on(CONNECTION, this.onOperatorConnected);
  }

  onOperatorConnected(operator) {
    operator.on(CALL_ACCEPTED, this.onOperatorAcceptCall.bind(this, operator));
    operator.on(CALL_FINISHED, this.onOperatorFinishedCall.bind(this, operator));
    operator.on(DISCONNECT, this.onOperatorDisconnected.bind(this.operator));
    this.addOperatorToActive(operator);
  }

  onOperatorAcceptCall(operator) {
    const operatorId = operator.id;
    const call = this.pendingCalls.take();
    console.log('onOperatorAcceptCall', operatorId, call);

    call.acceptedBy = operatorId;
    call.acceptedAt = moment.utc().format();

    this.removeOperatorFromActive(operator);

    checkAndCreateRoom(operatorId).then(() => {
      // console.log('room', room);
      operator.emit(ROOM_CREATED, operatorId);
      call.roomId = operatorId;
      return this.pendingCalls.acceptCall(call);
    });
  }

  onOperatorFinishedCall(operator) {
    this.addOperatorToActive(operator);
    this.onOperatorDisconnected(operator);
  }

  onOperatorDisconnected() {
    const operatorId = this.id;
    // const call = pendingCalls.removeByAcceptorId(operatorId);
    console.log('OPERATOR_DISCONNECTED', operatorId);
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
    console.log('addOperatorToActive', operatorId);
    this.operators.connected[operatorId].join(ACTIVE_OPERATORS);
  }

  removeOperatorFromActive(operator) {
    const operatorId = operator.id;
    console.log('removeOperatorFromActive', operatorId);
    this.operators.connected[operatorId].leave(ACTIVE_OPERATORS);
  }
}

module.exports = OperatorsRoom;
