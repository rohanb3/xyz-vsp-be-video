var passport = require('passport');
const { validationResult } = require('express-validator/check');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('@/swagger/v1');

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

exports.validateRequest = validateRequest;
exports.authenticateRequest = authenticateRequest;
exports.setupValidateRequestMiddleware = setupValidateRequestMiddleware;
exports.setupSwagger = setupSwagger;
