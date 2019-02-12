const { CALLS_PENDING } = require('./constants');
const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');

/*
** work with keys start
*/

const isExist = key => client
  .lrange(CALLS_PENDING, 0, -1)
  .then(items => !!items.find(item => item === key));

const setKey = key => client.lpush(CALLS_PENDING, key);

const takeOldestKey = () => client.rpop(CALLS_PENDING);

const getOldestKey = () => client
  .lrange(CALLS_PENDING, -1, -1)
  .then((item) => {
    const isArray = Array.isArray(item);
    return isArray ? item[0] : item;
  });

const removeKey = key => client.lrem(CALLS_PENDING, 1, key);

const getSize = () => client.llen(CALLS_PENDING);

/*
** work with keys finish
*/

/*
** work with collection start
*/

const enqueue = (key, value) => setKey(key)
  .then(() => storage.set(key, value));

const dequeue = () => takeOldestKey()
  .then(key => (key ? storage.remove(key) : null));

const remove = key => (key ? removeKey(key) : Promise.resolve(null))
  .then(() => (key ? storage.remove(key) : null));

const getPeak = () => getOldestKey()
  .then(oldestKey => (oldestKey ? storage.get(oldestKey) : null));

/*
** work with collection finish
*/

exports.isExist = isExist;
exports.getSize = getSize;
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.remove = remove;
exports.getPeak = getPeak;
