/* eslint-disable no-use-before-define */
const {
  CALLS_PENDING,
  CALL_ENQUEUED,
  CALL_DEQUEUED,
  CALL_REMOVED,
  QUEUE_SIZE_CHANGED,
} = require('./constants');
const queue = require('./connector');
const { subscribe, unsubscribe, publish } = require('@/services/pubSubChannel');
const { reduceToKey } = require('@/services/redisUtils');

const CALL_ENQUEUED_EVENT = reduceToKey(CALLS_PENDING, CALL_ENQUEUED);
const CALL_DEQUEUED_EVENT = reduceToKey(CALLS_PENDING, CALL_DEQUEUED);
const CALL_REMOVED_EVENT = reduceToKey(CALLS_PENDING, CALL_REMOVED);
const QUEUE_SIZE_CHANGED_EVENT = reduceToKey(CALLS_PENDING, QUEUE_SIZE_CHANGED);

const enqueue = call => queue.enqueue(call._id.toString(), call)
  .then(() => {
    publishCallEnqueueing(call);
    publishQueueSizeChanging();
  });

const dequeue = () => queue.dequeue()
  .then((call) => {
    publishCallDequeueing(call);
    publishQueueSizeChanging();
    return call;
  });

const remove = callId => queue.remove(callId)
  .then((removedCall) => {
    const isRemoved = Boolean(removedCall);
    if (isRemoved) {
      publishCallRemoving(removedCall);
      publishQueueSizeChanging();
    }
    return removedCall;
  });

const subscribeToCallEnqueueing = listener => subscribe(CALL_ENQUEUED_EVENT, listener);
const subscribeToCallDequeueing = listener => subscribe(CALL_DEQUEUED_EVENT, listener);
const subscribeToCallRemoving = listener => subscribe(CALL_REMOVED_EVENT, listener);
const subscribeToQueueSizeChanging = listener => subscribe(QUEUE_SIZE_CHANGED_EVENT, listener);

const unsubscribeFromCallEnqueueing = listener => unsubscribe(CALL_ENQUEUED_EVENT, listener);
const unsubscribeFromCallDequeueing = listener => unsubscribe(CALL_DEQUEUED_EVENT, listener);
const unsubscribeFromCallRemoving = listener => unsubscribe(CALL_REMOVED_EVENT, listener);
const unsubscribeFromQueueSizeChanging = listener => (
  unsubscribe(QUEUE_SIZE_CHANGED_EVENT, listener)
);

const publishCallEnqueueing = call => publish(CALL_ENQUEUED_EVENT, call);
const publishCallDequeueing = call => publish(CALL_DEQUEUED_EVENT, call);
const publishCallRemoving = call => publish(CALL_REMOVED_EVENT, call);
const publishQueueSizeChanging = () => Promise.all([queue.getPeak(), queue.getSize()])
  .then(([oldestCall, total]) => publish(QUEUE_SIZE_CHANGED_EVENT, { oldestCall, total }));

exports.isExist = queue.isExist;
exports.getSize = queue.getSize;
exports.getPeak = queue.getPeak;
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.remove = remove;

exports.subscribeToCallEnqueueing = subscribeToCallEnqueueing;
exports.subscribeToCallDequeueing = subscribeToCallDequeueing;
exports.subscribeToCallRemoving = subscribeToCallRemoving;
exports.subscribeToQueueSizeChanging = subscribeToQueueSizeChanging;

exports.unsubscribeFromCallEnqueueing = unsubscribeFromCallEnqueueing;
exports.unsubscribeFromCallDequeueing = unsubscribeFromCallDequeueing;
exports.unsubscribeFromCallRemoving = unsubscribeFromCallRemoving;
exports.unsubscribeFromQueueSizeChanging = unsubscribeFromQueueSizeChanging;
