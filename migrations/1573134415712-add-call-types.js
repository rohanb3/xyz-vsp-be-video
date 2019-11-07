'use strict';

const dotenv = require('dotenv');
dotenv.config();
require('module-alias/register');

const Call = require('@/models/call');

const up = next => {
  const updates = {
    callType: 'call.video',
  };
  return Call.updateMany({ callType: null }, { $set: updates })
    .then(() => next())
    .catch(next);
};

const down = next => next();

module.exports.up = up;
module.exports.down = down;
