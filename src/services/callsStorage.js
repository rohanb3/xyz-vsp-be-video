const client = require('@/services/redisClient');

const isExist = key => (key ? client.exists(key) : Promise.resolve(false));
const get = key => (key ? client.hgetall(key) : Promise.resolve(null));
const set = (key, value) => (key ? client.hmset(key, value) : Promise.resolve(null));
const remove = key => (key ? client.del(key) : Promise.resolve(null));
const take = (key) => {
  if (!key) {
    return Promise.resolve(null);
  }

  let result = null;
  return get(key)
    .then((value) => {
      result = value;
      return remove(key);
    })
    .then(() => result);
};

exports.isExist = isExist;
exports.get = get;
exports.set = set;
exports.take = take;
exports.remove = remove;
