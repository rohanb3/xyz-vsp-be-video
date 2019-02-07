/* eslint-disable no-use-before-define */

const {
  CALLS_ACTIVE,
  CALL_ADDED,
  CALL_REMOVED,
} = require('./constants');
const heap = require('./connector');
const { subscribe, unsubscribe, publish } = require('@/services/pubSubChannel');
const { reduceToKey } = require('@/services/redisUtils');

const CALL_ADDED_EVENT = reduceToKey(CALLS_ACTIVE, CALL_ADDED);
const CALL_REMOVED_EVENT = reduceToKey(CALLS_ACTIVE, CALL_REMOVED);

const add = call => heap.add(call._id, call)
  .then(() => publishCallAdding(call));

const remove = id => heap.remove(id)
  .then(publishCallRemoving);

const publishCallAdding = call => publish(CALL_ADDED_EVENT, call);
const publishCallRemoving = call => publish(CALL_REMOVED_EVENT, call);

const subscribeToCallAdding = listener => subscribe(CALL_ADDED_EVENT, listener);
const subscribeToCallRemoving = listener => subscribe(CALL_REMOVED_EVENT, listener);

const unsubscribeFromCallAdding = listener => unsubscribe(CALL_ADDED_EVENT, listener);
const unsubscribeFromCallRemoving = listener => unsubscribe(CALL_REMOVED_EVENT, listener);

exports.isExist = heap.isExist;
exports.add = add;
exports.remove = remove;
exports.getSize = heap.getSize;

exports.subscribeToCallAdding = subscribeToCallAdding;
exports.subscribeToCallRemoving = subscribeToCallRemoving;

exports.unsubscribeFromCallAdding = unsubscribeFromCallAdding;
exports.unsubscribeFromCallRemoving = unsubscribeFromCallRemoving;
