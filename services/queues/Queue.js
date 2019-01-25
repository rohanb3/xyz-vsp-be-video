const { convertToHashWithPrefixedValues } = require('../../utils/array');

const ITEM_ENQUEUED = 'item.enqueued';
const ITEM_DEQUEUED = 'item.dequeued';
const ITEM_REMOVED = 'item.removed';
const DEFAULT_EVENTS_NAMES = [ITEM_ENQUEUED, ITEM_DEQUEUED, ITEM_REMOVED];

const checkConstructorParamsConsistency = (name, client, serializer, channel) => {
  if (!name) {
    throw new Error({ message: 'Queue name is not specified!' });
  }
  if (!client) {
    throw new Error({ message: 'Queue client is not specified!' });
  }
  if (!serializer) {
    throw new Error({ message: 'Queue serializer is not specified!' });
  }
  if (!channel) {
    throw new Error({ message: 'Queue channel is not specified!' });
  }
};

class Queue {
  constructor({
    name,
    client,
    serializer,
    channel,
  }) {
    checkConstructorParamsConsistency(name, client, serializer, channel);

    this.name = name;
    this.client = client;
    this.serializer = serializer;
    this.channel = channel;
    this.events = convertToHashWithPrefixedValues(DEFAULT_EVENTS_NAMES, this.name);
  }

  size() {
    return this.client.size(this.name);
  }

  peak() {
    return this.client.getLatest(this.name);
  }

  enqueue(item) {
    const serializedItem = this._serialize(item);
    return this.client.add(this.name, serializedItem)
      .then(() => this._publishItemEnqueueing(item));
  }

  dequeue() {
    return this.client.take(this.name)
      .then((serializedItem) => {
        const deserializedItem = this._deserialize(serializedItem);
        this._publishItemDequeueing(deserializedItem);
        return deserializedItem;
      });
  }

  remove(item) {
    const serializedItem = this._serialize(item);
    return this.client.remove(this.name, serializedItem)
      .then((res) => {
        const isRemoved = Boolean(res);
        if (isRemoved) {
          this._publishItemRemoving(item);
        }
        return isRemoved;
      });
  }

  subscribeToItemEnqueueing(listener) {
    return this.channel.subscribe(this.events[ITEM_ENQUEUED], listener);
  }

  subscribeToItemDequeueing(listener) {
    return this.channel.subscribe(this.events[ITEM_DEQUEUED], listener);
  }

  subscribeToItemRemoving(listener) {
    return this.channel.subscribe(this.events[ITEM_REMOVED], listener);
  }

  unsubscribeFromItemAdding(listener) {
    return this.channel.unsubscribe(this.events[ITEM_ENQUEUED], listener);
  }

  unsubscribeFromItemTaking(listener) {
    return this.channel.unsubscribe(this.events[ITEM_DEQUEUED], listener);
  }

  unsubscribeFromItemRemoving(listener) {
    return this.channel.unsubscribe(this.events[ITEM_REMOVED], listener);
  }

  addEvents(names = []) {
    const namesToAdd = convertToHashWithPrefixedValues(names, this.name);
    this.events = Object.assign({}, this.events, namesToAdd);
  }

  // private methods

  _publishItemEnqueueing(item) {
    return this.channel.publish(this.events[ITEM_ENQUEUED], item);
  }

  _publishItemDequeueing(item) {
    return this.channel.publish(this.events[ITEM_DEQUEUED], item);
  }

  _publishItemRemoving(item) {
    return this.channel.publish(this.events[ITEM_REMOVED], item);
  }

  _serialize(value) {
    return this.serializer.serialize(value);
  }

  _deserialize(string) {
    return this.serializer.deserialize(string);
  }
}

module.exports = Queue;
