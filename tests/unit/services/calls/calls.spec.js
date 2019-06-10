jest.mock('@/services/connectionsHeap');
jest.mock('@/services/calls/activeCallsHeap');
jest.mock('@/services/calls/DBClient');

const calls = require('@/services/calls/calls');
const { activeCallsHeap } = require('@/services/calls/activeCallsHeap');
const { connectionsHeap } = require('@/services/connectionsHeap');

const operatorId = 'operator42';
const activeCallId = 'call42';

describe('Calls repository: ', () => {
  describe('getActiveCall(): ', () => {
    it('should return correct result', () => {
      const call = {
        salesRepId: 'salesRep42',
      };
      activeCallsHeap.get = jest.fn(() => Promise.resolve(call));
      connectionsHeap.get = jest.fn(() => Promise.resolve({ activeCallId }));
      return calls.getActiveCall(operatorId).then(res => {
        expect(res).toEqual(call);
        expect(activeCallsHeap.get).toHaveBeenCalledWith(activeCallId);
      });
    });

    it('should return null if no call stored as active', () => {
      activeCallsHeap.get = jest.fn(() => Promise.resolve());
      connectionsHeap.get = jest.fn(() => Promise.resolve({ activeCallId }));
      return calls.getActiveCall(operatorId).then(res => {
        expect(res).toBeNull();
        expect(activeCallsHeap.get).toHaveBeenCalledWith(activeCallId);
      });
    });

    it('should reject if no active call id for operator', () => {
      activeCallsHeap.get = jest.fn(() => Promise.resolve());
      connectionsHeap.get = jest.fn(() => Promise.resolve());
      return calls.getActiveCall(operatorId).catch(() => {
        expect(activeCallsHeap.get).not.toHaveBeenCalled();
      });
    });
  });
});
