const path = require('path');
const fs = require('fs');
const app = require('express')();

const logger = require('@/services/logger')(module);

const middlewares = fs.readdirSync(path.join(__dirname, 'middlewares')).sort();
/* eslint-disable-next-line global-require, import/no-dynamic-require */
middlewares.forEach(m => require(`@/middlewares/${m}`).init(app));

const apiRouter = require('./apiRouter');

app.use('/api/video', apiRouter);

// this handler must have 4 args, because this is the way how express knows this is error handler
// https://expressjs.com/ru/guide/error-handling.html
/* eslint-disable-next-line no-unused-vars */
function errorHandler(err, req, res, next) {
  logger.error(err);
  res.status(500).send();
}

// IMPORTANT: use this middleware after all actions, because it should be invoked only if
// error wasn't caught in in any higher handler
app.use(errorHandler);

module.exports = app;
