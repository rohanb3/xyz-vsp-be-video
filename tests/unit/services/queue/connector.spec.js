jest.mock('@/services/storage');
jest.mock('@/services/redisClient');

const storage = require('@/services/storage');
const client = require('@/services/redisClient');
const { createConnector } = require('@/services/queue/connector');
const errors = require('@/services/queue/errors');

const QUEUE_NAME = 'queue.test';

let connector = null;

describe('queue connector: ', () => {
  beforeEach(() => {
    connector = createConnector(QUEUE_NAME);
  });

  describe('isExist(): ', () => {
    let items = null;

    beforeEach(() => {
      items = ['item77', 'item42'];
      client.lrange = jest.fn(() => Promise.resolve(items));
    });

    it('should return true if key exists', () => {
      const id = 'item42';
      return connector.isExist(id)
        .then((exist) => {
          expect(exist).toBeTruthy();
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, 0, -1);
        });
    });

    it('should return false if no key exists', () => {
      const id = 'item12';
      return connector.isExist(id)
        .then((exist) => {
          expect(exist).toBeFalsy();
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, 0, -1);
        });
    });
  });

  describe('getSize(): ', () => {
    it('should return size', () => {
      client.llen = jest.fn(() => Promise.resolve(42));
      return connector.getSize()
        .then((size) => {
          expect(size).toBe(42);
          expect(client.llen).toHaveBeenCalledWith(QUEUE_NAME);
        });
    });
  });

  describe('enqueue(): ', () => {
    it('should resolve with false if no id specified', () => {
      client.lpush = jest.fn(() => Promise.resolve());
      client.lrem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.enqueue()
        .then((res) => {
          expect(res).toBeFalsy();
          expect(client.lpush).not.toHaveBeenCalled();
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.set).not.toHaveBeenCalled();
          expect(connector.isExist).not.toHaveBeenCalled();
        });
    });

    it('should set id to queue and add item to storage', () => {
      const id = ' item42';
      const item = {
        _id: 'item42',
      };

      client.lpush = jest.fn(() => Promise.resolve());
      client.lrem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.enqueue(id, item)
        .then(() => {
          expect(client.lpush).toHaveBeenCalledWith(QUEUE_NAME, id);
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.set).toHaveBeenCalledWith(id, item);
        });
    });

    it('should reject if key already exists', () => {
      const id = 'item42';
      const item = {
        _id: 'item42',
      };

      client.lpush = jest.fn(() => Promise.resolve());
      client.lrem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.enqueue(id, item)
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.OverrideItemError);
          expect(client.lpush).not.toHaveBeenCalled();
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.set).not.toHaveBeenCalled();
        });
    });

    it('should reject and cleanup if key exists in storage', () => {
      const id = 'item42';
      const item = {
        _id: 'item42',
      };
      const error = new storage.errors.OverrideItemError(id);

      client.lpush = jest.fn(() => Promise.resolve());
      client.lrem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.enqueue(id, item)
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.OverrideItemError);
          expect(client.lpush).toHaveBeenCalledWith(QUEUE_NAME, id);
          expect(storage.set).toHaveBeenCalledWith(id, item);
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
        });
    });

    it('should reject and cleanup if save to storage failed', () => {
      const id = 'item42';
      const item = {
        _id: 'item42',
      };
      const error = 'some error';

      client.lpush = jest.fn(() => Promise.resolve());
      client.lrem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.enqueue(id, item)
        .catch((err) => {
          expect(err).toBe(error);
          expect(err).not.toBeInstanceOf(errors.OverrideItemError);
          expect(client.lpush).toHaveBeenCalledWith(QUEUE_NAME, id);
          expect(storage.set).toHaveBeenCalledWith(id, item);
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
        });
    });
  });

  describe('dequeue(): ', () => {
    it('should remove id from queue and take item from storage', () => {
      const id = ' item42';
      const storedCall = {
        _id: 'item42',
      };

      client.rpop = jest.fn(() => Promise.resolve(id));
      storage.take = jest.fn(() => Promise.resolve(storedCall));

      return connector.dequeue()
        .then((item) => {
          expect(item).toEqual(storedCall);
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });

    it('should reject if no key in storage', () => {
      const id = ' item42';
      const error = new storage.errors.NotFoundItemError(id);

      client.rpop = jest.fn(() => Promise.resolve(id));
      storage.take = jest.fn(() => Promise.reject(error));

      return connector.dequeue()
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.NotFoundItemError);
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });

    it('should reject if queue is empty', () => {
      client.rpop = jest.fn(() => Promise.resolve(null));
      storage.take = jest.fn(() => Promise.resolve());

      return connector.dequeue()
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.EmptyQueueError);
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).not.toHaveBeenCalled();
        });
    });

    it('should reject if no taking from storage failed', () => {
      const id = ' item42';
      const error = 'some error';

      client.rpop = jest.fn(() => Promise.resolve(id));
      storage.take = jest.fn(() => Promise.reject(error));

      return connector.dequeue()
        .catch((err) => {
          expect(err).toBe(error);
          expect(err).not.toBeInstanceOf(errors.NotFoundItemError);
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });
  });

  describe('remove(): ', () => {
    it('should resolve with false if no id specified', () => {
      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.remove()
        .then((res) => {
          expect(res).toBeFalsy();
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.take).not.toHaveBeenCalled();
          expect(connector.isExist).not.toHaveBeenCalled();
        });
    });

    it('should remove id from queue and take item from storage', () => {
      const id = ' item42';

      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.remove(id)
        .then(() => {
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });

    it('should reject if no key exists', () => {
      const id = 'item42';

      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.remove(id)
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.NotFoundItemError);
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.take).not.toHaveBeenCalled();
        });
    });

    it('should reject if no key exists in storage', () => {
      const id = 'item42';
      const error = new storage.errors.NotFoundItemError(id);

      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.remove(id)
        .catch((err) => {
          expect(err).toBeInstanceOf(errors.NotFoundItemError);
          expect(storage.take).toHaveBeenCalledWith(id);
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
        });
    });

    it('should reject if taking from storage failed', () => {
      const id = 'item42';
      const error = 'some error';

      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.remove(id)
        .catch((err) => {
          expect(err).toBe(error);
          expect(err).not.toBeInstanceOf(errors.OverrideItemError);
          expect(storage.take).toHaveBeenCalledWith(id);
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
        });
    });
  });

  describe('getPeak(): ', () => {
    it('should return null if no ids in queue (empty array)', () => {
      client.lrange = jest.fn(() => Promise.resolve([]));
      storage.get = jest.fn(() => Promise.resolve());

      return connector.getPeak()
        .then((peak) => {
          expect(peak).toBeNull();
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, -1, -1);
          expect(storage.get).not.toHaveBeenCalled();
        });
    });

    it('should return null if no ids in queue (null)', () => {
      client.lrange = jest.fn(() => Promise.resolve(null));
      storage.get = jest.fn(() => Promise.resolve());

      return connector.getPeak()
        .then((peak) => {
          expect(peak).toBeNull();
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, -1, -1);
          expect(storage.get).not.toHaveBeenCalled();
        });
    });

    it('should return item if id is in queue (single elem array)', () => {
      const id = ' item42';
      const storedCall = {
        _id: 'item42',
      };
      client.lrange = jest.fn(() => Promise.resolve([id]));
      storage.get = jest.fn(() => Promise.resolve(storedCall));

      return connector.getPeak()
        .then((peak) => {
          expect(peak).toEqual(storedCall);
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, -1, -1);
          expect(storage.get).toHaveBeenCalledWith(id);
        });
    });

    it('should return item if id is in queue (single elem)', () => {
      const id = ' item42';
      const storedCall = {
        _id: 'item42',
      };
      client.lrange = jest.fn(() => Promise.resolve(id));
      storage.get = jest.fn(() => Promise.resolve(storedCall));

      return connector.getPeak()
        .then((peak) => {
          expect(peak).toEqual(storedCall);
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, -1, -1);
          expect(storage.get).toHaveBeenCalledWith(id);
        });
    });
  });
});
