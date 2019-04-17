const storage = require('@/services/storage');
const client = require('@/services/redisClient');
const errors = require('./errors');

const setKey = (queueName, key) => client.lpush(queueName, key);
const takeOldestKey = queueName => client.rpop(queueName);
const removeKey = (queueName, key) => client.lrem(queueName, 1, key);
const getOldestKey = queueName => client.lrange(queueName, -1, -1).then((item) => {
  const isArray = Array.isArray(item);
  return isArray ? item[0] : item;
});

const rejectWithNotFound = key => Promise.reject(new errors.NotFoundItemError(key));
const rejectWithOverride = key => Promise.reject(new errors.OverrideItemError(key));
const rejectWithEmptyQueue = () => Promise.reject(new errors.EmptyQueueError());

class QueueConnector {
  constructor(queueName) {
    this.queueName = queueName;
  }

  enqueue(key, value) {
    if (!key) {
      return Promise.resolve(false);
    }
    return this.isExist(key)
      .then(exist => (exist ? rejectWithOverride(key) : setKey(this.queueName, key)))
      .then(() => storage
        .set(key, value)
        .catch(err => removeKey(this.queueName, key).then(() => Promise.reject(err))));
  }

  dequeue() {
    let oldestKey = null;
    return takeOldestKey(this.queueName)
      .then((key) => {
        if (!key) {
          return rejectWithEmptyQueue();
        }
        oldestKey = key;
        return storage.take(key);
      })
      .catch((err) => {
        const error = err instanceof storage.errors.NotFoundItemError
          ? new errors.NotFoundItemError(oldestKey)
          : err;
        return Promise.reject(error);
      });
  }

  remove(key) {
    if (!key) {
      return Promise.resolve(null);
    }
    return this.isExist(key)
      .then(exist => (exist ? removeKey(this.queueName, key) : rejectWithNotFound(key)))
      .then(() => storage.take(key).catch((err) => {
        const error = err instanceof storage.errors.NotFoundItemError
          ? new errors.NotFoundItemError(key)
          : err;
        return Promise.reject(error);
      }));
  }

  getPeak() {
    return getOldestKey(this.queueName).then(key => (key ? storage.get(key) : null));
  }

  isExist(key) {
    return client.lrange(this.queueName, 0, -1).then(items => !!items.find(item => item === key));
  }

  getSize() {
    return client.llen(this.queueName);
  }
}

exports.createConnector = queueName => new QueueConnector(queueName);
