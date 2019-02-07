const redisAdapter = require('socket.io-redis');

const { REDIS_HOST: host, REDIS_PORT: port } = require('@/constants/redis');

const createAdapter = () => redisAdapter({ host, port });

exports.createAdapter = createAdapter;
