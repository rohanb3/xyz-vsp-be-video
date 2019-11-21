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
  deviceId: {
    type: String,
    required: true,
  },
  salesRepId: {
    type: String,
  },
  waitingTime: String,
  missedAt: String,
  startedBy: String,
  startedAt: String,
  duration: Number,
  finishedBy: String,
  finishedAt: String,
  roomId: String,
  customerFeedback,
  operatorFeedback,
  callbackEnabled: Boolean,
  callbacks: [callback],
};
