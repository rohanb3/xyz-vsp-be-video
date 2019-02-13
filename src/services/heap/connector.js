const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');

const setKey = heapName => key => client.sadd(heapName, key);

const delKey = heapName => key => client.srem(heapName, key);

class HeapConnector {
  constructor(heapName) {
    this.heapName = heapName;
  }

  add(key, value) {
    return setKey(this.heapName)(key)
      .then(() => storage.set(key, value));
  }

  get(key) {
    return this.isExist(key)
      .then(exists => (exists ? storage.get(key) : null));
  }

  remove(key) {
    return delKey(this.heapName)(key)
      .then(() => storage.remove(key));
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
