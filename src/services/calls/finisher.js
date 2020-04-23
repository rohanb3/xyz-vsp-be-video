const { CALL_MISSED, CALL_ANSWERED } = require('@/constants/calls');
const pendingCallsQueues = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const {
  pendingCallbacksHeap,
} = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const logger = require('@/services/logger')(module);
const time = require('@/services/time');

const { modelObjectToJSON } = require('@/models/utils');

async function markCallAsMissed(callId, finishedBy, tenantId) {
  logger.debug(
    'call.finished.start.of.method markCallAsMissed',
    callId,
    finishedBy,
    tenantId
  );
  await pendingCallsQueues.getPendingCallsQueue(tenantId).remove(callId);
  logger.debug(
    'call.missed.removed.from.queue markCallAsMissed',
    callId,
    finishedBy
  );

  const call = await callsDBClient.getById(callId);
  const { requestedAt } = call || {};
  const missedAt = time.formattedTimestamp();
  const updates = {
    finishedBy,
    waitingDuration: time.getDifferenceFromTo(requestedAt, missedAt),
    callStatus: CALL_MISSED,
    missedAt,
  };

  const res = await callsDBClient.updateById(callId, updates);
  logger.debug(
    'call.missed.updated.in.db markCallAsMissed',
    modelObjectToJSON(res)
  );

  return res;
}

async function markCallAsFinished(callId, finishedBy) {
  logger.debug(
    'call.finished.start.of.method markCallAsFinished',
    callId,
    finishedBy
  );
  await activeCallsHeap.remove(callId);
  logger.debug(
    'call.finished.removed.from.queue markCallAsFinished',
    callId,
    finishedBy
  );

  const call = await callsDBClient.getById(callId);
  const finishedAt = time.formattedTimestamp();
  logger.debug(
    'call.finished.got.from.db markCallAsFinished',
    modelObjectToJSON(call)
  );

  const { acceptedAt } = call || {};

  const updates = {
    finishedBy,
    finishedAt,
    callDuration: time.getDifferenceFromTo(acceptedAt, finishedAt),
    callStatus: CALL_ANSWERED,
  };

  const res = await callsDBClient.updateById(callId, updates);
  logger.debug(
    'call.finished.updated.in.db markCallAsFinished',
    modelObjectToJSON(res)
  );

  return res;
}

async function markLastCallbackAsMissed(callId) {
  logger.debug(
    'call.finished.start.of.method markLastCallbackAsMissed',
    callId
  );
  const call = await pendingCallbacksHeap.remove(callId);
  logger.debug(
    'callback.missed.removed.from.queue markLastCallbackAsMissed',
    callId
  );
  const callbacks = [...call.callbacks];
  const lastCallback = callbacks[callbacks.length - 1];

  lastCallback.missedAt = time.formattedTimestamp();

  const updates = { callbacks };
  const res = await callsDBClient.updateById(callId, updates);
  logger.debug(
    'callback.missed.updated.in.db markLastCallbackAsMissed',
    modelObjectToJSON(res)
  );

  return res;
}

async function markLastCallbackAsFinished(callId, finishedBy) {
  logger.debug(
    'call.finished.start.of.method markLastCallbackAsFinished',
    callId,
    finishedBy
  );
  const call = await activeCallsHeap.remove(callId);
  logger.debug(
    'callback.finished.removed.from.queue markLastCallbackAsFinished',
    callId
  );
  const callbacks = [...call.callbacks];
  const lastCallback = callbacks[callbacks.length - 1];

  lastCallback.finishedAt = time.formattedTimestamp();
  lastCallback.finishedBy = finishedBy;

  const updates = { callbacks };
  const res = await callsDBClient.updateById(callId, updates);
  logger.debug(
    'callback.finished.updated.in.db markLastCallbackAsFinished',
    modelObjectToJSON(res)
  );

  return res;
}

exports.markCallAsMissed = markCallAsMissed;
exports.markCallAsFinished = markCallAsFinished;
exports.markLastCallbackAsMissed = markLastCallbackAsMissed;
exports.markLastCallbackAsFinished = markLastCallbackAsFinished;
