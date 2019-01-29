const session = require('express-session');

exports.init = (app) => {
  const sess = {
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
