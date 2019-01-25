const { createQueue } = require('./pendingCalls');
const { createClient } = require('./queueClient');
const { createChannel } = require('./queueChannel');
const { createCallsDBClient } = require('./callsDBClient');
const serializer = require('./serializer');
const {
  REDIS_HOST,
  REDIS_PORT,
} = require('../constants/redis');
const Call = require('../models/Call');


const PENDING_CALLS_QUEUE_NAME = 'calls.pending';
const PENDING_CALLS_CHANNEL_NAME = 'channel.pending.calls';

const clientOptions = {
  port: REDIS_PORT,
  host: REDIS_HOST,
};

const channelOptions = {
  name: PENDING_CALLS_CHANNEL_NAME,
  port: REDIS_PORT,
  host: REDIS_HOST,
  serializer,
};

const pendingCallsQueueClient = createClient(clientOptions);
const pendingCallsQueueChannel = createChannel(channelOptions);

const queueOptions = {
  name: PENDING_CALLS_QUEUE_NAME,
  client: pendingCallsQueueClient,
  channel: pendingCallsQueueChannel,
  serializer,
};

const pendingCalls = createQueue(queueOptions);
const callsDBClient = createCallsDBClient(Call);

const createAppMetadata = () => ({ pendingCalls, callsDBClient });

exports.createAppMetadata = createAppMetadata;
