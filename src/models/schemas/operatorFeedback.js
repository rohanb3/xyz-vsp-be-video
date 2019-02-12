const { OPERATOR_ID_MISSING } = require('@/constants/feedbackErrors');
const feedback = require('./feedback');

module.exports = {
  ...feedback,
  operatorId: {
    required: OPERATOR_ID_MISSING,
    type: String,
  },
  callType: {
    type: String,
  },
};
