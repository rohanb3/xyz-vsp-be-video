jest.mock('@/services/callsStorage');
jest.mock('@/services/redisClient');

const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');
const { createConnector } = require('@/services/heap/connector');

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

      return connector.isExist(id)
        .then((res) => {
          expect(res).toBeTruthy();
          expect(client.sismember)
            .toHaveBeenCalledWith(HEAP_NAME, id);
        });
    });

    it('should return false if key does not exist', () => {
      const id = '123';
      client.sismember = jest.fn(() => Promise.resolve(0));

      return connector.isExist(id)
        .then((res) => {
          expect(res).toBeFalsy();
          expect(client.sismember)
            .toHaveBeenCalledWith(HEAP_NAME, id);
        });
    });
  });

  describe('getSize(): ', () => {
    it('should return size', () => {
      const size = 42;
      client.scard = jest.fn(() => Promise.resolve(size));

      return connector.getSize()
        .then((res) => {
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

      return connector.add(id, call)
        .then(() => {
          expect(client.sadd)
            .toHaveBeenCalledWith(HEAP_NAME, id);
          expect(storage.set).toHaveBeenCalledWith(id, call);
        });
    });
  });

  describe('get(): ', () => {
    it('should return null if no key exists', () => {
      const id = 'call42';

      client.sismember = jest.fn(() => Promise.resolve(false));
      storage.get = jest.fn(() => Promise.resolve());

      return connector.get(id)
        .then((res) => {
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

      return connector.get(id)
        .then((res) => {
          expect(res).toEqual(call);
          expect(storage.get).toHaveBeenCalledWith(id);
        });
    });
  });

  describe('take(): ', () => {
    it('should remove key and then remove value', () => {
      const id = 'call42';

      client.srem = jest.fn(() => Promise.resolve());
      storage.take = jest.fn(() => Promise.resolve());

      return connector.take(id)
        .then(() => {
          expect(client.srem)
            .toHaveBeenCalledWith(HEAP_NAME, id);
          expect(storage.take).toHaveBeenCalledWith(id);
        });
    });
  });
});
