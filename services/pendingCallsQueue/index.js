/* eslint-disable no-use-before-define */
const {
  CALL_ENQUEUED,
  CALL_DEQUEUED,
  CALL_REMOVED,
  QUEUE_SIZE_CHANGED,
  CALLS_PENDING,
} = require('./constants');
const client = require('./client');
const { createChannel } = require('../redisChannel');
const { reduceToKey } = require('../redisUtils');

const channelName = reduceToKey(CALLS_PENDING);
const { subscribe, unsubscribe, publish } = createChannel(channelName);

const isPending = id => client.checkExistence(id);

const size = () => client.getSize();

const peak = () => client.getOldest();

const enqueue = call => client.add(call._id, call)
  .then(() => {
    publishCallEnqueueing(call);
    publishQueueSizeChanging();
  });

const dequeue = () => client.take()
  .then((call) => {
    publishCallDequeueing(call);
    publishQueueSizeChanging();
    return call;
  });

const remove = callId => client.remove(callId)
  .then((removedCall) => {
    const isRemoved = Boolean(removedCall);
    if (isRemoved) {
      publishCallRemoving(removedCall);
      publishQueueSizeChanging();
    }
    return removedCall;
  });

const subscribeToCallEnqueueing = listener => subscribe(CALL_ENQUEUED, listener);
const subscribeToCallDequeueing = listener => subscribe(CALL_DEQUEUED, listener);
const subscribeToCallRemoving = listener => subscribe(CALL_REMOVED, listener);
const subscribeToQueueSizeChanging = listener => subscribe(QUEUE_SIZE_CHANGED, listener);

const unsubscribeFromCallEnqueueing = listener => unsubscribe(CALL_ENQUEUED, listener);
const unsubscribeFromCallDequeueing = listener => unsubscribe(CALL_DEQUEUED, listener);
const unsubscribeFromCallRemoving = listener => unsubscribe(CALL_REMOVED, listener);
const unsubscribeFromQueueSizeChanging = listener => unsubscribe(QUEUE_SIZE_CHANGED, listener);

const publishCallEnqueueing = call => publish(CALL_ENQUEUED, call);
const publishCallDequeueing = call => publish(CALL_DEQUEUED, call);
const publishCallRemoving = call => publish(CALL_REMOVED, call);
const publishQueueSizeChanging = () => Promise.all([peak(), size()])
  .then(([oldestCall, total]) => publish(QUEUE_SIZE_CHANGED, { oldestCall, total }));

exports.isPending = isPending;
exports.size = size;
exports.peak = peak;
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
