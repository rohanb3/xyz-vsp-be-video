const {
  CALL_FINISHED_BY_CUSTOMER,
  CALLS_EMPTY,
  PEER_OFFLINE,
  CALLBACK_DISABLED,
} = require('@/constants/calls');

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

function repeatUntilDelivered(emit, delivered, options = {}) {
  let count = 0;
  let interval;

  emit();
  return new Promise((resolve, reject) => {
    let cb = delivered(() => {
      clearInterval(interval);
      if (cb) {
        cb();
      }
      resolve();
    });

    interval = setInterval(() => {
      if (count < (options.repeats - 1 || 3)) {
        emit();
        count++;
      } else {
        clearInterval(interval);
        reject(new Error('Repeats limit reached'));
      }
    }, options.timeout || 5000);
  });
}

exports.getOperatorCallFailReason = getOperatorCallFailReason;
exports.repeatUntilDelivered = repeatUntilDelivered;
