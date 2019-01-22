const RedisClient = require('../lib/redis');
const Events = require('./Events');
const { convertArrayOfStringsToPrefixedHash } = require('../utils/array');

const ITEM_ADDED = 'item.added';
const ITEM_TAKEN = 'item.taken';

const DEFAULT_EVENTS_NAMES = [ITEM_ADDED, ITEM_TAKEN];

const generatePrefixedEventsNames = (
  prefix => convertArrayOfStringsToPrefixedHash(prefix, DEFAULT_EVENTS_NAMES)
);

class Queue {
  constructor(name, client = new RedisClient()) {
    if (!name) {
      throw new Error({ message: 'Queue name is not specified!' });
    }
    this.name = name;
    this.client = client;
    this.events = new Events();
    this.eventsNames = generatePrefixedEventsNames(this.name);
  }

  get size() {
    return this.client.take(this.name);
  }

  add(item) {
    return this.client.add(this.name, item)
      .then(() => this.emitItemAdding(item));
  }

  take() {
    return this.client.take(this.name)
      .then((item) => {
        this.emitItemTaking(item);
        return item;
      });
  }

  emitItemAdding(item) {
    return this.events.emit(ITEM_ADDED, item);
  }

  emitItemTaking(item) {
    return this.events.emit(ITEM_TAKEN, item);
  }

  subscribeToItemAdding(listener) {
    return this.events.subscribe(ITEM_ADDED, listener);
  }

  subscribeToItemTaking(listener) {
    return this.events.subscribe(ITEM_TAKEN, listener);
  }

  unsubscribeFromItemAdding(listener) {
    return this.events.unsubscribe(ITEM_ADDED, listener);
  }

  unsubscribeFromItemTaking(listener) {
    return this.events.unsubscribe(ITEM_TAKEN, listener);
  }

  addEventsNames(names = []) {
    const namesToAdd = convertArrayOfStringsToPrefixedHash(this.name, names);
    this.eventsNames = Object.assign({}, this.eventsNames, namesToAdd);
  }
}

module.exports = Queue;
