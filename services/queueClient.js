const { createRedisClient } = require('./redisClient');

const createClient = options => createRedisClient(options);

exports.createClient = createClient;
