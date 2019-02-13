// jest.mock('@/services/heap/connector');
jest.mock('@/services/pubSubChannel');

const pubSubChannel = require('@/services/pubSubChannel');
const { createHeap } = require('@/services/heap');

const HEAP_NAME = 'test.heap';
const ITEM_ADDED = `${HEAP_NAME}:item.added`;
const ITEM_REMOVED = `${HEAP_NAME}:item.removed`;

let heap = null;

describe('Heap: ', () => {
  beforeEach(() => {
    heap = createHeap(HEAP_NAME);
  });

  describe('add(): ', () => {
    it('should add to heap and publish call adding', () => {
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

      return heap.add(id, call)
        .then(() => {
          expect(heap.connector.add).toHaveBeenCalledWith(id, call);
          expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_ADDED, call);
        });
    });
  });

  describe('remove(): ', () => {
    it('should remove from heap and publish call removing', () => {
      const id = 'call42';
      const call = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
        acceptedBy: 'user42',
        acceptedAt: '2019-02-08T10:39:00Z',
      };

      heap.connector.remove = jest.fn(() => Promise.resolve(call));
      pubSubChannel.publish = jest.fn();

      return heap.remove(id)
        .then(() => {
          expect(heap.connector.remove).toHaveBeenCalledWith(id);
          expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_REMOVED, call);
        });
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

  describe('subscribeToItemRemoving(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      heap.subscribeToItemRemoving(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_REMOVED, listener);
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

  describe('unsubscribeFromItemRemoving(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      heap.unsubscribeFromItemRemoving(listener);

      expect(pubSubChannel.unsubscribe).toHaveBeenCalledWith(ITEM_REMOVED, listener);
    });
  });
});
