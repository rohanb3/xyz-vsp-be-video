/* eslint-disable no-use-before-define */
const moment = require('moment');
const pendingCallsQueue = require('@/services/pendingCallsQueue');
const activeCallsHeap = require('@/services/activeCallsHeap');
const callsDBClient = require('@/services/callsDBClient');
const { ensureRoom } = require('@/services/twilio');
const logger = require('@/services/logger')(module);
const pubSubChannel = require('@/services/pubSubChannel');

const CALL_REQUESTED = 'call.requested';
const CALL_ACCEPTED = 'call.accepted';

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
    .then(() => pubSubChannel.publish(CALL_REQUESTED, call))
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

      return activeCallsHeap.add(call);
    })
    .then(() => callsDBClient.updateById(call._id, updates))
    .then(() => pubSubChannel.publish(CALL_ACCEPTED, call))
    .then(() => call);
}

function finishCall(callId, finishedBy) {
  return pendingCallsQueue.isExist(callId)
    .then(exists => (
      exists ? markCallAsMissed(callId) : markCallAsFinished(callId, finishedBy)
    ));
}

function markCallAsFinished(callId, finishedBy) {
  const updates = {
    finishedBy,
    finishedAt: moment.utc().format(),
  };
  return activeCallsHeap.remove(callId)
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
  return pendingCallsQueue.getPeak();
}

function getPendingCallsLength() {
  return pendingCallsQueue.getSize();
}

function subscribeToCallsLengthChanging(listener) {
  return pendingCallsQueue.subscribeToQueueSizeChanging(listener);
}

function unsubscribeFromCallsLengthChanging(listener) {
  return pendingCallsQueue.unsubscribeFromQueueSizeChanging(listener);
}

exports.requestCall = requestCall;
exports.acceptCall = acceptCall;
exports.finishCall = finishCall;
exports.getOldestCall = getOldestCall;
exports.getPendingCallsLength = getPendingCallsLength;

exports.subscribeToCallRequesting = pubSubChannel.subscribe.bind(null, CALL_REQUESTED);
exports.subscribeToCallAccepting = pubSubChannel.subscribe.bind(null, CALL_ACCEPTED);
exports.subscribeToCallsLengthChanging = subscribeToCallsLengthChanging;

exports.unsubscribeFromCallRequesting = pubSubChannel.unsubscribe.bind(null, CALL_REQUESTED);
exports.unsubscribeFromCallAccepting = pubSubChannel.unsubscribe.bind(null, CALL_ACCEPTED);
exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
