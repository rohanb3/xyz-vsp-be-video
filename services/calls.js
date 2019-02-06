/* eslint-disable no-use-before-define */
const moment = require('moment');
const pendingCallsQueue = require('./pendingCallsQueue');
const activeCalls = require('./activeCalls');
const callsDBClient = require('./callsDBClient');
const { ensureRoom } = require('./twilio');
const logger = require('./logger');

function requestCall(requestedBy) {
  const call = {
    requestedBy,
    requestedAt: moment.utc().format(),
  };

  return callsDBClient.create(call)
    .then(({ _id }) => {
      call._id = _id;
      return pendingCallsQueue.enqueue(call);
    })
    .then(() => call);
}

function takeCall() {
  return pendingCallsQueue.dequeue();
}

function acceptCall(acceptedBy) {
  const call = {};
  const updates = {
    acceptedBy,
    acceptedAt: moment.utc().format(),
  };
  return takeCall()
    .then((callFromQueue) => {
      Object.assign(call, callFromQueue);

      return ensureRoom(callFromQueue._id);
    })
    .then((room) => {
      const roomId = room.uniqueName;
      updates.roomId = roomId;
      Object.assign(call, updates);

      return activeCalls.add(call);
    })
    .then(() => callsDBClient.updateById(call._id, updates))
    .then(() => call);
}

function finishCall(callId, finishedBy) {
  return pendingCallsQueue.isPending(callId)
    .then(isPending => (
      isPending ? markCallAsMissed(callId) : markCallAsFinished(callId, finishedBy)
    ));
}

function markCallAsFinished(callId, finishedBy) {
  const updates = {
    finishedBy,
    finishedAt: moment.utc().format(),
  };
  return activeCalls.remove(callId)
    .then(() => callsDBClient.updateById(callId, updates));
}

function markCallAsMissed(callId) {
  return pendingCallsQueue.remove(callId)
    .then(() => {
      logger.debug('call.missed.removed.from.queue', callId);
      const updates = { missedAt: moment.utc().format() };
      return callsDBClient.updateById(callId, updates);
    });
}

function getOldestCall() {
  return pendingCallsQueue.peak();
}

function getPendingCallsLength() {
  return pendingCallsQueue.size();
}

function getCallsInfo() {
  const promises = [getOldestCall(), getPendingCallsLength()];
  return Promise.all(promises)
    .then(([oldestCall, total]) => ({ oldestCall, total }));
}

function subscribeToCallRequesting(listener) {
  return pendingCallsQueue.subscribeToCallEnqueueing(listener);
}

function subscribeToCallAccepting(listener) {
  return activeCalls.subscribeToCallAdding(listener);
}

function subscribeToCallsLengthChanging(listener) {
  return pendingCallsQueue.subscribeToQueueSizeChanging(listener);
}

function unsubscribeFromCallRequesting(listener) {
  return pendingCallsQueue.unsubscribeFromCallEnqueueing(listener);
}

function unsubscribeFromCallAccepting(listener) {
  return activeCalls.unsubscribeFromCallAdding(listener);
}

function unsubscribeFromCallsLengthChanging(listener) {
  return pendingCallsQueue.unsubscribeFromQueueSizeChanging(listener);
}

exports.requestCall = requestCall;
exports.acceptCall = acceptCall;
exports.finishCall = finishCall;
exports.getOldestCall = getOldestCall;
exports.getPendingCallsLength = getPendingCallsLength;
exports.getCallsInfo = getCallsInfo;

exports.subscribeToCallRequesting = subscribeToCallRequesting;
exports.subscribeToCallAccepting = subscribeToCallAccepting;
exports.subscribeToCallsLengthChanging = subscribeToCallsLengthChanging;

exports.unsubscribeFromCallRequesting = unsubscribeFromCallRequesting;
exports.unsubscribeFromCallAccepting = unsubscribeFromCallAccepting;
exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
