/* eslint-disable no-use-before-define */
const moment = require('moment');
const pendingCallsQueue = require('@/services/pendingCallsQueue');
const activeCallsHeap = require('@/services/activeCallsHeap');
const pendingCallbacksHeap = require('@/services/pendingCallbacksHeap');
const callsDBClient = require('@/services/callsDBClient');
const twilio = require('@/services/twilio');
const pubSubChannel = require('@/services/pubSubChannel');
const callsStorage = require('@/services/callsStorage');
const callStatusHelper = require('@/services/callStatusHelper');
const callFinisher = require('@/services/callFinisher');
const {
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  statuses,
} = require('@/constants/calls');

function requestCall(requestedBy) {
  const call = {
    requestedBy,
    requestedAt: moment.utc().format(),
  };

  return callsDBClient
    .create({ ...call })
    .then(({ id }) => {
      call.id = id;
      return pendingCallsQueue.enqueue(id, call);
    })
    .then(() => pubSubChannel.publish(CALL_REQUESTED, call))
    .then(() => call);
}

function takeCall() {
  return pendingCallsQueue.dequeue();
}

function acceptCall(acceptedBy) {
  const updates = {
    acceptedBy,
    acceptedAt: moment.utc().format(),
  };
  const call = {
    ...updates,
  };
  return takeCall()
    .then((callFromQueue) => {
      Object.assign(call, callFromQueue);

      return twilio.ensureRoom(callFromQueue.id);
    })
    .then(() => activeCallsHeap.add(call.id, call))
    .then(() => callsDBClient.updateById(call.id, updates))
    .then(() => pubSubChannel.publish(CALL_ACCEPTED, call))
    .then(() => call);
}

function requestCallback(callId) {
  const call = {};
  return callsDBClient
    .getById(callId)
    .then((callFromDB) => {
      const callback = {
        requestedAt: moment.utc().format(),
      };

      const callbacks = callFromDB.callbacks ? [...callFromDB.callbacks, callback] : [callback];

      Object.assign(call, callFromDB, { callbacks });

      return pendingCallbacksHeap.add(callId, call);
    })
    .then(() => {
      pubSubChannel.publish(CALLBACK_REQUESTED, call);
      return callsDBClient.updateById(callId, { callbacks: call.callbacks });
    })
    .then(() => call);
}

function acceptCallBack(callId) {
  const call = {};
  return pendingCallbacksHeap
    .remove(callId)
    .then((callFromHeap) => {
      const callbacks = [...callFromHeap.callbacks];
      callbacks[callbacks.length - 1].acceptedAt = moment.utc().format();
      Object.assign(call, callFromHeap, { callbacks });
      return activeCallsHeap.add(callId, call);
    })
    .then(() => twilio.ensureRoom(callId))
    .then(() => pubSubChannel.publish(CALLBACK_ACCEPTED, call))
    .then(() => callsDBClient.updateById(callId, { callbacks: call.callbacks }))
    .then(() => call);
}

function declineCallback(callId) {
  const call = {};
  return pendingCallbacksHeap
    .remove(callId)
    .then((callFromHeap) => {
      const callbacks = [...callFromHeap.callbacks];
      callbacks[callbacks.length - 1].declinedAt = moment.utc().format();
      Object.assign(call, callFromHeap, { callbacks });
    })
    .then(() => pubSubChannel.publish(CALLBACK_DECLINED, call))
    .then(() => callsDBClient.updateById(callId, { callbacks: call.callbacks }))
    .then(() => call);
}

function finishCall(callId, finishedBy) {
  return callsStorage.get(callId).then((call) => {
    if (!call) {
      return Promise.resolve();
    }

    let finishingPromise = null;
    const callStatus = callStatusHelper.getCallStatus(call);

    switch (callStatus) {
      case statuses.CALL_PENDING:
        finishingPromise = callFinisher.markCallAsMissed(callId);
        break;
      case statuses.CALL_ACTIVE:
        finishingPromise = callFinisher.markCallAsFinished(callId, finishedBy);
        break;
      case statuses.CALLBACK_PENDING:
        finishingPromise = callFinisher.markLastCallbackAsMissed(callId);
        break;
      case statuses.CALLBACK_ACTIVE:
        finishingPromise = callFinisher.markLastCallbackAsFinished(callId, finishedBy);
        break;
      default:
        finishingPromise = Promise.resolve();
        break;
    }

    return finishingPromise;
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
exports.requestCallback = requestCallback;
exports.acceptCallBack = acceptCallBack;
exports.declineCallback = declineCallback;
exports.getOldestCall = getOldestCall;
exports.getPendingCallsLength = getPendingCallsLength;

exports.subscribeToCallRequesting = pubSubChannel.subscribe.bind(null, CALL_REQUESTED);
exports.subscribeToCallAccepting = pubSubChannel.subscribe.bind(null, CALL_ACCEPTED);
exports.subscribeToCallbackRequesting = pubSubChannel.subscribe.bind(null, CALLBACK_REQUESTED);
exports.subscribeToCallbackAccepting = pubSubChannel.subscribe.bind(null, CALLBACK_ACCEPTED);
exports.subscribeToCallbackDeclining = pubSubChannel.subscribe.bind(null, CALLBACK_DECLINED);
exports.subscribeToCallsLengthChanging = subscribeToCallsLengthChanging;

exports.unsubscribeFromCallRequesting = pubSubChannel.unsubscribe.bind(null, CALL_REQUESTED);
exports.unsubscribeFromCallAccepting = pubSubChannel.unsubscribe.bind(null, CALL_ACCEPTED);
exports.unsubscribeFromCallbackRequesting = pubSubChannel.unsubscribe.bind(
  null,
  CALLBACK_REQUESTED,
);
exports.unsubscribeFromCallbackAccepting = pubSubChannel.unsubscribe.bind(null, CALLBACK_ACCEPTED);
exports.unsubscribeFromCallbackDeclining = pubSubChannel.unsubscribe.bind(null, CALLBACK_DECLINED);
exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
