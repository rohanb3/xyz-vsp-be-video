const customerFeedback = require('./customerFeedback');
const operatorFeedback = require('./operatorFeedback');
const callback = require('./callback');

module.exports = {
  requestedBy: {
    type: String,
    required: true,
  },
  requestedAt: {
    type: String,
    required: true,
  },
  waitingTime: String,
  missedAt: String,
  acceptedBy: String,
  acceptedAt: String,
  duration: Number,
  finishedBy: String,
  finishedAt: String,
  roomId: String,
  customerFeedback,
  operatorFeedback,
  callbacks: [callback],
};
