const {
  EXPERIENCE_RATE_MISSING,
  EXPERIENCE_RATE_OUT_OF_BONDS,
  QUALITY_MISSING,
  QUALITY_OUT_OF_BONDS,
} = require('@/constants/feedbackErrors');

const rateValidator = value => !value || (value >= 1 && value <= 5);

module.exports = {
  experienceRate: {
    required: EXPERIENCE_RATE_MISSING,
    type: Number,
    validate: [
      {
        validator: rateValidator,
        msg: EXPERIENCE_RATE_OUT_OF_BONDS,
      },
    ],
  },
  quality: {
    required: QUALITY_MISSING,
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
