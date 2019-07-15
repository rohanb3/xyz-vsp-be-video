const dotenv = require('dotenv');
dotenv.config();
require('module-alias/register');

const Call = require('@/models/call');

const loadTestingCallsQuery = {
  requestedBy: { $regex: /[0-9]*-customer-[0-9]/ },
};

const up = next => {
  return Call.deleteMany(loadTestingCallsQuery)
    .then(() => next())
    .catch(next);
};

const down = next => next();

module.exports.up = up;
module.exports.down = down;
