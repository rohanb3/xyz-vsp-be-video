const call = require('../models/call');

const getById = id => call.findById(id);

const create = entity => call.create(entity);

const updateById = (id, updates = {}) => (
  call.findOneAndUpdate({ _id: id }, { $set: updates })
);

const updateByQuery = (query, updates = {}) => (
  call.findOneAndUpdate(query, { $set: updates })
);

exports.getById = getById;
exports.create = create;
exports.updateById = updateById;
exports.updateByQuery = updateByQuery;
