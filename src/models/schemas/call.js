const audioCall = require('./audioCall');
const videoCall = require('./videoCall');
const { callTypeValidator } = require('./validators');

module.exports = {
  ...audioCall,
  ...videoCall,
  callType: {
    type: String,
    validator: callTypeValidator,
    lowercase: true,
  },
};
