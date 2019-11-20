const dotenv = require('dotenv');
dotenv.config();
require('module-alias/register');

const Call = require('@/models/call');

module.exports.up = function(next) {
  return Call.updateMany({}, { $set: { tenant: 'Spectrum' } })
    .then(() => {
      return next();
    })
    .catch(() => {
      return next();
    });
};

module.exports.down = function(next) {
  next();
};
