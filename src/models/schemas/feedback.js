const { QUALITY_OUT_OF_BONDS } = require('@/constants/feedbackErrors');

const { rateValidator } = require('./validators');

module.exports = {
  quality: {
    type: Number,
    validate: [
      {
        validator: rateValidator,
        msg: QUALITY_OUT_OF_BONDS,
      },
    ],
  },
  note: {
    type: String,
  },
};
