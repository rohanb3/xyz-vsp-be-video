const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');

const setKey = (queueName, key) => client.lpush(queueName, key);
const takeOldestKey = queueName => client.rpop(queueName);
const removeKey = (queueName, key) => client.lrem(queueName, 1, key);
const getOldestKey = queueName => client.lrange(queueName, -1, -1).then((item) => {
  const isArray = Array.isArray(item);
  return isArray ? item[0] : item;
});

class QueueConnector {
  constructor(queueName) {
    this.queueName = queueName;
  }

  enqueue(key, value) {
    return setKey(this.queueName, key).then(() => storage.set(key, value));
  }

  dequeue() {
    return takeOldestKey(this.queueName).then(key => (key ? storage.take(key) : null));
  }

  remove(key) {
    return key
      ? removeKey(this.queueName, key).then(() => storage.take(key))
      : Promise.resolve(null);
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
