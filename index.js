require('module-alias/register');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');

const dotEnvConfigPath = process.env.NODE_ENV === 'development'
  ? path.resolve(process.cwd(), '.env.development')
  : path.resolve(process.cwd(), '.env.production');

dotenv.config({ path: dotEnvConfigPath });


const app = require('@/app');
const socket = require('@/socket');
const logger = require('@/services/logger')(module);

const server = http.Server(app);

const port = process.env.PORT || 3000;

server.listen(port, () => {
  /* eslint-disable-next-line no-console */
  console.log(`App is running at port ${port}`);
});

socket(server);

process.on('unhandledRejection', (error) => {
  logger.error('unhandledRejection', error);
});
