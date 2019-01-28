const dotenv = require('dotenv');
const http = require('http');

dotenv.load();

const { createAppMetadata } = require('./services/appMetadata');

const appMetadata = createAppMetadata();

const app = require('./app')(appMetadata);
const socket = require('./socket')(appMetadata);

const server = http.Server(app);

// const port = Number(process.env.PORT || 3000) + parseInt(process.env.INSTANCE_ID, 10);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  /* eslint-disable-next-line no-console */
  console.log(`App is running at port ${port}`);
});

socket(server);
