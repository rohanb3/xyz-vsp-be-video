jest.mock('@/services/pubSubChannel');

const pubSubChannel = require('@/services/pubSubChannel');
const { createQueue } = require('@/services/queue');
const constants = require('@/services/queue/constants');

const QUEUE_NAME = 'test.queue';
const ITEM_ENQUEUED = `${QUEUE_NAME}:${constants.ITEM_ENQUEUED}`;
const ITEM_DEQUEUED = `${QUEUE_NAME}:${constants.ITEM_DEQUEUED}`;
const ITEM_REMOVED = `${QUEUE_NAME}:${constants.ITEM_REMOVED}`;
const QUEUE_CHANGED = `${QUEUE_NAME}:${constants.QUEUE_CHANGED}`;

let queue = null;

describe('Queue: ', () => {
  beforeEach(() => {
    queue = createQueue(QUEUE_NAME);
  });

  describe('enqueue(): ', () => {
    it('should add item to queue and publish correct events', () => {
      const id = 'item42';
      const item = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.connector.enqueue = jest.fn(() => Promise.resolve());
      queue.publishItemEnqueueing = jest.fn(() => Promise.resolve());
      queue.publishQueueChanging = jest.fn(() => Promise.resolve());

      return queue.enqueue(id, item)
        .then(() => {
          expect(queue.connector.enqueue).toHaveBeenCalledWith(id, item);
          expect(queue.publishItemEnqueueing).toHaveBeenCalledWith(item);
          expect(queue.publishQueueChanging).toHaveBeenCalled();
        });
    });
  });

  describe('dequeue(): ', () => {
    it('should dequeue from queue and publish correct events', () => {
      const item = {
        _id: 'item42',
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.connector.dequeue = jest.fn(() => Promise.resolve(item));
      queue.publishItemDequeueing = jest.fn(() => Promise.resolve());
      queue.publishQueueChanging = jest.fn(() => Promise.resolve());

      return queue.dequeue()
        .then((res) => {
          expect(res).toEqual(item);
          expect(queue.connector.dequeue).toHaveBeenCalledWith();
          expect(queue.publishItemDequeueing).toHaveBeenCalledWith(item);
          expect(queue.publishQueueChanging).toHaveBeenCalled();
        });
    });
  });

  describe('remove(): ', () => {
    it('should remove from queue and publish item removing if item was removed', () => {
      const id = 'item42';
      const item = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.connector.remove = jest.fn(() => Promise.resolve(item));
      queue.publishItemRemoving = jest.fn(() => Promise.resolve());
      queue.publishQueueChanging = jest.fn(() => Promise.resolve());

      return queue.remove(id)
        .then(() => {
          expect(queue.connector.remove).toHaveBeenCalledWith(id);
          expect(queue.publishItemRemoving).toHaveBeenCalledWith(item);
          expect(queue.publishQueueChanging).toHaveBeenCalled();
        });
    });

    it('should remove from queue and not publish item removing if item was not removed', () => {
      const id = 'item42';

      queue.connector.remove = jest.fn(() => Promise.resolve(null));
      queue.publishItemRemoving = jest.fn(() => Promise.resolve());
      queue.publishQueueChanging = jest.fn(() => Promise.resolve());

      return queue.remove(id)
        .then(() => {
          expect(queue.connector.remove).toHaveBeenCalledWith(id);
          expect(queue.publishItemRemoving).not.toHaveBeenCalled();
          expect(queue.publishQueueChanging).not.toHaveBeenCalled();
        });
    });
  });

  describe('subscribeToItemEnqueueing(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();
      queue.subscribeToItemEnqueueing(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_ENQUEUED, listener);
    });
  });

  describe('subscribeToItemDequeueing(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      queue.subscribeToItemDequeueing(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_DEQUEUED, listener);
    });
  });

  describe('subscribeToItemRemoving(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      queue.subscribeToItemRemoving(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith(ITEM_REMOVED, listener);
    });
  });

  describe('subscribeToQueueChanging(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      queue.subscribeToQueueChanging(listener);

      expect(pubSubChannel.subscribe)
        .toHaveBeenCalledWith(QUEUE_CHANGED, listener);
    });
  });

  describe('unsubscribeFromItemEnqueueing(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();
      queue.unsubscribeFromItemEnqueueing(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith(ITEM_ENQUEUED, listener);
    });
  });

  describe('unsubscribeFromItemDequeueing(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      queue.unsubscribeFromItemDequeueing(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith(ITEM_DEQUEUED, listener);
    });
  });

  describe('unsubscribeFromItemRemoving(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      queue.unsubscribeFromItemRemoving(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith(ITEM_REMOVED, listener);
    });
  });

  describe('unsubscribeFromQueueChanging(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      queue.unsubscribeFromQueueChanging(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith(QUEUE_CHANGED, listener);
    });
  });

  describe('publishItemEnqueueing(): ', () => {
    it('should publish to channel', () => {
      const item = { _id: '42' };

      pubSubChannel.publish = jest.fn();
      queue.publishItemEnqueueing(item);

      expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_ENQUEUED, item);
    });
  });

  describe('publishItemDequeueing(): ', () => {
    it('should subscribe to channel', () => {
      const item = { _id: '42' };

      pubSubChannel.publish = jest.fn();

      queue.publishItemDequeueing(item);

      expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_DEQUEUED, item);
    });
  });

  describe('publishItemRemoving(): ', () => {
    it('should publish to channel', () => {
      const item = { _id: '42' };

      pubSubChannel.publish = jest.fn();

      queue.publishItemRemoving(item);

      expect(pubSubChannel.publish).toHaveBeenCalledWith(ITEM_REMOVED, item);
    });
  });

  describe('publishQueueChanging(): ', () => {
    it('should publish to channel', () => {
      const peak = { _id: '42' };
      const size = 42;
      const expectedPayload = { peak, size };

      queue.getPeak = jest.fn(() => Promise.resolve(peak));
      queue.getSize = jest.fn(() => Promise.resolve(size));
      pubSubChannel.publish = jest.fn();

      return queue.publishQueueChanging()
        .then(() => {
          expect(pubSubChannel.publish).toHaveBeenCalledWith(QUEUE_CHANGED, expectedPayload);
        });
    });
  });
});
