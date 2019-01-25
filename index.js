const dotenv = require('dotenv');
const http = require('http');

dotenv.load();

const { createAppMetadata } = require('./services/appMetadata');

const appMetadata = createAppMetadata();

const app = require('./app')(appMetadata);
const socket = require('./socket')(appMetadata);

const server = http.Server(app);

server.listen(process.env.PORT || 3000, () => {
  /* eslint-disable-next-line no-console */
  console.log('App is running at port 3000');
});

socket(server);
