const PendingCallsQueue = require('../components/queues/PendingCallsQueue');

const createQueue = options => new PendingCallsQueue(options);

exports.createQueue = createQueue;
