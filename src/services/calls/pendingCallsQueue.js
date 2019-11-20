const { createQueue, getErrors } = require('@/services/queue');
const { QueuesChangesEmitter } = require('@/services/queue/changesEmitter');
const { CALLS_PENDING } = require('@/constants/calls');
const { reduceToKey } = require('@/services/redisUtils');

const queuesChangesEmitter = new QueuesChangesEmitter();

const queuesChangesEventEmit = tenant => data =>
  queuesChangesEmitter.emit('pendingCallsQueuesChanged', {
    data,
    tenant,
  });

const errors = getErrors();

const pendingCallsQueues = {};

function getPendingCallsQueue(tenant) {
  const queueName = reduceToKey(CALLS_PENDING, tenant);

  if (!pendingCallsQueues[queueName]) {
    pendingCallsQueues[queueName] = createQueue(queueName);
    pendingCallsQueues[queueName].subscribeToQueueChanging(
      queuesChangesEventEmit(tenant)
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
