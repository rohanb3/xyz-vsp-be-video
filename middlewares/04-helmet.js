const helmet = require('helmet');

exports.init = app => app.use(helmet());
