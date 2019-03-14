const { errors: pendingCallsErrors } = require('@/services/calls/pendingCallsQueue');
const { errors: activeCallsErrors } = require('@/services/calls/activeCallsHeap');
const { errors: pendingCallbacksErrors } = require('@/services/calls/pendingCallbacksHeap');
const {
  CallNotFoundError,
  CallOverrideError,
  CallsPendingEmptyError,
} = require('@/services/calls/errors');
const { errors: storageErrors } = require('@/services/storage');

function onRequestCallFailed(err, callId) {
  let error = err;

  if (err instanceof pendingCallsErrors.OverrideItemError) {
    error = new CallOverrideError(callId);
  }

  return Promise.reject(error);
}

function onAcceptCallFailed(err, callId) {
  let error = err;

  if (err instanceof pendingCallsErrors.NotFoundItemError) {
    error = new CallNotFoundError(callId);
  }
  if (err instanceof pendingCallsErrors.EmptyQueueError) {
    error = new CallsPendingEmptyError();
  }
  if (err instanceof activeCallsErrors.OverrideItemError) {
    error = new CallOverrideError(callId);
  }

  return Promise.reject(error);
}

function onRequestCallbackFailed(err, callId) {
  let error = err;

  if (err instanceof pendingCallbacksErrors.OverrideItemError) {
    error = new CallOverrideError(callId);
  }

  return Promise.reject(error);
}

function onAcceptCallbackFailed(err, callId) {
  let error = err;

  if (err instanceof pendingCallbacksErrors.NotFoundItemError) {
    error = new CallNotFoundError(callId);
  }
  if (err instanceof activeCallsErrors.OverrideItemError) {
    error = new CallOverrideError(callId);
  }

  return Promise.reject(error);
}

function onDeclineCallbackFailed(err, callId) {
  let error = err;

  if (err instanceof pendingCallbacksErrors.NotFoundItemError) {
    error = new CallNotFoundError(callId);
  }

  return Promise.reject(error);
}

function onFinishCallFailed(err, callId) {
  let error = err;

  const notFoundFlag = (
    err instanceof storageErrors.NotFoundItemError
    || err instanceof pendingCallsErrors.NotFoundItemError
    || err instanceof activeCallsErrors.NotFoundItemError
    || err instanceof pendingCallbacksErrors.NotFoundItemError
  );

  if (notFoundFlag) {
    error = new CallNotFoundError(callId);
  }

  return Promise.reject(error);
}

exports.onRequestCallFailed = onRequestCallFailed;
exports.onAcceptCallFailed = onAcceptCallFailed;
exports.onRequestCallbackFailed = onRequestCallbackFailed;
exports.onAcceptCallbackFailed = onAcceptCallbackFailed;
exports.onDeclineCallbackFailed = onDeclineCallbackFailed;
exports.onFinishCallFailed = onFinishCallFailed;
