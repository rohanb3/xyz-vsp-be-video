const config = require('config');

const {
  port, host, authRequired, password, prefix
} = config.get('redis');

const options = authRequired
  ? {
    auth_pass: password,
    tls: {
      serverName: host,
    },
    prefix: prefix,
  }
  : {prefix: prefix,};

exports.REDIS_HOST = host;
exports.REDIS_PORT = port;
exports.REDIS_PASSWORD = password;
exports.REDIS_OPTIONS = options;
