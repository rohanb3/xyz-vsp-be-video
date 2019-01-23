const RedisClient = require('../lib/redis');

const createClient = options => new RedisClient(options);

exports.createClient = createClient;
