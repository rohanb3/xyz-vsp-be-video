jest.mock('@/services/redisClient');

const storage = require('@/services/callsStorage');
const client = require('@/services/redisClient');

describe('callsStorage: ', () => {
  describe('get(): ', () => {
    it('should return null if no value stored under the key', () => {
      const id = null;
      client.hgetall = jest.fn(() => Promise.resolve(null));

      return storage.get(id)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.hgetall).not.toHaveBeenCalled();
        });
    });

    it('should return value if it is stored under the key', () => {
      const id = 'key42';
      const storedCall = { _id: '42' };
      client.hgetall = jest.fn(() => Promise.resolve(storedCall));

      return storage.get(id)
        .then((res) => {
          expect(res).toEqual(storedCall);
          expect(client.hgetall).toHaveBeenCalledWith(id);
        });
    });

    it('should reject if operation failed', () => {
      const id = 'key42';
      const error = 'some error';
      client.hgetall = jest.fn(() => Promise.reject(error));

      return storage.get(id)
        .catch((err) => {
          expect(err).toBe(error);
        });
    });
  });

  describe('set(): ', () => {
    it('should return null if no key specified', () => {
      const id = null;
      client.hmset = jest.fn(() => Promise.resolve({}));

      return storage.set(id)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.hmset).not.toHaveBeenCalled();
        });
    });

    it('should return value if value was stored', () => {
      const id = 'key42';
      const call = { _id: '42' };
      client.hmset = jest.fn(() => Promise.resolve(call));

      return storage.set(id, call)
        .then((res) => {
          expect(res).toEqual(call);
          expect(client.hmset).toHaveBeenCalledWith(id, call);
        });
    });

    it('should reject if operation failed', () => {
      const id = 'key42';
      const call = { _id: '42' };
      const error = 'some error';
      client.hmset = jest.fn(() => Promise.reject(error));

      return storage.set(id, call)
        .catch((err) => {
          expect(err).toBe(error);
        });
    });
  });

  describe('take(): ', () => {
    it('should be resolved with null if no key specified', () => {
      const key = null;

      client.hgetall = jest.fn(() => Promise.resolve());
      client.del = jest.fn(() => Promise.resolve());

      return storage.take(key)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.hgetall).not.toHaveBeenCalled();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should be resolved with value if key exists', () => {
      const id = 'key42';
      const storedCall = { _id: '42' };

      client.hgetall = jest.fn(() => Promise.resolve(storedCall));
      client.del = jest.fn(() => Promise.resolve(null));

      return storage.take(id)
        .then((res) => {
          expect(res).toEqual(storedCall);
          expect(client.hgetall).toHaveBeenCalledWith(id);
          expect(client.del).toHaveBeenCalledWith(id);
        });
    });

    it('should be rejected if error is thrown in hgetall', () => {
      const error = 'some error';

      client.hgetall = jest.fn(() => Promise.reject(error));
      client.del = jest.fn(() => Promise.resolve(null));

      return storage.take('123')
        .catch((res) => {
          expect(res).toEqual(error);
          expect(client.hgetall).toHaveBeenCalled();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should be rejected if error is thrown in del', () => {
      const error = 'some error';

      client.hgetall = jest.fn(() => Promise.resolve(null));
      client.del = jest.fn(() => Promise.reject(error));

      return storage.take('123')
        .catch((res) => {
          expect(res).toEqual(error);
          expect(client.hgetall).toHaveBeenCalled();
          expect(client.del).toHaveBeenCalled();
        });
    });
  });
});
