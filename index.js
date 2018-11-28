require('dotenv').load();

const path = require('path');
const fs = require('fs');
const app = require('express')();
const http = require('http').Server(app);

const middlewares = fs.readdirSync(path.join(__dirname, 'middlewares'))
  .sort();
/* eslint-disable-next-line global-require, import/no-dynamic-require */
middlewares.forEach(m => require(`./middlewares/${m}`).init(app));

const socket = require('./socket');

const token = require('./routes/token');
const roomLogs = require('./routes/roomLogs');

app.get('/token', token);
app.get('room-logs', roomLogs);

http.listen(process.env.PORT || 3000, () => {
  console.log('App is running at port 3000');
});

socket(http);
