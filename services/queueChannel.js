const { createRedisChannel } = require('./redisChannel');

const createChannel = options => createRedisChannel(options);

exports.createChannel = createChannel;
