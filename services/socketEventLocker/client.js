const redis = require('redis');

const { REDIS_PORT, REDIS_HOST } = require('../../constants/redis');
const { promiser } = require('../redisUtils');

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

const add = (key, value) => new Promise((resolve, reject) => (
  client.sadd(key, value, promiser(resolve, reject))
));

const remove = (key, value) => new Promise((resolve, reject) => (
  client.srem(key, value, promiser(resolve, reject))
));

const check = (key, value) => new Promise((resolve, reject) => (
  client.sismember(key, value, promiser(resolve, reject))
));

exports.add = add;
exports.remove = remove;
exports.check = check;
