jest.mock('@/services/redisClient');
jest.mock('@/services/serializer');

const storage = require('@/services/storage');
const client = require('@/services/redisClient');

describe('storage: ', () => {
  describe('get(): ', () => {
    it('should return null if no key specified', () => {
      const id = null;
      client.get = jest.fn(() => Promise.resolve(null));
      client.exists = jest.fn(() => Promise.resolve(true));

      return storage.get(id)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.get).not.toHaveBeenCalled();
        });
    });

    it('should return value if it is stored under the key', () => {
      const id = 'key42';
      const storedCall = { _id: '42' };
      client.get = jest.fn(() => Promise.resolve(storedCall));
      client.exists = jest.fn(() => Promise.resolve(true));

      return storage.get(id)
        .then((res) => {
          expect(res).toEqual(storedCall);
          expect(client.get).toHaveBeenCalledWith(id);
        });
    });

    it('should reject if no value exists', () => {
      const id = 'key42';
      client.get = jest.fn(() => Promise.resolve());
      client.exists = jest.fn(() => Promise.resolve(false));

      return storage.get(id)
        .catch((err) => {
          expect(err).toBeInstanceOf(storage.errors.NotFoundItemError);
        });
    });

    it('should reject if operation failed', () => {
      const id = 'key42';
      const error = 'some error';
      client.get = jest.fn(() => Promise.reject(error));
      client.exists = jest.fn(() => Promise.resolve(true));

      return storage.get(id)
        .catch((err) => {
          expect(err).toBe(error);
        });
    });
  });

  describe('set(): ', () => {
    it('should return null if no key specified', () => {
      const id = null;
      client.set = jest.fn(() => Promise.resolve({}));

      return storage.set(id)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.set).not.toHaveBeenCalled();
        });
    });

    it('should return value if value was stored', () => {
      const id = 'key42';
      const call = { _id: '42' };
      client.set = jest.fn(() => Promise.resolve(call));
      client.exists = jest.fn(() => Promise.resolve(false));

      return storage.set(id, call)
        .then((res) => {
          expect(res).toEqual(call);
          expect(client.set).toHaveBeenCalledWith(id, call);
        });
    });

    it('should reject if key already exists', () => {
      const id = 'key42';
      const call = { _id: '42' };
      client.exists = jest.fn(() => Promise.resolve(true));
      client.set = jest.fn(() => Promise.reolve());

      return storage.set(id, call)
        .catch((err) => {
          expect(err).toBeInstanceOf(storage.errors.OverrideItemError);
        });
    });

    it('should reject if operation failed', () => {
      const id = 'key42';
      const call = { _id: '42' };
      const error = 'some error';
      client.exists = jest.fn(() => Promise.resolve(false));
      client.set = jest.fn(() => Promise.reject(error));

      return storage.set(id, call)
        .catch((err) => {
          expect(err).toBe(error);
        });
    });
  });

  describe('take(): ', () => {
    it('should be resolved with null if no key specified', () => {
      const key = null;

      client.get = jest.fn(() => Promise.resolve());
      client.del = jest.fn(() => Promise.resolve());

      return storage.take(key)
        .then((res) => {
          expect(res).toEqual(null);
          expect(client.get).not.toHaveBeenCalled();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should be resolved with value if key exists', () => {
      const id = 'key42';
      const storedCall = { _id: '42' };

      client.get = jest.fn(() => Promise.resolve(storedCall));
      client.del = jest.fn(() => Promise.resolve(null));
      client.exists = jest.fn(() => Promise.resolve(true));

      return storage.take(id)
        .then((res) => {
          expect(res).toEqual(storedCall);
          expect(client.get).toHaveBeenCalledWith(id);
          expect(client.del).toHaveBeenCalledWith(id);
        });
    });

    it('should be rejected with error if key not exists', () => {
      const id = 'key42';
      const storedCall = { _id: '42' };

      client.get = jest.fn(() => Promise.resolve(storedCall));
      client.del = jest.fn(() => Promise.resolve(null));
      client.exists = jest.fn(() => Promise.resolve(false));

      return storage.take(id)
        .catch((err) => {
          expect(err).toBeInstanceOf(storage.errors.NotFoundItemError);
          expect(client.get).not.toHaveBeenCalled();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should be rejected if error is thrown in get', () => {
      const error = 'some error';

      client.get = jest.fn(() => Promise.reject(error));
      client.exists = jest.fn(() => Promise.resolve(true));
      client.del = jest.fn(() => Promise.resolve(null));

      return storage.take('123')
        .catch((res) => {
          expect(res).toEqual(error);
          expect(client.get).toHaveBeenCalled();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should be rejected if error is thrown in del', () => {
      const error = 'some error';

      client.get = jest.fn(() => Promise.resolve(null));
      client.exists = jest.fn(() => Promise.resolve(true));
      client.del = jest.fn(() => Promise.reject(error));

      return storage.take('123')
        .catch((res) => {
          expect(res).toEqual(error);
          expect(client.get).toHaveBeenCalled();
          expect(client.del).toHaveBeenCalled();
        });
    });
  });

  describe('remove(): ', () => {
    it('should resolve with false if no key specified', () => {
      client.exists = jest.fn(() => Promise.resolve(true));
      client.del = jest.fn(() => Promise.resolve(null));

      return storage.remove()
        .then((res) => {
          expect(res).toBeFalsy();
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should reject with error if no item exists', () => {
      const id = 'item42';

      client.exists = jest.fn(() => Promise.resolve(false));
      client.del = jest.fn(() => Promise.resolve(null));

      return storage.remove(id)
        .catch((err) => {
          expect(err).toBeInstanceOf(storage.errors.NotFoundItemError);
          expect(client.del).not.toHaveBeenCalled();
        });
    });

    it('should reject with error if item deletion failed', () => {
      const id = 'item42';
      const error = 'some error';

      client.exists = jest.fn(() => Promise.resolve(true));
      client.del = jest.fn(() => Promise.reject(error));

      return storage.remove(id)
        .catch((err) => {
          expect(err).toBe(error);
          expect(client.del).toHaveBeenCalledWith(id);
        });
    });
  });
});
