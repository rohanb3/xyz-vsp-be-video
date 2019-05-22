// jest.mock('@/services/heap/connector');
jest.mock('@/services/pubSubChannel');

const pubSubChannel = require('@/services/pubSubChannel');
const { createHeap } = require('@/services/heap');
const constants = require('@/services/heap/constants');

const HEAP_NAME = 'test.heap';
const ITEM_ADDED = `${HEAP_NAME}:${constants.ITEM_ADDED}`;
const ITEM_TAKEN = `${HEAP_NAME}:${constants.ITEM_TAKEN}`;

let heap = null;

describe('Heap: ', () => {
  beforeEach(() => {
    heap = createHeap(HEAP_NAME);
  });

  describe('add(): ', () => {
    it('should add to heap and publish item adding', () => {
      const id = 'call42';
      const call = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
        acceptedBy: 'user42',
        acceptedAt: '2019-02-08T10:39:00Z',
      };

      heap.connector.add = jest.fn(() => Promise.resolve());
      pubSubChannel.publish = jest.fn();

      return heap.add(id, call).then(() => {
        expect(heap.connector.add).toHaveBeenCalledWith(id, call);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_ADDED, call);
      });
    });
  });

  describe('take(): ', () => {
    it('should remove from heap and publish item taking', () => {
      const id = 'call42';
      const call = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
        acceptedBy: 'user42',
        acceptedAt: '2019-02-08T10:39:00Z',
      };

      heap.connector.take = jest.fn(() => Promise.resolve(call));
      pubSubChannel.publish = jest.fn();

      return heap.take(id).then(() => {
        expect(heap.connector.take).toHaveBeenCalledWith(id);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_TAKEN, call);
      });
    });
  });

  describe('update(): ', () => {
    it('should update value', () => {
      const id = 'call42';
      const updates = {
        success: true,
      };
      heap.connector.update = jest.fn(() => Promise.resolve());

      return heap
        .update(id, updates)
        .then(() => expect(heap.connector.update).toHaveBeenCalledWith(id, updates));
    });
  });

  describe('subscribeToItemAdding(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      heap.subscribeToItemAdding(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_ADDED, listener);
    });
  });

  describe('subscribeToItemTaking(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      heap.subscribeToItemTaking(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_TAKEN, listener);
    });
  });

  describe('unsubscribeFromItemAdding(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      heap.unsubscribeFromItemAdding(listener);

      expect(pubSubChannel.unsubscribe).toHaveBeenCalledWith(ITEM_ADDED, listener);
    });
  });

  describe('unsubscribeFromItemTaking(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      heap.unsubscribeFromItemTaking(listener);

      expect(pubSubChannel.unsubscribe).toHaveBeenCalledWith(ITEM_TAKEN, listener);
    });
  });
});
