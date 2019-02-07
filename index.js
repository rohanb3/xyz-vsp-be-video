require('module-alias/register');
const dotenv = require('dotenv');
const http = require('http');

dotenv.load();

const app = require('./app');
const socket = require('./socket');

const server = http.Server(app);

const port = process.env.PORT || 3000;

server.listen(port, () => {
  /* eslint-disable-next-line no-console */
  console.log(`App is running at port ${port}`);
});

socket(server);
