const { errors: pendingCallsErrors } = require('@/services/calls/pendingCallsQueue');
const { errors: activeCallsErrors } = require('@/services/calls/activeCallsHeap');
const { errors: pendingCallbacksErrors } = require('@/services/calls/pendingCallbacksHeap');
const {
  CallNotFoundError,
  CallOverrideError,
  CallsPendingEmptyError,
} = require('@/services/calls/errors');
const { errors: storageErrors } = require('@/services/storage');
const callsErrorHandler = require('@/services/calls/errorHandler');

describe('callsErrorHandler: ', () => {
  describe('onRequestCallFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onRequestCallFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if call is already in queue', () => {
      const error = new pendingCallsErrors.OverrideItemError();
      return callsErrorHandler.onRequestCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallOverrideError);
        });
    });
  });

  describe('onAcceptCallFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onAcceptCallFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if call was not find in queue', () => {
      const error = new pendingCallsErrors.NotFoundItemError();
      return callsErrorHandler.onAcceptCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });

    it('should reject with correct error if queue is empty', () => {
      const error = new pendingCallsErrors.EmptyQueueError();
      return callsErrorHandler.onAcceptCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallsPendingEmptyError);
        });
    });

    it('should reject with correct error if call is already in active', () => {
      const error = new activeCallsErrors.OverrideItemError();
      return callsErrorHandler.onAcceptCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallOverrideError);
        });
    });
  });

  describe('onRequestCallbackFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onRequestCallbackFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if callback is already in active', () => {
      const error = new pendingCallbacksErrors.OverrideItemError();
      return callsErrorHandler.onRequestCallbackFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallOverrideError);
        });
    });
  });

  describe('onAcceptCallbackFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onAcceptCallbackFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if callback was not find in pending', () => {
      const error = new pendingCallbacksErrors.NotFoundItemError();
      return callsErrorHandler.onAcceptCallbackFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });

    it('should reject with correct error if callback is already in active', () => {
      const error = new activeCallsErrors.OverrideItemError();
      return callsErrorHandler.onAcceptCallbackFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallOverrideError);
        });
    });
  });

  describe('onDeclineCallbackFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onDeclineCallbackFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if callback was not found in pending', () => {
      const error = new pendingCallbacksErrors.NotFoundItemError();
      return callsErrorHandler.onDeclineCallbackFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });
  });

  describe('onFinishCallFailed(): ', () => {
    it('should reject with correct error for default case', () => {
      const error = 'some error';
      return callsErrorHandler.onFinishCallFailed(error)
        .catch((err) => {
          expect(err).not.toBeInstanceOf(CallNotFoundError);
          expect(err).toBe(error);
        });
    });

    it('should reject with correct error if callback was not found in storage', () => {
      const error = new storageErrors.NotFoundItemError();
      return callsErrorHandler.onFinishCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });

    it('should reject with correct error if call was not find in pending', () => {
      const error = new pendingCallsErrors.NotFoundItemError();
      return callsErrorHandler.onFinishCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });

    it('should reject with correct error if call was not find in active', () => {
      const error = new activeCallsErrors.NotFoundItemError();
      return callsErrorHandler.onFinishCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });

    it('should reject with correct error if callback was not find in pending', () => {
      const error = new pendingCallbacksErrors.NotFoundItemError();
      return callsErrorHandler.onFinishCallFailed(error)
        .catch((err) => {
          expect(err).toBeInstanceOf(CallNotFoundError);
        });
    });
  });
});
