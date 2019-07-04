const moment = require('moment');
const { pendingCallsQueue } = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const { pendingCallbacksHeap } = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const logger = require('@/services/logger')(module);

function markCallAsMissed(callId, finishedBy) {
  return pendingCallsQueue.remove(callId).then(() => {
    logger.debug('call.missed.removed.from.queue', callId);
    const updates = { missedAt: moment.utc().format(), finishedBy };
    return callsDBClient.updateById(callId, updates);
  });
}

function markCallAsFinished(callId, finishedBy) {
  const updates = {
    finishedBy,
    finishedAt: moment.utc().format(),
  };
  return activeCallsHeap.remove(callId).then(() => callsDBClient.updateById(callId, updates));
}

function markLastCallbackAsMissed(callId) {
  return pendingCallbacksHeap.remove(callId).then((call) => {
    const callbacks = [...call.callbacks];
    const lastCallback = callbacks[callbacks.length - 1];

    lastCallback.missedAt = moment.utc().format();

    const updates = { callbacks };
    return callsDBClient.updateById(callId, updates);
  });
}

function markLastCallbackAsFinished(callId, finishedBy) {
  return activeCallsHeap.remove(callId).then((call) => {
    const callbacks = [...call.callbacks];
    const lastCallback = callbacks[callbacks.length - 1];

    lastCallback.finishedAt = moment.utc().format();
    lastCallback.finishedBy = finishedBy;

    const updates = { callbacks };
    return callsDBClient.updateById(callId, updates);
  });
}

exports.markCallAsMissed = markCallAsMissed;
exports.markCallAsFinished = markCallAsFinished;
exports.markLastCallbackAsMissed = markLastCallbackAsMissed;
exports.markLastCallbackAsFinished = markLastCallbackAsFinished;
