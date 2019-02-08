const morgan = require('morgan');
const winston = require('@/libs/winston')(module);

exports.init = app => app.use(morgan('combined', { stream: winston.stream }));
