/* eslint-disable no-use-before-define */

const {
  ITEM_ADDED,
  ITEM_REMOVED,
} = require('./constants');
const { createConnector } = require('./connector');
const pubSub = require('@/services/pubSubChannel');
const { reduceToKey } = require('@/services/redisUtils');

class Heap {
  constructor(name) {
    this.name = name;
    this.connector = createConnector(name);
    this.events = {
      ITEM_ADDED: reduceToKey(name, ITEM_ADDED),
      ITEM_REMOVED: reduceToKey(name, ITEM_REMOVED),
    };
  }

  add(id, item) {
    return this.connector.add(id, item)
      .then(() => pubSub.publish(this.events.ITEM_ADDED, item));
  }

  remove(id) {
    return this.connector.remove(id)
      .then(item => pubSub.publish(this.events.ITEM_REMOVED, item));
  }

  isExist(id) {
    return this.connector.isExist(id);
  }

  getSize() {
    return this.connector.getSize();
  }

  subscribeToItemAdding(listener) {
    return pubSub.subscribe(this.events.ITEM_ADDED, listener);
  }

  subscribeToItemRemoving(listener) {
    return pubSub.subscribe(this.events.ITEM_REMOVED, listener);
  }

  unsubscribeFromItemAdding(listener) {
    return pubSub.unsubscribe(this.events.ITEM_ADDED, listener);
  }

  unsubscribeFromItemRemoving(listener) {
    return pubSub.unsubscribe(this.events.ITEM_REMOVED, listener);
  }
}

exports.createHeap = name => new Heap(name);
