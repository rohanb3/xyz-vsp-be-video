const mongoose = require('@/libs/mongoose');

const customerFeedback = new mongoose.Schema({
  date: {
    required: true,
    type: String,
  },
  customerId: {
    required: String,
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
  waitingTime: {
    type: Number,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
});

module.exports = customerFeedback;
