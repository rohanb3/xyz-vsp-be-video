jest.mock('@/services/callsStorage');
jest.mock('@/services/redisClient');

const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');
const { createConnector } = require('@/services/queue/connector');

const QUEUE_NAME = 'queue.test';

let connector = null;

describe('queue connector: ', () => {
  beforeEach(() => {
    connector = createConnector(QUEUE_NAME);
  });

  describe('isExist(): ', () => {
    let items = null;

    beforeEach(() => {
      items = ['call77', 'call42'];
      client.lrange = jest.fn(() => Promise.resolve(items));
    });

    it('should return true if key exists', () => {
      const id = 'call42';
      return connector.isExist(id)
        .then((exist) => {
          expect(exist).toBeTruthy();
          expect(client.lrange).toHaveBeenCalledWith(QUEUE_NAME, 0, -1);
        });
    });

    it('should return false if no key exists', () => {
      const id = 'call12';
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
    it('should set id to queue and add call to storage', () => {
      const id = ' call42';
      const call = {
        _id: 'call42',
      };

      client.lpush = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.resolve());

      return connector.enqueue(id, call)
        .then(() => {
          expect(client.lpush).toHaveBeenCalledWith(QUEUE_NAME, id);
          expect(storage.set).toHaveBeenCalledWith(id, call);
        });
    });
  });

  describe('dequeue(): ', () => {
    it('should return null and do not take call from storage if no ids in queue', () => {
      client.rpop = jest.fn(() => Promise.resolve(null));
      storage.take = jest.fn(() => Promise.resolve());

      return connector.dequeue()
        .then(() => {
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).not.toHaveBeenCalled();
        });
    });

    it('should remove id from queue and take call from storage', () => {
      const id = ' call42';
      const storedCall = {
        _id: 'call42',
      };

      client.rpop = jest.fn(() => Promise.resolve(id));
      storage.take = jest.fn(() => Promise.resolve(storedCall));

      return connector.dequeue()
        .then((call) => {
          expect(call).toEqual(storedCall);
          expect(client.rpop).toHaveBeenCalledWith(QUEUE_NAME);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });
  });

  describe('remove(): ', () => {
    it('should not remove id or call if no id specified', () => {
      client.lrem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());

      return connector.remove()
        .then((call) => {
          expect(call).toBeNull();
          expect(client.lrem).not.toHaveBeenCalled();
          expect(storage.take).not.toHaveBeenCalled();
        });
    });

    it('should remove id from queue and take call from storage', () => {
      const id = ' call42';
      const storedCall = {
        _id: 'call42',
      };

      client.lrem = jest.fn(() => Promise.resolve(id));
      storage.take = jest.fn(() => Promise.resolve(storedCall));

      return connector.remove(id)
        .then((call) => {
          expect(call).toEqual(storedCall);
          expect(client.lrem).toHaveBeenCalledWith(QUEUE_NAME, 1, id);
          expect(storage.take).toHaveBeenCalledWith(id);
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

    it('should return call if id is in queue (single elem array)', () => {
      const id = ' call42';
      const storedCall = {
        _id: 'call42',
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

    it('should return call if id is in queue (single elem)', () => {
      const id = ' call42';
      const storedCall = {
        _id: 'call42',
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
