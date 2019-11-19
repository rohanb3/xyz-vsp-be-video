const { createQueue, getErrors } = require('@/services/queue');
const { CALLS_PENDING } = require('@/constants/calls');
const { reduceToKey } = require('@/services/redisUtils');

const EventEmitter = require('events');

class QueuesChangesEmitter extends EventEmitter {}

const queuesChangesEmitter = new QueuesChangesEmitter();

const queuesChangesEventEmit = tenant => data =>
  queuesChangesEmitter.emit('queuesChanged', { data, tenant });

const errors = getErrors();

const pendingCallsQueue = {};

function getPendingCallsQueue(tenant) {
  let queueName = reduceToKey(CALLS_PENDING, tenant);

  if (!pendingCallsQueue[queueName]) {
    pendingCallsQueue[queueName] = createQueue(queueName);
    pendingCallsQueue[queueName].subscribeToQueueChanging(
      queuesChangesEventEmit(tenant)
    );
  }

  return pendingCallsQueue[queueName];
}

function queuesChangedListner(listener) {
  queuesChangesEmitter.on('queuesChanged', listener);
}

function unsubscribeFromQueueChanging(listener) {
  queuesChangesEmitter.removeListener('queuesChanged', listener);
}

exports.subscribeQueuesChanges = queuesChangedListner;
exports.getPendingCallsQueue = getPendingCallsQueue;
exports.unsubscribeFromQueueChanging = unsubscribeFromQueueChanging;

exports.errors = errors;
