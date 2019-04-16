jest.mock('@/services/calls/pendingCallsQueue');
jest.mock('@/services/calls/activeCallsHeap');
jest.mock('@/services/calls/DBClient');
jest.mock('@/services/twilio');
jest.mock('@/services/pubSubChannel');

const { pendingCallsQueue } = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const { pendingCallbacksHeap } = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const { connectionsHeap } = require('@/services/connectionsHeap');
const storage = require('@/services/storage');
const twilio = require('@/services/twilio');
const pubSubChannel = require('@/services/pubSubChannel');
const calls = require('@/services/calls');
const callStatusHelper = require('@/services/calls/statusHelper');
const callFinisher = require('@/services/calls/finisher');
const callsErrorHandler = require('@/services/calls/errorHandler');
const { PeerOfflineError } = require('@/services/calls/errors');
const {
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  statuses,
} = require('@/constants/calls');

describe('calls: ', () => {
  describe('requestCall(): ', () => {
    it('should create call object, put it to DB and publish event', () => {
      const requestedBy = 'user42';
      const id = 'call42';
      const initialCall = {
        requestedAt: expect.any(String),
        requestedBy,
      };
      const expectedCall = {
        ...initialCall,
        id,
      };

      callsDBClient.create = jest.fn(call => Promise.resolve({ ...call, id }));
      pendingCallsQueue.enqueue = jest.fn(() => Promise.resolve());
      pubSubChannel.publish = jest.fn();

      return calls.requestCall(requestedBy).then((call) => {
        expect(call).toEqual(expectedCall);
        expect(callsDBClient.create).toHaveBeenCalledWith(initialCall);
        expect(pendingCallsQueue.enqueue).toHaveBeenCalledWith(id, expectedCall);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALL_REQUESTED, expectedCall);
      });
    });
  });

  describe('acceptCall(): ', () => {
    it('should take call from queue, create room, update call and publish it', () => {
      const acceptedBy = 'user42';
      const id = 'call42';
      const updates = {
        acceptedBy,
        acceptedAt: expect.any(String),
      };
      const callFromQueue = {
        requestedBy: 'user24',
        requestedAt: expect.any(String),
        id,
      };
      const expectedCall = {
        ...callFromQueue,
        ...updates,
      };

      pendingCallsQueue.dequeue = jest.fn(() => Promise.resolve(callFromQueue));
      twilio.ensureRoom = jest.fn(() => Promise.resolve());
      activeCallsHeap.add = jest.fn();
      callsDBClient.updateById = jest.fn();
      pubSubChannel.publish = jest.fn();

      return calls.acceptCall(acceptedBy).then((call) => {
        expect(call).toEqual(expectedCall);
        expect(pendingCallsQueue.dequeue).toHaveBeenCalled();
        expect(twilio.ensureRoom).toHaveBeenCalledWith(id);
        expect(activeCallsHeap.add).toHaveBeenCalledWith(id, expectedCall);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(id, updates);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALL_ACCEPTED, expectedCall);
      });
    });
  });

  describe('requestCallback(): ', () => {
    it('should get call from DB, add callback item, put to heap and publish to channel', () => {
      const callbacks = [
        {
          requestedAt: 'some time',
          acceptedAt: 'other time',
          finishedAt: 'one more time',
        },
      ];
      const expectedCallbacks = [
        ...callbacks,
        {
          requestedAt: expect.any(String),
        },
      ];
      const callId = 'call42';
      const call = {
        id: 'call42',
        callbacks,
      };
      const expectedCall = {
        id: 'call42',
        callbacks: expectedCallbacks,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.add = jest.fn(() => Promise.resolve(call));
      connectionsHeap.isExist = jest.fn(() => Promise.resolve(true));
      pubSubChannel.publish = jest.fn();

      return calls.requestCallback(callId).then((result) => {
        expect(result).toEqual(expectedCall);
        expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.add).toHaveBeenCalledWith(callId, expectedCall);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALLBACK_REQUESTED, expectedCall);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });

    it('should if peer is offline', () => {
      const callId = 'call42';
      const call = {
        id: 'call42',
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.add = jest.fn(() => Promise.resolve(call));
      connectionsHeap.isExist = jest.fn(() => Promise.resolve(false));
      callsErrorHandler.onRequestCallbackFailed = jest.fn(() => Promise.resolve());
      pubSubChannel.publish = jest.fn();

      return calls.requestCallback(callId).then(() => {
        expect(callsErrorHandler.onRequestCallbackFailed).toHaveBeenCalledWith(
          expect.any(PeerOfflineError),
          callId,
        );
        expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.add).not.toHaveBeenCalled();
        expect(pubSubChannel.publish).not.toHaveBeenCalled();
        expect(callsDBClient.updateById).not.toHaveBeenCalled();
      });
    });
  });

  describe('acceptCallback(): ', () => {
    it('should mark as active, ensure room, publish to channel and update in DB', () => {
      const callback1 = {
        requestedAt: 'some time',
        acceptedAt: 'other time',
        finishedAt: 'one more time',
      };
      const callback2 = {
        requestedAt: 'some time',
      };
      const callbacks = [{ ...callback1 }, { ...callback2 }];
      const expectedCallbacks = [
        { ...callback1 },
        {
          ...callback2,
          acceptedAt: expect.any(String),
        },
      ];
      const callId = 'call42';
      const call = {
        id: 'call42',
        callbacks,
      };
      const expectedCall = {
        id: 'call42',
        callbacks: expectedCallbacks,
      };

      twilio.ensureRoom = jest.fn(() => Promise.resolve());
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.take = jest.fn(() => Promise.resolve(call));
      activeCallsHeap.add = jest.fn(() => Promise.resolve(expectedCall));
      pubSubChannel.publish = jest.fn();

      return calls.acceptCallback(callId).then((result) => {
        expect(result).toEqual(expectedCall);
        expect(twilio.ensureRoom).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.take).toHaveBeenCalledWith(callId);
        expect(activeCallsHeap.add).toHaveBeenCalledWith(callId, expectedCall);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALLBACK_ACCEPTED, expectedCall);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });
  });

  describe('declineCallback(): ', () => {
    it('should mark as active, ensure room, publish to channel and update in DB', () => {
      const callback1 = {
        requestedAt: 'some time',
        acceptedAt: 'other time',
        finishedAt: 'one more time',
      };
      const callback2 = {
        requestedAt: 'some time',
      };
      const callbacks = [{ ...callback1 }, { ...callback2 }];
      const expectedCallbacks = [
        { ...callback1 },
        {
          ...callback2,
          declinedAt: expect.any(String),
        },
      ];
      const callId = 'call42';
      const call = {
        id: 'call42',
        callbacks,
      };
      const expectedCall = {
        id: 'call42',
        callbacks: expectedCallbacks,
      };

      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.take = jest.fn(() => Promise.resolve(call));
      pubSubChannel.publish = jest.fn();

      return calls.declineCallback(callId).then((result) => {
        expect(result).toEqual(expectedCall);
        expect(pendingCallbacksHeap.take).toHaveBeenCalledWith(callId);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALLBACK_DECLINED, expectedCall);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });
  });

  describe('finishCall(): ', () => {
    const callId = 'call42';
    beforeEach(() => {
      callFinisher.markCallAsMissed = jest.fn(() => Promise.resolve());
      callFinisher.markCallAsFinished = jest.fn(() => Promise.resolve());
      callFinisher.markLastCallbackAsMissed = jest.fn(() => Promise.resolve());
      callFinisher.markLastCallbackAsFinished = jest.fn(() => Promise.resolve());
    });

    it('should mark call as missed if call is pending', () => {
      const call = {
        id: 'call42',
      };

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALL_PENDING);

      return calls.finishCall(callId).then(() => {
        expect(callFinisher.markCallAsMissed).toHaveBeenCalledWith(callId);
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark call as finished if call is active', () => {
      const call = {
        id: 'call42',
      };
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALL_ACTIVE);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).toHaveBeenCalledWith(callId, finishedBy);
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark last callback as missed as finished if callback is pending', () => {
      const call = {
        id: 'call42',
      };

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALLBACK_PENDING);

      return calls.finishCall(callId).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).toHaveBeenCalledWith(callId);
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark last callback as finished as finished if callback is active', () => {
      const call = {
        id: 'call42',
      };
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALLBACK_ACTIVE);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).toHaveBeenCalledWith(callId, finishedBy);
      });
    });
  });

  describe('getOldestCall(): ', () => {
    it('should take peak from queue', () => {
      const expectedPeak = { id: 123 };
      pendingCallsQueue.getPeak = jest.fn(() => Promise.resolve(expectedPeak));

      return calls.getOldestCall().then((oldestCall) => {
        expect(oldestCall).toBe(expectedPeak);
        expect(pendingCallsQueue.getPeak).toHaveBeenCalled();
      });
    });
  });

  describe('getPendingCallsLength(): ', () => {
    it('should take size from queue', () => {
      pendingCallsQueue.getSize = jest.fn(() => Promise.resolve(42));

      return calls.getPendingCallsLength().then((size) => {
        expect(size).toBe(42);
        expect(pendingCallsQueue.getSize).toHaveBeenCalled();
      });
    });
  });

  describe('subscribeToCallsLengthChanging(): ', () => {
    it('should subscribe to queue event', () => {
      const listener = () => {};
      pendingCallsQueue.subscribeToQueueChanging = jest.fn();

      calls.subscribeToCallsLengthChanging(listener);

      expect(pendingCallsQueue.subscribeToQueueChanging).toHaveBeenCalledWith(listener);
    });
  });

  describe('unsubscribeFromCallsLengthChanging(): ', () => {
    it('should unsubscribe from queue event', () => {
      const listener = () => {};
      pendingCallsQueue.unsubscribeFromQueueChanging = jest.fn();

      calls.unsubscribeFromCallsLengthChanging(listener);

      expect(pendingCallsQueue.unsubscribeFromQueueChanging).toHaveBeenCalledWith(listener);
    });
  });
});
