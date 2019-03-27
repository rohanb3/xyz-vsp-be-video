const {
  ITEM_ENQUEUED, ITEM_DEQUEUED, ITEM_REMOVED, QUEUE_CHANGED,
} = require('./constants');
const { createConnector } = require('./connector');
const errors = require('./errors');
const pubSub = require('@/services/pubSubChannel');
const { reduceToKey } = require('@/services/redisUtils');

class Queue {
  constructor(name) {
    this.name = name;
    this.connector = createConnector(name);
    this.events = {
      ITEM_ENQUEUED: reduceToKey(name, ITEM_ENQUEUED),
      ITEM_DEQUEUED: reduceToKey(name, ITEM_DEQUEUED),
      ITEM_REMOVED: reduceToKey(name, ITEM_REMOVED),
      QUEUE_CHANGED: reduceToKey(name, QUEUE_CHANGED),
    };
  }

  static get errors() {
    return errors;
  }

  enqueue(id, item) {
    return this.connector.enqueue(id, item).then(() => {
      this.publishItemEnqueueing(item);
      this.publishQueueChanging();
    });
  }

  dequeue() {
    return this.connector.dequeue().then((item) => {
      this.publishItemDequeueing(item);
      this.publishQueueChanging();
      return item;
    });
  }

  remove(id) {
    return this.connector.remove(id).then((removedItem) => {
      if (removedItem) {
        this.publishItemRemoving(removedItem);
        this.publishQueueChanging();
      }
      return removedItem;
    });
  }

  isExist(id) {
    return this.connector.isExist(id);
  }

  getPeak() {
    return this.connector.getPeak();
  }

  getSize() {
    return this.connector.getSize();
  }

  getQueueInfo() {
    return Promise.all([this.getPeak(), this.getSize()]).then(([peak, size]) => ({ peak, size }));
  }

  subscribeToItemEnqueueing(listener) {
    return pubSub.subscribe(this.events.ITEM_ENQUEUED, listener);
  }

  subscribeToItemDequeueing(listener) {
    return pubSub.subscribe(this.events.ITEM_DEQUEUED, listener);
  }

  subscribeToItemRemoving(listener) {
    return pubSub.subscribe(this.events.ITEM_REMOVED, listener);
  }

  subscribeToQueueChanging(listener) {
    return pubSub.subscribe(this.events.QUEUE_CHANGED, listener);
  }

  unsubscribeFromItemEnqueueing(listener) {
    return pubSub.unsubscribe(this.events.ITEM_ENQUEUED, listener);
  }

  unsubscribeFromItemDequeueing(listener) {
    return pubSub.unsubscribe(this.events.ITEM_DEQUEUED, listener);
  }

  unsubscribeFromItemRemoving(listener) {
    return pubSub.unsubscribe(this.events.ITEM_REMOVED, listener);
  }

  unsubscribeFromQueueChanging(listener) {
    return pubSub.unsubscribe(this.events.QUEUE_CHANGED, listener);
  }

  publishItemEnqueueing(item) {
    return pubSub.publish(this.events.ITEM_ENQUEUED, item);
  }

  publishItemDequeueing(item) {
    return pubSub.publish(this.events.ITEM_DEQUEUED, item);
  }

  publishItemRemoving(item) {
    return pubSub.publish(this.events.ITEM_REMOVED, item);
  }

  publishQueueChanging() {
    return this.getQueueInfo().then(info => pubSub.publish(this.events.QUEUE_CHANGED, info));
  }
}

exports.createQueue = name => new Queue(name);
exports.getErrors = () => ({ ...Queue.errors });
