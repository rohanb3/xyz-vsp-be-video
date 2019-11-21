const { createQueue, getErrors } = require('@/services/queue');
const { QueuesChangesEmitter } = require('@/services/queue/changesEmitter');
const { CALLS_PENDING } = require('@/constants/calls');
const { reduceToKey } = require('@/services/redisUtils');

const queuesChangesEmitter = new QueuesChangesEmitter();

const queuesChangesEventEmit = tenantId => data =>
  queuesChangesEmitter.emit('pendingCallsQueuesChanged', {
    data,
    tenantId,
  });

const errors = getErrors();

const pendingCallsQueues = {};

function getPendingCallsQueue(tenantId) {
  const queueName = reduceToKey(CALLS_PENDING, tenantId);

  if (!pendingCallsQueues[queueName]) {
    pendingCallsQueues[queueName] = createQueue(queueName);
    pendingCallsQueues[queueName].subscribeToQueueChanging(
      queuesChangesEventEmit(tenantId)
    );
  }

  return pendingCallsQueues[queueName];
}

function subscribeOnQueuesChanges(listener) {
  queuesChangesEmitter.on('pendingCallsQueuesChanged', listener);
}

function unsubscribeFromQueueChanging(listener) {
  queuesChangesEmitter.removeListener('pendingCallsQueuesChanged', listener);
}

exports.subscribeOnQueuesChanges = subscribeOnQueuesChanges;
exports.getPendingCallsQueue = getPendingCallsQueue;
exports.unsubscribeFromQueueChanging = unsubscribeFromQueueChanging;

exports.errors = errors;
