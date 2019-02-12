const { CUSTOMER_ID_MISSING } = require('@/constants/feedbackErrors');
const feedback = require('./feedback');

module.exports = {
  ...feedback,
  customerId: {
    required: CUSTOMER_ID_MISSING,
    type: String,
  },
};
