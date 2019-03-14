/* eslint-disable no-use-before-define */

const {
  ITEM_ADDED,
  ITEM_TAKEN,
} = require('./constants');
const { createConnector } = require('./connector');
const errors = require('./errors');
const pubSub = require('@/services/pubSubChannel');
const { reduceToKey } = require('@/services/redisUtils');

class Heap {
  constructor(name) {
    this.name = name;
    this.connector = createConnector(name);
    this.events = {
      ITEM_ADDED: reduceToKey(name, ITEM_ADDED),
      ITEM_TAKEN: reduceToKey(name, ITEM_TAKEN),
    };
  }

  static get errors() {
    return errors;
  }

  add(id, item) {
    return this.connector.add(id, item)
      .then(() => pubSub.publish(this.events.ITEM_ADDED, item));
  }

  take(id) {
    return this.connector.take(id)
      .then(item => pubSub.publish(this.events.ITEM_TAKEN, item));
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

  subscribeToItemTaking(listener) {
    return pubSub.subscribe(this.events.ITEM_TAKEN, listener);
  }

  unsubscribeFromItemAdding(listener) {
    return pubSub.unsubscribe(this.events.ITEM_ADDED, listener);
  }

  unsubscribeFromItemTaking(listener) {
    return pubSub.unsubscribe(this.events.ITEM_TAKEN, listener);
  }
}

exports.createHeap = name => new Heap(name);
exports.getErrors = () => ({ ...Heap.errors });