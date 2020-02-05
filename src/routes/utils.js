var passport = require('passport');
const logger = require('@/services/logger')(module);
const { validationResult } = require('express-validator/check');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('@/swagger/v1');

const { isPermissionGranted } = require('@/services/permissionsHelper');
const { FORBIDDEN } = require('@/constants/connection');

function setupValidateRequestMiddleware(router, routs) {
  router.use(routs, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  });
}

function setupSwagger(router) {
  router.use('/swagger', swaggerUi.serve);
  router.get('/swagger', swaggerUi.setup(swaggerDocument));
}

function authenticateRequest() {
  return passport.authenticate('oauth-bearer', { session: false });
}

function validateRequest(validationArray) {
  return [validationArray, _validationHandler];
}

function _validationHandler(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const protectWithPermission = permission => async (request, res, next) => {
  const { extension_Group: role, oid } = request.authInfo;
  const { authorization } = request.headers;
  logger.info(
    `middleware.protectWithPermission.start with ${role} role, ${permission} permission for user ${oid}`
  );

  try {
    const allowed = await isPermissionGranted(authorization, role, permission);

    if (allowed) {
      logger.info(
        `middleware.protectWithPermission.allowed with ${role} role, ${permission} permission for user ${oid}`
      );
      next();
    } else {
      logger.info(
        `middleware.protectWithPermission.notAllowed with ${role} role, ${permission} permission for user ${oid}`
      );
      return res.status(403).send(FORBIDDEN);
    }
  } catch (err) {
    logger.error(
      `middleware.protectWithPermission.unexpectedError with ${role} role, ${permission} permission for user ${oid}`
    );
    return res.status(500).json(err);
  }
};

exports.setupSwagger = setupSwagger;
exports.validateRequest = validateRequest;
exports.authenticateRequest = authenticateRequest;
exports.protectWithPermission = protectWithPermission;
exports.setupValidateRequestMiddleware = setupValidateRequestMiddleware;
