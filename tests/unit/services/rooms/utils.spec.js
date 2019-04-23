const { getOperatorCallFailReason } = require('@/services/rooms/utils');
const { CALL_FINISHED_BY_CUSTOMER, CALLS_EMPTY, PEER_OFFLINE } = require('@/constants/calls');

const {
  CallsPendingEmptyError,
  CallNotFoundError,
  PeerOfflineError,
} = require('@/services/calls/errors');

describe('rooms utils: ', () => {
  describe('getOperatorCallFailReason(): ', () => {
    it('should return null for default error', () => {
      expect(getOperatorCallFailReason(new Error())).toBeNull();
    });

    it('should return correct reason for CallsPendingEmptyError', () => {
      const err = new CallsPendingEmptyError();
      expect(getOperatorCallFailReason(err)).toBe(CALLS_EMPTY);
    });

    it('should return correct reason for CallNotFoundError', () => {
      const err = new CallNotFoundError();
      expect(getOperatorCallFailReason(err)).toBe(CALL_FINISHED_BY_CUSTOMER);
    });

    it('should return correct reason for PeerOfflineError', () => {
      const err = new PeerOfflineError();
      expect(getOperatorCallFailReason(err)).toBe(PEER_OFFLINE);
    });
  });
});
