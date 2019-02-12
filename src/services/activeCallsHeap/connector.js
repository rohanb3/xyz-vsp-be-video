const { CALLS_ACTIVE } = require('./constants');
const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');

/*
** work with keys start
*/

const isExist = key => client
  .sismember(CALLS_ACTIVE, key)
  .then(Boolean);

const setKey = key => client.sadd(CALLS_ACTIVE, key);

const delKey = key => client.srem(CALLS_ACTIVE, key);

const getSize = () => client.scard(CALLS_ACTIVE);

/*
** work with keys finish
*/

/*
** work with collection start
*/

const add = (key, value) => setKey(key)
  .then(() => storage.set(key, value));

const get = key => isExist(key)
  .then(exists => (exists ? storage.get(key) : null));

const remove = key => delKey(key)
  .then(() => storage.remove(key));

/*
** work with collection finish
*/

exports.isExist = isExist;
exports.getSize = getSize;
exports.add = add;
exports.get = get;
exports.remove = remove;
