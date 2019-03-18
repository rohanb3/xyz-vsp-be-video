const { REDIS_HOST = '127.0.0.1', REDIS_PORT = 6379, REDIS_PASSWORD } = process.env;

const REDIS_URL = 'rediss://:nmFcvrByWjf0vc0kHJmT98o4EsfSZAcNyfzy49TNkIg=@redis-vsp-be-video.redis.cache.windows.net:6380';
const REDIS_OPTIONS = REDIS_PASSWORD
  ? {
    auth_pass: REDIS_PASSWORD,
    tls: {
      serverName: REDIS_HOST,
    },
  }
  : {};

exports.REDIS_HOST = REDIS_HOST;
exports.REDIS_PORT = REDIS_PORT;
exports.REDIS_PASSWORD = REDIS_PASSWORD;
exports.REDIS_URL = REDIS_URL;
exports.REDIS_OPTIONS = REDIS_OPTIONS;
