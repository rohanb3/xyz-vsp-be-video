const { createQueue, getErrors } = require('@/services/queue');
const { CALLS_PENDING } = require('@/constants/calls');

const pendingCallsQueue = createQueue(CALLS_PENDING);
const errors = getErrors();

exports.pendingCallsQueue = pendingCallsQueue;
exports.errors = errors;
