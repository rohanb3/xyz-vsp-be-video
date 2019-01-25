const RedisClient = require('../components/clients/RedisClient');

const createClient = options => new RedisClient(options);

exports.createClient = createClient;
