/* eslint-disable no-underscore-dangle */
const Events = require('../Events');
const { convertArrayOfStringsToPrefixedHash } = require('../../utils/array');

const ITEM_ADDED = 'item.added';
const ITEM_TAKEN = 'item.taken';
const ITEM_REMOVED = 'item.removed';

const DEFAULT_EVENTS_NAMES = [ITEM_ADDED, ITEM_TAKEN, ITEM_REMOVED];

const generatePrefixedEventsNames = (
  prefix => convertArrayOfStringsToPrefixedHash(prefix, DEFAULT_EVENTS_NAMES)
);

const checkConstructorParamsConsistency = ({ name, client, serializer }) => {
  if (!name) {
    throw new Error({ message: 'Queue name is not specified!' });
  }
  if (!client) {
    throw new Error({ message: 'Queue client is not specified!' });
  }
  if (!serializer) {
    throw new Error({ message: 'Queue serializer is not specified!' });
  }
};

class Queue {
  constructor({ name, client, serializer }) {
    checkConstructorParamsConsistency(name, client, serializer);

    this.name = name;
    this.client = client;
    this.serializer = serializer;
    this.events = new Events();
    this.eventsNames = generatePrefixedEventsNames(this.name);
  }

  size() {
    return this.client.take(this.name);
  }

  add(item) {
    const serializedItem = this._serialize(item);
    return this.client.add(this.name, serializedItem)
      .then(() => this._emitItemAdding(item));
  }

  take() {
    return this.client.take(this.name)
      .then((serializedItem) => {
        const deserializedItem = this._deserialize(serializedItem);
        this._emitItemTaking(deserializedItem);
        return deserializedItem;
      });
  }

  remove(item) {
    const serializedItem = this._serialize(item);
    return this.client.remove(this.name, serializedItem)
      .then((res) => {
        const isRemoved = Boolean(res);
        if (isRemoved) {
          this._emitItemRemoving(item);
        }
        return isRemoved;
      });
  }

  subscribeToItemAdding(listener) {
    return this.events.subscribe(ITEM_ADDED, listener);
  }

  subscribeToItemTaking(listener) {
    return this.events.subscribe(ITEM_TAKEN, listener);
  }

  subscribeToItemRemoving(listener) {
    return this.events.subscribe(ITEM_REMOVED, listener);
  }

  unsubscribeFromItemAdding(listener) {
    return this.events.unsubscribe(ITEM_ADDED, listener);
  }

  unsubscribeFromItemTaking(listener) {
    return this.events.unsubscribe(ITEM_TAKEN, listener);
  }

  unsubscribeFromItemRemoving(listener) {
    return this.events.unsubscribe(ITEM_REMOVED, listener);
  }

  addEventsNames(names = []) {
    const namesToAdd = convertArrayOfStringsToPrefixedHash(this.name, names);
    this.eventsNames = Object.assign({}, this.eventsNames, namesToAdd);
  }

  // private methods

  _emitItemAdding(item) {
    return this.events.emit(ITEM_ADDED, item);
  }

  _emitItemTaking(item) {
    return this.events.emit(ITEM_TAKEN, item);
  }

  _emitItemRemoving(item) {
    return this.events.emit(ITEM_REMOVED, item);
  }

  _serialize(value) {
    return this.serializer.serialize(value);
  }

  _deserialize(string) {
    return this.serializer.deserialize(string);
  }
}

module.exports = Queue;
