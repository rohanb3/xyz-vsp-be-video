const {
  EXPERIENCE_RATE_OUT_OF_BONDS,
  QUALITY_OUT_OF_BONDS,
} = require('@/constants/feedbackErrors');

const rateValidator = value => !value || (value >= 1 && value <= 5);

module.exports = {
  experienceRate: {
    type: Number,
    validate: [
      {
        validator: rateValidator,
        msg: EXPERIENCE_RATE_OUT_OF_BONDS,
      },
    ],
  },
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
