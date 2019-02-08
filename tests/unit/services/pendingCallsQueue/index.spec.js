jest.mock('@/services/pendingCallsQueue/connector');
jest.mock('@/services/pubSubChannel');

const queue = require('@/services/pendingCallsQueue/connector');
const pubSubChannel = require('@/services/pubSubChannel');
const pendingCallsQueue = require('@/services/pendingCallsQueue');

describe('pendingCallsQueue: ', () => {
  describe('enqueue(): ', () => {
    it('should enqueue to queue and publish call enqueueing', (done) => {
      const id = 'call42';
      const call = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.enqueue = jest.fn(() => Promise.resolve());
      queue.getPeak = jest.fn(() => Promise.resolve(call));
      queue.getSize = jest.fn(() => Promise.resolve(42));
      pubSubChannel.publish = jest.fn();

      return pendingCallsQueue.enqueue(id, call)
        .then(() => {
          expect(queue.enqueue).toHaveBeenCalledWith(id, call);
          setTimeout(() => {
            expect(pubSubChannel.publish).toHaveBeenCalledWith('calls.pending:call.enqueued', call);
            expect(pubSubChannel.publish)
              .toHaveBeenCalledWith('calls.pending:queue.size.changed', expect.any(Object));
            done();
          });
        });
    });
  });

  describe('dequeue(): ', () => {
    it('should dequeue from queue and publish call dequeueing', (done) => {
      const expectedCall = {
        _id: 'call42',
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.dequeue = jest.fn(() => Promise.resolve(expectedCall));
      queue.getPeak = jest.fn(() => Promise.resolve(null));
      queue.getSize = jest.fn(() => Promise.resolve(0));
      pubSubChannel.publish = jest.fn();

      return pendingCallsQueue.dequeue()
        .then((call) => {
          expect(call).toEqual(expectedCall);
          expect(queue.dequeue).toHaveBeenCalled();

          setTimeout(() => {
            expect(pubSubChannel.publish)
              .toHaveBeenCalledWith('calls.pending:call.dequeued', expectedCall);
            expect(pubSubChannel.publish)
              .toHaveBeenCalledWith('calls.pending:queue.size.changed', expect.any(Object));
            done();
          });
        });
    });
  });

  describe('remove(): ', () => {
    it('should remove from queue and publish call removing if call was removed', (done) => {
      const id = 'call42';
      const expectedCall = {
        _id: id,
        requestedBy: 'user42',
        requestedAt: '2019-02-08T10:38:00Z',
      };

      queue.remove = jest.fn(() => Promise.resolve(expectedCall));
      queue.getPeak = jest.fn(() => Promise.resolve(null));
      queue.getSize = jest.fn(() => Promise.resolve(0));
      pubSubChannel.publish = jest.fn();

      return pendingCallsQueue.remove(id)
        .then((call) => {
          expect(call).toEqual(expectedCall);
          expect(queue.remove).toHaveBeenCalledWith(id);

          setTimeout(() => {
            expect(pubSubChannel.publish)
              .toHaveBeenCalledWith('calls.pending:call.removed', expectedCall);
            expect(pubSubChannel.publish)
              .toHaveBeenCalledWith('calls.pending:queue.size.changed', expect.any(Object));
            done();
          });
        });
    });

    it('should remove from queue and not publish call removing if call was not removed', (done) => {
      const id = 'call42';

      queue.remove = jest.fn(() => Promise.resolve(null));
      queue.getPeak = jest.fn(() => Promise.resolve(null));
      queue.getSize = jest.fn(() => Promise.resolve(0));
      pubSubChannel.publish = jest.fn();

      return pendingCallsQueue.remove(id)
        .then((call) => {
          expect(call).toEqual(null);
          expect(queue.remove).toHaveBeenCalledWith(id);

          setTimeout(() => {
            expect(pubSubChannel.publish).not.toHaveBeenCalled();
            expect(pubSubChannel.publish).not.toHaveBeenCalled();
            done();
          });
        });
    });
  });

  describe('subscribeToCallEnqueueing(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();
      pendingCallsQueue.subscribeToCallEnqueueing(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith('calls.pending:call.enqueued', listener);
    });
  });

  describe('subscribeToCallDequeueing(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      pendingCallsQueue.subscribeToCallDequeueing(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith('calls.pending:call.dequeued', listener);
    });
  });

  describe('subscribeToCallRemoving(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      pendingCallsQueue.subscribeToCallRemoving(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith('calls.pending:call.removed', listener);
    });
  });

  describe('subscribeToQueueSizeChanging(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      pendingCallsQueue.subscribeToQueueSizeChanging(listener);

      expect(pubSubChannel.subscribe)
        .toHaveBeenCalledWith('calls.pending:queue.size.changed', listener);
    });
  });

  describe('unsubscribeFromCallEnqueueing(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();
      pendingCallsQueue.unsubscribeFromCallEnqueueing(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith('calls.pending:call.enqueued', listener);
    });
  });

  describe('unsubscribeFromCallDequeueing(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      pendingCallsQueue.unsubscribeFromCallDequeueing(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith('calls.pending:call.dequeued', listener);
    });
  });

  describe('unsubscribeFromCallRemoving(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      pendingCallsQueue.unsubscribeFromCallRemoving(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith('calls.pending:call.removed', listener);
    });
  });

  describe('unsubscribeFromQueueSizeChanging(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      pendingCallsQueue.unsubscribeFromQueueSizeChanging(listener);

      expect(pubSubChannel.unsubscribe)
        .toHaveBeenCalledWith('calls.pending:queue.size.changed', listener);
    });
  });
});
