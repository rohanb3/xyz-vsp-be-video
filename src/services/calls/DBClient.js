const Call = require('@/models/call');

const getById = id => Call.findById(id).then(doc => doc.toObject());
const create = entity => Call.create(entity);
const updateById = (id, updates = {}) => Call.findOneAndUpdate(
  { _id: id },
  { $set: updates },
  { runValidators: true },
);

const validateSync = (data) => {
  const call = new Call(data);
  return call.validateSync();
};

exports.getById = getById;
exports.create = create;
exports.updateById = updateById;
exports.validateSync = validateSync;
