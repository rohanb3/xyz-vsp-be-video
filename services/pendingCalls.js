const PendingCallsQueue = require('./queues/PendingCallsQueue');

const createQueue = options => new PendingCallsQueue(options);

exports.createQueue = createQueue;
