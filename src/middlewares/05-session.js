const session = require('express-session');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const config = require('config');

const { enabled, secret, setProxy } = config.get('session');

const logger = require('@/services/logger')(module);
const { REDIS_HOST, REDIS_PORT, REDIS_OPTIONS } = require('../constants/redis');

const client = redis.createClient(REDIS_PORT, REDIS_HOST, REDIS_OPTIONS);
client.on('error', err => logger.error(err));

const storeOptions = {
  client,
};

exports.init = (app) => {
  if (!enabled) {
    return;
  }

  const sess = {
    store: new RedisStore(storeOptions),
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {},
  };

  if (setProxy) {
    app.set('trust proxy', 1);
    sess.cookie.secure = true;
  }

  app.use(session(sess));
};
