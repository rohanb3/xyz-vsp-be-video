const { EXPERIENCE_RATE_OUT_OF_BONDS } = require('@/constants/feedbackErrors');
const feedback = require('./feedback');
const { rateValidator } = require('./validators');

module.exports = {
  ...feedback,
  customerId: String,
  experienceRate: {
    type: Number,
    validate: [
      {
        validator: rateValidator,
        msg: EXPERIENCE_RATE_OUT_OF_BONDS,
      },
    ],
  },
};
