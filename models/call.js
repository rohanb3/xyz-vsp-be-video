const mongoose = require('../libs/mongoose');

const call = new mongoose.Schema({
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
});

module.exports = mongoose.model('Call', call);
