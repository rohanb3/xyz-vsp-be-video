const mongoose = require('@/libs/mongoose');
const callSchema = require('./schemas/call');

const call = new mongoose.Schema(callSchema);

function idGetter() {
  return this._id.toString();
}

call.virtual('id').get(idGetter);
call.index({ 'operatorFeedback.disposition': 'text' });
//
module.exports = mongoose.model('Call', call);
