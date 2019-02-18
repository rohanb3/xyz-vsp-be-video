const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const { REDIS_HOST, REDIS_PORT } = require('../constants/redis');

const storeOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

exports.init = (app) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const sess = {
    store: new RedisStore(storeOptions),
    secret: process.env.HTTP_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {},
  };

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    sess.cookie.secure = true;
  }

  app.use(session(sess));
};
