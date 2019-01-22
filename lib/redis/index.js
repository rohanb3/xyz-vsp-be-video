const redis = require('redis');

const REDIS_HOST = '127.0.0.1';
const REDIS_PORT = 6379;

const promiser = (resolve, reject) => (err, data) => (err ? reject(err) : resolve(data));

class RedisClient {
  constructor() {
    this.client = redis.createClient(REDIS_PORT, REDIS_HOST);
  }

  add(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.lpush(key, promiser(resolve, reject)) : reject()
    ));
  }

  take(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.rpop(key, promiser(resolve, reject)) : reject()
    ));
  }

  size(key) {
    return new Promise((resolve, reject) => (
      key ? this.client.llen(key, promiser(resolve, reject)) : reject()
    ));
  }
}

module.exports = RedisClient;
