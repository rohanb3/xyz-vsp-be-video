jest.mock('@/services/twilio');
jest.mock('@/services/twilio');

const { connectionsHeap } = require('@/services/connectionsHeap');
const {
  authenticateCustomer,
  authenticateOperator,
  verifyConnectionToken,
  checkConnectionPermission
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

      const identity = '42';
      const securityToken = 'some-security-token';
      const data = {
        identity,
        token: securityToken,
      };
      const role = 'user-role';
      const scopes = ['first-scope'];
      const companyId = 2222;
      const profile = {
        role,
        scopes,
        companyId,
      };
      const expectedToken = 'token';
      const tenantId = 'spectrum';

      connectionsHeap.get = jest.fn().mockResolvedValue(false);
      identityApi.getUserProfile = jest.fn().mockResolvedValue(profile);
      publicApi.getTenantIdByCompanyId = jest.fn().mockResolvedValue(tenantId);

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        const token = callback.mock.calls[0][1];

        expect(identityApi.getUserProfile).toHaveBeenCalledWith(securityToken);
        expect(publicApi.getTenantIdByCompanyId).toHaveBeenCalledWith(
          companyId
        );
        expect(callback).toHaveBeenCalledWith(null, expectedToken);
        expect(token).toBe(expectedToken);

        expect(socket.identity).toBe('42');
        expect(socket.securityToken).toBe(securityToken);
        expect(socket.tenantId).toBe(tenantId);

        expect(socket.role).toBe(role);
        expect(socket.permissions).toBe(scopes);
      });
    });

    it('should call callbackOldDelete if socket already connected', () => {
      const callbackOldDelete = jest.fn();
      const callback = jest.fn();
      const data = { identity: '42' };

      const socketId = '15';
      const oldSocket = {
        socketId,
      };

      connectionsHeap.get = jest.fn(() => Promise.resolve(oldSocket));

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        expect(callbackOldDelete).toHaveBeenCalledWith(socketId);
      });
    });

    it('should call callbackOldDelete with current socketId if old socket is connected and still on call', () => {
      const callbackOldDelete = jest.fn();
      const callback = jest.fn();
      const data = { identity: '42' };

      const socketId = '12';
      const oldSocketId = '16';
      socket.id = socketId;

      const oldSocket = {
        socketId: oldSocketId,
        activeCallId: 'callid',
      };

      connectionsHeap.get = jest.fn(() => Promise.resolve(oldSocket));

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        expect(callbackOldDelete).toHaveBeenCalledWith(socketId);
      });
    });

    it("should call callback with TOKEN_INVALID error profile couldn't be loaded", () => {
      const callbackOldDelete = jest.fn();
      const callback = jest.fn();
      const data = {
        identity: 'identity',
        token: 'some-security-token',
      };

      identityApi.getUserProfile = jest.fn().mockRejectedValue({});

      return authenticateOperator(
        callbackOldDelete,
        socket,
        data,
        callback
      ).then(() => {
        const error = callback.mock.calls[0][0];

        expect(callback).toHaveBeenCalledWith(expect.any(Error));
        expect(error.message).toBe('token.invalid');
      });
    });

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

      const companyId = '3455';
      const tenantId = '134';
      const identity = '42';
      const deviceId = '777';
      const securityToken = 'security-token';
      const data = { identity, deviceId, token: securityToken };
      const expectedToken = 'token';

      identityApi.checkTokenValidity = jest.fn().mockResolvedValue(true);
      identityApi.getCompanyIdByUserId = jest.fn().mockResolvedValue(companyId);
      publicApi.getTenantIdByCompanyId = jest.fn().mockResolvedValue(tenantId);

      return authenticateCustomer(socket, data, callback).then(() => {
        const token = callback.mock.calls[0][1];

        expect(callback).toHaveBeenCalledWith(null, expectedToken);
        expect(token).toBe(expectedToken);

        expect(identityApi.checkTokenValidity).toHaveBeenCalledWith(
          securityToken
        );
        expect(identityApi.getCompanyIdByUserId).toHaveBeenCalledWith(identity);
        expect(publicApi.getTenantIdByCompanyId).toHaveBeenCalledWith(
          companyId
        );

        expect(socket.identity).toBe(identity);
        expect(socket.deviceId).toBe(deviceId);
        expect(socket.tenantId).toBe(tenantId);
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

  describe('verifyConnectionToken(): ', () => {
    it('should load user profile to verify security token and return true if token is valid', async () => {
      const scopes = ['scope.1', 'scope.2'];
      const profile = {
        scopes,
      };

      const securityToken = 'security-token';
      const connection = {
        securityToken,
      };

      identityApi.getUserProfile = jest.fn().mockResolvedValue(profile);

      const promise = verifyConnectionToken(connection);
      await expect(promise).resolves.toBe(true);

      expect(identityApi.getUserProfile).toHaveBeenCalledWith(securityToken);
      expect(connection.securityTokenLastChecked).toBeDefined();
      expect(connection.permissions).toBe(scopes);
    });
  });

  it('should return false if token is invalid', async () => {
    const securityToken = 'security-token';
    const connection = {
      securityToken,
    };

    identityApi.getUserProfile = jest.fn().mockRejectedValue({});

    const promise = verifyConnectionToken(connection);
    await expect(promise).resolves.toBe(false);

    expect(identityApi.getUserProfile).toHaveBeenCalledWith(securityToken);
  });

  it('should return true without loading profile if it was loaded less than 1 min ago', async () => {
    const profile = {};

    const securityToken = 'security-token';
    const connection = {
      securityToken,
      securityTokenLastChecked: new Date().getTime() - 59 * 1000, // 59 sec ago
    };

    identityApi.getUserProfile = jest.fn().mockResolvedValue(profile);

    const promise = verifyConnectionToken(connection);
    await expect(promise).resolves.toBe(true);

    expect(identityApi.getUserProfile).not.toHaveBeenCalled();
  });

  describe('checkConnectionPermission(): ', () => {
    it('should return true if connection permissions contain permission', () => {
      const permissions = ['permission.1', 'permission.2'];
      const connection = {
        permissions,
      };

      expect(checkConnectionPermission(connection, 'permission.1')).toBe(true);
    });

    it("should return false if connection permissions doesn't contain permission", () => {
      const permissions = ['permission.1', 'permission.2'];
      const connection = {
        permissions,
      };

      expect(checkConnectionPermission(connection, 'permission.3')).toBe(false);
    });
  });
});
