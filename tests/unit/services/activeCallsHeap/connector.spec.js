jest.mock('@/services/callsStorage');
jest.mock('@/services/redisClient');

const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');
const connector = require('@/services/activeCallsHeap/connector');
const { CALLS_ACTIVE } = require('@/services/activeCallsHeap/constants');

describe('activeCallsHeap connector: ', () => {
  describe('isExist(): ', () => {
    it('should return true if key exists', () => {
      const id = '123';
      client.sismember = jest.fn(() => Promise.resolve(1));

      return connector.isExist(id)
        .then((res) => {
          expect(res).toBeTruthy();
          expect(client.sismember)
            .toHaveBeenCalledWith(CALLS_ACTIVE, id);
        });
    });

    it('should return false if key does not exist', () => {
      const id = '123';
      client.sismember = jest.fn(() => Promise.resolve(0));

      return connector.isExist(id)
        .then((res) => {
          expect(res).toBeFalsy();
          expect(client.sismember)
            .toHaveBeenCalledWith(CALLS_ACTIVE, id);
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
            .toHaveBeenCalledWith(CALLS_ACTIVE, id);
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

  describe('remove(): ', () => {
    it('should remove key and then remove value', () => {
      const id = 'call42';

      client.srem = jest.fn(() => Promise.resolve());
      storage.remove = jest.fn(() => Promise.resolve());

      return connector.remove(id)
        .then(() => {
          expect(client.srem)
            .toHaveBeenCalledWith(CALLS_ACTIVE, id);
          expect(storage.remove).toHaveBeenCalledWith(id);
        });
    });
  });
});
