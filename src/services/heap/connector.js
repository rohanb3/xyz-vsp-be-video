const storage = require('@/services/storage');
const client = require('@/services/redisClient');
const errors = require('./errors');

const setKey = (heapName, key) => client.sadd(heapName, key);
const removeKey = (heapName, key) => client.srem(heapName, key);

const rejectWithNotFound = key =>
  Promise.reject(new errors.NotFoundItemError(key));

class HeapConnector {
  constructor(heapName) {
    this.heapName = heapName;
  }

  add(key, value) {
    if (!key) {
      return Promise.resolve(false);
    }
    return setKey(this.heapName, key).then(() =>
      storage
        .set(key, value)
        .catch(err =>
          removeKey(this.heapName, key).then(() => Promise.reject(err))
        )
    );
  }

  get(key) {
    return this.isExist(key).then(exists => (exists ? storage.get(key) : null));
  }

  getAll() {
    return client
      .smembers(this.heapName)
      .then(storage.getMultiple)
      .then(items => items.filter(Boolean));
  }

  take(key) {
    if (!key) {
      return Promise.resolve(null);
    }
    return this.isExist(key)
      .then(exist =>
        exist ? removeKey(this.heapName, key) : rejectWithNotFound(key)
      )
      .then(() =>
        storage.take(key).catch(err => {
          const error =
            err instanceof storage.errors.NotFoundItemError
              ? new errors.NotFoundItemError(key)
              : err;
          return Promise.reject(error);
        })
      );
  }

  update(key, updates = {}) {
    if (!key) {
      return Promise.resolve(false);
    }
    return this.isExist(key).then(exists =>
      exists ? storage.update(key, updates) : rejectWithNotFound(key)
    );
  }

  isExist(key) {
    return client.sismember(this.heapName, key).then(Boolean);
  }

  getSize() {
    return client.scard(this.heapName);
  }

  destroy() {
    let keysToRemove = [];
    return client
      .smembers(this.heapName)
      .then((keys = []) => {
        keysToRemove = keys;
        return client.del(this.heapName);
      })
      .then(() =>
        keysToRemove.length
          ? client.mdel(keysToRemove)
          : Promise.resolve()
      );
  }
}

exports.createConnector = heapName => new HeapConnector(heapName);
