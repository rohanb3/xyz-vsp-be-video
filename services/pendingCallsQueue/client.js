const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('../../constants/redis');
const { QUEUE_NAME } = require('./constants');
const { promiser } = require('../redisUtils');

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

const add = value => new Promise((resolve, reject) => (
  client.lpush(QUEUE_NAME, value, promiser(resolve, reject))
));

const take = () => new Promise((resolve, reject) => (
  client.rpop(QUEUE_NAME, promiser(resolve, reject))
));

const remove = value => new Promise((resolve, reject) => (
  client.lrem(QUEUE_NAME, 1, value, promiser(resolve, reject))
));

const getSize = () => new Promise((resolve, reject) => (
  client.llen(QUEUE_NAME, promiser(resolve, reject))
));

const getLatest = () => new Promise((resolve, reject) => (
  client.lrange(QUEUE_NAME, -1, -1, promiser(resolve, reject))
));

exports.add = add;
exports.take = take;
exports.remove = remove;
exports.getSize = getSize;
exports.getLatest = getLatest;
