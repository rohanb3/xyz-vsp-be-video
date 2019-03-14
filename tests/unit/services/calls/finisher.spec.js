jest.mock('@/services/calls/pendingCallsQueue');
jest.mock('@/services/calls/activeCallsHeap');
jest.mock('@/services/calls/pendingCallbacksHeap');
jest.mock('@/services/calls/DBClient');

const { pendingCallsQueue } = require('@/services/calls/pendingCallsQueue');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const { pendingCallbacksHeap } = require('@/services/calls/pendingCallbacksHeap');
const callsDBClient = require('@/services/calls/DBClient');
const callFinisher = require('@/services/calls/finisher');

describe('callFinisher: ', () => {
  describe('markCallAsMissed(): ', () => {
    it('should remove call from pending calls queue and mark it as missed', () => {
      const callId = 'call42';
      const expectedUpdates = {
        missedAt: expect.any(String),
      };

      pendingCallsQueue.remove = jest.fn(() => Promise.resolve());
      callsDBClient.updateById = jest.fn(() => Promise.resolve());

      return callFinisher.markCallAsMissed(callId).then(() => {
        expect(pendingCallsQueue.remove).toHaveBeenCalledWith(callId);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
      });
    });
  });

  describe('markCallAsFinished(): ', () => {
    it('should remove call from active calls heap and mark it as finished', () => {
      const callId = 'call42';
      const finishedBy = 'customer42';
      const expectedUpdates = {
        finishedAt: expect.any(String),
        finishedBy,
      };

      activeCallsHeap.remove = jest.fn(() => Promise.resolve());
      callsDBClient.updateById = jest.fn(() => Promise.resolve());

      return callFinisher.markCallAsFinished(callId, finishedBy).then(() => {
        expect(activeCallsHeap.remove).toHaveBeenCalledWith(callId);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
      });
    });
  });

  describe('markLastCallbackAsMissed(): ', () => {
    it('should remove call from pending callbacks heap and mark last CB as missed', () => {
      const callId = 'call42';
      const callbacks = [
        {
          requestedAt: 'some time',
          acceptedAt: 'other time',
          finishedAt: 'one more time',
        },
        {
          requestedAt: 'some time',
        },
      ];
      const call = {
        id: callId,
        callbacks,
      };
      const expectedUpdates = {
        callbacks: [
          {
            requestedAt: 'some time',
            acceptedAt: 'other time',
            finishedAt: 'one more time',
          },
          {
            requestedAt: 'some time',
            missedAt: expect.any(String),
          },
        ],
      };

      pendingCallbacksHeap.remove = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve());

      return callFinisher.markLastCallbackAsMissed(callId).then(() => {
        expect(pendingCallbacksHeap.remove).toHaveBeenCalledWith(callId);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
      });
    });
  });

  describe('markLastCallbackAsFinished(): ', () => {
    it('should remove call from active callsheap and mark last CB as missed', () => {
      const callId = 'call42';
      const finishedBy = 'customer42';
      const callbacks = [
        {
          requestedAt: 'some time',
          acceptedAt: 'other time',
          finishedAt: 'one more time',
        },
        {
          requestedAt: 'some time',
          aceptedAt: 'other time',
        },
      ];
      const call = {
        id: callId,
        callbacks,
      };
      const expectedUpdates = {
        callbacks: [
          {
            requestedAt: 'some time',
            acceptedAt: 'other time',
            finishedAt: 'one more time',
          },
          {
            requestedAt: 'some time',
            aceptedAt: 'other time',
            finishedAt: expect.any(String),
            finishedBy,
          },
        ],
      };

      activeCallsHeap.remove = jest.fn(() => Promise.resolve(call));
      callsDBClient.updateById = jest.fn(() => Promise.resolve());

      return callFinisher.markLastCallbackAsFinished(callId, finishedBy).then(() => {
        expect(activeCallsHeap.remove).toHaveBeenCalledWith(callId);
        expect(callsDBClient.updateById).toHaveBeenCalledWith(callId, expectedUpdates);
      });
    });
  });
});
