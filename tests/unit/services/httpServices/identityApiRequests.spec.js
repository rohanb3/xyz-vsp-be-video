jest.mock('@/services/twilio');

const {
  _api: api,
  getUserProfile,
  checkUserScope,
  checkTokenValidity,
} = require('@/services/httpServices/identityApiRequests');

const { TOKEN_INVALID, FORBIDDEN } = require('@/constants/connection');

describe('identityApiRequests', () => {
  describe('getUserProfile(): ', () => {
    it('should load user profile with given security token', async () => {
      const token = 'security-token';
      const profile = {
        role: 'role',
        companyId: 123,
        scopes: ['scope.1', 'scope.2'],
      };

      api.get = jest.fn().mockResolvedValue({ data: profile });

      const promise = getUserProfile(token);

      await expect(promise).resolves.toBe(profile);

      expect(api.get).toHaveBeenCalledWith(
        'users/profile',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );
    });

    it('should rejects if token is invalid', async () => {
      const token = 'security-token';

      api.get = jest.fn().mockRejectedValue({});

      const promise = getUserProfile(token);

      await expect(promise).rejects.toMatchObject({});
    });

    it('should rejects if token is absent', async () => {
      api.get = jest.fn().mockResolvedValue({});

      const promise = getUserProfile();

      await expect(promise).rejects.toMatchObject({
        message: 'Token is required',
      });
    });
  });

  describe('checkTokenValidity(): ', () => {
    it('should return true if token is valid', async () => {
      const token = 'security-token';
      api.get = jest.fn().mockResolvedValue({});

      const promise = checkTokenValidity(token);

      await expect(promise).resolves.toBe(true);
      expect(api.get).toHaveBeenCalled();
    });

    it('should return false if token is non valid', async () => {
      const token = 'security-token';
      api.get = jest.fn().mockRejectedValue({});

      const promise = checkTokenValidity(token);

      await expect(promise).resolves.toBe(false);
      expect(api.get).toHaveBeenCalled();
    });

    it('should return false if token was not passed', async () => {
      api.get = jest.fn().mockRejectedValue({});

      const promise = checkTokenValidity();

      await expect(promise).resolves.toBe(false);
      expect(api.get).not.toHaveBeenCalled();
    });
  });
  describe('checkUserScope():', () => {
    it('should return true if user have an access to scope ', async () => {
      api.head = jest.fn().mockResolvedValue();
      const role = 'role';
      const scope = 'scope';
      const token = 'token';

      const promise = checkUserScope(token, role, scope);

      await expect(promise).resolves.toBe(true);
      expect(api.head).toHaveBeenCalledWith('role', {
        headers: { Authorization: token },
        params: { role: role, scope: scope },
      });
    });

    it('should reject if user have no access to scope ', async () => {
      api.head = jest.fn().mockRejectedValue({ response: { status: 403 } });
      const role = 'role';
      const scope = 'scope';
      const token = 'token';

      const promise = checkUserScope(token, role, scope);

      await expect(promise).rejects.toBe(FORBIDDEN);
      expect(api.head).toHaveBeenCalledWith('role', {
        headers: { Authorization: token },
        params: { role: role, scope: scope },
      });
    });

    it('should reject if user have not valid token ', async () => {
      api.head = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const role = 'role';
      const scope = 'scope';
      const token = 'token';

      const promise = checkUserScope(token, role, scope);

      await expect(promise).rejects.toBe(TOKEN_INVALID);
      expect(api.head).toHaveBeenCalledWith('role', {
        headers: { Authorization: token },
        params: { role: role, scope: scope },
      });
    });

    it('should rethrow any unexpected error ', async () => {
      const unexpectedError = {
        response: { status: 502, payload: 'unexpected error' },
      };

      api.head = jest.fn().mockRejectedValue(unexpectedError);
      const role = 'role';
      const scope = 'scope';
      const token = 'token';

      const promise = checkUserScope(token, role, scope);

      await expect(promise).rejects.toBe(unexpectedError);
      expect(api.head).toHaveBeenCalledWith('role', {
        headers: { Authorization: token },
        params: { role: role, scope: scope },
      });
    });
  });
});
