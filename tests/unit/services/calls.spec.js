jest.mock('@/services/pendingCallsQueue');
jest.mock('@/services/activeCallsHeap');
jest.mock('@/services/callsDBClient');
jest.mock('@/services/twilio');
jest.mock('@/services/pubSubChannel');
jest.mock('@/services/callsIdsManager');

const pendingCallsQueue = require('@/services/pendingCallsQueue');
const activeCallsHeap = require('@/services/activeCallsHeap');
const callsDBClient = require('@/services/callsDBClient');
const twilio = require('@/services/twilio');
const pubSubChannel = require('@/services/pubSubChannel');
const callsIdsManager = require('@/services/callsIdsManager');
const calls = require('@/services/calls');
const { CALL_REQUESTED, CALL_ACCEPTED } = require('@/constants/app');

describe('calls: ', () => {
  describe('requestCall(): ', () => {
    it('should create call object, put it to DB and publish event', () => {
      const requestedBy = 'user42';
      const _id = 'call42';
      const expectedCall = {
        requestedAt: expect.any(String),
        requestedBy,
        _id,
      };

      callsIdsManager.generateId = jest.fn(() => _id);
      callsDBClient.create = jest.fn(call => Promise.resolve(call));
      pendingCallsQueue.enqueue = jest.fn(() => Promise.resolve());
      pubSubChannel.publish = jest.fn();

      return calls.requestCall(requestedBy)
        .then((call) => {
          expect(call).toEqual(expectedCall);
          expect(callsDBClient.create).toHaveBeenCalledWith(expectedCall);
          expect(pendingCallsQueue.enqueue).toHaveBeenCalledWith(_id, expectedCall);
          expect(pubSubChannel.publish).toHaveBeenCalledWith(CALL_REQUESTED, expectedCall);
        });
    });
  });

  describe('acceptCall(): ', () => {
    it('should take call from queue, create room, update call and publish it', () => {
      const acceptedBy = 'user42';
      const _id = 'call42';
      const updates = {
        acceptedBy,
        acceptedAt: expect.any(String),
        roomId: _id,
      };
      const callFromQueue = {
        requestedBy: 'user24',
        requestedAt: expect.any(String),
        _id,
      };
      const expectedCall = {
        ...callFromQueue,
        ...updates,
      };
      const room = {
        uniqueName: _id,
      };

      pendingCallsQueue.dequeue = jest.fn(() => Promise.resolve(callFromQueue));
      twilio.ensureRoom = jest.fn(() => Promise.resolve(room));
      activeCallsHeap.add = jest.fn();
      callsDBClient.updateById = jest.fn();
      pubSubChannel.publish = jest.fn();

      return calls.acceptCall(acceptedBy)
        .then((call) => {
          expect(call).toEqual(expectedCall);
          expect(pendingCallsQueue.dequeue).toHaveBeenCalled();
          expect(twilio.ensureRoom).toHaveBeenCalledWith(_id);
          expect(activeCallsHeap.add).toHaveBeenCalledWith(_id, expectedCall);
          expect(callsDBClient.updateById).toHaveBeenCalledWith(_id, updates);
          expect(pubSubChannel.publish).toHaveBeenCalledWith(CALL_ACCEPTED, expectedCall);
        });
    });
  });

  describe('finishCall(): ', () => {
    beforeEach(() => {
      pendingCallsQueue.remove = jest.fn(() => Promise.resolve());
      activeCallsHeap.remove = jest.fn(() => Promise.resolve());
      callsDBClient.updateById = jest.fn((id, call) => ({ id, ...call }));
    });

    it('should remove call from active and mark it as finished if it was not pending', () => {
      const callId = 'call42';
      const finishedBy = 'user42';
      const expectedUpdates = {
        finishedAt: expect.any(String),
        finishedBy,
      };
      pendingCallsQueue.isExist = jest.fn(() => Promise.resolve(false));

      return calls.finishCall(callId, finishedBy)
        .then(() => {
          expect(activeCallsHeap.remove).toHaveBeenCalledWith(callId);
          expect(pendingCallsQueue.remove).not.toHaveBeenCalled();
          expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
        });
    });

    it('should remove call from pending and mark it as missed if it was pending', () => {
      const callId = 'call42';
      const finishedBy = 'user42';
      const expectedUpdates = {
        missedAt: expect.any(String),
      };
      pendingCallsQueue.isExist = jest.fn(() => Promise.resolve(true));

      return calls.finishCall(callId, finishedBy)
        .then(() => {
          expect(activeCallsHeap.remove).not.toHaveBeenCalled();
          expect(pendingCallsQueue.remove).toHaveBeenCalledWith(callId);
          expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
        });
    });
  });

  describe('getOldestCall(): ', () => {
    it('should take peak from queue', () => {
      const expectedPeak = { id: 123 };
      pendingCallsQueue.getPeak = jest.fn(() => Promise.resolve(expectedPeak));

      return calls.getOldestCall()
        .then((oldestCall) => {
          expect(oldestCall).toBe(expectedPeak);
          expect(pendingCallsQueue.getPeak).toHaveBeenCalled();
        });
    });
  });

  describe('getPendingCallsLength(): ', () => {
    it('should take size from queue', () => {
      pendingCallsQueue.getSize = jest.fn(() => Promise.resolve(42));

      return calls.getPendingCallsLength()
        .then((size) => {
          expect(size).toBe(42);
          expect(pendingCallsQueue.getSize).toHaveBeenCalled();
        });
    });
  });

  describe('subscribeToCallsLengthChanging(): ', () => {
    it('should subscribe to queue event', () => {
      const listener = () => {};
      pendingCallsQueue.subscribeToQueueSizeChanging = jest.fn();

      calls.subscribeToCallsLengthChanging(listener);

      expect(pendingCallsQueue.subscribeToQueueSizeChanging).toHaveBeenCalledWith(listener);
    });
  });

  describe('unsubscribeFromCallsLengthChanging(): ', () => {
    it('should unsubscribe from queue event', () => {
      const listener = () => {};
      pendingCallsQueue.unsubscribeFromQueueSizeChanging = jest.fn();

      calls.unsubscribeFromCallsLengthChanging(listener);

      expect(pendingCallsQueue.unsubscribeFromQueueSizeChanging).toHaveBeenCalledWith(listener);
    });
  });
});
