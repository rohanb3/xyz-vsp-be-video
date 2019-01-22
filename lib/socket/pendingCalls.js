// const Queue = require('./queue');
const PendingCallsQueue = require('../../services/PendingCallsQueue');
const QueueClient = require('../redis');

const queueClient = new QueueClient();
const QUEUE_NAME = 'calls.pending';

// module.exports = new Queue();
module.exports = new PendingCallsQueue(QUEUE_NAME, queueClient);
