const { validateTenantFilter } = require('@/services/filtersValidator');
const permissionsHelper = require('@/services/permissionsHelper');
const publicApiRequests = require('@/services/httpServices/publicApiRequests');

publicApiRequests.getTenantIdByCompanyId = jest
  .fn()
  .mockResolvedValue('testTenantId');

describe('filtersValidator', () => {
  describe('validateTenantFilter():', () => {
    it('should return requested tenant if user has permissions to choose tenant', async () => {
      permissionsHelper.isPermissionGranted = jest.fn().mockResolvedValue(true);
      const request = {
        query: { tenantId: 'testTenantId' },
        headers: { authorization: 'token' },
        authInfo: {
          oid: 'userId',
          extension_CompanyId: 'companyId',
          extension_Group: 'role',
        },
      };
      const response = {
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
      };

      const next = jest.fn();
      const middleware = validateTenantFilter('choose.tenant.permission');

      await middleware(request, response, next);

      expect(next).toHaveBeenCalled();
      expect(request.query.tenantId).toBe('testTenantId');
    });
    it("should return user's tenant if user doesn't have permissions to choose tenant", async () => {
      const request = {
        query: { tenantId: 'anotherTestTenantId' },
        headers: { authorization: 'token' },
        authInfo: {
          oid: 'userId',
          extension_CompanyId: 'companyId',
          extension_Group: 'role',
        },
      };
      const response = {
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
      };

      const next = jest.fn();
      permissionsHelper.isPermissionGranted = jest
        .fn()
        .mockResolvedValue(false);

      const middleware = validateTenantFilter('choose.tenant.permission');

      await middleware(request, response, next);

      expect(next).toHaveBeenCalled();
      expect(request.query.tenantId).toBe('testTenantId');
    });

    it("should return user's tenant if user doesn't have permissions to choose tenant but request hisself tenant", async () => {
      const response = {
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
      };
      const request = {
        query: { tenantId: 'testTenantId' },
        headers: { authorization: 'token' },
        authInfo: {
          oid: 'userId',
          extension_CompanyId: 'companyId',
          extension_Group: 'role',
        },
      };
      const next = jest.fn();
      permissionsHelper.isPermissionGranted = jest
        .fn()
        .mockResolvedValue(false);

      const middleware = validateTenantFilter('choose.tenant.permission');

      await middleware(request, response, next);

      expect(next).toHaveBeenCalled();
      expect(request.query.tenantId).toBe('testTenantId');
    });

    it("should return user's tenant if no tenantId was specified", async () => {
      const response = {
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
      };
      const request = {
        query: {},
        headers: { authorization: 'token' },
        authInfo: {
          oid: 'userId',
          extension_CompanyId: 'companyId',
          extension_Group: 'role',
        },
      };
      const next = jest.fn();
      permissionsHelper.isPermissionGranted = jest.fn();

      const middleware = validateTenantFilter('choose.tenant.permission');

      await middleware(request, response, next);

      expect(permissionsHelper.isPermissionGranted).not.toHaveBeenCalled();

      expect(next).toHaveBeenCalled();
      expect(request.query.tenantId).toBe('testTenantId');
    });

    it('should return 500 response on any unexpected error', async () => {
      const testError = { text: 'test error' };
      const statusResponseFunction = jest.fn();
      const response = {
        status: jest.fn(() => ({
          json: statusResponseFunction,
        })),
      };
      const request = {
        query: { tenantId: 'testTenantId' },
        headers: { authorization: 'token' },
        authInfo: {
          oid: 'userId',
          extension_CompanyId: 'companyId',
          extension_Group: 'role',
        },
      };
      const next = jest.fn();

      permissionsHelper.isPermissionGranted = jest
        .fn()
        .mockRejectedValue(testError);

      const middleware = validateTenantFilter('choose.tenant.permission');

      await middleware(request, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(500);
      expect(statusResponseFunction).toHaveBeenCalledWith(testError);
    });
  });
});
