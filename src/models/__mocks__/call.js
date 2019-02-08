exports.findById = () => Promise.resolve({});
exports.create = entity => Promise.resolve({ ...entity });
exports.findOneAndUpdate = (_id, updates) => Promise.resolve({ _id, ...updates });
