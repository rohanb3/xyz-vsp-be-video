/* eslint-disable no-use-before-define */

const {
  CALLS_ACTIVE,
  CALL_ADDED,
  CALL_REMOVED,
} = require('./constants');

const client = require('./client');
const { createChannel } = require('../redisChannel');

const { subscribe, unsubscribe, publish } = createChannel(CALLS_ACTIVE);

const isActive = id => client.checkExistence(id);

const size = () => client.getSize();

const add = call => client.add(call._id, call)
  .then(() => publishCallAdding(call));

const remove = id => client.remove(id)
  .then(publishCallRemoving);

const publishCallAdding = call => publish(CALL_ADDED, call);
const publishCallRemoving = call => publish(CALL_REMOVED, call);

const subscribeToCallAdding = listener => subscribe(CALL_ADDED, listener);
const subscribeToCallRemoving = listener => subscribe(CALL_REMOVED, listener);

const unsubscribeFromCallAdding = listener => unsubscribe(CALL_ADDED, listener);
const unsubscribeFromCallRemoving = listener => unsubscribe(CALL_REMOVED, listener);

exports.isActive = isActive;
exports.add = add;
exports.remove = remove;
exports.size = size;

exports.subscribeToCallAdding = subscribeToCallAdding;
exports.subscribeToCallRemoving = subscribeToCallRemoving;

exports.unsubscribeFromCallAdding = unsubscribeFromCallAdding;
exports.unsubscribeFromCallRemoving = unsubscribeFromCallRemoving;
