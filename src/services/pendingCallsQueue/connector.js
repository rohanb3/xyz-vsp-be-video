const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('@/constants/redis');
const { CALLS_PENDING } = require('./constants');
const { promiser, reduceToKey } = require('@/services/redisUtils');

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

const nameOfList = reduceToKey(CALLS_PENDING);
const convertToInnerKey = key => reduceToKey(nameOfList, key);

/*
** work with keys start
*/

const isExist = key => new Promise((resolve, reject) => (
  client.lrange(nameOfList, 0, -1, promiser(resolve, reject))
))
  .then(items => !!items.find(item => item === key));

const setKey = key => new Promise((resolve, reject) => (
  client.lpush(nameOfList, key, promiser(resolve, reject))
));

const takeOldestKey = () => new Promise((resolve, reject) => (
  client.rpop(nameOfList, promiser(resolve, reject))
));

const getOldestKey = () => new Promise((resolve, reject) => (
  client.lrange(nameOfList, -1, -1, promiser(resolve, reject))
))
  .then((item) => {
    const isArray = Array.isArray(item);
    return isArray ? item[0] : item;
  });

const removeKey = key => new Promise((resolve, reject) => (
  client.lrem(nameOfList, 1, key, promiser(resolve, reject))
));

const getSize = () => new Promise((resolve, reject) => (
  client.llen(nameOfList, promiser(resolve, reject))
));

/*
** work with keys finish
*/

/*
** work with collection start
*/

const enqueue = (key, value) => new Promise((resolve, reject) => {
  const innerKey = convertToInnerKey(key);
  return setKey(innerKey)
    .then(() => client.hmset(innerKey, value, promiser(resolve, reject)));
});

const dequeue = () => new Promise((resolve, reject) => {
  let oldestKey = null;
  let result = null;
  return takeOldestKey()
    .then((key) => {
      oldestKey = key;
      return oldestKey ? client.hgetall(oldestKey, promiser(resolve, reject)) : null;
    })
    .then((item) => {
      result = item;
      return oldestKey ? client.del(oldestKey, promiser(resolve, reject)) : null;
    })
    .then(() => result);
});

const remove = key => new Promise((resolve, reject) => {
  const innerKey = convertToInnerKey(key);
  let result = null;
  return removeKey(innerKey)
    .then(() => client.hgetall(innerKey, promiser(resolve, reject)))
    .then((item) => {
      result = item;
      return client.del(innerKey, promiser(resolve, reject));
    })
    .then(() => result);
});

const getPeak = () => new Promise((resolve, reject) => getOldestKey()
  .then(oldestKey => (oldestKey ? client.hgetall(oldestKey, promiser(resolve, reject)) : null)));

/*
** work with collection finish
*/

exports.isExist = isExist;
exports.getSize = getSize;
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.remove = remove;
exports.getPeak = getPeak;
