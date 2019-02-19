const client = require('@/services/redisClient');
const errors = require('./errors');

function isExist(key) {
  return key ? client.exists(key) : Promise.resolve(false);
}

function get(key) {
  if (!key) {
    return Promise.resolve(null);
  }
  return isExist(key)
    .then(exist => (exist
      ? client.hgetall(key)
      : Promise.reject(new errors.NotFoundItemError(key))
    ));
}

function set(key, value) {
  if (!key) {
    return Promise.resolve(null);
  }

  return isExist(key)
    .then(exist => (
      exist ? Promise.reject(new errors.OverrideItemError(key)) : client.hmset(key, value)
    ));
}

function remove(key) {
  if (!key) {
    return Promise.resolve(false);
  }

  return isExist(key)
    .then(exist => (
      exist ? client.del(key) : Promise.reject(new errors.NotFoundItemError(key))
    ));
}

function take(key) {
  if (!key) {
    return Promise.resolve(null);
  }

  let result = null;

  return isExist(key)
    .then(exist => (
      exist ? get(key) : Promise.reject(new errors.NotFoundItemError(key))
    ))
    .then((value) => {
      result = value;
      return remove(key);
    })
    .then(() => result);
}

exports.isExist = isExist;
exports.get = get;
exports.set = set;
exports.take = take;
exports.remove = remove;
exports.errors = errors;
