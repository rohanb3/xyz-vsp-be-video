const authenticateRequest = () => (req, res, next) => {
  req.authInfo = {};
  next();
};

const setupSwagger = () => {};
const validateRequest = () => (req, res, next) => next();
const protectWithPermission = () => (req, res, next) => next();
const setupValidateRequestMiddleware = () => (req, res, next) => next();

exports.setupSwagger = setupSwagger;
exports.validateRequest = validateRequest;
exports.authenticateRequest = authenticateRequest;
exports.protectWithPermission = protectWithPermission;
exports.setupValidateRequestMiddleware = setupValidateRequestMiddleware;
