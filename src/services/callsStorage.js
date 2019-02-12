const client = require('@/services/redisClient');

const get = key => (key ? client.hgetall(key) : Promise.resolve(null));
const set = (key, value) => (key ? client.hmset(key, value) : Promise.resolve(null));
const del = key => (key ? client.del(key) : Promise.resolve(null));
const remove = (key) => {
  if (!key) {
    return Promise.resolve(null);
  }

  let result = null;
  return get(key)
    .then((value) => {
      result = value;
      return del(key);
    })
    .then(() => result);
};

exports.get = get;
exports.set = set;
exports.remove = remove;
