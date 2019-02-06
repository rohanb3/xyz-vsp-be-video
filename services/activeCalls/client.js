const redis = require('redis');

const { REDIS_HOST, REDIS_PORT } = require('../../constants/redis');
const { CALLS_ACTIVE } = require('./constants');
const { promiser } = require('../redisUtils');

const client = redis.createClient(REDIS_PORT, REDIS_HOST);

const convertToInnerKey = key => `${CALLS_ACTIVE}:${key}`;

/*
** work with keys start
*/

const checkExistence = key => new Promise((resolve, reject) => (
  client.sismember(CALLS_ACTIVE, key, promiser(resolve, reject))
))
  .then(Boolean);

const setKey = key => new Promise((resolve, reject) => (
  client.sadd(CALLS_ACTIVE, key, promiser(resolve, reject))
));

const delKey = key => new Promise((resolve, reject) => (
  client.srem(CALLS_ACTIVE, key, promiser(resolve, reject))
));

const getSize = () => new Promise((resolve, reject) => (
  client.scard(CALLS_ACTIVE, promiser(resolve, reject))
));

/*
** work with keys finish
*/

/*
** work with collection start
*/

const add = (key, value) => new Promise((resolve, reject) => {
  const innerKey = convertToInnerKey(key);
  return setKey(innerKey)
    .then(() => client.hmset(innerKey, value, promiser(resolve, reject)));
});

const get = key => new Promise((resolve, reject) => {
  const innerKey = convertToInnerKey(key);
  return checkExistence(innerKey)
    .then(isExist => (
      isExist ? client.hgetall(innerKey, promiser(resolve, reject)) : resolve(null)
    ));
});

const del = key => new Promise((resolve, reject) => {
  const innerKey = convertToInnerKey(key);
  return delKey(innerKey)
    .then(() => client.del(innerKey, promiser(resolve, reject)));
});

const remove = key => new Promise((resolve, reject) => {
  let result = null;
  const innerKey = convertToInnerKey(key);
  return get(innerKey)
    .then((value) => {
      result = value;
      return del(innerKey);
    })
    .then(() => resolve(result))
    .catch(reject);
});

/*
** work with collection finish
*/

exports.checkExistence = checkExistence;
exports.getSize = getSize;
exports.add = add;
exports.get = get;
exports.remove = remove;
