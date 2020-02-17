jest.mock('@/services/storage');
jest.mock('@/services/redisClient');

const storage = require('@/services/storage');
const client = require('@/services/redisClient');
const { createConnector } = require('@/services/heap/connector');
const errors = require('@/services/heap/errors');

const HEAP_NAME = 'test.heap';

let connector = null;

describe('HeapConnector: ', () => {
  beforeEach(() => {
    connector = createConnector(HEAP_NAME);
  });

  describe('isExist(): ', () => {
    it('should return true if key exists', () => {
      const id = '123';
      client.sismember = jest.fn(() => Promise.resolve(1));

      return connector.isExist(id).then(res => {
        expect(res).toBeTruthy();
        expect(client.sismember).toHaveBeenCalledWith(HEAP_NAME, id);
      });
    });

    it('should return false if key does not exist', () => {
      const id = '123';
      client.sismember = jest.fn(() => Promise.resolve(0));

      return connector.isExist(id).then(res => {
        expect(res).toBeFalsy();
        expect(client.sismember).toHaveBeenCalledWith(HEAP_NAME, id);
      });
    });
  });

  describe('getSize(): ', () => {
    it('should return size', () => {
      const size = 42;
      client.scard = jest.fn(() => Promise.resolve(size));

      return connector.getSize().then(res => {
        expect(res).toBe(size);
        expect(client.scard).toHaveBeenCalled();
      });
    });
  });

  describe('add(): ', () => {
    it('should add key and then add value', () => {
      const id = 'call42';
      const call = {
        _id: 'call42',
      };

      client.sadd = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.add(id, call).then(() => {
        expect(client.sadd).toHaveBeenCalledWith(HEAP_NAME, id);
        expect(storage.set).toHaveBeenCalledWith(id, call);
      });
    });

    it('should reject and cleanup if save to storage failed', () => {
      const id = 'call42';
      const call = {
        _id: 'call42',
      };
      const error = 'some error';

      client.sadd = jest.fn(() => Promise.resolve());
      client.srem = jest.fn(() => Promise.resolve());
      storage.set = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.add(id, call).catch(err => {
        expect(err).toBe(error);
        expect(err).not.toBeInstanceOf(errors.OverrideItemError);
        expect(client.sadd).toHaveBeenCalledWith(HEAP_NAME, id);
        expect(storage.set).toHaveBeenCalledWith(id, call);
        expect(client.srem).toHaveBeenCalledWith(HEAP_NAME, id);
      });
    });
  });

  describe('get(): ', () => {
    it('should return null if no key exists', () => {
      const id = 'call42';

      client.sismember = jest.fn(() => Promise.resolve(false));
      storage.get = jest.fn(() => Promise.resolve());

      return connector.get(id).then(res => {
        expect(res).toBeNull();
        expect(storage.get).not.toHaveBeenCalled();
      });
    });

    it('should return value from storage if key exists', () => {
      const id = 'call42';
      const call = {
        _id: 'call42',
      };

      client.sismember = jest.fn(() => Promise.resolve(true));
      storage.get = jest.fn(() => Promise.resolve(call));

      return connector.get(id).then(res => {
        expect(res).toEqual(call);
        expect(storage.get).toHaveBeenCalledWith(id);
      });
    });
  });

  describe('getAll(): ', () => {
    it('should return value for existed keys', () => {
      const callIds = ['call32', 'call81'];
      const calls = [
        {
          id: 'call32',
          requestedBy: '124',
          acceptedBy: '312',
        },
        {
          id: 'call81',
          requestedBy: '123',
          acceptedBy: '314',
        },
      ];
      client.smembers = jest.fn().mockResolvedValue(callIds);
      storage.getMultiple = jest.fn().mockResolvedValue(calls);
      return connector.getAll().then(res => {
        expect(res).toStrictEqual(calls);
        expect(storage.getMultiple).toHaveBeenCalledWith(callIds);
      });
    });
  });

  describe('take(): ', () => {
    it('should remove key and then remove value', () => {
      const id = 'call42';

      client.srem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());

      return connector.take(id).then(() => {
        expect(client.srem).toHaveBeenCalledWith(HEAP_NAME, id);
        expect(storage.take).toHaveBeenCalledWith(id);
      });
    });

    it('should reject if no key exists', () => {
      const id = 'call42';

      client.srem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());
      connector.isExist = jest.fn(() => Promise.resolve(false));

      return connector.take(id).catch(err => {
        expect(err).toBeInstanceOf(errors.NotFoundItemError);
        expect(client.srem).not.toHaveBeenCalled();
        expect(storage.take).not.toHaveBeenCalled();
      });
    });

    it('should reject if no key exists in storage', () => {
      const id = 'call42';
      const error = new storage.errors.NotFoundItemError(id);

      client.srem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.take(id).catch(err => {
        expect(err).toBeInstanceOf(errors.NotFoundItemError);
        expect(client.srem).toHaveBeenCalledWith(HEAP_NAME, id);
        expect(storage.take).toHaveBeenCalledWith(id);
      });
    });

    it('should reject if taking from storage failed', () => {
      const id = 'call42';
      const error = 'some error';

      client.srem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.reject(error));
      connector.isExist = jest.fn(() => Promise.resolve(true));

      return connector.take(id).catch(err => {
        expect(err).not.toBeInstanceOf(errors.NotFoundItemError);
        expect(client.srem).toHaveBeenCalledWith(HEAP_NAME, id);
        expect(storage.take).toHaveBeenCalledWith(id);
      });
    });
  });

  describe('update(): ', () => {
    it('should resolve with false if no key specified', () => {
      connector.isExist = jest.fn(() => Promise.resolve(false));
      storage.update = jest.fn(() => Promise.resolve());

      return connector.update().then(res => {
        expect(res).toBeFalsy();
        expect(connector.isExist).not.toHaveBeenCalled();
        expect(storage.update).not.toHaveBeenCalled();
      });
    });

    it('should reject with not found if key not exists', () => {
      const id = 'call42';
      connector.isExist = jest.fn(() => Promise.resolve(false));
      storage.update = jest.fn(() => Promise.resolve());

      return connector.update(id).catch(err => {
        expect(err).toBeInstanceOf(errors.NotFoundItemError);
        expect(storage.update).not.toHaveBeenCalled();
      });
    });

    it('should update value ins storage', () => {
      const id = 'call42';
      const updates = {
        success: true,
      };
      connector.isExist = jest.fn(() => Promise.resolve(true));
      storage.update = jest.fn(() => Promise.resolve());

      return connector.update(id, updates).catch(err => {
        expect(err).toBeInstanceOf(errors.NotFoundItemError);
        expect(storage.update).toHaveBeenCalledWith(id, updates);
      });
    });
  });
});
