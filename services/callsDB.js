const Call = require('../models/call');

function createCall(call) {
  return Call.create(call);
}

function updateCall(id, updates = {}) {
  return Call.findById(id)
}
