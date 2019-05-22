const passport = require('passport');
const BearerStrategy = require('passport-azure-ad').BearerStrategy;
const config = require('config');
const options = config.get('azure');

const logger = require('@/services/logger')(module);

exports.init = app => {
  try {
    const bearerStrategy = new BearerStrategy({ ...options }, function(
      req,
      token,
      next
    ) {
      next(null, {}, token);
    });
    const middleware = app.use(passport.initialize());
    passport.use(bearerStrategy);

    logger.info('middleware.passport.setup');
    return middleware;
  } catch (e) {
    logger.error('middleware.passport.error', e);
    return app;
  }
};
