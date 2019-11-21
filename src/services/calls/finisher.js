const pendingCallsQueues = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const {
  pendingCallbacksHeap,
} = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const logger = require('@/services/logger')(module);
const { formattedTimestamp } = require('@/services/time');

function markCallAsMissed(callId, finishedBy, tenant) {
  return pendingCallsQueues
    .getPendingCallsQueue(tenant)
    .remove(callId)
    .then(() => {
      logger.debug('call.missed.removed.from.queue', callId);
      const updates = { missedAt: formattedTimestamp(), finishedBy };
      return callsDBClient.updateById(callId, updates);
    });
}

function markCallAsFinished(callId, finishedBy) {
  const updates = {
    finishedBy,
    finishedAt: formattedTimestamp(),
  };
  return activeCallsHeap
    .remove(callId)
    .then(() => callsDBClient.updateById(callId, updates));
}

function markLastCallbackAsMissed(callId) {
  return pendingCallbacksHeap.remove(callId).then(call => {
    const callbacks = [...call.callbacks];
    const lastCallback = callbacks[callbacks.length - 1];

    lastCallback.missedAt = formattedTimestamp();

    const updates = { callbacks };
    return callsDBClient.updateById(callId, updates);
  });
}

function markLastCallbackAsFinished(callId, finishedBy) {
  return activeCallsHeap.remove(callId).then(call => {
    const callbacks = [...call.callbacks];
    const lastCallback = callbacks[callbacks.length - 1];

    lastCallback.finishedAt = formattedTimestamp();
    lastCallback.finishedBy = finishedBy;

    const updates = { callbacks };
    return callsDBClient.updateById(callId, updates);
  });
}

exports.markCallAsMissed = markCallAsMissed;
exports.markCallAsFinished = markCallAsFinished;
exports.markLastCallbackAsMissed = markLastCallbackAsMissed;
exports.markLastCallbackAsFinished = markLastCallbackAsFinished;
