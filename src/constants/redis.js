const config = require('config');

const {
  port, host, authRequired, password,
} = config.get('redis');

const options = authRequired
  ? {
    auth_pass: password,
    tls: {
      serverName: host,
    },
  }
  : {};

console.log(host, port, authRequired, password);

exports.REDIS_HOST = host;
exports.REDIS_PORT = port;
exports.REDIS_PASSWORD = password;
exports.REDIS_OPTIONS = options;
