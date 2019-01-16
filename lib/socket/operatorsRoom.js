/* eslint-disable no-use-before-define */

const moment = require('moment');

const {
  CONNECTION,
  DISCONNECT,
  ACCEPT_CALL,
  FINISH_CALL,
  CALL_ACCEPTED,
  ROOM_CREATED,
  JOIN_ROOM,
  ACTIVE_OPERATORS,
  INCOMING_CALL,
} = require('./constants');
const { checkAndCreateRoom } = require('../twilio');
const pendingCalls = require('./pendingCalls');

module.exports = function createOperatorsRoom(operators, customers) {
  operators.on(CONNECTION, onOperatorConnected);

  function onOperatorConnected(operator) {
    addOperatorToActive.call(operator);
    operator.on(ACCEPT_CALL, onOperatorAcceptCall);
    operator.on(FINISH_CALL, onOperatorFinishedCall);
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
      operators.to(ACTIVE_OPERATORS).emit(INCOMING_CALL);
    }

    checkAndCreateRoom(operatorId).then(() => {
      this.emit(ROOM_CREATED, operatorId);
      this.on(JOIN_ROOM, () => onOperatorJoinedRoom(operatorId, customerId));
    });
  }

  function onOperatorJoinedRoom(operatorId, customerId) {
    customers.to(customerId).emit(CALL_ACCEPTED, operatorId);
  }

  function onOperatorFinishedCall() {
    addOperatorToActive.call(this);
    onOperatorDisconnected.call(this);
  }

  function onOperatorDisconnected() {
    const operatorId = this.id;
    console.log('OPERATOR_DISCONNECTED', operatorId);
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
