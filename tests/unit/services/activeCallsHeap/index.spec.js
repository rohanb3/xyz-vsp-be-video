jest.mock('@/services/activeCallsHeap/connector');
jest.mock('@/services/pubSubChannel');

const heap = require('@/services/activeCallsHeap/connector');
const pubSubChannel = require('@/services/pubSubChannel');
const activeCallsHeap = require('@/services/activeCallsHeap');

describe('activeCallsHeap: ', () => {
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

      heap.add = jest.fn(() => Promise.resolve());
      pubSubChannel.publish = jest.fn();

      return activeCallsHeap.add(id, call)
        .then(() => {
          expect(heap.add).toHaveBeenCalledWith(id, call);
          expect(pubSubChannel.publish).toHaveBeenCalledWith('calls.active:call.added', call);
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

      heap.remove = jest.fn(() => Promise.resolve(call));
      pubSubChannel.publish = jest.fn();

      return activeCallsHeap.remove(id)
        .then(() => {
          expect(heap.remove).toHaveBeenCalledWith(id);
          expect(pubSubChannel.publish).toHaveBeenCalledWith('calls.active:call.removed', call);
        });
    });
  });

  describe('subscribeToCallAdding(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      activeCallsHeap.subscribeToCallAdding(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith('calls.active:call.added', listener);
    });
  });

  describe('subscribeToCallRemoving(): ', () => {
    it('should subscribe to channel event', () => {
      const listener = () => {};

      pubSubChannel.subscribe = jest.fn();

      activeCallsHeap.subscribeToCallRemoving(listener);

      expect(pubSubChannel.subscribe).toHaveBeenCalledWith('calls.active:call.removed', listener);
    });
  });

  describe('unsubscribeFromCallAdding(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      activeCallsHeap.unsubscribeFromCallAdding(listener);

      expect(pubSubChannel.unsubscribe).toHaveBeenCalledWith('calls.active:call.added', listener);
    });
  });

  describe('unsubscribeFromCallRemoving(): ', () => {
    it('should unsubscribe from channel event', () => {
      const listener = () => {};

      pubSubChannel.unsubscribe = jest.fn();

      activeCallsHeap.unsubscribeFromCallRemoving(listener);

      expect(pubSubChannel.unsubscribe).toHaveBeenCalledWith('calls.active:call.removed', listener);
    });
  });
});
