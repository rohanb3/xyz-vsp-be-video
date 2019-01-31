/* eslint-disable no-use-before-define */
const moment = require('moment');
const pendingCallsQueue = require('./pendingCallsQueue');
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

      return pendingCallsQueue.accept(call);
    })
    .then(() => callsDBClient.updateById(call._id, updates))
    .then(() => call);
}

function finishCall(callId, finishedBy) {
  const updates = {
    finishedBy,
    finishedAt: moment.utc().format(),
  };
  return callsDBClient.updateById(callId, updates);
}

function markCallAsMissed(call) {
  return pendingCallsQueue.extract(call)
    .then((wasCallPending) => {
      let missedCallPromise = Promise.resolve();

      if (wasCallPending) {
        logger.debug('call.missed.removed.from.queue', call);
        const updates = { missedAt: moment.utc().format() };
        missedCallPromise = callsDBClient.updateById(call._id, updates);
      } else {
        logger.debug('call.missed.was.not.in.queue', call);
      }

      return missedCallPromise;
    });
}

function getOldestCall() {
  return pendingCallsQueue.peak();
}

function getPendingCallsLength() {
  return pendingCallsQueue.size();
}

function getQueueInfo() {
  const promises = [getOldestCall(), getPendingCallsLength()];
  return Promise.all(promises)
    .then(([oldestCall, total]) => ({ oldestCall, total }));
}

function subscribeToCallRequesting(listener) {
  return pendingCallsQueue.subscribeToCallEnqueueing(listener);
}

function subscribeToCallAccepting(listener) {
  return pendingCallsQueue.subscribeToCallAccepting(listener);
}

function subscribeToCallsLengthChanging(listener) {
  return pendingCallsQueue.subscribeToQueueSizeChanging(listener);
}

function unsubscribeFromCallRequesting(listener) {
  return pendingCallsQueue.unsubscribeFromCallEnqueueing(listener);
}

function unsubscribeFromCallAccepting(listener) {
  return pendingCallsQueue.unsubscribeFromCallAccepting(listener);
}

function unsubscribeFromCallsLengthChanging(listener) {
  return pendingCallsQueue.unsubscribeFromQueueSizeChanging(listener);
}

exports.requestCall = requestCall;
exports.acceptCall = acceptCall;
exports.finishCall = finishCall;
exports.markCallAsMissed = markCallAsMissed;
exports.getOldestCall = getOldestCall;
exports.getPendingCallsLength = getPendingCallsLength;
exports.getQueueInfo = getQueueInfo;

exports.subscribeToCallRequesting = subscribeToCallRequesting;
exports.subscribeToCallAccepting = subscribeToCallAccepting;
exports.subscribeToCallsLengthChanging = subscribeToCallsLengthChanging;

exports.unsubscribeFromCallRequesting = unsubscribeFromCallRequesting;
exports.unsubscribeFromCallAccepting = unsubscribeFromCallAccepting;
exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
