require('module-alias/register');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const app = require('@/app');
const socket = require('@/socket');
const { shutDown } = require('@/services/serverShutDown');
const logger = require('@/services/logger')(module);

const server = http.Server(app);

const port = process.env.PORT || 3000;

server.listen(port, () => {
  /* eslint-disable-next-line no-console */
  console.log(`App is running at port ${port}`);
});

socket(server);

let connections = [];

server.on('connection', connection => {
  connections.push(connection);
  connection.on('close', () => {
    connections = connections.filter(curr => curr !== connection);
  });
});

process.on('unhandledRejection', error => {
  logger.error('unhandledRejection', error);
});

process.on('SIGINT', () => shutDown(server, connections));
process.on('SIGTERM', () => shutDown(server, connections));
