/* eslint-disable no-use-before-define */
const pendingCallsQueues = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const {
  pendingCallbacksHeap,
} = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const twilio = require('@/services/twilio');
const pubSubChannel = require('@/services/pubSubChannel');
const storage = require('@/services/storage');
const callStatusHelper = require('@/services/calls/statusHelper');
const callFinisher = require('@/services/calls/finisher');
const {
  CallNotFoundError,
  PeerOfflineError,
  CallbackDisabledError,
} = require('@/services/calls/errors');
const { connectionsHeap } = require('@/services/connectionsHeap');
const {
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALL_FINISHED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  statuses,
  callTypes,
} = require('@/constants/calls');
const callsErrorHandler = require('@/services/calls/errorHandler');
const { formattedTimestamp } = require('@/services/time');

function requestCall({
  requestedBy,
  deviceId,
  salesRepId,
  callbackEnabled,
  tenantId,
}) {
  const call = {
    requestedBy,
    requestedAt: formattedTimestamp(),
    deviceId,
    salesRepId,
    callbackEnabled,
    tenantId,
    callType: callTypes.VIDEO,
  };

  return callsDBClient
    .create({ ...call })
    .then(({ id }) => {
      call.id = id;
      return pendingCallsQueues
        .getPendingCallsQueue(tenantId)
        .enqueue(id, call);
    })
    .then(() => pubSubChannel.publish(CALL_REQUESTED, call))
    .then(() => call)
    .catch(err => callsErrorHandler.onRequestCallFailed(err, call.id));
}

function takeCall(tenantId) {
  return pendingCallsQueues.getPendingCallsQueue(tenantId).dequeue();
}
//TODO
function acceptCall(operator) {
  const updates = {
    acceptedBy: operator.identity,
    acceptedAt: formattedTimestamp(),
  };
  const call = {
    ...updates,
  };
  return takeCall(operator.tenantId)
    .then(callFromQueue => {
      Object.assign(call, callFromQueue);
      return activeCallsHeap.add(call.id, call);
    })
    .then(() => checkIsCallStillActive(call.id))
    .then(() => twilio.ensureRoom(call.id))
    .then(() => checkIsCallStillActive(call.id))
    .then(() => callsDBClient.updateById(call.id, updates))
    .then(() => checkIsCallStillActive(call.id))
    .then(() => pubSubChannel.publish(CALL_ACCEPTED, call))
    .then(() => addActiveCallIdToConnections(call))
    .catch(err => callsErrorHandler.onAcceptCallFailed(err, call.id));
}

function requestCallback(callId) {
  const call = {};
  return callsDBClient
    .getById(callId)
    .then(callFromDB => checkPeerConnection(callFromDB, call))
    .then(checkCallbackAvailability)
    .then(callFromDB => {
      const callback = {
        requestedAt: formattedTimestamp(),
      };

      const callbacks = callFromDB.callbacks
        ? [...callFromDB.callbacks, callback]
        : [callback];

      Object.assign(call, callFromDB, { id: callId, callbacks });

      return pendingCallbacksHeap.add(callId, call);
    })
    .then(() => {
      pubSubChannel.publish(CALLBACK_REQUESTED, call);
      return callsDBClient.updateById(callId, { callbacks: call.callbacks });
    })
    .then(() => call)
    .catch(err => callsErrorHandler.onRequestCallbackFailed(err, callId));
}

function acceptCallback(callId) {
  const call = {};
  return pendingCallbacksHeap
    .take(callId)
    .then(callFromHeap => {
      const callbacks = [...callFromHeap.callbacks];
      callbacks[callbacks.length - 1].acceptedAt = formattedTimestamp();
      Object.assign(call, callFromHeap, { callbacks });
      return activeCallsHeap.add(callId, call);
    })
    .then(() => twilio.ensureRoom(callId))
    .then(() => pubSubChannel.publish(CALLBACK_ACCEPTED, call))
    .then(() => callsDBClient.updateById(callId, { callbacks: call.callbacks }))
    .then(() => addActiveCallIdToConnections(call))
    .catch(err => callsErrorHandler.onAcceptCallbackFailed(err, callId));
}

function declineCallback(callId, reason = '') {
  const call = {};
  return pendingCallbacksHeap
    .take(callId)
    .then(callFromHeap => {
      const callbacks = [...callFromHeap.callbacks];
      callbacks[callbacks.length - 1].declinedAt = formattedTimestamp();
      Object.assign(call, callFromHeap, { callbacks });
    })
    .then(() => pubSubChannel.publish(CALLBACK_DECLINED, { ...call, reason }))
    .then(() => callsDBClient.updateById(callId, { callbacks: call.callbacks }))
    .then(() => call)
    .catch(err => callsErrorHandler.onDeclineCallbackFailed(err, callId));
}

