const logger = require('@/services/logger')(module);
const { isPermissionGranted } = require('@/services/permissionsHelper');
const {
  getTenantIdByCompanyId,
} = require('@/services/httpServices/publicApiRequests');

const validateTenantFilter = permission => async (request, res, next) => {
  const { tenantId } = request.query;
  const {
    oid,
    extension_CompanyId: companyId,
    extension_Group: role,
  } = request.authInfo;
  const { authorization } = request.headers;
  logger.info(
    `middleware.validateTenantFilter.start ${tenantId} for user ${oid}`
  );

  try {
    if (!tenantId) {
      logger.info('middleware.validateTenantFilter.noTenantId');
      next();
    } else {
      const allowed = await isPermissionGranted(
        authorization,
        role,
        permission
      );
      if (!allowed) {
        logger.info(
          `middleware.validateTenantFilter.tenantIdNotAllowed ${tenantId} for user ${oid}`
        );
        tenantId;
        const allowedTenantId = await getTenantIdByCompanyId(companyId);
        if (allowedTenantId !== tenantId) {
          request.query.tenantId = allowedTenantId;
        }
      } else {
        logger.info(
          `middleware.validateTenantFilter.tenantIdAllowed ${tenantId} for user ${oid}`
        );
      }

      next();
    }
  } catch (err) {
    logger.error(
      `middleware.validateTenantFilter.unexpectedError ${tenantId} for user ${oid}`
    );
    return res.status(500).json(err);
  }
};

exports.validateTenantFilter = validateTenantFilter;