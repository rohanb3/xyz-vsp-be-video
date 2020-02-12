const { EventEmitter } = require('events');

class OperatorsChangesEmitter extends EventEmitter {}

module.exports = {
  OperatorsChangesEmitter,
};
