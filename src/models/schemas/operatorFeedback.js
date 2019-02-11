module.exports = {
  date: {
    required: true,
    type: String,
  },
  operatorId: {
    required: true,
    type: String,
  },
  callType: {
    type: String,
  },
  experienceRate: {
    required: true,
    type: Number,
    min: 1,
    max: 5,
  },
  quality: {
    required: true,
    type: Number,
    min: 1,
    max: 5,
  },
  note: {
    type: String,
  },
};
