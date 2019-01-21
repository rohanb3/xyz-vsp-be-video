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
const pendingCalls = require('./pendingCalls');

module.exports = function createOperatorsRoom(operators, customers) {
  operators.on(CONNECTION, onOperatorConnected);

  function onOperatorConnected(operator) {
    addOperatorToActive.call(operator);
    operator.on(CALL_ACCEPTED, onOperatorAcceptCall);
    operator.on(CALL_FINISHED, onOperatorFinishedCall);
    operator.on(DISCONNECT, onOperatorDisconnected);
  }

  function onOperatorAcceptCall() {
    const operatorId = this.id;
    console.log('onOperatorAcceptCall', operatorId);
    const call = pendingCalls.getOldest();
    console.log(call);
    const pendingCallsSize = pendingCalls.size;
    const customerId = call.requestedBy;

    call.acceptedBy = operatorId;
    call.acceptedAt = moment.utc().format();

    removeOperatorFromActive.call(this);

    if (pendingCallsSize) {
      operators.to(ACTIVE_OPERATORS).emit(CALL_REQUESTED);
    }

    checkAndCreateRoom(operatorId).then(() => {
      // console.log('room', room);
      this.emit(ROOM_CREATED, operatorId);
      customers.to(customerId).emit(CALL_ACCEPTED, operatorId);
    });
  }

  function onOperatorFinishedCall() {
    addOperatorToActive.call(this);
    onOperatorDisconnected.call(this);
  }

  function onOperatorDisconnected() {
    const operatorId = this.id;
    const call = pendingCalls.removeByAcceptorId(operatorId);
    console.log('OPERATOR_DISCONNECTED', operatorId, call);
  }

  function addOperatorToActive() {
    const operatorId = this.id;
    console.log('addOperatorToActive', operatorId);
    operators.connected[operatorId].join(ACTIVE_OPERATORS);
  }

  function removeOperatorFromActive() {
    const operatorId = this.id;
    console.log('removeOperatorFromActive', operatorId);
    operators.connected[operatorId].leave(ACTIVE_OPERATORS);
  }
};
