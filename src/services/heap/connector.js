const storage = require('@/services/storage');
const client = require('@/services/redisClient');
const errors = require('./errors');

const setKey = (heapName, key) => client.sadd(heapName, key);
const removeKey = (heapName, key) => client.srem(heapName, key);

class HeapConnector {
  constructor(heapName) {
    this.heapName = heapName;
  }

  add(key, value) {
    if (!key) {
      return Promise.resolve(false);
    }
    return this.isExist(key)
      .then(exist => (exist
        ? Promise.reject(new errors.OverrideItemError(key))
        : setKey(this.heapName, key)
      ))
      .then(() => (
        storage.set(key, value)
          .catch((err) => {
            const error = err instanceof storage.errors.OverrideItemError
              ? new errors.OverrideItemError(key)
              : err;
            return removeKey(this.heapName, key)
              .then(() => Promise.reject(error));
          })
      ));
  }

  get(key) {
    return this.isExist(key)
      .then(exists => (exists ? storage.get(key) : null));
  }

  take(key) {
    if (!key) {
      return Promise.resolve(null);
    }
    return this.isExist(key)
      .then(exist => (exist
        ? removeKey(this.heapName, key)
        : Promise.reject(new errors.NotFoundItemError(key))
      ))
      .then(() => (
        storage.take(key)
          .catch((err) => {
            const error = err instanceof storage.errors.NotFoundItemError
              ? new errors.NotFoundItemError(key)
              : err;
            return Promise.reject(error);
          })
      ));
  }

  isExist(key) {
    return client
      .sismember(this.heapName, key)
      .then(Boolean);
  }

  getSize() {
    return client.scard(this.heapName);
  }
}

exports.createConnector = heapName => new HeapConnector(heapName);
