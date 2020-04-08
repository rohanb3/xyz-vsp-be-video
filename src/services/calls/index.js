/* eslint-disable no-use-before-define */
const logger = require('@/services/logger')(module);
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
  CALL_ANSWERED,
  statuses,
  callTypes,
} = require('@/constants/calls');
const callsErrorHandler = require('@/services/calls/errorHandler');
const time = require('@/services/time');

function requestCall({
  requestedBy,
  deviceId,
  salesRepId,
  callbackEnabled,
  tenantId,
}) {
  const call = {
    requestedBy,
    requestedAt: time.formattedTimestamp(),
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
async function acceptCall(operator) {
  const updates = {
    acceptedBy: operator.identity,
    acceptedAt: time.formattedTimestamp(),
  };
  const call = {
    ...updates,
  };

  const callFromQueue = await takeCall(operator.tenantId);
  logger.debug('call.accept.call.from.pending.queue.taken', callFromQueue);
  const callFromDB = await callsDBClient.getById(callFromQueue.id);
  logger.debug('call.accept.call.from.db.taken', callFromDB);
  const { requestedAt } = callFromDB || {};
  const updateMixin = {
    callStatus: CALL_ANSWERED,
    waitingDuration: time.getDifferenceFromTo(requestedAt, updates.acceptedAt),
  };

  Object.assign(call, callFromQueue, updateMixin);
  Object.assign(updates, updateMixin);

  try {
    await activeCallsHeap.add(call.id, call);
    logger.debug('call.accept.added.to.active.calls.heap', call.id, call);
    await checkIsCallStillActive(call.id);
    logger.debug('call.accept.added.to.active.calls.heap -> checkIsCallStillActive', call.id, call);
    await twilio.ensureRoom(call.id);
    logger.debug('call.accept.added.to.active.calls.heap -> checkIsCallStillActive -> twilio.ensureRoom', call.id, call);
    await checkIsCallStillActive(call.id);
    logger.debug('call.accept.added.to.active.calls.heap -> checkIsCallStillActive -> twilio.ensureRoom -> checkIsCallStillActive', call.id, call);
    await callsDBClient.updateById(call.id, updates);
    logger.debug('call.accept.updated.in.db', call.id, updates);
    await checkIsCallStillActive(call.id);
    await pubSubChannel.publish(CALL_ACCEPTED, call);
    logger.debug('call.accept.publish.event.in.redis', CALL_ACCEPTED, call);
    const res = await addActiveCallIdToConnections(call);
    logger.debug('call.accept.added.id.to.connections', call);
    return res;
  } catch (err) {
    logger.debug('call.accept.failed', err);
    return callsErrorHandler.onAcceptCallFailed(err, call.id);
  }
}

function requestCallback(callId) {
  const call = {};
  return callsDBClient
    .getById(callId)
    .then(callFromDB => checkPeerConnection(callFromDB, call))
    .then(checkCallbackAvailability)
    .then(callFromDB => {
      const callback = {
        requestedAt: time.formattedTimestamp(),
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
      callbacks[callbacks.length - 1].acceptedAt = time.formattedTimestamp();
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
      callbacks[callbacks.length - 1].declinedAt = time.formattedTimestamp();
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

function getPendingCalls(tenantId) {
  return pendingCallsQueues.getPendingCallsQueue(tenantId).getItems();
}

function subscribeToCallsLengthChanging(listener) {
  return pendingCallsQueues.subscribeOnQueuesChanges(listener);
}

function subscribeToActiveCallsHeapAdding(listener) {
  return activeCallsHeap.subscribeToItemAdding(listener);
}

function subscribeToActiveCallsHeapTaking(listener) {
  return activeCallsHeap.subscribeToItemTaking(listener);
}

function unsubscribeFromActiveCallsHeapAdding(listener) {
  return activeCallsHeap.unsubscribeFromItemAdding(listener);
}

function unsubscribeFromActiveCallsHeapTaking(listener) {
  return activeCallsHeap.unsubscribeFromItemTaking(listener);
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
    .catch(err => {
      logger.error(
        'Connection not found during addActiveCallIdToConnections()',
        acceptedBy,
        err
      );
    })
    .then(() => call);
}

function removeActiveCallIdFromConnections(call) {
  const { acceptedBy } = call;
  return connectionsHeap
    .update(acceptedBy, { activeCallId: null })
    .catch(err => {
      logger.error(
        'Connection not found during removeActiveCallIdFromConnections()',
        acceptedBy,
        err
      );
    })
    .then(() => call);
}

async function getActiveCallsByTenantId(tenantId) {
  const calls = await activeCallsHeap.getAll();
  const tenantCalls = calls.filter((call = {}) => call.tenantId === tenantId);
  return tenantCalls;
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
exports.getPendingCalls = getPendingCalls;
exports.getActiveCallsByTenantId = getActiveCallsByTenantId;

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

exports.subscribeToActiveCallsHeapAdding = subscribeToActiveCallsHeapAdding;
exports.subscribeToActiveCallsHeapTaking = subscribeToActiveCallsHeapTaking;
exports.unsubscribeFromActiveCallsHeapAdding = unsubscribeFromActiveCallsHeapAdding;
exports.unsubscribeFromActiveCallsHeapTaking = unsubscribeFromActiveCallsHeapTaking;

exports.unsubscribeFromCallsLengthChanging = unsubscribeFromCallsLengthChanging;
