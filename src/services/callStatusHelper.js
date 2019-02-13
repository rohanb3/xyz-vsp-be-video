const { statuses } = require('@/constants/calls');

const getCallStatus = (call) => {
  let status = null;

  if (call.finishedAt && call.callbacks && call.callbacks.length) {
    const [lastCallback] = [...call.callbacks].reverse();
    if (lastCallback.acceptedAt) {
      status = statuses.CALLBACK_ACTIVE;
    } else {
      status = statuses.CALLBACK_PENDING;
    }
  } else if (call.acceptedAt && !call.finishedAt) {
    status = statuses.CALL_ACTIVE;
  } else if (call.requestedAt && !call.acceptedAt) {
    status = statuses.CALL_PENDING;
  }

  return status;
};

exports.getCallStatus = getCallStatus;
