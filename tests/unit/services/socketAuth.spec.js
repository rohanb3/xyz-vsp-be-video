jest.mock('@/services/twilio');
jest.mock('@/services/twilio');

const { connectionsHeap } = require('@/services/connectionsHeap');
const {
  authenticateCustomer,
  authenticateOperator,
} = require('@/services/socketAuth');
const publicApi = require('@/services/httpServices/publicApiRequests');
const identityApi = require('@/services/httpServices/identityApiRequests');

let socket = null;

describe('socketAuth: ', () => {
  beforeEach(() => {
    socket = {};
  });

  describe('authenticateOperator(): ', () => {
    it('should call callback with token and assign identity to socket', () => {
      const callbackOldDelete = jest.fn();
      const callback = jest.fn();
      const data = { identity: '42' };
      const expectedToken = 'token';
      const tenantId = 'spectrum';

      connectionsHeap.get = jest.fn(() => Promise.resolve(false));
      identityApi.getCompanyIdByUserId = jest.fn(() => Promise.resolve());
      identityApi.checkTokenValidity = jest.fn().mockResolvedValue(true);
      publicApi.getTenantIdByCompanyId = jest.fn(() =>
        Promise.resolve(tenantId)
      );

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        const token = callback.mock.calls[0][1];

        expect(callback).toHaveBeenCalledWith(null, expectedToken);
        expect(token).toBe(expectedToken);
        expect(socket.identity).toBe('42');
      });
    });

    // it('should call callback with error if already connected', () => {
    //   const callback = jest.fn();
    //   const data = { identity: '42' };

    //   connectionsHeap.isExist = jest.fn(() => Promise.resolve(true));

    //   return authenticateOperator(socket, data, callback).then(() => {
    //     const error = callback.mock.calls[0][0];

    //     expect(callback).toHaveBeenCalledWith(expect.any(Error));
    //     expect(error.message).toBe('already.logged.in');
    //   });
    // });

    it('should call callback with error if no identity provided', () => {
      const callbackOldDelete = jest.fn();
      const callback = jest.fn();
      const data = {};

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        const error = callback.mock.calls[0][0];

        expect(callback).toHaveBeenCalledWith(expect.any(Error));
        expect(error.message).toBe('identity.not.provided');
      });
    });
  });

  describe('authenticateCustomer(): ', () => {
    it('should call callback with token and assign deviceId and identity to socket', () => {
      const callback = jest.fn();
      const data = { identity: '42', deviceId: '777' };
      const expectedToken = 'token';

      return authenticateCustomer(socket, data, callback).then(() => {
        const token = callback.mock.calls[0][1];

        expect(callback).toHaveBeenCalledWith(null, expectedToken);
        expect(token).toBe(expectedToken);
        expect(socket.identity).toBe('42');
        expect(socket.deviceId).toBe('777');
      });
    });

    it('should call callback with error if no identity provided', () => {
      const callback = jest.fn();
      const data = {};

      return authenticateCustomer(socket, data, callback).then(() => {
        const error = callback.mock.calls[0][0];

        expect(callback).toHaveBeenCalledWith(expect.any(Error));
        expect(error.message).toBe('identity.not.provided');
      });
    });

    it('should call callback with error if no deviceId provided', () => {
      const callback = jest.fn();
      const data = { identity: '42' };

      return authenticateCustomer(socket, data, callback).then(() => {
        const error = callback.mock.calls[0][0];

        expect(callback).toHaveBeenCalledWith(expect.any(Error));
        expect(error.message).toBe('device.id.not.provided');
      });
    });
  });
});
