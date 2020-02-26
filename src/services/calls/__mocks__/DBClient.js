exports.getById = () => Promise.resolve();
exports.create = entity => Promise.resolve({ ...entity });
exports.updateById = (_id, updates) => Promise.resolve({ _id, ...updates });
exports.updateByQuery = (query, updates) =>
  Promise.resolve({ ...query, ...updates });
exports.aggregateDurations = () => Promise.resolve();
