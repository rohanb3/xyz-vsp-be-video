const redisAdapter = require('socket.io-redis');
const redis = require('redis');

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = require('@/constants/redis');

const pubClient = redis.createClient(REDIS_PORT, REDIS_HOST, {
  auth_pass: REDIS_PASSWORD,
});
const subClient = redis.createClient(REDIS_PORT, REDIS_HOST, {
  auth_pass: REDIS_PASSWORD,
});

const createAdapter = () => redisAdapter({ pubClient, subClient });

exports.createAdapter = createAdapter;
