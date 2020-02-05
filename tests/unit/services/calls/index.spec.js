jest.mock('@/services/calls/pendingCallsQueue');
jest.mock('@/services/calls/activeCallsHeap');
jest.mock('@/services/calls/DBClient');
jest.mock('@/services/twilio');
jest.mock('@/services/pubSubChannel');

const pendingCallsQueue = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const {
  pendingCallbacksHeap,
} = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const { connectionsHeap } = require('@/services/connectionsHeap');
const storage = require('@/services/storage');
const twilio = require('@/services/twilio');
const pubSubChannel = require('@/services/pubSubChannel');
const calls = require('@/services/calls');
const callStatusHelper = require('@/services/calls/statusHelper');
const callFinisher = require('@/services/calls/finisher');
const callsErrorHandler = require('@/services/calls/errorHandler');
const {
  PeerOfflineError,
  CallNotFoundError,
  CallbackDisabledError,
} = require('@/services/calls/errors');
const {
  CALL_REQUESTED,
  CALL_ACCEPTED,
  CALLBACK_REQUESTED,
  CALLBACK_ACCEPTED,
  CALLBACK_DECLINED,
  statuses,
} = require('@/constants/calls');

const acceptedBy = 'user42';
const operator = {
  identity: acceptedBy,
  tenantId: 'sad',
};

