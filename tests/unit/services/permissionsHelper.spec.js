const permissionHelper = require('@/services/permissionsHelper');
const identityApi = require('@/services/httpServices/identityApiRequests');

describe('permissionHelper', () => {
  describe('isPermissionGranted():', () => {
    it('should return true for granted response', async () => {
      identityApi.checkUserScope = jest.fn().mockResolvedValue();

      const promise = permissionHelper.isPermissionGranted(
        'anyToken',
        'anyRole',
        'anyTestScope'
      );

      await expect(promise).resolves.toBe(true);
    });

    it('should return false if any unexpected error occurs', async () => {
      identityApi.checkUserScope = jest.fn().mockRejectedValue();

      const promise = permissionHelper.isPermissionGranted(
        'anyToken',
        'anyRole',
        'anyTestScope1'
      );

      await expect(promise).resolves.toBe(false);
    });
  });
});
