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
    const operatorId = operator.id;
    addOperatorToActive(operatorId);
    operator.on(ACCEPT_CALL, onOperatorAcceptCall);
    operator.on(FINISH_CALL, () => onOperatorFinishedCall(operatorId));
    operator.on(DISCONNECT, () => onOperatorDisconnected(operatorId));
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

    removeOperatorFromActive(operatorId);

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

  function onOperatorFinishedCall(operatorId) {
    addOperatorToActive(operatorId);
    onOperatorDisconnected(operatorId);
  }

  function onOperatorDisconnected(operatorId) {
    console.log('OPERATOR_DISCONNECTED', operatorId);
  }

  function addOperatorToActive(operatorId) {
    operators.connected[operatorId].join(ACTIVE_OPERATORS);
  }

  function removeOperatorFromActive(operatorId) {
    operators.connected[operatorId].leave(ACTIVE_OPERATORS);
  }
};
