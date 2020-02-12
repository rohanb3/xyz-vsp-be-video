const client = require('@/services/redisClient');
const { serialize, deserialize } = require('@/services/serializer');
const errors = require('./errors');

const rejectWithNotFound = key => Promise.reject(new errors.NotFoundItemError(key));

function isExist(key) {
  return key ? client.exists(key) : Promise.resolve(false);
}

function get(key) {
  if (!key) {
    return Promise.resolve(null);
  }
  return isExist(key)
    .then(exist => (exist ? client.get(key) : rejectWithNotFound(key)))
    .then(deserialize);
}

function getMultiple(keys) {
  if (!Array.isArray(keys)) {
    return Promise.resolve(null);
  }

  return client.mget(keys)
    .then(items => items.map(deserialize))
}

function set(key, value) {
  return key ? client.set(key, serialize(value)) : Promise.resolve(null);
}

function remove(key) {
  if (!key) {
    return Promise.resolve(false);
  }

  return isExist(key).then(exist => (exist ? client.del(key) : rejectWithNotFound(key)));
}

function take(key) {
  if (!key) {
    return Promise.resolve(null);
  }

  let result = null;

  return isExist(key)
    .then(exist => (exist ? get(key) : rejectWithNotFound(key)))
    .then((value) => {
      result = value;
      return remove(key);
    })
    .then(() => result);
}

function update(key, updates = {}) {
  if (!key) {
    return Promise.resolve(false);
  }
  return get(key).then(value => set(key, { ...value, ...updates }));
}

exports.isExist = isExist;
exports.get = get;
exports.getMultiple = getMultiple;
exports.set = set;
exports.take = take;
exports.remove = remove;
exports.update = update;
exports.errors = errors;
