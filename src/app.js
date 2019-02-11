const path = require('path');
const fs = require('fs');
const app = require('express')();

const logger = require('@/services/logger')(module);

const middlewares = fs.readdirSync(path.join(__dirname, 'middlewares'))
  .sort();
/* eslint-disable-next-line global-require, import/no-dynamic-require */
middlewares.forEach(m => require(`@/middlewares/${m}`).init(app));

const roomLogs = require('@/routes/roomLogs');
const callFeedbackCustomer = require('@/routes/callFeedbackCustomer');
const callFeedbackOperator = require('@/routes/callFeedbackOperator');

app.get('/room-logs', roomLogs);
app.post('/call-feedback-customer', callFeedbackCustomer);
app.post('/call-feedback-operator', callFeedbackOperator);

function errorHandler(err, req, res) {
  logger.error(err.stack);
  res.status(500).send();
}

// IMPORTANT: use this middleware after all actions, because it should be invoked only if
// error wasn't caught in in any higher handler
app.use(errorHandler);

module.exports = app;
