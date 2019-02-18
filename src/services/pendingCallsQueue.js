const { createQueue } = require('@/services/queue');
const { CALLS_PENDING } = require('@/constants/calls');

const pendingCallsQueue = createQueue(CALLS_PENDING);

module.exports = pendingCallsQueue;
