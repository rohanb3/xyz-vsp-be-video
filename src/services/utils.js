const _ = require('lodash');

const removeUndefined = filter => _.pickBy(filter, _.identity);

exports.removeUndefined = removeUndefined;
