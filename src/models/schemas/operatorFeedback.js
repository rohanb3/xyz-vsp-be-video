const feedback = require('./feedback');

module.exports = {
  ...feedback,
  operatorId: String,
  disposition: String,
  callType: {
    type: String,
  },
};
