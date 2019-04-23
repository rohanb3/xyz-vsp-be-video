const { CALL_FINISHED_BY_CUSTOMER, CALLS_EMPTY, PEER_OFFLINE } = require('@/constants/calls');

const {
  CallsPendingEmptyError,
  CallNotFoundError,
  PeerOfflineError,
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

  return reason;
}

exports.getOperatorCallFailReason = getOperatorCallFailReason;
