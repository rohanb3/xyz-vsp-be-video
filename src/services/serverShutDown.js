const mongoose = require('@/libs/mongoose');
const logger = require('@/services/logger')(module);
const { connectionsHeap } = require('@/services/connectionsHeap');

let shuttingDown = false;

function shutDown(server, connections) {
  logger.info('SIGINT recevied');
  if (!shuttingDown) {
    shuttingDown = true;
    logger.info('Shutting down started');

    setTimeout(() => {
      connections.forEach(curr => curr.end());
    }, 2000);
    setTimeout(() => {
      connections.forEach(curr => curr.destroy());
    }, 3000);

    connectionsHeap
      .destroy()
      .then(() => new Promise((resolve, reject) => {
        logger.info('Connections heap destroyed');
        server.close((serverClosingError) => {
          logger.info('Server closed');
          mongoose.connection.close(false, (mongooseClosingError) => {
            logger.info('Mongoose closed');
            if (serverClosingError || mongooseClosingError) {
              reject(serverClosingError || mongooseClosingError);
            } else {
              resolve();
            }
          });
        });
      }))
      .then(() => {
        logger.info('Gracefully exited');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Exited with error', error);
        process.exit(1);
      });
  }
}

exports.shutDown = shutDown;
