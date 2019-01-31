/* eslint-disable no-use-before-define */
const {
  CALL_ENQUEUED,
  CALL_DEQUEUED,
  CALL_EXTRACTED,
  CALL_ACCEPTED,
  QUEUE_SIZE_CHANGED,
} = require('./constants');
const client = require('./client');
const { subscribe, unsubscribe, publish } = require('./channel');
const { serialize, deserialize } = require('../serializer');

const size = () => client.getSize();

const peak = () => client.getLatest();

const enqueue = (call) => {
  const serializedCall = serialize(call);
  return client.add(serializedCall)
    .then(() => {
      publishCallEnqueueing(call);
      publishQueueSizeChanging();
    });
};

const dequeue = () => client.take()
  .then((serializedCall) => {
    const deserializedCall = deserialize(serializedCall);
    publishCallDequeueing(deserializedCall);
    publishQueueSizeChanging();
    return deserializedCall;
  });

const extract = (call) => {
  const serializedCall = serialize(call);
  return client.remove(serializedCall)
    .then((res) => {
      const isRemoved = Boolean(res);
      if (isRemoved) {
        publishCallRemoving(call);
        publishQueueSizeChanging();
      }
      return isRemoved;
    });
};

const accept = call => Promise.resolve().then(() => publishCallAccepting(call));

const subscribeToCallEnqueueing = listener => subscribe(CALL_ENQUEUED, listener);
const subscribeToCallDequeueing = listener => subscribe(CALL_DEQUEUED, listener);
const subscribeToCallExtracting = listener => subscribe(CALL_EXTRACTED, listener);
const subscribeToCallAccepting = listener => subscribe(CALL_ACCEPTED, listener);
const subscribeToQueueSizeChanging = listener => subscribe(QUEUE_SIZE_CHANGED, listener);

const unsubscribeFromCallEnqueueing = listener => unsubscribe(CALL_ENQUEUED, listener);
const unsubscribeFromCallDequeueing = listener => unsubscribe(CALL_DEQUEUED, listener);
const unsubscribeFromCallExtracting = listener => unsubscribe(CALL_EXTRACTED, listener);
const unsubscribeFromCallAccepting = listener => unsubscribe(CALL_ACCEPTED, listener);
const unsubscribeFromQueueSizeChanging = listener => unsubscribe(QUEUE_SIZE_CHANGED, listener);

const publishCallEnqueueing = call => publish(CALL_ENQUEUED, call);
const publishCallDequeueing = call => publish(CALL_DEQUEUED, call);
const publishCallRemoving = call => publish(CALL_EXTRACTED, call);
const publishCallAccepting = call => publish(CALL_ACCEPTED, call);
const publishQueueSizeChanging = () => Promise.all([peak(), size()])
  .then(([oldestCall, total]) => publish(QUEUE_SIZE_CHANGED, { oldestCall, total }));

exports.size = size;
exports.peak = peak;
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.extract = extract;
exports.accept = accept;

exports.subscribeToCallEnqueueing = subscribeToCallEnqueueing;
exports.subscribeToCallDequeueing = subscribeToCallDequeueing;
exports.subscribeToCallExtracting = subscribeToCallExtracting;
exports.subscribeToCallAccepting = subscribeToCallAccepting;
exports.subscribeToQueueSizeChanging = subscribeToQueueSizeChanging;

exports.unsubscribeFromCallEnqueueing = unsubscribeFromCallEnqueueing;
exports.unsubscribeFromCallDequeueing = unsubscribeFromCallDequeueing;
exports.unsubscribeFromCallExtracting = unsubscribeFromCallExtracting;
exports.unsubscribeFromCallAccepting = unsubscribeFromCallAccepting;
exports.unsubscribeFromQueueSizeChanging = unsubscribeFromQueueSizeChanging;
