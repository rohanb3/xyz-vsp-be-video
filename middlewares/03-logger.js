const morgan = require('morgan');
const winston = require('../libs/winston');

exports.init = app => app.use(morgan('combined', { stream: winston.stream }));