function finishCall(callId, finishedBy) {
  return storage
    .get(callId)
    .then(call => {
      let finishingPromise = null;
      const callStatus = callStatusHelper.getCallStatus(call);
      const tenantId = call.tenantId;

      switch (callStatus) {
        case statuses.CALL_PENDING:
          finishingPromise = callFinisher.markCallAsMissed(
            callId,
            finishedBy,
            tenantId
          );
          break;
        case statuses.CALL_ACTIVE:
          finishingPromise = callFinisher.markCallAsFinished(
            callId,
            finishedBy
          );
          break;
        case statuses.CALLBACK_PENDING:
          finishingPromise = callFinisher.markLastCallbackAsMissed(
            callId,
            finishedBy
          );
          break;
        case statuses.CALLBACK_ACTIVE:
          finishingPromise = callFinisher.markLastCallbackAsFinished(
            callId,
            finishedBy
          );
          break;
        default:
          finishingPromise = Promise.resolve();
          break;
      }

      return finishingPromise;
    })
    .then(call => {
      pubSubChannel.publish(CALL_FINISHED, call);
      return call;
    })
    .then(removeActiveCallIdFromConnections)
    .catch(err => callsErrorHandler.onFinishCallFailed(err, callId));
}

function getOldestCall(tenantId) {
  return pendingCallsQueues.getPendingCallsQueue(tenantId).getPeak();
}

function getPendingCallsLength(tenantId) {
  return pendingCallsQueues.getPendingCallsQueue(tenantId).getSize();
}

function getCallsInfo(tenantId) {
  return pendingCallsQueues.getPendingCallsQueue(tenantId).getQueueInfo();
}

function subscribeToCallsLengthChanging(listener) {
  return pendingCallsQueues.subscribeOnQueuesChanges(listener);
}

function unsubscribeFromCallsLengthChanging(listener) {
  return pendingCallsQueues.unsubscribeFromQueueChanging(listener);
}

function checkPeerConnection(callFromDB, call) {
  return connectionsHeap.isExist(callFromDB.deviceId).then(isExist => {
    if (isExist) {
      return callFromDB;
    }
    Object.assign(call, callFromDB);
    throw new PeerOfflineError(call.deviceId);
  });
}

function checkCallbackAvailability(call) {
  return call.callbackEnabled
    ? Promise.resolve(call)
    : Promise.reject(new CallbackDisabledError(call.id));
}

function checkIsCallStillActive(callId) {
  return activeCallsHeap
    .isExist(callId)
    .then(isExist =>
      isExist
        ? Promise.resolve()
        : Promise.reject(new CallNotFoundError(callId))
    );
}

function addActiveCallIdToConnections(call) {
  const { id, acceptedBy } = call;
  return connectionsHeap
    .update(acceptedBy, { activeCallId: id })
    .then(() => call);
}

function removeActiveCallIdFromConnections(call) {
  const { acceptedBy } = call;
  return connectionsHeap
    .update(acceptedBy, { activeCallId: null })
    .then(() => call);
}

exports.requestCall = requestCall;
exports.acceptCall = acceptCall;
exports.finishCall = finishCall;
exports.requestCallback = requestCallback;
exports.acceptCallback = acceptCallback;
exports.declineCallback = declineCallback;
exports.getOldestCall = getOldestCall;
exports.getPendingCallsLength = getPendingCallsLength;
exports.getCallsInfo = getCallsInfo;

exports.subscribeToCallRequesting = pubSubChannel.subscribe.bind(
  null,
  CALL_REQUESTED
);
exports.subscribeToCallAccepting = pubSubChannel.subscribe.bind(
  null,
  CALL_ACCEPTED
);
exports.subscribeToCallFinishing = pubSubChannel.subscribe.bind(
  null,
  CALL_FINISHED
);
exports.subscribeToCallbackRequesting = pubSubChannel.subscribe.bind(
  null,
  CALLBACK_REQUESTED
);
exports.subscribeToCallbackAccepting = pubSubChannel.subscribe.bind(
  null,
  CALLBACK_ACCEPTED
);
exports.subscribeToCallbackDeclining = pubSubChannel.subscribe.bind(
  null,
  CALLBACK_DECLINED
);
exports.subscribeToCallsLengthChanging = subscribeToCallsLengthChanging;

exports.unsubscribeFromCallRequesting = pubSubChannel.unsubscribe.bind(
  null,
  CALL_REQUESTED
);
exports.unsubscribeFromCallAccepting = pubSubChannel.unsubscribe.bind(
  null,
  CALL_ACCEPTED
);
exports.unsubscribeFromCallFinishing = pubSubChannel.unsubscribe.bind(
  null,
  CALL_FINISHED
);
exports.unsubscribeFromCallbackRequesting = pubSubChannel.unsubscribe.bind(
  null,
  CALLBACK_REQUESTED
);
exports.unsubscribeFromCallbackAccepting = pubSubChannel.unsubscribe.bind(
  null,
  CALLBACK_ACCEPTED
);
exports.unsubscribeFromCallbackDeclining = pubSubChannel.unsubscribe.bind(
  null,
  CALLBACK_DECLINED
);
exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
