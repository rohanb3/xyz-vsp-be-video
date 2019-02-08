const path = require('path');
const fs = require('fs');
const app = require('express')();

const middlewares = fs.readdirSync(path.join(__dirname, 'middlewares'))
  .sort();
/* eslint-disable-next-line global-require, import/no-dynamic-require */
middlewares.forEach(m => require(`@/middlewares/${m}`).init(app));

const roomLogs = require('@/routes/roomLogs');
const callFeedbackMobile = require('@/routes/callFeedbackMobile');

app.get('/room-logs', roomLogs);
app.post('/call-feedback-mobile', callFeedbackMobile);

module.exports = app;