describe('calls: ', () => {
  describe('requestCall(): ', () => {
    it('should create call object, put it to DB and publish event', () => {
      const requestedBy = 'user42';
      const id = 'call42';
      const deviceId = 'device42';
      const salesRepId = 'salesRep42';
      const callbackEnabled = true;
      const initialCall = {
        requestedAt: expect.any(String),
        requestedBy,
        deviceId,
        salesRepId,
        callbackEnabled,
        callType: 'call.video',
      };
      const expectedCall = {
        ...initialCall,
        id,
      };
      const payload = {
        requestedBy,
        deviceId,
        salesRepId,
        callbackEnabled,
      };

      callsDBClient.create = jest.fn(call => Promise.resolve({ ...call, id }));
      const mockedEnqueue = jest.fn();
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        enqueue: mockedEnqueue,
      });
      pubSubChannel.publish = jest.fn();

      return calls.requestCall(payload).then(call => {
        expect(call).toEqual(expectedCall);
        expect(callsDBClient.create).toHaveBeenCalledWith(initialCall);
        expect(mockedEnqueue).toHaveBeenCalledWith(id, expectedCall);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(
          CALL_REQUESTED,
          expectedCall
        );
      });
    });
  });

  describe('acceptCall(): ', () => {
    beforeEach(() => {
      callsDBClient.updateById = jest.fn();
      pubSubChannel.publish = jest.fn();
      twilio.ensureRoom = jest.fn(() => Promise.resolve());
      activeCallsHeap.add = jest.fn();
    });

    it('should take call from queue, create room, update call and publish it', () => {
      const id = 'call42';
      const requestedBy = 'user42';
      const updates = {
        acceptedBy,
        acceptedAt: expect.any(String),
      };
      const callFromQueue = {
        requestedBy,
        requestedAt: expect.any(String),
        id,
      };
      const expectedCall = {
        ...callFromQueue,
        ...updates,
      };

      const mockedDEnqueue = jest.fn(() => Promise.resolve(callFromQueue));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        dequeue: mockedDEnqueue,
      });

      activeCallsHeap.isExist = jest.fn(() => Promise.resolve(true));
      connectionsHeap.update = jest.fn(() => Promise.resolve());

      return calls.acceptCall(operator).then(call => {
        expect(call).toEqual(expectedCall);
        expect(mockedDEnqueue).toHaveBeenCalled();
        expect(twilio.ensureRoom).toHaveBeenCalledWith(id);
        expect(activeCallsHeap.add).toHaveBeenCalledWith(id, expectedCall);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(id, updates);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(
          CALL_ACCEPTED,
          expectedCall
        );
      });
    });

    it('should fail before ensureRoom if call became not active', () => {
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

      const mockedDEnqueue = jest.fn(() => Promise.resolve(callFromQueue));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        dequeue: mockedDEnqueue,
      });

      callsErrorHandler.onAcceptCallFailed = jest.fn(() => Promise.resolve());
      activeCallsHeap.isExist = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve(false));

      return calls.acceptCall(operator).then(() => {
        expect(callsErrorHandler.onAcceptCallFailed).toHaveBeenCalledWith(
          expect.any(CallNotFoundError),
          id
        );
        expect(mockedDEnqueue).toHaveBeenCalled();
        expect(activeCallsHeap.add).toHaveBeenCalledWith(id, expectedCall);
        expect(twilio.ensureRoom).not.toHaveBeenCalled();
        expect(callsDBClient.updateById).not.toHaveBeenCalled();
        expect(pubSubChannel.publish).not.toHaveBeenCalled();
      });
    });

    it('should fail before updating call in DB if call became not active', () => {
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

      const mockedDEnqueue = jest.fn(() => Promise.resolve(callFromQueue));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        dequeue: mockedDEnqueue,
      });

      callsErrorHandler.onAcceptCallFailed = jest.fn(() => Promise.resolve());
      activeCallsHeap.isExist = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve(true))
        .mockReturnValueOnce(Promise.resolve(false));

      return calls.acceptCall(operator).then(() => {
        expect(callsErrorHandler.onAcceptCallFailed).toHaveBeenCalledWith(
          expect.any(CallNotFoundError),
          id
        );
        expect(mockedDEnqueue).toHaveBeenCalled();
        expect(activeCallsHeap.add).toHaveBeenCalledWith(id, expectedCall);
        expect(twilio.ensureRoom).toHaveBeenCalledWith(id);
        expect(callsDBClient.updateById).not.toHaveBeenCalled();
        expect(pubSubChannel.publish).not.toHaveBeenCalled();
      });
    });

    it('should fail before publishing call accepting if call became not active', () => {
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

      const mockedDEnqueue = jest.fn(() => Promise.resolve(callFromQueue));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        dequeue: mockedDEnqueue,
      });

      callsErrorHandler.onAcceptCallFailed = jest.fn(() => Promise.resolve());
      activeCallsHeap.isExist = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve(true))
        .mockReturnValueOnce(Promise.resolve(true))
        .mockReturnValueOnce(Promise.resolve(false));

      return calls.acceptCall(operator).then(() => {
        expect(callsErrorHandler.onAcceptCallFailed).toHaveBeenCalledWith(
          expect.any(CallNotFoundError),
          id
        );
        expect(mockedDEnqueue).toHaveBeenCalled();
        expect(activeCallsHeap.add).toHaveBeenCalledWith(id, expectedCall);
        expect(twilio.ensureRoom).toHaveBeenCalledWith(id);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(id, updates);
        expect(pubSubChannel.publish).not.toHaveBeenCalled();
      });
    });

    it('should add call id to connections', () => {
      const id = 'call42';
      const requestedBy = 'user42';
      const callFromQueue = {
        requestedBy,
        requestedAt: expect.any(String),
        id,
      };

      const mockedDEnqueue = jest.fn(() => Promise.resolve(callFromQueue));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        dequeue: mockedDEnqueue,
      });

      pendingCallsQueue.dequeue = jest.fn(() => Promise.resolve(callFromQueue));
      activeCallsHeap.isExist = jest.fn(() => Promise.resolve(true));
      connectionsHeap.update = jest.fn(() => Promise.resolve());

      return calls.acceptCall(operator).then(() => {
        expect(connectionsHeap.update).toHaveBeenCalledWith(acceptedBy, {
          activeCallId: id,
        });
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
        callbackEnabled: true,
        callbacks,
      };
      const expectedCall = {
        id: 'call42',
        callbackEnabled: true,
        callbacks: expectedCallbacks,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.add = jest.fn(() => Promise.resolve(call));
      connectionsHeap.isExist = jest.fn(() => Promise.resolve(true));
      pubSubChannel.publish = jest.fn();

      return calls.requestCallback(callId).then(result => {
        expect(result).toEqual(expectedCall);
        expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.add).toHaveBeenCalledWith(
          callId,
          expectedCall
        );
        expect(pubSubChannel.publish).toHaveBeenCalledWith(
          CALLBACK_REQUESTED,
          expectedCall
        );
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });

    it('should reject with error if peer is offline', () => {
      const callId = 'call42';
      const call = {
        id: 'call42',
        callbackEnabled: true,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.add = jest.fn(() => Promise.resolve(call));
      connectionsHeap.isExist = jest.fn(() => Promise.resolve(false));
      callsErrorHandler.onRequestCallbackFailed = jest.fn(() =>
        Promise.resolve()
      );
      pubSubChannel.publish = jest.fn();

      return calls.requestCallback(callId).then(() => {
        expect(callsErrorHandler.onRequestCallbackFailed).toHaveBeenCalledWith(
          expect.any(PeerOfflineError),
          callId
        );
        expect(callsDBClient.getById).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.add).not.toHaveBeenCalled();
        expect(pubSubChannel.publish).not.toHaveBeenCalled();
        expect(callsDBClient.updateById).not.toHaveBeenCalled();
      });
    });

    it('should reject with error if callback is not allowed', () => {
      const callId = 'call42';
      const call = {
        id: 'call42',
        callbackEnabled: false,
      };

      callsDBClient.getById = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve(call));
      pendingCallbacksHeap.add = jest.fn(() => Promise.resolve(call));
      connectionsHeap.isExist = jest.fn(() => Promise.resolve(true));
      callsErrorHandler.onRequestCallbackFailed = jest.fn(() =>
        Promise.resolve()
      );
      pubSubChannel.publish = jest.fn();

      return calls.requestCallback(callId).then(() => {
        expect(callsErrorHandler.onRequestCallbackFailed).toHaveBeenCalledWith(
          expect.any(CallbackDisabledError),
          callId
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

      return calls.acceptCallback(callId).then(result => {
        expect(result).toEqual(expectedCall);
        expect(twilio.ensureRoom).toHaveBeenCalledWith(callId);
        expect(pendingCallbacksHeap.take).toHaveBeenCalledWith(callId);
        expect(activeCallsHeap.add).toHaveBeenCalledWith(callId, expectedCall);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(
          CALLBACK_ACCEPTED,
          expectedCall
        );
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });

    it('should add call id to connections', () => {
      const id = 'call42';
      const requestedBy = 'user42';
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
        id,
        requestedBy,
        acceptedBy,
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
      connectionsHeap.update = jest.fn(() => Promise.resolve());

      return calls.acceptCallback(callId).then(() => {
        expect(connectionsHeap.update).toHaveBeenCalledWith(acceptedBy, {
          activeCallId: callId,
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
      const reason = 'test';
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

      return calls.declineCallback(callId, reason).then(result => {
        expect(result).toEqual(expectedCall);
        expect(pendingCallbacksHeap.take).toHaveBeenCalledWith(callId);
        expect(pubSubChannel.publish).toHaveBeenCalledWith(CALLBACK_DECLINED, {
          ...expectedCall,
          reason,
        });
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, {
          callbacks: expectedCallbacks,
        });
      });
    });
  });

  describe('finishCall(): ', () => {
    const callId = 'call42';
    const tenantId = 'spectrum';
    const call = { id: callId, acceptedBy, tenantId };
    beforeEach(() => {
      callFinisher.markCallAsMissed = jest.fn(() => Promise.resolve(call));
      callFinisher.markCallAsFinished = jest.fn(() => Promise.resolve(call));
      callFinisher.markLastCallbackAsMissed = jest.fn(() =>
        Promise.resolve(call)
      );
      callFinisher.markLastCallbackAsFinished = jest.fn(() =>
        Promise.resolve(call)
      );

      connectionsHeap.update = jest.fn(() => Promise.resolve());
    });

    it('should mark call as missed if call is pending', () => {
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALL_PENDING);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).toHaveBeenCalledWith(
          callId,
          finishedBy,
          tenantId
        );
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark call as finished if call is active', () => {
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALL_ACTIVE);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).toHaveBeenCalledWith(
          callId,
          finishedBy
        );
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark last callback as missed as finished if callback is pending', () => {
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALLBACK_PENDING);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).toHaveBeenCalledWith(
          callId,
          finishedBy
        );
        expect(callFinisher.markLastCallbackAsFinished).not.toHaveBeenCalled();
      });
    });

    it('should mark last callback as finished as finished if callback is active', () => {
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALLBACK_ACTIVE);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(callFinisher.markCallAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markCallAsFinished).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsMissed).not.toHaveBeenCalled();
        expect(callFinisher.markLastCallbackAsFinished).toHaveBeenCalledWith(
          callId,
          finishedBy
        );
      });
    });

    it('should remove call data from connections', () => {
      const finishedBy = 'customer42';

      storage.get = jest.fn(() => Promise.resolve(call));
      callStatusHelper.getCallStatus = jest.fn(() => statuses.CALL_ACTIVE);

      return calls.finishCall(callId, finishedBy).then(() => {
        expect(connectionsHeap.update).toHaveBeenCalledWith(acceptedBy, {
          activeCallId: null,
        });
      });
    });
  });

  describe('getOldestCall(): ', () => {
    it('should take peak from queue', () => {
      const expectedPeak = { id: 123 };

      const mockedgetPeak = jest.fn(() => Promise.resolve(expectedPeak));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        getPeak: mockedgetPeak,
      });

      return calls.getOldestCall().then(oldestCall => {
        expect(oldestCall).toBe(expectedPeak);
        expect(mockedgetPeak).toHaveBeenCalled();
      });
    });
  });

  describe('getPendingCallsLength(): ', () => {
    it('should take size from queue', () => {
      const mockedgetSize = jest.fn(() => Promise.resolve(42));
      pendingCallsQueue.getPendingCallsQueue = jest.fn().mockReturnValueOnce({
        getSize: mockedgetSize,
      });

      return calls.getPendingCallsLength().then(size => {
        expect(size).toBe(42);
        expect(mockedgetSize).toHaveBeenCalled();
      });
    });
  });

  describe('subscribeToCallsLengthChanging(): ', () => {
    it('should subscribe to queue event', () => {
      const listener = () => {};
      pendingCallsQueue.subscribeOnQueuesChanges = jest.fn();

      calls.subscribeToCallsLengthChanging(listener);

      expect(pendingCallsQueue.subscribeOnQueuesChanges).toHaveBeenCalledWith(
        listener
      );
    });
  });

  describe('unsubscribeFromCallsLengthChanging(): ', () => {
    it('should unsubscribe from queue event', () => {
      const listener = () => {};
      pendingCallsQueue.unsubscribeFromQueueChanging = jest.fn();

      calls.unsubscribeFromCallsLengthChanging(listener);

      expect(
        pendingCallsQueue.unsubscribeFromQueueChanging
      ).toHaveBeenCalledWith(listener);
    });
  });

  describe('getPendingCalls(): ', () => {
    const tenantId = 'spectrum';

    it('should call getItems() of tenant queue', async () => {
      const items = [{id: 111}, {id:222}];
      const mockedGetItems = jest.fn().mockResolvedValue(items);

      pendingCallsQueue.getPendingCallsQueue = jest.fn(() => ({
        getItems: mockedGetItems,
      }));

      const promise = calls.getPendingCalls(tenantId);

      await expect(promise).resolves.toBe(items);
      expect(pendingCallsQueue.getPendingCallsQueue).toHaveBeenCalledWith(tenantId);
      expect(mockedGetItems).toHaveBeenCalled();
    });
  });

});
