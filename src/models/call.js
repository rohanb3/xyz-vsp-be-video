const mongoose = require('@/libs/mongoose');
const callSchema = require('./schemas/call');

const call = new mongoose.Schema(callSchema);

module.exports = mongoose.model('Call', call);
