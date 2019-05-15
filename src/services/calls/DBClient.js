const _ = require('lodash');
const Call = require('@/models/call');

const getById = id => Call.findById(id).then(doc => doc.toObject());

const getFilteredBy = (filter = {}, range, lazyLoad) => {
  const filterObject = {
    ...filter,
    acceptedAt: _rangeFilter(range),
  };
  return Call.find(_removeEmptyFilter(filterObject))
    .skip(Number(lazyLoad.offset))
    .limit(Number(lazyLoad.limit));
};

const getCountFilteredBy = (filter = {}, range) => {
  const filterObject = {
    ...filter,
    acceptedAt: _rangeFilter(range),
  };
  return Call.countDocuments(_removeEmptyFilter(filterObject));
};

const create = entity => Call.create(entity);

const updateById = (id, updates = {}) =>
  Call.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { runValidators: true, new: true }
  );

const validateSync = data => {
  const call = new Call(data);
  return call.validateSync();
};

const _rangeFilter = (range = {}) => {
  if (!range.from && !range.to) {
    return null;
  }
  return _removeEmptyFilter({ $gte: range.from, $lte: range.to });
};

const _removeEmptyFilter = filter => _.pickBy(filter, _.identity);

exports.getById = getById;
exports.getFilteredBy = getFilteredBy;
exports.getCountFilteredBy = getCountFilteredBy;
exports.create = create;
exports.updateById = updateById;
exports.validateSync = validateSync;
