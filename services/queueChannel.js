const RedisChannel = require('../components/channels/RedisChannel');

const createChannel = options => new RedisChannel(options);

exports.createChannel = createChannel;
