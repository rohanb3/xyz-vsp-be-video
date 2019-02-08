const redisUtils = require('@/services/redisUtils');

describe('redisUtils: ', () => {
  describe('promiser(): ', () => {
    it('should return callback which will reject promise if err specified', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const trigger = redisUtils.promiser(resolve, reject);
      const error = 'some error';

      trigger(error);

      expect(reject).toHaveBeenCalledWith(error);
      expect(resolve).not.toHaveBeenCalled();
    });

    it('should return callback which will resolve promise if no err specified', () => {
      const resolve = jest.fn();
      const reject = jest.fn();
      const trigger = redisUtils.promiser(resolve, reject);
      const data = 'some data';

      trigger(null, data);

      expect(resolve).toHaveBeenCalledWith(data);
      expect(reject).not.toHaveBeenCalled();
    });
  });

  describe('reduceToKey(): ', () => {
    it('should generate string with : delimiter', () => {
      const keys = ['my', 'test', 'key'];
      const expectedKEy = 'my:test:key';

      const result = redisUtils.reduceToKey(...keys);

      expect(result).toEqual(expectedKEy);
    });
  });
});
