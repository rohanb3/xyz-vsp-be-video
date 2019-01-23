const PendingCallsQueue = require('./queues/PendingCallsQueue');

const createQueue = (name, client, serializer) => (
  new PendingCallsQueue(name, client, serializer)
);

exports.createQueue = createQueue;
