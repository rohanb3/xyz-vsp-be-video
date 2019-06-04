const {CALL_FINISHED_BY_CUSTOMER, CALLS_EMPTY, PEER_OFFLINE, CALLBACK_DISABLED } = require('@/constants/calls');

const {
  CallsPendingEmptyError,
  CallNotFoundError,
  PeerOfflineError,
  CallbackDisabledError,
} = require('@/services/calls/errors');

function getOperatorCallFailReason(err) {
  let reason = null;

  if (err instanceof PeerOfflineError) {
    reason = PEER_OFFLINE;
  }

  if (err instanceof CallsPendingEmptyError) {
    reason = CALLS_EMPTY;
  }

  if (err instanceof CallNotFoundError) {
    reason = CALL_FINISHED_BY_CUSTOMER;
  }

  if (err instanceof CallbackDisabledError) {
    reason = CALLBACK_DISABLED;
  }

  return reason;
}

exports.getOperatorCallFailReason = getOperatorCallFailReason;
