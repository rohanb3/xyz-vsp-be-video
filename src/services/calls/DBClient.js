const _ = require('lodash');
const Call = require('@/models/call');

const getById = id => Call.findById(id).then(doc => doc.toObject());

const getFilteredBy = (filter = {}, range, sort, lazyLoad) => {
  const filterObject = _removeEmptyFilter({
    ...filter,
    acceptedAt: _rangeFilter(range),
  });

  const skip = lazyLoad && Number(lazyLoad.offset);
  const limit = lazyLoad && Number(lazyLoad.limit);

  return Call.find(filterObject)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

const getCountFilteredBy = (filter = {}, range) => {
  const filterObject = _removeEmptyFilter({
    ...filter,
    acceptedAt: _rangeFilter(range),
  });
  return Call.countDocuments(filterObject);
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
