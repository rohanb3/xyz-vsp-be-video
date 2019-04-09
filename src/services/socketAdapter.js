const redisAdapter = require('socket.io-redis');
const redis = require('redis');

const { REDIS_HOST, REDIS_PORT, REDIS_OPTIONS } = require('@/constants/redis');
const logger = require('@/services/logger')(module);

const pubClient = redis.createClient(REDIS_PORT, REDIS_HOST, REDIS_OPTIONS);
const subClient = redis.createClient(REDIS_PORT, REDIS_HOST, REDIS_OPTIONS);
pubClient.on('error', err => logger.error(err));
subClient.on('error', err => logger.error(err));

const createAdapter = () => redisAdapter({ pubClient, subClient });

exports.createAdapter = createAdapter;
