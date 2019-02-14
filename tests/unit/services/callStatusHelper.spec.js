const callStatusHelper = require('@/services/callStatusHelper');
const { statuses } = require('@/constants/calls');

describe('callStatusHelper: ', () => {
  describe('getCallStatus(): ', () => {
    it('should return null if no call', () => {
      expect(callStatusHelper.getCallStatus()).toBeNull();
    });

    it('should return CALL_PENDING if call only has requestedAt', () => {
      const call = { requestedAt: 'some time' };
      expect(callStatusHelper.getCallStatus(call)).toBe(statuses.CALL_PENDING);
    });

    it('should return CALL_ACTIVE if call has acceptedAt and no finishedAt', () => {
      const call = { requestedAt: 'some time', acceptedAt: 'one more time' };
      expect(callStatusHelper.getCallStatus(call)).toBe(statuses.CALL_ACTIVE);
    });

    it('should return CALLBACK_PENDING if call finished but last callback is not accepted', () => {
      const call = {
        requestedAt: 'some time',
        acceptedAt: 'one more time',
        finishedAt: 'one more time',
        callbacks: [
          {
            requestedAt: 'some time',
          },
        ],
      };
      expect(callStatusHelper.getCallStatus(call)).toBe(statuses.CALLBACK_PENDING);
    });

    it('should return CALLBACK_ACTIVE if call finished and last callback is accepted', () => {
      const call = {
        requestedAt: 'some time',
        acceptedAt: 'one more time',
        finishedAt: 'one more time',
        callbacks: [
          {
            requestedAt: 'some time',
            acceptedAt: 'one more time',
          },
        ],
      };
      expect(callStatusHelper.getCallStatus(call)).toBe(statuses.CALLBACK_ACTIVE);
    });
  });
});
