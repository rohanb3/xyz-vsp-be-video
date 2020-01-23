const _ = require('lodash');
const Call = require('@/models/call');

const getById = id => Call.findById(id).then(doc => doc.toObject());

const getFilteredBy = (filter, range, sort, lazyLoad) =>
  lazyLoadQuery(Call.find(getQuery(filter, range)).sort(sort), lazyLoad);

const getCountFilteredBy = (filter, range) =>
  Call.countDocuments(getQuery(filter, range));

const create = entity => Call.create(entity);

/**
 *  ==================Important=========================
 *  async/await is needed here because of lazy behaviour
 *  of Mongoose Query object. If we don't provide callback
 *  or don't use await for getting result, then query will
 *  not be executed. If you need lazy version of this method,
 *  look at **updateByIdLazy**
 */
const updateById = async (id, updates = {}) => {
  return await Call.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { runValidators: true, new: true }
  );
};

const updateByIdLazy = (id, updates = {}) =>
  Call.findOneAndUpdate(
    { _id: id },
    { $set: updates },
    { runValidators: true, new: true }
  );

const validateSync = data => {
  const call = new Call(data);
  return call.validateSync();
};

const lazyLoadQuery = (query, lazyLoad) => {
  const offset = lazyLoad && Number(lazyLoad.offset);
  const limit = lazyLoad && Number(lazyLoad.limit);
  return query.skip(offset).limit(limit);
};

const getQuery = (query = {}, range) => {
  const { search, type, rate, ...filter } = query;

  const findQuery = removeUndefined({
    ...filter,
    acceptedAt: getRangeFilter(range),
    'operatorFeedback.callType': type,
    'customerFeedback.rate': rate,
  });

  if (search) {
    findQuery.$text = { $search: search, $diacriticSensitive: true };
  }

  return findQuery;
};

const getRangeFilter = (range = {}) => {
  if (!range.from && !range.to) {
    return null;
  }
  return removeUndefined({ $gte: range.from, $lte: range.to });
};

const removeUndefined = filter => _.pickBy(filter, _.identity);

exports.getById = getById;
exports.getFilteredBy = getFilteredBy;
exports.getCountFilteredBy = getCountFilteredBy;
exports.create = create;
exports.updateById = updateById;
exports.validateSync = validateSync;
exports.updateByIdLazy = updateByIdLazy;
