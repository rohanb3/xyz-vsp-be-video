const { EventEmitter } = require('events');

class QueuesChangesEmitter extends EventEmitter {}

module.exports = {
  QueuesChangesEmitter,
};
