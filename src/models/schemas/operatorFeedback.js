const feedback = require('./feedback');

module.exports = {
  ...feedback,
  operatorId: String,
  callType: {
    type: String,
  },
};
