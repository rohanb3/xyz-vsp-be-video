const { CALL_MISSED, CALL_ANSWERED } = require('@/constants/calls');
const pendingCallsQueues = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const {
  pendingCallbacksHeap,
} = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const logger = require('@/services/logger')(module);
const { formattedTimestamp, getDifferenceFromTo } = require('@/services/time');

async function markCallAsMissed(callId, finishedBy, tenantId) {
  await pendingCallsQueues.getPendingCallsQueue(tenantId).remove(callId);
  logger.debug('call.missed.removed.from.queue', callId);

  const call = await callsDBClient.getById(callId);
  const { requestedAt } = call || {};
  const missedAt = formattedTimestamp();
  const updates = {
    finishedBy,
    waitingDuration: getDifferenceFromTo(requestedAt, missedAt),
    callStatus: CALL_MISSED,
    missedAt,
  };

  return await callsDBClient.updateById(callId, updates);
}

async function markCallAsFinished(callId, finishedBy) {
  await activeCallsHeap.remove(callId);

  const call = await callsDBClient.getById(callId);
  const { finishedAt, acceptedAt } = call || {};

  const updates = {
    finishedBy,
    finishedAt: formattedTimestamp(),
    callDuration: getDifferenceFromTo(finishedAt, acceptedAt),
    callStatus: CALL_ANSWERED,
  };

  return await callsDBClient.updateById(callId, updates);
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
