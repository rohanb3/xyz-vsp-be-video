jest.mock('@/services/twilio');

const {
  _api: api,
  getUserProfile,
  checkTokenValidity,
} = require('@/services/httpServices/identityApiRequests');

describe('identityApiRequests: ', () => {
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

      await expect(promise).rejects.toMatchObject({message: 'Token is required'});
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

});
