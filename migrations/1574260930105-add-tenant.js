const Call = require('../src/models/call');

module.exports.up = function(next) {
  return Call.updateMany(
    {},
    {
      $set: { tenantId: 'b05666e5-2e9e-4262-895b-9017c7f91043' },
    }
  ).then(() => {
    return next();
  });
};

module.exports.down = function(next) {
  next();
};
