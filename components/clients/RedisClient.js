const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('../../constants/redis');

const promiser = (resolve, reject) => (err, data) => (err ? reject(err) : resolve(data));

class RedisClient {
  constructor(options = {}) {
    const { port = REDIS_PORT, host = REDIS_HOST } = options;
    this.client = redis.createClient(port, host);
  }

  add(key, value) {
    return new Promise((resolve, reject) => (
      key ? this.client.lpush(key, value, promiser(resolve, reject)) : reject()
    ));
  }

  take(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.rpop(key, promiser(resolve, reject)) : reject()
    ));
  }

  remove(key, value) {
    return new Promise((resolve, reject) => (
      key ? this.client.lrem(key, 1, value, promiser(resolve, reject)) : reject()
    ));
  }

  size(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.llen(key, promiser(resolve, reject)) : reject()
    ));
  }

  getLatest(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.lrange(key, -1, -1, promiser(resolve, reject)) : reject()
    ));
  }
}

module.exports = RedisClient;
